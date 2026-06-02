// ========================================================
// 💰 SINGLE CASH DEPOSIT COUNTER & IN-PAGE SWITCHER LOGIC
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

        // [3] आज की सिंगल ट्रांजैक्शन्स लोड करने का फ़ंक्शन
        async function loadTodayTransactions() {
            const tbody = document.getElementById('today-tx-body');
            if (!tbody) return;

            const today = new Date().toISOString().split('T')[0];

            try {
                const { data, error } = await window.supabaseClient
                    .from('deposit_transactions')
                    .select('*')
                    .eq('ko_code', currentUser.ko_code)
                    .is('bulk_id', null) 
                    .gte('transaction_date', `${today}T00:00:00`)
                    .order('transaction_date', { ascending: false });

                if (error) throw error;

                // सुरक्षा गार्ड: टेबल हेडर में एक्शन कॉलम फिक्स
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
                    const txStr = btoa(JSON.stringify(tx)); 

                    tbody.insertAdjacentHTML('beforeend', `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding:12px;">${tx.account_number}</td>
                            <td style="padding:12px; text-transform: uppercase;">${name}</td>
                            <td style="padding:12px; font-weight:bold; color:#27ae60;">₹${tx.amount}</td>
                            <td style="padding:12px;">${time}</td>
                            <td style="padding:12px; text-align:center;">
                                <div style="display:inline-flex; align-items:center; gap:15px; justify-content:center;">
                                    <span class="btn-edit-tx" data-tx="${txStr}" style="cursor:pointer; font-size:1.1rem; user-select:none;" title="Edit Transaction">✏️</span>
                                    <span class="btn-print-receipt" data-tx="${txStr}" style="cursor:pointer; font-size:1.2rem; user-select:none;" title="Print Slip">🖨️</span>
                                </div>
                            </td>
                        </tr>
                    `);
                });

                attachEditEventListeners();
                if (typeof attachPrintEventListeners === 'function') attachPrintEventListeners();

            } catch (err) { console.error("Table Load Error:", err); }
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

                        const saveBtn = document.getElementById('btn-dep-save');
                        if (saveBtn) {
                            saveBtn.innerText = "🔄 Update Transaction";
                            saveBtn.style.background = "#d35400"; 
                            saveBtn.dataset.mode = "edit";
                            saveBtn.dataset.editingTxId = txData.transaction_id;
                        }

                        window.showSystemAlert("पुरानी सिंगल एंट्री लोड हो गई है!", "Edit Mode Activated", "ℹ️");
                    } catch (err) { console.error("Error loading tx for edit:", err); }
                };
            });
        }

        window.loadTodayTransactions = loadTodayTransactions;
        loadTodayTransactions();

        // [5] डोम एलिमेंट्स मैपिंग
        const accInput = document.getElementById('dep-account-no');
        const custNameInput = document.getElementById('dep-cust-name');
        const amountInput = document.getElementById('dep-amount');
        const wordsDisplay = document.getElementById('dep-amount-words');
        const speakBtn = document.getElementById('btn-speak-hindi');
        const remarksInput = document.getElementById('dep-remarks');

        if (amountInput) {
            amountInput.addEventListener('input', () => {
                const amt = parseInt(amountInput.value) || 0;
                wordsDisplay.innerText = amt === 0 ? "Zero Rupees Only" : `${window.numberToHindiWords(amt)} रुपए मात्र`;
            });
            amountInput.addEventListener('wheel', e => e.preventDefault());
        }

        if (speakBtn) {
            speakBtn.addEventListener('click', () => {
                const amt = parseInt(amountInput.value) || 0;
                if (amt === 0) return window.showSystemAlert("कृपया पहले सही अमाउंट दर्ज करें!", "Validation Error", "⚠️");
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(`${window.numberToHindiWords(amt)} रुपए जमा के लिए तैयार है`);
                utterance.lang = 'hi-IN';
                window.speechSynthesis.speak(utterance);
            });
        }

        function formatAccountNumber(inputAcc, solId) {
            let acc = inputAcc.trim();
            if (acc.length > 10 || !acc.includes('-')) return acc;
            const parts = acc.split('-');
            return `${solId}${parts[0].padStart(2, '0')}${parts[1].padStart(8, '0')}`;
        }

        // 🏦 [NEW-MODAL INTEGRATION] सुपरफास्ट सिंगल कस्टमर सर्च + नए कस्टमर मॉडल का हुक
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
                    // स्थिति 1: पुराना ग्राहक मिल गया
                    custNameInput.value = data.customer_name.toUpperCase();
                    amountInput.focus(); 
                } else {
                    // 🌟 स्थिति 2: नया ग्राहक मिला! आपके नए सुंदर लेआउट मॉडल को यहाँ ट्रिगर करें
                    custNameInput.value = "NOT REGISTERED";
                    
                    const modal = document.getElementById('new-cust-modal');
                    if (modal) {
                        document.getElementById('nc-account-no').value = accountNo;
                        document.getElementById('nc-name').value = "";
                        document.getElementById('nc-mobile').value = "";
                        document.getElementById('nc-address').value = "";
                        
                        // न्यू मॉडल को लाइव ओपन करें
                        modal.style.setProperty('display', 'flex', 'important');
                        document.getElementById('nc-name').focus();

                        const btnContinue = document.getElementById('btn-nc-continue');
                        const btnCancel = document.getElementById('btn-nc-cancel');

                        btnCancel.onclick = function() {
                            modal.style.display = 'none';
                            custNameInput.value = ""; 
                            accInput.value = ""; 
                            accInput.focus();
                        };

                        btnContinue.onclick = async function() {
                            const fullName = document.getElementById('nc-name').value.trim().toUpperCase();
                            const mobile = document.getElementById('nc-mobile').value.trim();
                            const address = document.getElementById('nc-address').value.trim().toUpperCase();

                            if (!fullName || !mobile) {
                                window.showSystemAlert("नाम और मोबाइल नंबर आवश्यक है!", "Error", "❌");
                                return;
                            }

                            btnContinue.textContent = "Processing...";
                            btnContinue.disabled = true;

                            try {
                                const { error: insertErr } = await window.supabaseClient
                                    .from('banking_customers')
                                    .insert([{
                                        account_number: accountNo, 
                                        customer_name: fullName, 
                                        mobile_number: mobile, 
                                        customer_address: address
                                    }]);

                                if (insertErr) throw insertErr;

                                modal.style.display = 'none';
                                window.showSystemAlert(`🎉 खाता ${accountNo} सफलतापूर्वक पंजीकृत हुआ!`, "Success", "✅");
                                
                                custNameInput.value = fullName;
                                amountInput.focus();
                            } catch (e) { 
                                console.error(e); 
                                window.showSystemAlert("पंजीकरण विफल: " + e.message, "Error", "❌");
                            } finally {
                                btnContinue.textContent = "Register & Continue";
                                btnContinue.disabled = false;
                            }
                        };
                    }
                }
            } catch (err) { 
                console.error("Search error:", err.message); 
                custNameInput.value = "";
            }
        }
        if (accInput) accInput.addEventListener('blur', searchCustomer);

        // [6] 🧹 मास्टर रीसेट फंक्शन
        function masterFormClear() {
            if (accInput) accInput.value = ""; 
            if (custNameInput) custNameInput.value = ""; 
            if (amountInput) amountInput.value = ""; 
            if (remarksInput) remarksInput.value = "";
            if (wordsDisplay) wordsDisplay.innerText = "Zero Rupees Only";
            if (window.DenominationComponent) window.DenominationComponent.clear();

            const saveBtn = document.getElementById('btn-dep-save');
            if (saveBtn) {
                saveBtn.innerText = "💾 Save";
                saveBtn.style.background = "#7d0022"; 
                delete saveBtn.dataset.mode;
                delete saveBtn.dataset.editingTxId;
            }
        }
        const clearBtn = document.getElementById('btn-dep-clear');
        if (clearBtn) clearBtn.onclick = masterFormClear;

      // ========================================================
        // 🔄 [GLOBAL EVENT DELEGATION] स्विचर इंजन (ऑटो-क्लियर के साथ)
        // ========================================================
        document.body.addEventListener('click', function(e) {
            if (e.target && e.target.id === 'btn-switch-deposit-mode') {
                const switchBtn = e.target;
                const currentMode = switchBtn.getAttribute('data-current-mode');
                const singleWrapper = document.getElementById('single-deposit-view-wrapper');
                const bulkWrapper = document.getElementById('bulk-deposit-view-wrapper');
                const titleLabel = document.getElementById('deposit-module-title');

                if (!singleWrapper || !bulkWrapper) return;

                // 🧹 स्विच बटन दबाते ही सबसे पहले सिंगल फॉर्म और डिनॉमिनेशन साफ करें
                if (typeof masterFormClear === 'function') masterFormClear();

                if (currentMode === 'single') {
                    // सिंगल ब्लॉक छुपाएं और बल्क ग्रिड ब्लॉक दिखाएं
                    singleWrapper.classList.add('hidden-block');
                    bulkWrapper.classList.remove('hidden-block');

                    if (titleLabel) titleLabel.innerHTML = "📦 BULK DEPOSIT MANAGEMENT";
                    switchBtn.textContent = "👤 Switch to Single Counter";
                    switchBtn.style.background = "#27ae60"; 
                    switchBtn.setAttribute('data-current-mode', 'bulk');

                    // बल्क का जावास्क्रिप्ट इंजन इनिशियलाइज़ करें
                    if (typeof window.initBulkDepositPage === 'function') {
                        window.initBulkDepositPage(currentUser);
                    }
                } else {
                    // बल्क ब्लॉक छुपाएं और वापस सिंगल काउंटर पर आएं
                    bulkWrapper.classList.add('hidden-block');
                    singleWrapper.classList.remove('hidden-block');

                    if (titleLabel) titleLabel.innerHTML = "SINGLE CASH COUNTER";
                    switchBtn.textContent = "📦 Switch to Bulk Deposit";
                    switchBtn.style.background = "#f2994a"; 
                    switchBtn.setAttribute('data-current-mode', 'single');

                    // 🧹 बल्क से सिंगल में आते ही बल्क के फॉर्म को भी साफ करें
                    const bulkClearBtn = document.getElementById('btn-bulk-dep-clear');
                    if (bulkClearBtn) bulkClearBtn.click();

                    loadTodayTransactions(); // लेज़र सिंक करें
                }
            }
        });

        // कीबोर्ड शॉर्टकट्स
        document.onkeydown = function(e) {
            const switchBtn = document.getElementById('btn-switch-deposit-mode');
            const currentMode = switchBtn ? switchBtn.getAttribute('data-current-mode') : 'single';
            if ((e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey)) {
                e.preventDefault(); 
                if (currentMode === 'single') {
                    document.getElementById('btn-dep-save')?.click();
                } else {
                    document.getElementById('btn-bulk-dep-save')?.click();
                }
            }
            if (e.key === 'Escape' || e.key === 'Esc') {
                if (currentMode === 'single') {
                    masterFormClear();
                } else {
                    document.getElementById('btn-bulk-dep-clear')?.click();
                }
            }
        };

    } catch (error) { console.error(error); }
};
