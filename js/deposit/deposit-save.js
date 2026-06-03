// ========================================================
// 💾 SINGLE CASH DEPOSIT SAVE & ADVANCED SPLIT-SAVE ENGINE
// ========================================================

// मुख्य कोर सिंगल सेव/अपडेट फंक्शन
async function executeSingleSaveProcess(targetButton, splitOverrideAmount = null) {
    const accInput = document.getElementById('dep-account-no');
    const custNameInput = document.getElementById('dep-cust-name');
    const amountInput = document.getElementById('dep-amount');
    const remarksInput = document.getElementById('dep-remarks');

    if (!accInput || !amountInput) return;

    const accountNo = accInput.value.trim();
    const customerName = custNameInput ? custNameInput.value.trim() : "";
    const originalAmount = parseFloat(amountInput.value) || 0;
    const remarks = remarksInput ? remarksInput.value.trim() : "";

    // डिनॉमिनेशन लाइव काउंटर से कैश डेटा उठाएं
    let netCash = 0;
    let denomValues = {};
    if (window.DenominationComponent) {
        netCash = parseFloat(window.DenominationComponent.calculate()) || 0;
        denomValues = window.DenominationComponent.getValues() || {};
    }

    // बुनियादी डेटा वैलिडेशन
    if (!accountNo || !customerName || customerName === "NOT REGISTERED" || customerName.includes("ledger")) {
        window.showSystemAlert("कृपया एक वैध और पंजीकृत खाता संख्या दर्ज करें!", "Validation Error", "⚠️");
        return;
    }
    if (originalAmount <= 0) {
        window.showSystemAlert("कृपया जमा करने के लिए एक वैध राशि दर्ज करें!", "Validation Error", "⚠️");
        return;
    }

    // 🚨 [CRITICAL CHECK]: अगर राशि ₹25,000 से अधिक है और कोई स्प्लिट ओवरराइड अमाउंट पास नहीं हुआ है
    if (originalAmount > 25000 && splitOverrideAmount === null) {
        console.log("Amount > 25,000. Launching Jarvis Smart Split Panel...");
        
        // स्प्लिटिंग पेलोड तैयार करें और deposit.js की जादुई विंडो को सौंप दें
        const splitPayload = {
            account_number: accountNo,
            customer_name: customerName,
            amount: originalAmount,
            remarks: remarks
        };
        if (typeof window.triggerSmartSplitModal === 'function') {
            window.triggerSmartSplitModal(splitPayload);
        } else {
            window.showSystemAlert("स्प्लिटिंग मॉड्यूल लोड नहीं हो सका!", "System Missing", "❌");
        }
        return; 
    }

    // कैश मिलान वैलिडेशन Check (यदि डिनॉमिनेशन भरा गया हो)
    if (netCash > 0 && Math.abs(netCash - originalAmount) > 0.01) {
        window.showSystemAlert(`डिनॉमिनेशन टोटल (₹${netCash}) और जमा राशि (₹${originalAmount}) मैच नहीं कर रहा है!`, "Cash Mismatch", "❌");
        return;
    }

    // 🎯 फाइनल ट्रांजैक्शन अमाउंट तय करें (नॉर्मल मोड में मूल राशि, स्प्लिट मोड में सिर्फ आज का हिस्सा)
    const finalTxAmount = splitOverrideAmount !== null ? parseFloat(splitOverrideAmount) : originalAmount;

    // 🔄 मोड डिटेक्शन (Is Edit Mode Active?)
    const isEditMode = targetButton.dataset.mode === "edit";
    const editingTxId = targetButton.dataset.editingTxId;

    targetButton.textContent = "Processing...";
    targetButton.disabled = true;

    try {
        let currentSettlementBalance = parseFloat(window.currentUser.settlement_balance) || 0;
        let finalVaultData = { ...window.currentUser };

        // 💥 [REVERSE TRANSACTION PHASE - केवल सिंगल एडिट के लिए]
        if (isEditMode && editingTxId) {
            console.log("Reversing old single transaction effect for ID:", editingTxId);
            
            // १. डेटाबेस से पुराने ट्रांजैक्शन का डेटा निकालें ताकि उसका असर उल्टा किया जा सके
            const { data: oldTx, error: fetchOldErr } = await window.supabaseClient
                .from('deposit_transactions')
                .select('*')
                .eq('transaction_id', editingTxId)
                .maybeSingle();

            if (fetchOldErr) throw fetchOldErr;

            if (oldTx) {
                // पुराना पैसा बैलेंस में वापस जोड़ें (Reverse Effect)
                currentSettlementBalance += parseFloat(oldTx.amount) || 0;

                // पुराने नोटों का असर तिजोरी से घटाएं
                const notes = [500, 200, 100, 50, 20, 10, 5];
                notes.forEach(n => {
                    finalVaultData[`cash_${n}`] = (parseInt(finalVaultData[`cash_${n}`]) || 0) - (parseInt(oldTx[`denom_in_${n}`]) || 0) + (parseInt(oldTx[`denom_out_${n}`]) || 0);
                });
                finalVaultData.cash_coins = (parseInt(finalVaultData.cash_coins) || 0) - (parseInt(oldTx.denom_in_coins) || 0) + (parseInt(oldTx.denom_out_coins) || 0);
            }
        }

        // २. मुख्य पेलोड तैयार करें (अगर स्प्लिट मोड है तो रिमार्क्स में थ्रेड ट्रैक इन्फो डाल दें)
        let commission = Math.min(finalTxAmount * 0.004, 50);
        const finalRemarks = splitOverrideAmount !== null ? `${remarks} (SPLIT DAY-1 MAIN)`.trim() : remarks;

        const mainTransactionsPayload = {
            account_number: accountNo,
            customer_name: customerName,
            amount: finalTxAmount,
            remarks: finalRemarks,
            ko_code: window.currentUser.ko_code,
            commission: commission,
            ...denomValues // 💵 पूरे नोटों का डेटा इसमें अटैच रहेगा
        };

        // ३. Supabase ऑपरेशन (एडिट मोड में UPDATE, नॉर्मल में INSERT)
        if (isEditMode && editingTxId) {
            const { error: updateErr } = await window.supabaseClient
                .from('deposit_transactions')
                .update(mainTransactionsPayload)
                .eq('transaction_id', editingTxId);
            if (updateErr) throw updateErr;
        } else {
            const { error: insertErr } = await window.supabaseClient
                .from('deposit_transactions')
                .insert([mainTransactionsPayload]);
            if (insertErr) throw insertErr;
        }

        // ४. सेटलमेंट बैलेंस और तिजोरी (Vault) अपडेट गणना
        // ⚡ ध्यान दें: सेटलमेंट से सिर्फ आज पास होने वाली रकम (finalTxAmount) कटेगी, लेकिन वॉल्ट में पूरे नोट प्लस होंगे!
        const updatedSettlementBalance = currentSettlementBalance - finalTxAmount;

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

        // ग्लोबल यूज़र ऑब्जेक्ट सिंक करें
        Object.assign(window.currentUser, nextVaultData);

        // सफलता की प्रणाली अलर्ट
        if (splitOverrideAmount !== null) {
            window.showSystemAlert(`🎉 स्प्लिट ट्रांजैक्शन चरण-1 सफल!\n\nआज का हिस्सा ₹${finalTxAmount.toLocaleString('en-IN')} मुख्य लेज़र में पास कर दिया गया है। शेष लंबित राशि सुरक्षित रूप से आगामी तारीखों के लिए लॉक कर दी गई है।`, "Thread Split Success", "✅");
        } else {
            window.showSystemAlert(isEditMode ? "🔄 सिंगल ट्रांजैक्शन सफलतापूर्वक अपडेट हुआ!" : "💾 सिंगल कैश डिपॉजिट ट्रांजैक्शन सफल!", "Success", "✅");
        }

        // फॉर्म री-सिंक करें और डेटा साफ़ करें
        if (typeof window.loadTodayTransactions === 'function') window.loadTodayTransactions();
        document.getElementById('btn-dep-clear')?.click();

    } catch (err) {
        console.error("Single Core Save Fail:", err);
        window.showSystemAlert("लेनदेन सुरक्षित करने में विफलता: " + err.message, "System Error", "❌");
    } finally {
        targetButton.textContent = isEditMode ? "🔄 Update Transaction" : "💾 Save";
        targetButton.disabled = false;
    }
}

// ========================================================
// 🌐 GLOBAL LISTENERS & EVENT DELEGATION
// ========================================================

// १. सामान्य 'Save' बटन माउस क्लिक लिसनर
document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'btn-dep-save') {
        executeSingleSaveProcess(e.target);
    }
});

// २. 💥 [SPECIAL CUSTOM HOOK]: deposit.js के स्प्लिट कन्फर्मेशन से आने वाला जादुई ट्रिगर
window.addEventListener('execute-split-today-save', function(e) {
    if (e.detail && e.detail.basePayload) {
        console.log("Jarvis Event Caught: Executing Split Day-1 Save Thread...");
        const saveBtn = document.getElementById('btn-dep-save');
        if (saveBtn) {
            // पूरे कैश नोट के साथ सिर्फ आज का हिस्सा (todayAmount) पास करें
            executeSingleSaveProcess(saveBtn, e.detail.todayAmount);
        }
    }
});
