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

    // Alphabetical Words Indicators
    const depWords = document.getElementById('settle-dep-words');
    const witWords = document.getElementById('settle-wit-words');

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
        } catch (err) {
            console.error("❌ Failed to sync settlement balances from cloud node:", err);
        }
    }

    // 🔄 [TAB PANEL SWAPPER ROUTINE]
    optButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetPanel = btn.getAttribute('data-panel');

            optButtons.forEach(b => {
                b.style.background = '#ffffff';
                b.style.color = '#495057';
            });
            btn.style.background = targetPanel === 'withdrawal' ? '#27ae60' : (targetPanel === 'contra' ? '#343a40' : '#7d0022');
            btn.style.color = '#ffffff';

            panels.forEach(p => p.style.display = 'none');
            const targetElement = document.getElementById(`panel-settle-${targetPanel}`);
            if (targetElement) targetElement.style.display = 'block';

            mountDenominationForPanel(targetPanel);
        });
    });

    // 🧮 [DENOMINATION MOUNT ENGINE]
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

    // 🚀 [DEPOSIT ROUTINE]: Settle Balance (+), Counter Cash Notes (-)
    const btnDepSave = document.getElementById('btn-settle-dep-save');
    if (btnDepSave) {
        btnDepSave.onclick = async function() {
            const amount = parseFloat(depAmountInput.value) || 0;
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
                btnDepSave.innerText = "Processing Data Sync...";

                const { data: liveUser } = await window.supabaseClient.from('user_roles').select('*').eq('ko_code', currentUser.ko_code).maybeSingle();
                const computedNewBalance = (parseFloat(liveUser.settlement_balance) || 0) + amount;
                const inputNotes = window.DenominationOutInComponent.getValues();

                let updatedNotesPayload = { settlement_balance: computedNewBalance };
                for (let key in inputNotes) {
                    const currentStock = parseInt(liveUser[key]) || 0;
                    updatedNotesPayload[key] = Math.max(0, currentStock - inputNotes[key]);
                }

                const { error } = await window.supabaseClient.from('user_roles').update(updatedNotesPayload).eq('ko_code', currentUser.ko_code);
                if (error) throw error;

                await window.supabaseClient.from('settlement_logs').insert([{
                    ko_code: currentUser.ko_code,
                    transaction_type: 'DEPOSIT',
                    amount: amount,
                    previous_balance: parseFloat(liveUser.settlement_balance) || 0,
                    new_balance: computedNewBalance,
                    narration: "Settlement Account Deposit: Settle Plus (+), Counter Cash Out (-)"
                }]);

                window.showSystemAlert(`₹${amount.toFixed(2)} सेटलमेंट खाते में जोड़े गए, और काउंटर डिनॉमिनेशन से नोट माइनस कर दिए गए हैं।`, "Deposit Complete", "✅");
                depAmountInput.value = "";
                if (depWords) depWords.innerText = "Zero Rupees Only";
                await syncLiveSettlementVault();
                mountDenominationForPanel('deposit');

            } catch (err) {
                console.error(err);
                window.showSystemAlert("डेटाबेस अपडेट विफलता।", "Error", "❌");
            } finally {
                btnDepSave.disabled = false;
                btnDepSave.innerText = "📥 Process Bank Deposit";
            }
        };
    }

    // 🚀 [WITHDRAWAL ROUTINE]: Settle Balance (-), Counter Cash Notes (+)
    const btnWitSave = document.getElementById('btn-settle-wit-save');
    if (btnWitSave) {
        btnWitSave.onclick = async function() {
            const amount = parseFloat(witAmountInput.value) || 0;
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
                btnWitSave.innerText = "Processing Data Sync...";

                const { data: liveUser } = await window.supabaseClient.from('user_roles').select('*').eq('ko_code', currentUser.ko_code).maybeSingle();
                const dbSettleBal = parseFloat(liveUser.settlement_balance) || 0;
                
                if (amount > dbSettleBal) {
                    window.showSystemAlert("आपके सेटलमेंट खाते में पर्याप्त राशि उपलब्ध नहीं है!", "Insufficient Capital", "⚠️");
                    return;
                }

                const computedNewBalance = dbSettleBal - amount;
                const inputNotes = window.DenominationInOutComponent.getValues();

                let updatedNotesPayload = { settlement_balance: computedNewBalance };
                for (let key in inputNotes) {
                    const currentStock = parseInt(liveUser[key]) || 0;
                    updatedNotesPayload[key] = currentStock + inputNotes[key];
                }

                const { error } = await window.supabaseClient.from('user_roles').update(updatedNotesPayload).eq('ko_code', currentUser.ko_code);
                if (error) throw error;

                await window.supabaseClient.from('settlement_logs').insert([{
                    ko_code: currentUser.ko_code,
                    transaction_type: 'WITHDRAWAL',
                    amount: amount,
                    previous_balance: dbSettleBal,
                    new_balance: computedNewBalance,
                    narration: "Settlement Account Withdrawal: Settle Minus (-), Counter Cash In (+)"
                }]);

                window.showSystemAlert(`₹${amount.toFixed(2)} सेटलमेंट खाते से काटे गए, और काउंटर डिनॉमिनेशन में नोट प्लस कर दिए गए हैं।`, "Withdrawal Complete", "✅");
                witAmountInput.value = "";
                if (witWords) witWords.innerText = "Zero Rupees Only";
                await syncLiveSettlementVault();
                mountDenominationForPanel('withdrawal');

            } catch (err) {
                console.error(err);
                window.showSystemAlert("डेटाबेस अपडेट विफलता।", "Error", "❌");
            } finally {
                btnWitSave.disabled = false;
                btnWitSave.innerText = "📤 Process Bank Withdrawal";
            }
        };
    }

    // 🚀 [CONTRA ROUTINE]: LIVE DIRECT CREDIT/DEBIT MUTATION ENGINE 
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
                btnContraSave.innerText = "Processing Direct Mutation...";

                // Fetch current absolute live balance snapshot from database
                const { data: liveUser } = await window.supabaseClient.from('user_roles').select('settlement_balance').eq('ko_code', currentUser.ko_code).maybeSingle();
                const currentDBBal = parseFloat(liveUser.settlement_balance) || 0;

                let computedNewBalance = currentDBBal;

                // 🌟 ATOMIC LOGIC MAP: Evaluate mutation type rules
                if (type === 'credit') {
                    computedNewBalance = currentDBBal + amount; // Pure Credit Addition
                } else if (type === 'debit') {
                    if (amount > currentDBBal) {
                        window.showSystemAlert("इस डेबिट के लिए सेटलमेंट खाते में पर्याप्त राशि नहीं है!", "Insufficient Capital", "⚠️");
                        return;
                    }
                    computedNewBalance = currentDBBal - amount; // Pure Debit Subtraction
                }

                // 💾 Update database right away
                const { error: updateError } = await window.supabaseClient
                    .from('user_roles')
                    .update({ settlement_balance: computedNewBalance })
                    .eq('ko_code', currentUser.ko_code);

                if (updateError) throw updateError;

                // Log entry directly into audit ledger logs table
                await window.supabaseClient.from('settlement_logs').insert([{
                    ko_code: currentUser.ko_code,
                    transaction_type: 'CONTRA',
                    amount: amount,
                    previous_balance: currentDBBal,
                    new_balance: computedNewBalance,
                    narration: `Direct Contra Adjustment: Balance Successfully ${type.toUpperCase() + 'ED'}`
                }]);

                window.showSystemAlert(`₹${amount.toFixed(2)} का डायरेक्ट कॉन्ट्रा ${type === 'credit' ? 'क्रेडिट' : 'डेबिट'} सफलतापूर्वक पूरा हुआ।`, "Contra Applied", "✅");
                contraAmountInput.value = "";
                await syncLiveSettlementVault();

            } catch (err) {
                console.error("Critical Contra direct balance fault:", err);
                window.showSystemAlert("कॉन्ट्रा बैलेंस म्यूटेशन फेल हुआ।", "Error", "❌");
            } finally {
                btnContraSave.disabled = false;
                btnContraSave.innerText = "🔄 Execute Contra Adjustment";
            }
        };
    }

    // Initial load syncs
    await syncLiveSettlementVault();
    mountDenominationForPanel('deposit');
};
