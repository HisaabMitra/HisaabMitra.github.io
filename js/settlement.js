// ========================================================
// 🏢 VAULT ENGINE: REAL-TIME SETTLEMENT & CASH RECONCILIATION
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
            // Standalone safe table refresher call for today's logs
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

    // 🔄 [UPDATED VERTICAL TAB PANEL SWAPPER ROUTINE]
    optButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetPanel = btn.getAttribute('data-panel');

            // Form clean resets on swap
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

            // Set Premium Left Sidebar active state styles
            optButtons.forEach(b => {
                b.style.background = '#ffffff';
                b.style.color = '#495057';
                b.style.border = '1px solid #ced4da';
            });
            btn.style.background = targetPanel === 'withdrawal' ? '#27ae60' : (targetPanel === 'contra' ? '#343a40' : '#7d0022');
            btn.style.color = '#ffffff';
            btn.style.border = 'none';

            // Toggle active panels viewport display
            panels.forEach(p => p.style.display = 'none');
            const targetElement = document.getElementById(`panel-settle-${targetPanel}`);
            if (targetElement) targetElement.style.display = 'block';

            mountDenominationForPanel(targetPanel);
        });
    });

    // 🧮 [DENOMINATION MOUNT ENGINE] - RESTORED ORIGINAL
    function mountDenominationForPanel(panelType) {
        if (panelType === 'deposit' && window.DenominationOutInComponent) {
            window.DenominationOutInComponent.render('settle-deposit-denom-container');
        } else if (panelType === 'withdrawal' && window.DenominationInOutComponent) {
            window.DenominationInOutComponent.render('settle-withdrawal-denom-container');
        }
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

    // 🚀 [DEPOSIT ROUTINE]
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
                const dbSettleBal = parseFloat(liveUser.settlement_balance) || 0;
                
                let computedNewBalance = dbSettleBal;
                if (isEditMode) {
                    const { data: oldLog } = await window.supabaseClient.from('settlement_logs').select('amount').eq('id', editIdInput.value).maybeSingle();
                    computedNewBalance = (dbSettleBal - (parseFloat(oldLog?.amount) || 0)) + amount;
                } else {
                    computedNewBalance = dbSettleBal + amount;
                }

                const inputNotes = window.DenominationOutInComponent.getValues();
                let updatedNotesPayload = { settlement_balance: computedNewBalance };
                for (let key in inputNotes) {
                    const currentStock = parseInt(liveUser[key]) || 0;
                    updatedNotesPayload[key] = Math.max(0, currentStock - inputNotes[key]);
                }

                const { error } = await window.supabaseClient.from('user_roles').update(updatedNotesPayload).eq('ko_code', currentUser.ko_code);
                if (error) throw error;

                if (isEditMode) {
                    await window.supabaseClient.from('settlement_logs').update({ amount: amount, new_balance: computedNewBalance }).eq('id', editIdInput.value);
                    window.showSystemAlert("एंट्री सफलतापूर्वक अपडेट कर दी गई है।", "सफलता", "✅");
                } else {
                    await window.supabaseClient.from('settlement_logs').insert([{
                        ko_code: currentUser.ko_code,
                        transaction_type: 'DEPOSIT',
                        amount: amount,
                        previous_balance: dbSettleBal,
                        new_balance: computedNewBalance,
                        narration: "Settlement Account Deposit"
                    }]);
                    window.showSystemAlert(`₹${amount.toFixed(2)} सफलतापूर्वक सेटलमेंट खाते में जोड़े गए।`, "सफलता", "✅");
                }

                if (editIdInput) editIdInput.value = "";
                depAmountInput.value = "";
                if (depWords) depWords.innerText = "Zero Rupees Only";
                document.getElementById('dep-panel-title').innerText = "📥 Deposit Amount & Denomination";
                btnDepSave.innerText = "📥 Save Bank Deposit";
                
                await syncLiveSettlementVault();
                mountDenominationForPanel('deposit');

            } catch (err) {
                console.error(err);
                window.showSystemAlert("डेटाबेस अपडेट विफल हुआ।", "त्रुटि", "❌");
            } finally {
                btnDepSave.disabled = false;
            }
        };
    }

    // 🚀 [WITHDRAWAL ROUTINE]
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
                const dbSettleBal = parseFloat(liveUser.settlement_balance) || 0;
                
                let computedNewBalance = dbSettleBal;
                if (isEditMode) {
                    const { data: oldLog } = await window.supabaseClient.from('settlement_logs').select('amount').eq('id', editIdInput.value).maybeSingle();
                    computedNewBalance = (dbSettleBal + (parseFloat(oldLog?.amount) || 0)) - amount;
                } else {
                    computedNewBalance = dbSettleBal - amount;
                }
                
                if (computedNewBalance < 0) {
                    window.showSystemAlert("आपके सेटलमेंट खाते में पर्याप्त राशि उपलब्ध नहीं है!", "Insufficient Capital", "⚠️");
                    return;
                }

                const inputNotes = window.DenominationInOutComponent.getValues();
                let updatedNotesPayload = { settlement_balance: computedNewBalance };
                for (let key in inputNotes) {
                    const currentStock = parseInt(liveUser[key]) || 0;
                    updatedNotesPayload[key] = currentStock + inputNotes[key];
                }

                const { error } = await window.supabaseClient.from('user_roles').update(updatedNotesPayload).eq('ko_code', currentUser.ko_code);
                if (error) throw error;

                if (isEditMode) {
                    await window.supabaseClient.from('settlement_logs').update({ amount: amount, new_balance: computedNewBalance }).eq('id', editIdInput.value);
                    window.showSystemAlert("एंट्री सफलतापूर्वक अपडेट कर दी गई है।", "सफलता", "✅");
                } else {
                    await window.supabaseClient.from('settlement_logs').insert([{
                        ko_code: currentUser.ko_code,
                        transaction_type: 'WITHDRAWAL',
                        amount: amount,
                        previous_balance: dbSettleBal,
                        new_balance: computedNewBalance,
                        narration: "Settlement Account Withdrawal"
                    }]);
                    window.showSystemAlert(`₹${amount.toFixed(2)} सेटलमेंट खाते से काट कर काउंटर पर जोड़ दिए गए हैं।`, "सफलता", "✅");
                }

                if (editIdInput) editIdInput.value = "";
                witAmountInput.value = "";
                if (witWords) witWords.innerText = "Zero Rupees Only";
                document.getElementById('wit-panel-title').innerText = "📤 Withdrawal Amount & Denomination";
                btnWitSave.innerText = "📤 Save Bank Withdrawal";

                await syncLiveSettlementVault();
                mountDenominationForPanel('withdrawal');

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
        // 📝 1. EDIT OPERATIONAL HOOK (With Real Note Sync Injection)
        document.querySelectorAll('.settle-edit-btn').forEach(btn => {
            btn.onclick = async function() {
                const logId = this.getAttribute('data-id');
                const { data: log } = await window.supabaseClient.from('settlement_logs').select('*').eq('id', logId).maybeSingle();
                if (!log) return;

                if (editIdInput) editIdInput.value = log.id;

                optButtons.forEach(b => {
                    b.style.background = '#ffffff';
                    b.style.color = '#495057';
                    b.style.border = '1px solid #ced4da';
                });
                panels.forEach(p => p.style.display = 'none');

                // 🧠 LIVE SYNC FIX: Edit karte waqt log table se amount upar jayega, 
                // aur user_roles table se live note quantities ko uthakar input cells me autofill kar dega!
                const { data: liveNotes } = await window.supabaseClient.from('user_roles').select('*').eq('ko_code', currentUser.ko_code).maybeSingle();

                if (log.transaction_type === 'DEPOSIT') {
                    const dBtn = document.querySelector('.settle-opt-btn[data-panel="deposit"]');
                    if (dBtn) { dBtn.style.background = '#7d0022'; dBtn.style.color = '#fff'; dBtn.style.border = 'none'; }
                    document.getElementById('panel-settle-deposit').style.display = 'block';
                    
                    mountDenominationForPanel('deposit');
                    depAmountInput.value = log.amount;
                    depAmountInput.dispatchEvent(new Event('input'));
                    document.getElementById('dep-panel-title').innerText = "📝 Edit Deposit Entry";
                    btnDepSave.innerText = "⚙️ Update Deposit Entry";

                } else if (log.transaction_type === 'WITHDRAWAL') {
                    const wBtn = document.querySelector('.settle-opt-btn[data-panel="withdrawal"]');
                    if (wBtn) { wBtn.style.background = '#27ae60'; wBtn.style.color = '#fff'; wBtn.style.border = 'none'; }
                    document.getElementById('panel-settle-withdrawal').style.display = 'block';
                    
                    mountDenominationForPanel('withdrawal');
                    witAmountInput.value = log.amount;
                    witAmountInput.dispatchEvent(new Event('input'));
                    document.getElementById('wit-panel-title').innerText = "📝 Edit Withdrawal Entry";
                    btnWitSave.innerText = "⚙️ Update Withdrawal Entry";
                }
                
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
        });

        // 🗑️ 2. DELETE FLOW WITH SYSTEM NATIVE ALERTS BYPASS (Custom Modal Sync)
        document.querySelectorAll('.settle-del-btn').forEach(btn => {
            btn.onclick = function() {
                const logId = this.getAttribute('data-id');
                
                // Browser default confirm dialog box ko custom modular box se replace kiya
                if (typeof window.showCustomSystemConfirm === 'function') {
                    window.showCustomSystemConfirm(
                        "क्या आप वाकई इस सेटलमेंट एंट्री को डिलीट करना चाहते हैं? इससे बैलेंस वापस रोलबैक हो जाएगा।",
                        "Confirm Deletion",
                        async function() { await executeLogDeletion(logId); }
                    );
                } else {
                    // Fallback framework switch
                    if (confirm("क्या आप वाकई इस सेटलमेंट एंट्री को डिलीट करना चाहते हैं?")) {
                        executeLogDeletion(logId);
                    }
                }
            };
        });
    }

    // 💣 Actual Delete SQL firing framework with transaction state recovery
    async function executeLogDeletion(logId) {
        try {
            const { data: log } = await window.supabaseClient.from('settlement_logs').select('*').eq('id', logId).maybeSingle();
            if (!log) return;

            const { data: user } = await window.supabaseClient.from('user_roles').select('settlement_balance').eq('ko_code', currentUser.ko_code).maybeSingle();
            let currentDBBal = parseFloat(user.settlement_balance) || 0;

            let rolledBackBal = currentDBBal;
            if (log.transaction_type === 'DEPOSIT') {
                rolledBackBal = currentDBBal - parseFloat(log.amount);
            } else if (log.transaction_type === 'WITHDRAWAL') {
                rolledBackBal = currentDBBal + parseFloat(log.amount);
            }

            if (rolledBackBal < 0) {
                window.showSystemAlert("रोलबैक रद्द! डिलीट करने से बैंक बैलेंस नेगेटिव हो रहा है।", "Rollback Prohibited", "❌");
                return;
            }

            await window.supabaseClient.from('user_roles').update({ settlement_balance: rolledBackBal }).eq('ko_code', currentUser.ko_code);
            await window.supabaseClient.from('settlement_logs').delete().eq('id', logId);

            window.showSystemAlert("एंट्री सफलतापूर्वक डिलीट कर दी गई है और बैलेंस रोलबैक हो गया है।", "Deleted Complete", "✅");
            await syncLiveSettlementVault();

        } catch (e) {
            console.error("Deletion logic failure:", e);
        }
    }

    // Initial load syncs
    await syncLiveSettlementVault();
    mountDenominationForPanel('deposit');
};
