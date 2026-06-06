// ========================================================
// 💸 AEPS CASH WITHDRAWAL CORE CONTROL ENGINE (WITH SILENT MATRIX PRINT)
// ========================================================

window.initWithdrawalPage = async function (currentUser) {
    console.log("⚡ Jarvis AEPS Withdrawal Engine Initializing...");
    
    // कोर यूआई एलिमेंट्स को हुक करें
    const witAadhaarInput = document.getElementById('wit-aadhaar-no');
    const witNameInput = document.getElementById('wit-cust-name');
    const witAmountInput = document.getElementById('wit-amount');
    const witWordsDisplay = document.getElementById('wit-amount-words');

    try {
        // 🚀 आते ही नए स्वतंत्र विथड्रॉल डिनॉमिनेशन कॉम्पोनेन्ट को रेंडर करें
        if (window.WitDenominationComponent) {
            setTimeout(() => {
                console.log("Initializing Dedicated Withdrawal Denomination Panel...");
                window.WitDenominationComponent.clear();
                window.WitDenominationComponent.render('master-shared-denomination-container');
            }, 50);
        } else {
            console.error("WitDenominationComponent structure not found in window stack!");
        }

        // 🖨️ SILENT WITHDRAWAL PRINT FUNCTION (Direct Matrix Printer Spooler Transmission via Python Backend)
        window.executeWithdrawalPrintReceipt = async function(encodedTx) {
            try {
                const txData = JSON.parse(atob(encodedTx));
                console.log("🖨️ Transmitting Silent Matrix Print via Python Agent:", txData);

                const txDate = new Date(txData.transaction_date);
                const day = String(txDate.getDate()).padStart(2, '0');
                const month = String(txDate.getMonth() + 1).padStart(2, '0');
                const year = txDate.getFullYear();
                const formattedDate = `${day}-${month}-${year}`;

                const userAddress = window.currentUser?.address || "KIOSK CENTER, INDIA";
                const amountInWords = window.numberToHindiWords ? `${window.numberToHindiWords(parseInt(txData.amount))} रुपए मात्र` : "Rupees Only";

                // 💾 LocalStorage se withdrawal (Matrix) printer ka naam nikalna
                const selectedPrinter = localStorage.getItem('jarvis_default_withdrawal_printer');

                if (!selectedPrinter) {
                    if (window.showSystemAlert) {
                        window.showSystemAlert("कृपया पहले सेटिंग्स में जाकर विथड्रॉल प्रिंटर सेलेक्ट करें!", "Printer Not Set", "⚠️");
                    } else {
                        alert("⚠️ कृपया पहले सेटिंग्स में जाकर विथड्रॉल प्रिंटर सेलेक्ट करें!");
                    }
                    return;
                }

                // 📊 Pure text layout optimized for Matrix/Passbook printer parsing stream
                const receiptHTML = `
                    Cash Withdrawal Slip
                    KO Operator Center: ${userAddress}
                    -------------------------------------
                    Date: ${formattedDate}
                    Aadhaar No: ${txData.aadhaar_number}
                    Customer Name: ${txData.customer_name.toUpperCase()}
                    -------------------------------------
                    Debited Amount: Rs. ${parseFloat(txData.amount).toFixed(2)}
                    Words: ${amountInWords}
                    -------------------------------------
                    Transaction Successful
                    System Generated Cash Receipt
                `;

                // 🚀 Send payload directly to our Python Local Server localhost:5000
                const response = await fetch("http://127.0.0.1:5000/print", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        printer_name: selectedPrinter,
                        content: receiptHTML
                    })
                });

                const result = await response.json();
                if (result.success) {
                    console.log(`🚀 Withdrawal receipt printed silently on: ${selectedPrinter}`);
                    if (window.showSystemAlert) {
                        window.showSystemAlert("निकासी रसीद सफलतापूर्वक प्रिंटर पर भेज दी गई है।", "Print Successful", "✅");
                    }
                } else {
                    throw new Error(result.message || "Unknown error from agent");
                }
            } catch (printErr) {
                console.error("Matrix Spooler Printing Failure:", printErr);
                if (window.showSystemAlert) {
                    window.showSystemAlert("प्रिंट सर्विस offline है। कृपया HisaabMitra local system runtime चेक करें।", "Print Error", "❌");
                }
            }
        };

        // 📊 [LEDGER SYSTEM]: आज की लाइव निकासी लेज़र तालिका लोड करें
        window.loadTodayWithdrawals = async function() {
            const tbody = document.getElementById('today-wit-body');
            if (!tbody) return;

            const todayStr = new Date().toISOString().split('T')[0];

            try {
                const { data, error } = await window.supabaseClient
                    .from('withdrawal_transactions')
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

                // rows ko clear class matching 'btn-print-wit-receipt' ke sath inject karna
                data.forEach((tx, index) => {
                    const timeStr = new Date(tx.transaction_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const txStr = btoa(JSON.stringify(tx));
                    const srNo = data.length - index;

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
                                    <span class="btn-delete-wit-tx" data-id="${tx.id}" data-tx="${txStr}" style="cursor:pointer; font-size:1.1rem; user-select:none;" title="Delete & Rollback Withdrawal">🗑️</span>
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

        // 🔍 [RADAR SEARCH]: आधार नंबर सर्च इंजन
        if (witAadhaarInput) {
            witAadhaarInput.addEventListener('blur', async () => {
                const aadhaarNo = witAadhaarInput.value.trim();
                if (!aadhaarNo) return;

                if (aadhaarNo.length !== 12 || isNaN(aadhaarNo)) {
                    window.showSystemAlert("आधार नंबर पूरे 12 अंकों का होना अनिवार्य है!", "Validation Error", "❌");
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
                        if (witAmountInput) witAmountInput.focus(); 
                    } else {
                        if (witNameInput) witNameInput.value = "NOT REGISTERED";
                        
                        window.showDynamicNewCustomerModal({
                            source: 'withdrawal',
                            aadhaar_number: aadhaarNo
                        }).then(regResult => {
                            if (regResult && regResult.success) {
                                if (witNameInput) witNameInput.value = regResult.customer_name;
                                if (witAmountInput) witAmountInput.focus();
                            } else if (regResult && regResult.cancelled) {
                                if (witNameInput) witNameInput.value = "";
                                witAadhaarInput.value = ""; 
                                witAadhaarInput.focus();
                            }
                        }).catch(err => {
                            console.error("Global Modal Promise Framework Error in Withdrawal:", err);
                            if (witNameInput) witNameInput.value = "";
                        });
                    }
                } catch (err) { 
                    console.error("Aadhaar Search Error:", err); 
                }
            });
        }

        // 🔢 [LIVE TRANSLATOR]: लाइव हिंदी Numbers-to-Words कनवर्टर
        if (witAmountInput) {
            witAmountInput.addEventListener('input', () => {
                const amt = parseInt(witAmountInput.value) || 0;
                if (witWordsDisplay) {
                    if (amt === 0) {
                        witWordsDisplay.innerText = "Zero Rupees Only";
                    } else if (typeof window.numberToHindiWords === 'function') {
                        witWordsDisplay.innerText = `${window.numberToHindiWords(amt)} रुपए मात्र`;
                    } else {
                        witWordsDisplay.innerText = `₹${amt.toLocaleString('en-IN')} मात्र`;
                    }
                }
            });
            witAmountInput.addEventListener('wheel', e => e.preventDefault(), { passive: false }); 
        }

        // ✏️ [EDIT MODULE]: एडिट निकासी प्रविष्टि लिसनर
        function attachWithdrawalEditListeners() {
            document.querySelectorAll('.btn-edit-wit-tx').forEach(btn => {
                btn.onclick = function() {
                    try {
                        const txData = JSON.parse(atob(this.getAttribute('data-tx')));
                        
                        document.getElementById('wit-aadhaar-no').value = txData.aadhaar_number;
                        document.getElementById('wit-cust-name').value = txData.customer_name;
                        document.getElementById('wit-amount').value = txData.amount;
                        document.getElementById('wit-remarks').value = txData.remarks || "";
                        
                        if (witWordsDisplay && typeof window.numberToHindiWords === 'function') {
                            witWordsDisplay.innerText = `${window.numberToHindiWords(parseInt(txData.amount))} रुपए मात्र`;
                        }

                        const notes = [500, 200, 100, 50, 20, 10, 5];
                        notes.forEach(note => {
                            const inInput = document.querySelector(`.wit-denom-in[data-note="${note}"]`);
                            const outInput = document.querySelector(`.wit-denom-out[data-note="${note}"]`);
                            if (inInput) inInput.value = txData[`denom_in_${note}`] || 0;
                            if (outInput) outInput.value = txData[`denom_out_${note}`] || 0;
                        });

                        const coinIn = document.querySelector('.wit-denom-in[data-note="coins"]');
                        const coinOut = document.querySelector('.wit-denom-out[data-note="coins"]');
                        if (coinIn) coinIn.value = txData[`denom_in_coins`] || 0;
                        if (coinOut) coinOut.value = txData[`denom_out_coins`] || 0;

                        if (window.WitDenominationComponent) window.WitDenominationComponent.calculate();

                        const saveBtn = document.getElementById('btn-wit-save');
                        if (saveBtn) {
                            saveBtn.innerText = "🔄 Update Withdrawal";
                            saveBtn.style.background = "#d35400";
                            saveBtn.dataset.mode = "edit";
                            saveBtn.dataset.editingWitId = txData.id;
                        }

                        window.showSystemAlert("पुरानी निकासी प्रविष्टि संपादन मोड में लोड हो गई है!", "Edit Mode", "ℹ️");
                    } catch (e) { 
                        console.error("Edit Mode Loader Failure:", e); 
                    }
                };
            });
        }

        // 🧹 [CLEAR MOTOR]: मास्टर फॉर्म और कॉम्पोनेन्ट रीसेटर
        window.masterWithdrawalClear = function() {
            if (witAadhaarInput) witAadhaarInput.value = "";
            if (witNameInput) witNameInput.value = "";
            if (witAmountInput) witAmountInput.value = "";
            if (document.getElementById('wit-remarks')) document.getElementById('wit-remarks').value = "";
            if (witWordsDisplay) witWordsDisplay.innerText = "Zero Rupees Only";
            
            if (window.WitDenominationComponent) window.WitDenominationComponent.clear();

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

        // ⌨️ [JARVIS SHORTCUT HOOKS]
        document.onkeydown = function(e) {
            if ((e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey)) {
                e.preventDefault(); 
                document.getElementById('btn-wit-save')?.click();
            }
            if (e.key === 'Escape' || e.key === 'Esc') {
                window.masterWithdrawalClear();
            }
        };

        // इंजन लोड होते ही तालिका डेटा सिंक करें
        window.loadTodayWithdrawals();

    } catch (err) { 
        console.error("Withdrawal Initialization Core Fatal Failure:", err); 
    }
};

// 🌐 MASTER DELEGATION FOR SILENT WITHDRAWAL PRINT
// Purane links clean karke click controller ko global storage par lock kiya
document.removeEventListener('click', triggerWithdrawalSilentPrint);
document.addEventListener('click', triggerWithdrawalSilentPrint);

function triggerWithdrawalSilentPrint(e) {
    const printBtn = e.target.closest('.btn-print-wit-receipt');
    if (printBtn) {
        e.preventDefault();
        e.stopPropagation(); // Browser native printing popup ko yahin block karega
        
        const encodedTx = printBtn.getAttribute('data-tx');
        if (encodedTx && typeof window.executeWithdrawalPrintReceipt === 'function') {
            window.executeWithdrawalPrintReceipt(encodedTx);
        }
    }
}
