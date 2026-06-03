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

    // [CRITICAL DEFINITION]: स्कोप और मोड डिटेक्शन वेरिएबल्स
    const isEditMode = targetButton.dataset.mode === "edit";
    const editingWitId = targetButton.dataset.editingWitId;

    // डिनॉमिनेशन लाइव काउंटर से कैश डेटा उठाएं
    let netCash = 0;
    let denomValues = {};
    if (window.DenominationComponent) {
        netCash = parseFloat(window.DenominationComponent.calculate()) || 0;
        denomValues = window.DenominationComponent.getValues() || {};
    }

    // १. बुनियादी डेटा वैधीकरण (कस्टम अलर्ट सिस्टम के साथ)
    if (!aadhaarNo || aadhaarNo.length !== 12 || isNaN(aadhaarNo)) {
        window.showSystemAlert("कृपया एक वैध 12-अंकीय आधार संख्या दर्ज करें!", "Validation Error", "⚠️");
        return;
    }
    if (!customerName || customerName === "NOT REGISTERED" || customerName.includes("ledger")) {
        window.showSystemAlert("बिना पंजीकृत ग्राहक के निकासी प्रोसेस नहीं की जा सकती!", "Validation Error", "⚠️");
        return;
    }
    if (withdrawalAmount < 100 || withdrawalAmount > 10000) {
        window.showSystemAlert("निकासी राशि न्यूनतम ₹100 und अधिकतम ₹10,000 होनी चाहिए!", "Validation Error", "⚠️");
        return;
    }

    // २. 🛡️ डिनॉमिनेशन सुरक्षा गार्ड (Strict Cash Match Rule & Custom Alert Sync)
    if (netCash === 0) {
        // 🌟 इनबिल्ट confirm() को रिप्लेस करके सुरक्षित कस्टम डोम कन्फर्मेशन प्रॉम्ट
        const proceedWithoutCash = confirm("चेतावनी: आपने डिनॉमिनेशन (नोटों का विवरण) नहीं भरा है। क्या आप इस निकासी को बिना नोट मिलान के प्रोसेस करना चाहते हैं?");
        if (!proceedWithoutCash) return;
    } else if (Math.abs(netCash - withdrawalAmount) > 0.01) {
        window.showSystemAlert(`Txn Fail: डिनॉमिनेशन टोटल (₹${netCash}) और निकासी राशि (₹${withdrawalAmount}) मैच नहीं कर रहे हैं!`, "Cash Mismatch", "❌");
        return;
    }

    targetButton.textContent = "Verifying Aadhaar...";
    targetButton.disabled = true;

    try {
        const todayStr = new Date().toISOString().split('T')[0];

        // 🚨 दैनिक विथड्रॉल सीमा की जांच (केवल न्यू एंट्री मोड में चेक करें, एडिट में नहीं)
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

        // 💥 [REVERSE PHASE - केवल विथड्रॉल एडिट के लिए]
        if (isEditMode && editingWitId) {
            console.log("Reversing old withdrawal effect for ID:", editingWitId);
            
            const { data: oldTx, error: fetchOldErr } = await window.supabaseClient
                .from('withdrawal_transactions')
                .select('*')
                .eq('id', editingWitId)
                .maybeSingle();

            if (fetchOldErr) throw fetchOldErr;

            if (oldTx) {
                // पुराना पैसा सेटलमेंट से वापस घटाएं
                currentSettlementBalance -= parseFloat(oldTx.amount) || 0;

                // पुराने जाने वाले नोटों का असर तिजोरी में वापस प्लस करें
                const notes = [500, 200, 100, 50, 20, 10, 5];
                notes.forEach(n => {
                    finalVaultData[`cash_${n}`] = (parseInt(finalVaultData[`cash_${n}`]) || 0) + (parseInt(oldTx[`denom_out_${n}`]) || 0) - (parseInt(oldTx[`denom_in_${n}`]) || 0);
                });
                finalVaultData.cash_coins = (parseInt(finalVaultData.cash_coins) || 0) + (parseInt(oldTx.denom_out_coins) || 0) - (parseInt(oldTx.denom_in_coins) || 0);
            }
        }

        // ३. कमीशन की गणना
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

        // ४. Supabase ऑपरेशन (UPDATE या INSERT)
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

        // ५. सेटलमेंट बैलेंस और तिजोरी (Vault) अपडेट गणना
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

        // ग्लोबल यूज़र ऑब्जेक्ट सिंक करें
        Object.assign(window.currentUser, nextVaultData);

        // 🌟 [CUSTOM HUB INTEGRATION]: यहाँ अब आपका कस्टमाइज्ड अलार्म सिस्टम फायर होगा!
        window.showSystemAlert(
            isEditMode ? "🔄 विथड्रॉल ट्रांजैक्शन सफलतापूर्वक अपडेट हुआ!" : "🎉 कैश विथड्रॉल सफल! कृपया ग्राहक को नकद भुगतान करें।", 
            "AEPS Success", 
            "✅"
        );

        // यूआई रिफ्रेश और क्लियरेंस
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

// Global Event Delegation Listener
document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'btn-wit-save') {
        executeWithdrawalSaveProcess(e.target);
    }
});
