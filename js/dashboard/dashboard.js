// js/dashboard.js
// 👑 DEDICATED DASHBOARD & ACCESS MANAGEMENT CONTROLLER

window.DashboardController = {
    
    showDashboard: async function(user, proceedCallback) {
        if (user.role === 'super_admin') {
            proceedCallback(user);
            return;
        }

        const isKoMissing = !user.ko_code || user.ko_code.trim() === "";
        const isMobileMissing = !user.mobile_no || user.mobile_no.trim() === "";
        const isNameMissing = !user.full_name || user.full_name.trim() === "";
        const isSettlementMissing = !user.settlement_account || user.settlement_account.trim() === "";
        const isSolMissing = !user.sol_id || user.sol_id.trim() === "";
        const isAddressMissing = !user.address || user.address.trim() === ""; 

        if (isKoMissing || isMobileMissing || isNameMissing || isSettlementMissing || isSolMissing || isAddressMissing) {
            const mdModal = document.getElementById('missing-detail-modal');
            const mdForm = document.getElementById('missing-detail-form');
            
            if(document.getElementById('md-ko-block')) document.getElementById('md-ko-block').style.display = isKoMissing ? 'block' : 'none';
            if(document.getElementById('md-mobile-block')) document.getElementById('md-mobile-block').style.display = isMobileMissing ? 'block' : 'none';
            if(document.getElementById('md-name-block')) document.getElementById('md-name-block').style.display = isNameMissing ? 'block' : 'none';
            if(document.getElementById('md-settlement-block')) document.getElementById('md-settlement-block').style.display = isSettlementMissing ? 'block' : 'none';
            if(document.getElementById('md-sol-block')) document.getElementById('md-sol-block').style.display = isSolMissing ? 'block' : 'none';
            if(document.getElementById('md-address-block')) document.getElementById('md-address-block').style.display = isAddressMissing ? 'block' : 'none'; 

            if (mdModal) mdModal.style.setProperty('display', 'flex', 'important');

            mdForm.onsubmit = async (e) => {
                e.preventDefault();
                const updatedKo = isKoMissing ? document.getElementById('md-ko-input').value.trim() : user.ko_code;
                const updatedMobile = isMobileMissing ? document.getElementById('md-mobile-input').value.trim() : user.mobile_no;
                const updatedName = isNameMissing ? document.getElementById('md-name-input').value.trim().toUpperCase() : user.full_name;
                const updatedSettlement = isSettlementMissing ? document.getElementById('md-settlement-input').value.trim() : user.settlement_account;
                const updatedSol = isSolMissing ? document.getElementById('md-sol-input').value.trim() : user.sol_id;
                const updatedAddress = isAddressMissing ? document.getElementById('md-address-input').value.trim().toUpperCase() : user.address; 

                try {
                    const { error } = await window.supabaseClient
                        .from('user_roles')
                        .update({
                            ko_code: updatedKo,
                            mobile_no: updatedMobile,
                            full_name: updatedName,
                            settlement_account: updatedSettlement, 
                            sol_id: updatedSol,
                            address: updatedAddress 
                        })
                        .eq('id', user.id);

                    if (error) throw error;

                    user.ko_code = updatedKo;
                    user.mobile_no = updatedMobile;
                    user.full_name = updatedName;
                    user.settlement_account = updatedSettlement;
                    user.sol_id = updatedSol;
                    user.address = updatedAddress; 

                    mdModal.style.display = 'none';
                    await window.showSystemAlert("Your comprehensive banking logs have been updated in Database. Workspace unlocked!", "Verification Success", "✅");
                    proceedCallback(user);

                } catch (err) {
                    window.showSystemAlert(`Failed to patch credentials: ${err.message}`, "Security Error", "❌");
                }
            };
        } else {
            if(document.getElementById('missing-detail-modal')) document.getElementById('missing-detail-modal').style.display = 'none';
            proceedCallback(user);
        }
    },

    applyMenuPermissions: function(role) {
        const allMenuButtons = document.querySelectorAll('[data-page]');
        allMenuButtons.forEach(btn => {
            const page = btn.getAttribute('data-page');
            if (role === 'agent') {
                const allowed = ['home', 'deposit', 'withdrawal', 'search'];
                btn.style.setProperty('display', allowed.includes(page) ? 'block' : 'none', 'important');
            } else if (role === 'admin') {
                btn.style.setProperty('display', page === 'super-admin' ? 'none' : 'block', 'important');
            } else if (role === 'super_admin') {
                btn.style.setProperty('display', page === 'super-admin' ? 'block' : 'none', 'important');
            }
        });
    }
};
