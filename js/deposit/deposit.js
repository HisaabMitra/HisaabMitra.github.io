window.initDepositPage = async function (currentUser) {
    const workspace = document.getElementById('workspace');
    if (!workspace) return;

    try {
        const response = await fetch('pages/deposit.html');
        if (!response.ok) throw new Error("Deposit page load failed");
        
        workspace.innerHTML = await response.text();

        // 1. काउंटर KO Code सेट करें
        const koCodeLabel = document.getElementById('lbl-ko-code');
        if (koCodeLabel) koCodeLabel.innerText = currentUser.ko_code;

        // 2. डिनॉमिनेशन कंपोनेंट
        if (window.DenominationComponent) {
            setTimeout(() => {
                window.DenominationComponent.render('denomination-widget-container');
            }, 100); 
        }

        // --- टेबल रिफ्रेश लॉजिक (आज की एंट्रीज) ---
      async function loadTodayTransactions() {
    const tbody = document.getElementById('today-tx-body');
    if (!tbody) return;

    // Supabase से आज का डेटा निकालें
    // 'new Date().toISOString()' का मतलब है 2026-05-29T...
    const today = new Date().toISOString().split('T')[0]; 

    try {
        // सिर्फ मुख्य कॉलम फेच करें
        const { data, error } = await window.supabaseClient
            .from('deposit_transactions')
            .select('account_number, amount, created_at')
            .gte('created_at', `${today}T00:00:00`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase Error:", error);
            return;
        }

        tbody.innerHTML = '';
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">आज कोई ट्रांजैक्शन नहीं मिला</td></tr>';
            return;
        }

        data.forEach(tx => {
            // टाइम फॉर्मेटिंग
            const time = new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // टेबल में रो जोड़ें
            const row = `<tr>
                <td>${tx.account_number}</td>
                <td>--</td>
                <td>₹${tx.amount}</td>
                <td>${time}</td>
            </tr>`;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    } catch (err) { 
        console.error("Table Load Exception:", err); 
    }
}
        loadTodayTransactions();

        // 4. DOM एलिमेंट्स
        const accInput = document.getElementById('dep-account-no');
        const custNameInput = document.getElementById('dep-cust-name');
        const amountInput = document.getElementById('dep-amount');
        const wordsDisplay = document.getElementById('dep-amount-words');
        const speakBtn = document.getElementById('btn-speak-hindi');
        const remarksInput = document.getElementById('dep-remarks');
        
        const ncModal = document.getElementById('new-cust-modal');
        const ncAccInput = document.getElementById('nc-account-no');
        const ncNameInput = document.getElementById('nc-name');
        const ncMobileInput = document.getElementById('nc-mobile');
        const ncAddressInput = document.getElementById('nc-address');

        [ncNameInput, ncAddressInput].forEach(el => {
            if(el) el.addEventListener('input', function() { this.value = this.value.toUpperCase(); });
        });

        let lastSavedTransaction = null;

        amountInput.addEventListener('input', () => {
            const amt = parseInt(amountInput.value) || 0;
            wordsDisplay.innerText = amt === 0 ? "Zero Rupees Only" : `${window.numberToHindiWords(amt)} रुपए मात्र`;
        });
        amountInput.addEventListener('wheel', e => e.preventDefault());

        // हिंदी वॉयस असिस्टेंट
        let systemVoices = [];
        function loadVoices() { systemVoices = window.speechSynthesis.getVoices(); }
        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) window.speechSynthesis.onvoiceschanged = loadVoices;

        speakBtn.addEventListener('click', () => {
            const amt = parseInt(amountInput.value) || 0;
            if (amt === 0) return window.showSystemAlert("कृपया पहले सही अमाउंट दर्ज करें!", "Validation Error", "⚠️");
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(`${window.numberToHindiWords(amt)} रुपए जमा के लिए तैयार है`);
            utterance.lang = 'hi-IN';
            let hindiVoice = systemVoices.find(v => v.lang.startsWith('hi') || v.name.includes('Hindi'));
            if (hindiVoice) utterance.voice = hindiVoice;
            window.speechSynthesis.speak(utterance);
        });

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
            const formattedAccountNo = formatAccountNumber(accountNo, userSolId);
            if (formattedAccountNo !== accountNo) { accInput.value = formattedAccountNo; accountNo = formattedAccountNo; }
            try {
                const { data, error } = await window.supabaseClient.from('banking_customers').select('customer_name').eq('account_number', accountNo).single();
                if (data) custNameInput.value = data.customer_name;
                else { ncAccInput.value = accountNo; ncModal.style.display = 'flex'; }
            } catch (err) { console.error("Search error:", err.message); }
        }
        accInput.addEventListener('blur', searchCustomer);

        document.getElementById('btn-nc-continue').addEventListener('click', async () => {
            const accNo = ncAccInput.value.trim();
            const cName = ncNameInput.value.trim();
            const cMobile = ncMobileInput.value.trim();
            const cAddress = ncAddressInput.value.trim();
            if (!cName || !cMobile) return window.showSystemAlert("नाम और मोबाइल नंबर अनिवार्य हैं!", "Validation Error", "❌");
            try {
                const { error } = await window.supabaseClient.from('banking_customers').insert([{ account_number: accNo, customer_name: cName, mobile_number: cMobile, customer_address: cAddress, registered_by_ko: currentUser.ko_code }]);
                if (error) throw error;
                custNameInput.value = cName;
                ncModal.style.display = 'none';
                window.showSystemAlert("कस्टमर पंजीकृत!", "Success", "✅");
            } catch (err) { window.showSystemAlert("विफल: " + err.message, "Error", "❌"); }
        });

        document.getElementById('btn-nc-cancel').addEventListener('click', () => { ncModal.style.display = 'none'; accInput.value = ""; custNameInput.value = ""; });

        // सेव ट्रांजैक्शन (टेबल रिफ्रेश के साथ)
        document.getElementById('btn-dep-save').addEventListener('click', async () => {
            const accountNo = accInput.value.trim();
            const custName = custNameInput.value.trim();
            const amount = parseFloat(amountInput.value) || 0;
            const remarks = remarksInput.value.trim();
            const netCash = window.DenominationComponent.calculate();

            if (!accountNo || !custName || amount <= 0) return window.showSystemAlert("सभी फ़ील्ड भरें!", "Validation Error", "❌");

            const saveTransactionData = async () => {
                let calcCommission = Math.min(amount * 0.004, 50);
                try {
                    const { data: txData, error: txError } = await window.supabaseClient
                        .from('deposit_transactions')
                        .insert([{ ko_code: currentUser.ko_code, account_number: accountNo, amount: amount, commission: calcCommission, remarks: remarks, ...window.DenominationComponent.getValues() }])
                        .select().single();
                    if (txError) throw txError;
                    lastSavedTransaction = txData;
                    document.getElementById('btn-dep-print').removeAttribute('disabled');
                    window.showSystemAlert("ट्रांजैक्शन सफल!", "Success", "✅");
                    loadTodayTransactions(); // 🌟 टेबल रिफ्रेश
                    document.getElementById('btn-dep-clear').click();
                } catch (err) { window.showSystemAlert("त्रुटि: " + err.message, "Error", "❌"); }
            };

            if (netCash === 0) window.showSystemConfirm("बिना कैश आगे बढ़ें?", "Warning", saveTransactionData);
            else if (netCash !== amount) window.showSystemAlert("डिनॉमिनेशन और राशि मैच नहीं!", "Error", "❌");
            else saveTransactionData();
        });

        document.getElementById('btn-dep-clear').addEventListener('click', () => {
            accInput.value = ""; custNameInput.value = ""; amountInput.value = ""; remarksInput.value = "";
            wordsDisplay.innerText = "Zero Rupees Only";
            window.DenominationComponent.clear();
        });

        document.getElementById('btn-dep-print').addEventListener('click', () => {
            if (!lastSavedTransaction) return;
            const printWindow = window.open('', '_blank', 'width=600,height=600');
            printWindow.document.write(`<html><body style="font-family:monospace; padding:20px;"><h2>RECEIPT</h2><p>Account: ${lastSavedTransaction.account_number}</p><p>Amount: ₹${lastSavedTransaction.amount}</p><script>window.print(); window.close();<\/script></body></html>`);
            printWindow.document.close();
        });

    } catch (error) { console.error("Error:", error); }
};
