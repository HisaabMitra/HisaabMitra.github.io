// ========================================================
// 📦 BULK DEPOSIT CONTROLLER & LIVE AUTO-REGISTRATION ENGINE
// ========================================================

let bulkRowCounter = 0;

// 🌟 [CRITICAL FIX]: इसे सीधे window ऑब्जेक्ट पर बाइंड किया ताकि deposit.js इसे ढूंढ सके
window.initBulkDepositPage = async function (currentUser) {
    console.log("Bulk Deposit Engine Initializing...");

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
        if (tbody) {
            tbody.innerHTML = ''; // पुराना कोई भी कचरा साफ़ करें
            window.addNewBulkRow();
        }

        // [4] 🧹 Clear / रीसेट ऑल बटन लॉजिक (आईडी 'btn-bulk-dep-clear' के साथ सिंक)
        const clearBtn = document.getElementById('btn-bulk-dep-clear');
        if (clearBtn) {
            clearBtn.onclick = function() {
                document.getElementById('bulk-depositor-name').value = "";
                document.getElementById('bulk-depositor-mobile').value = "";
                const accountsTbody = document.getElementById('bulk-accounts-tbody');
                if (accountsTbody) accountsTbody.innerHTML = "";
                document.getElementById('lbl-bulk-grand-total').innerText = "₹0.00";
                
                // डिनॉमिनेशन कॉम्पोनेन्ट को रीसेट करें
                if (window.DenominationComponent && typeof window.DenominationComponent.clear === 'function') {
                    window.DenominationComponent.clear();
                }
                
                window.addNewBulkRow();
                console.log("Bulk Form Reset Done.");
            };
        }

        // [5] ➕ '+ Add Row' बटन को इवेंट असाइन करें (बिना DOMContentLoaded के झंझट के)
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
                nameInput.value = customer.customer_name.toUpperCase();
                amtInput.focus(); 
            } else {
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

    amtInput.addEventListener('input', () => {
        window.calculateBulkGrandTotal();
    });
}

// [D] नया ग्राहक पंजीकरण मॉडल ऑपरेशंस (प्रॉम्ट मैकेनिज्म)
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
