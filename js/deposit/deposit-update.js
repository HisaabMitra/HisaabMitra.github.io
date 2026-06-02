// ========================================================
// 🔄 TRANSACTION UPDATE & REVERSAL ENGINE (WITH DEEP LIMIT CHECK)
// ========================================================
window.processTransactionUpdate = async function(txId, accountNo, custName, newAmount, remarks, newDenom) {
    if (!txId || !window.currentUser || !window.currentUser.id) {
        window.showSystemAlert("एडिटिंग सेशन अमान्य है!", "Error", "❌");
        return;
    }

    try {
        // [1] डेटाबेस से इस ट्रांजैक्शन का पुराना रिकॉर्ड निकालें ताकि उसे रिवर्स (उल्टा) कर सकें
        const { data: oldTx, error: fetchTxErr } = await window.supabaseClient
            .from('deposit_transactions')
            .select('*')
            .eq('transaction_id', txId)
            .single();

        if (fetchTxErr || !oldTx) throw new Error("पुरानी ट्रांजैक्शन का डेटा नहीं मिला: " + fetchTxErr?.message);

        // 🛑 [FINAL GUARD] अपडेट होने से ठीक पहले एक बार फिर डेटाबेस से आज का टोटल चेक करें 🛑
        const today = new Date().toISOString().split('T')[0];
        const { data: txList, error: limitQueryErr } = await window.supabaseClient
            .from('deposit_transactions')
            .select('amount, transaction_id')
            .eq('account_number', accountNo)
            .gte('transaction_date', `${today}T00:00:00`);

        if (limitQueryErr) throw limitQueryErr;

        let otherDepositsSum = 0;
        if (txList && txList.length > 0) {
            txList.forEach(tx => {
                // इस सेम ट्रांजैक्शन आईडी को छोड़कर बाकी सबका टोटल जोड़ें
                if (tx.transaction_id !== txId) {
                    otherDepositsSum += parseFloat(tx.amount) || 0;
                }
            });
        }

        // फाइनल लिमिट चेक
        if (otherDepositsSum + newAmount > 25000) {
            const allowedMax = 25000 - otherDepositsSum;
            window.showSystemAlert(
                `🛑 दैनिक सीमा उल्लंघन (अपडेट ब्लॉक्ड)!\n\nइस अकाउंट में अन्य ट्रांजैक्शन्स से आज ₹${otherDepositsSum.toLocaleString('en-IN')} जमा हो चुके हैं।\n\nसंशोधन के बाद यह राशि ₹25,000 की लिमिट को पार कर रही. आप अधिकतम ₹${allowedMax > 0 ? allowedMax.toLocaleString('en-IN') : 0} तक ही अपडेट कर सकते हैं।`,
                "Daily Limit Exceeded",
                "❌"
            );
            return; // यहीं से बाहर निकल जाएं, डेटाबेस सुरक्षित रहेगा
        }

        // [2] 🌟 रिवर्सल + न्यू एडजस्टमेंट कैलकुलेशन (एक साथ) 🌟
        const currentSettlementBalance = parseFloat(window.currentUser.settlement_balance) || 0;
        const oldAmount = parseFloat(oldTx.amount) || 0;

        // फॉर्मूला: करंट बैलेंस + पुराना अमाउंट (जो कट गया था वो वापस प्लस) - नया अमाउंट (नया वाला माइनस)
        const updatedSettlementBalance = currentSettlementBalance + oldAmount - newAmount;

        const notes = [500, 200, 100, 50, 20, 10, 5];
        const nextVaultData = {
            settlement_balance: updatedSettlementBalance
        };

        // नोटों का रिवर्सल और नया एडजस्टमेंट एक साथ लूप में करें
        notes.forEach(note => {
            const currentCount = parseInt(window.currentUser[`cash_${note}`]) || 0;
            const oldIn = parseInt(oldTx[`denom_in_${note}`]) || 0;
            const oldOut = parseInt(oldTx[`denom_out_${note}`]) || 0;
            const newIn = parseInt(newDenom[`denom_in_${note}`]) || 0;
            const newOut = parseInt(newDenom[`denom_out_${note}`]) || 0;

            // फॉर्मूला: पुराना वॉलेट काउंट - पुराना IN + पुराना OUT (रिवर्सल डन) + नया IN - नया OUT (न्यू डेटा डन)
            nextVaultData[`cash_${note}`] = currentCount - oldIn + oldOut + newIn - newOut;
        });

        // 🪙 कॉइन्स (Coins) का भी सेम रिवर्सल और न्यू एडजस्टमेंट
        const currentCoins = parseInt(window.currentUser.cash_coins) || 0;
        const oldCoinsIn = parseInt(oldTx.denom_in_coins) || 0;
        const oldCoinsOut = parseInt(oldTx.denom_out_coins) || 0;
        const newCoinsIn = parseInt(newDenom.denom_in_coins) || 0;
        const newCoinsOut = parseInt(newDenom.denom_out_coins) || 0;

        nextVaultData[`cash_coins`] = currentCoins - oldCoinsIn + oldCoinsOut + newCoinsIn - newCoinsOut;

        // लो बैलेंस चेक (अगर अपडेट के बाद बैलेंस माइनस में जा रहा है, तो 2 सेकंड की चेतावनी देंगे)
        if (updatedSettlementBalance < 0) {
            window.showSystemAlert(`⚠️ ध्यान दें! इस अपडेट के बाद सेटलमेंट बैलेंस माइनस (₹${updatedSettlementBalance.toFixed(2)}) में जा रहा है। टॉप-अप याद से कर लेना।`, "Low Balance Notice", "ℹ️");
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 सेकंड का होल्ड
        }

        // [3] `deposit_transactions` टेबल में पुराने डेटा को नए डेटा से अपडेट करें
        let calcCommission = Math.min(newAmount * 0.004, 50); // नया कमीशन कैलकुलेट किया
        const { error: txUpdateErr } = await window.supabaseClient
            .from('deposit_transactions')
            .update({
                account_number: accountNo,
                customer_name: custName,
                amount: newAmount,
                commission: calcCommission,
                remarks: remarks,
                ...newDenom
            })
            .eq('transaction_id', txId);

        if (txUpdateErr) throw txUpdateErr;

        // [4] `user_roles` टेबल में नया तिजोरी (Vault) और सेटलमेंट बैलेंस अपडेट करें
        const { error: userUpdateErr } = await window.supabaseClient
            .from('user_roles')
            .update(nextVaultData)
            .eq('id', window.currentUser.id);

        if (userUpdateErr) throw userUpdateErr;

        // [5] लोकल विंडो ऑब्जेक्ट को तुरंत सिंक करें ताकि होमपेज पर भी तुरंत सही दिखे
        Object.assign(window.currentUser, nextVaultData);

        window.showSystemAlert("🔄 ट्रांजैक्शन सफलतापूर्वक अपडेट और तिजोरी सिंक हो गई!", "Update Success", "✅");

        // आज की ट्रांजैक्शन लिस्ट/टेबल रीलोड करें
        if (typeof window.loadTodayTransactions === 'function') {
            window.loadTodayTransactions();
        }

        // 🧹 फॉर्म को वापस पूरी तरह खाली करने के लिए क्लियर बटन को सीधे फायर करें
        const clearBtn = document.getElementById('btn-dep-clear');
        if (clearBtn) {
            clearBtn.click();
        }

    } catch (err) {
        console.error("Critical Update Error:", err);
        window.showSystemAlert("अपडेट फेल हो गया: " + err.message, "Error", "❌");
    }
};
