// ========================================================
// 🏦 CORE ENGINE: JARVIS ACCOUNTS MANAGER (SAVING ACCOUNTS)
// ========================================================

window.initAccountsManagerPage = async function(currentUser) {
    console.log("⚡ Jarvis Accounts Manager Engine Initializing...");

    const form = document.getElementById('form-accounts-manager-master');
    const inputAccNumber = document.getElementById('acc-manager-number');
    const inputHolderName = document.getElementById('acc-manager-holder');
    const inputBankName = document.getElementById('acc-manager-bank');
    const inputIfsc = document.getElementById('acc-manager-ifsc');
    const inputAadhar = document.getElementById('acc-manager-aadhar');
    const inputBalance = document.getElementById('acc-manager-balance');
    
    const btnSave = document.getElementById('btn-acc-manager-save');
    const btnClear = document.getElementById('btn-acc-manager-clear');
    const formTitle = document.getElementById('acc-manager-form-title');
    const lblBalance = document.getElementById('lbl-acc-manager-balance');

    // State tracks
    let currentActiveType = 'saving'; // Default type
    let currentEditingAccId = null;

    // 🔄 Boot core configuration setup
    function bootAccountsManager() {
        if (form) form.reset();
        currentEditingAccId = null;
        if (btnSave) btnSave.innerText = `➕ Add Link ${currentActiveType.toUpperCase()} Account`;
        
        // Render current category table data layout
        renderLinkedAccountsTable();
    }

   // 📑 [TABS TOGGLE LOGIC SWITCHER]: Fully Fixed Maroon Theme Toggle
    document.querySelectorAll('.account-tab').forEach(tab => {
        tab.onclick = function() {
            // Puraane saare tabs ko reset (deactivate) karein
            document.querySelectorAll('.account-tab').forEach(t => {
                t.style.background = '#e9ecef';
                t.style.color = '#333';
                t.classList.remove('active');
            });

            // ⭐ FIX: Active tab ko ab Blue ke bajay pure Jarvis Maroon (#7d0022) rang milega
            this.style.background = '#7d0022';
            this.style.color = 'white';
            this.classList.add('active');

            currentActiveType = this.getAttribute('data-type');
            
            // Dynamics headers update text
            if(formTitle) formTitle.innerText = `🏦 खाता प्रबंधक (${currentActiveType.toUpperCase()} Account)`;
            if(lblBalance) {
                lblBalance.innerText = currentActiveType === 'loan' ? "Loan Outstanding Balance (₹):" : "Opening / Current Balance (₹):";
            }

            if (currentActiveType !== 'saving') {
                console.log(`ℹ️ Switch to ${currentActiveType} mode layout template ready.`);
            }

            bootAccountsManager();
        };
    });

    // 📊 [RENDER FUNCTION FOR ACCOUNTS TABLE GRID]
    async function renderLinkedAccountsTable() {
        const tableBody = document.getElementById('acc-manager-table-body');
        if (!tableBody) return;

        try {
            // Fetch records filtered by active dynamic type context
            const { data: accounts, error } = await window.supabaseClient
                .from('saving_bank_accounts')
                .select('*')
                .eq('ko_code', currentUser.ko_code)
                .eq('account_type', currentActiveType)
                .order('created_at', { ascending: false });

            if (error) {
                console.warn("Table fetch error or missing:", error.message);
                tableBody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: red;">Failed to load data from database.</td></tr>`;
                return;
            }

            if (!accounts || accounts.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" style="padding: 30px; text-align: center; color: #888; font-style: italic;">No active ${currentActiveType} accounts linked yet.</td></tr>`;
                return;
            }

            tableBody.innerHTML = accounts.map(acc => `
                <tr style="border-bottom: 1px solid #dee2e6; vertical-align: middle; background: ${currentEditingAccId === acc.id ? '#fff3cd' : 'transparent'};">
                    <td style="padding: 12px;">
                        <div style="font-weight: bold; color: #0056b3;">${acc.bank_name}</div>
                        <div style="font-size: 0.85rem; color: #555; letter-spacing: 0.5px;">A/C: ${acc.account_number}</div>
                    </td>
                    <td style="padding: 12px;">
                        <div style="font-weight: 500; color: #333;">${acc.account_holder_name}</div>
                        <div style="font-size: 0.8rem; color: #e67e22; font-weight:600;">
                            ${acc.aadhar_number ? '🆔 Aadhaar Linked' : '⚠️ No Aadhaar'}
                        </div>
                    </td>
                    <td style="padding: 12px; font-weight: 600; color: #495057; text-transform: uppercase; font-size: 0.85rem;">
                        ${acc.ifsc_code}
                    </td>
                    <td style="padding: 12px; text-align: right; font-weight: bold; color: ${currentActiveType === 'loan' ? '#c0392b' : '#28a745'}; font-size: 1rem;">
                        ₹${parseFloat(acc.balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style="padding: 12px; text-align: center; white-space: nowrap;">
                        <button onclick="window.editBankAccount('${acc.id}')" style="background:#007bff; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-weight:600; font-size:0.8rem; margin-right:4px;">✏️ Edit</button>
                        <button onclick="window.removeBankAccount('${acc.id}', '${acc.account_number}')" style="background:#dc3545; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-weight:600; font-size:0.8rem;">🗑️ Remove</button>
                    </td>
                </tr>
            `).join('');

        } catch (err) {
            console.error("Error rendering bank accounts grid:", err);
            tableBody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: red;">System rendering crash.</td></tr>`;
        }
    }

    // 🚀 [INSERT OR UPDATE ACCOUNT ROUTINE]
    if (form) {
        form.onsubmit = async function(e) {
            e.preventDefault();

            const accNumVal = inputAccNumber.value.trim();
            const holderNameVal = inputHolderName.value.trim();
            const bankNameVal = inputBankName.value.trim();
            const ifscVal = inputIfsc.value.trim().toUpperCase();
            const aadharVal = inputAadhar.value.trim();
            const balanceVal = parseFloat(inputBalance.value) || 0;

            if (!accNumVal || !holderNameVal || !bankNameVal || !ifscVal) {
                window.showSystemAlert("कृपया सभी आवश्यक फ़ील्ड्स को सही ढंग से भरें!", "Validation Error", "⚠️");
                return;
            }

            try {
                if (btnSave) {
                    btnSave.disabled = true;
                    btnSave.innerText = "Processing Sync Vault...";
                }

                const accountPayload = {
                    ko_code: currentUser.ko_code,
                    account_number: accNumVal,
                    account_holder_name: holderNameVal,
                    bank_name: bankNameVal,
                    ifsc_code: ifscVal,
                    aadhar_number: aadharVal ? aadharVal : null,
                    account_type: currentActiveType,
                    balance: balanceVal
                };

                if (currentEditingAccId) {
                    // Update flow logic loop execution mapping
                    const { error: updateErr } = await window.supabaseClient
                        .from('saving_bank_accounts')
                        .update(accountPayload)
                        .eq('id', currentEditingAccId);

                    if (updateErr) throw updateErr;
                    window.showSystemAlert("🔄 बैंक खाता विवरण सफलतापूर्वक संशोधित कर दिया गया है।", "Account Updated", "✅");
                } else {
                    // New account sequence entry loop layout
                    accountPayload.created_at = new Date().toISOString();
                    const { error: insertErr } = await window.supabaseClient
                        .from('saving_bank_accounts')
                        .insert([accountPayload]);

                    if (insertErr) {
                        if (insertErr.code === '23505') {
                            window.showSystemAlert("यह अकाउंट नंबर आपके पोर्टल पर पहले से ही लिंक है!", "Duplicate Account", "⚠️");
                        } else {
                            throw insertErr;
                        }
                        return;
                    }
                    window.showSystemAlert("🎉 नया बैंक अकाउंट सफलतापूर्वक लिंक कर दिया गया है।", "Account Linked", "✅");
                }

                bootAccountsManager();

            } catch (err) {
                console.error("Master account insertion fail stack:", err);
                window.showSystemAlert("डेटाबेस स्टॉक अपडेट विफल हुआ।", "Database Error", "❌");
            } finally {
                if (btnSave) {
                    btnSave.disabled = false;
                    btnSave.innerText = currentEditingAccId ? `🔄 Update ${currentActiveType.toUpperCase()} Account` : `➕ Add Link ${currentActiveType.toUpperCase()} Account`;
                }
            }
        };
    }

    // ✏️ [EDIT DATA RETRIEVAL HUB TRIGGER]
    window.editBankAccount = async function(id) {
        if(!id) return;
        try {
            const { data: acc, error } = await window.supabaseClient
                .from('saving_bank_accounts')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (error || !acc) {
                window.showSystemAlert("विवरण लोड करने में विफलता।", "Fetch Error", "❌");
                return;
            }

            // Hydrate values inside inputs interface
            currentEditingAccId = id;
            if (inputAccNumber) inputAccNumber.value = acc.account_number || "";
            if (inputHolderName) inputHolderName.value = acc.account_holder_name || "";
            if (inputBankName) inputBankName.value = acc.bank_name || "";
            if (inputIfsc) inputIfsc.value = acc.ifsc_code || "";
            if (inputAadhar) inputAadhar.value = acc.aadhar_number || "";
            if (inputBalance) inputBalance.value = acc.balance || 0;

            if (btnSave) btnSave.innerText = `🔄 Update ${currentActiveType.toUpperCase()} Account`;
            
            // Flash table style selection view highlights
            renderLinkedAccountsTable();

        } catch(e) { console.error(e); }
    };

    // 🗑️ [REMOVE ACCOUNT SYSTEM]
    window.removeBankAccount = async function(id, accNumber) {
        if (!id) return;

        if (window.showSystemConfirm) {
            window.showSystemConfirm(
                `क्या आप अकाउंट नंबर ...${accNumber.slice(-4)} को स्थायी रूप से पोर्टल से हटाना (Remove) चाहते हैं?`, 
                "Remove Account Confirmation", 
                async function() {
                    try {
                        const { error: deleteErr } = await window.supabaseClient
                            .from('saving_bank_accounts')
                            .delete()
                            .eq('id', id);

                        if (deleteErr) throw deleteErr;

                        window.showSystemAlert("बैंक खाता सफलतापूर्वक पोर्टल से हटा दिया गया है।", "Account Removed", "✅");
                        bootAccountsManager();

                    } catch (err) {
                        console.error("Account removal fail stack:", err);
                        window.showSystemAlert("खाता हटाने की प्रक्रिया विफल हुई।", "Error", "❌");
                    }
                }
            );
        }
    };

    if (btnClear) {
        btnClear.onclick = function() { bootAccountsManager(); };
    }

    bootAccountsManager();
};
