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

    // ========================================================
    // २. 🛡️ डिनॉमिनेशन सुरक्षा गार्ड (Strict Upgraded Callback Validation)
    // ========================================================
    if (netCash === 0) {
        // 🌟 पासवर्ड इनपुट बॉक्स वाले Prompt को हटाकर सही Yes/No Confirm इंजन प्लग किया
        window.showSystemConfirm(
            "चेतावनी: आपने डिनॉमिनेशन (नोटों का विवरण) नहीं भरा है। क्या आप इस जमा राशि को बिना नोट मिलान के प्रोसेस करना चाहते हैं?", 
            "Vault Security Validation", 
            async function() {
                // 🟢 ऑपरेटर द्वारा 'Yes, Proceed' क्लिक करने पर कोर डिपॉजिट थ्रेड यहाँ से आगे बढ़ेगा
                console.log("⚡ Action Authorized. Initiating core database deposit thread...");
                await proceedWithDepositDatabaseOperation(targetButton, accountNo, customerName, originalAmount, remarks, splitOverrideAmount, netCash, denomValues);
            }
        );
        return; // मुख्य थ्रेड को यहाँ ब्रेक करें, आगे की कमान ऊपर का कॉलबैक संभालेगा
    } 
    else if (Math.abs(netCash - originalAmount) > 0.01) {
        window.showSystemAlert(`डिनॉमिनेशन टोटल (₹${netCash}) और जमा राशि (₹${originalAmount}) मैच नहीं कर रहा है!`, "Cash Mismatch", "❌");
        return;
    }

    // यदि नोट भरे गए हैं और मैचिंग परफेक्ट है, तो सीधे डेटाबेस प्रोसेस रन करें
    await proceedWithDepositDatabaseOperation(targetButton, accountNo, customerName, originalAmount, remarks, splitOverrideAmount, netCash, denomValues);
}

// 💾 कोर डेटाबेस और वॉल्ट सिंकिंग इंजन (Isolated Function for Safety)
async function proceedWithDepositDatabaseOperation(targetButton, accountNo, customerName, originalAmount, remarks, splitOverrideAmount, netCash, denomValues) {
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
            
            const { data: oldTx, error: fetchOldErr } = await window.supabaseClient
                .from('deposit_transactions')
                .select('*')
                .eq('transaction_id', editingTxId)
                .maybeSingle();

            if (fetchOldErr) throw fetchOldErr;

            if (oldTx) {
                currentSettlementBalance += parseFloat(oldTx.amount) || 0;

                const notes = [500, 200, 100, 50, 20, 10, 5];
                notes.forEach(n => {
                    finalVaultData[`cash_${n}`] = (parseInt(finalVaultData[`cash_${n}`]) || 0) - (parseInt(oldTx[`denom_in_${n}`]) || 0) + (parseInt(oldTx[`denom_out_${n}`]) || 0);
                });
                finalVaultData.cash_coins = (parseInt(finalVaultData.cash_coins) || 0) - (parseInt(oldTx.denom_in_coins) || 0) + (parseInt(oldTx.denom_out_coins) || 0);
            }
        }

        let commission = Math.min(finalTxAmount * 0.004, 50);
        const finalRemarks = splitOverrideAmount !== null ? `${remarks} (SPLIT DAY-1 MAIN)`.trim() : remarks;

        const mainTransactionsPayload = {
            account_number: accountNo,
            customer_name: customerName,
            amount: finalTxAmount,
            remarks: finalRemarks,
            ko_code: window.currentUser.ko_code,
            commission: commission,
            ...denomValues
        };

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

        Object.assign(window.currentUser, nextVaultData);

        if (splitOverrideAmount !== null) {
            window.showSystemAlert(`🎉 स्प्लिट ट्रांजैक्शन चरण-1 सफल!\n\nआज का हिस्सा ₹${finalTxAmount.toLocaleString('en-IN')} मुख्य लेज़र में पास कर दिया गया है। शेष लंबित राशि सुरक्षित रूप से आगामी तारीखों के लिए लॉक कर दी गई है।`, "Thread Split Success", "✅");
        } else {
            window.showSystemAlert(isEditMode ? "🔄 सिंगल ट्रांजैक्शन सफलतापूर्वक अपडेट हुआ!" : "💾 सिंगल कैश डिपॉजिट ट्रांजैक्शन सफल!", "Success", "✅");
        }

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
            executeSingleSaveProcess(saveBtn, e.detail.todayAmount);
        }
    }
});
