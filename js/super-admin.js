// js/super-admin.js

async function initSuperAdminModule() {
    const pendingTable = document.getElementById('sa-pending-table');
    const performanceTable = document.getElementById('sa-performance-table');

    if (!pendingTable) return;

    // 1. Supabase से 'pending' स्टेटस वाले यूजर्स को लोड करना
    async function loadRequests() {
        try {
            const { data: users, error } = await window.supabaseClient
                .from('user_roles')
                .select('*')
                .eq('status', 'pending');

            if (error) throw error;

            if (!users || users.length === 0) {
                pendingTable.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: green; font-weight: bold;">🎉 Clearance Complete! No pending codes found.</td></tr>`;
                return;
            }

            pendingTable.innerHTML = '';
            users.forEach(user => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #eee';
                tr.innerHTML = `
                    <td style="padding: 12px; font-weight: 600;">${user.full_name}</td>
                    <td style="padding: 12px;">${user.email}</td>
                    <td style="padding: 12px;"><span style="background: #eee; padding: 3px 8px; border-radius:4px; font-size:0.8rem;">${user.role.toUpperCase()}</span></td>
                    <td style="padding: 12px; color: #b06000; font-weight: bold;">${user.status.toUpperCase()}</td>
                    <td style="padding: 12px; text-align: center; display: flex; gap: 10px; justify-content: center;">
                        <button class="sa-btn approve" data-id="${user.id}" style="background: #137333; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight:600;">Approve</button>
                        <button class="sa-btn reject" data-id="${user.id}" style="background: #c5221f; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight:600;">Reject</button>
                    </td>
                `;
                pendingTable.appendChild(tr);
            });

            attachAdminActionListeners();

        } catch (err) {
            console.error("Fetch Error:", err.message);
            pendingTable.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: red;">Failed to read authorization table.</td></tr>`;
        }
    }

    // 2. Approve और Reject बटनों को चालू करना
    function attachAdminActionListeners() {
        document.querySelectorAll('.sa-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const userId = e.target.getAttribute('data-id');
                const approveMode = e.target.classList.contains('approve');
                const finalStatus = approveMode ? 'approved' : 'rejected';

                e.target.disabled = true;
                e.target.textContent = "...";

                try {
                    const { error } = await window.supabaseClient
                        .from('user_roles')
                        .update({ status: finalStatus })
                        .eq('id', userId);

                    if (error) throw error;

                    alert(`Operational Update: Account authorization has been set to [${finalStatus.toUpperCase()}].`);
                    loadRequests(); // पेंडिंग लिस्ट तुरंत अपडेट करें

                } catch (err) {
                    alert(`Database Sync Error: ${err.message}`);
                    e.target.disabled = false;
                    e.target.textContent = approveMode ? 'Approve' : 'Reject';
                }
            });
        });
    }

    // 3. एजेंट्स की परफॉरमेंस समरी रिपोर्ट
    async function loadAgentLogs() {
        try {
            const { data: deposits, error } = await window.supabaseClient
                .from('deposits')
                .select('amount, created_by');

            if (error) throw error;

            let logs = {};
            deposits.forEach(d => {
                if (!logs[d.created_by]) logs[d.created_by] = { count: 0, sum: 0 };
                logs[d.created_by].count += 1;
                logs[d.created_by].sum += parseFloat(d.amount);
            });

            performanceTable.innerHTML = '';
            const ids = Object.keys(logs);
            
            if(ids.length === 0) {
                performanceTable.innerHTML = `<tr><td colspan="3" style="padding: 20px; text-align: center;">No physical currency movements recorded today.</td></tr>`;
                return;
            }

            ids.forEach(uid => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #eee';
                tr.innerHTML = `
                    <td style="padding: 12px; font-weight: 600;">Counter Operator (UUID: ${uid.substring(0,8)}...)</td>
                    <td style="padding: 12px; color: var(--color-text-muted);">${logs[uid].count} Total Deposits</td>
                    <td style="padding: 12px; font-weight: bold; color: var(--color-maroon-dark);">₹ ${logs[uid].sum.toFixed(2)}</td>
                `;
                performanceTable.appendChild(tr);
            });

        } catch (err) {
            console.error("Audit Tab Error:", err.message);
            performanceTable.innerHTML = `<tr><td colspan="3" style="padding: 20px; text-align: center; color: red;">Failed to fetch balance metrics.</td></tr>`;
        }
    }

    await loadRequests();
    await loadAgentLogs();
}
