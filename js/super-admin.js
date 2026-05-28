// js/super-admin.js

async function initSuperAdminModule() {
    const pendingTable = document.getElementById('sa-pending-table');
    const activeTable = document.getElementById('sa-active-users-table');
    const performanceTable = document.getElementById('sa-performance-table');

    if (!pendingTable) return;

    // 1. पेंडिंग यूज़र्स लोड करना
    async function loadPendingRequests() {
        try {
            const { data: users, error } = await window.supabaseClient
                .from('user_roles')
                .select('*')
                .eq('status', 'pending');

            if (error) throw error;
            if (!users || users.length === 0) {
                pendingTable.innerHTML = `<tr><td colspan="5" style="padding: 15px; text-align: center; color: green; font-weight:bold;">🎉 No pending registration requests.</td></tr>`;
                return;
            }

            pendingTable.innerHTML = '';
            users.forEach(user => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #eee';
                tr.innerHTML = `
                    <td style="padding: 12px; font-weight:600;">${user.full_name}</td>
                    <td style="padding: 12px;">${user.email}</td>
                    <td style="padding: 12px;"><span style="background:#eee; padding:3px 6px; border-radius:4px;">${user.role.toUpperCase()}</span></td>
                    <td style="padding: 12px;"><input type="text" id="objection-${user.id}" placeholder="e.g., Wrong Branch Code" style="width:90%; padding:6px; border:1px solid #ccc; border-radius:4px;"></td>
                    <td style="padding: 12px; text-align: center; display:flex; gap:8px; justify-content:center;">
                        <button class="p-btn apr-btn" data-id="${user.id}" style="background:#137333; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer;">Approve (6M)</button>
                        <button class="p-btn rej-btn" data-id="${user.id}" style="background:#c5221f; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer;">Reject</button>
                    </td>
                `;
                pendingTable.appendChild(tr);
            });
            attachPendingListeners();
        } catch (err) {
            pendingTable.innerHTML = `<tr><td colspan="5" style="padding:15px; color:red;">Error loading vault.</td></tr>`;
        }
    }

    function attachPendingListeners() {
        document.querySelectorAll('.p-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const uid = e.target.getAttribute('data-id');
                const isApprove = e.target.classList.contains('apr-btn');
                const objectionNote = document.getElementById(`objection-${uid}`).value.trim();
                
                let updateData = {};
                if (isApprove) {
                    // आज की तारीख से ठीक 6 महीने (180 दिन) बाद की तारीख निकालना
                    let expiry = new Date();
                    expiry.setDate(expiry.getDate() + 180;
                    
                    updateData = { status: 'approved', expiry_date: expiry.toISOString(), objection_remark: null };
                } else {
                    updateData = { status: 'rejected', objection_remark: objectionNote || "Rejected by Super Admin" };
                }

                try {
                    const { error } = await window.supabaseClient.from('user_roles').update(updateData).eq('id', uid);
                    if (error) throw error;
                    alert(isApprove ? "✅ User Approved with 6 Months validity!" : "❌ User Request Rejected.");
                    refreshAllTables();
                } catch (err) { alert(err.message); }
            });
        });
    }

    // 2. एक्टिव यूज़र्स मैनेज करना (Renew / Unauthorize)
    async function loadActiveUsers() {
        try {
            const { data: users, error } = await window.supabaseClient
                .from('user_roles')
                .select('*')
                .neq('role', 'super_admin'); // खुद को लिस्ट में न दिखाएं

            if (error) throw error;
            if (!users || users.length === 0) {
                activeTable.innerHTML = `<tr><td colspan="5" style="padding: 15px; text-align: center;">No registered system users found.</td></tr>`;
                return;
            }

            activeTable.innerHTML = '';
            users.forEach(user => {
                // एक्सपायरी डेट को सुंदर फॉर्मेट में दिखाना
                let expiryString = "No Limit";
                let statusColor = "green";
                let currentStatus = user.status.toUpperCase();

                if (user.expiry_date) {
                    const expDate = new Date(user.expiry_date);
                    expiryString = expDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                    if (expDate < new Date()) {
                        expiryString += " ⚠️ (EXPIRED)";
                        statusColor = "red";
                        currentStatus = "EXPIRED";
                    }
                }
                if (user.status === 'rejected') statusColor = "red";

                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #eee';
                tr.innerHTML = `
                    <td style="padding: 12px; font-weight:600;">${user.full_name}<br><small style="color:#777;">${user.email}</small></td>
                    <td style="padding: 12px;"><span style="background:#f0f0f0; padding:2px 6px; border-radius:4px;">${user.role.toUpperCase()}</span></td>
                    <td style="padding: 12px; color:${statusColor}; font-weight:bold;">${currentStatus}</td>
                    <td style="padding: 12px; font-weight:600;">${expiryString}</td>
                    <td style="padding: 12px; text-align: center; display:flex; gap:8px; justify-content:center;">
                        <button class="act-btn ren-btn" data-id="${user.id}" style="background:#137333; color:white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer; font-size:0.85rem;">+6 Months</button>
                        <button class="act-btn blk-btn" data-id="${user.id}" style="background:#222; color:white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer; font-size:0.85rem;">Unauthorize</button>
                    </td>
                `;
                activeTable.appendChild(tr);
            });
            attachActiveControlListeners();
        } catch (err) { console.error(err); }
    }

    function attachActiveControlListeners() {
        document.querySelectorAll('.act-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const uid = e.target.getAttribute('data-id');
                const isRenew = e.target.classList.contains('ren-btn');

                let updateData = {};
                if (isRenew) {
                    let newExp = new Date();
                    newExp.setDate(newExp.getDate() + 180);
                    updateData = { status: 'approved', expiry_date: newExp.toISOString() };
                } else {
                    updateData = { status: 'rejected', objection_remark: 'Unauthorized by Super Admin' };
                }

                try {
                    const { error } = await window.supabaseClient.from('user_roles').update(updateData).eq('id', uid);
                    if (error) throw error;
                    alert(isRenew ? "✅ User validity extended by 6 Months!" : "🚫 User Access Revoked (Blocked).");
                    refreshAllTables();
                } catch (err) { alert(err.message); }
            });
        });
    }

    // 3. एजेंट्स के बिजनेस का वॉल्यूम ट्रैक करना
    async function loadBusinessPerformance() {
        try {
            const { data: deposits, error } = await window.supabaseClient.from('deposits').select('amount, created_by');
            if (error) throw error;

            let systemLogs = {};
            deposits.forEach(d => {
                if (!systemLogs[d.created_by]) systemLogs[d.created_by] = { txCount: 0, cashSum: 0 };
                systemLogs[d.created_by].txCount += 1;
                systemLogs[d.created_by].cashSum += parseFloat(d.amount);
            });

            performanceTable.innerHTML = '';
            const uniqueIds = Object.keys(systemLogs);

            if (uniqueIds.length === 0) {
                performanceTable.innerHTML = `<tr><td colspan="3" style="padding:15px; text-align:center;">No operations registered in system.</td></tr>`;
                return;
            }

            uniqueIds.forEach(id => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #eee';
                tr.innerHTML = `
                    <td style="padding:12px; font-weight:600;">Counter Operator (ID: ${id.substring(0,8)}...)</td>
                    <td style="padding:12px;">${systemLogs[id].txCount} Transactions</td>
                    <td style="padding:12px; font-weight:bold; color:var(--color-maroon-dark);">₹ ${systemLogs[id].cashSum.toFixed(2)}</td>
                `;
                performanceTable.appendChild(tr);
            });
        } catch (err) { console.error(err); }
    }

    function refreshAllTables() {
        loadPendingRequests();
        loadActiveUsers();
        loadBusinessPerformance();
    }

    refreshAllTables();
}
