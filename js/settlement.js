// ========================================================
// 🏢 VAULT ENGINE: REAL-TIME SETTLEMENT WITH FLAT COLUMN DENOM ROLLBACK
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
            console.error("❌ Failed to sync settlement balances:", err);
        }
    }

    // 📊 [TODAY ONLY HISTORY LEDGER]
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
                
                historyTbody.insertAdjacentHTML('beforeend', `
                    <tr style="border-bottom: 1px solid #eef0f2; vertical-align: middle;">
                        <td style="padding:10px; text-align:center; font-weight:bold; color:#777;">${index + 1}</td>
                        <td style="padding:10px;">
                            <span style="background:${badgeBg}; color:${badgeColor}; padding:4px 8px; border-radius:4px; font-weight:bold; font-size:0.75rem;">${log.transaction_type}</span>
                        </td>
                        <td style="padding:10px; font-weight:bold; color:#222;">₹${parseFloat(log.amount).toFixed(2)}</td>
                        <td style="padding:10px; color:#666;">₹${parseFloat(log.previous_balance).toFixed(2)}</td>
                        <td style="padding:10px; font-weight:600; color:${badgeColor};">₹${parseFloat(log.new_balance).toFixed(2)}</td>
                        <td style="padding:10px; color:#555; font-size:0.85rem;">${log.narration || ''}</td>
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

    // 🚀 [DEPOSIT MASTER ROUTINE]
    const btnDepSave = document.getElementById('btn-settle-dep-save');
    if (btnDepSave) {
        btnDepSave.onclick = async function() {
            const amount = parseFloat(depAmountInput.value) || 0;
            const isEditMode = editIdInput && editIdInput.value !== "";

            if (amount <= 0) return window.showSystemAlert("कृपया एक वैध जमा राशि दर्ज करें।", "Validation Missing", "❌");

            const denoTotal = window.DenominationOutInComponent ? window.DenominationOutInComponent.calculate() : amount;
            if (denoTotal !== amount) return window.showSystemAlert("राशि का मिलान नहीं हुआ!", "Tally Mismatch", "⚠️");

            try {
                btnDepSave.disabled = true;
                btnDepSave.innerText = "सहेज रहे हैं...";

                const { data: liveUser } = await window.supabaseClient.from('user_roles').select('*').eq('ko_code', currentUser.ko_code).maybeSingle();
                let dbSettleBal = parseFloat(liveUser.settlement_balance) || 0;
                
                let oldLog = null;
                if (isEditMode) {
                    const { data: logRes } = await window.supabaseClient.from('settlement_logs').select('*').eq('id', editIdInput.value).maybeSingle();
                    oldLog = logRes;
                    dbSettleBal = dbSettleBal - (parseFloat(oldLog?.amount) || 0);
                }

                const computedNewBalance = dbSettleBal + amount;
                const inputNotes = window.DenominationOutInComponent.getValues();
                
                let updatedNotesPayload = { settlement_balance: computedNewBalance };
                let logTablePayload = {
                    ko_code: currentUser.ko_code,
                    transaction_type: 'DEPOSIT',
                    amount: amount,
                    previous_balance: dbSettleBal,
                    new_balance: computedNewBalance,
                    narration: isEditMode ? "Settlement Account Deposit (Updated)" : "Settlement Account Deposit"
                };

                const noteKeys = [500, 200, 100, 50, 20, 10, 5];
                noteKeys.forEach(d => {
                    const dbKey = `cash_${d}`;
                    const logOutKey = `denom_out_${d}`;
                    
                    let currentStock = parseInt(liveUser[dbKey]) || 0;
                    const enteredQty = parseInt(inputNotes[dbKey]) || 0;

                    if (isEditMode && oldLog) {
                        const oldQty = parseInt(oldLog[logOutKey]) || 0;
                        currentStock += oldQty;
                    }

                    updatedNotesPayload[dbKey] = Math.max(0, currentStock - enteredQty);
                    logTablePayload[logOutKey] = enteredQty;
                });

                let currentCoins = parseInt(liveUser['cash_coins']) || 0;
                const enteredCoins = parseInt(inputNotes['cash_coins']) || 0;
                if (isEditMode && oldLog) { currentCoins += (parseInt(oldLog['denom_out_coins']) || 0); }
                updatedNotesPayload['cash_coins'] = Math.max(0, currentCoins - enteredCoins);
                logTablePayload['denom_out_coins'] = enteredCoins;

                const { error: userErr } = await window.supabaseClient.from('user_roles').update(updatedNotesPayload).eq('ko_code', currentUser.ko_code);
                if (userErr) throw userErr;

                if (isEditMode) {
                    await window.supabaseClient.from('settlement_logs').update(logTablePayload).eq('id', editIdInput.value);
                    window.showSystemAlert("एंट्री और डिनॉमिनेशन स्टॉक सफलतापूर्वक री-कैलकुलेट होकर अपडेट हो गए! ✅", "सफलता", "✅");
                } else {
                    await window.supabaseClient.from('settlement_logs').insert([logTablePayload]);
                    window.showSystemAlert(`₹${amount.toFixed(2)} सफलतापूर्वक सेटलमेंट खाते में जोड़े गए।`, "सफलता", "✅");
                }

                resetSettleFormStates();
                await syncLiveSettlementVault();
                switchTabTo('deposit');

            } catch (err) {
                console.error(err);
                window.showSystemAlert("डेटाबेस अपडेट विफल हुआ।", "त्रुटि", "❌");
            } finally { btnDepSave.disabled = false; }
        };
    }

    // 🚀 [WITHDRAWAL MASTER ROUTINE]
    const btnWitSave = document.getElementById('btn-settle-wit-save');
    if (btnWitSave) {
        btnWitSave.onclick = async function() {
            const amount = parseFloat(witAmountInput.value) || 0;
            const isEditMode = editIdInput && editIdInput.value !== "";

            if (amount <= 0) return window.showSystemAlert("कृपया एक वैध निकासी राशि दर्ज करें।", "Validation Missing", "❌");

            const denoTotal = window.DenominationInOutComponent ? window.DenominationInOutComponent.calculate() : amount;
            if (denoTotal !== amount) return window.showSystemAlert("राशि का मिलान नहीं हुआ!", "Tally Mismatch", "⚠️");

            try {
                btnWitSave.disabled = true;
                btnWitSave.innerText = "सहेज रहे हैं...";

                const { data: liveUser } = await window.supabaseClient.from('user_roles').select('*').eq('ko_code', currentUser.ko_code).maybeSingle();
                let dbSettleBal = parseFloat(liveUser.settlement_balance) || 0;
                
                let oldLog = null;
                if (isEditMode) {
                    const { data: logRes } = await window.supabaseClient.from('settlement_logs').select('*').eq('id', editIdInput.value).maybeSingle();
                    oldLog = logRes;
                    dbSettleBal = dbSettleBal + (parseFloat(oldLog?.amount) || 0);
                }
                
                const computedNewBalance = dbSettleBal - amount;
                if (computedNewBalance < 0) {
                    window.showSystemAlert("अपर्याप्त बैलेंस!", "Insufficient Capital", "⚠️");
                    btnWitSave.disabled = false;
                    btnWitSave.innerText = "📤 Save Bank Withdrawal";
                    return;
                }

                const inputNotes = window.DenominationInOutComponent.getValues();
                let updatedNotesPayload = { settlement_balance: computedNewBalance };
                let logTablePayload = {
                    ko_code: currentUser.ko_code,
                    transaction_type: 'WITHDRAWAL',
                    amount: amount,
                    previous_balance: dbSettleBal,
                    new_balance: computedNewBalance,
                    narration: isEditMode ? "Settlement Account Withdrawal (Updated)" : "Settlement Account Withdrawal"
                };

                const noteKeys = [500, 200, 100, 50, 20, 10, 5];
                let stockCheckPass = true;

                for (let i = 0; i < noteKeys.length; i++) {
                    const d = noteKeys[i];
                    const dbKey = `cash_${d}`;
                    const logInKey = `denom_in_${d}`;
                    
                    let currentStock = parseInt(liveUser[dbKey]) || 0;
                    const enteredQty = parseInt(inputNotes[dbKey]) || 0;

                    if (isEditMode && oldLog) {
                        const oldQty = parseInt(oldLog[logInKey]) || 0;
                        currentStock -= oldQty;
                    }

                    const finalStock = currentStock + enteredQty;
                    if (finalStock < 0) {
                        window.showSystemAlert(`काउंटर पर ₹${d} के पर्याप्त नोट उपलब्ध नहीं हैं!`, "Stock Error", "❌");
                        stockCheckPass = false;
                        break;
                    }
                    updatedNotesPayload[dbKey] = finalStock;
                    logTablePayload[logInKey] = enteredQty;
                }

                if (!stockCheckPass) { btnWitSave.disabled = false; return; }

                let currentCoins = parseInt(liveUser['cash_coins']) || 0;
                const enteredCoins = parseInt(inputNotes['cash_coins']) || 0;
                if (isEditMode && oldLog) { currentCoins -= (parseInt(oldLog['denom_in_coins']) || 0); }
                updatedNotesPayload['cash_coins'] = currentCoins + enteredCoins;
                logTablePayload['denom_in_coins'] = enteredCoins;

                const { error: userErr } = await window.supabaseClient.from('user_roles').update(updatedNotesPayload).eq('ko_code', currentUser.ko_code);
                if (userErr) throw userErr;

                if (isEditMode) {
                    await window.supabaseClient.from('settlement_logs').update(logTablePayload).eq('id', editIdInput.value);
                    window.showSystemAlert("एंट्री और डिनॉमिनेशन स्टॉक सफलतापूर्वक री-कैलकुलेट होकर अपडेट हो गए! ✅", "सफलता", "✅");
                } else {
                    await window.supabaseClient.from('settlement_logs').insert([logTablePayload]);
                    window.showSystemAlert(`₹${amount.toFixed(2)} सेटलमेंट खाते से काट कर काउंटर पर जोड़ दिए गए हैं।`, "सफलता", "✅");
                }

                resetSettleFormStates();
                await syncLiveSettlementVault();
                switchTabTo('withdrawal');

            } catch (err) {
                console.error(err);
            } finally { btnWitSave.disabled = false; }
        };
    }

    // 🚀 [CONTRA ROUTINE]
    const btnContraSave = document.getElementById('btn-settle-contra-save');
    if (btnContraSave) {
        btnContraSave.onclick = async function() {
            const type = document.getElementById('settle-contra-type').value;
            const amount = parseFloat(contraAmountInput.value) || 0;
            if (amount <= 0) return window.showSystemAlert("कृपया वैध राशि भरें", "Error", "❌");

            try {
                btnContraSave.disabled = true;
                const { data: liveUser } = await window.supabaseClient.from('user_roles').select('settlement_balance').eq('ko_code', currentUser.ko_code).maybeSingle();
                const currentDBBal = parseFloat(liveUser.settlement_balance) || 0;

                let computedNewBalance = type === 'credit' ? currentDBBal + amount : currentDBBal - amount;
                if (computedNewBalance < 0) return window.showSystemAlert("अपर्याप्त बैलेंस!", "Error", "⚠️");

                await window.supabaseClient.from('user_roles').update({ settlement_balance: computedNewBalance }).eq('ko_code', currentUser.ko_code);

                await window.supabaseClient.from('settlement_logs').insert([{
                    ko_code: currentUser.ko_code,
                    transaction_type: 'CONTRA',
                    amount: amount,
                    previous_balance: currentDBBal,
                    new_balance: computedNewBalance,
                    narration: `Direct Contra ${type.toUpperCase()}`
                }]);

                window.showSystemAlert("डायरेक्ट कॉन्ट्रा समायोजन पूरा हुआ।", "सफलता", "✅");
                contraAmountInput.value = "";
                await syncLiveSettlementVault();
            } catch (err) { console.error(err); } finally { btnContraSave.disabled = false; }
        };
    }

    // 🔧 [TABLE ACTIONS HANDLERS]
    function attachTableActionListeners() {
        // Edit 📝
        document.querySelectorAll('.settle-edit-btn').forEach(btn => {
            btn.onclick = async function() {
                const logId = this.getAttribute('data-id');
                const { data: log } = await window.supabaseClient.from('settlement_logs').select('*').eq('id', logId).maybeSingle();
                if (!log) return;

                if (editIdInput) editIdInput.value = log.id;
                resetSettleFormStates();

                if (log.transaction_type === 'DEPOSIT') {
                    switchTabTo('deposit');
                    if(editIdInput) editIdInput.value = log.id; 
                    depAmountInput.value = log.amount;
                    depAmountInput.dispatchEvent(new Event('input'));
                    document.getElementById('dep-panel-title').innerText = "📝 Edit Deposit Entry";
                    btnDepSave.innerText = "⚙️ Update Deposit Entry";

                    setTimeout(() => {
                        [500, 200, 100, 50, 20, 10, 5].forEach(d => {
                            const inputCell = document.querySelector(`.gen-out-val[data-note="${d}"]`);
                            if (inputCell) inputCell.value = log[`denom_out_${d}`] || 0;
                        });
                        const coinsCell = document.querySelector('.gen-out-val[data-note="coins"]');
                        if (coinsCell) coinsCell.value = log['denom_out_coins'] || 0;
                        
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
                        [500, 200, 100, 50, 20, 10, 5].forEach(d => {
                            const inputCell = document.querySelector(`.gen-in-val[data-note="${d}"]`);
                            if (inputCell) inputCell.value = log[`denom_in_${d}`] || 0;
                        });
                        const coinsCell = document.querySelector('.gen-in-val[data-note="coins"]');
                        if (coinsCell) coinsCell.value = log['denom_in_coins'] || 0;
                        
                        if (window.DenominationInOutComponent) window.DenominationInOutComponent.calculate();
                    }, 100);
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
        });

        // 🗑️ Delete (🌟 COMPLETE FIX: Browser Confirm box poori tarah saaf, sirf premium custom popup chalega)
        document.querySelectorAll('.settle-del-btn').forEach(btn => {
            btn.onclick = function() {
                const logId = this.getAttribute('data-id');
                
                if (typeof window.showCustomSystemConfirm === 'function') {
                    window.showCustomSystemConfirm(
                        "क्या आप वाकई इस एंट्री को डिलीट करना चाहते हैं? इससे बैंक बैलेंस और काउंटर नोट दोनों रोलबैक हो जाएंगे।",
                        "एंट्री डिलीट करें 🗑️",
                        async function() { 
                            await executeLogDeletion(logId); 
                        }
                    );
                } else {
                    // Fail-safe protection mapping
                    executeLogDeletion(logId);
                }
            };
        });
    }

    // 💣 Delete Rollback Master Execution
    async function executeLogDeletion(logId) {
        try {
            const { data: log } = await window.supabaseClient.from('settlement_logs').select('*').eq('id', logId).maybeSingle();
            if (!log) return;

            const { data: liveUser } = await window.supabaseClient.from('user_roles').select('*').eq('ko_code', currentUser.ko_code).maybeSingle();
            let currentDBBal = parseFloat(liveUser.settlement_balance) || 0;

            let rolledBackBal = currentDBBal;
            let updatedNotesPayload = {};
            const noteKeys = [500, 200, 100, 50, 20, 10, 5];

            if (log.transaction_type === 'DEPOSIT') {
                rolledBackBal = currentDBBal - parseFloat(log.amount);
                updatedNotesPayload['settlement_balance'] = rolledBackBal;

                noteKeys.forEach(d => {
                    const dbKey = `cash_${d}`;
                    updatedNotesPayload[dbKey] = (parseInt(liveUser[dbKey]) || 0) + (parseInt(log[`denom_out_${d}`]) || 0);
                });
                updatedNotesPayload['cash_coins'] = (parseInt(liveUser['cash_coins']) || 0) + (parseInt(log['denom_out_coins']) || 0);

            } else if (log.transaction_type === 'WITHDRAWAL') {
                rolledBackBal = currentDBBal + parseFloat(log.amount);
                updatedNotesPayload['settlement_balance'] = rolledBackBal;

                let deletePass = true;
                for (let i = 0; i < noteKeys.length; i++) {
                    const d = noteKeys[i];
                    const dbKey = `cash_${d}`;
                    const remQty = (parseInt(liveUser[dbKey]) || 0) - (parseInt(log[`denom_in_${d}`]) || 0);
                    if (remQty < 0) {
                        window.showSystemAlert(`डिलीट रद्द! काउंटर पर ₹${d} के पर्याप्त नोट नहीं हैं।`, "Alert", "❌");
                        deletePass = false; break;
                    }
                    updatedNotesPayload[dbKey] = remQty;
                }
                if (!deletePass) return;
                updatedNotesPayload['cash_coins'] = Math.max(0, (parseInt(liveUser['cash_coins']) || 0) - (parseInt(log['denom_in_coins']) || 0));
            }

            if (rolledBackBal < 0) return window.showSystemAlert("रोलबैक रद्द! बैंक बैलेंस Negative हो रहा है।", "Error", "❌");

            await window.supabaseClient.from('user_roles').update(updatedNotesPayload).eq('ko_code', currentUser.ko_code);
            await window.supabaseClient.from('settlement_logs').delete().eq('id', logId);

            window.showSystemAlert("एंट्री सफलतापूर्वक डिलीट हुई और 100% सही रोलबैक हो गई! ✅", "Deleted", "✅");
            await syncLiveSettlementVault();
        } catch (e) { console.error(e); }
    }

    await syncLiveSettlementVault();
    mountDenominationForPanel('deposit');
};
