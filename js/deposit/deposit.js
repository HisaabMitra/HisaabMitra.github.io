// js/deposit/deposit.js
window.initDepositPage = async function (currentUser) {
    const workspace = document.getElementById('workspace');
    if (!workspace) return;

    try {
        const koCodeLabel = document.getElementById('lbl-ko-code');
        if (koCodeLabel) koCodeLabel.innerText = currentUser.ko_code;

        if (window.DenominationComponent) {
            setTimeout(() => {
                window.DenominationComponent.render('denomination-widget-container');
            }, 100); 
        }

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
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px; color:#777;">आज कोई ट्रांजैक्शन नहीं मिला</td></tr>';
                    return;
                }

                data.forEach(tx => {
                    const time = new Date(tx.transaction_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const identifier = tx.bulk_id ? `📦 ${tx.bulk_id}` : tx.account_number;
                    const displayName = tx.bulk_id ? `Depositor: ${tx.depositor_name || 'N/A'}` : tx.customer_name;
                    const txStr = btoa(JSON.stringify(tx));

                    tbody.insertAdjacentHTML('beforeend', `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding:12px;">${identifier}</td>
                            <td style="padding:12px; text-transform: uppercase;">${displayName}</td>
                            <td style="padding:12px; font-weight:bold; color:#27ae60;">₹${tx.amount}</td>
                            <td style="padding:12px;">${time}</td>
                        </tr>
                    `);
                });
            } catch (err) { console.error(err); }
        }

        window.loadTodayTransactions = loadTodayTransactions;
        loadTodayTransactions();

        // एलिमेंट्स मैपिंग
        const accInput = document.getElementById('dep-account-no');
        const custNameInput = document.getElementById('dep-cust-name');
        const amountInput = document.getElementById('dep-amount');
        const wordsDisplay = document.getElementById('dep-amount-words');

        if(amountInput) {
            amountInput.addEventListener('input', () => {
                const amt = parseInt(amountInput.value) || 0;
                wordsDisplay.innerText = amt === 0 ? "Zero Rupees Only" : `${window.numberToHindiWords(amt)} रुपए मात्र`;
            });
        }

        // 🏦 कस्टमर सर्च
        if(accInput) {
            accInput.addEventListener('blur', async () => {
                let accountNo = accInput.value.trim();
                if (!accountNo) return;
                custNameInput.value = "Searching ledger...";
                try {
                    const { data } = await window.supabaseClient.from('banking_customers').select('customer_name').eq('account_number', accountNo).maybeSingle();
                    if (data) {
                        custNameInput.value = data.customer_name.toUpperCase();
                    } else {
                        custNameInput.value = "";
                        window.showSystemAlert("खाता संख्या पंजीकृत नहीं है!", "Not Found", "❌");
                    }
                } catch (e) { custNameInput.value = ""; }
            });
        }

        function masterFormClear() {
            if (accInput) accInput.value = ""; 
            if (custNameInput) custNameInput.value = ""; 
            if (amountInput) amountInput.value = ""; 
            if (wordsDisplay) wordsDisplay.innerText = "Zero Rupees Only";
            if (window.DenominationComponent) window.DenominationComponent.clear();
            
            const saveBtn = document.getElementById('btn-dep-save');
            if (saveBtn) {
                saveBtn.innerText = "💾 Save";
                saveBtn.style.background = "#7d0022";
                delete saveBtn.dataset.mode;
            }
        }
        document.getElementById('btn-dep-clear').onclick = masterFormClear;

        // ========================================================
        // 🔄 IN-PAGE 100% FIXED LOCAL BLOCK SWITCHER
        // ========================================================
        const switchBtn = document.getElementById('btn-switch-deposit-mode');
        if (switchBtn) {
            switchBtn.onclick = function() {
                const currentMode = switchBtn.getAttribute('data-current-mode');
                const singleWrapper = document.getElementById('single-deposit-view-wrapper');
                const bulkWrapper = document.getElementById('bulk-deposit-view-wrapper');
                const titleLabel = document.getElementById('deposit-module-title');

                if (currentMode === 'single') {
                    singleWrapper.classList.add('hidden-block');
                    bulkWrapper.classList.remove('hidden-block');

                    titleLabel.innerHTML = "📦 BULK DEPOSIT MANAGEMENT";
                    switchBtn.textContent = "👤 Switch to Single Counter";
                    switchBtn.style.background = "#27ae60"; 
                    switchBtn.setAttribute('data-current-mode', 'bulk');

                    // बल्क इंजन को तुरंत शुरू करें
                    if (typeof window.initBulkDepositPage === 'function') {
                        window.initBulkDepositPage(currentUser);
                    }
                } else {
                    bulkWrapper.classList.add('hidden-block');
                    singleWrapper.classList.remove('hidden-block');

                    titleLabel.innerHTML = "SINGLE CASH COUNTER";
                    switchBtn.textContent = "📦 Switch to Bulk Deposit";
                    switchBtn.style.background = "#f2994a"; 
                    switchBtn.setAttribute('data-current-mode', 'single');

                    masterFormClear();
                    loadTodayTransactions();
                }
            };
        }

    } catch (error) { console.error(error); }
};
