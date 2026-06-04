// ========================================================
// 🗑️ AEPS CASH WITHDRAWAL CORE DELETE & ROLLBACK ENGINE
// ========================================================

async function executeWithdrawalDeleteProcess(txId, encodedTx) {
    // 🛡️ ऑपरेटर से अंतिम पुष्टि (Double Confirmation) लें
    const txData = JSON.parse(atob(encodedTx));
    const confirmFirst = confirm(`⚠️ क्या आप वाकई आधार संख्या [Aadhaar Redacted] की ₹${txData.amount} की इस निकासी (Withdrawal) को डिलीट करना चाहते हैं?\n\nऐसा करने से नोट तिजोरी में वापस आ जाएंगे और सेटलमेंट बैलेंस कम हो जाएगा!`);
    if (!confirmFirst) return;

    try {
        window.showSystemAlert("Processing Withdrawal Rollback...", "Vault Sync", "⏳");

        // १. डेटाबेस से लाइव करंट यूज़र क्रेडेंशियल दोबारा उठाएं
        let currentSettlementBalance = parseFloat(window.currentUser.settlement_balance) || 0;
        let finalVaultData = { ...window.currentUser };

        // २. 📈 विथड्रॉल रिवर्सल गणना (डिपॉजिट का उल्टा नियम)
        // निकासी डिलीट करने पर: सेटलमेंट बैलेंस में से पैसा वापस माइनस होगा, और काउंटर कैश (Vault) में नोट प्लस होंगे!
        const rollbackAmount = parseFloat(txData.amount) || 0;
        const updatedSettlementBalance = currentSettlementBalance - rollbackAmount;

        const nextVaultData = {
            settlement_balance: updatedSettlementBalance,
            cash_500: (parseInt(finalVaultData.cash_500) || 0) + (parseInt(txData.denom_out_500) || 0) - (parseInt(txData.denom_in_500) || 0),
            cash_200: (parseInt(finalVaultData.cash_200) || 0) + (parseInt(txData.denom_out_200) || 0) - (parseInt(txData.denom_in_200) || 0),
            cash_100: (parseInt(finalVaultData.cash_100) || 0) + (parseInt(txData.denom_out_100) || 0) - (parseInt(txData.denom_in_100) || 0),
            cash_50:  (parseInt(finalVaultData.cash_50)  || 0) + (parseInt(txData.denom_out_50)  || 0) - (parseInt(txData.denom_in_50)  || 0),
            cash_20:  (parseInt(finalVaultData.cash_20)  || 0) + (parseInt(txData.denom_out_20)  || 0) - (parseInt(txData.denom_in_20)  || 0),
            cash_10:  (parseInt(finalVaultData.cash_10)  || 0) + (parseInt(txData.denom_out_10)  || 0) - (parseInt(txData.denom_in_10)  || 0),
            cash_5:   (parseInt(finalVaultData.cash_5)   || 0) + (parseInt(txData.denom_out_5)   || 0) - (parseInt(txData.denom_in_5)   || 0),
            cash_coins: (parseInt(finalVaultData.cash_coins) || 0) + (parseInt(txData.denom_out_coins) || 0) - (parseInt(txData.denom_in_coins) || 0)
        };

        // ३. Supabase से ट्रांजैक्शन रो को पूरी तरह डिलीट करें
        const { error: deleteTxError } = await window.supabaseClient
            .from('withdrawal_transactions')
            .delete()
            .eq('id', txId);

        if (deleteTxError) throw deleteTxError;

        // ४. यूज़र की तिजोरी (Vault) और सेटलमेंट को डेटाबेस में अपडेट करें
        const { error: userVaultError } = await window.supabaseClient
            .from('user_roles')
            .update(nextVaultData)
            .eq('id', window.currentUser.id);

        if (userVaultError) throw userVaultError;

        // ५. ग्लोबल एक्टिव मेमोरी में सिंक करें
        Object.assign(window.currentUser, nextVaultData);

        window.showSystemAlert(`🗑️ विथड्रॉल एंट्री सफलतापूर्वक डिलीट हुई!\n₹${rollbackAmount} सेटलमेंट बैलेंस से कम कर दिए गए हैं और नोट काउंटर तिजोरी में वापस जोड़ दिए गए हैं।`, "Rollback Success", "✅");

        // ६. लाइव विथड्रॉल लेज़र तालिका को रिफ्रेश करें
        if (typeof window.loadTodayWithdrawals === 'function') window.loadTodayWithdrawals();

    } catch (err) {
        console.error("Withdrawal Delete Fatal Failure:", err);
        window.showSystemAlert("रोलबैक प्रोसेस विफल: " + err.message, "Security Alert", "❌");
    }
}

// 🌐 Global Event Delegation Listener for Withdrawal Trash Button
document.addEventListener('click', (e) => {
    const trashBtn = e.target.closest('.btn-delete-wit-tx');
    if (trashBtn) {
        const txId = trashBtn.getAttribute('data-id');
        const encodedTx = trashBtn.getAttribute('data-tx');
        executeWithdrawalDeleteProcess(txId, encodedTx);
    }
});
