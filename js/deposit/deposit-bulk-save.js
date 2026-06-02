// ========================================================
// 📦 BULK DEPOSIT SAVE ENGINE (BATCH PROCESSING ENGINE)
// ========================================================

// मुख्य कोर सेव फंक्शन जिसे हम दोनों इवेंट्स से चलाएंगे
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

    // 🛑 [BULK BATCH LIMIT CHECK] सभी खातों की लिमिट चेक करें
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

    // 🚀 गो-अहेड हरी झंडी! बैच प्रोसेसिंग शुरू करें
    try {
        const bulkId = `BLK-${Date.now()}`;
        
        const finalTransactionsPayload = bulkTransactions.map((tx, idx) => {
            let comm = Math.min(tx.amount * 0.004, 50);
            const denomPayload = (idx === 0) ? { ...denomValues } : {};

            return {
                ...tx,
                bulk_id: bulkId,
                ko_code: window.currentUser.ko_code,
                commission: comm,
                ...denomPayload
            };
        });

        // १. Supabase में कंबाइन इंसर्ट भेजें
        const { error: insertErr } = await window.supabaseClient
            .from('deposit_transactions')
            .insert(finalTransactionsPayload);

        if (insertErr) throw insertErr;

        // २. सेटलमेंट बैलेंस और वॉल्ट अपडेट
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
        
        document.getElementById('btn-bulk-dep-clear')?.click();

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
