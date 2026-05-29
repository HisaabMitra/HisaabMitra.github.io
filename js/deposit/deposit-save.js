document.getElementById('btn-dep-save').addEventListener('click', async () => {
    const accountNo = document.getElementById('dep-account-no').value;
    const customerName = document.getElementById('dep-cust-name').value;
    const amount = parseFloat(document.getElementById('dep-amount').value);
    const remarks = document.getElementById('dep-remarks').value;

    if (!accountNo || !amount || amount <= 0) {
        window.showSystemAlert("कृपया सभी अनिवार्य जानकारी भरें!", "Warning", "⚠️");
        return;
    }

    try {
        let calcCommission = Math.min(amount * 0.004, 50);

        const { data, error } = await window.supabaseClient
            .from('deposit_transactions')
            .insert([{ 
                ko_code: currentUser.ko_code, 
                account_number: accountNo, 
                customer_name: customerName, // अब नाम सेव होगा
                amount: amount, 
                transaction_date: new Date().toISOString(), 
                commission: calcCommission, 
                remarks: remarks, 
                ...window.DenominationComponent.getValues() 
            }])
            .select();

        if (error) throw error;

        window.showSystemAlert("ट्रांजैक्शन सफलतापूर्वक सेव हुआ!", "Success", "✅");

        // टेबल रिफ्रेश करें
        if (typeof loadTodayTransactions === 'function') {
            loadTodayTransactions();
        }

        document.getElementById('btn-dep-clear').click();
    } catch (err) { 
        console.error("Save Error:", err);
        window.showSystemAlert("त्रुटि: " + err.message, "Error", "❌"); 
    }
});
