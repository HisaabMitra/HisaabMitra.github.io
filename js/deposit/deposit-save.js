document.getElementById('btn-dep-save').addEventListener('click', async () => {
    // 1. इनपुट फील्ड से वैल्यू उठाएं
    const accountNo = document.getElementById('dep-account-no').value;
    const customerName = document.getElementById('dep-cust-name').value; // जो नाम पहले से दिख रहा है
    const amount = parseFloat(document.getElementById('dep-amount').value);
    const remarks = document.getElementById('dep-remarks').value;

    // बेसिक वैलिडेशन
    if (!accountNo || !amount || amount <= 0) {
        window.showSystemAlert("कृपया खाता संख्या और राशि भरें!", "Warning", "⚠️");
        return;
    }

    // 2. सेव करने का प्रोसेस
    try {
        // कमीशन कैलकुलेशन
        let calcCommission = Math.min(amount * 0.004, 50);

        const { data: txData, error: txError } = await window.supabaseClient
            .from('deposit_transactions')
            .insert([{ 
                ko_code: currentUser.ko_code, 
                account_number: accountNo, 
                customer_name: customerName, // यहाँ नाम जा रहा है
                amount: amount, 
                transaction_date: new Date().toISOString(), 
                commission: calcCommission, 
                remarks: remarks, 
                ...window.DenominationComponent.getValues() 
            }])
            .select();

        if (txError) throw txError;

        // 3. सफलता पर
        window.showSystemAlert("ट्रांजैक्शन सफल रहा!", "Success", "✅");

        // 4. टेबल रिफ्रेश करें (अगर लोड फंक्शन ग्लोबली मौजूद है)
        if (typeof loadTodayTransactions === 'function') {
            loadTodayTransactions();
        }

        // 5. फॉर्म क्लियर करें
        document.getElementById('btn-dep-clear').click();

    } catch (err) { 
        console.error("Save Error:", err);
        window.showSystemAlert("सेव करने में त्रुटि: " + err.message, "Error", "❌"); 
    }
});
