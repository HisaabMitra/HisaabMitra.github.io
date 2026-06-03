// ========================================================
// 📦 BULK DEPOSIT CONTROLLER & LIVE AUTO-REGISTRATION ENGINE
// ========================================================

let bulkRowCounter = 0;
let globalCurrentUser = null; // SOL ID एक्सेस करने के लिए लोकल कॉपी

// 🌟 [MASTER INITIALIZER]: इसे सीधे window ऑब्जेक्ट पर बाइंड किया ताकि deposit.js इसे ढूंढ सके
window.initBulkDepositPage = async function (currentUser) {
       try {
        globalCurrentUser = currentUser; // यूज़र डेटा सेव करें

        // [1] काउंटर KO Code स्क्रीन पर सेट करें
        const koCodeLabel = document.getElementById('lbl-bulk-ko-code');
        if (koCodeLabel) koCodeLabel.innerText = currentUser.ko_code;

        // [2] साझा डिनॉमिनेशन कॉम्पोनेन्ट को फ्रेश रीसेट करें
        if (window.DenominationComponent) {
            window.DenominationComponent.clear();
            if (typeof window.DenominationComponent.calculate === 'function') {
                window.DenominationComponent.calculate();
            }
        }

        // [3] डिफ़ॉल्ट रूप से पहली खाली खाता रो (Row) जोड़ें
        const tbody = document.getElementById('bulk-accounts-tbody');
        if (tbody) {
            tbody.innerHTML = ''; // पुराना कोई भी कचरा साफ़ करें
            window.addNewBulkRow();
        }

        // [4] 🧹 Clear / रीसेट ऑल बटन लॉजिक (आईडी 'btn-bulk-dep-clear' के साथ सिंक)
        const clearBtn = document.getElementById('btn-bulk-dep-clear');
        if (clearBtn) {
            clearBtn.onclick = function() {
                const nameField = document.getElementById('bulk-depositor-name');
                const mobileField = document.getElementById('bulk-depositor-mobile');
                const grandTotalField = document.getElementById('lbl-bulk-grand-total');
                const accountsTbody = document.getElementById('bulk-accounts-tbody');

                if (nameField) nameField.value = "";
                if (mobileField) mobileField.value = "";
                if (accountsTbody) accountsTbody.innerHTML = "";
                if (grandTotalField) grandTotalField.innerText = "₹0.00";
                
                // साझा डिनॉमिनेशन कॉम्पोनेन्ट को रीसेट करें
                if (window.DenominationComponent && typeof window.DenominationComponent.clear === 'function') {
                    window.DenominationComponent.clear();
                }
                
                // सेव बटन को वापस नॉर्मल मोड में लाएं
                const bulkSaveBtn = document.getElementById('btn-bulk-dep-save');
                if (bulkSaveBtn) {
                    bulkSaveBtn.innerText = "💾 Save Bulk Transactions";
                    bulkSaveBtn.style.background = "#7d0022";
                    delete bulkSaveBtn.dataset.mode;
                    delete bulkSaveBtn.dataset.editingBulkId;
                }

                window.addNewBulkRow();
            };
        }

        // [5] ➕ '+ Add Row' बटन को इवेंट असाइन करें
        const addRowBtn = document.getElementById('btn-bulk-add-row');
        if (addRowBtn) {
            addRowBtn.onclick = window.addNewBulkRow;
        }

    } catch (err) {
        console.error("Bulk Initializer Core Error:", err);
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
            <td><input type="text" class="bulk-input bulk-acc-input" placeholder="Enter Account No." autocomplete="off"></td>
            <td><input type="text" class="bulk-input bulk-name-input" id="name-${rowId}" placeholder="A/C का इंतज़ार है..." readonly tabindex="-1"></td>
            <td><input type="number" class="bulk-input bulk-amount-input" placeholder="Max 25000" min="1" max="25000"></td>
            <td style="text-align: center;"><button type="button" onclick="window.removeBulkRow('${rowId}')" style="background: #c5221f; color: white; border: none; padding: 7px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.9rem;">❌</button></td>
        </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', trHtml);
    attachBulkRowEvents(rowId);
};

// [B] रो हटाने का FUNCTION
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

// PNB स्टाइल अकाउंट कनवर्टर फंक्शन
function formatBulkAccountNumber(inputAcc, solId) {
    let acc = inputAcc.trim();
    if (acc.length > 10 || !acc.includes('-')) return acc;
    const parts = acc.split('-');
    return `${solId}${parts[0].padStart(2, '0')}${parts[1].padStart(8, '0')}`;
}

// [C] लाइव खाता वेरिफिकेशन और ऑटो-रजिस्ट्रेशन पॉपअप链
function attachBulkRowEvents(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;

    const accInput = row.querySelector('.bulk-acc-input');
    const nameInput = row.querySelector('.bulk-name-input');
    const amtInput = row.querySelector('.bulk-amount-input');

    if (!accInput) return;

    accInput.addEventListener('blur', async () => {
        let accountNo = accInput.value.trim();
        if (!accountNo) return;

        const userSolId = (globalCurrentUser && globalCurrentUser.sol_id) || '193000';
        const formattedAccountNo = formatBulkAccountNumber(accountNo, userSolId);
        
        if (formattedAccountNo !== accountNo) {
            accInput.value = formattedAccountNo;
            accountNo = formattedAccountNo;
        }

        nameInput.value = "Searching ledger...";

        try {
            const { data: customer, error } = await window.supabaseClient
                .from('banking_customers') 
                .select('customer_name')
                .eq('account_number', accountNo)
                .maybeSingle();

            if (error) throw error;

            if (customer) {
                nameInput.value = customer.customer_name.toUpperCase();
                amtInput.focus();
            } else {
                nameInput.value = "NOT REGISTERED";
                
                if (typeof openRegistrationPrompt === 'function') {
                    openRegistrationPrompt(accountNo, (registeredName) => {
                        if (registeredName) {
                            nameInput.value = registeredName.toUpperCase();
                            setTimeout(() => { amtInput.focus(); }, 50);
                        } else {
                            nameInput.value = "";
                            accInput.value = "";
                            setTimeout(() => { accInput.focus(); }, 50);
                        }
                    });
                }
            }
        } catch (e) { 
            console.error("Bulk Live Search Error:", e);
            nameInput.value = "SEARCH ERROR"; 
        }
    });

    amtInput.addEventListener('input', () => window.calculateBulkGrandTotal());
}

// [D] ग्रिड का कुल योग (Grand Total) कैलकुलेटर
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

// [E] नया ग्राहक पंजीकरण मॉडल ऑपरेशंस (प्रॉम्ट मैकेनिज्म)
function openRegistrationPrompt(accountNo, callback) {
    const modal = document.getElementById('new-cust-modal');
    if (!modal) return callback(null);

    document.getElementById('nc-account-no').value = accountNo;
    document.getElementById('nc-name').value = "";
    document.getElementById('nc-mobile').value = "";
    document.getElementById('nc-address').value = "";

    modal.style.setProperty('display', 'flex', 'important');
    document.getElementById('nc-name').focus();

    const btnContinue = document.getElementById('btn-nc-continue');
    const btnCancel = document.getElementById('btn-nc-cancel');
    
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

// ========================================================
// 🌟 [CRITICAL UPGRADE]: डेटाबेस से संपादन के लिए पूरा बल्क बैच लोड करना
// ========================================================
window.loadBulkBatchForEdit = async function(baseTxData) {
    console.log("Loading bulk batch engine for ID:", baseTxData.bulk_id);
    try {
        const depositorNameInput = document.getElementById('bulk-depositor-name');
        const depositorMobileInput = document.getElementById('bulk-depositor-mobile');
        if (depositorNameInput) depositorNameInput.value = baseTxData.depositor_name || "";
        if (depositorMobileInput) depositorMobileInput.value = baseTxData.depositor_mobile || "";

        const { data: batchList, error } = await window.supabaseClient
            .from('deposit_transactions')
            .select('*')
            .eq('bulk_id', baseTxData.bulk_id)
            .order('transaction_date', { ascending: true });

        if (error) throw error;

        const tbody = document.getElementById('bulk-accounts-tbody');
        if (!tbody) return;
        tbody.innerHTML = ''; // ग्रिड साफ़ करें

        batchList.forEach(tx => {
            bulkRowCounter++;
            const rowId = `bulk-row-${bulkRowCounter}`;
            const trHtml = `
                <tr id="${rowId}" style="border-bottom: 1px solid #eee;">
                    <td><input type="text" class="bulk-input bulk-acc-input" value="${tx.account_number}" placeholder="Enter Account No." autocomplete="off"></td>
                    <td><input type="text" class="bulk-input bulk-name-input" id="name-${rowId}" value="${tx.customer_name.toUpperCase()}" readonly tabindex="-1"></td>
                    <td><input type="number" class="bulk-input bulk-amount-input" value="${tx.amount}" placeholder="Max 25000" min="1" max="25000"></td>
                    <td style="text-align: center;"><button type="button" onclick="window.removeBulkRow('${rowId}')" style="background: #c5221f; color: white; border: none; padding: 7px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.9rem;">❌</button></td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', trHtml);
            attachBulkRowEvents(rowId);
        });

        // साझा डिनॉमिनेशन सेटिंग्स री-पॉप्युलेट करें
        const notes = [500, 200, 100, 50, 20, 10, 5];
        notes.forEach(note => {
            const inInput = document.querySelector(`.denom-in[data-note="${note}"]`);
            const outInput = document.querySelector(`.denom-out[data-note="${note}"]`);
            if (inInput) inInput.value = baseTxData[`denom_in_${note}`] || 0;
            if (outInput) outInput.value = baseTxData[`denom_out_${note}`] || 0;
        });
        const coinsIn = document.querySelector('.denom-in[data-note="coins"]');
        const coinsOut = document.querySelector('.denom-out[data-note="coins"]');
        if (coinsIn) coinsIn.value = baseTxData[`denom_in_coins`] || 0;
        if (coinsOut) coinsOut.value = baseTxData[`denom_out_coins`] || 0;

        window.calculateBulkGrandTotal();
        if (window.DenominationComponent) window.DenominationComponent.calculate();

        // बल्क सेव बटन को अपडेट मोड में बदलें
        const bulkSaveBtn = document.getElementById('btn-bulk-dep-save');
        if (bulkSaveBtn) {
            bulkSaveBtn.innerText = "🔄 Update Bulk Batch";
            bulkSaveBtn.style.background = "#d35400";
            bulkSaveBtn.dataset.mode = "edit";
            bulkSaveBtn.dataset.editingBulkId = baseTxData.bulk_id;
        }
        window.showSystemAlert(`📦 बैच ${baseTxData.bulk_id} संपादन के लिए लोड हो गया है!`, "Batch Loaded", "ℹ️");
    } catch (err) { 
        console.error("Batch Loading Error:", err); 
    }
};
