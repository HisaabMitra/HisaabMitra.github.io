// ========================================================
// 💰 SINGLE CASH DEPOSIT COUNTER LOGIC (SUPERFAST ENGINE)
// ========================================================

window.initDepositPage = async function (currentUser) {
    const workspace = document.getElementById('workspace');
    if (!workspace) return;

    try {
        // [1] काउंटर KO Code स्क्रीन पर सेट करें
        const koCodeLabel = document.getElementById('lbl-ko-code');
        if (koCodeLabel) koCodeLabel.innerText = currentUser.ko_code;

        // [2] डिनॉमिनेशन विजेट रेंडर करें
        if (window.DenominationComponent) {
            setTimeout(() => {
                window.DenominationComponent.render('denomination-widget-container');
            }, 100); 
        }

        // [3] आज की सिंगल ट्रांजैक्शन्स लोड करने का फ़ंक्शन (डुप्लिकेट हेडर प्रोटेक्शन के साथ)
        async function loadTodayTransactions() {
            const tbody = document.getElementById('today-tx-body');
            if (!tbody) return;

            const today = new Date().toISOString().split('T')[0];

            try {
                const { data, error } = await window.supabaseClient
                    .from('deposit_transactions')
                    .select('*')
                    .eq('ko_code', currentUser.ko_code)
                    .is('bulk_id', null) // सिर्फ सिंगल डिपॉजिट
                    .gte('transaction_date', `${today}T00:00:00`)
                    .order('transaction_date', { ascending: false });

                if (error) throw error;

                // 🛑 सुरक्षा गार्ड: अगर टेबल हेडर में पहले से एक्शन कॉलम है, तो दोबारा मत जोड़ो
                const tableElement = tbody.closest('table');
                if (tableElement) {
                    const theadRow = tableElement.querySelector('thead tr');
                    if (theadRow && !theadRow.querySelector('.action-header') && theadRow.children.length < 5) {
                        theadRow.insertAdjacentHTML('beforeend', '<th class="action-header" style="padding:12px; text-align: center;">Action</th>');
                    }
                }

                tbody.innerHTML = '';
                if (!data || data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:15px; color:#777;">आज आपका कोई सिंगल ट्रांजैक्शन नहीं मिला</td></tr>';
                    return;
                }

                data.forEach(tx => {
                    const time = new Date(tx.transaction_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const name = tx.customer_name || "N/A";
                    const txStr = btoa(JSON.stringify(tx)); // Base64 कनवर्ट

                    tbody.insertAdjacentHTML('beforeend', `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding:12px;">${tx.account_number}</td>
                            <td style="padding:12px; text-transform: uppercase;">${name}</td>
                            <td style="padding:12px; font-weight:bold; color:#27ae60;">₹${tx.amount}</td>
                            <td style="padding:12px;">${time}</td>
                            <td style="padding:12px; text-align:center;">
                                <div style="display:inline-flex; align-items:center; gap:15px; justify-content:center;">
                                    <span class="btn-edit-tx" data-tx="${txStr}" style="cursor:pointer; font-size:1.1rem; user-select:none; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" title="Edit Transaction">✏️</span>
                                    <span class="btn-print-receipt" data-tx="${txStr}" style="cursor:pointer; font-size:1.2rem; user-select:none; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" title="Print Thermal Receipt">🖨️</span>
                                </div>
                            </td>
                        </tr>
                    `);
                });

                // इवेंट लिसनर्स री-अटैच करें
                attachEditEventListeners();
                if (typeof attachPrintEventListeners === 'function') attachPrintEventListeners();

            } catch (err) { 
                console.error("Table Load Error:", err); 
            }
        }

        // [4] एडिट बटन पर क्लिक होने का लॉजिक
        function attachEditEventListeners() {
            document.querySelectorAll('.btn-edit-tx').forEach(btn => {
                btn.onclick = function() {
                    try {
                        const txData = JSON.parse(atob(this.getAttribute('data-tx')));
                        
                        document.getElementById('dep-account-no').value = txData.account_number;
                        document.getElementById('dep-cust-name').value = txData.customer_name;
                        document.getElementById('dep-amount').value = txData.amount;
                        document.getElementById('dep-remarks').value = txData.remarks || "";
                        
                        if (wordsDisplay) {
                            wordsDisplay.innerText = `${window.numberToHindiWords(parseInt(txData.amount))} रुपए मात्र`;
                        }

                        // डिनॉमिनेशन लोड करें
                        const notes = [500, 200, 100, 50, 20, 10, 5];
                        notes.forEach(note => {
                            const inInput = document.querySelector(`.denom-in[data-note="${note}"]`);
                            const outInput = document.querySelector(`.denom-out[data-note="${note}"]`);
                            if (inInput) inInput.value = txData[`denom_in_${note}`] || 0;
                            if (outInput) outInput.value = txData[`denom_out_${note}`] || 0;
                        });
                        
                        const coinsIn = document.querySelector('.denom-in[data-note="coins"]');
                        const coinsOut = document.querySelector('.denom-out[data-note="coins"]');
                        if (coinsIn) coinsIn.value = txData[`denom_in_coins`] || 0;
                        if (coinsOut) coinsOut.value = txData[`denom_out_coins`] || 0;

                        if (window.DenominationComponent) window.DenominationComponent.calculate();

                        // 🔄 सेव बटन को एडिट मोड में बदलें
                        const saveBtn = document.getElementById('btn-dep-save');
                        if (saveBtn) {
                            saveBtn.innerText = "🔄 Update Transaction";
                            saveBtn.style.background = "#d35400"; 
                            saveBtn.dataset.mode = "edit";
                            saveBtn.dataset.editingTxId = txData.transaction_id;
                        }

                        window.showSystemAlert("पुरानी सिंगल एंट्री लोड हो गई है!", "Edit Mode Activated", "ℹ️");
                    } catch (err) {
                        console.error("Error loading tx for edit:", err);
                    }
                };
            });
        }

        // ग्लोबल लिसनर्स के लिए लेज़र लोड को बाइंड करें
        window.loadTodayTransactions = loadTodayTransactions;
        loadTodayTransactions();

        // [5] डोम एलिमेंट्स और वॉयस असिस्टेंट
        const accInput = document.getElementById('dep-account-no');
        const custNameInput = document.getElementById('dep-cust-name');
        const amountInput = document.getElementById('dep-amount');
        const wordsDisplay = document.getElementById('dep-amount-words');
        const speakBtn = document.getElementById('btn-speak-hindi');
        const remarksInput = document.getElementById('dep-remarks');

        // लाइव अमाउंट इन वर्ड्स
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

        // PNB स्टाइल फॉर्मेटर
        function formatAccountNumber(inputAcc, solId) {
            let acc = inputAcc.trim();
            if (acc.length > 10 || !acc.includes('-')) return acc;
            const parts = acc.split('-');
            return `${solId}${parts[0].padStart(2, '0')}${parts[1].padStart(8, '0')}`;
        }

        // 🏦 सुपरफास्ट सिंगल कस्टमर सर्च
        async function searchCustomer() {
            let accountNo = accInput.value.trim();
            if (!accountNo) return;
            
            custNameInput.value = "Searching customer ledger...";
            const userSolId = currentUser.sol_id || '193000'; 
            const formattedAccountNo = formatAccountNumber(accountNo, userSolId);
            
            if (formattedAccountNo !== accountNo) { 
                accInput.value = formattedAccountNo; 
                accountNo = formattedAccountNo; 
            }

            try {
                const { data, error } = await window.supabaseClient
                    .from('banking_customers')
                    .select('customer_name')
                    .eq('account_number', accountNo)
                    .maybeSingle();

                if (error) throw error;

                if (data) {
                    custNameInput.value = data.customer_name.toUpperCase();
                    amountInput.focus(); 
                } else {
                    custNameInput.value = "";
                    window.showSystemAlert(`खाता संख्या ${accountNo} सिस्टम में पंजीकृत नहीं है!`, "Account Not Found", "❌");
                    accInput.value = "";
                    accInput.focus();
                }
            } catch (err) { 
                console.error("Search error:", err.message); 
                custNameInput.value = "ERROR FETCHING";
            }
        }
        accInput.addEventListener('blur', searchCustomer);

        // [6] 🧹 मास्टर रीसेट फंक्शन (बटन और डिनॉमिनेशन दोनों को 100% साफ़ करने के लिए)
        function masterFormClear() {
            if (accInput) accInput.value = ""; 
            if (custNameInput) custNameInput.value = ""; 
            if (amountInput) amountInput.value = ""; 
            if (remarksInput) remarksInput.value = "";
            if (wordsDisplay) wordsDisplay.innerText = "Zero Rupees Only";
            
            // 🪙 डिनॉमिनेशन को पूरी तरह खाली करें
            if (window.DenominationComponent && typeof window.DenominationComponent.clear === 'function') {
                window.DenominationComponent.clear();
            }

            // 🔄 बटन को वापस नॉर्मल Save मोड में लाएं
            const saveBtn = document.getElementById('btn-dep-save');
            if (saveBtn) {
                saveBtn.innerText = "💾 Save";
                saveBtn.style.background = "#7d0022"; 
                delete saveBtn.dataset.mode;
                delete saveBtn.dataset.editingTxId;
            }
            console.log("Single Form & Edit mode completely reset.");
        }

        // बटन पर इवेंट बाइंड करें
        document.getElementById('btn-dep-clear').onclick = masterFormClear;

        // ⌨️ कीबोर्ड शॉर्टकट्स (Ctrl+S, Esc) ग्लोबल बाइंडिंग इसी के अंदर
        document.onkeydown = function(e) {
            if ((e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey)) {
                e.preventDefault(); 
                document.getElementById('btn-dep-save')?.click();
            }
            if (e.key === 'Escape' || e.key === 'Esc') {
                masterFormClear();
            }
        };

    } catch (error) { 
        console.error("Counter Page Init Error:", error); 
    }
};
