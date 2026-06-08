// ========================================================
// 🏢 VAULT ENGINE: REAL-TIME SETTLEMENT & CASH RECONCILIATION (WITH DENOM ROLLBACK)
// ========================================================

window.initSettlementPage = async function(currentUser) {
    console.log("⚡ Jarvis Settlement Capital Engine Initializing...");

    // UI Labels Hooks
    const lblAccNo = document.getElementById('lbl-settle-acc-no');
    const lblBalance = document.getElementById('lbl-settle-balance');

    // Tab Panel Switchers Elements
    const optButtons = document.querySelectorAll('.settle-opt-btn');
    const panels = document.querySelectorAll('.settle-panel');

    // Input Amount Fields
    const depAmountInput = document.getElementById('settle-dep-amount');
    const witAmountInput = document.getElementById('settle-wit-amount');
    const contraAmountInput = document.getElementById('settle-contra-amount');
    const editIdInput = document.getElementById('settle-edit-id'); 

    // Alphabetical Words Indicators
    const depWords = document.getElementById('settle-dep-words');
    const witWords = document.getElementById('settle-wit-words');
    const historyTbody = document.getElementById('settle-history-body');

    // Global Vault State Cache Variables
    let currentSettlementBalance = 0;
    let currentSettlementAccountNo = currentUser?.settlement_account || "NOT_CONFIGURED";

    if (lblAccNo) lblAccNo.innerText = currentSettlementAccountNo;

    // 💳 [VAULT UTILITY]: Live Bank Ledger Sync from user_roles Table
    async function syncLiveSettlementVault() {
        try {
            const { data, error } = await window.supabaseClient
                .from('user_roles')
                .select('*')
                .eq('ko_code', currentUser.ko_code)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                currentSettlementBalance = parseFloat(data.settlement_balance) || 0;
                currentSettlementAccountNo = data.settlement_account || "NOT_CONFIGURED";
                
                if (lblBalance) lblBalance.innerText = `₹${currentSettlementBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                if (lblAccNo) lblAccNo.innerText = currentSettlementAccountNo;
                
                window.currentUser = { ...window.currentUser, ...data };
            }
            await fetchTodayHistoryLogs();
        } catch (err) {
            console.error("❌ Failed to sync settlement balances from cloud node:", err);
        }
    }

    // 📊 [TODAY ONLY HISTORY LEDGER]: Pull logs only for current date timeline
    async function fetchTodayHistoryLogs() {
        if (!historyTbody) return;
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const startOfToday = `${todayStr}T00:00:00.000Z`;
            const endOfToday = `${todayStr}T23:59:59.999Z`;

            const { data, error } = await window.supabaseClient
                .from('settlement_logs')
                .select('*')
                .eq('ko_code', currentUser.ko_code)
                .gte('transaction_date', startOfToday)
                .lte('transaction_date', endOfToday)
                .order('transaction_date', { ascending: false });

            if (error) throw error;

            historyTbody.innerHTML = "";
            if (!data || data.length === 0) {
                historyTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:15px; color:#888; font-style:italic;">आज की तिथि में कोई सेटलमेंट एंट्री नहीं मिली है।</td></tr>`;
                return;
            }

            data.forEach((log, index) => {
                let badgeBg = log.transaction_type === 'DEPOSIT' ? '#e8f5e9' : (log.transaction_type === 'WITHDRAWAL' ? '#ffebee' : '#f5f5f5');
                let badgeColor = log.transaction_type === 'DEPOSIT' ? '#2e7d32' : (log.transaction_type === 'WITHDRAWAL' ? '#c62828' : '#333');
                
                let cleanNarration = log.narration || '';
                if (cleanNarration.includes('|| Notes:')) {
                    cleanNarration = cleanNarration.split('|| Notes:')[0];
                }

                historyTbody.insertAdjacentHTML('beforeend', `
                    <tr style="border-bottom: 1px solid #eef0f2; vertical-align: middle;">
                        <td style="padding:10px; text-align:center; font-weight:bold; color:#777;">${index + 1}</td>
                        <td style="padding:10px;">
                            <span style="background:${badgeBg}; color:${badgeColor}; padding:4px 8px; border-radius:4px; font-weight:bold; font-size:0.75rem;">${log.transaction_type}</span>
                        </td>
                        <td style="padding:10px; font-weight:bold; color:#222;">₹${parseFloat(log.amount).toFixed(2)}</td>
                        <td style="padding:10px; color:#666;">₹${parseFloat(log.previous_balance).toFixed(2)}</td>
                        <td style="padding:10px; font-weight:600; color:${badgeColor};">₹${parseFloat(log.new_balance).toFixed(2)}</td>
                        <td style="padding:10px; color:#555; font-size:0.85rem;">${cleanNarration}</td>
                        <td style="padding:10px; text-align:center; white-space:nowrap;">
                            <button class="settle-edit-btn" data-id="${log.id}" style="padding:5px 8px; background:#f39c12; color:#fff; border:none; border-radius:3px; cursor:pointer; font-size:0.8rem; margin-right:5px; font-weight:bold;">📝</button>
                            <button class="settle-del-btn" data-id="${log.id}" style="padding:5px 8px; background:#e74c3c; color:#fff; border:none; border-radius:3px; cursor:pointer; font-size:0.8rem; font-weight:bold;">🗑️</button>
                        </td>
                    </tr>
                `);
            });

            attachTableActionListeners();
        } catch (err) {
            console.error("History loading failure:", err);
        }
    }

    // 🔄 [TAB PANEL SWAPPER]
    optButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetPanel = btn.getAttribute('data-panel');
            resetSettleFormStates();
            switchTabTo(targetPanel);
        });
    });

    function switchTabTo(panelType) {
        optButtons.forEach(b => {
            b.style.background = '#ffffff';
            b.style.color = '#495057';
            b.style.border = '1px solid #ced4da';
        });
        const targetBtn = document.querySelector(`.settle-opt-btn[data-panel="${panelType}"]`);
        if (targetBtn) {
            targetBtn.style.background = panelType === 'withdrawal' ? '#27ae60' : (panelType === 'contra' ? '#343a40' : '#7d0022');
            targetBtn.style.color = '#ffffff';
            targetBtn.style.border = 'none';
        }

        panels.forEach(p => p.style.display = 'none');
        const targetElement = document.getElementById(`panel-settle-${panelType}`);
        if (targetElement) targetElement.style.display = 'block';

        mountDenominationForPanel(panelType);
    }

    function mountDenominationForPanel(panelType) {
        if (panelType === 'deposit' && window.DenominationOutInComponent) {
            window.DenominationOutInComponent.render('settle-deposit-denom-container');
        } else if (panelType === 'withdrawal' && window.DenominationInOutComponent) {
            window.DenominationInOutComponent.render('settle-withdrawal-denom-container');
        }
    }

    function resetSettleFormStates() {
        if (editIdInput) editIdInput.value = "";
        depAmountInput.value = "";
        witAmountInput.value = "";
        contraAmountInput.value = "";
        if (depWords) depWords.innerText = "Zero Rupees Only";
        if (witWords) witWords.innerText = "Zero Rupees Only";
        
        document.getElementById('dep-panel-title').innerText = "📥 Deposit Amount & Denomination";
        document.getElementById('wit-panel-title').innerText = "📤 Withdrawal Amount & Denomination";
        document.getElementById('contra-panel-title').innerText = "🔄 Direct Contra Balance Adjustment";
        document.getElementById('btn-settle-dep-save').innerText = "📥 Save Bank Deposit";
        document.getElementById('btn-settle-wit-save').innerText = "📤 Save Bank Withdrawal";
    }

    // 🔢 Live Word Translators
    function attachWordTranslator(inputNode, displayLabel) {
        if (!inputNode) return;
        inputNode.addEventListener('input', () => {
            const value = parseInt(inputNode.value) || 0;
            if (displayLabel) {
                if (value === 0) {
                    displayLabel.innerText = "Zero Rupees Only";
                } else if (typeof window.numberToHindiWords === 'function') {
                    displayLabel.innerText = `${window.numberToHindiWords(value)} रुपए मात्र`;
                } else {
                    displayLabel.innerText = `₹${value.toLocaleString('en-IN')} मात्र`;
                }
            }
        });
    }

    attachWordTranslator(depAmountInput, depWords);
    attachWordTranslator(witAmountInput, witWords);

    // 🚀 [DEPOSIT ROUTINE]: Settle Balance (+), Counter Cash Notes (-)
    const btnDepSave = document.getElementById('btn-settle-dep-save');
    if (btnDepSave) {
        btnDepSave.onclick = async function() {
            const amount = parseFloat(depAmountInput.value) || 0;
            const isEditMode = editIdInput && editIdInput.value !== "";

            if (amount <= 0) {
                window.showSystemAlert("कृपया एक वैध जमा राशि दर्ज करें।", "Validation Missing", "❌");
                return;
            }

            const denoTotal = window.DenominationOutInComponent ? window.DenominationOutInComponent.calculate() : amount;
            if (denoTotal !== amount) {
                window.showSystemAlert(`राशि का मिलान नहीं हुआ!\nदर्ज राशि: ₹${amount}\nडिनॉमिनेशन कुल: ₹${denoTotal}`, "Tally Mismatch", "⚠️");
                return;
            }

            try {
                btnDepSave.disabled = true;
                btnDepSave.innerText = "सहेज रहे हैं...";

                const { data: liveUser } = await window.supabaseClient.from('user_roles').select('*').eq('ko_code', currentUser.ko_code).maybeSingle();
                let dbSettleBal = parseFloat(liveUser.settlement_balance) || 0;
                
                let oldNotes = null;
                if (isEditMode) {
                    const { data: oldLog } = await window.supabaseClient.from('settlement_logs').select('*').eq('id', editIdInput.value).maybeSingle();
                    dbSettleBal = dbSettleBal - (parseFloat(oldLog?.amount) || 0); // Reverse old bank amount
                    
                    if (oldLog?.narration && oldLog.narration.includes('|| Notes:')) {
                        try { oldNotes = JSON.parse(log.narration.split('|| Notes:')[1]); } catch(e){}
                    }
                }

                const computedNewBalance = dbSettleBal + amount;
                const inputNotes = window.DenominationOutInComponent.getValues();
                let updatedNotesPayload = { settlement_balance: computedNewBalance };

                // 🌟 LOOP WITH ATOMIC DENOMINATION ROLLBACK LOGIC
                const noteKeys = [500, 200, 100, 50, 20, 10, 5];
                noteKeys.forEach(d => {
                    const dbKey = `cash_${d}`;
                    let currentStock = parseInt(liveUser[dbKey]) || 0;
                    
                    if (isEditMode && oldNotes) {
                        // Deposit Rollback formula: Naya Stock = Purana Stock + Puraane Notes (IN back) - Naye Notes (OUT)
                        const oldQty = parseInt(oldNotes[dbKey]) || 0;
                        currentStock = currentStock + oldQty; 
                    }
                    updatedNotesPayload[dbKey] = Math.max(0, currentStock - (inputNotes[dbKey] || 0));
                });

                // Coins adjustment
                let currentCoins = parseInt(liveUser['cash_coins']) || 0;
                if (isEditMode && oldNotes) { currentCoins = currentCoins + (parseInt(oldNotes['cash_coins']) || 0); }
                updatedNotesPayload['cash_coins'] = Math.max(0, currentCoins - (inputNotes['cash_coins'] || 0));

                const { error } = await window.supabaseClient.from('user_roles').update(updatedNotesPayload).eq('ko_code', currentUser.ko_code);
                if (error) throw error;

                const notesBackupString = JSON.stringify(inputNotes);

                if (isEditMode) {
                    await window.supabaseClient.from('settlement_logs').update({ 
                        amount: amount, 
                        previous_balance: dbSettleBal,
                        new_balance: computedNewBalance,
                        narration: `Settlement Account Deposit || Notes:${notesBackupString}`
                    }).eq('id', editIdInput.value);
                    window.showSystemAlert("एंट्री और डिनॉमिनेशन सफलतापूर्वक अपडेट कर दिए गए हैं।", "सफलता", "✅");
                } else {
                    await window.supabaseClient.from('settlement_logs').insert([{
                        ko_code: currentUser.ko_code,
                        transaction_type: 'DEPOSIT',
                        amount: amount,
                        previous_balance: dbSettleBal,
                        new_balance: computedNewBalance,
                        narration: `Settlement Account Deposit || Notes:${notesBackupString}`
                    }]);
                    window.showSystemAlert(`₹${amount.toFixed(2)} सफलतापूर्वक सेटलमेंट खाते में जोड़े गए।`, "सफलता", "✅");
                }

                resetSettleFormStates();
                await syncLiveSettlementVault();
                switchTabTo('deposit');

            } catch (err) {
                console.error(err);
                window.showSystemAlert("डेटाबेस अपडेट विफल हुआ।", "त्रुटि", "❌");
            } finally {
                btnDepSave.disabled = false;
            }
        };
    }

    // 🚀 [WITHDRAWAL ROUTINE]: Settle Balance (-), Counter Cash Notes (+)
    const btnWitSave = document.getElementById('btn-settle-wit-save');
    if (btnWitSave) {
        btnWitSave.onclick = async function() {
            const amount = parseFloat(witAmountInput.value) || 0;
            const isEditMode = editIdInput && editIdInput.value !== "";

            if (amount <= 0) {
                window.showSystemAlert("कृपया एक वैध निकासी राशि दर्ज करें।", "Validation Missing", "❌");
                return;
            }

            const denoTotal = window.DenominationInOutComponent ? window.DenominationInOutComponent.calculate() : amount;
            if (denoTotal !== amount) {
                window.showSystemAlert(`राशि का मिलान नहीं हुआ!\nदर्ज राशि: ₹${amount}\nडिनॉमिनेशन कुल: ₹${denoTotal}`, "Tally Mismatch", "⚠️");
                return;
            }

            try {
                btnWitSave.disabled = true;
                btnWitSave.innerText = "सहेज रहे हैं...";

                const { data: liveUser } = await window.supabaseClient.from('user_roles').select('*').eq('ko_code', currentUser.ko_code).maybeSingle();
                let dbSettleBal = parseFloat(liveUser.settlement_balance) || 0;
                
                let oldNotes = null;
                if (isEditMode) {
                    const { data: oldLog } = await window.supabaseClient.from('settlement_logs').select('*').eq('id', editIdInput.value).maybeSingle();
                    dbSettleBal = dbSettleBal + (parseFloat(oldLog?.amount) || 0); // Add back old withdrawal amount
                    
                    if (oldLog?.narration && oldLog.narration.includes('|| Notes:')) {
                        try { oldNotes = JSON.parse(oldLog.narration.split('|| Notes:')[1]); } catch(e){}
                    }
                }
                
                const computedNewBalance = dbSettleBal - amount;
                if (computedNewBalance < 0) {
                    window.showSystemAlert("आपके सेटलमेंट खाते में पर्याप्त राशि उपलब्ध नहीं है!", "Insufficient Capital", "⚠️");
                    btnWitSave.disabled = false;
                    btnWitSave.innerText = "📤 Save Bank Withdrawal";
                    return;
                }

                const inputNotes = window.DenominationInOutComponent.getValues();
                let updatedNotesPayload = { settlement_balance: computedNewBalance };

                // 🌟 LOOP WITH ATOMIC DENOMINATION ROLLBACK LOGIC
                const noteKeys = [500, 200, 100, 50, 20, 10, 5];
                let stockCheckPass = true;

                for (let i = 0; i < noteKeys.length; i++) {
                    const d = noteKeys[i];
                    const dbKey = `cash_${d}`;
                    let currentStock = parseInt(liveUser[dbKey]) || 0;

                    if (isEditMode && oldNotes) {
                        // Withdrawal Rollback formula: Naya Stock = Purana Stock - Puraane Notes (OUT back) + Naye Notes (IN)
                        const oldQty = parseInt(oldNotes[dbKey]) || 0;
                        currentStock = currentStock - oldQty; 
                    }

                    const finalStock = currentStock + (inputNotes[dbKey] || 0);
                    if (finalStock < 0) {
                        window.showSystemAlert(`रोलबैक विफलता: काउंटर पर ₹${d} के पर्याप्त नोट उपलब्ध नहीं हैं!`, "Stock Error", "❌");
                        stockCheckPass = false;
                        break;
                    }
                    updatedNotesPayload[dbKey] = finalStock;
                }

                if (!stockCheckPass) {
                    btnWitSave.disabled = false;
                    btnWitSave.innerText = "📤 Save Bank Withdrawal";
                    return;
                }

                // Coins adjust
                let currentCoins = parseInt(liveUser['cash_coins']) || 0;
                if (isEditMode && oldNotes) { currentCoins = currentCoins - (parseInt(oldNotes['cash_coins']) || 0); }
                updatedNotesPayload['cash_coins'] = currentCoins + (inputNotes['cash_coins'] || 0);

                const { error } = await window.supabaseClient.from('user_roles').update(updatedNotesPayload).eq('ko_code', currentUser.ko_code);
                if (error) throw error;

                const notesBackupString = JSON.stringify(inputNotes);

                if (isEditMode) {
                    await window.supabaseClient.from('settlement_logs').update({ 
                        amount: amount, 
                        previous_balance: dbSettleBal,
                        new_balance: computedNewBalance,
                        narration: `Settlement Account Withdrawal || Notes:${notesBackupString}`
                    }).eq('id', editIdInput.value);
                    window.showSystemAlert("एंट्री और डिनॉमिनेशन सफलतापूर्वक अपडेट कर दिए गए हैं।", "सफलता", "✅");
                } else {
                    await window.supabaseClient.from('settlement_logs').insert([{
                        ko_code: currentUser.ko_code,
                        transaction_type: 'WITHDRAWAL',
                        amount: amount,
                        previous_balance: dbSettleBal,
                        new_balance: computedNewBalance,
                        narration: `Settlement Account Withdrawal || Notes:${notesBackupString}`
                    }]);
                    window.showSystemAlert(`₹${amount.toFixed(2)} सेटलमेंट खाते से काट कर काउंटर पर जोड़ दिए गए हैं।`, "सफलता", "✅");
                }

                resetSettleFormStates();
                await syncLiveSettlementVault();
                switchTabTo('withdrawal');

            } catch (err) {
                console.error(err);
                window.showSystemAlert("डेटाबेस अपडेट विफल हुआ।", "त्रुटि", "❌");
            } finally {
                btnWitSave.disabled = false;
            }
        };
    }

    // 🚀 [CONTRA ROUTINE]
    const btnContraSave = document.getElementById('btn-settle-contra-save');
    if (btnContraSave) {
        btnContraSave.onclick = async function() {
            const type = document.getElementById('settle-contra-type').value;
            const amount = parseFloat(contraAmountInput.value) || 0;

            if (amount <= 0) {
                window.showSystemAlert("कृपया एक वैध कॉन्ट्रा राशि दर्ज करें।", "Validation Missing", "❌");
                return;
            }

            try {
                btnContraSave.disabled = true;
                btnContraSave.innerText = "सहेज रहे हैं...";

                const { data: liveUser } = await window.supabaseClient.from('user_roles').select('settlement_balance').eq('ko_code', currentUser.ko_code).maybeSingle();
                const currentDBBal = parseFloat(liveUser.settlement_balance) || 0;

                let computedNewBalance = currentDBBal;

                if (type === 'credit') {
                    computedNewBalance = currentDBBal + amount;
                } else if (type === 'debit') {
                    if (amount > currentDBBal) {
                        window.showSystemAlert("इस डेबिट के लिए सेटलमेंट खाते में पर्याप्त राशि नहीं है!", "Insufficient Capital", "⚠️");
                        return;
                    }
                    computedNewBalance = currentDBBal - amount;
                }

                const { error: updateError } = await window.supabaseClient
                    .from('user_roles')
                    .update({ settlement_balance: computedNewBalance })
                    .eq('ko_code', currentUser.ko_code);

                if (updateError) throw updateError;

                await window.supabaseClient.from('settlement_logs').insert([{
                    ko_code: currentUser.ko_code,
                    transaction_type: 'CONTRA',
                    amount: amount,
                    previous_balance: currentDBBal,
                    new_balance: computedNewBalance,
                    narration: `Direct Contra ${type.toUpperCase()}`
                }]);

                window.showSystemAlert(`₹${amount.toFixed(2)} का डायरेक्ट कॉन्ट्रा समायोजन सफलतापूर्वक पूरा हुआ।`, "सफलता", "✅");
                contraAmountInput.value = "";
                await syncLiveSettlementVault();

            } catch (err) {
                console.error("Critical Contra direct balance fault:", err);
                window.showSystemAlert("कॉन्ट्रा अपडेट विफल हुआ।", "त्रुटि", "❌");
            } finally {
                btnContraSave.disabled = false;
                btnContraSave.innerText = "🔄 Execute Contra Adjustment";
            }
        };
    }

    // 🔧 [TABLE ACTIONS HANDLERS]
    function attachTableActionListeners() {
        // 📝 1. EDIT OPERATIONAL HOOK
        document.querySelectorAll('.settle-edit-btn').forEach(btn => {
            btn.onclick = async function() {
                const logId = this.getAttribute('data-id');
                const { data: log } = await window.supabaseClient.from('settlement_logs').select('*').eq('id', logId).maybeSingle();
                if (!log) return;

                if (editIdInput) editIdInput.value = log.id;

                resetSettleFormStates();

                let savedNotes = null;
                if (log.narration && log.narration.includes('|| Notes:')) {
                    try {
                        savedNotes = JSON.parse(log.narration.split('|| Notes:')[1]);
                    } catch (e) {
                        console.error(e);
                    }
                }

                if (log.transaction_type === 'DEPOSIT') {
                    switchTabTo('deposit');
                    if(editIdInput) editIdInput.value = log.id; 
                    depAmountInput.value = log.amount;
                    depAmountInput.dispatchEvent(new Event('input'));
                    document.getElementById('dep-panel-title').innerText = "📝 Edit Deposit Entry";
                    btnDepSave.innerText = "⚙️ Update Deposit Entry";

                    setTimeout(() => {
                        if (savedNotes) {
                            [500, 200, 100, 50, 20, 10, 5].forEach(d => {
                                const inputCell = document.querySelector(`.gen-out-val[data-note="${d}"]`);
                                if (inputCell) inputCell.value = savedNotes[`cash_${d}`] || 0;
                            });
                            const coinsCell = document.querySelector('.gen-out-val[data-note="coins"]');
                            if (coinsCell) coinsCell.value = savedNotes['cash_coins'] || 0;
                        }
                        if (window.DenominationOutInComponent) window.DenominationOutInComponent.calculate();
                    }, 100);

                } else if (log.transaction_type === 'WITHDRAWAL') {
                    switchTabTo('withdrawal');
                    if(editIdInput) editIdInput.value = log.id; 
                    witAmountInput.value = log.amount;
                    witAmountInput.dispatchEvent(new Event('input'));
                    document.getElementById('wit-panel-title').innerText = "📝 Edit Withdrawal Entry";
                    btnWitSave.innerText = "⚙️ Update Withdrawal Entry";

                    setTimeout(() => {
                        if (savedNotes) {
                            [500, 200, 100, 50, 20, 10, 5].forEach(d => {
                                const inputCell = document.querySelector(`.gen-in-val[data-note="${d}"]`);
                                if (inputCell) inputCell.value = savedNotes[`cash_${d}`] || 0;
                            });
                            const coinsCell = document.querySelector('.gen-in-val[data-note="coins"]');
                            if (coinsCell) coinsCell.value = savedNotes['cash_coins'] || 0;
                        }
                        if (window.DenominationInOutComponent) window.DenominationInOutComponent.calculate();
                    }, 100);
                }
                
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
        });

        // 🗑️ 2. DELETE FLOW WITH SYSTEM NATIVE ALERTS REMOVED
        document.querySelectorAll('.settle-del-btn').forEach(btn => {
            btn.onclick = function() {
                const logId = this.getAttribute('data-id');
                
                if (typeof window.showCustomSystemConfirm === 'function') {
                    window.showCustomSystemConfirm(
                        "क्या आप वाकई इस सेटलमेंट एंट्री को डिलीट करना चाहते हैं?\nइससे बैंक बैलेंस और काउंटर डिनॉमिनेशन दोनों रोलबैक हो जाएंगे।",
                        "एंट्री डिलीट करें 🗑️",
                        async function() { 
                            await executeLogDeletion(logId); 
                        }
                    );
                } else {
                    executeLogDeletion(logId);
                }
            };
        });
    }

    // 💣 Actual Delete SQL firing framework with complete Note Rollback Recovery
    async function executeLogDeletion(logId) {
        try {
            const { data: log } = await window.supabaseClient.from('settlement_logs').select('*').eq('id', logId).maybeSingle();
            if (!log) return;

            const { data: liveUser } = await window.supabaseClient.from('user_roles').select('*').eq('ko_code', currentUser.ko_code).maybeSingle();
            let currentDBBal = parseFloat(liveUser.settlement_balance) || 0;

            let rolledBackBal = currentDBBal;
            let updatedNotesPayload = {};

            let savedNotes = null;
            if (log.narration && log.narration.includes('|| Notes:')) {
                try { savedNotes = JSON.parse(log.narration.split('|| Notes:')[1]); } catch(e){}
            }

            const noteKeys = [500, 200, 100, 50, 20, 10, 5];

            if (log.transaction_type === 'DEPOSIT') {
                rolledBackBal = currentDBBal - parseFloat(log.amount);
                updatedNotesPayload['settlement_balance'] = rolledBackBal;

                // Deposit rollback: notes come BACK to counter (+)
                noteKeys.forEach(d => {
                    const dbKey = `cash_${d}`;
                    const curQty = parseInt(liveUser[dbKey]) || 0;
                    const oldQty = savedNotes ? (parseInt(savedNotes[dbKey]) || 0) : 0;
                    updatedNotesPayload[dbKey] = curQty + oldQty;
                });
                let cCoins = parseInt(liveUser['cash_coins']) || 0;
                updatedNotesPayload['cash_coins'] = cCoins + (savedNotes ? (parseInt(savedNotes['cash_coins']) || 0) : 0);

            } else if (log.transaction_type === 'WITHDRAWAL') {
                rolledBackBal = currentDBBal + parseFloat(log.amount);
                updatedNotesPayload['settlement_balance'] = rolledBackBal;

                // Withdrawal rollback: notes LEAVE from counter (-)
                let deletePass = true;
                for (let i = 0; i < noteKeys.length; i++) {
                    const d = noteKeys[i];
                    const dbKey = `cash_${d}`;
                    const curQty = parseInt(liveUser[dbKey]) || 0;
                    const oldQty = savedNotes ? (parseInt(savedNotes[dbKey]) || 0) : 0;
                    
                    if ((curQty - oldQty) < 0) {
                        window.showSystemAlert(`डिलीट रद्द! काउंटर पर ₹${d} के पर्याप्त नोट नहीं हैं।`, "Stock Alert", "❌");
                        deletePass = false;
                        break;
                    }
                    updatedNotesPayload[dbKey] = curQty - oldQty;
                }
                if (!deletePass) return;

                let cCoins = parseInt(liveUser['cash_coins']) || 0;
                updatedNotesPayload['cash_coins'] = Math.max(0, cCoins - (savedNotes ? (parseInt(savedNotes['cash_coins']) || 0) : 0));
            }

            if (rolledBackBal < 0) {
                window.showSystemAlert("रोलबैक रद्द! डिलीट करने से बैंक बैलेंस Negative हो रहा है।", "Rollback Prohibited", "❌");
                return;
            }

            // Fire atomic update
            await window.supabaseClient.from('user_roles').update(updatedNotesPayload).eq('ko_code', currentUser.ko_code);
            await window.supabaseClient.from('settlement_logs').delete().eq('id', logId);

            window.showSystemAlert("एंट्री डिलीट कर दी गई है और बैंक बैलेंस सहित काउंटर नोट रोलबैक हो गए हैं।", "Deleted Complete", "✅");
            await syncLiveSettlementVault();

        } catch (e) {
            console.error("Deletion logic failure:", e);
        }
    }

    // Initial load syncs
    await syncLiveSettlementVault();
    mountDenominationForPanel('deposit');
};
