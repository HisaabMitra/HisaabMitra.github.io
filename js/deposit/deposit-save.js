document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'btn-dep-save') {
        
        const accInput = document.getElementById('dep-account-no');
        const custNameInput = document.getElementById('dep-cust-name');
        const amountInput = document.getElementById('dep-amount');
        const remarksInput = document.getElementById('dep-remarks');
        
        const accountNo = accInput.value.trim();
        const custName = custNameInput.value.trim();
        const amount = parseFloat(amountInput.value) || 0;
        const remarks = remarksInput.value.trim();
        
        let netCash = 0;
        let denomValues = {};
        if (window.DenominationComponent) {
            netCash = parseFloat(window.DenominationComponent.calculate()) || 0;
            denomValues = window.DenominationComponent.getValues() || {};
        }

        // 1. बुनियादी वैलिडेशन चेक
        if (!accountNo || !custName || amount <= 0) {
            window.showSystemAlert("सभी ज़रूरी फ़ील्ड भरें!", "Validation Error", "❌");
            return;
        }

        // 2. ग्लोबल यूज़र सेशन चेक
        if (!window.currentUser || !window.currentUser.id) {
            window.showSystemAlert("यूज़र सेशन नहीं मिला! कृपया फिर से लॉगिन करें।", "Authentication Error", "❌");
            return;
        }

        // 🛑 [NEW ENGINE] 25,000/- प्रति अकाउंट प्रति दिन लिमिट चेक करने का फंक्शन
        const checkDailyDepositLimit = async (accNo, newAmt, currentTxId = null) => {
            const today = new Date().toISOString().split('T')[0]; // आज की तारीख (YYYY-MM-DD)
            
            try {
                // आज इस अकाउंट नंबर पर हुई सभी सफल ट्रांजैक्शन्स डेटाबेस से उठाएं
                const { data: txList, error: queryErr } = await window.supabaseClient
                    .from('deposit_transactions')
                    .select('amount, transaction_id')
                    .eq('account_number', accNo)
                    .gte('transaction_date', `${today}T00:00:00`);

                if (queryErr) throw queryErr;

                let alreadyDeposited = 0;
                if (txList && txList.length > 0) {
                    txList.forEach(tx => {
                        // अगर हम एडिट (Update) कर रहे हैं, तो पुरानी वाली सेम ट्रांजैक्शन का अमाउंट काउंट नहीं करेंगे
                        if (currentTxId && tx.transaction_id === currentTxId) {
                            return;
                        }
                        alreadyDeposited += parseFloat(tx.amount) || 0;
                    });
                }

                const totalPostCurrentTx = alreadyDeposited + newAmt;
                const maxLimit = 25000;

                if (totalPostCurrentTx > maxLimit) {
                    const remainingLimit = maxLimit - alreadyDeposited;
                    window.showSystemAlert(
                        `🛑 दैनिक सीमा उल्लंघन!\n\nइस अकाउंट में आज पहले ही ₹${alreadyDeposited.toLocaleString('en-IN')} जमा हो चुके हैं।\nअब आज सिर्फ ₹${remainingLimit > 0 ? remainingLimit.toLocaleString('en-IN') : 0} ही जमा किए जा सकते हैं।\n\nकुल दैनिक सीमा: ₹25,000`,
                        "Daily Limit Exceeded",
                        "❌"
                    );
                    return false; // लिमिट पार हो गई, आगे मत बढ़ो
                }
                
                return true; // लिमिट के अंदर है, हरी झंडी!
            } catch (err) {
                console.error("Limit Check Error:", err);
                window.showSystemAlert("दैनिक सीमा जांचने में विफलता: " + err.message, "System Error", "❌");
                return false;
            }
        };

        // [A] पुराना सेव फ़ंक्शन (सिर्फ नए ट्रांजैक्शन के लिए)
        const saveTransactionData = async () => {
            let calcCommission = Math.min(amount * 0.004, 50);
            
            try {
                // पहले स्टेप: ट्रांजैक्शन लॉग को记录 करें
                const { data: txData, error: txError } = await window.supabaseClient
                    .from('deposit_transactions')
                    .insert([{ 
                        ko_code: window.currentUser.ko_code, 
                        account_number: accountNo, 
                        customer_name: custName, 
                        amount: amount, 
                        commission: calcCommission, 
                        remarks: remarks, 
                        ...denomValues 
                    }])
                    .select().single();
                
                if (txError) throw txError;

                // दूसरे स्टेप: नए माइनस बैलेंस और डिनॉमिनेशन की गणना करें
                const currentSettlementBalance = parseFloat(window.currentUser.settlement_balance) || 0;
                const updatedSettlementBalance = currentSettlementBalance - amount; 
                
                const nextVaultData = {
                    settlement_balance: updatedSettlementBalance,
                    cash_500: (parseInt(window.currentUser.cash_500) || 0) + (denomValues.denom_in_500 || 0) - (denomValues.denom_out_500 || 0),
                    cash_200: (parseInt(window.currentUser.cash_200) || 0) + (denomValues.denom_in_200 || 0) - (denomValues.denom_out_200 || 0),
                    cash_100: (parseInt(window.currentUser.cash_100) || 0) + (denomValues.denom_in_100 || 0) - (denomValues.denom_out_100 || 0),
                    cash_50:  (parseInt(window.currentUser.cash_50)  || 0) + (denomValues.denom_in_5  || 0) - (denomValues.denom_out_50  || 0),
                    cash_20:  (parseInt(window.currentUser.cash_20)  || 0) + (denomValues.denom_in_20  || 0) - (denomValues.denom_out_20  || 0),
                    cash_10:  (parseInt(window.currentUser.cash_10)  || 0) + (denomValues.denom_in_10  || 0) - (denomValues.denom_out_10  || 0),
                    cash_5:   (parseInt(window.currentUser.cash_5)   || 0) + (denomValues.denom_in_5   || 0) - (denomValues.denom_out_5   || 0),
                    cash_coins: (parseInt(window.currentUser.cash_coins) || 0) + (denomValues.denom_in_coins || 0) - (denomValues.denom_out_coins || 0)
                };

                // तीसरे स्टेप: user_roles टेबल में लाइव अपडेट भेजें
                const { error: userUpdateError } = await window.supabaseClient
                    .from('user_roles')
                    .update(nextVaultData)
                    .eq('id', window.currentUser.id);

                if (userUpdateError) throw userUpdateError;

                // चौथे स्टेप: लोकल विंडो यूज़र को अपडेट करें
                Object.assign(window.currentUser, nextVaultData);

                window.showSystemAlert("डिपॉजिट सफल और तिजोरी (Vault) अपडेट हो गई!", "Success", "✅");
                
                if (typeof window.loadTodayTransactions === 'function') {
                    window.loadTodayTransactions();
                }
                
                document.getElementById('btn-dep-clear').click();

            } catch (err) { 
                console.error("Transaction Core Error:", err);
                window.showSystemAlert("ट्रांजैक्शन फेल हो गया: " + err.message, "Error", "❌"); 
            }
        };

        // [B] लो बैलेंस नोटिफिकेशन और 2 सेकंड का ऑटो-प्रोसीड लॉजिक
        const checkBalanceAndProceed = () => {
            const currentSettlementBalance = parseFloat(window.currentUser.settlement_balance) || 0;
            
            if (currentSettlementBalance < amount) {
                const missingAmount = amount - currentSettlementBalance;
                
                window.showSystemAlert(`⚠️ सेटलमेंट में बैलेंस लो है! ₹${missingAmount.toLocaleString('en-IN')} ऐड कर लेना। ट्रांजैक्शन आगे बढ़ रही है...`, "Low Balance Notice", "ℹ️");
                
                setTimeout(() => {
                    saveTransactionData();
                }, 2000);
            } else {
                saveTransactionData();
            }
        };

        // 🌟 [C] SAVE या UPDATE मोड चेक करने का मुख्य ट्रैफिक कंट्रोलर लॉजिक (With Daily Limit Filter)
        const handleSaveOrUpdate = async () => {
            const saveBtnElement = document.getElementById('btn-dep-save');
            const isEditMode = saveBtnElement && saveBtnElement.dataset.mode === "edit";
            const editingTxId = isEditMode ? saveBtnElement.dataset.editingTxId : null;

            // 🛑 प्रोसेस करने से पहले दैनिक सीमा चेक करें
            const isWithinLimit = await checkDailyDepositLimit(accountNo, amount, editingTxId);
            if (!isWithinLimit) return; // सीमा पार होने पर यहीं रोक दें

            if (isEditMode) {
                // अगर बटन एडिट मोड में है, तो deposit-update.js वाली फाइल का फंक्शन रन होगा
                if (typeof window.processTransactionUpdate === 'function') {
                    console.log("Redirecting to Update Engine for Tx ID:", editingTxId);
                    window.processTransactionUpdate(editingTxId, accountNo, custName, amount, remarks, denomValues);
                } else {
                    window.showSystemAlert("त्रुटि: deposit-update.js फ़ाइल लोड नहीं है!", "Missing File", "❌");
                }
            } else {
                // अगर नॉर्मल मोड है, तो पुराना लो-बैलेंस चेक करके सेव करने वाला लॉजिक चलेगा
                checkBalanceAndProceed();
            }
        };

        // 4. अमाउंट और नेट कैश की मैचिंग चेक
        if (netCash === 0) {
            window.showSystemConfirm("बिना कैश आगे बढ़ें?", "Warning", handleSaveOrUpdate);
        } else if (Math.abs(netCash - amount) > 0.01) {
            window.showSystemAlert(`डिनॉमिनेशन टोटल (₹${netCash}) और जमा राशि (₹${amount}) मैच नहीं!`, "Error", "❌");
        } else {
            handleSaveOrUpdate();
        }
    }
});

// ⌨️ कीबोर्ड शॉर्टकट: Ctrl + S दबाने पर ट्रांज़ैक्शन सेव या अपडेट करें
document.addEventListener('keydown', function(e) {
    if ((e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); 
        const saveButton = document.getElementById('btn-dep-save');
        if (saveButton) {
            console.log("Shortcut Triggered: Ctrl + S");
            saveButton.click();
        }
    }
});

// ⌨️ keyboard shortcut: Esc (Escape) dabane par pura form clear karein
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
        const clearButton = document.getElementById('btn-dep-clear');
        if (clearButton) {
            console.log("Shortcut Triggered: Form Cleared via Esc");
            clearButton.click();
        }
    }
});
