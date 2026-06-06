// ========================================================
// 💸 DIRECT CUSTOMER-TO-CUSTOMER FUND TRANSFER ENGINE (STREAMLINED CORE)
// ========================================================

window.initFundTransferPage = async function(currentUser) {
    console.log("⚡ Jarvis Fund Transfer Engine Initializing...");

    // UI Input Elements Hooking
    const fromAadhaarInput = document.getElementById('ft-from-aadhaar');
    const toAadhaarInput = document.getElementById('ft-to-aadhaar');
    const ftAmountInput = document.getElementById('ft-amount');
    const ftRemarksInput = document.getElementById('ft-remarks');
    
    // Live UI Labels
    const lblFromName = document.getElementById('lbl-ft-from-name');
    const lblToName = document.getElementById('lbl-ft-to-name');
    const ftWordsDisplay = document.getElementById('ft-amount-words');

    // Global Tracking Flags for Verification
    let isFromCustomerValid = false;
    let isToCustomerValid = false;

    try {
        // 📊 [LEDGER SYSTEM]: Aaj ki live fund transfer summary load karna
        window.loadTodayFundTransfers = async function() {
            const tbody = document.getElementById('today-ft-body');
            if (!tbody) return;

            const todayStr = new Date().toISOString().split('T')[0];

            try {
                const { data, error } = await window.supabaseClient
                    .from('fund_transfers')
                    .select('*')
                    .eq('ko_code', currentUser.ko_code)
                    .gte('transaction_date', `${todayStr}T00:00:00`)
                    .order('transaction_date', { ascending: false });

                if (error) throw error;

                tbody.innerHTML = '';
                if (!data || data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:15px; color:#777;">आज काउंटर पर कोई फंड ट्रांसफर नहीं मिला</td></tr>';
                    return;
                }

                // Table Rows Rendering with Complete Look (No Masking / Cross Marks)
                data.forEach((tx, index) => {
                    const timeStr = new Date(tx.transaction_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const txStr = btoa(JSON.stringify(tx));
                    const srNo = data.length - index;

                    // Direct identifiers print bina kisi masking/cross marks ke
                    const displayFromId = tx.from_account_number || tx.from_aadhaar || "REF-" + tx.id.slice(0,6);
                    const displayToId = tx.to_account_number || tx.to_aadhaar || "REF-" + tx.id.slice(0,6);

                    tbody.insertAdjacentHTML('beforeend', `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding:12px; font-weight: bold; color: #555; text-align:center;">${srNo}</td>
                            <td style="padding:12px; font-weight: 600; letter-spacing:0.5px;">
                                <span style="color: #7d0022;">${displayFromId}</span><br>
                                <small style="color:#6c757d; font-weight: normal; text-transform: uppercase;">${tx.from_customer_name}</small>
                            </td>
                            <td style="padding:12px; font-weight: 600; letter-spacing:0.5px;">
                                <span style="color: #27ae60;">${displayToId}</span><br>
                                <small style="color:#6c757d; font-weight: normal; text-transform: uppercase;">${tx.to_customer_name}</small>
                            </td>
                            <td style="padding:12px; font-weight:bold; color:#0f5132;">₹${parseFloat(tx.amount).toFixed(2)}</td>
                            <td style="padding:12px;">${timeStr}</td>
                            <td style="padding:12px; text-align:center;">
                                <div style="display:inline-flex; align-items:center; gap:15px; justify-content:center;">
                                    <span class="btn-edit-ft-tx" data-tx="${txStr}" style="cursor:pointer; font-size:1.1rem; user-select:none;" title="Edit Entry">✏️</span>
                                    <span class="btn-print-ft-receipt" data-tx="${txStr}" style="cursor:pointer; font-size:1.2rem; user-select:none;" title="Print Slip">🖨️</span>
                                    <span class="btn-delete-ft-tx" data-id="${tx.id}" style="cursor:pointer; font-size:1.1rem; user-select:none;" title="Delete & Rollback">🗑️</span>
                                </div>
                            </td>
                        </tr>
                    `);
                });

                attachFundTransferActionListeners();

            } catch (err) {
                console.error("Fund Transfer Ledger Load Error:", err);
            }
        };

        // 🔍 [RADAR VERIFIER MODULE]: Customer Validator Lookup
        async function verifyCustomerAadhaar(aadhaarInput, lblNameElement, isSender) {
            const aadhaarNo = aadhaarInput.value.trim();
            if (!aadhaarNo) {
                if (isSender) isFromCustomerValid = false; else isToCustomerValid = false;
                lblNameElement.innerText = "--";
                return;
            }

            if (aadhaarNo.length !== 12 || isNaN(aadhaarNo)) {
                window.showSystemAlert("आधार नंबर पूरे 12 अंकों का होना अनिवार्य है!", "Validation Error", "❌");
                if (isSender) isFromCustomerValid = false; else isToCustomerValid = false;
                lblNameElement.innerText = "INVALID FORMAT";
                return;
            }

            lblNameElement.innerText = "Searching database...";

            try {
                const { data: customer, error } = await window.supabaseClient
                    .from('banking_customers')
                    .select('*')
                    .eq('aadhaar_number', aadhaarNo)
                    .maybeSingle();

                if (error) throw error;

                if (customer) {
                    lblNameElement.innerText = customer.customer_name.toUpperCase();
                    if (isSender) isFromCustomerValid = true; else isToCustomerValid = true;
                } else {
                    lblNameElement.innerText = "NOT REGISTERED";
                    if (isSender) isFromCustomerValid = false; else isToCustomerValid = false;

                    // 🌟 [UTILS.JS MODAL SYNC]: Open customer registration system
                    if (window.showDynamicNewCustomerModal) {
                        window.showDynamicNewCustomerModal({
                            source: 'fundtransfer',
                            aadhaar_number: aadhaarNo
                        }).then(regResult => {
                            if (regResult && regResult.success) {
                                lblNameElement.innerText = regResult.customer_name.toUpperCase();
                                if (isSender) isFromCustomerValid = true; else isToCustomerValid = true;
                            } else {
                                lblNameElement.innerText = "--";
                                aadhaarInput.value = "";
                                aadhaarInput.focus();
                            }
                        }).catch(err => {
                            console.error("Global Modal Error:", err);
                            lblNameElement.innerText = "--";
                        });
                    }
                }
            } catch (err) {
                console.error("Database Customer Search Error:", err);
                lblNameElement.innerText = "ERROR";
            }
        }

        // Attach Blur Events Listeners for Inputs
        if (fromAadhaarInput) {
            fromAadhaarInput.addEventListener('blur', () => {
                verifyCustomerAadhaar(fromAadhaarInput, lblFromName, true);
            });
        }
        if (toAadhaarInput) {
            toAadhaarInput.addEventListener('blur', () => {
                if (fromAadhaarInput && fromAadhaarInput.value.trim() === toAadhaarInput.value.trim() && toAadhaarInput.value.trim() !== "") {
                    window.showSystemAlert("भेजने वाले और पाने वाले का आधार नंबर समान नहीं हो सकता सर!", "Operation Denied", "⚠️");
                    toAadhaarInput.value = "";
                    lblToName.innerText = "--";
                    isToCustomerValid = false;
                    return;
                }
                verifyCustomerAadhaar(toAadhaarInput, lblToName, false);
            });
        }

        // 🔢 [LIVE TRANSLATOR]: Live Hindi Words Translation
        if (ftAmountInput) {
            ftAmountInput.addEventListener('input', () => {
                const amt = parseInt(ftAmountInput.value) || 0;
                if (ftWordsDisplay) {
                    if (amt === 0) {
                        ftWordsDisplay.innerText = "Zero Rupees Only";
                    } else if (typeof window.numberToHindiWords === 'function') {
                        ftWordsDisplay.innerText = `${window.numberToHindiWords(amt)} रुपए मात्र`;
                    } else {
                        ftWordsDisplay.innerText = `₹${amt.toLocaleString('en-IN')} मात्र`;
                    }
                }
            });
            ftAmountInput.addEventListener('wheel', e => e.preventDefault(), { passive: false });
        }

        // 🚀 [EXECUTE MODULE HOOK]: Modular integration call with fundtransfer-save.js
        const saveBtn = document.getElementById('btn-ft-save');
        if (saveBtn) {
            saveBtn.onclick = async function() {
                if (typeof window.executeFundTransferSave === 'function') {
                    await window.executeFundTransferSave(saveBtn, currentUser, {
                        isFromValid: isFromCustomerValid,
                        isToValid: isToCustomerValid
                    });
                } else {
                    console.error("executeFundTransferSave function missing from global window context!");
                }
            };
        }

        // ✏️ [ROW EVENTS HUB]: Action Controls Listeners Binding
        function attachFundTransferActionListeners() {
            // Edit Control Row Tracker
            document.querySelectorAll('.btn-edit-ft-tx').forEach(btn => {
                btn.onclick = function() {
                    try {
                        const txData = JSON.parse(atob(this.getAttribute('data-tx')));
                        
                        fromAadhaarInput.value = txData.from_aadhaar;
                        toAadhaarInput.value = txData.to_aadhaar;
                        ftAmountInput.value = txData.amount;
                        ftRemarksInput.value = txData.remarks || "";

                        lblFromName.innerText = txData.from_customer_name;
                        lblToName.innerText = txData.to_customer_name;
                        
                        isFromCustomerValid = true;
                        isToCustomerValid = true;

                        if (ftWordsDisplay && typeof window.numberToHindiWords === 'function') {
                            ftWordsDisplay.innerText = `${window.numberToHindiWords(parseInt(txData.amount))} रुपए मात्र`;
                        }

                        if (saveBtn) {
                            saveBtn.innerText = "🔄 Update Transfer";
                            saveBtn.style.background = "#d35400";
                            saveBtn.dataset.mode = "edit";
                            saveBtn.dataset.editingFtId = txData.id;
                        }

                        window.showSystemAlert("फंड ट्रांसफर प्रविष्टि संपादन मोड में लोड हो गई है!", "Edit Mode", "ℹ️");
                    } catch (e) {
                        console.error("Edit mode mapping crash:", e);
                    }
                };
            });

            // Delete Control Row Tracker (Link directly to fundtransfer-delete.js)
            document.querySelectorAll('.btn-delete-ft-tx').forEach(btn => {
                btn.onclick = async function() {
                    const txId = this.getAttribute('data-id');
                    if (!txId) return;

                    if (typeof window.executeFundTransferDelete === 'function') {
                        await window.executeFundTransferDelete(txId);
                    } else {
                        console.error("executeFundTransferDelete function missing from global window context!");
                    }
                };
            });
        }

        // 🧹 [CLEAR CONTROLLER]: Form State Reset System
        window.masterFundTransferClear = function() {
            if (fromAadhaarInput) fromAadhaarInput.value = "";
            if (toAadhaarInput) toAadhaarInput.value = "";
            if (ftAmountInput) ftAmountInput.value = "";
            if (ftRemarksInput) ftRemarksInput.value = "";
            
            if (lblFromName) lblFromName.innerText = "--";
            if (lblToName) lblToName.innerText = "--";
            if (ftWordsDisplay) ftWordsDisplay.innerText = "Zero Rupees Only";

            isFromCustomerValid = false;
            isToCustomerValid = false;

            if (saveBtn) {
                saveBtn.innerText = "🚀 Execute Transfer";
                saveBtn.style.background = "#7d0022";
                delete saveBtn.dataset.mode;
                delete saveBtn.dataset.editingFtId;
            }
        };

        const clearBtn = document.getElementById('btn-ft-clear');
        if (clearBtn) clearBtn.onclick = window.masterFundTransferClear;

        // ⌨️ Shortcuts Handler Hooks
        document.onkeydown = function(e) {
            if ((e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                document.getElementById('btn-ft-save')?.click();
            }
            if (e.key === 'Escape' || e.key === 'Esc') {
                window.masterFundTransferClear();
            }
        };

        // Bootstrap load sequence
        window.loadTodayFundTransfers();

    } catch (err) {
        console.error("Fund Transfer Gateway Crash:", err);
    }
};
