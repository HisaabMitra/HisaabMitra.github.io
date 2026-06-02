// ========================================================
// 📦 BULK DEPOSIT SAVE ENGINE (BATCH PROCESSING ENGINE)
// ========================================================

document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'btn-dep-save') {
        
        const depositorNameInput = document.getElementById('bulk-depositor-name');
        if (!depositorNameInput) return; // अगर स्क्रीन पर बल्क पेज एक्टिव नहीं है तो बाहर निकलें

        const depositorName = depositorNameInput.value.trim().toUpperCase();
        const depositorMobile = document.getElementById('bulk-depositor-mobile').value.trim();
        const rows = document.querySelectorAll('#bulk-accounts-tbody tr');

        // डिनॉमिनेशन वैल्यूज निकालें
        let netCash = 0;
        let denomValues = {};
        if (window.DenominationComponent) {
            netCash = parseFloat(window.DenominationComponent.calculate()) || 0;
            denomValues = window.DenominationComponent.getValues() || {};
        }

        // बुनियादी जमाकर्ता वैलिडेशन
        if (!depositorName || !depositorMobile) {
            window.showSystemAlert("जмаकर्ता (Depositor) का नाम और मोबाइल नंबर भरना अनिवार्य है!", "Validation Error", "⚠️");
            return;
        }

        if (depositorMobile.length !== 10 || isNaN(depositorMobile)) {
            window.showSystemAlert("कृपया एक वैध 10-अंकों का मोबाइल नंबर डालें!", "Validation Error", "⚠️");
            return;
        }

        if (rows.length === 0) {
            window.showSystemAlert("बल्क ग्रिड में कम से कम एक खाता होना चाहिए!", "Validation Error", "⚠️");
            return;
        }

        let bulkTransactions = [];
        let bulkGrandTotal = 0;
        let accountNumbersInBatch = [];

        // ग्रिड से सारा डेटा कलेक्ट और वेरिफाई करें
        for (let row of rows) {
            const accInput = row.querySelector('.bulk-acc-input');
            const nameInput = row.querySelector('.bulk-name-input');
            const amtInput = row.querySelector('.bulk-amount-input');

            const accNo = accInput ? accInput.value.trim() : "";
            const custName = nameInput ? nameInput.value.trim() : "";
            const amt = amtInput ? parseFloat(amtInput.value) || 0 : 0;

            if (!accNo || !custName || custName === "NOT REGISTERED" || custName.includes("इंतज़ार")) {
                window.showSystemAlert(`खाता संख्या ${accNo || 'Unknown'} का विवरण अधूरा या अपंजीकृत है!`, "Validation Error", "❌");
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

            bulkTransactions.push({
                account_number: accNo,
                customer_name: custName,
                amount: amt,
                depositor_name: depositorName,
                depositor_mobile: depositorMobile
            });
        }

        // कैश और ग्रैंड टोटल मैचिंग
        if (netCash === 0) {
            const proceedWithoutCash = await new Promise((resolve) => {
                window.showSystemConfirm("बल्क डिपॉजिट में कोई कैश डिनॉमिनेशन नहीं भरा गया है। क्या आप बिना कैश के आगे बढ़ना चाहते हैं?", "Warning", () => resolve(true));
            });
            if (!proceedWithoutCash) return;
        } else if (Math.abs(netCash - bulkGrandTotal) > 0.01) {
            window.showSystemAlert(`डिनॉमिनेशन टोटल (₹${netCash}) और बल्क जमा का कुल योग (₹${bulkGrandTotal}) मैच नहीं कर रहा है!`, "Mismatch Error", "❌");
            return;
        }

        // 🛑 प्रत्येक अकाउंट की आज की लिमिट डेटाबेस से बैच-वेरिफाई करें
        const today = new Date().toISOString().split('T')[0];
        try {
            const { data: existingTxList, error: limitErr } = await window.supabaseClient
                .from('deposit_transactions')
                .select('account_number, amount')
                .in('account_number', accountNumbersInBatch)
                .gte('transaction_date', `${today}T00:00:00`);

            if (limitErr) throw limitErr;

            let accountTotalsMap = {};
            if (existingTxList) {
                existingTxList.forEach(tx => {
                    accountTotalsMap[tx.account_number] = (accountTotalsMap[tx.account_number] || 0) + (parseFloat(tx.amount) || 0);
                });
            }

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
            return;
        }

        // 🚀 सब सुरक्षित! अब बैच इंसर्ट प्रोसेस शुरू करें
        try {
            const bulkId = `BLK-${Date.now()}`;
            
            const finalTransactionsPayload = bulkTransactions.map((tx, idx) => {
                let comm = Math.min(tx.amount * 0.004, 50);
                // डिनॉमिनेशन सिर्फ पहली रो के साथ अटैच करें ताकि वॉल्ट बैलेंस डुप्लिकेट न हो
                const denomPayload = (idx === 0) ? { ...denomValues } : {};

                return {
                    ...tx,
                    bulk_id: bulkId,
                    ko_code: window.currentUser.ko_code,
                    commission: comm,
                    ...denomPayload
                };
            });

            // १. डेटाबेस में एक साथ बैच इंसर्ट भेजें
            const { error: insertErr } = await window.supabaseClient
                .from('deposit_transactions')
                .insert(finalTransactionsPayload);

            if (insertErr) throw insertErr;

            // २. सेटलमेंट और वॉल्ट डेटा सिंक करें
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

            Object.assign(window.currentUser, nextVaultData);
            window.showSystemAlert(`📦 बल्क डिपॉजिट सफल!\nकुल खाते: ${bulkTransactions.length}\nकुल जमा राशि: ₹${bulkGrandTotal.toLocaleString('en-IN')}`, "Success", "✅");

            if (typeof window.loadTodayTransactions === 'function') window.loadTodayTransactions();
            document.getElementById('btn-dep-clear')?.click();

        } catch (err) {
            console.error("Bulk Core Insertion Error:", err);
            window.showSystemAlert("बल्क ट्रांजैक्शन फेल हो गया: " + err.message, "Error", "❌");
        }
    }
});
