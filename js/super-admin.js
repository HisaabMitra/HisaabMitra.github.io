// js/super-admin.js

async function initSuperAdminModule() {
    const pendingTable = document.getElementById('sa-pending-table');
    const activeTable = document.getElementById('sa-active-users-table');
    const performanceTable = document.getElementById('sa-performance-table');

    if (!pendingTable || !activeTable) {
        console.warn("⚠️ Super Admin tables not found in DOM.");
        return;
    }

    // Supabase Client Check
    if (!window.supabaseClient) {
        console.error("❌ window.supabaseClient is not defined!");
        activeTable.innerHTML = `<tr><td colspan="5" style="padding:15px; color:red; text-align:center;">
            Supabase Client not initialized. Please check script loading order.
        </td></tr>`;
        return;
    }

    console.log("✅ Super Admin Module Initialized");

    // ==================== 1. PENDING REQUESTS ====================
    async function loadPendingRequests() {
        try {
            console.log("🔄 Loading pending requests...");
            const { data: users, error } = await window.supabaseClient
                .from('user_roles')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!users || users.length === 0) {
                pendingTable.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: green; font-weight:bold;">
                    🎉 No pending registration requests.
                </td></tr>`;
                return;
            }

            pendingTable.innerHTML = '';
            users.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 12px; font-weight:600;">${user.full_name || 'N/A'}</td>
                    <td style="padding: 12px;">${user.email || 'N/A'}</td>
                    <td style="padding: 12px;">
                        <span style="background:#eee; padding:3px 8px; border-radius:4px; font-size:0.9rem;">
                            ${user.role ? user.role.toUpperCase() : 'N/A'}
                        </span>
                    </td>
                    <td style="padding: 12px;">
                        <input type="text" id="objection-${user.id}" 
                               placeholder="Objection remark (optional)" 
                               style="width:95%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        <div style="display:flex; gap:8px; justify-content:center;">
                            <button class="p-btn apr-btn" data-id="${user.id}" 
                                style="background:#137333; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-weight:600;">
                                Approve (6M)
                            </button>
                            <button class="p-btn rej-btn" data-id="${user.id}" 
                                style="background:#c5221f; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-weight:600;">
                                Reject
                            </button>
                        </div>
                    </td>
                `;
                pendingTable.appendChild(tr);
            });

            attachPendingListeners();
        } catch (err) {
            console.error("Pending Requests Error:", err);
            pendingTable.innerHTML = `<tr><td colspan="5" style="padding:15px; color:red; text-align:center;">
                Error loading pending requests.<br><small>${err.message}</small>
            </td></tr>`;
        }
    }

    // ==================== 2. ACTIVE USERS ====================
    async function loadActiveUsers() {
        try {
            console.log("🔄 Loading active users...");
            const { data: users, error } = await window.supabaseClient
                .from('user_roles')
                .select('*')
                .neq('role', 'super_admin')
                .order('full_name', { ascending: true });

            if (error) throw error;

            activeTable.innerHTML = '';

            if (!users || users.length === 0) {
                activeTable.innerHTML = `<tr><td colspan="5" style="padding:20px; text-align:center; color:#666;">
                    No users found.
                </td></tr>`;
                return;
            }

            users.forEach(user => {
                if (user.status === 'pending') return;

                let expiryString = "No Expiry";
                let statusColor = "#137333";
                let currentStatus = user.status ? user.status.toUpperCase() : "UNKNOWN";

                if (user.expiry_date) {
                    const expDate = new Date(user.expiry_date);
                    expiryString = expDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

                    if (expDate < new Date() && user.status === 'approved') {
                        expiryString += " ⚠️ (EXPIRED)";
                        statusColor = "#c5221f";
                        currentStatus = "EXPIRED";
                    }
                }

                if (user.status === 'rejected') {
                    statusColor = "#c5221f";
                    expiryString = "Access Suspended";
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding:12px; font-weight:600;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            ${user.full_name}
                            <button class="view-details-btn" 
                                data-name="${user.full_name || ''}"
                                data-ko="${user.ko_code || 'N/A'}" 
                                data-mobile="${user.mobile_no || 'N/A'}"
                                title="View Details">
                                👁️
                            </button>
                        </div>
                        <small style="color:#777;">${user.email || ''}</small>
                    </td>
                    <td style="padding:12px;">
                        <span style="background:#f0f0f0; padding:3px 8px; border-radius:4px; font-size:0.85rem;">
                            ${user.role ? user.role.toUpperCase() : 'N/A'}
                        </span>
                    </td>
                    <td style="padding:12px; color:${statusColor}; font-weight:bold;">${currentStatus}</td>
                    <td style="padding:12px; font-weight:600;">${expiryString}</td>
                    <td style="padding:12px; text-align:center;">
                        <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
                            <button class="act-btn ren-btn" data-id="${user.id}">+6 Months</button>
                            <button class="act-btn rst-btn" data-id="${user.id}" data-name="${user.full_name || ''}">Reset Pass</button>
                            <button class="act-btn blk-btn" data-id="${user.id}">Unauthorize</button>
                        </div>
                    </td>
                `;
                activeTable.appendChild(tr);
            });

            attachActiveControlListeners();
            attachEyeButtonListeners();

        } catch (err) {
            console.error("Active Users Error:", err);
            activeTable.innerHTML = `<tr><td colspan="5" style="padding:15px; color:red; text-align:center;">
                Failed to load users.<br><small>${err.message}</small>
            </td></tr>`;
        }
    }

    // ==================== 3. BUSINESS PERFORMANCE ====================
    async function loadBusinessPerformance() {
        try {
            const { data: deposits, error } = await window.supabaseClient
                .from('deposits')
                .select('amount, created_by');

            if (error) throw error;

            const systemLogs = {};
            deposits.forEach(d => {
                if (!systemLogs[d.created_by]) {
                    systemLogs[d.created_by] = { txCount: 0, cashSum: 0 };
                }
                systemLogs[d.created_by].txCount += 1;
                systemLogs[d.created_by].cashSum += parseFloat(d.amount || 0);
            });

            performanceTable.innerHTML = '';

            if (Object.keys(systemLogs).length === 0) {
                performanceTable.innerHTML = `<tr><td colspan="3" style="padding:20px; text-align:center; color:#666;">
                    No transactions recorded yet.
                </td></tr>`;
                return;
            }

            Object.keys(systemLogs).forEach(id => {
                const stats = systemLogs[id];
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding:12px; font-weight:600;">Operator (${id.substring(0,8)}...)</td>
                    <td style="padding:12px;">${stats.txCount} Transactions</td>
                    <td style="padding:12px; font-weight:bold; color:#b71c1c;">
                        ₹ ${stats.cashSum.toFixed(2)}
                    </td>
                `;
                performanceTable.appendChild(tr);
            });

        } catch (err) {
            console.error("Performance Load Error:", err);
            performanceTable.innerHTML = `<tr><td colspan="3" style="padding:15px; text-align:center; color:#666;">
                No data available.
            </td></tr>`;
        }
    }

    // ==================== EVENT LISTENERS ====================
    function attachPendingListeners() {
        document.querySelectorAll('.p-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const uid = e.target.getAttribute('data-id');
                const isApprove = e.target.classList.contains('apr-btn');
                const objectionNote = document.getElementById(`objection-${uid}`).value.trim();

                let updateData = {};

                if (isApprove) {
                    const expiry = new Date();
                    expiry.setDate(expiry.getDate() + 180);
                    updateData = { 
                        status: 'approved', 
                        expiry_date: expiry.toISOString(), 
                        objection_remark: null 
                    };
                } else {
                    updateData = { 
                        status: 'rejected', 
                        objection_remark: objectionNote || "Rejected by Super Admin" 
                    };
                }

                try {
                    const { error } = await window.supabaseClient
                        .from('user_roles')
                        .update(updateData)
                        .eq('id', uid);

                    if (error) throw error;

                    window.showSystemAlert(
                        isApprove ? "✅ User Approved Successfully (6 Months)!" : "❌ User Request Rejected.",
                        "Action Completed"
                    );
                    refreshAllTables();
                } catch (err) {
                    window.showSystemAlert(`Error: ${err.message}`, "Error", "❌");
                }
            });
        });
    }

    function attachEyeButtonListeners() {
        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = btn.getAttribute('data-name');
                const koCode = btn.getAttribute('data-ko');
                const mobile = btn.getAttribute('data-mobile');

                window.showSystemAlert(
                    `🔑 KO Code: ${koCode}\n📱 Mobile: +91 ${mobile}`,
                    `${name} - Details`,
                    "👤"
                );
            });
        });
    }

    function attachActiveControlListeners() {
        document.querySelectorAll('.act-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const uid = e.target.getAttribute('data-id');
                const userName = e.target.getAttribute('data-name') || 'User';

                // Reset Password
                if (e.target.classList.contains('rst-btn')) {
                    const newPassword = await window.showSystemPrompt(
                        `Enter new password for ${userName}:`, 
                        "Reset Password"
                    );

                    if (newPassword === null) return;
                    if (!newPassword.trim()) {
                        window.showSystemAlert("Password cannot be empty!", "Warning", "⚠️");
                        return;
                    }

                    try {
                        const { error } = await window.supabaseClient
                            .from('user_roles')
                            .update({ password_text: newPassword.trim() })
                            .eq('id', uid);

                        if (error) throw error;

                        window.showSystemAlert(`Password updated successfully for ${userName}`, "Success", "✅");
                        refreshAllTables();
                    } catch (err) {
                        window.showSystemAlert(`Failed to reset password: ${err.message}`, "Error", "❌");
                    }
                    return;
                }

                // Renew or Unauthorize
                const isRenew = e.target.classList.contains('ren-btn');
                let updateData = {};

                if (isRenew) {
                    const newExp = new Date();
                    newExp.setDate(newExp.getDate() + 180);
                    updateData = { 
                        status: 'approved', 
                        expiry_date: newExp.toISOString(), 
                        objection_remark: null 
                    };
                } else {
                    updateData = { 
                        status: 'rejected', 
                        objection_remark: 'Unauthorized by Super Admin' 
                    };
                }

                try {
                    const { error } = await window.supabaseClient
                        .from('user_roles')
                        .update(updateData)
                        .eq('id', uid);

                    if (error) throw error;

                    window.showSystemAlert(
                        isRenew ? "✅ Validity Extended by 6 Months!" : "🚫 User Access Revoked.",
                        "Action Completed"
                    );
                    refreshAllTables();
                } catch (err) {
                    window.showSystemAlert(err.message, "Error", "❌");
                }
            });
        });
    }

    // ==================== REFRESH ALL ====================
    function refreshAllTables() {
        loadPendingRequests();
        loadActiveUsers();
        loadBusinessPerformance();
    }

    // Initial Load
    refreshAllTables();
}
