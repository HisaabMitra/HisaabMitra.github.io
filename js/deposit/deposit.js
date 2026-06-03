// ========================================================
// 💰 SINGLE CASH DEPOSIT COUNTER & ADVANCED SCHEDULER ENGINE
// ========================================================

window.initDepositPage = async function (currentUser) {
    const workspace = document.getElementById('workspace');
    if (!workspace) return;

    try {
        const koCodeLabel = document.getElementById('lbl-ko-code');
        if (koCodeLabel) koCodeLabel.innerText = currentUser.ko_code;

        // [1] मास्टर शेयर्ड कंटेनर में डिनॉमिनेशन कॉम्पोनेन्ट रेंडर करें
        if (window.DenominationComponent) {
            setTimeout(() => {
                window.DenominationComponent.clear();
                window.DenominationComponent.render('master-shared-denomination-container');
                
                const masterContainer = document.getElementById('master-shared-denomination-container');
                if (masterContainer) {
                    masterContainer.querySelectorAll('.denom-in, .denom-out').forEach(input => {
                        input.addEventListener('input', () => {
                            if (typeof window.DenominationComponent.calculate === 'function') {
                                window.DenominationComponent.calculate();
                            }
                        });
                    });
                }
            }, 100); 
        }

        // ========================================================
        // 🔔 [MODULE A]: SCHEDULED DEPOSITS NOTIFICATION & MORNING BOARD LOGIC
        // ========================================================
        
        let globalTodayPendingRecords = []; // आज रिलीज होने वाले रिकॉर्ड्स की लोकल कॉपी

        async function checkAndSyncScheduledDeposits() {
            console.log("Scanning Scheduled Deposits Ledger...");
            const todayStr = new Date().toISOString().split('T')[0];

            try {
                // १. डेटाबेस से PENDING स्टेटस वाले सभी शेड्यूल डिपॉजिट्स निकालें
                const { data, error } = await window.supabaseClient
                    .from('scheduled_deposits')
                    .select('*')
                    .eq('ko_code', currentUser.ko_code)
                    .eq('status', 'PENDING');

                if (error) throw error;

                // २. आज की तारीख और भविष्य की तारीखों में डेटा को वर्गीकृत (Classify) करें
                globalTodayPendingRecords = data.filter(r => r.scheduled_date <= todayStr);
                const futurePendingRecords = data.filter(r => r.scheduled_date > todayStr);

                // ३. टॉप बैनर घंटी (Bell Badge) को लाइव अपडेट करें
                const bellBadge = document.getElementById('badge-pending-count');
                if (bellBadge) {
                    if (globalTodayPendingRecords.length > 0) {
                        bellBadge.innerText = globalTodayPendingRecords.length;
                        bellBadge.style.display = 'block';
                    } else {
                        bellBadge.style.display = 'none';
                    }
                }

                // ४. मॉर्निंग क्लियरेंस बोर्ड की दोनों तालिकाओं (Tables) को पॉप्युलेट करें
                renderMorningClearanceBoard(globalTodayPendingRecords, futurePendingRecords);

                // ५. ऑटो-ट्रिगर: यदि सुबह-सुबह काउंटर खुला है और आज की तारीख के रिकॉर्ड्स पेंडिंग हैं, तो पॉपअप फ्लैश करें
                if (globalTodayPendingRecords.length > 0) {
                    const morningModal = document.getElementById('morning-release-modal');
                    if (morningModal && morningModal.style.display !== 'flex') {
                        morningModal.style.setProperty('display', 'flex', 'important');
                    }
                }

            } catch (err) {
                console.error("Scheduled Sync Core Error:", err);
            }
        }

        // मॉर्निंग क्लियरेंस बोर्ड में डेटा रेंडर करने का फ़ंक्शन
        function renderMorningClearanceBoard(todayRecords, futureRecords) {
            document.getElementById('lbl-cnt-today').innerText = todayRecords.length;
            document.getElementById('lbl-cnt-future').innerText = futureRecords.length;

            // TAB 1: Available Today
            const todayTbody = document.getElementById('tbl-morning-today-tbody');
            if (todayTbody) {
                todayTbody.innerHTML = '';
                if (todayRecords.length === 0) {
                    todayTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px; color:#888;">आज की तारीख में कोई लंबित शेड्यूलिंग रिलीज नहीं है।</td></tr>';
                } else {
                    todayRecords.forEach(r => {
                        todayTbody.insertAdjacentHTML('beforeend', `
                            <tr style="border-bottom: 1px solid #f1f1f1;">
                                <td style="padding:10px; text-align:center;"><input type="checkbox" class="chk-morning-release-item" data-id="${r.id}" style="cursor:pointer;"></td>
                                <td style="padding:10px; font-weight:600;">${r.account_number}</td>
                                <td style="padding:10px; text-transform:uppercase;">${r.customer_name}</td>
                                <td style="padding:10px; text-align:right; font-weight:bold; color:#7d0022;">₹${parseFloat(r.amount).toFixed(2)}</td>
                            </tr>
                        `);
                    });
                }
            }

            // TAB 2: Future Blocked
            const futureTbody = document.getElementById('tbl-morning-future-tbody');
            if (futureTbody) {
                futureTbody.innerHTML = '';
                if (futureRecords.length === 0) {
                    futureTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px; color:#888;">भविष्य की कतार में कोई रिकॉर्ड लॉक नहीं है।</td></tr>';
                } else {
                    futureRecords.forEach(r => {
                        // ब्रिटिश फॉर्मेट डेट को रीडेबल बनाएं
                        const dateParts = r.scheduled_date.split('-');
                        const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

                        futureTbody.insertAdjacentHTML('beforeend', `
                            <tr style="border-bottom: 1px solid #f1f1f1; background:#fdfdfd;">
                                <td style="padding:10px; font-weight:bold; color:#e67e22;">${formattedDate}</td>
                                <td style="padding:10px;">${r.account_number}</td>
                                <td style="padding:10px; text-transform:uppercase;">${r.customer_name}</td>
                                <td style="padding:10px; text-align:right; font-weight:600; color:#444;">₹${parseFloat(r.amount).toFixed(2)}</td>
                            </tr>
                        `);
                    });
                }
            }
        }

        // 🔔 टॉप घंटी आइकॉन पर मैनुअल क्लिक इवेंट बाइंडिंग
        const triggerBellBtn = document.getElementById('btn-trigger-pending-modal');
        if (triggerBellBtn) {
            triggerBellBtn.onclick = function () {
                const morningModal = document.getElementById('morning-release-modal');
                if (morningModal) morningModal.style.setProperty('display', 'flex', 'important');
            };
        }

        // 📜 मॉर्निंग बोर्ड के नेविगेशन टैब्स टॉगल इंजन लॉजिक
        const tabBtnToday = document.getElementById('tab-btn-today');
        const tabBtnFuture = document.getElementById('tab-btn-future');
        const tabContentToday = document.getElementById('tab-content-today');
        const tabContentFuture = document.getElementById('tab-content-future');

        if (tabBtnToday && tabBtnFuture) {
            tabBtnToday.onclick = function () {
                tabBtnToday.classList.add('active'); tabBtnFuture.classList.remove('active');
                tabContentToday.style.display = 'block'; tabContentFuture.style.display = 'none';
            };
            tabBtnFuture.onclick = function () {
                tabBtnFuture.classList.add('active'); tabBtnToday.classList.remove('active');
                tabContentFuture.style.display = 'block'; tabContentToday.style.display = 'none';
            };
        }

        // Master Checkbox 'Check All' Control
        const masterChkBox = document.getElementById('chk-release-all-master');
        if (masterChkBox) {
            masterChkBox.onchange = function () {
                document.querySelectorAll('.chk-morning-release-item').forEach(chk => {
                    chk.checked = masterChkBox.checked;
                });
            };
        }


        // ========================================================
        // 🚀 [UPGRADED MODULE B]: LIVE MULTI-DAY AUTO-BALANCING SPLIT ENGINE
        // ========================================================
        
        let activeSplitPayload = null; 

        // यह फंक्शन चुने गए दिनों के आधार पर पॉपअप में लाइव तारीखें और इनपुट बॉक्स बिछाएगा
        function calculateAndRenderSplitRows() {
            const totalAmount = parseFloat(document.getElementById('dep-amount').value) || 0;
            const daysToSpread = parseInt(document.getElementById('ddl-split-days').value) || 2;
            const container = document.getElementById('split-rows-container');

            if (!container) return;
            container.innerHTML = '';

            // प्रतिदिन का डिफ़ॉल्ट औसत हिस्सा निकालें
            let baseShare = Math.floor(totalAmount / daysToSpread);
            let shareAmounts = Array(daysToSpread).fill(baseShare);
            
            // अगर डिवाइड करने के बाद कुछ पैसे बच जाते हैं, तो उन्हें पहले दिन (आज) में जोड़ दें
            let remainder = totalAmount - (baseShare * daysToSpread);
            shareAmounts[0] += remainder;

            // यदि पहले दिन का हिस्सा 25,000 की सीमा लांघ रहा है, तो उसे 25,000 पर लॉक करें और बाकी आगे शिफ्ट करें
            if (shareAmounts[0] > 25000) {
                let overflow = shareAmounts[0] - 25000;
                shareAmounts[0] = 25000;
                
                // बचे हुए दिनों में ओवरफ्लो बराबर बांट दें
                let extraPerDay = Math.floor(overflow / (daysToSpread - 1));
                let extraRemainder = overflow - (extraPerDay * (daysToSpread - 1));

                for (let i = 1; i < daysToSpread; i++) {
                    shareAmounts[i] += extraPerDay;
                }
                shareAmounts[1] += extraRemainder; 
            }

            let currentDate = new Date();

            for (let i = 0; i < daysToSpread; i++) {
                if (i > 0) currentDate.setDate(currentDate.getDate() + 1); 
                const dateStr = currentDate.toISOString().split('T')[0];
                const displayDate = dateStr.split('-').reverse().join('-'); 

                container.insertAdjacentHTML('beforeend', `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; background:#fafafa; padding:6px 12px; border-radius:6px; border:1px solid #f1f1f1;">
                        <span style="font-weight:600; color:#555;">${i === 0 ? "🌟 Today (आज)" : `📅 Day ${i+1} (${displayDate})`}</span>
                        <input type="number" class="sch-row-input" data-date="${dateStr}" data-index="${i}" value="${shareAmounts[i]}" min="0" max="25000">
                    </div>
                `);
            }

            // 🌟 [स्मार्ट रिपल]: इनपुट बॉक्स में बदलाव होते ही ऑटो-बैलेंसिंग मैकेनिज्म ट्रिगर करें
            container.querySelectorAll('.sch-row-input').forEach(input => {
                input.addEventListener('input', (e) => {
                    handleRowAmountRipple(e.target);
                });
            });

            trackLiveSplitBalance(); 
        }

        // 🌟 [AUTO-BALANCING RIPPLE LOGIC]: यह फंक्शन बदला हुआ पैसा अगली रो में ऑटो-ट्रांसफर करेगा!
        function handleRowAmountRipple(changedInput) {
            const totalAmount = parseFloat(document.getElementById('dep-amount').value) || 0;
            const changedIndex = parseInt(changedInput.getAttribute('data-index'));
            let changedValue = parseFloat(changedInput.value) || 0;

            // 🛑 RBI सुरक्षा गार्ड: किसी भी बॉक्स में ₹25,000 से ऊपर टाइप न होने दें
            if (changedValue > 25000) {
                changedInput.value = 25000;
                changedValue = 25000;
            }

            const allInputs = Array.from(document.querySelectorAll('.sch-row-input'));
            
            // १. जिस रो को बदला गया है, उससे पहले की सभी रोज़ का टोटल सम निकालें
            let sumBefore = 0;
            for (let i = 0; i < changedIndex; i++) {
                sumBefore += parseFloat(allInputs[i].value) || 0;
            }

            // २. अब कुल अमाउंट में से (पहले की रोज़ + वर्तमान बदली हुई रो) को घटाकर नया बचा हुआ बैलेंस निकालें
            let remainingBalance = totalAmount - (sumBefore + changedValue);

            // ३. यह बचा हुआ बैलेंस आगे आने वाले (Next Days) के इनपुट बॉक्सेस में स्वतः री-डिस्ट्रीब्यूट कर दें
            const remainingDays = allInputs.length - (changedIndex + 1);

            if (remainingDays > 0) {
                let targetShare = Math.floor(remainingBalance / remainingDays);
                if (targetShare < 0) targetShare = 0;

                for (let i = changedIndex + 1; i < allInputs.length; i++) {
                    allInputs[i].value = targetShare;
                }

                // बची हुई फुटकर राशि अंतिम कतार में एडजस्ट कर दें
                let finalSum = 0;
                allInputs.forEach((input, idx) => {
                    if (idx < allInputs.length - 1) finalSum += parseFloat(input.value) || 0;
                });
                
                let finalRemainder = totalAmount - finalSum;
                if (finalRemainder >= 0 && finalRemainder <= 25000) {
                    allInputs[allInputs.length - 1].value = finalRemainder;
                } else if (finalRemainder > 25000) {
                    allInputs[allInputs.length - 1].value = 25000;
                } else {
                    allInputs[allInputs.length - 1].value = 0;
                }
            }

            trackLiveSplitBalance();
        }

        // लाइव पेंडिंग बैलेंस मैचिंग इंडिकेटर इंजन
        function trackLiveSplitBalance() {
            const totalAmount = parseFloat(document.getElementById('dep-amount').value) || 0;
            let currentSum = 0;

            document.querySelectorAll('.sch-row-input').forEach(input => {
                currentSum += parseFloat(input.value) || 0;
            });

            const diff = totalAmount - currentSum;
            const pendingLabel = document.getElementById('lbl-split-pending-rem');

            if (Math.abs(diff) < 0.01) {
                pendingLabel.innerText = "₹0.00 (Perfect Match) ✅";
                pendingLabel.style.color = "#27ae60";
            } else if (diff > 0) {
                pendingLabel.innerText = `₹${diff.toFixed(2)} Under Short ⚠️`;
                pendingLabel.style.color = "#e67e22";
            } else {
                pendingLabel.innerText = `₹${Math.abs(diff).toFixed(2)} Exceeded ❌`;
                pendingLabel.style.color = "#c5221f";
            }
        }

        // ड्रॉपडाउन दिनों की संख्या बदलने पर री-रेंडर
        const ddlDays = document.getElementById('ddl-split-days');
        if (ddlDays) {
            ddlDays.onchange = calculateAndRenderSplitRows;
        }

        // पॉपअप कैंसिल बटन
        const btnSplitCancel = document.getElementById('btn-split-cancel');
        if (btnSplitCancel) {
            btnSplitCancel.onclick = function () {
                document.getElementById('smart-split-modal').style.display = 'none';
                activeSplitPayload = null;
            };
        }

        // ========================================================
        // 📈 [MASTER INTEGRATION]: LIVE LEDGER LOAD FROM CORE DB
        // ========================================================
        
        async function loadTodayTransactions() {
            const tbody = document.getElementById('today-tx-body');
            if (!tbody) return;

            const today = new Date().toISOString().split('T')[0];

            try {
                const { data, error } = await window.supabaseClient
                    .from('deposit_transactions')
                    .select('*')
                    .eq('ko_code', currentUser.ko_code)
                    .gte('transaction_date', `${today}T00:00:00`)
                    .order('transaction_date', { ascending: false });

                if (error) throw error;

                tbody.innerHTML = '';
                if (!data || data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:15px; color:#777;">आज काउंटर पर कोई ट्रांजैक्शन नहीं मिला</td></tr>';
                    return;
                }

                data.forEach(tx => {
                    const time = new Date(tx.transaction_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const identifier = tx.bulk_id ? `📦 ${tx.bulk_id}` : tx.account_number;
                    const displayName = tx.bulk_id ? `Depositor: ${tx.depositor_name || 'N/A'}` : tx.customer_name;
                    const txTypeHint = tx.bulk_id ? `<br><small style="color:#777;">To: ${tx.customer_name}</small>` : '';
                    const txStr = btoa(JSON.stringify(tx)); 

                    tbody.insertAdjacentHTML('beforeend', `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding:12px; font-weight: 500;">${identifier}</td>
                            <td style="padding:12px; text-transform: uppercase;">${displayName}${txTypeHint}</td>
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

        function attachEditEventListeners() {
            document.querySelectorAll('.btn-edit-tx').forEach(btn => {
                btn.onclick = function() {
                    try {
                        const txData = JSON.parse(atob(this.getAttribute('data-tx')));
                        
                        if (txData.bulk_id) {
                            const switchBtn = document.getElementById('btn-switch-deposit-mode');
                            if (switchBtn && switchBtn.getAttribute('data-current-mode') === 'single') {
                                switchBtn.click();
                            }
                            if (typeof window.loadBulkBatchForEdit === 'function') {
                                window.loadBulkBatchForEdit(txData);
                            }
                            return;
                        }

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

        // [🔍 CORE SEARCH CONTROLS]: सिंगल अकाउंट ऑटो-सर्च इंजन
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
                    custNameInput.value = "NOT REGISTERED";
                    
                    const modal = document.getElementById('new-cust-modal');
                    if (modal) {
                        document.getElementById('nc-account-no').value = accountNo;
                        document.getElementById('nc-name').value = "";
                        document.getElementById('nc-mobile').value = "";
                        document.getElementById('nc-address').value = "";
                        
                        modal.style.setProperty('display', 'flex', 'important');
                        document.getElementById('nc-name').focus();

                        const btnContinue = document.getElementById('btn-nc-continue');
                        const btnCancel = document.getElementById('btn-nc-cancel');

                        btnCancel.onclick = function() {
                            modal.style.display = 'none';
                            custNameInput.value = ""; accInput.value = ""; accInput.focus();
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
                                        account_number: accountNo, customer_name: fullName, mobile_number: mobile, customer_address: address
                                    }]);

                                if (insertErr) throw insertErr;

                                modal.style.display = 'none';
                                window.showSystemAlert(`🎉 खाता ${accountNo} सफलतापूर्वक पंजीकृत हुआ!`, "Success", "✅");
                                custNameInput.value = fullName;
                                amountInput.focus();
                            } catch (e) { 
                                window.showSystemAlert("पंजीकरण विफल: " + e.message, "Error", "❌");
                            } finally {
                                btnContinue.textContent = "Register & Continue";
                                btnContinue.disabled = false;
                            }
                        };
                    }
                }
            } catch (err) { custNameInput.value = ""; }
        }
        if (accInput) accInput.addEventListener('blur', searchCustomer);

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

                masterFormClear();

                if (currentMode === 'single') {
                    singleWrapper.classList.add('hidden-block');
                    bulkWrapper.classList.remove('hidden-block');

                    if (titleLabel) titleLabel.innerHTML = "📦 BULK DEPOSIT MANAGEMENT";
                    switchBtn.textContent = "👤 Switch to Single Counter";
                    switchBtn.style.background = "#27ae60"; 
                    switchBtn.setAttribute('data-current-mode', 'bulk');

                    if (typeof window.initBulkDepositPage === 'function') {
                        window.initBulkDepositPage(currentUser);
                    }
                } else {
                    bulkWrapper.classList.add('hidden-block');
                    singleWrapper.classList.remove('hidden-block');

                    if (titleLabel) titleLabel.innerHTML = "SINGLE CASH COUNTER";
                    switchBtn.textContent = "📦 Switch to Bulk Deposit";
                    switchBtn.style.background = "#f2994a"; 
                    switchBtn.setAttribute('data-current-mode', 'single');

                    const bulkClearBtn = document.getElementById('btn-bulk-dep-clear');
                    if (bulkClearBtn) bulkClearBtn.click();

                    loadTodayTransactions(); 
                }
            }
        });

        // 🔗 बाहरी इंटरफ़ेस के लिए इसे window पर बाइंड करें (ताकि सेव इंजन इस विंडो को कॉल कर सके)
        window.triggerSmartSplitModal = function(payload) {
            activeSplitPayload = payload;
            document.getElementById('lbl-split-total-deposit').innerText = `₹${payload.amount.toLocaleString('en-IN')}`;
            document.getElementById('ddl-split-days').value = "2"; 
            
            document.getElementById('smart-split-modal').style.setProperty('display', 'flex', 'important');
            calculateAndRenderSplitRows(); 
        };

        // 🟢 [CORE ACTION]: 'Confirm & Lock Split' बटन सबमिशन लॉजिक
        const btnSplitConfirm = document.getElementById('btn-split-confirm');
        if (btnSplitConfirm) {
            btnSplitConfirm.onclick = async function() {
                const totalAmount = parseFloat(document.getElementById('dep-amount').value) || 0;
                let currentSum = 0;
                let splitSchedules = [];

                document.querySelectorAll('.sch-row-input').forEach(input => {
                    const amt = parseFloat(input.value) || 0;
                    const sDate = input.getAttribute('data-date');
                    currentSum += amt;
                    splitSchedules.push({ date: sDate, amount: amt });
                });

                if (Math.abs(totalAmount - currentSum) > 0.01) {
                    window.showSystemAlert("विभाजित राशियों का योग कुल जमा राशि से मेल खाना अनिवार्य है!", "Balance Mismatch", "❌");
                    return;
                }

                btnSplitConfirm.textContent = "Locking Threads...";
                btnSplitConfirm.disabled = true;

                try {
                    // १. आज (Day 1) के हिस्से को मुख्य लेज़र में पास करें
                    const event = new CustomEvent('execute-split-today-save', {
                        detail: {
                            basePayload: activeSplitPayload,
                            todayAmount: splitSchedules[0].amount
                        }
                    });
                    window.dispatchEvent(event);

                    // २. बचे हुए भविष्य के दिनों (Day 2, 3, 4..) को scheduled_deposits टेबल में डंप करें
                    let futureInsertPayload = [];
                    for(let i = 1; i < splitSchedules.length; i++) {
                        futureInsertPayload.push({
                            account_number: activeSplitPayload.account_number,
                            customer_name: activeSplitPayload.customer_name,
                            amount: splitSchedules[i].amount,
                            scheduled_date: splitSchedules[i].date,
                            ko_code: currentUser.ko_code,
                            status: 'PENDING'
                        });
                    }

                    if (futureInsertPayload.length > 0) {
                        const { error: schedErr } = await window.supabaseClient
                            .from('scheduled_deposits')
                            .insert(futureInsertPayload);
                        if (schedErr) throw schedErr;
                    }

                    document.getElementById('smart-split-modal').style.display = 'none';
                    masterFormClear();
                    
                    await checkAndSyncScheduledDeposits();
                    if (typeof loadTodayTransactions === 'function') loadTodayTransactions();

                } catch (err) {
                    console.error("Split Execution Fail:", err);
                    window.showSystemAlert("स्प्लिटिंग थ्रेड लॉकिंग विफल: " + err.message, "System Error", "❌");
                } finally {
                    btnSplitConfirm.textContent = "Confirm & Lock Split";
                    btnSplitConfirm.disabled = false;
                }
            };
        }

        // 🚀 [MORNING RELEASE]: चुने गए लंबित खातों को रिलीज करना
        const btnProcessMorning = document.getElementById('btn-process-morning-releases');
        if (btnProcessMorning) {
            btnProcessMorning.onclick = async function() {
                let selectedIds = [];
                document.querySelectorAll('.chk-morning-release-item:checked').forEach(chk => {
                    selectedIds.push(parseInt(chk.getAttribute('data-id')));
                });

                if (selectedIds.length === 0) {
                    window.showSystemAlert("कृपया रिलीज करने के लिए कम से कम एक खाता चुनें!", "Validation Error", "⚠️");
                    return;
                }

                btnProcessMorning.textContent = "Releasing Funds...";
                btnProcessMorning.disabled = true;

                try {
                    const recordsToRelease = globalTodayPendingRecords.filter(r => selectedIds.includes(r.id));
                    let settlementDebitTotal = 0;
                    let mainTxPayload = [];

                    recordsToRelease.forEach(r => {
                        settlementDebitTotal += parseFloat(r.amount);
                        let comm = Math.min(r.amount * 0.004, 50);
                        
                        mainTxPayload.push({
                            account_number: r.account_number,
                            customer_name: r.customer_name,
                            amount: r.amount,
                            ko_code: currentUser.ko_code,
                            remarks: `RELEASED FROM SCHEDULED ID #${r.id}`,
                            commission: comm
                        });
                    });

                    const { error: insertErr } = await window.supabaseClient
                        .from('deposit_transactions')
                        .insert(mainTxPayload);
                    if (insertErr) throw insertErr;

                    const todayTimeStr = new Date().toISOString();
                    const { error: updateSchedErr } = await window.supabaseClient
                        .from('scheduled_deposits')
                        .update({ status: 'RELEASED', released_at: todayTimeStr })
                        .in('id', selectedIds);
                    if (updateSchedErr) throw updateSchedErr;

                    const nextSettlementBal = (parseFloat(window.currentUser.settlement_balance) || 0) - settlementDebitTotal;
                    
                    const { error: userUpdateErr } = await window.supabaseClient
                        .from('user_roles')
                        .update({ settlement_balance: nextSettlementBal })
                        .eq('id', window.currentUser.id);
                    if (userUpdateErr) throw userUpdateErr;

                    window.currentUser.settlement_balance = nextSettlementBal;

                    window.showSystemAlert(`🎉 ${selectedIds.length} लंबित खाते सफलतापूर्वक आज की मुख्य लेज़र में क्रेडिट कर दिए गए हैं!`, "Releases Successful", "✅");
                    
                    document.getElementById('morning-release-modal').style.display = 'none';
                    await checkAndSyncScheduledDeposits();
                    loadTodayTransactions();

                } catch (err) {
                    console.error("Morning Release Error:", err);
                    window.showSystemAlert("रिलीज विफलता: " + err.message, "System Error", "❌");
                } finally {
                    btnProcessMorning.textContent = "Process Selected Entries";
                    btnProcessMorning.disabled = false;
                }
            };
        }

        // 💥 [ENGINE IGNITION]: काउंटर शुरू होते ही शेड्यूलिंग डेटाबेस सिंक फायर करें
        await checkAndSyncScheduledDeposits();

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
