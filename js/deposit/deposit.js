window.initDepositPage = async function (currentUser) {
    const workspace = document.getElementById('workspace');
    if (!workspace) return;

    try {
        // 1. AJAX/Fetch के ज़रिए deposit.html फाइल को सीधे लोड करें
        const response = await fetch('pages/deposit.html');
        if (!response.ok) throw new Error("Deposit page load failed");
        
        const htmlContent = await response.text();
        workspace.innerHTML = htmlContent; // HTML को सीधा कंटेनर में डाला

        // 2. यूजर का KO Code लेबल पर सेट करें
        const koCodeLabel = document.getElementById('lbl-ko-code');
        if (koCodeLabel) koCodeLabel.innerText = currentUser.ko_code;

        // 3. रियूजेबल डिनॉमिनेशन कंपोनेंट को राइट साइड के बॉक्स में रेंडर करें
      if (window.DenominationComponent) {
    // ब्राउज़र को HTML रेंडर करने के लिए 50 मिलीसेकंड का समय दें
    setTimeout(() => {
        window.DenominationComponent.render('denomination-widget-container');
    }, 50); 
}

        // 4. सारे डोम (DOM) एलिमेंट्स के रेफेरेंस ढूंढना
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

        let lastSavedTransaction = null;

        // --- इवेंट्स और सिंक लॉजिक ---
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
            if (amt === 0) return alert("कृपया पहले सही अमाउंट दर्ज करें!");
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(`${window.numberToHindiWords(amt)} रुपए जमा के लिए तैयार है`);
            utterance.lang = 'hi-IN';
            if (systemVoices.length === 0) systemVoices = window.speechSynthesis.getVoices();
            let hindiVoice = systemVoices.find(v => v.lang.startsWith('hi') || v.name.includes('Hindi'));
            if (hindiVoice) utterance.voice = hindiVoice;
            window.speechSynthesis.speak(utterance);
        });

        // --- Supabase कस्टमर सर्च लॉजिक ---
        async function searchCustomer() {
            const accountNo = accInput.value.trim();
            if (!accountNo) return;
            try {
                const { data, error } = await window.supabaseClient
                    .from('banking_customers')
                    .select('customer_name')
                    .eq('account_number', accountNo).single();

                if (error && error.code !== 'PGRST116') throw error;
                if (data) {
                    custNameInput.value = data.customer_name;
                } else {
                    ncAccInput.value = accountNo;
                    ncNameInput.value = ""; ncMobileInput.value = ""; ncAddressInput.value = "";
                    ncModal.style.display = 'flex';
                }
            } catch (err) { console.error("Fetch error:", err.message); }
        }
        accInput.addEventListener('blur', searchCustomer);

        // नया कस्टमर सबमिट
        document.getElementById('btn-nc-continue').addEventListener('click', async () => {
            const accNo = ncAccInput.value.trim();
            const cName = ncNameInput.value.trim();
            const cMobile = ncMobileInput.value.trim();
            const cAddress = ncAddressInput.value.trim();

            if (!cName || !cMobile) return alert("नाम और मोबाइल नंबर अनिवार्य हैं!");
            try {
                const { error } = await window.supabaseClient.from('banking_customers')
                    .insert([{ account_number: accNo, customer_name: cName, mobile_number: cMobile, customer_address: cAddress, registered_by_ko: currentUser.ko_code }]);
                if (error) throw error;
                custNameInput.value = cName;
                ncModal.style.display = 'none';
            } catch (err) { alert("विफल: " + err.message); }
        });

        document.getElementById('btn-nc-cancel').addEventListener('click', () => {
            ncModal.style.display = 'none'; accInput.value = ""; custNameInput.value = "";
        });

        // --- ट्रांजैक्शन सेव लॉजिक ---
        document.getElementById('btn-dep-save').addEventListener('click', async () => {
            const accountNo = accInput.value.trim();
            const custName = custNameInput.value.trim();
            const amount = parseFloat(amountInput.value) || 0;
            const remarks = remarksInput.value.trim();
            const netCash = window.DenominationComponent.calculate();

            if (!accountNo || !custName || amount <= 0) return alert("सभी फ़ील्ड सही भरें!");
            if (netCash === 0) {
                if (!confirm("⚠️ बिना कैश डिनॉमिनेशन के आगे बढ़ना चाहते हैं?")) return;
            } else if (netCash !== amount) {
                return alert(`❌ डिनॉमिनेशन योग (₹${netCash}) और जमा राशि (₹${amount}) मैच नहीं हैं!`);
            }

            let calcCommission = Math.min(amount * 0.004, 50);

            try {
                const denomDetails = window.DenominationComponent.getValues();
                const { data: txData, error: txError } = await window.supabaseClient
                    .from('deposit_transactions')
                    .insert([{ ko_code: currentUser.ko_code, account_number: accountNo, amount: amount, commission: calcCommission, remarks: remarks, ...denomDetails }])
                    .select().single();

                if (txError) throw txError;

                // [यहाँ आपका बैलेंस और कैश वॉल्ट अपडेट क्वेरी रहेगा...]

                lastSavedTransaction = txData;
                document.getElementById('btn-dep-print').removeAttribute('disabled');
                alert("ट्रांजैक्शन सफल!");
                document.getElementById('btn-dep-clear').click();
            } catch (err) { alert("त्रुटि: " + err.message); }
        });

        // क्लियर बटन
        document.getElementById('btn-dep-clear').addEventListener('click', () => {
            accInput.value = ""; custNameInput.value = ""; amountInput.value = ""; remarksInput.value = "";
            wordsDisplay.innerText = "Zero Rupees Only";
            window.DenominationComponent.clear();
        });

        // प्रिंट रसीद
        document.getElementById('btn-dep-print').addEventListener('click', () => {
            if (!lastSavedTransaction) return;
            const printWindow = window.open('', '_blank', 'width=600,height=600');
            printWindow.document.write(`<html><body style="font-family:monospace; padding:20px;"><center><h2>RECEIPT</h2></center><p>Account: ${lastSavedTransaction.account_number}</p><p>Amount: ₹${lastSavedTransaction.amount}</p><script>window.print(); window.close();<\/script></body></html>`);
            printWindow.document.close();
        });

    } catch (error) {
        console.error("Error initializing deposit page:", error);
        workspace.innerHTML = `<p style="color:red; padding:20px;">त्रुटि: डिपॉजिट पेज लोड नहीं किया जा सका।</p>`;
    }
};
