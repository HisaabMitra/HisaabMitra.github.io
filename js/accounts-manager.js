// ========================================================
// 🏦 CORE ENGINE: JARVIS ACCOUNTS MANAGER (SAVING ACCOUNTS)
// ========================================================

window.initAccountsManagerPage = async function(currentUser) {
    console.log("⚡ Jarvis Accounts Manager Engine Initializing...");

    // HTML elements ke references grab karein
    const form = document.getElementById('form-accounts-manager-master');
    const inputAccNumber = document.getElementById('acc-manager-number');
    const inputHolderName = document.getElementById('acc-manager-holder');
    const inputBankName = document.getElementById('acc-manager-bank');
    const inputIfsc = document.getElementById('acc-manager-ifsc');
    const inputBalance = document.getElementById('acc-manager-balance');
    
    const btnSave = document.getElementById('btn-acc-manager-save');
    const btnClear = document.getElementById('btn-acc-manager-clear');

    // 🔄 Form aur Grid load karne ka system trigger
    function bootAccountsManager() {
        if (form) form.reset();
        if (btnSave) btnSave.innerText = "➕ Add Link Account";
        
        // Dynamic accounts list ko table me load karein
        renderLinkedAccountsTable();
    }

    // 📊 [RENDER FUNCTION FOR ACCOUNTS TABLE GRID]
    async function renderLinkedAccountsTable() {
        const tableBody = document.getElementById('acc-manager-table-body');
        if (!tableBody) return;

        try {
            // Supabase table 'saving_bank_accounts' se data fetch karein
            const { data: accounts, error } = await window.supabaseClient
                .from('saving_bank_accounts')
                .select('*')
                .eq('ko_code', currentUser.ko_code)
                .order('created_at', { ascending: false });

            if (error) {
                console.warn("Table fetch error or missing:", error.message);
                tableBody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: red;">Failed to load accounts table.</td></tr>`;
                return;
            }

            if (!accounts || accounts.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" style="padding: 30px; text-align: center; color: #888; font-style: italic;">No saving accounts linked yet. Use the left panel to configure nodes.</td></tr>`;
                return;
            }

            // Table rows inject karein
            tableBody.innerHTML = accounts.map(acc => `
                <tr style="border-bottom: 1px solid #dee2e6; vertical-align: middle;">
                    <td style="padding: 12px;">
                        <div style="font-weight: bold; color: #0056b3;">${acc.bank_name}</div>
                        <div style="font-size: 0.85rem; color: #555; letter-spacing: 0.5px;">A/C: ${acc.account_number}</div>
                    </td>
                    <td style="padding: 12px;">
                        <div style="font-weight: 500; color: #333;">${acc.account_holder_name}</div>
                        <div style="font-size: 0.8rem; color: #777; text-transform: uppercase;">Type: ${acc.account_type || 'saving'}</div>
                    </td>
                    <td style="padding: 12px; font-weight: 600; color: #495057; text-transform: uppercase; font-size: 0.85rem;">
                        ${acc.ifsc_code}
                    </td>
                    <td style="padding: 12px; text-align: right; font-weight: bold; color: #28a745; font-size: 1rem;">
                        ₹${parseFloat(acc.balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        <button onclick="window.removeBankAccount('${acc.id}', '${acc.account_number}')" style="background:#dc3545; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-weight:600; font-size:0.8rem; transition: 0.2s;">🗑️ Remove</button>
                    </td>
                </tr>
            `).join('');

        } catch (err) {
            console.error("Error rendering bank accounts grid:", err);
            tableBody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: red;">System crash while rendering table.</td></tr>`;
        }
    }

    // 🚀 [INSERT NEW ACCOUNT ROUTINE]
    if (form) {
        form.onsubmit = async function(e) {
            e.preventDefault(); // Default submit refresh rokein

            const accNumVal = inputAccNumber.value.trim();
            const holderNameVal = inputHolderName.value.trim();
            const bankNameVal = inputBankName.value.trim();
            const ifscVal = inputIfsc.value.trim().toUpperCase();
            const balanceVal = parseFloat(inputBalance.value) || 0;

            if (!accNumVal || !holderNameVal || !bankNameVal || !ifscVal) {
                window.showSystemAlert("कृपया सभी आवश्यक फ़ील्ड्स को सही ढंग से भरें!", "Validation Error", "⚠️");
                return;
            }

            try {
                if (btnSave) {
                    btnSave.disabled = true;
                    btnSave.innerText = "Linking Account Nodes...";
                }

                // Payload taiyar karein (Aapki saving_bank_accounts table ke mapping ke hisab se)
                const accountPayload = {
                    ko_code: currentUser.ko_code,
                    account_number: accNumVal,
                    account_holder_name: holderNameVal,
                    bank_name: bankNameVal,
                    ifsc_code: ifscVal,
                    account_type: 'saving', // Default configuration
                    balance: balanceVal,
                    created_at: new Date().toISOString()
                };

                // Supabase me direct row insert karein
                const { error: insertErr } = await window.supabaseClient
                    .from('saving_bank_accounts')
                    .insert([accountPayload]);

                if (insertErr) {
                    // Agar unique constraint break hoga toh error handle hoga
                    if (insertErr.code === '23505') {
                        window.showSystemAlert("यह अकाउंट नंबर आपके पोर्टल पर पहले से ही लिंक है!", "Duplicate Account", "⚠️");
                    } else {
                        throw insertErr;
                    }
                    return;
                }

                window.showSystemAlert("🎉 नया बैंक अकाउंट सफलतापूर्वक लिंक कर दिया गया है।", "Account Linked", "✅");
                bootAccountsManager(); // Reset form and refresh table views

            } catch (err) {
                console.error("Master account insertion fail stack:", err);
                window.showSystemAlert("डेटाबेस में खाता लिंक करने की प्रक्रिया विफल हुई।", "Database Error", "❌");
            } finally {
                if (btnSave) {
                    btnSave.disabled = false;
                    btnSave.innerText = "➕ Add Link Account";
                }
            }
        };
    }

    // 🧹 [CLEAR FORM ACTION TRIGGER]
    if (btnClear) {
        btnClear.onclick = function() {
            if (form) form.reset();
        };
    }

    // 🗑️ [REMOVE ACCOUNT SYSTEM]: Custom Dynamic confirmation panel hook 
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
                        bootAccountsManager(); // Views list refresh

                    } catch (err) {
                        console.error("Account removal fail stack:", err);
                        window.showSystemAlert("खाता हटाने की प्रक्रिया विफल हुई।", "Error", "❌");
                    }
                }
            );
        } else {
            // Safe Native Fallback
            if (confirm(`क्या आप अकाउंट नंबर ...${accNumber.slice(-4)} को हटाना चाहते हैं?`)) {
                try {
                    await window.supabaseClient.from('saving_bank_accounts').delete().eq('id', id);
                    bootAccountsManager();
                } catch(e) { console.error(e); }
            }
        }
    };

    // Run direct initial boot workflow on tab opening trigger
    bootAccountsManager();
};
