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

        // 4. सारे डोम (DOM)限界 एलिमेंट्स के रेफेरेंस ढूंढना
        const accInput = document.getElementById('dep-account-no');
        const custNameInput = document.getElementById('dep-cust-name');
        const amountInput = document.getElementById('dep-amount');
        const wordsDisplay = document.getElementById('dep-amount-words');
        const speakBtn = document.getElementById('btn-speak-hindi');
        const remarksInput = document.getElementById('dep-remarks');
        
        const ncModal = document.getElementById('new-cust-modal');
        const ncAccInput = document.getElementById('nc-account-no');
        const ncNameInput = document.getElementById('nc-name');
        ncNameInput.addEventListener('input', function() {
    this.value = this.value.toUpperCase();
});
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
            if (amt === 0) return window.showSystemAlert("कृपया पहले सही अमाउंट दर्ज करें!", "Validation Error", "⚠️");
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(`${window.numberToHindiWords(amt)} रुपए जमा के लिए तैयार है`);
            utterance.lang = 'hi-IN';
            if (systemVoices.length === 0) systemVoices = window.speechSynthesis.getVoices();
            let hindiVoice = systemVoices.find(v => v.lang.startsWith('hi') || v.name.includes('Hindi'));
            if (hindiVoice) utterance.voice = hindiVoice;
            window.speechSynthesis.speak(utterance);
        });

        // --- कस्टमर सर्च से पहले अकाउंट नंबर को ऑटो-फॉर्मेट करने का फंक्शन ---
        function formatAccountNumber(inputAcc, solId) {
            let acc = inputAcc.trim();

            // नियम 1: अगर 10 digit से बड़ा है, तो कोई छेड़छाड़ नहीं
            if (acc.length > 10) {
                return acc;
            }

            // नियम 2: अगर अकाउंट नंबर में डैश (-) मौजूद है
            if (acc.includes('-')) {
                const parts = acc.split('-');
                const prefix = parts[0].padStart(2, '0'); // 2 डिजिट फिक्स (जैसे: 01, 17)
                const suffix = parts[1].padStart(8, '0'); // 8 डिजिट फिक्स करेगा (जैसे: 00020039)

                // सबको मिलाकर फाइनल 16 डिजिट का अकाउंट नंबर तैयार
                const fullAccountNumber = `${solId}${prefix}${suffix}`;
                return fullAccountNumber;
            }

            return acc;
        }

        // --- संशोधित कस्टमर सर्च लॉजिक ---
        async function searchCustomer() {
            let accountNo = accInput.value.trim();
            if (!accountNo) return;

            const userSolId = currentUser.sol_id || '193000'; 

            // लॉजिक अप्लाई करें
            const formattedAccountNo = formatAccountNumber(accountNo, userSolId);

            // अगर नंबर बदला है, तो इनपुट बॉक्स में भी नया बड़ा नंबर सेट कर दें ताकि यूजर देख सके
            if (formattedAccountNo !== accountNo) {
                accInput.value = formattedAccountNo;
                accountNo = formattedAccountNo; // सर्च के लिए अपडेटेड नंबर इस्तेमाल करें
            }

            try {
                // अब डेटाबेस में इस फुल-फॉर्मेटेड नंबर से सर्च होगा
                const { data, error } = await window.supabaseClient
                    .from('banking_customers')
                    .select('customer_name')
                    .eq('account_number', accountNo).single();

                if (error && error.code !== 'PGRST116') throw error;
                
                if (data) {
                    custNameInput.value = data.customer_name;
                } else {
                    // अगर कस्टमर नहीं मिला, तो नए रजिस्ट्रेशन मोडल में भी यही बड़ा नंबर पास होगा
                    ncAccInput.value = accountNo;
                    ncNameInput.value = ""; ncMobileInput.value = ""; ncAddressInput.value = "";
                    ncModal.style.display = 'flex';
                }
            } catch (err) { 
                console.error("Fetch error:", err.message); 
            }
        }

        // इनपुट बॉक्स से फोकस हटते ही (Blur) यह फंक्शन रन होगा
        accInput.addEventListener('blur', searchCustomer);

        // नया कस्टमर सबमिट
        document.getElementById('btn-nc-continue').addEventListener('click', async () => {
            const accNo = ncAccInput.value.trim();
            const cName = ncNameInput.value.trim();
            const cMobile = ncMobileInput.value.trim();
            const cAddress = ncAddressInput.value.trim();

            if (!cName || !cMobile) return window.showSystemAlert("नाम और मोबाइल नंबर अनिवार्य हैं!", "Validation Error", "❌");
            try {
                const { error } = await window.supabaseClient.from('banking_customers')
                    .insert([{ account_number: accNo, customer_name: cName, mobile_number: cMobile, customer_address: cAddress, registered_by_ko: currentUser.ko_code }]);
                if (error) throw error;
                custNameInput.value = cName;
                ncModal.style.display = 'none';
                window.showSystemAlert("नया कस्टमर सफलतापूर्वक पंजीकृत किया गया।", "Registration Success", "✅");
            } catch (err) { 
                window.showSystemAlert("विफल: " + err.message, "Database Error", "❌"); 
            }
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

            if (!accountNo || !custName || amount <= 0) {
                return window.showSystemAlert("सभी फ़ील्ड सही भरें!", "Validation Error", "❌");
            }

            // ट्रांजैक्शन को डेटाबेस में इंसर्ट करने का कोर फंक्शन
            const saveTransactionData = async () => {
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
                    window.showSystemAlert(`सफलतापूर्वक ₹${amount} जमा किए गए।`, "Transaction Successful", "✅");
                    document.getElementById('btn-dep-clear').click();
                } catch (err) { 
                    window.showSystemAlert("त्रुटि: " + err.message, "Database Error", "❌"); 
                }
            };

            // डिनॉमिनेशन कंडीशन्स का कस्टमाइज्ड वेरिफिकेशन
            if (netCash === 0) {
                window.showSystemConfirm("क्या आप बिना कैश डिनॉमिनेशन के आगे बढ़ना चाहते हैं?", "Zero Cash Warning", () => {
                    saveTransactionData();
                });
            } else if (netCash !== amount) {
                return window.showSystemAlert(`डिनॉमिनेशन योग (₹${netCash}) और जमा राशि (₹${amount}) मैच नहीं हैं!`, "Cash Mismatch", "❌");
            } else {
                saveTransactionData();
            }
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
