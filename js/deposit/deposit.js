window.initDepositPage = async function (currentUser) {
    const workspace = document.getElementById('workspace');
    if (!workspace) return;

    try {
        const response = await fetch('pages/deposit.html');
        if (!response.ok) throw new Error("Deposit page load failed");
        workspace.innerHTML = await response.text();

        // DOM Elements
        const accInput = document.getElementById('dep-account-no');
        const custNameInput = document.getElementById('dep-cust-name');
        const amountInput = document.getElementById('dep-amount');
        const wordsDisplay = document.getElementById('dep-amount-words');
        const remarksInput = document.getElementById('dep-remarks');
        const ncModal = document.getElementById('new-cust-modal');
        const ncAccInput = document.getElementById('nc-account-no');
        const ncNameInput = document.getElementById('nc-name');
        const ncMobileInput = document.getElementById('nc-mobile');
        const ncAddressInput = document.getElementById('nc-address');

        // Capitalize Logic
        [ncNameInput, ncAddressInput].forEach(el => {
            if(el) el.addEventListener('input', function() { this.value = this.value.toUpperCase(); });
        });

        // --- टेबल लोड लॉजिक ---
        async function loadTodayTransactions() {
            const tbody = document.getElementById('today-tx-body');
            if (!tbody) return;
            const today = new Date().toISOString().split('T')[0];

            try {
                const { data, error } = await window.supabaseClient
                    .from('deposit_transactions')
                    .select('account_number, amount, created_at, banking_customers(customer_name)')
                    .gte('created_at', `${today}T00:00:00`)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                tbody.innerHTML = '';
                data.forEach(tx => {
                    const time = new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const name = tx.banking_customers?.customer_name || 'N/A';
                    tbody.insertAdjacentHTML('beforeend', `<tr><td>${tx.account_number}</td><td>${name}</td><td>₹${tx.amount}</td><td>${time}</td></tr>`);
                });
            } catch (err) { console.error("Table Load Error:", err.message); }
        }
        loadTodayTransactions();

        // --- अकाउंट फॉर्मेटिंग ---
        function formatAccountNumber(inputAcc, solId) {
            let acc = inputAcc.trim();
            if (acc.length > 10 || !acc.includes('-')) return acc;
            const parts = acc.split('-');
            return `${solId}${parts[0].padStart(2, '0')}${parts[1].padStart(8, '0')}`;
        }

        async function searchCustomer() {
            let accountNo = accInput.value.trim();
            if (!accountNo) return;
            const userSolId = currentUser.sol_id || '193000'; 
            const formatted = formatAccountNumber(accountNo, userSolId);
            if (formatted !== accountNo) { accInput.value = formatted; accountNo = formatted; }

            const { data, error } = await window.supabaseClient.from('banking_customers').select('customer_name').eq('account_number', accountNo).single();
            if (data) custNameInput.value = data.customer_name;
            else { ncAccInput.value = accountNo; ncModal.style.display = 'flex'; }
        }
        accInput.addEventListener('blur', searchCustomer);

        // --- सेव ट्रांजैक्शन ---
        document.getElementById('btn-dep-save').addEventListener('click', async () => {
            const accountNo = accInput.value.trim();
            const custName = custNameInput.value.trim();
            const amount = parseFloat(amountInput.value) || 0;
            const netCash = window.DenominationComponent.calculate();

            if (!accountNo || !custName || amount <= 0) return window.showSystemAlert("सभी फ़ील्ड सही भरें!", "Validation Error", "❌");

            const executeSave = async () => {
                const calcCommission = Math.min(amount * 0.004, 50); // कमीशन कैलकुलेशन
                try {
                    const { error } = await window.supabaseClient
                        .from('deposit_transactions')
                        .insert([{ 
                            ko_code: currentUser.ko_code, 
                            account_number: accountNo, 
                            amount: amount, 
                            commission: calcCommission, // अब यहाँ commission जाएगा
                            ...window.DenominationComponent.getValues() 
                        }]);
                    if (error) throw error;
                    window.showSystemAlert("ट्रांजैक्शन सफल!", "Success", "✅");
                    loadTodayTransactions();
                    document.getElementById('btn-dep-clear').click();
                } catch (err) { window.showSystemAlert("त्रुटि: " + err.message, "Error", "❌"); }
            };

            if (netCash === 0) window.showSystemConfirm("बिना कैश डिनॉमिनेशन के आगे बढ़ें?", "Warning", executeSave);
            else if (netCash !== amount) window.showSystemAlert(`डिनॉमिनेशन योग ₹${netCash} और जमा राशि ₹${amount} मेल नहीं खा रहे!`, "Mismatch", "❌");
            else executeSave();
        });

        // --- अन्य इवेंट्स ---
        amountInput.addEventListener('input', () => {
            const amt = parseInt(amountInput.value) || 0;
            wordsDisplay.innerText = amt === 0 ? "Zero Rupees Only" : `${window.numberToHindiWords(amt)} रुपए मात्र`;
        });
        document.getElementById('btn-dep-clear').addEventListener('click', () => {
            accInput.value = ""; custNameInput.value = ""; amountInput.value = "";
            window.DenominationComponent.clear();
        });

    } catch (error) { console.error("Error:", error); }
};
