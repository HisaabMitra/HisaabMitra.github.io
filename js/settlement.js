// ========================================================
// 🏢 VAULT ENGINE: REAL-TIME SETTLEMENT & CAPITAL RECONCILIATION
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
    let currentSettlementAccountNo = currentUser?.settlement_account_no || "NOT_CONFIGURED";

    // Inject User Bank Details into Top Header Dashboard
    if (lblAccNo) lblAccNo.innerText = currentSettlementAccountNo;

    try {
        // 💳 [VAULT UTILITY]: Live Bank Ledger Sync from Database
        async function syncLiveSettlementVault() {
            try {
                // Fetch current user details from data matrix to reflect real-time wallet balance
                const { data, error } = await window.supabaseClient
                    .from('kiosk_users')
                    .select('settlement_balance, settlement_account_no')
                    .eq('ko_code', currentUser.ko_code)
                    .maybeSingle();

                if (error) throw error;

                if (data) {
                    currentSettlementBalance = parseFloat(data.settlement_balance) || 0;
                    currentSettlementAccountNo = data.settlement_account_no || "NOT_CONFIGURED";
                    
                    if (lblBalance) lblBalance.innerText = `₹${currentSettlementBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                    if (lblAccNo) lblAccNo.innerText = currentSettlementAccountNo;
                }
            } catch (err) {
                console.error("❌ Failed to sync settlement balances from cloud node:", err);
            }
        }

        // 🔄 [TAB PANEL SWAPPER ROUTINE]: Switches view layouts
        optButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetPanel = btn.getAttribute('data-panel');

                // Toggle Button styling
                optButtons.forEach(b => {
                    b.style.background = '#ffffff';
                    b.style.color = '#495057';
                });
                btn.style.background = targetPanel === 'withdrawal' ? '#27ae60' : (targetPanel === 'contra' ? '#343a40' : '#7d0022');
                btn.style.color = '#ffffff';

                // Toggle Panels active states
                panels.forEach(p => p.style.display = 'none');
                const targetElement = document.getElementById(`panel-settle-${targetPanel}`);
                if (targetElement) targetElement.style.display = 'block';

                // Dynamic Denomination Mounting Logic based on active context
                mountDenominationForPanel(targetPanel);
            });
        });

        // 🧮 [DENOMINATION MOUNT ENGINE]: Inject global widget into target viewport
        function mountDenominationForPanel(panelType) {
            if (!window.WitDenominationComponent) {
                console.error("Denomination component script reference missing from browser window map.");
                return;
            }

            // Clear any active instances running in standard viewport
            window.WitDenominationComponent.clear();

            if (panelType === 'deposit') {
                // DEPOSIT MODE: Counter Cash OUT Flow setup
                window.WitDenominationComponent.render('settle-deposit-denom-container');
                updateDenominationHeaderLabel("📥 Cash Out Counter Matrix");
            } else if (panelType === 'withdrawal') {
                // WITHDRAWAL MODE: Counter Cash IN Flow setup
                window.WitDenominationComponent.render('settle-withdrawal-denom-container');
                updateDenominationHeaderLabel("📤 Cash In Counter Matrix");
            }
        }

        function updateDenominationHeaderLabel(textString) {
            setTimeout(() => {
                const headerLabel = document.querySelector('.denom-header-title');
                if (headerLabel) headerLabel.innerText = textString;
            }, 50);
        }

        // 🔢 [LIVE WORD STREAM TRANSLATORS]: Amount dynamic input handlers
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
            inputNode.addEventListener('wheel', e => e.preventDefault(), { passive: false });
        }

        attachWordTranslator(depAmountInput, depWords);
        attachWordTranslator(witAmountInput, witWords);

        // 🚀 [DATABASE TRANSACTION ROUTER]: Process Bank Deposit Operation (+ Settle)
        const btnDepSave = document.getElementById('btn-settle-dep-save');
        if (btnDepSave) {
            btnDepSave.onclick = async function() {
                const amount = parseFloat(depAmountInput.value) || 0;
                if (amount <= 0) {
                    window.showSystemAlert("कृपया एक वैध जमा राशि दर्ज करें।", "Validation Missing", "❌");
                    return;
                }

                // Verify denomination tally against input box amount
                const denoTotal = window.WitDenominationComponent ? window.WitDenominationComponent.getTotalAmount() : amount;
                if (denoTotal !== amount) {
                    window.showSystemAlert(`राशि का मिलान नहीं हुआ!\nदर्ज राशि: ₹${amount}\nडिनॉमिनेशन कुल: ₹${denoTotal}`, "Tally Mismatch", "⚠️");
                    return;
                }

                try {
                    btnDepSave.disabled = true;
                    btnDepSave.innerText = "Processing Vault Update...";

                    // Khas Logic Hook: Calculate New Settlement Balance (Current Balance + Input Amount)
                    const computedNewBalance = currentSettlementBalance + amount;

                    // Execute atomic mutations on user configuration profile ledger
                    const { error } = await window.supabaseClient
                        .from('kiosk_users')
                        .update({
                            settlement_balance: computedNewBalance,
                            updated_at: new Date().toISOString()
                        })
                        .eq('ko_code', currentUser.ko_code);

                    if (error) throw error;

                    // Log audit trail snapshot to transactional log tables
                    await window.supabaseClient.from('settlement_logs').insert([{
                        ko_code: currentUser.ko_code,
                        transaction_type: 'DEPOSIT',
                        amount: amount,
                        previous_balance: currentSettlementBalance,
                        new_balance: computedNewBalance,
                        narration: "Settlement Account Cash Deposit Entry (Counter Out)"
                    }]);

                    window.showSystemAlert(`₹${amount.toFixed(2)} सफलतापूर्वक आपके सेटलमेंट खाते में जमा कर दिए गए हैं।`, "Vault Updated", "✅");
                    
                    // Reset input view fields
                    depAmountInput.value = "";
                    if (depWords) depWords.innerText = "Zero Rupees Only";
                    
                    // Sync system balance panels
                    await syncLiveSettlementVault();
                    mountDenominationForPanel('deposit');

                } catch (err) {
                    console.error("Failed to commit bank vault deposit:", err);
                    window.showSystemAlert("डेटाबेस अपडेट विफलता।", "Transaction Aborted", "❌");
                } finally {
                    btnDepSave.disabled = false;
                    btnDepSave.innerText = "📥 Process Bank Deposit";
                }
            };
        }

        // 🚀 [DATABASE TRANSACTION ROUTER]: Process Bank Withdrawal Operation (- Settle)
        const btnWitSave = document.getElementById('btn-settle-wit-save');
        if (btnWitSave) {
            btnWitSave.onclick = async function() {
                const amount = parseFloat(witAmountInput.value) || 0;
                if (amount <= 0) {
                    window.showSystemAlert("कृपया एक वैध निकासी राशि दर्ज करें।", "Validation Missing", "❌");
                    return;
                }

                if (amount > currentSettlementBalance) {
                    window.showSystemAlert("आपके सेटलमेंट खाते में पर्याप्त राशि उपलब्ध नहीं है!", "Insufficient Capital", "⚠️");
                    return;
                }

                const denoTotal = window.WitDenominationComponent ? window.WitDenominationComponent.getTotalAmount() : amount;
                if (denoTotal !== amount) {
                    window.showSystemAlert(`राशि का मिलान नहीं हुआ!\nदर्ज राशि: ₹${amount}\nडिनॉमिनेशन कुल: ₹${denoTotal}`, "Tally Mismatch", "⚠️");
                    return;
                }

                try {
                    btnWitSave.disabled = true;
                    btnWitSave.innerText = "Processing Vault Update...";

                    // Khas Logic Hook: Calculate New Settlement Balance (Current Balance - Input Amount)
                    const computedNewBalance = currentSettlementBalance - amount;

                    const { error } = await window.supabaseClient
                        .from('kiosk_users')
                        .update({
                            settlement_balance: computedNewBalance,
                            updated_at: new Date().toISOString()
                        })
                        .eq('ko_code', currentUser.ko_code);

                    if (error) throw error;

                    await window.supabaseClient.from('settlement_logs').insert([{
                        ko_code: currentUser.ko_code,
                        transaction_type: 'WITHDRAWAL',
                        amount: amount,
                        previous_balance: currentSettlementBalance,
                        new_balance: computedNewBalance,
                        narration: "Settlement Account Cash Withdrawal Entry (Counter In)"
                    }]);

                    window.showSystemAlert(`₹${amount.toFixed(2)} आपके सेटलमेंट खाते से काट कर काउंटर कैश इनफ्लो में जोड़ दिए गए हैं।`, "Vault Updated", "✅");
                    
                    witAmountInput.value = "";
                    if (witWords) witWords.innerText = "Zero Rupees Only";

                    await syncLiveSettlementVault();
                    mountDenominationForPanel('withdrawal');

                } catch (err) {
                    console.error("Failed to commit bank vault withdrawal:", err);
                    window.showSystemAlert("डेटाबेस अपडेट विफलता।", "Transaction Aborted", "❌");
                } finally {
                    btnWitSave.disabled = false;
                    btnWitSave.innerText = "📤 Process Bank Withdrawal";
                }
            };
        }

        // 🚀 [DATABASE TRANSACTION ROUTER]: Process Contra Adjustment Operation
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
                    btnContraSave.innerText = "Executing Adjustments...";

                    await window.supabaseClient.from('settlement_logs').insert([{
                        ko_code: currentUser.ko_code,
                        transaction_type: 'CONTRA',
                        amount: amount,
                        previous_balance: currentSettlementBalance,
                        new_balance: currentSettlementBalance,
                        narration: `Contra Entry: ${type === 'cash_to_safe' ? 'Counter Cash to Vault Safe' : 'Vault Safe to Counter Cash'}`
                    }]);

                    window.showSystemAlert("कॉन्ट्रा एंट्री आंतरिक सामंजस्य के लिए दर्ज कर ली गई है।", "Contra Success", "✅");
                    contraAmountInput.value = "";

                } catch (err) {
                    console.error("Contra adjustment failure:", err);
                } finally {
                    btnContraSave.disabled = false;
                    btnContraSave.innerText = "🔄 Execute Contra";
                }
            };
        }

        // Run Initial Core Synchronization Procedures on Launch
        await syncLiveSettlementVault();
        mountDenominationForPanel('deposit');

    } catch (fatalErr) {
        console.error("Fatal Error inside Settlement Core Router Spooler:", fatalErr);
    }
};
