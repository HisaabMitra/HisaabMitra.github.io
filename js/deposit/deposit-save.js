document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'btn-dep-save') {
        
        // चेक करें कि ऑपरेटर वर्तमान में बल्क मोड में है या सिंगल मोड में
        const isBulkMode = document.getElementById('single-deposit-form-block')?.classList.contains('hidden') || 
                           !document.getElementById('bulk-deposit-panel')?.classList.contains('hidden');

        // डिनॉमिनेशन की वैल्यूज निकालें
        let netCash = 0;
        let denomValues = {};
        if (window.DenominationComponent) {
            netCash = parseFloat(window.DenominationComponent.calculate()) || 0;
            denomValues = window.DenominationComponent.getValues() || {};
        }

        // Global User Session Check
        if (!window.currentUser || !window.currentUser.id) {
            window.showSystemAlert("यूज़र सेशन नहीं मिला! कृपया फिर से लॉगिन करें।", "Authentication Error", "❌");
            return;
        }

        // ========================================================
        // 📦 CASE 1: BULK DEPOSIT SAVE ENGINE
        // ========================================================
        if (isBulkMode) {
            const depositorName = document.getElementById('bulk-depositor-name').value.trim().toUpperCase();
            const depositorMobile = document.getElementById('bulk-depositor-mobile').value.trim();
            const rows = document.querySelectorAll('#bulk-accounts-tbody tr');

            if (!depositorName || !depositorMobile) {
                window.showSystemAlert("जमाकर्ता (Depositor) का नाम और मोबाइल नंबर भरना अनिवार्य है!", "Validation Error", "⚠️");
                return;
            }

            if (depositorMobile.length !== 10 || isNaN(depositorMobile)) {
                window.showSystemAlert("कृपया एक वैध 10-अंकों का मोबाइल नंबर डालें!", "Validation Error", "⚠️");
                return;
            }

            if (rows.length === 0) {
                window.showSystemAlert("बल्क लिस्ट में कम से कम एक खाता होना चाहिए!", "Validation Error", "⚠️");
                return;
            }

            let bulkTransactions = [];
            let bulkGrandTotal = 0;
            let accountNumbersInBatch = [];

            // सभी रोज़ का डेटा निकालें और बुनियादी वैलिडेशन चेक करें
            for (let row of rows) {
                const accInput = row.querySelector('.bulk-acc-input');
                const nameInput = row.querySelector('.bulk-name-input');
                const amtInput = row.querySelector('.bulk-amount-input');

                const accNo = accInput ? accInput.value.trim() : "";
                const custName = nameInput ? nameInput.value.trim() : "";
                const amt = amtInput ? parseFloat(amtInput.value) || 0 : 0;

                if (!accNo || !custName || custName === "NOT REGISTERED" || custName === "डेटाबेस में खोज जारी है...") {
                    window.showSystemAlert(`खाता संख्या ${accNo || 'Unknown'} का नाम पंजीकृत नहीं है या अधूरा है!`, "Validation Error", "❌");
                    return;
                }

                if (amt <= 0) {
                    window.showSystemAlert(`खाता संख्या ${accNo} में जमा राशि शून्य या अमान्य है!`, "Validation Error", "❌");
                    return;
                }

                if (amt > 25000) {
                    window.showSystemAlert(`खाता संख्या ${accNo} में राशि ₹25,000 की दैनिक सीमा से अधिक है!`, "Limit Error", "❌");
                    return;
                }

                bulkGrandTotal += amt;
                accountNumbersInBatch.push(accNo);

                // डेटाबेस के स्ट्रक्चर के अनुसार ऑब्जेक्ट तैयार करें
                bulkTransactions.push({
                    account_number: accNo,
                    customer_name: custName,
                    amount: amt,
                    depositor_name: depositorName,
                    depositor_mobile: depositorMobile
                });
            }

            // कैश और ग्रैंड टोटल मैचिंग चेक
            if (netCash === 0) {
                // बिना कैश कन्फर्मेशन का लॉजिक
                const proceedWithoutCash = await new Promise((resolve) => {
                    window.showSystemConfirm("बल्क डिपॉजिट में कोई कैश डिनॉमिनेशन नहीं भरा गया है। क्या आप बिना कैश के आगे बढ़ना चाहते हैं?", "Warning", () => resolve(true));
                });
                if (!proceedWithoutCash) return;
            } else if (Math.abs(netCash - bulkGrandTotal) > 0.01) {
                window.showSystemAlert(`डिनॉमिनेशन टोटल (₹${netCash}) और बल्क जमा का कुल योग (₹${bulkGrandTotal}) मैच नहीं कर रहा है!`, "Mismatch Error", "❌");
                return;
            }

            // 🛑 [BULK INDIVIDUAL LIMIT CHECK] प्रत्येक अकाउंट की आज की लिमिट डेटाबेस से वेरिफाई करें
            const today = new Date().toISOString().split('T')[0];
            try {
                // इस बैच के सभी अकाउंट्स की आज की पुरानी ट्रांजैक्शन्स एक बार में निकालें
                const { data: existingTxList, error: limitErr } = await window.supabaseClient
                    .from('deposit_transactions')
                    .select('account_number, amount')
                    .in('account_number', accountNumbersInBatch)
                    .gte('transaction_date', `${today}T00:00:00`);

                if (limitErr) throw limitErr;

                // अकाउंट वाइज पुराना टोटल मैप तैयार करें
                let accountTotalsMap = {};
                if (existingTxList) {
                    existingTxList.forEach(tx => {
                        accountTotalsMap[tx.account_number] = (accountTotalsMap[tx.account_number] || 0) + (parseFloat(tx.amount) || 0);
                    });
                }

                // चेक करें कि पुराना + नया मिलाकर 25k पार तो नहीं हो रहा
                for (let tx of bulkTransactions) {
                    const pastDeposit = accountTotalsMap[tx.account_number] || 0;
                    if (pastDeposit + tx.amount > 25000) {
                        const remaining = 25000 - pastDeposit;
                        window.showSystemAlert(`🛑 दैनिक सीमा उल्लंघन!\n\nखाता संख्या ${tx.account_number} में आज पहले ही ₹${pastDeposit.toLocaleString('en-IN')} जमा हो चुके हैं।\nअब इस खाते में अधिकतम ₹${remaining > 0 ? remaining : 0} ही जमा किए जा सकते हैं।`, "Limit Exceeded", "❌");
                        return;
                    }
                }
            } catch (err) {
                console.error("Bulk Limit Query Error:", err);
                window.showSystemAlert("दैनिक सीमा जांचने में विफलता: " + err.message, "System Error", "❌");
                return;
            }

            // 🚀 सभी चेक पास! अब ट्रांजैक्शन सेव करने का प्रोसेस शुरू करें
            try {
                const bulkId = `BLK-${Date.now()}`; // यूनिक पैरेंट बल्क आईडी
                let calcCommissionTotal = 0;

                // हर एंट्री में कॉमन डिटेल्स और कमीशन जोड़ें
                const finalTransactionsPayload = bulkTransactions.map((tx, idx) => {
                    let comm = Math.min(tx.amount * 0.004, 50);
                    calcCommissionTotal += comm;

                    // डिनॉमिनेशन को केवल पहली रो के साथ अटैच करें ताकि तिजोरी का बैलेंस डुप्लिकेट न हो
                    const denomPayload = (idx === 0) ? { ...denomValues } : {};

                    return {
                        ...tx,
                        bulk_id: bulkId,
                        ko_code: window.currentUser.ko_code,
                        commission: comm,
                        ...denomPayload
                    };
                });

                // स्टेप 1: डेटाबेस में बैच इंसर्ट करें
                const { error: insertErr } = await window.supabaseClient
                    .from('deposit_transactions')
                    .insert(finalTransactionsPayload);

                if (insertErr) throw insertErr;

                // स्टेप 2: सेटलमेंट बैलेंस और वॉल्ट अपडेट करें
                const currentSettlementBalance = parseFloat(window.currentUser.settlement_balance) || 0;
                const updatedSettlementBalance = currentSettlementBalance - bulkGrandTotal;

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

                const { error: userUpdateError } = await window.supabaseClient
                    .from('user_roles')
                    .update(nextVaultData)
                    .eq('id', window.currentUser.id);

                if (userUpdateError) throw userUpdateError;

                // लोकल सिंक
                Object.assign(window.currentUser, nextVaultData);

                window.showSystemAlert(`📦 बल्क डिपॉजिट सफल!\nकुल खाते: ${bulkTransactions.length}\nकुल जमा राशि: ₹${bulkGrandTotal.toLocaleString('en-IN')}`, "Success", "✅");

                // रीलोड और फॉर्म साफ़ करें
                if (typeof window.loadTodayTransactions === 'function') window.loadTodayTransactions();
                
                // बल्क इनपुट्स को साफ़ करें और डिफ़ॉल्ट 1 रो पर लाएं
                document.getElementById('bulk-depositor-name').value = "";
                document.getElementById('bulk-depositor-mobile').value = "";
                document.getElementById('bulk-accounts-tbody').innerHTML = "";
                if (typeof window.addNewBulkRow === 'function') window.addNewBulkRow();
                
                // सिंगल फॉर्म साफ़ करने वाला बटन ट्रिगर (डिनॉमिनेशन रीसेट के लिए)
                document.getElementById('btn-dep-clear')?.click();

            } catch (err) {
                console.error("Bulk Processing Core Error:", err);
                window.showSystemAlert("बल्क ट्रांजैक्शन फेल हो गया: " + err.message, "Error", "❌");
            }

            return; // बल्क फ्लो यहाँ समाप्त होता है
        }

        // ========================================================
        // 👤 CASE 2: SINGLE DEPOSIT SAVE ENGINE (पुराना फिक्स्ड लॉजिक)
        // ========================================================
        const accInput = document.getElementById('dep-account-no');
        const custNameInput = document.getElementById('dep-cust-name');
        const amountInput = document.getElementById('dep-amount');
        const remarksInput = document.getElementById('dep-remarks');
        
        const accountNo = accInput.value.trim();
        const custName = custNameInput.value.trim();
        const amount = parseFloat(amountInput.value) || 0;
        const remarks = remarksInput.value.trim();

        // 1. बुनियादी वैलिडेशन चेक
        if (!accountNo || !custName || amount <= 0) {
            window.showSystemAlert("सभी ज़रूरी फ़ील्ड भरें!", "Validation Error", "❌");
            return;
        }

        // 2. दैनिक सीमा चेक करने का फ़ंक्शन
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

        const saveTransactionData = async () => {
            let calcCommission = Math.min(amount * 0.004, 50);
            try {
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

                const { error: userUpdateError } = await window.supabaseClient
                    .from('user_roles')
                    .update(nextVaultData)
                    .eq('id', window.currentUser.id);

                if (userUpdateError) throw userUpdateError;

                Object.assign(window.currentUser, nextVaultData);
                window.showSystemAlert("डिपॉजिट सफल और तिजोरी (Vault) अपडेट हो गई!", "Success", "✅");
                
                if (typeof window.loadTodayTransactions === 'function') window.loadTodayTransactions();
                document.getElementById('btn-dep-clear').click();

            } catch (err) { 
                window.showSystemAlert("ट्रांजैक्शन फेल हो गया: " + err.message, "Error", "❌"); 
            }
        };

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
