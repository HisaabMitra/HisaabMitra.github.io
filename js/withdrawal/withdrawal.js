// ========================================================
// 💸 AEPS CASH WITHDRAWAL CONTROLLER ENGINE
// ========================================================

window.initWithdrawalPage = async function (currentUser) {
    console.log("AEPS Withdrawal Engine Initializing...");
    const witAadhaarInput = document.getElementById('wit-aadhaar-no');
    const witNameInput = document.getElementById('wit-cust-name');
    const witAmountInput = document.getElementById('wit-amount');
    const witWordsDisplay = document.getElementById('wit-amount-words');

    try {
        // [1] आज की केवल विथड्रॉल ट्रांजैक्शन्स लेज़र लोड करें
        window.loadTodayWithdrawals = async function() {
            const tbody = document.getElementById('today-wit-body');
            if (!tbody) return;

            const todayStr = new Date().toISOString().split('T')[0];

            try {
                const { data, error } = await window.supabaseClient
                    .from('withdrawal_transactions') // विथड्रॉल के लिए अलग सुरक्षित टेबल
                    .select('*')
                    .eq('ko_code', currentUser.ko_code)
                    .gte('transaction_date', `${todayStr}T00:00:00`)
                    .order('transaction_date', { ascending: false });

                if (error) throw error;

                tbody.innerHTML = '';
                if (!data || data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:15px; color:#777;">आज काउंटर पर कोई निकासी (Withdrawal) नहीं मिली</td></tr>';
                    return;
                }

                // 📊 कतारों को क्रम संख्या (Sr. No.) के साथ रेंडर करें
                data.forEach((tx, index) => {
                    const timeStr = new Date(tx.transaction_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const txStr = btoa(JSON.stringify(tx));
                    const srNo = data.length - index; // क्रोनोलॉजिकल ऑर्डर नंबर

                    tbody.insertAdjacentHTML('beforeend', `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding:12px; font-weight: bold; color: #555; text-align:center;">${srNo}</td>
                            <td style="padding:12px; font-weight: 600; letter-spacing:0.5px;">${tx.aadhaar_number}</td>
                            <td style="padding:12px; text-transform: uppercase;">${tx.customer_name}</td>
                            <td style="padding:12px; font-weight:bold; color:#c5221f;">₹${parseFloat(tx.amount).toFixed(2)}</td>
                            <td style="padding:12px;">${timeStr}</td>
                            <td style="padding:12px; text-align:center;">
                                <div style="display:inline-flex; align-items:center; gap:15px; justify-content:center;">
                                    <span class="btn-edit-wit-tx" data-tx="${txStr}" style="cursor:pointer; font-size:1.1rem; user-select:none;" title="Edit Withdrawal">✏️</span>
                                    <span class="btn-print-wit-receipt" data-tx="${txStr}" style="cursor:pointer; font-size:1.2rem; user-select:none;" title="Print Slip">🖨️</span>
                                </div>
                            </td>
                        </tr>
                    `);
                });

                attachWithdrawalEditListeners();

            } catch (err) {
                console.error("Withdrawal Ledger Load Error:", err);
            }
        };

        // [2] 🔍 आधार नंबर ब्लर होते ही लाइव सर्च इंजन (Strict 12 Digit Validation)
        if (witAadhaarInput) {
            witAadhaarInput.addEventListener('blur', async () => {
                const aadhaarNo = witAadhaarInput.value.trim();
                if (!aadhaarNo) return;

                // Strict 12 Digit Validation Rule
                if (aadhaarNo.length !== 12 || isNaN(aadhaarNo)) {
                    window.showSystemAlert("आधार नंबर पूरे 12 अंकों का होना अनिवार्य है!", "Validation Error", "❌");
                    setTimeout(() => { witAadhaarInput.focus(); }, 50);
                    return;
                }

                if (witNameInput) witNameInput.value = "Searching ledger...";

                try {
                    const { data: customer, error } = await window.supabaseClient
                        .from('banking_customers')
                        .select('*')
                        .eq('aadhaar_number', aadhaarNo)
                        .maybeSingle();

                    if (error) throw error;

                    if (customer) {
                        if (witNameInput) witNameInput.value = customer.customer_name.toUpperCase();
                        if (witAmountInput) witAmountInput.focus(); // ⚡ सीधा फोकस अमाउंट बॉक्स पर लॉक!
                    } else {
                        if (witNameInput) witNameInput.value = "NOT REGISTERED";
                        
                        // नया कस्टमर पॉपअप ट्रिगर करें (आधार नंबर पहले से भरा होगा)
                        const modal = document.getElementById('new-cust-modal');
                        if (modal) {
                            document.getElementById('nc-aadhaar-no').value = aadhaarNo;
                            document.getElementById('nc-account-no').value = "";
                            document.getElementById('nc-name').value = "";
                            document.getElementById('nc-mobile').value = "";
                            document.getElementById('nc-address').value = "";

                            modal.style.setProperty('display', 'flex', 'important');
                            document.getElementById('nc-name').focus();

                            // पॉपअप बटन बाइंडिंग
                            document.getElementById('btn-nc-cancel').onclick = function() {
                                modal.style.display = 'none';
                                if (witNameInput) witNameInput.value = "";
                                witAadhaarInput.value = ""; witAadhaarInput.focus();
                            };

                            document.getElementById('btn-nc-continue').onclick = async function() {
                                const fullName = document.getElementById('nc-name').value.trim().toUpperCase();
                                const mobile = document.getElementById('nc-mobile').value.trim();
                                const address = document.getElementById('nc-address').value.trim().toUpperCase();
                                const accNo = document.getElementById('nc-account-no').value.trim();

                                if (!fullName || !mobile) {
                                    window.showSystemAlert("नाम और मोबाइल नंबर आवश्यक है!", "Validation Error", "❌");
                                    return;
                                }

                                try {
                                    const { error: insErr } = await window.supabaseClient
                                        .from('banking_customers')
                                        .insert([{
                                            aadhaar_number: aadhaarNo,
                                            account_number: accNo || null, // विथड्रॉल में अकाउंट नंबर वैकल्पिक है
                                            customer_name: fullName,
                                            mobile_number: mobile,
                                            customer_address: address
                                        }]);

                                    if (insErr) throw insErr;

                                    modal.style.display = 'none';
                                    window.showSystemAlert("🎉 नया ग्राहक आधार के साथ पंजीकृत हुआ!", "Success", "✅");
                                    if (witNameInput) witNameInput.value = fullName;
                                    if (witAmountInput) witAmountInput.focus();
                                } catch (e) {
                                    window.showSystemAlert("पंजीकरण विफल: " + e.message, "Error", "❌");
                                }
                            };
                        }
                    }
                } catch (err) {
                    console.error("Aadhaar Search Error:", err);
                    if (witNameInput) witNameInput.value = "SEARCH ERROR";
                }
            });
        }

        // [3] लाइव वर्ड कन्वर्टर
        if (witAmountInput) {
            witAmountInput.addEventListener('input', () => {
                const amt = parseInt(witAmountInput.value) || 0;
                if (witWordsDisplay) {
                    witWordsDisplay.innerText = amt === 0 ? "Zero Rupees Only" : `${window.numberToHindiWords(amt)} रुपए मात्र`;
                }
            });
        }

        // [4] एडिट बटन हैंडलर इंजन
        function attachWithdrawalEditListeners() {
            document.querySelectorAll('.btn-edit-wit-tx').forEach(btn => {
                btn.onclick = function() {
                    try {
                        const txData = JSON.parse(atob(this.getAttribute('data-tx')));
                        
                        document.getElementById('wit-aadhaar-no').value = txData.aadhaar_number;
                        document.getElementById('wit-cust-name').value = txData.customer_name;
                        document.getElementById('wit-amount').value = txData.amount;
                        document.getElementById('wit-remarks').value = txData.remarks || "";
                        
                        if (witWordsDisplay) {
                            witWordsDisplay.innerText = `${window.numberToHindiWords(parseInt(txData.amount))} रुपए मात्र`;
                        }

                        // डिनॉमिनेशन सेटिंग्स री-पॉप्युलेट करें
                        const notes = [500, 200, 100, 50, 20, 10, 5];
                        notes.forEach(note => {
                            const inInput = document.querySelector(`.denom-in[data-note="${note}"]`);
                            const outInput = document.querySelector(`.denom-out[data-note="${note}"]`);
                            if (inInput) inInput.value = txData[`denom_in_${note}`] || 0;
                            if (outInput) outInput.value = txData[`denom_out_${note}`] || 0;
                        });

                        if (window.DenominationComponent) window.DenominationComponent.calculate();

                        const saveBtn = document.getElementById('btn-wit-save');
                        if (saveBtn) {
                            saveBtn.innerText = "🔄 Update Withdrawal";
                            saveBtn.style.background = "#d35400";
                            saveBtn.dataset.mode = "edit";
                            saveBtn.dataset.editingWitId = txData.id;
                        }

                        window.showSystemAlert("पुरानी निकासी प्रविष्टि लोड हो गई है!", "Edit Mode", "ℹ️");
                    } catch (e) { console.error("Error loading withdrawal for edit:", e); }
                };
            });
        }

        // [5] क्लियर बटन लॉजिक
        window.masterWithdrawalClear = function() {
            if (witAadhaarInput) witAadhaarInput.value = "";
            if (witNameInput) witNameInput.value = "";
            if (witAmountInput) witAmountInput.value = "";
            if (document.getElementById('wit-remarks')) document.getElementById('wit-remarks').value = "";
            if (witWordsDisplay) witWordsDisplay.innerText = "Zero Rupees Only";
            if (window.DenominationComponent) window.DenominationComponent.clear();

            const saveBtn = document.getElementById('btn-wit-save');
            if (saveBtn) {
                saveBtn.innerText = "💸 Dispense Cash";
                saveBtn.style.background = "#7d0022";
                delete saveBtn.dataset.mode;
                delete saveBtn.dataset.editingWitId;
            }
        };

        const clearBtn = document.getElementById('btn-wit-clear');
        if (clearBtn) clearBtn.onclick = window.masterWithdrawalClear;

        // इंजन शुरू करें
        window.loadTodayWithdrawals();

    } catch (err) { console.error("Withdrawal Initialization Error:", err); }
};
