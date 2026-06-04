// ========================================================
// 💾 AEPS CASH WITHDRAWAL CORE SAVE & SECURITY ENGINE
// ========================================================

async function executeWithdrawalSaveProcess(targetButton) {
    const aadhaarInput = document.getElementById('wit-aadhaar-no');
    const nameInput = document.getElementById('wit-cust-name');
    const amountInput = document.getElementById('wit-amount');
    const remarksInput = document.getElementById('wit-remarks');

    if (!aadhaarInput || !amountInput) return;

    const aadhaarNo = aadhaarInput.value.trim();
    const customerName = nameInput ? nameInput.value.trim() : "";
    const withdrawalAmount = parseFloat(amountInput.value) || 0;
    const remarks = remarksInput ? remarksInput.value.trim() : "";

    const isEditMode = targetButton.dataset.mode === "edit";
    const editingWitId = targetButton.dataset.editingWitId;

    let netCash = 0;
    let denomValues = {};
    if (window.WitDenominationComponent) {
        netCash = parseFloat(window.WitDenominationComponent.calculate()) || 0;
        denomValues = window.WitDenominationComponent.getValues() || {};
    } else {
        console.error("WitDenominationComponent is missing in current session flow!");
    }

    // १. बुनियादी डेटा वैधीकरण
    if (!aadhaarNo || aadhaarNo.length !== 12 || isNaN(aadhaarNo)) {
        window.showSystemAlert("कृपया एक वैध 12-अंकीय आधार संख्या दर्ज करें!", "Validation Error", "⚠️");
        return;
    }
    if (!customerName || customerName === "NOT REGISTERED" || customerName.includes("ledger")) {
        window.showSystemAlert("बिना पंजीकृत ग्राहक के निकासी प्रोसेस नहीं की जा सकती!", "Validation Error", "⚠️");
        return;
    }
    if (withdrawalAmount < 100 || withdrawalAmount > 10000) {
        window.showSystemAlert("निकासी राशि न्यूनतम ₹100 और अधिकतम ₹10,000 होनी चाहिए!", "Validation Error", "⚠️");
        return;
    }

    // ========================================================
    // २. 🛡️ डिनॉमिनेशन सुरक्षा गार्ड (Strict Upgraded Callback Validation)
    // ========================================================
    if (netCash === 0) {
        // 🌟 पासवर्ड बॉक्स वाले Prompt को हटाकर सही Yes/No Confirm इंजन को वायर किया
        window.showSystemConfirm(
            "चेतावनी: आपने डिनॉमिनेशन (नोटों का विवरण) नहीं भरा है। क्या आप इस निकासी को बिना नोट मिलान के प्रोसेस करना चाहते हैं?", 
            "Vault Security Validation", 
            async function() {
                // 🟢 ऑपरेटर द्वारा 'Yes, Proceed' क्लिक करने पर कोर ट्रांजैक्शन इंजन यहाँ से आगे बढ़ेगा
                console.log("⚡ Action Authorized. Initiating database insertion thread...");
                await proceedWithWithdrawalDatabaseOperation(targetButton, aadhaarNo, customerName, withdrawalAmount, remarks, isEditMode, editingWitId, denomValues);
            }
        );
        return; // मुख्य थ्रेड को यहाँ ब्रेक करें, आगे की कमान ऊपर का कॉलबैक संभालेगा
    } 
    else if (Math.abs(netCash - withdrawalAmount) > 0.01) {
        window.showSystemAlert(`Txn Fail: डिनॉमिनेशन टोटल (₹${netCash}) और निकासी राशि (₹${withdrawalAmount}) मैच नहीं कर रहे हैं!`, "Cash Mismatch", "❌");
        return;
    }

    // यदि नोट भरे गए हैं और मैचिंग परफेक्ट है, तो सीधे डेटाबेस प्रोसेस रन करें
    await proceedWithWithdrawalDatabaseOperation(targetButton, aadhaarNo, customerName, withdrawalAmount, remarks, isEditMode, editingWitId, denomValues);
}

