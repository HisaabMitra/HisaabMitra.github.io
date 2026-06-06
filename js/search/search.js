// ========================================================
// 🔍 ULTRA-COMPACT UNIVERSAL MULTI-PARAMETER SEARCH ENGINE
// ========================================================

window.initSearchModule = async function() {
    console.log("⚡ Jarvis Quick Radar Search Engine Initializing...");

    // UI Elements Hooking
    const universalInput = document.getElementById('srch-universal-input');
    const fromDateInput = document.getElementById('srch-from-date');
    const toDateInput = document.getElementById('srch-to-date');
    const tbody = document.getElementById('search-results-body');
    const counterBadge = document.getElementById('srch-counter-badge');

    const btnExecute = document.getElementById('btn-srch-execute');
    const btnReset = document.getElementById('btn-srch-reset');

    // Default Date Sync: Set current date as default placeholder space
    const today = new Date().toISOString().split('T')[0];
    if (fromDateInput) fromDateInput.value = today;
    if (toDateInput) toDateInput.value = today;

    // Core Execution Logic Pipeline
    if (btnExecute) {
        btnExecute.onclick = async function() {
            try {
                const searchStr = universalInput.value.trim().toLowerCase();
                const fromDate = fromDateInput.value;
                const toDate = toDateInput.value;

                if (!tbody) return;
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#555;">⚡ Scanning all ledger streams...</td></tr>`;
                
                btnExecute.disabled = true;
                btnExecute.innerText = "Scanning...";

                const client = window.supabaseClient || window.supabase;
                const currentKo = window.currentUser?.ko_code || "";

                // Date Bounds Configuration (Include full hours mapping for today UTC timeline)
                const startRange = fromDate ? `${fromDate}T00:00:00` : "1970-01-01T00:00:00";
                const endRange = toDate ? `${toDate}T23:59:59` : new Date().toISOString();

                // 🚀 Parallel Async Database Streams Retrieval
                const [depositRes, withdrawalRes, transferRes] = await Promise.all([
                    client.from('deposit_transactions').select('*').eq('ko_code', currentKo).gte('transaction_date', startRange).lte('transaction_date', endRange),
                    client.from('withdrawal_transactions').select('*').eq('ko_code', currentKo).gte('transaction_date', startRange).lte('transaction_date', endRange),
                    client.from('fund_transfers').select('*').eq('ko_code', currentKo).gte('transaction_date', startRange).lte('transaction_date', endRange)
                ]);

                let rawMergedLogs = [];

                // 1. Compile Deposits Stream
                if (depositRes.data) {
                    depositRes.data.forEach(tx => {
                        rawMergedLogs.push({
                            id: tx.id,
                            type: 'DEPOSIT',
                            badgeColor: '#2e7d32',
                            bgBadge: '#e8f5e9',
                            identifier: tx.account_number || tx.aadhaar_number || tx.customer_id || "",
                            customer_name: tx.customer_name || "UNKNOWN",
                            amount: parseFloat(tx.amount) || 0,
                            date: tx.transaction_date,
                            remarks: tx.remarks || "Kiosk Deposit Entry"
                        });
                    });
                }

                // 2. Compile Withdrawals Stream
                if (withdrawalRes.data) {
                    withdrawalRes.data.forEach(tx => {
                        rawMergedLogs.push({
                            id: tx.id,
                            type: 'WITHDRAWAL',
                            badgeColor: '#c62828',
                            bgBadge: '#ffebee',
                            identifier: tx.aadhaar_number || tx.account_number || "",
                            customer_name: tx.customer_name || "UNKNOWN",
                            amount: parseFloat(tx.amount) || 0,
                            date: tx.transaction_date,
                            remarks: tx.remarks || "AEPS Cash Withdrawal"
                        });
                    });
                }

                // 3. Compile Fund Transfers Stream
                if (transferRes.data) {
                    transferRes.data.forEach(tx => {
                        rawMergedLogs.push({
                            id: tx.id,
                            type: 'TRANSFER',
                            badgeColor: '#1565c0',
                            bgBadge: '#e3f2fd',
                            identifier: `${tx.from_aadhaar} ➔ ${tx.to_aadhaar}`,
                            customer_name: `${tx.from_customer_name} ➔ ${tx.to_customer_name}`,
                            amount: parseFloat(tx.amount) || 0,
                            date: tx.transaction_date,
                            remarks: tx.remarks || "Direct Wallet Routing"
                        });
                    });
                }

                // ⏳ Chronological Matrix Sorting (Latest transactions show first)
                rawMergedLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

                // 🔍 Apply Universal Search Text Filters
                let filteredLogs = rawMergedLogs;
                if (searchStr) {
                    filteredLogs = rawMergedLogs.filter(log => {
                        return log.identifier.toLowerCase().includes(searchStr) ||
                               log.customer_name.toLowerCase().includes(searchStr) ||
                               log.remarks.toLowerCase().includes(searchStr) ||
                               log.amount.toString().includes(searchStr);
                    });
                }

                // 📊 Render Grid Table Output
                tbody.innerHTML = '';
                if (counterBadge) counterBadge.innerText = `Found: ${filteredLogs.length} records`;

                if (filteredLogs.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:25px; color:#888; font-style:italic;">🔍 Criteria matching record logs not found in counter vault.</td></tr>`;
                    return;
                }

                filteredLogs.forEach((log, index) => {
                    const parsedDate = new Date(log.date);
                    const displayDateTime = parsedDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) + 
                                           ` (${parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;

                    tbody.insertAdjacentHTML('beforeend', `
                        <tr style="border-bottom: 1px solid #eef0f2; vertical-align: middle;">
                            <td style="padding:12px; text-align:center; font-weight:bold; color:#777;">${index + 1}</td>
                            <td style="padding:12px;">
                                <span style="background: ${log.bgBadge}; color: ${log.badgeColor}; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 0.75rem; letter-spacing:0.5px; display:inline-block;">
                                    ${log.type}
                                </span>
                            </td>
                            <td style="padding:12px; font-weight:600; line-height:1.3;">
                                <span style="color:#212529; font-size:0.95rem;">${log.identifier}</span><br>
                                <small style="color:#6c757d; font-weight:normal; text-transform:uppercase;">${log.customer_name}</small>
                            </td>
                            <td style="padding:12px; font-weight:bold; color:${log.badgeColor}; font-size:0.95rem;">₹${log.amount.toFixed(2)}</td>
                            <td style="padding:12px; color:#495057; font-size:0.85rem; white-space:nowrap;">${displayDateTime}</td>
                            <td style="padding:12px; color:#555; font-size:0.85rem; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${log.remarks}">
                                ${log.remarks}
                            </td>
                        </tr>
                    `);
                });

            } catch (err) {
                console.error("Critical Search Failure Execution Stack:", err);
                if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:red;">❌ Core Engine Failure matching query parameters.</td></tr>`;
            } finally {
                btnExecute.disabled = false;
                btnExecute.innerText = "⚡ Execute Query";
            }
        };
    }

    // 🧹 Reset Configuration Hub Selector
    if (btnReset) {
        btnReset.onclick = function() {
            if (universalInput) universalInput.value = "";
            if (fromDateInput) fromDateInput.value = today;
            if (toDateInput) toDateInput.value = today;
            if (counterBadge) counterBadge.innerText = "Found: 0 records";
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#6c757d; font-style: italic;">Enter search parameters and click Execute Query...</td></tr>`;
            }
        };
    }
};
