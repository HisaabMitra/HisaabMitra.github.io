// ========================================================
// 👑 ADMINISTRATIVE CONTROL & SUPER ADMIN PANEL ENGINE
// ========================================================

async function initSuperAdminModule() {
    const pendingTable = document.getElementById('sa-pending-table');
    const activeTable = document.getElementById('sa-active-users-table');
    const performanceTable = document.getElementById('sa-performance-table');
    const mergerTable = document.getElementById('admin-merger-table-body'); // 🌟 न्यू मर्जर टेबल हुक

    if (!pendingTable) return;

    // 1. ⏳ पेंडिंग यूज़र्स लोड करना
    async function loadPendingRequests() {
        try {
            const { data: users, error } = await window.supabaseClient
                .from('user_roles')
                .select('*')
                .eq('status', 'pending');

            if (error) throw error;
            if (!users || users.length === 0) {
                pendingTable.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: #28a745; font-weight:bold;">🎉 No pending registration requests.</td></tr>`;
                return;
            }

            pendingTable.innerHTML = '';
            users.forEach(user => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #dee2e6';
                tr.innerHTML = `
                    <td style="padding: 14px 16px; font-weight:600;">${user.full_name}</td>
                    <td style="padding: 14px 16px;">${user.email}</td>
                    <td style="padding: 14px 16px;"><span style="background:#f3f4f6; padding:4px 8px; border-radius:4px; font-size:0.85rem; font-weight:500;">${user.role.toUpperCase()}</span></td>
                    <td style="padding: 14px 16px;"><input type="text" id="objection-${user.id}" placeholder="e.g., Wrong Branch Code" style="width:90%; padding:8px; border:1px solid #ccc; border-radius:4px; font-size:0.9rem;"></td>
                    <td style="padding: 14px 16px; text-align: center; display:flex; gap:8px; justify-content:center; align-items:center;">
                        <button class="p-btn apr-btn" data-id="${user.id}" style="background:#137333; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:600; font-size:0.85rem;">Approve (6M)</button>
                        <button class="p-btn rej-btn" data-id="${user.id}" style="background:#c5221f; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:600; font-size:0.85rem;">Reject</button>
                    </td>
                `;
                pendingTable.appendChild(tr);
            });
            attachPendingListeners();
        } catch (err) {
            console.error("Pending Table Error:", err);
            pendingTable.innerHTML = `<tr><td colspan="5" style="padding:20px; color:#c5221f; text-align:center; font-weight:bold;">Error loading pending requests.</td></tr>`;
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

    // 2. 🟢 एक्टिव यूज़र्स मैनेज करना (Renew / Unauthorize / Reset Password)
    async function loadActiveUsers() {
        try {
            const { data: users, error } = await window.supabaseClient
                .from('user_roles')
                .select('*');

            if (error) throw error;

            const filtered = users.filter(
                user => user.status !== 'pending' && user.role !== 'super_admin'
            );

            if (!filtered || filtered.length === 0) {
                activeTable.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px; color:#6b7280; font-style:italic;">Koi Approved User nahi mila.</td></tr>`;
                return;
            }

            activeTable.innerHTML = '';

            filtered.forEach(user => {
                let currentStatus = user.status || 'unknown';
                let statusColor = '#137333';
                let expiryString = user.expiry_date
                    ? new Date(user.expiry_date).toLocaleDateString('en-IN')
                    : 'N/A';

                if (user.status === 'rejected') {
                    statusColor = '#c5221f';
                    expiryString = 'Access Suspended';
                }

                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #dee2e6';
                tr.innerHTML = `
                    <td style="padding:14px 16px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-weight:600; color:#1f2937;">${user.full_name}</span>
                            <button
                                class="view-details-btn"
                                data-name="${user.full_name}"
                                data-ko="${user.ko_code || 'N/A'}"
                                data-mobile="${user.mobile_no || 'N/A'}"
                                data-address="${user.address || 'NOT SPECIFIED'}"
                                style="background:transparent; border:none; cursor:pointer; font-size:1.1rem; padding:0; display:inline-flex; align-items:center;"
                                title="View Kiosk Profile Details"
                            >
                                👁️
                            </button>
                        </div>
                        <small style="color:#6b7280; font-size:0.8rem; display:block; margin-top:2px;">${user.email}</small>
                    </td>
                    <td style="padding:14px 16px;">
                        <span style="background:#f3f4f6; padding:4px 8px; border-radius:4px; font-size:0.85rem; font-weight:500;">
                            ${user.role.toUpperCase()}
                        </span>
                    </td>
                    <td style="padding:14px 16px; color:${statusColor}; font-weight:bold;">
                        ${currentStatus.toUpperCase()}
                    </td>
                    <td style="padding:14px 16px; font-weight:600; color:#374151;">
                        ${expiryString}
                    </td>
                    <td style="padding:14px 16px; display:flex; gap:6px; flex-wrap:wrap; justify-content:center; align-items:center;">
                        <button class="act-btn ren-btn" data-id="${user.id}" style="background:#137333; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:500; font-size:0.85rem;">+6 Months</button>
                        <button class="act-btn rst-btn" data-id="${user.id}" data-name="${user.full_name}" style="background:#f2994a; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:500; font-size:0.85rem;">Reset Pass</button>
                        <button class="act-btn blk-btn" data-id="${user.id}" style="background:#1f2937; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:500; font-size:0.85rem;">Unauthorize</button>
                    </td>
                `;
                activeTable.appendChild(tr);
            });

            attachActiveControlListeners();
            attachEyeButtonListeners();

        } catch (err) {
            console.error("Active User Error:", err);
            activeTable.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#c5221f;padding:20px;font-weight:bold;">Failed to compile terminal users.</td></tr>`;
        }
    }

    // 👀 आई-बटन क्लिक का स्वतंत्र फंक्शन
    function attachEyeButtonListeners() {
        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.onclick = function(e) {
                const targetBtn = e.target.closest('.view-details-btn');
                const name = targetBtn.getAttribute('data-name');
                const koCode = targetBtn.getAttribute('data-ko');
                const mobile = targetBtn.getAttribute('data-mobile');
                const address = targetBtn.getAttribute('data-address');

                window.showSystemAlert(
                    `🔑 KO CODE : ${koCode}\n📱 MOBILE  : +91 ${mobile}\n📍 ADDRESS : ${address}`, 
                    `${name} - Operator Profile`, 
                    "👤"
                );
            };
        });
    }

    function attachActiveControlListeners() {
        document.querySelectorAll('.act-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const uid = e.target.getAttribute('data-id');
                
                if (e.target.classList.contains('rst-btn')) {
                    const userName = e.target.getAttribute('data-name');
                    
                    const newPassword = await window.showSystemPrompt(`Set a fresh secure access key for ${userName}:`, "Administrative Password Reset");
                    
                    if (newPassword === null) return; 
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
                    window.showSystemAlert(isRenew ? "✅ User validity extended by 6 Months!" : "🚫 User Access Revoked.");
                    refreshAllTables();
                } catch (err) { window.showSystemAlert(err.message); }
            });
        });
    }

    // 🔄 3. [JARVIS INTEGRATED]: लाइव प्रिंटर मर्जर रिक्वेस्ट लोड करना
    window.loadPendingMergerRequests = async function() {
        if (!mergerTable) return;
        try {
            const { data, error } = await window.supabaseClient
                .from('user_roles')
                .select('id, full_name, ko_code, merger_requested_with, merger_status')
                .eq('merger_status', 'pending');

            if (error) throw error;

            if (!data || data.length === 0) {
                mergerTable.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: #137333; font-weight: bold;">✅ कोई भी मर्जर रिक्वेस्ट पेंडिंग नहीं है सर!</td></tr>`;
                return;
            }

            mergerTable.innerHTML = "";
            data.forEach(row => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = "1px solid #dee2e6";
                tr.innerHTML = `
                    <td style="padding: 14px 16px; font-weight: bold; color: #1f2937;">${row.full_name.toUpperCase()}</td>
                    <td style="padding: 14px 16px;"><span style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-weight:600; color:#374151;">${row.ko_code}</span></td>
                    <td style="padding: 14px 16px;"><span style="background: #fff3cd; color: #856404; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-weight: bold;">👉 ${row.merger_requested_with}</span></td>
                    <td style="padding: 14px 16px;"><span style="color: #fd7e14; font-weight: bold;"><i class="fas fa-spinner fa-spin"></i> Pending Admin</span></td>
                    <td style="padding: 14px 16px; text-align: center; display: flex; gap: 8px; justify-content: center; align-items: center;">
                        <!-- 🟢 Approve Button -->
                        <button type="button" onclick="approveCounterMerger('${row.id}', '${row.ko_code}', '${row.merger_requested_with}')" style="background: #28a745; color: white; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.85rem; box-shadow: 0 2px 4px rgba(40,167,69,0.2);">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <!-- 🔴 Live Reject Button added -->
                        <button type="button" onclick="rejectCounterMerger('${row.id}', '${row.ko_code}')" style="background: #c5221f; color: white; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.85rem; box-shadow: 0 2px 4px rgba(197,34,31,0.2);">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </td>
                `;
                mergerTable.appendChild(tr);
            });
        } catch (err) {
            console.error("Failed to load admin merger grid:", err);
            mergerTable.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: red;">Error loading data: ${err.message}</td></tr>`;
        }
    };

    // 👑 [JARVIS INTEGRATED]: मर्जर रिक्वेस्ट को लाइव अप्रूव करना (ग्रुपिंग इंजन चालू)
    window.approveCounterMerger = async function(userId, sourceKo, targetKo) {
        window.showSystemConfirm(
            `क्या आप वाकई KO Code [${sourceKo}] और [${targetKo}] को एक ही पासबुक प्रिंटर ग्रुप में मर्ज करना चाहते हैं?`,
            "Authorize Printer Merger",
            async function() {
                try {
                    const sharedGroupId = `GROUP_${targetKo}`;

                    // कतार ट्रैकिंग के लिए टेबल में यूनिक ग्रुप रजिस्टर/अपसर्ट करें
                    const { error: groupErr } = await window.supabaseClient
                        .from('shared_printer_groups')
                        .upsert([{ 
                            group_id: sharedGroupId,
                            last_printed_line: 0,
                            page_counter: 1
                        }], { onConflict: 'group_id' });

                    if (groupErr) throw groupErr;

                    // १. रिक्वेस्ट भेजने वाले (Source) का स्टेटस मर्ज्ड और ग्रुप आईडी मैप करें
                    const { error: err1 } = await window.supabaseClient
                        .from('user_roles')
                        .update({
                            merger_status: 'merged',
                            printer_group_id: sharedGroupId
                        })
                        .eq('id', userId);

                    if (err1) throw err1;

                    // २. जिसके साथ मर्ज हो रहा है (Target) उसकी रो में भी सेम ग्रुप आईडी इंजेक्ट करें
                    const { error: err2 } = await window.supabaseClient
                        .from('user_roles')
                        .update({
                            merger_status: 'merged',
                            merger_requested_with: sourceKo,
                            printer_group_id: sharedGroupId
                        })
                        .eq('ko_code', targetKo);

                    if (err2) throw err2;

                    window.showSystemAlert(`🎉 काउंटर सफलतापूर्वक मर्ज हो गए हैं!\n\nअब ${sourceKo} और ${targetKo} दोनों की पासबुक प्रविष्टियां एक ही कतार में सिंक होंगी।`, "Merger Approved", "✅");
                    window.loadPendingMergerRequests();
                } catch (err) {
                    console.error("Critical error during merger approval thread:", err);
                    window.showSystemAlert("मर्जर प्रक्रिया विफल: " + err.message, "Transaction Failure", "❌");
                }
            }
        );
    };

    // 👑 [JARVIS INTEGRATED]: मर्जर रिक्वेस्ट को लाइव रिजेक्ट करना (डेटाबेस रीसेट इंजन)
    window.rejectCounterMerger = async function(userId, sourceKo) {
        window.showSystemConfirm(
            `क्या आप KO Code [${sourceKo}] की पासबुक प्रिंटर मर्जर रिक्वेस्ट को अस्वीकार (Reject) करना चाहते हैं?`,
            "Deny Printer Merger",
            async function() {
                try {
                    // डेटाबेस रो को वापस नॉर्मल स्टेट पर रीसेट करें
                    const { error } = await window.supabaseClient
                        .from('user_roles')
                        .update({
                            merger_status: 'none',
                            merger_requested_with: null,
                            printer_group_id: null
                        })
                        .eq('id', userId);

                    if (error) throw error;

                    window.showSystemAlert(`❌ KO Code [${sourceKo}] की मर्जर रिक्वेस्ट को रिजेक्ट कर दिया गया है और उनका काउंटर वापस रीसेट हो गया है।`, "Merger Rejected", "⚠️");
                    window.loadPendingMergerRequests();
                } catch (err) {
                    console.error("Critical error during merger rejection thread:", err);
                    window.showSystemAlert("मर्जर रिजेक्शन विफल: " + err.message, "Transaction Failure", "❌");
                }
            }
        );
    };

    // 📈 4. एजेंट्स के बिजनेस का वॉल्यूम ट्रैक करना
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
                performanceTable.innerHTML = `<tr><td colspan="3" style="padding:15px; text-align:center; color:#6b7280; font-style:italic;">No operations registered in system.</td></tr>`;
                return;
            }

            uniqueIds.forEach(id => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #dee2e6';
                tr.innerHTML = `
                    <td style="padding:14px 16px; font-weight:600; color:#374151;">Counter Operator (ID: ${id.substring(0,8)}...)</td>
                    <td style="padding:14px 16px; color:#4b5563;">${systemLogs[id].txCount} Transactions</td>
                    <td style="padding:14px 16px; font-weight:bold; color:#7d0022;">₹ ${systemLogs[id].cashSum.toFixed(2)}</td>
                `;
                performanceTable.appendChild(tr);
            });
        } catch (err) { 
            performanceTable.innerHTML = `<tr><td colspan="3" style="padding:15px; text-align:center; color:#6b7280; font-style:italic;">No physical currency movements recorded today.</td></tr>`;
        }
    }

    function refreshAllTables() {
        loadPendingRequests();
        loadActiveUsers();        
        loadBusinessPerformance();
        window.loadPendingMergerRequests(); // 🌟 लाइव मर्जर सूची को ट्रिगर करें
    }

    refreshAllTables();
}
