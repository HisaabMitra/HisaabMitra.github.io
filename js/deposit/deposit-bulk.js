// ========================================================
// 📦 BULK DEPOSIT CONTROLLER & LIVE AUTO-REGISTRATION ENGINE
// ========================================================

let bulkRowCounter = 0;

window.initBulkDepositPage = async function (currentUser) {
    const workspace = document.getElementById('workspace');
    if (!workspace) return;

    try {
        // [1] काउंटर KO Code स्क्रीन पर सेट करें
        const koCodeLabel = document.getElementById('lbl-bulk-ko-code');
        if (koCodeLabel) koCodeLabel.innerText = currentUser.ko_code;

        // [2] डिनॉमिनेशन विजेट को बल्क कंटेनर में रेंडर करें
        if (window.DenominationComponent) {
            setTimeout(() => {
                window.DenominationComponent.render('bulk-denomination-container');
            }, 100);
        }

        // [3] डिफ़ॉल्ट रूप से पहली खाली खाता रो (Row) जोड़ें
        const tbody = document.getElementById('bulk-accounts-tbody');
        if (tbody && tbody.children.length === 0) {
            window.addNewBulkRow();
        }

        // [4] आज की लाइव कंबाइन ट्रांजैक्शन्स लेज़र लोड करें
        async function loadTodayBulkLedger() {
            const txTbody = document.getElementById('today-tx-body');
            if (!txTbody) return;

            const today = new Date().toISOString().split('T')[0];

            try {
                const { data, error } = await window.supabaseClient
                    .from('deposit_transactions')
                    .select('*')
                    .eq('ko_code', currentUser.ko_code)
                    .gte('transaction_date', `${today}T00:00:00`)
                    .order('transaction_date', { ascending: false });

                if (error) throw error;

                txTbody.innerHTML = '';
                if (!data || data.length === 0) {
                    txTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:15px; color:#777;">आज कोई ट्रांजैक्शन रिकॉर्ड नहीं मिला</td></tr>';
                    return;
                }

                data.forEach(tx => {
                    const time = new Date(tx.transaction_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    // अगर बल्क आईडी है तो वो दिखाएं, नहीं तो नॉर्मल अकाउंट नंबर
                    const identifier = tx.bulk_id ? `📦 ${tx.bulk_id}` : tx.account_number;
                    const displayName = tx.bulk_id ? `Depositor: ${tx.depositor_name || 'N/A'}` : tx.customer_name;
                    const txTypeHint = tx.bulk_id ? `<br><small style="color:#777;">To: ${tx.customer_name}</small>` : '';

                    const txStr = btoa(JSON.stringify(tx));

                    txTbody.insertAdjacentHTML('beforeend', `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding:12px; font-weight: 500;">${identifier}</td>
                            <td style="padding:12px; text-transform: uppercase;">${displayName}${txTypeHint}</td>
                            <td style="padding:12px; font-weight:bold; color:#27ae60;">₹${tx.amount}</td>
                            <td style="padding:12px;">${time}</td>
                            <td style="padding:12px; text-align:center;">
                                <div style="display:inline-flex; align-items:center; gap:15px; justify-content:center;">
                                    <span class="btn-print-receipt" data-tx="${txStr}" style="cursor:pointer; font-size:1.2rem; user-select:none; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" title="Print Slip">🖨️</span>
                                </div>
                            </td>
                        </tr>
                    `);
                });

                if (typeof attachPrintEventListeners === 'function') attachPrintEventListeners();

            } catch (err) {
                console.error("Ledger Load Error:", err);
            }
        }

        window.loadTodayTransactions = loadTodayBulkLedger; // ग्लोबल बाइंडिंग साझा रिफ्रेश के लिए
        loadTodayBulkLedger();

        // [5] नया कस्टमर रजिस्ट्रेशन मॉडल फ़ील्ड्स को केस सेंसिटिव करना
        const ncNameInput = document.getElementById('nc-name');
        const ncAddressInput = document.getElementById('nc-address');
        [ncNameInput, ncAddressInput].forEach(el => {
            if (el) {
                el.addEventListener('input', function() { this.value = this.value.toUpperCase(); });
            }
        });

        // [6] Clear / रीसेट ऑल बटन लॉजिक
        document.getElementById('btn-dep-clear').onclick = function() {
            document.getElementById('bulk-depositor-name').value = "";
            document.getElementById('bulk-depositor-mobile').value = "";
            document.getElementById('bulk-accounts-tbody').innerHTML = "";
            document.getElementById('lbl-bulk-grand-total').innerText = "₹0.00";
            
            if (window.DenominationComponent && typeof window.clearAllDenominationInputs === 'function') {
                window.clearAllDenominationInputs();
            }
            
            window.addNewBulkRow();
            console.log("Bulk Form Reset Done.");
        };

    } catch (err) {
        console.error("Bulk Initializer Error:", err);
    }
};

// ========================================================
// 🛠️ ग्रिड रो-मैनेजमेंट और लाइव वेरिफिकेशन फंक्शन्स (Global)
// ========================================================

// [A] नई डायनेमिक रो जोड़ने का फंक्शन
window.addNewBulkRow = function() {
    const tbody = document.getElementById('bulk-accounts-tbody');
    if (!tbody) return;

    bulkRowCounter++;
    const rowId = `bulk-row-${bulkRowCounter}`;

    const trHtml = `
        <tr id="${rowId}" style="border-bottom: 1px solid #eee;">
            <td>
                <input type="text" class="bulk-input bulk-acc-input" placeholder="Enter Account No." autocomplete="off">
            </td>
            <td>
                <input type="text" class="bulk-input bulk-name-input" id="name-${rowId}" placeholder="A/C का इंतज़ार है..." readonly tabindex="-1">
            </td>
            <td>
                <input type="number" class="bulk-input bulk-amount-input" placeholder="Max 25000" min="1" max="25000">
            </td>
            <td style="text-align: center;">
                <button type="button" onclick="window.removeBulkRow('${rowId}')" style="background: #c5221f; color: white; border: none; padding: 7px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.9rem;">❌</button>
            </td>
        </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', trHtml);
    attachBulkRowEvents(rowId);
};

// [B] रो हटाने का फंक्शन
window.removeBulkRow = function(rowId) {
    const tbody = document.getElementById('bulk-accounts-tbody');
    if (!tbody || tbody.children.length <= 1) {
        window.showSystemAlert("बल्क ग्रिड में कम से कम एक खाता होना ज़रूरी है!", "Validation Notice", "⚠️");
        return;
    }
    const row = document.getElementById(rowId);
    if (row) row.remove();
    window.calculateBulkGrandTotal();
};

// [C] लाइव खाता वेरिफिकेशन और ऑटो-रजिस्ट्रेशन पॉपअप इंटरफेस
function attachBulkRowEvents(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;

    const accInput = row.querySelector('.bulk-acc-input');
    const nameInput = row.querySelector('.bulk-name-input');
    const amtInput = row.querySelector('.bulk-amount-input');

    if (!accInput) return;

    // अकाउंट नंबर बॉक्स से बाहर आते ही (Blur Event) लाइव सर्च
    accInput.addEventListener('blur', async () => {
        const accountNo = accInput.value.trim();
        if (!accountNo) return;

        nameInput.value = "Searching ledger...";

        try {
            const { data: customer, error } = await window.supabaseClient
                .from('banking_customers') 
                .select('customer_name')
                .eq('account_number', accountNo)
                .maybeSingle();

            if (error) throw error;

            if (customer) {
                // स्थिति 1: ग्राहक मास्टर रिकॉर्ड में मिल गया!
                nameInput.value = customer.customer_name.toUpperCase();
                amtInput.focus(); // सीधा कर्सर अमाउंट बॉक्स में!
            } else {
                // स्थिति 2: नया ग्राहक मिला! रजिस्ट्रेशन मॉडल खोलें
                nameInput.value = "NOT REGISTERED";
                
                openRegistrationPrompt(accountNo, (registeredName) => {
                    if (registeredName) {
                        nameInput.value = registeredName.toUpperCase();
                        amtInput.focus();
                    } else {
                        nameInput.value = "";
                        accInput.value = "";
                        accInput.focus();
                    }
                });
            }
        } catch (err) {
            console.error("Bulk Live Search Error:", err);
            nameInput.value = "SEARCH ERROR";
        }
    });

    // अमाउंट बॉक्स में टाइप करते ही ग्रैंड टोटल लाइव अपडेट करें
    amtInput.addEventListener('input', () => {
        window.calculateBulkGrandTotal();
    });
}

// [D] नया ग्राहक पंजीकरण मॉडल ऑपरेशंस (प्रॉम्ट मैकेनिज्म)
function openRegistrationPrompt(accountNo, callback) {
    const modal = document.getElementById('new-cust-modal');
    if (!modal) return callback(null);

    // फ़ील्ड्स को साफ और लॉक करें
    document.getElementById('nc-account-no').value = accountNo;
    document.getElementById('nc-name').value = "";
    document.getElementById('nc-mobile').value = "";
    document.getElementById('nc-address').value = "";

    modal.style.setProperty('display', 'flex', 'important');
    document.getElementById('nc-name').focus();

    const btnContinue = document.getElementById('btn-nc-continue');
    const btnCancel = document.getElementById('btn-nc-cancel');
    
    // पुराने क्लिक इवेंट्स साफ़ करने के लिए नोड रिप्लेसमेंट (Cloning)
    const newContinue = btnContinue.cloneNode(true);
    const newCancel = btnCancel.cloneNode(true);
    btnContinue.parentNode.replaceChild(newContinue, btnContinue);
    btnCancel.parentNode.replaceChild(newCancel, btnCancel);

    newCancel.onclick = function() {
        modal.style.display = 'none';
        callback(null);
    };

    newContinue.onclick = async function() {
        const fullName = document.getElementById('nc-name').value.trim().toUpperCase();
        const mobile = document.getElementById('nc-mobile').value.trim();
        const address = document.getElementById('nc-address').value.trim().toUpperCase();

        if (!fullName || !mobile) {
            window.showSystemAlert("ग्राहक का पूरा नाम और मोबाइल नंबर डालना अनिवार्य है!", "Validation Error", "❌");
            return;
        }

        newContinue.textContent = "Processing...";
        newContinue.disabled = true;

        try {
            const { error } = await window.supabaseClient
                .from('banking_customers')
                .insert([{
                    account_number: accountNo,
                    customer_name: fullName,
                    mobile_number: mobile,
                    customer_address: address
                }]);

            if (error) throw error;

            modal.style.display = 'none';
            window.showSystemAlert(`🎉 खाता ${accountNo} सफलतापूर्वक पंजीकृत हुआ!`, "Registration Success", "✅");
            callback(fullName);

        } catch (err) {
            console.error("Auto Reg Core Error:", err);
            window.showSystemAlert("डेटाबेस पंजीकरण विफल: " + err.message, "System Error", "❌");
            callback(null);
        } finally {
            newContinue.textContent = "Register & Continue";
            newContinue.disabled = false;
        }
    };
}

// [E] ग्रिड का कुल योग (Grand Total) कैलकुलेटर
window.calculateBulkGrandTotal = function() {
    let grandTotal = 0;
    document.querySelectorAll('.bulk-amount-input').forEach(input => {
        grandTotal += parseFloat(input.value) || 0;
    });
    
    const labelTotal = document.getElementById('lbl-bulk-grand-total');
    if (labelTotal) {
        labelTotal.innerText = `₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
};

// डोम लोड होने पर `+ Add Row` को लिसनर बाइंड करना
document.addEventListener('DOMContentLoaded', () => {
    const addRowBtn = document.getElementById('btn-bulk-add-row');
    if (addRowBtn) {
        addRowBtn.onclick = window.addNewBulkRow;
    }
});
