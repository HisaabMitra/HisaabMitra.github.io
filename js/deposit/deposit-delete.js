// ========================================================
// 🗑️ AEPS CASH DEPOSIT CORE DELETE & ROLLBACK ENGINE
// ========================================================

async function executeDepositDeleteProcess(txId, encodedTx) {
    // 🛡️ ऑपरेटर से अंतिम पुष्टि (Double Confirmation) लें
    const txData = JSON.parse(atob(encodedTx));
    const confirmFirst = confirm(`⚠️ क्या आप वाकई खाता संख्या ${txData.account_number} की ₹${txData.amount} की इस जमा राशि (Deposit) को डिलीट करना चाहते हैं?\n\nऐसा करने से नोट तिजोरी से कम हो जाएंगे और सेटलमेंट बैलेंस वापस जुड़ जाएगा!`);
    if (!confirmFirst) return;

    try {
        window.showSystemAlert("Processing Rollback Thread...", "Vault Sync", "⏳");

        // १. डेटाबेस से लाइव करंट यूजर रोल क्रेडेंशियल दोबारा उठाएं ताकि बैलेंस मिसमैच न हो
        let currentSettlementBalance = parseFloat(window.currentUser.settlement_balance) || 0;
        let finalVaultData = { ...window.currentUser };

        // २. 📈 रिवर्सल गणना (डिपॉजिट का उल्टा नियम)
        // जमा डिलीट करने पर: सेटलमेंट बैलेंस में पैसा वापस प्लस होगा, और काउंटर कैश (Vault) से नोट माइनस होंगे!
        const rollbackAmount = parseFloat(txData.amount) || 0;
        const updatedSettlementBalance = currentSettlementBalance + rollbackAmount;

        const nextVaultData = {
            settlement_balance: updatedSettlementBalance,
            cash_500: (parseInt(finalVaultData.cash_500) || 0) - (parseInt(txData.denom_in_500) || 0) + (parseInt(txData.denom_out_500) || 0),
            cash_200: (parseInt(finalVaultData.cash_200) || 0) - (parseInt(txData.denom_in_200) || 0) + (parseInt(txData.denom_out_200) || 0),
            cash_100: (parseInt(finalVaultData.cash_100) || 0) - (parseInt(txData.denom_in_100) || 0) + (parseInt(txData.denom_out_100) || 0),
            cash_50:  (parseInt(finalVaultData.cash_50)  || 0) - (parseInt(txData.denom_in_50)  || 0) + (parseInt(txData.denom_out_50)  || 0),
            cash_20:  (parseInt(finalVaultData.cash_20)  || 0) - (parseInt(txData.denom_in_20)  || 0) + (parseInt(txData.denom_out_20)  || 0),
            cash_10:  (parseInt(finalVaultData.cash_10)  || 0) - (parseInt(txData.denom_in_10)  || 0) + (parseInt(txData.denom_out_10)  || 0),
            cash_5:   (parseInt(finalVaultData.cash_5)   || 0) - (parseInt(txData.denom_in_5)   || 0) + (parseInt(txData.denom_out_5)   || 0),
            cash_coins: (parseInt(finalVaultData.cash_coins) || 0) - (parseInt(txData.denom_in_coins) || 0) + (parseInt(txData.denom_out_coins) || 0)
        };

        // ३. Supabase से ट्रांजैक्शन रो को पूरी तरह डिलीट करें
        const { error: deleteTxError } = await window.supabaseClient
            .from('deposit_transactions')
            .delete()
            .eq('transaction_id', txId); // आपकी तालिका की प्राइमरी की के अनुसार

        if (deleteTxError) throw deleteTxError;

        // ४. यूज़र की तिजोरी (Vault Vault) और सेटलमेंट को डेटाबेस में अपडेट करें
        const { error: userVaultError } = await window.supabaseClient
            .from('user_roles')
            .update(nextVaultData)
            .eq('id', window.currentUser.id);

        if (userVaultError) throw userVaultError;

        // ५. ग्लोबल एक्टिव मेमोरी में सिंक करें
        Object.assign(window.currentUser, nextVaultData);

        window.showSystemAlert(`🗑️ ट्रांजैक्शन डिलीट सफल!\n₹${rollbackAmount} सेटलमेंट में वापस जोड़ दिए गए हैं और काउंटर तिजोरी अपडेट हो गई है।`, "Rollback Success", "✅");

        // ६. लाइव लेज़र रिफ्रेश कॉल
        if (typeof window.loadTodayTransactions === 'function') window.loadTodayTransactions();

    } catch (err) {
        console.error("Deposit Delete Fatal Failure:", err);
        window.showSystemAlert("रोलबैक प्रोसेस विफल: " + err.message, "Security Alert", "❌");
    }
}

// 🌐 Global Event Delegation Listener for Trash Button
document.addEventListener('click', (e) => {
    const trashBtn = e.target.closest('.btn-delete-dep-tx');
    if (trashBtn) {
        const txId = trashBtn.getAttribute('data-id');
        const encodedTx = trashBtn.getAttribute('data-tx');
        executeDepositDeleteProcess(txId, encodedTx);
    }
});
