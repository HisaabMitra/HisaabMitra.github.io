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
                        <button class="p-btn apr-btn" data-id="${user.id}" style="background:#137333; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-weight:600;">Approve (6M)</button>
                        <button class="p-btn rej-btn" data-id="${user.id}" style="background:#c5221f; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-weight:600;">Reject</button>
                    </td>
                `;
                pendingTable.appendChild(tr);
            });
            attachPendingListeners();
        } catch (err) {
            console.error("Pending Table Error:", err);
            pendingTable.innerHTML = `<tr><td colspan="5" style="padding:15px; color:red; text-align:center;">Error loading pending requests.</td></tr>`;
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
                    let expiry = new Date();
                    expiry.setDate(expiry.getDate() + 180); // यहाँ ब्रैकेट ठीक कर दिया गया है
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
                .neq('role', 'super_admin'); 

            if (error) throw error;
            
            if (!users || users.length === 0) {
                activeTable.innerHTML = `<tr><td colspan="5" style="padding: 15px; text-align: center; color: var(--color-text-muted);">No managed operators or agents registered in the vault yet.</td></tr>`;
                return;
            }

            activeTable.innerHTML = '';
            users.forEach(user => {
                if (user.status === 'pending') return;

                let expiryString = "No Limit Set";
                let statusColor = "#137333"; 
                let currentStatus = user.status.toUpperCase();

                if (user.expiry_date) {
                    const expDate = new Date(user.expiry_date);
                    if (!isNaN(expDate.getTime())) {
                        expiryString = expDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                        if (expDate < new Date() && user.status === 'approved') {
                            expiryString += " ⚠️ (EXPIRED)";
                            statusColor = "#c5221f"; 
                            currentStatus = "EXPIRED";
                        }
                    }
                }
                
                if (user.status === 'rejected') {
                    statusColor = "#c5221f"; 
                    expiryString = "Access Suspended";
                }

                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #eee';
               tr.innerHTML = `
    <td style="padding: 12px; font-weight:600; display: flex; align-items: center; gap: 8px;">
        <div>
            ${user.full_name}
            <button class="view-details-btn" 
                    data-name="${user.full_name}"
                    data-ko="${user.ko_code || 'N/A'}" 
                    data-mobile="${user.mobile_no || 'N/A'}" 
                    style="background: transparent; border: none; cursor: pointer; font-size: 1.1rem; padding: 0 4px; display: inline-flex; align-items: center; vertical-align: middle;" 
                    title="Click to view Contact & KO Details">
                👁️
            </button>
            <br>
            <small style="color:#777;">${user.email}</small>
        </div>
    </td>
    <td style="padding: 12px;"><span style="background:#f0f0f0; padding:2px 6px; border-radius:4px; font-size:0.85rem;">${user.role.toUpperCase()}</span></td>
    <td style="padding: 12px; color:${statusColor}; font-weight:bold;">${currentStatus}</td>
    <td style="padding: 12px; font-weight:600;">${expiryString}</td>
    <td style="padding: 12px; text-align: center; display:flex; gap:6px; justify-content:center; flex-wrap: wrap;">
        <button class="act-btn ren-btn" data-id="${user.id}" style="background:#137333; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-size:0.85rem; font-weight:600;">+6 Months</button>
        <button class="act-btn rst-btn" data-id="${user.id}" data-name="${user.full_name}" style="background:#f2994a; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-size:0.85rem; font-weight:600;">Reset Pass</button>
        <button class="act-btn blk-btn" data-id="${user.id}" style="background:#222; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-size:0.85rem; font-weight:600;">Unauthorize</button>
    </td>
`        
`;
                activeTable.appendChild(tr);
            });

            if (activeTable.innerHTML === '') {
                activeTable.innerHTML = `<tr><td colspan="5" style="padding: 15px; text-align: center; color: var(--color-text-muted);">No authorized/unauthorized users found.</td></tr>`;
            }

        document.querySelectorAll('.view-details-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // बटन या उसके अंदर के आइकॉन पर क्लिक हैंडल करना
        const targetBtn = e.target.closest('.view-details-btn');
        const name = targetBtn.getAttribute('data-name');
        const koCode = targetBtn.getAttribute('data-ko');
        const mobile = targetBtn.getAttribute('data-mobile');

        alert(`👤 User Security Details\n\nName: ${name}\n🔑 KO Code: ${koCode}\n📱 Mobile No: +91 ${mobile}`);
    });
});



            attachActiveControlListeners();

            
        } catch (err) { 
            console.error("Active User UI Error:", err); 
            activeTable.innerHTML = `<tr><td colspan="5" style="padding:15px; color:red; text-align:center;">Failed to compile terminal users.</td></tr>`;
        }
    }





   function attachActiveControlListeners() {
        document.querySelectorAll('.act-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const uid = e.target.getAttribute('data-id');
                
                // 1. यदि पासवर्ड रीसेट बटन दबाया गया है
                if (e.target.classList.contains('rst-btn')) {
                    const userName = e.target.getAttribute('data-name');
                    const newPassword = prompt(`Enter new password for [${userName}]:`);
                    
                    // अगर सुपर एडमिन ने कैंसिल कर दिया या खाली छोड़ दिया
                    if (newPassword === null) return; 
                    if (newPassword.trim() === "") {
                        alert("⚠️ Password cannot be empty!");
                        return;
                    }

                    try {
                        const { error } = await window.supabaseClient
                            .from('user_roles')
                            .update({ password_text: newPassword.trim() })
                            .eq('id', uid);

                        if (error) throw error;
                        alert(`🔑 Password for ${userName} has been successfully updated to: ${newPassword}`);
                        refreshAllTables();
                    } catch (err) { 
                        alert(`❌ Failed to reset password: ${err.message}`); 
                    }
                    return; // फंक्शन से बाहर आ जाएं
                }

                // 2. पुराने रीन्यू और ब्लॉक बटन्स का लॉजिक
                const isRenew = e.target.classList.contains('ren-btn');
                let updateData = {};
                if (isRenew) {
                    let newExp = new Date();
                    newExp.setDate(newExp.getDate() + 180);
                    updateData = { status: 'approved', expiry_date: newExp.toISOString(), objection_remark: null };
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
        } catch (err) { 
            console.error(err); 
            performanceTable.innerHTML = `<tr><td colspan="3" style="padding: 15px; text-align: center;">No physical currency movements recorded today.</td></tr>`;
        }
    }

    function refreshAllTables() {
        loadPendingRequests();
        loadActiveUsers();
        loadBusinessPerformance();
    }

    refreshAllTables();
}
