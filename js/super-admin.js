// js/super-admin.js




// Function ke start mein ye lagayein
async function debugSupabase() {
    console.log("Testing connection...");
    const { data, error } = await window.supabaseClient.from('user_roles').select('*').limit(1);
    if (error) {
        console.error("CONNECTION FAILED:", error.message);
    } else {
        console.log("CONNECTION SUCCESSFUL. Data found:", data);
    }
}
debugSupabase()


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
                    expiry.setDate(expiry.getDate() + 180); 
                    updateData = { status: 'approved', expiry_date: expiry.toISOString(), objection_remark: null };
                } else {
                    updateData = { status: 'rejected', objection_remark: objectionNote || "Rejected by Super Admin" };
                }

                try {
                    const { error } = await window.supabaseClient.from('user_roles').update(updateData).eq('id', uid);
                    if (error) throw error;
                    window.showSystemAlert(isApprove ? "✅ User Approved with 6 Months validity!" : "❌ User Request Rejected.");
                    refreshAllTables();
                } catch (err) { window.showSystemAlert(err.message); }
            });
        });
    }

    // 2. एक्टिव यूज़र्स मैनेज करना (Renew / Unauthorize / Reset Password)
    async function loadActiveUsers() {
    console.log("Loading Active Users...");
    try {
        // Step 1: Sara data fetch karke dekhte hain
        const { data: users, error } = await window.supabaseClient
            .from('user_roles')
            .select('*');

        if (error) throw error;

        console.log("Total Users in Database:", users); 

        // Step 2: Client-side par manually filter karte hain
        // Isse pata chal jayega ki problem SQL query mein hai ya data mein
        const filtered = users.filter(user => user.status !== 'pending' && user.role !== 'super_admin');
        
        console.log("Filtered Users for Active Table:", filtered);

        if (!filtered || filtered.length === 0) {
            activeTable.innerHTML = `<tr><td colspan="5" style="text-align:center;">Koi Approved User nahi mila.</td></tr>`;
            return;
        }

        activeTable.innerHTML = filtered.map(user => `
            <tr>
                <td>${user.full_name}</td>
                <td>${user.role}</td>
                <td>${user.status}</td>
                <td>${user.expiry_date || 'N/A'}</td>
                <td>Data Row Loaded</td>
            </tr>
        `).join('');

    } catch (err) {
        console.error("Active User Error:", err);
    }
}
            


    // आई-बटन क्लिक का स्वतंत्र फंक्शन (सिंटैक्स सेफ)
  // js/super-admin.js में आई-बटन लिसनर को कस्टमाइज करना
    function attachEyeButtonListeners() {
        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.target.closest('.view-details-btn');
                const name = targetBtn.getAttribute('data-name');
                const koCode = targetBtn.getAttribute('data-ko');
                const mobile = targetBtn.getAttribute('data-mobile');

                // पुराना अलर्ट हटाकर हमारा नया स्क्रीन-सेंटर पॉपअप लगाया
                window.showSystemAlert(
                    `🔑 KO Code: ${koCode}\n📱 Mobile No: +91 ${mobile}`, 
                    `${name} - Operator Profile`, 
                    "👤"
                );
            });
        });
    }

    function attachActiveControlListeners() {
        document.querySelectorAll('.act-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const uid = e.target.getAttribute('data-id');
                
               if (e.target.classList.contains('rst-btn')) {
    const userName = e.target.getAttribute('data-name');
    
    // पुराना prompt() हटाकर हमारा नया कस्टमाइज्ड प्रॉम्ट लगाया
    const newPassword = await window.showSystemPrompt(`Set a fresh secure access key for ${userName}:`, "Administrative Password Reset");
    
    // अगर कैंसिल किया
    if (newPassword === null) return; 
    
    // अगर बिना कुछ लिखे ओके किया
    if (newPassword === "") {
        await window.showSystemAlert("Password cannot be left blank!", "Validation Warning", "⚠️");
        return;
    }

    try {
        const { error } = await window.supabaseClient
            .from('user_roles')
            .update({ password_text: newPassword })
            .eq('id', uid);

        if (error) throw error;
        
        // पुराने alert() को भी नए कस्टमाइज्ड अलर्ट से बदल दिया
        await window.showSystemAlert(`Password for ${userName} has been successfully modified to: ${newPassword}`, "Action Completed", "✅");
        refreshAllTables();
    } catch (err) { 
        await window.showSystemAlert(`Failed to reset password: ${err.message}`, "Database Error", "❌"); 
    }
    return;
}

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
                    alert(isRenew ? "✅ User validity extended by 6 Months!" : "🚫 User Access Revoked.");
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
            performanceTable.innerHTML = `<tr><td colspan="3" style="padding:15px; text-align:center;">No physical currency movements recorded today.</td></tr>`;
        }
    }

    function refreshAllTables() {
        loadPendingRequests();
        loadActiveUsers();        
        loadBusinessPerformance();
    }

    refreshAllTables();
}
