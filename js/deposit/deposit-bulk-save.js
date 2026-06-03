// ========================================================
// 📦 BULK DEPOSIT SAVE & UPDATE ENGINE (BATCH REVERSE LOGIC)
// ========================================================

// मुख्य कोर सेव/अपडेट फंक्शन जिसे हम दोनों इवेंट्स से चलाएंगे
async function executeBulkSaveProcess(targetButton) {
    const depositorNameInput = document.getElementById('bulk-depositor-name');
    if (!depositorNameInput) return; 

    const depositorName = depositorNameInput.value.trim().toUpperCase();
    const depositorMobile = document.getElementById('bulk-depositor-mobile').value.trim();
    const rows = document.querySelectorAll('#bulk-accounts-tbody tr');

    // डिनॉमिनेशन काउंटर से लाइव कैश उठाएं
    let netCash = 0;
    let denomValues = {};
    if (window.DenominationComponent) {
        netCash = parseFloat(window.DenominationComponent.calculate()) || 0;
        denomValues = window.DenominationComponent.getValues() || {};
    }

    // जमाकर्ता डेटा वैलिडेशन
    if (!depositorName || !depositorMobile) {
        window.showSystemAlert("जमाकर्ता (Depositor) का नाम और मोबाइल नंबर भरना अनिवार्य है!", "Validation Error", "⚠️");
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

    // ग्रिड की सभी रोज़ से लाइव डेटा कलेक्ट करें
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

    // कैश मिलान वैलिडेशन Check
    if (netCash === 0) {
        const proceedWithoutCash = await new Promise((resolve) => {
            window.showSystemConfirm("बल्क ग्रिड में कोई कैश डिनॉमिनेशन नहीं भरा गया है। क्या आप बिना कैश के आगे बढ़ना चाहते हैं?", "Warning", () => resolve(true));
        });
        if (!proceedWithoutCash) return;
    } else if (Math.abs(netCash - bulkGrandTotal) > 0.01) {
        window.showSystemAlert(`डिनॉमिनेशन टोटल (₹${netCash}) और बल्क जमा का कुल योग (₹${bulkGrandTotal}) मैच नहीं कर रहा है!`, "Mismatch Error", "❌");
        return;
    }

    // 🔄 मोड डिटेक्शन (Is Edit Mode Active?)
    const isEditMode = targetButton.dataset.mode === "edit";
    const targetBulkId = targetButton.dataset.editingBulkId;

    // 🛑 [BULK BATCH LIMIT CHECK - केवल न्यू एंट्रीज के लिए]
    if (!isEditMode) {
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
    }

    // 🚀 गो-अहेड! बैच प्रोसेसिंग इंजन शुरू करें
    try {
        let currentSettlementBalance = parseFloat(window.currentUser.settlement_balance) || 0;
        let finalVaultData = { ...window.currentUser };

        // 💥 [REVERSE TRANSACTION PHASE]
        if (isEditMode && targetBulkId) {
            console.log("Reversing old bulk batch effect for ID:", targetBulkId);
            
            // १. पुराने बैच का डेटा निकालकर असर उल्टा (Reverse) करें
            const { data: oldBatch, error: fetchOldErr } = await window.supabaseClient
                .from('deposit_transactions')
                .select('*')
                .eq('bulk_id', targetBulkId);

            if (fetchOldErr) throw fetchOldErr;

            if (oldBatch && oldBatch.length > 0) {
                let oldGrandTotal = 0;
                oldBatch.forEach(tx => { oldGrandTotal += parseFloat(tx.amount) || 0; });

                // पुराना पैसा बैलेंस में वापस जोड़ें (Reverse Effect)
                currentSettlementBalance += oldGrandTotal;

                // पहली रो से पुराने नोटों का असर तिजोरी से घटाएं
                const firstTx = oldBatch[0];
                const notes = [500, 200, 100, 50, 20, 10, 5];
                notes.forEach(n => {
                    finalVaultData[`cash_${n}`] = (parseInt(finalVaultData[`cash_${n}`]) || 0) - (parseInt(firstTx[`denom_in_${n}`]) || 0) + (parseInt(firstTx[`denom_out_${n}`]) || 0);
                });
                finalVaultData.cash_coins = (parseInt(finalVaultData.cash_coins) || 0) - (parseInt(firstTx.denom_in_coins) || 0) + (parseInt(firstTx.denom_out_coins) || 0);
            }

            // २. पुराने बैच के सभी रिकॉर्ड्स को डेटाबेस से साफ़ (DELETE) मारें
            const { error: deleteErr } = await window.supabaseClient
                .from('deposit_transactions')
                .delete()
                .eq('bulk_id', targetBulkId);

            if (deleteErr) throw deleteErr;
        }

        // ३. नया पेलोड तैयार करें (नया ID या संपादित पुराना ID)
        const activeBulkId = isEditMode ? targetBulkId : `BLK-${Date.now()}`;
        
        const finalTransactionsPayload = bulkTransactions.map((tx, idx) => {
            let comm = Math.min(tx.amount * 0.004, 50);
            const denomPayload = (idx === 0) ? { ...denomValues } : {};

            return {
                ...tx,
                bulk_id: activeBulkId,
                ko_code: window.currentUser.ko_code,
                commission: comm,
                ...denomPayload
            };
        });

        // ४. डेटाबेस में कंबाइन फ्रेश इंसर्ट भेजें
        const { error: insertErr } = await window.supabaseClient
            .from('deposit_transactions')
            .insert(finalTransactionsPayload);

        if (insertErr) throw insertErr;

        // ५. नए डेटा के हिसाब से सेटलमेंट बैलेंस और वॉल्ट अपडेट
        const updatedSettlementBalance = currentSettlementBalance - bulkGrandTotal;

        const nextVaultData = {
            settlement_balance: updatedSettlementBalance,
            cash_500: (parseInt(finalVaultData.cash_500) || 0) + (denomValues.denom_in_500 || 0) - (denomValues.denom_out_500 || 0),
            cash_200: (parseInt(finalVaultData.cash_200) || 0) + (denomValues.denom_in_200 || 0) - (denomValues.denom_out_200 || 0),
            cash_100: (parseInt(finalVaultData.cash_100) || 0) + (denomValues.denom_in_100 || 0) - (denomValues.denom_out_100 || 0),
            cash_50:  (parseInt(finalVaultData.cash_50)  || 0) + (denomValues.denom_in_50  || 0) - (denomValues.denom_out_50  || 0),
            cash_20:  (parseInt(finalVaultData.cash_20)  || 0) + (denomValues.denom_in_20  || 0) - (denomValues.denom_out_20  || 0),
            cash_10:  (parseInt(finalVaultData.cash_10)  || 0) + (denomValues.denom_in_10  || 0) - (denomValues.denom_out_10  || 0),
            cash_5:   (parseInt(finalVaultData.cash_5)   || 0) + (denomValues.denom_in_5   || 0) - (denomValues.denom_out_5   || 0),
            cash_coins: (parseInt(finalVaultData.cash_coins) || 0) + (denomValues.denom_in_coins || 0) - (denomValues.denom_out_coins || 0)
        };

        const { error: userUpdateError } = await window.supabaseClient
            .from('user_roles')
            .update(nextVaultData)
            .eq('id', window.currentUser.id);

        if (userUpdateError) throw userUpdateError;

        Object.assign(window.currentUser, nextVaultData);
        
        window.showSystemAlert(
            isEditMode ? `📦 बल्क बैच ${activeBulkId} सफलतापूर्वक संशोधित (Updated) हुआ!` : `📦 नया बल्क डिपॉजिट सफल!`, 
            "Success", "✅"
        );

        if (typeof window.loadTodayTransactions === 'function') window.loadTodayTransactions();
        
        // फॉर्म को वापस नॉर्मल क्लियर मोड पर लाएं
        document.getElementById('btn-bulk-dep-clear')?.click();

        // यदि एडिट मोड था, तो बटन का रूप वापस डिफ़ॉल्ट करें
        if (isEditMode) {
            targetButton.innerText = "💾 Save Bulk Transactions";
            targetButton.style.background = "#7d0022";
            delete targetButton.dataset.mode;
            delete targetButton.dataset.editingBulkId;
        }

    } catch (err) {
        console.error("Bulk Core Insertion Error:", err);
        window.showSystemAlert("बल्क ट्रांजैक्शन फेल हो गया: " + err.message, "Error", "❌");
    }
}

// 🌐 सामान्य माउस क्लिक लिसनर (क्लिक ट्रेपिंग)
document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'btn-bulk-dep-save') {
        executeBulkSaveProcess(e.target);
    }
});

// 🔄 डायनेमिक लाइव स्विचर से आने वाला स्पेशल ट्रिगर
window.addEventListener('bulk-save-trigger', function(e) {
    if(e.detail && e.detail.target) {
        executeBulkSaveProcess(e.detail.target);
    }
});

// कीबोर्ड लिसनर्स
document.addEventListener('keydown', function(e) {
    if ((e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey)) {
        const btn = document.getElementById('btn-bulk-dep-save');
        if (btn && !document.getElementById('bulk-deposit-view-wrapper').classList.contains('hidden-block')) {
            e.preventDefault(); 
            executeBulkSaveProcess(btn);
        }
    }
});