// 💾 कोर डेटाबेस और वॉल्ट सिंकिंग इंजन (Isolated Function for Safety)
async function proceedWithWithdrawalDatabaseOperation(targetButton, aadhaarNo, customerName, withdrawalAmount, remarks, isEditMode, editingWitId, denomValues) {
    targetButton.textContent = "Verifying Transaction...";
    targetButton.disabled = true;

    try {
        const todayStr = new Date().toISOString().split('T')[0];

        if (!isEditMode) {
            const { data: todayTxs, error: limitErr } = await window.supabaseClient
                .from('withdrawal_transactions')
                .select('amount')
                .eq('aadhaar_number', aadhaarNo)
                .gte('transaction_date', `${todayStr}T00:00:00`);

            if (limitErr) throw limitErr;

            let totalWithdrawnToday = 0;
            if (todayTxs) {
                todayTxs.forEach(tx => { totalWithdrawnToday += parseFloat(tx.amount) || 0; });
            }

            if (totalWithdrawnToday + withdrawalAmount > 10000) {
                window.showSystemAlert(`Txn Blocked: इस आधार कार्ड की दैनिक विथड्रॉल सीमा समाप्त हो चुकी है!\n\nआज पहले निकाला गया: ₹${totalWithdrawnToday}\nअधिकतम शेष अनुमति: ₹${10000 - totalWithdrawnToday}`, "Daily Limit Exceeded", "❌");
                targetButton.textContent = "Dispense Cash";
                targetButton.disabled = false;
                return;
            }
        }

        let currentSettlementBalance = parseFloat(window.currentUser.settlement_balance) || 0;
        let finalVaultData = { ...window.currentUser };

        if (isEditMode && editingWitId) {
            console.log("Reversing old withdrawal effect for ID:", editingWitId);
            
            const { data: oldTx, error: fetchOldErr } = await window.supabaseClient
                .from('withdrawal_transactions')
                .select('*')
                .eq('id', editingWitId)
                .maybeSingle();

            if (fetchOldErr) throw fetchOldErr;

            if (oldTx) {
                currentSettlementBalance -= parseFloat(oldTx.amount) || 0;

                const notes = [500, 200, 100, 50, 20, 10, 5];
                notes.forEach(n => {
                    finalVaultData[`cash_${n}`] = (parseInt(finalVaultData[`cash_${n}`]) || 0) + (parseInt(oldTx[`denom_out_${n}`]) || 0) - (parseInt(oldTx[`denom_in_${n}`]) || 0);
                });
                finalVaultData.cash_coins = (parseInt(finalVaultData.cash_coins) || 0) + (parseInt(oldTx.denom_out_coins) || 0) - (parseInt(oldTx.denom_in_coins) || 0);
            }
        }

        let commission = Math.min(withdrawalAmount * 0.004, 50);

        const mainWithdrawalPayload = {
            aadhaar_number: aadhaarNo,
            customer_name: customerName,
            amount: withdrawalAmount,
            remarks: remarks,
            ko_code: window.currentUser.ko_code,
            commission: commission,
            ...denomValues
        };

        if (isEditMode && editingWitId) {
            const { error: updateErr } = await window.supabaseClient
                .from('withdrawal_transactions')
                .update(mainWithdrawalPayload)
                .eq('id', editingWitId);
            if (updateErr) throw updateErr;
        } else {
            const { error: insertErr } = await window.supabaseClient
                .from('withdrawal_transactions')
                .insert([mainWithdrawalPayload]);
            if (insertErr) throw insertErr;
        }

        const updatedSettlementBalance = currentSettlementBalance + withdrawalAmount;

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
            isEditMode ? "🔄 विथड्रॉल ट्रांजैक्शन सफलतापूर्वक अपडेट हुआ!" : "🎉 कैश विथड्रॉल सफल! कृपया ग्राहक को नकद भुगतान करें।", 
            "AEPS Success", 
            "✅"
        );

        if (typeof window.loadTodayWithdrawals === 'function') window.loadTodayWithdrawals();
        if (typeof window.masterWithdrawalClear === 'function') window.masterWithdrawalClear();

    } catch (err) {
        console.error("Withdrawal Core Save Fail:", err);
        window.showSystemAlert("लेनदेन सुरक्षित करने में विफलता: " + err.message, "System Error", "❌");
    } finally {
        targetButton.textContent = isEditMode ? "🔄 Update Withdrawal" : "💸 Dispense Cash";
        targetButton.disabled = false;
    }
}

// ========================================================
// 🌐 GLOBAL EVENT DELEGATION BINDER
// ========================================================
document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'btn-wit-save') {
        executeWithdrawalSaveProcess(e.target);
    }
});
