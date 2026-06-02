// ========================================================
// 📦 BULK DEPOSIT CONTROLLER & LIVE AUTO-REGISTRATION ENGINE
// ========================================================

let bulkRowCounter = 0;
let globalCurrentUser = null; 

window.initBulkDepositPage = async function (currentUser) {
    console.log("Bulk Deposit Engine Initializing...");
    try {
        globalCurrentUser = currentUser; 

        const koCodeLabel = document.getElementById('lbl-bulk-ko-code');
        if (koCodeLabel) koCodeLabel.innerText = currentUser.ko_code;

        // 💥 [MASTER DENOMINATION FIX FOR BULK]
        if (window.DenominationComponent) {
            setTimeout(() => {
                window.DenominationComponent.clear();
                window.DenominationComponent.render('bulk-denomination-container');
                
                // बल्क कंटेनर के अंदर नोटों के बदलाव को ट्रैक करें
                const bulkDenomContainer = document.getElementById('bulk-denomination-container');
                if (bulkDenomContainer) {
                    bulkDenomContainer.querySelectorAll('.denom-in, .denom-out').forEach(input => {
                        input.addEventListener('input', () => {
                            // ओवरराइड कैलकुलेशन जो सिर्फ बल्क ग्रिड को ट्रिगर करेगी
                            if (typeof window.DenominationComponent.calculate === 'function') {
                                window.DenominationComponent.calculate();
                            }
                        });
                    });
                }
            }, 150);
        }

        const tbody = document.getElementById('bulk-accounts-tbody');
        if (tbody) {
            tbody.innerHTML = ''; 
            window.addNewBulkRow();
        }

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
                
                if (window.DenominationComponent && typeof window.DenominationComponent.clear === 'function') {
                    window.DenominationComponent.clear();
                }
                
                window.addNewBulkRow();
                console.log("Bulk Form Reset Done.");
            };
        }

        const addRowBtn = document.getElementById('btn-bulk-add-row');
        if (addRowBtn) {
            addRowBtn.onclick = window.addNewBulkRow;
        }

    } catch (err) {
        console.error("Bulk Initializer Core Error:", err);
    }
};

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

function formatBulkAccountNumber(inputAcc, solId) {
    let acc = inputAcc.trim();
    if (acc.length > 10 || !acc.includes('-')) return acc;
    const parts = acc.split('-');
    return `${solId}${parts[0].padStart(2, '0')}${parts[1].padStart(8, '0')}`;
}

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
