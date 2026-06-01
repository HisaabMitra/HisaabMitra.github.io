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

        // मुख्य सेविंग फ़ंक्शन
        const saveTransactionData = async () => {
            let calcCommission = Math.min(amount * 0.004, 50);
            
            try {
                // [A] पहले स्टेप: ट्रांजैक्शन लॉग को रिकॉर्ड करें
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

                // [B] दूसरे स्टेप: नए माइनस बैलेंस और डिनॉमिनेशन की गणना करें
                const currentSettlementBalance = parseFloat(window.currentUser.settlement_balance) || 0;
                const updatedSettlementBalance = currentSettlementBalance - amount; // यह अपने आप माइनस (-) में चला जाएगा
                
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

                // [C] तीसरे स्टेप: user_roles टेबल में लाइव अपडेट भेजें (माइनस वैल्यू के साथ)
                const { error: userUpdateError } = await window.supabaseClient
                    .from('user_roles')
                    .update(nextVaultData)
                    .eq('id', window.currentUser.id);

                if (userUpdateError) throw userUpdateError;

                // [D] चौथे स्टेप: लोकल विंडो यूज़र को अपडेट करें
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

        // 🌟 3. लो बैलेंस नोटिफिकेशन और 2 सेकंड का ऑटो-प्रोसीड लॉजिक
        const checkBalanceAndProceed = () => {
            const currentSettlementBalance = parseFloat(window.currentUser.settlement_balance) || 0;
            
            if (currentSettlementBalance < amount) {
                const missingAmount = amount - currentSettlementBalance;
                
                // स्क्रीन पर एक छोटा सा नोटिफिकेशन अलर्ट दिखाएं
                window.showSystemAlert(`⚠️ सेटलमेंट में बैलेंस लो है! ₹${missingAmount.toLocaleString('en-IN')} ऐड कर लेना। ट्रांजैक्शन आगे बढ़ रही है...`, "Low Balance Notice", "ℹ️");
                
                // ठीक 2 सेकंड (2000 मिलीसेकंड) के बाद ट्रांजैक्शन अपने आप सेव हो जाएगी
                setTimeout(() => {
                    saveTransactionData();
                }, 2000);
            } else {
                // अगर बैलेंस पर्याप्त है, तो बिना किसी देरी के तुरंत सेव करें
                saveTransactionData();
            }
        };

        // 4. अमाउंट और नेट कैश की मैचिंग चेक
        if (netCash === 0) {
            window.showSystemConfirm("बिना कैश आगे बढ़ें?", "Warning", checkBalanceAndProceed);
        } else if (Math.abs(netCash - amount) > 0.01) {
            window.showSystemAlert(`डिनॉमिनेशन टोटल (₹${netCash}) और जमा राशि (₹${amount}) मैच नहीं!`, "Error", "❌");
        } else {
            checkBalanceAndProceed();
        }
    }
});
