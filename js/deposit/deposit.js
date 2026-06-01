window.initDepositPage = async function (currentUser) {
    const workspace = document.getElementById('workspace');
    if (!workspace) return;

    try {


        // 1. काउंटर KO Code सेट करें
        const koCodeLabel = document.getElementById('lbl-ko-code');
        if (koCodeLabel) koCodeLabel.innerText = currentUser.ko_code;

        // 2. डिनॉमिनेशन कंपोनेंट
        if (window.DenominationComponent) {
            setTimeout(() => {
                window.DenominationComponent.render('denomination-widget-container');
            }, 100); 
        }

       // --- टेबल रिफ्रेश लॉजिक (Updated with Edit Button) ---
        async function loadTodayTransactions() {
            const tbody = document.getElementById('today-tx-body');
            if (!tbody) return;

            const today = new Date().toISOString().split('T')[0];

            try {
                const { data, error } = await window.supabaseClient
                    .from('deposit_transactions')
                    .select('*') // 👈 यहाँ '*' कर दिया ताकि डिनॉमिनेशन का सारा डेटा भी टेबल रो में आ सके
                    .eq('ko_code', currentUser.ko_code)
                    .gte('transaction_date', `${today}T00:00:00`)
                    .order('transaction_date', { ascending: false });

                if (error) throw error;

                // HTML टेबल का हेडर भी अपडेट करना होगा एक्शन कॉलम के लिए
                const tableElement = tbody.closest('table');
                if (tableElement && !tableElement.querySelector('.action-header')) {
                    const theadRow = tableElement.querySelector('thead tr');
                    if (theadRow) {
                        theadRow.insertAdjacentHTML('beforeend', '<th class="action-header" style="padding:12px; border-bottom: 1px solid #eee; text-align: center;">Action</th>');
                    }
                }

                tbody.innerHTML = '';
                if (!data || data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">आज आपका कोई ट्रांजैक्शन नहीं मिला</td></tr>';
                    return;
                }

                data.forEach(tx => {
                    const time = new Date(tx.transaction_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const name = tx.customer_name || "N/A";
                    
                    // हर ट्रांजैक्शन का पूरा डेटा हम JSON स्ट्रिंग बनाकर बटन के एट्रिब्यूट में छुपा देंगे
                    const txStr = btoa(JSON.stringify(tx)); // सुरक्षित रखने के लिए base64 में बदला

                    tbody.insertAdjacentHTML('beforeend', `
                        <tr>
                            <td style="padding:12px; border-bottom:1px solid #eee;">${tx.account_number}</td>
                            <td style="padding:12px; border-bottom:1px solid #eee; text-transform: uppercase;">${name}</td>
                            <td style="padding:12px; border-bottom:1px solid #eee; font-weight:bold; color:#27ae60;">₹${tx.amount}</td>
                            <td style="padding:12px; border-bottom:1px solid #eee;">${time}</td>
                            // ... पुराने टेबल रो के अंदर Action वाले <td> को इससे बदलें:
<td style="padding:12px; border-bottom:1px solid #eee; text-align:center; display:flex; justify-content:center; align-items:center; gap:15px;">
    <span class="btn-edit-tx" data-tx="${txStr}" style="cursor:pointer; font-size:1.1rem; user-select:none; title='Edit Transaction';" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" style="transition: transform 0.2s;">
        ✏️
    </span>

    <span class="btn-print-receipt" data-tx="${txStr}" style="cursor:pointer; font-size:1.2rem; user-select:none; title='Print Thermal Receipt';" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" style="transition: transform 0.2s;">
        🖨️
    </span>
</td>
                        </tr>
                    `);
                });

                // एडिट बटन पर क्लिक इवेंट अटैच करना
                attachEditEventListeners();

            } catch (err) { 
                console.error("Table Load Error:", err); 
            }
        }



        // एडिट बटन क्लिक होने पर पुराना डेटा ऊपर फॉर्म में भरने का फंक्शन
        function attachEditEventListeners() {
            document.querySelectorAll('.btn-edit-tx').forEach(btn => {
                btn.onclick = function() {
                    try {
                        // बटन से ट्रांजैक्शन का डेटा वापस ऑब्जेक्ट में बदलें
                        const txData = JSON.parse(atob(this.getAttribute('data-tx')));
                        
                        // 1. ऊपर के इनपुट बॉक्स में पुरानी वैल्यूज भरें
                        document.getElementById('dep-account-no').value = txData.account_number;
                        document.getElementById('dep-cust-name').value = txData.customer_name;
                        document.getElementById('dep-amount').value = txData.amount;
                        document.getElementById('dep-remarks').value = txData.remarks || "";
                        
                        // अमाउंट इन वर्ड्स को अपडेट करें
                        const wordsDisplay = document.getElementById('dep-amount-words');
                        if (wordsDisplay) {
                            wordsDisplay.innerText = `${window.numberToHindiWords(parseInt(txData.amount))} रुपए मात्र`;
                        }

                        // 2. डिनॉ敏नेशन टेबल के अंदर पुराने नोटों की वैल्यूज लोड करें
                        const notes = [500, 200, 100, 50, 20, 10, 5];
                        notes.forEach(note => {
                            const inInput = document.querySelector(`.denom-in[data-note="${note}"]`);
                            const outInput = document.querySelector(`.denom-out[data-note="${note}"]`);
                            if (inInput) inInput.value = txData[`denom_in_${note}`] || 0;
                            if (outInput) outInput.value = txData[`denom_out_${note}`] || 0;
                        });
                        
                        // कॉइन्स भी लोड करें
                        const coinsIn = document.querySelector('.denom-in[data-note="coins"]');
                        const coinsOut = document.querySelector('.denom-out[data-note="coins"]');
                        if (coinsIn) coinsIn.value = txData[`denom_in_coins`] || 0;
                        if (coinsOut) coinsOut.value = txData[`denom_out_coins`] || 0;

                        // डिनॉमिनेशन का टोटल दोबारा कैलकुलेट करें
                        if (window.DenominationComponent) {
                            window.DenominationComponent.calculate();
                        }

                        // 3. 🌟 सबसे महत्वपूर्ण: सेव बटन को एडिट मोड में बदलें
                        const saveBtn = document.getElementById('btn-dep-save');
                        if (saveBtn) {
                            saveBtn.innerText = "🔄 Update Transaction";
                            saveBtn.style.background = "#d35400"; // संतरी रंग ताकि ऑपरेटर को पता रहे कि एडिट हो रहा है
                            saveBtn.dataset.mode = "edit";
                            saveBtn.dataset.editingTxId = txData.transaction_id; // पुरानी ट्रांजैक्शन आईडी सेव करली
                        }

                        window.showSystemAlert("पुरानी एंट्री लोड हो गई है! अब आप बदलाव करके अपडेट कर सकते हैं।", "Edit Mode Activated", "ℹ️");

                    } catch (err) {
                        console.error("Error loading tx for edit:", err);
                    }
                };
            });
        }


        

        // इसे ग्लोबल ताकि deposit-save.js इसे कॉल कर सके
        window.loadTodayTransactions = loadTodayTransactions;
        loadTodayTransactions();

        // 3. DOM एलिमेंट्स
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

        // नाम और पता Uppercase में बदलें
        [ncNameInput, ncAddressInput].forEach(el => {
            if(el) el.addEventListener('input', function() { this.value = this.value.toUpperCase(); });
        });

        // अमाउंट इन वर्ड्स
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

        // नया कस्टमर रजिस्ट्रेशन
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

        // --- 🧹 Clear और रीसेट बटन लॉजिक (Updated with Edit Mode Reset) ---
        document.getElementById('btn-dep-clear').addEventListener('click', () => {
            // 1. सारे मुख्य इनपुट फील्ड्स को खाली करें
            if (accInput) accInput.value = ""; 
            if (custNameInput) custNameInput.value = ""; 
            if (amountInput) amountInput.value = ""; 
            if (remarksInput) remarksInput.value = "";
            
            // 2. अमाउंट इन वर्ड्स को रीसेट करें
            if (wordsDisplay) wordsDisplay.innerText = "Zero Rupees Only";
            
            // 3. डिनॉमिनेशन कॉम्पोनेन्ट (नोट और कॉइन्स) को 0 करें
            if (window.DenominationComponent && typeof window.DenominationComponent.clear === 'function') {
                window.DenominationComponent.clear();
            }

            // 4. प्रिंट बटन को वापस डिसेबल (बंद) करें
            const printBtn = document.getElementById('btn-dep-print');
            if (printBtn) printBtn.disabled = true;

            // 5. 🌟 अगर एडिट मोड एक्टिव था, तो सेव बटन को वापस नॉर्मल (💾 Save) करें
            const saveBtn = document.getElementById('btn-dep-save');
            if (saveBtn) {
                saveBtn.innerText = "💾 Save";
                saveBtn.style.background = "#7d0022"; // वापस पुराना मैरून थीम कलर
                saveBtn.style.boxShadow = "0 2px 6px rgba(125,0,34,0.2)";
                
                // डेटासेट से एडिट मोड के फ्लैग्स डिलीट करें
                delete saveBtn.dataset.mode;
                delete saveBtn.dataset.editingTxId;
            }
            
            console.log("Workspace & Edit Mode completely reset.");
        });

    } catch (error) { console.error("Error:", error); }
};
