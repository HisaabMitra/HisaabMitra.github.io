document.addEventListener('click', async (e) => {
    // चेक करें कि क्लिक किया गया एलिमेंट 'btn-dep-save' है या नहीं
    if (e.target && e.target.id === 'btn-dep-save') {
        
        // अब यहाँ अपना सेव लॉजिक लिखें
        const accInput = document.getElementById('dep-account-no');
        const custNameInput = document.getElementById('dep-cust-name');
        const amountInput = document.getElementById('dep-amount');
        const remarksInput = document.getElementById('dep-remarks');
        
        const accountNo = accInput.value.trim();
        const custName = custNameInput.value.trim();
        const amount = parseFloat(amountInput.value) || 0;
        const remarks = remarksInput.value.trim();
        const netCash = window.DenominationComponent.calculate();

        if (!accountNo || !custName || amount <= 0) {
            window.showSystemAlert("सभी फ़ील्ड भरें!", "Validation Error", "❌");
            return;
        }

        const saveTransactionData = async () => {
            let calcCommission = Math.min(amount * 0.004, 50);
            try {
                const { data: txData, error: txError } = await window.supabaseClient
                    .from('deposit_transactions')
                    .insert([{ 
                        ko_code: window.currentUser.ko_code, 
                        account_number: accountNo, 
                        customer_name: custName, 
                        amount: amount, 
                        commission: calcCommission, 
                        remarks: remarks, 
                        ...window.DenominationComponent.getValues() 
                    }])
                    .select().single();
                
                if (txError) throw txError;
                
                window.showSystemAlert("ट्रांजैक्शन सफल!", "Success", "✅");
                
                // टेबल रिफ्रेश करें (अब यह ग्लोबल फंक्शन है)
                if (typeof window.loadTodayTransactions === 'function') {
                    window.loadTodayTransactions();
                }
                
                document.getElementById('btn-dep-clear').click();
            } catch (err) { 
                console.error("Save Error:", err);
                window.showSystemAlert("त्रुटि: " + err.message, "Error", "❌"); 
            }
        };

        if (netCash === 0) window.showSystemConfirm("बिना कैश आगे बढ़ें?", "Warning", saveTransactionData);
        else if (netCash !== amount) window.showSystemAlert("डिनॉमिनेशन और राशि मैच नहीं!", "Error", "❌");
        else saveTransactionData();
    }
});
