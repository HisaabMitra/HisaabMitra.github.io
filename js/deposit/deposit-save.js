document.addEventListener('click', async (e) => {
    // चेक करें कि क्लिक किया गया एलिमेंट 'btn-dep-save' है या नहीं
    if (e.target && e.target.id === 'btn-dep-save') {
        
        const accInput = document.getElementById('dep-account-no');
        const custNameInput = document.getElementById('dep-cust-name');
        const amountInput = document.getElementById('dep-amount');
        const remarksInput = document.getElementById('dep-remarks');
        
        const accountNo = accInput.value.trim();
        const custName = custNameInput.value.trim();
        const amount = parseFloat(amountInput.value) || 0;
        const remarks = remarksInput.value.trim();
        
        // डिनॉमिनेशन कॉम्पोनेन्ट से कुल नेट कैश निकालें (इसमें नोट + कॉइन्स दोनों का नेट टोटल शामिल है)
        let netCash = 0;
        if (window.DenominationComponent) {
            netCash = parseFloat(window.DenominationComponent.calculate()) || 0;
        }

        // बेसिक वैलिडेशन
        if (!accountNo || !custName || amount <= 0) {
            window.showSystemAlert("सभी फ़ील्ड भरें!", "Validation Error", "❌");
            return;
        }

        const saveTransactionData = async () => {
            let calcCommission = Math.min(amount * 0.004, 50); // 0.4% कमीशन या अधिकतम ₹50
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
                        // इसके अंदर सभी नोटों के IN/OUT के साथ denom_in_coins और denom_out_coins भी चला जाएगा
                        ...window.DenominationComponent.getValues() 
                    }])
                    .select().single();
                
                if (txError) throw txError;
                
                window.showSystemAlert("ट्रांजैक्शन सफल!", "Success", "✅");
                
                // टेबल रिफ्रेश करें
                if (typeof window.loadTodayTransactions === 'function') {
                    window.loadTodayTransactions();
                }
                
                // सेव होने के बाद पूरा फॉर्म और डिनॉमिनेशन क्लियर करें
                document.getElementById('btn-dep-clear').click();

            } catch (err) { 
                console.error("Save Error:", err);
                window.showSystemAlert("त्रुटि: " + err.message, "Error", "❌"); 
            }
        };

        // अमाउंट और नेट कैश की मैचिंग चेक (जावास्क्रिप्ट फ्लोट-सेफ कम्पेरिजन)
        if (netCash === 0) {
            window.showSystemConfirm("बिना कैश आगे बढ़ें?", "Warning", saveTransactionData);
        } else if (Math.abs(netCash - amount) > 0.01) {
            // ₹2400 वाले केस में अगर नेट कैश और अमाउंट मैच नहीं हुआ तो ये अलर्ट रोकेगा
            window.showSystemAlert(`डिनॉमिनेशन टोटल (₹${netCash}) और जमा राशि (₹${amount}) मैच नहीं!`, "Error", "❌");
        } else {
            saveTransactionData();
        }
    }
});
