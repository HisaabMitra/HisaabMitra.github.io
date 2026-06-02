// ========================================================
// 💾 SINGLE DEPOSIT SAVE ENGINE (LIGHTWEIGHT & SECURE)
// ========================================================

document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'btn-dep-save') {
        
        // सिंगल डिपॉजिट के DOM एलिमेंट्स फ़ेच करें
        const accInput = document.getElementById('dep-account-no');
        const custNameInput = document.getElementById('dep-cust-name');
        const amountInput = document.getElementById('dep-amount');
        const remarksInput = document.getElementById('dep-remarks');
        
        // सुरक्षा गार्ड: अगर सिंगल काउंटर के इनपुट स्क्रीन पर नहीं हैं, तो आगे मत बढ़ो
        if (!accInput || !amountInput) return; 

        const accountNo = accInput.value.trim();
        const custName = custNameInput.value.trim();
        const amount = parseFloat(amountInput.value) || 0;
        const remarks = remarksInput.value.trim();
        
        // डिनॉमिनेशन कॉम्पोनेंट से लाइव वैल्यूज निकालें
        let netCash = 0;
        let denomValues = {};
        if (window.DenominationComponent) {
            netCash = parseFloat(window.DenominationComponent.calculate()) || 0;
            denomValues = window.DenominationComponent.getValues() || {};
        }

        // 1. बुनियादी वैलिडेशन चेक
        if (!accountNo || !custName) {
            window.showSystemAlert("कृपया पहले वैध खाता संख्या दर्ज करके नाम वेरिफाई करें!", "Validation Error", "❌");
            return;
        }

        if (amount <= 0) {
            window.showSystemAlert("कृपया सही जमा राशि दर्ज करें!", "Validation Error", "❌");
            return;
        }

        // 2. ग्लोबल यूज़र सेशन वेरिफिकेशन
        if (!window.currentUser || !window.currentUser.id) {
            window.showSystemAlert("यूज़र सेशन नहीं मिला! कृपया फिर से लॉगिन करें।", "Authentication Error", "❌");
            return;
        }

        // 3. दैनिक सीमा (₹25,000) जांचने का फ़ंक्शन
        const checkDailyDepositLimit = async (accNo, newAmt, currentTxId = null) => {
            const today = new Date().toISOString().split('T')[0];
            try {
                const { data: txList, error: queryErr } = await window.supabaseClient
                    .from('deposit_transactions')
                    .select('amount, transaction_id')
                    .eq('account_number', accNo)
                    .gte('transaction_date', `${today}T00:00:00`);

                if (queryErr) throw queryErr;

                let alreadyDeposited = 0;
                if (txList && txList.length > 0) {
                    txList.forEach(tx => {
                        if (currentTxId && tx.transaction_id === currentTxId) return;
                        alreadyDeposited += parseFloat(tx.amount) || 0;
                    });
                }

                if (alreadyDeposited + newAmt > 25000) {
                    const remainingLimit = 25000 - alreadyDeposited;
                    window.showSystemAlert(
                        `🛑 दैनिक सीमा उल्लंघन!\n\nइस अकाउंट में आज पहले ही ₹${alreadyDeposited.toLocaleString('en-IN')} जमा हो चुके हैं।\nअब आज सिर्फ ₹${remainingLimit > 0 ? remainingLimit.toLocaleString('en-IN') : 0} ही जमा किए जा सकते हैं।\n\nकुल दैनिक सीमा: ₹25,000`,
                        "Daily Limit Exceeded",
                        "❌"
                    );
                    return false;
                }
                return true;
            } catch (err) {
                console.error("Limit Check Error:", err);
                return false;
            }
        };

        // 4. कोर डेटाबेस इंसर्ट फ़ंक्शन
        const saveTransactionData = async () => {
            let calcCommission = Math.min(amount * 0.004, 50);
            try {
                // स्टेप A: ट्रांजैक्शन लॉग रिकॉर्ड करें
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

                // स्टेप B: नया माइनस सेटलमेंट और वॉल्ट कैलकुलेट करें
                const currentSettlementBalance = parseFloat(window.currentUser.settlement_balance) || 0;
                const updatedSettlementBalance = currentSettlementBalance - amount; 
                
                const nextVaultData = {
                    settlement_balance: updatedSettlementBalance,
                    cash_500: (parseInt(window.currentUser.cash_500) || 0) + (denomValues.denom_in_500 || 0) - (denomValues.denom_out_500 || 0),
                    cash_200: (parseInt(window.currentUser.cash_200) || 0) + (denomValues.denom_in_200 || 0) - (denomValues.denom_out_200 || 0),
                    cash_100: (parseInt(window.currentUser.cash_100) || 0) + (denomValues.denom_in_100 || 0) - (denomValues.denom_out_100 || 0),
                    cash_50:  (parseInt(window.currentUser.cash_50)  || 0) + (denomValues.denom_in_50  || 0) - (denomValues.denom_out_50  || 0),
                    cash_20:  (parseInt(window.currentUser.cash_20)  || 0) + (denomValues.denom_in_20  || 0) - (denomValues.denom_out_20  || 0),
                    cash_10:  (parseInt(window.currentUser.cash_10)  || 0) + (denomValues.denom_in_10  || 0) - (denomValues.denom_out_10  || 0),
                    cash_5:   (parseInt(window.currentUser.cash_5)   || 0) + (denomValues.denom_in_5   || 0) - (denomValues.denom_out_5   || 0),
                    cash_coins: (parseInt(window.currentUser.cash_coins) || 0) + (denomValues.denom_in_coins || 0) - (denomValues.denom_out_coins || 0)
                };

                // स्टेप C: डेटाबेस में लाइव अपडेट भेजें
                const { error: userUpdateError } = await window.supabaseClient
                    .from('user_roles')
                    .update(nextVaultData)
                    .eq('id', window.currentUser.id);

                if (userUpdateError) throw userUpdateError;

                // लोकल ऑब्जेक्ट सिंक और स्क्रीन रिफ्रेश
                Object.assign(window.currentUser, nextVaultData);
                window.showSystemAlert("डिपॉजिट सफल और तिजोरी (Vault) अपडेट हो गई!", "Success", "✅");
                
                if (typeof window.loadTodayTransactions === 'function') window.loadTodayTransactions();
                document.getElementById('btn-dep-clear').click();

            } catch (err) { 
                window.showSystemAlert("ट्रांजैक्शन फेल हो गया: " + err.message, "Error", "❌"); 
            }
        };

        // 5. लो सेटलमेंट बैलेंस गार्ड
        const checkBalanceAndProceed = () => {
            const currentSettlementBalance = parseFloat(window.currentUser.settlement_balance) || 0;
            if (currentSettlementBalance < amount) {
                const missingAmount = amount - currentSettlementBalance;
                window.showSystemAlert(`⚠️ सेटलमेंट में बैलेंस लो है! ₹${missingAmount.toLocaleString('en-IN')} ऐड कर लेना। ट्रांजैक्शन आगे बढ़ रही है...`, "Low Balance Notice", "ℹ️");
                setTimeout(() => { saveTransactionData(); }, 2000);
            } else {
                saveTransactionData();
            }
        };

        // 6. सेव मोड या एडिट (Update) मोड चेकर
        const handleSaveOrUpdate = async () => {
            const saveBtnElement = document.getElementById('btn-dep-save');
            const isEditMode = saveBtnElement && saveBtnElement.dataset.mode === "edit";
            const editingTxId = isEditMode ? saveBtnElement.dataset.editingTxId : null;

            const isWithinLimit = await checkDailyDepositLimit(accountNo, amount, editingTxId);
            if (!isWithinLimit) return;

            if (isEditMode) {
                if (typeof window.processTransactionUpdate === 'function') {
                    window.processTransactionUpdate(editingTxId, accountNo, custName, amount, remarks, denomValues);
                } else {
                    window.showSystemAlert("त्रुटि: deposit-update.js फ़ाइल लोड नहीं है!", "Missing File", "❌");
                }
            } else {
                checkBalanceAndProceed();
            }
        };

        // 7. फाइनल अमाउंट और कैश काउंटर टोटल की मैचिंग
        if (netCash === 0) {
            window.showSystemConfirm("बिना कैश आगे बढ़ें?", "Warning", handleSaveOrUpdate);
        } else if (Math.abs(netCash - amount) > 0.01) {
            window.showSystemAlert(`डिनॉमिनेशन टोटल (₹${netCash}) और जमा राशि (₹${amount}) मैच नहीं!`, "Error", "❌");
        } else {
            handleSaveOrUpdate();
        }
    }
});

// ⌨️ कीबोर्ड शॉर्टकट्स (Ctrl+S, Esc)
document.addEventListener('keydown', function(e) {
    if ((e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); 
        document.getElementById('btn-dep-save')?.click();
    }
    if (e.key === 'Escape' || e.key === 'Esc') {
        document.getElementById('btn-dep-clear')?.click();
    }
});
