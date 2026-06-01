// js/app.js

document.addEventListener('DOMContentLoaded', () => {
    let currentLoggedInUser = null; 
    // --- UI Panels Elements ---
    const loginPanel = document.getElementById('login-panel');
    const registerPanel = document.getElementById('register-panel');
    const authScreen = document.getElementById('auth-screen');
    const mainDashboard = document.getElementById('main-dashboard');
    const workspace = document.getElementById('workspace');

    // --- Buttons & Forms ---
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');
    const goToRegister = document.getElementById('go-to-register');
    const goToLogin = document.getElementById('go-to-login');
    const navButtons = document.querySelectorAll('.nav-btn, .footer-btn');

    if(goToRegister) {
        goToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            loginPanel.classList.add('hidden');
            registerPanel.classList.remove('hidden');
        });
    }
    if(goToLogin) {
        goToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            registerPanel.classList.add('hidden');
            loginPanel.classList.remove('hidden');
        });
    }

    // ==========================================
    // 2. USER REGISTRATION & RE-SUBMISSION
    // ==========================================
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;
            const role = document.getElementById('reg-role').value;
            const koCode = document.getElementById('reg-ko-code').value.trim(); 
            const mobile = document.getElementById('reg-mobile').value.trim(); 
            const settlementAcc = document.getElementById('reg-settlement-acc').value.trim();
            const solId = document.getElementById('reg-sol-id').value.trim();
            const submitBtn = registerForm.querySelector('button[type="submit"]');

            submitBtn.textContent = "Processing Request...";
            submitBtn.disabled = true;

            try {
                const { data: existingUser, error: checkError } = await window.supabaseClient
                    .from('user_roles')
                    .select('*')
                    .eq('email', email);

                if (checkError) throw checkError;

                const payload = {
                    full_name: name,
                    password_text: password,
                    role: role,
                    ko_code: koCode,    
                    mobile_no: mobile,  
                    settlement_account: settlementAcc,
                    sol_id: solId,                     
                    status: 'pending',
                    objection_remark: null
                };

                if (existingUser && existingUser.length > 0 && existingUser[0].status === 'rejected') {
                    const { error: updateError } = await window.supabaseClient
                        .from('user_roles')
                        .update(payload)
                        .eq('email', email);

                    if (updateError) throw updateError;
                    window.showSystemAlert("🔄 Request Re-Submitted Successfully with updated Bank Credentials!");
                } else {
                    const { error: insertError } = await window.supabaseClient
                        .from('user_roles')
                        .insert([{ email: email, ...payload }]);

                    if (insertError) throw insertError;
                    window.showSystemAlert("✅ Registration Request Submitted with SOL ID & Settlement Account!");
                }

                registerForm.reset();
                document.getElementById('reg-email').readOnly = false;
                registerPanel.classList.add('hidden');
                loginPanel.classList.remove('hidden');

            } catch (err) {
                window.showSystemAlert(`❌ Request Failed: ${err.message}`);
            } finally {
                submitBtn.textContent = "Submit Registration";
                submitBtn.disabled = false;
            }
        });
    }

    // ==========================================
    // 3. CUSTOM DATABASE LOGIN & STATUS CHECK
    // ==========================================
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            submitBtn.textContent = "Verifying...";
            submitBtn.disabled = true;

            try {
                const { data: users, error } = await window.supabaseClient
                    .from('user_roles')
                    .select('*')
                    .eq('email', email)
                    .eq('password_text', password);

                if (error) throw error;

                if (!users || users.length === 0) {
                    window.showSystemAlert("❌ Invalid Email or Password. Please try again.");
                    return;
                }

                const user = users[0];

                if (user.status === 'rejected') {
                    const reason = user.objection_remark || "Reason not specified by Admin.";
                    window.showSystemAlert(`⚠️ Objection Raised!\n\nReason: "${reason}"\n\nPlease correct details and re-submit.`);
                    
                    document.getElementById('reg-name').value = user.full_name;
                    document.getElementById('reg-email').value = user.email;
                    document.getElementById('reg-email').readOnly = true; 
                    document.getElementById('reg-ko-code').value = user.ko_code || "";
                    document.getElementById('reg-mobile').value = user.mobile_no || "";
                    if(document.getElementById('reg-settlement-acc')) document.getElementById('reg-settlement-acc').value = user.settlement_account || "";
                    if(document.getElementById('reg-sol-id')) document.getElementById('reg-sol-id').value = user.sol_id || "";
                    document.getElementById('reg-password').value = user.password_text;
                    document.getElementById('reg-role').value = user.role;
                    
                    loginPanel.classList.add('hidden');
                    registerPanel.classList.remove('hidden');
                    return;
                }

                if (user.status === 'pending') {
                    window.showSystemAlert(`⏳ Access Pending: Your account is awaiting clearance from Super Admin.`);
                    return;
                }

                showDashboard(user);

            } catch (err) {
               window.showSystemAlert(`❌ Auth Error: ${err.message}`);
            } finally {
                submitBtn.textContent = "Sign In";
                submitBtn.disabled = false;
            }
        });
    }

    // ==========================================
    // 4. PROFILE INTEGRITY CHECK (REAL DATABASE SYNC)
    // ==========================================
    async function showDashboard(user) {
        if (user.role === 'super_admin') {
            proceedToDashboard(user);
            return;
        }

        const isKoMissing = !user.ko_code || user.ko_code.trim() === "";
        const isMobileMissing = !user.mobile_no || user.mobile_no.trim() === "";
        const isNameMissing = !user.full_name || user.full_name.trim() === "";
        const isSettlementMissing = !user.settlement_account || user.settlement_account.trim() === "";
        const isSolMissing = !user.sol_id || user.sol_id.trim() === "";

        if (isKoMissing || isMobileMissing || isNameMissing || isSettlementMissing || isSolMissing) {
            const mdModal = document.getElementById('missing-detail-modal');
            const mdForm = document.getElementById('missing-detail-form');
            
            if(document.getElementById('md-ko-block')) document.getElementById('md-ko-block').style.display = isKoMissing ? 'block' : 'none';
            if(document.getElementById('md-mobile-block')) document.getElementById('md-mobile-block').style.display = isMobileMissing ? 'block' : 'none';
            if(document.getElementById('md-name-block')) document.getElementById('md-name-block').style.display = isNameMissing ? 'block' : 'none';
            if(document.getElementById('md-settlement-block')) document.getElementById('md-settlement-block').style.display = isSettlementMissing ? 'block' : 'none';
            if(document.getElementById('md-sol-block')) document.getElementById('md-sol-block').style.display = isSolMissing ? 'block' : 'none';

            if (mdModal) mdModal.style.setProperty('display', 'flex', 'important');

            mdForm.onsubmit = async (e) => {
                e.preventDefault();
                const updatedKo = isKoMissing ? document.getElementById('md-ko-input').value.trim() : user.ko_code;
                const updatedMobile = isMobileMissing ? document.getElementById('md-mobile-input').value.trim() : user.mobile_no;
                const updatedName = isNameMissing ? document.getElementById('md-name-input').value.trim() : user.full_name;
                const updatedSettlement = isSettlementMissing ? document.getElementById('md-settlement-input').value.trim() : user.settlement_account;
                const updatedSol = isSolMissing ? document.getElementById('md-sol-input').value.trim() : user.sol_id;

                try {
                    const { error } = await window.supabaseClient
                        .from('user_roles')
                        .update({
                            ko_code: updatedKo,
                            mobile_no: updatedMobile,
                            full_name: updatedName,
                            settlement_account: updatedSettlement, 
                            sol_id: updatedSol                      
                        })
                        .eq('id', user.id);

                    if (error) throw error;

                    user.ko_code = updatedKo;
                    user.mobile_no = updatedMobile;
                    user.full_name = updatedName;
                    user.settlement_account = updatedSettlement;
                    user.sol_id = updatedSol;

                    mdModal.style.display = 'none';
                    await window.showSystemAlert("Your comprehensive banking logs have been updated in Database. Workspace unlocked!", "Verification Success", "✅");
                    proceedToDashboard(user);

                } catch (err) {
                    window.showSystemAlert(`Failed to patch credentials: ${err.message}`, "Security Error", "❌");
                }
            };
        } else {
            proceedToDashboard(user);
        }
    }

    function proceedToDashboard(user) {
        currentLoggedInUser = user; 
         window.currentUser = user;
        authScreen.classList.add('hidden');
        mainDashboard.classList.remove('hidden');
        document.getElementById('user-display').textContent = `${user.full_name} (${user.role.toUpperCase()})`;
        
        applyMenuPermissions(user.role); 
        
        if (user.role === 'super_admin') {
            loadPage('super-admin');
        } else {
            loadPage('home');
        }
    }

    function applyMenuPermissions(role) {
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

    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // बबल्स/चाइल्ड एलिमेंट्स से सेफ्टी के लिए क्लोजेस्ट बटन एलीमेंट ढूंढना
            const btnTarget = e.target.closest('[data-page]');
            if (!btnTarget) return;

            const pageName = btnTarget.getAttribute('data-page');
            
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            if (btnTarget.classList.contains('nav-btn')) {
                btnTarget.classList.add('active');
            }
            loadPage(pageName);
        });
    });

    async function loadPage(pageName) {
        workspace.innerHTML = `<div class="loading">Loading component...</div>`;
        try {
            const response = await fetch(`./pages/${pageName}.html`);
            if (!response.ok) throw new Error(`Page lookup error (${response.status})`);
            const htmlContent = await response.text();
            workspace.innerHTML = htmlContent;
            initializePageModules(pageName);
        } catch (error) {
            workspace.innerHTML = `<div style="padding: 20px; color: var(--color-maroon-main); text-align: center;"><h3>⚠️ Component Failure</h3></div>`;
        }
    }

    // === फिक्स किया हुआ मॉड्यूल इनिशियलाइज़र ===
   function initializePageModules(pageName) {

    if (pageName === 'home') {
        initHomepageModule();
    }

    if (pageName === 'deposit') {
        if (typeof window.initDepositPage === 'function') {
            window.initDepositPage(currentLoggedInUser);
        } else {
            console.error("initDepositPage function missing in deposit.js");
        }
    }

    if (pageName === 'search') {
        if (typeof initSearchModule === 'function') {
            initSearchModule();
        }
    }

    if (pageName === 'super-admin') {
        if (typeof initSuperAdminModule === 'function') {
            initSuperAdminModule();
        }
    }
}

   // ==========================================
    // 7. MULTI-TENANT KO-CODE LIVE BALANCE LOGIC (UPDATED WITH COINS & SENSITIVE COMMISSION)
    // ==========================================
    async function initHomepageModule() {
        if (!currentLoggedInUser || !currentLoggedInUser.ko_code) return;

        const koCode = currentLoggedInUser.ko_code;
        const koDisplay = document.getElementById('hp-ko-display');
        const balanceDisplay = document.getElementById('hp-settlement-balance');
        const cashInHandDisplay = document.getElementById('hp-cash-in-hand');
        const commissionDisplay = document.getElementById('hp-today-commission');
        const toggleCommBtn = document.getElementById('btn-toggle-commission'); // 👈 आँख वाला बटन

        if (koDisplay) koDisplay.textContent = `KO CODE: ${koCode}`;

        try {
            // [1] लाइव डेटा हमेशा डेटाबेस (user_roles) से सिंक रखें
            const { data: userUpdate, error: fetchErr } = await window.supabaseClient
                .from('user_roles')
                .select('*')
                .eq('id', currentLoggedInUser.id)
                .single();

            if (!fetchErr && userUpdate) {
                currentLoggedInUser = userUpdate; 
            }

            // [2] होमपेज यूआई पर सेटलमेंट बैलेंस अपडेट करना
            if (balanceDisplay) {
                const sBal = parseFloat(currentLoggedInUser.settlement_balance) || 0;
                balanceDisplay.textContent = `₹ ${sBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
            }

            // [3] अवेलेबल डिनॉमिनेशन काउंटिंग और कुल कैश इन हैंड
            const n500 = parseInt(currentLoggedInUser.cash_500) || 0;
            const n200 = parseInt(currentLoggedInUser.cash_200) || 0;
            const n100 = parseInt(currentLoggedInUser.cash_100) || 0;
            const n50  = parseInt(currentLoggedInUser.cash_50)  || 0;
            const n20  = parseInt(currentLoggedInUser.cash_20)  || 0;
            const n10  = parseInt(currentLoggedInUser.cash_10)  || 0;
            const n5   = parseInt(currentLoggedInUser.cash_5)   || 0;
            const cCoins = parseInt(currentLoggedInUser.cash_coins) || 0; 

            const finalCashInHand = (n500 * 500) + (n200 * 200) + (n100 * 100) + (n50 * 50) + (n20 * 20) + (n10 * 10) + (n5 * 5) + cCoins;

            if (cashInHandDisplay) {
                cashInHandDisplay.textContent = `₹ ${finalCashInHand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
            }

            // डोम कार्ड्स में डेटा लाइव प्रदर्शित करना
            if(document.getElementById('note-count-500')) document.getElementById('note-count-500').textContent = n500;
            if(document.getElementById('note-count-200')) document.getElementById('note-count-200').textContent = n200;
            if(document.getElementById('note-count-100')) document.getElementById('note-count-100').textContent = n100;
            if(document.getElementById('note-count-50')) document.getElementById('note-count-50').textContent = n50;
            if(document.getElementById('note-count-20')) document.getElementById('note-count-20').textContent = n20;
            if(document.getElementById('note-count-10')) document.getElementById('note-count-10').textContent = n10;
            if(document.getElementById('note-count-5')) document.getElementById('note-count-5').textContent = n5;
            if(document.getElementById('coin-total-count')) document.getElementById('coin-total-count').textContent = `₹ ${cCoins}`;

            // 📈 [4] आज का लाइव नेट कमीशन कैलकुलेशन लॉजिक (Eye Icon Privacy के साथ)
            if (commissionDisplay && toggleCommBtn) {
                const todayStr = new Date().toISOString().split('T')[0]; 

                const { data: txList, error: txErr } = await window.supabaseClient
                    .from('deposit_transactions')
                    .select('commission')
                    .eq('ko_code', koCode)
                    .gte('transaction_date', `${todayStr}T00:00:00`);

                if (txErr) throw txErr;

                let totalTodayCommission = 0;
                if (txList && txList.length > 0) {
                    totalTodayCommission = txList.reduce((sum, tx) => sum + (parseFloat(tx.commission) || 0), 0);
                }

                // असली अमाउंट को एक स्ट्रिंग फॉर्मेट में तैयार करके रख लेते हैं
                const formattedCommission = `₹ ${totalTodayCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                const maskedCommission = "₹ ••••••";

                // डिफ़ॉल्ट रूप से हमेशा छुपा हुआ (Masked) ही दिखेगा जब पेज खुलेगा
                commissionDisplay.textContent = maskedCommission;
                toggleCommBtn.textContent = "👁️";
                
                // पुराना इवेंट लिसनर हटाना ताकि बटन पर बार-बार क्लिक करने से डुप्लीकेट इवेंट न बनें
                toggleCommBtn.onclick = null;

                // आँख बटन पर क्लिक करने का धासू लॉजिक
                let isHidden = true;
                toggleCommBtn.onclick = function() {
                    if (isHidden) {
                        commissionDisplay.textContent = formattedCommission; // असली अमाउंट दिखाओ
                        toggleCommBtn.textContent = "🙈"; // आँख बंद करने का सिंबल
                        isHidden = false;
                    } else {
                        commissionDisplay.textContent = maskedCommission; // अमाउंट छुपाओ
                        toggleCommBtn.textContent = "👁️"; // खुली आँख का सिंबल
                        isHidden = true;
                    }
                };
            }

        } catch (err) {
            console.error("Homepage Module Sync Error:", err);
        }
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            currentLoggedInUser = null;
            mainDashboard.classList.add('hidden');
            authScreen.classList.remove('hidden');
            loginPanel.classList.remove('hidden');
            registerPanel.classList.add('hidden');
            if(loginForm) loginForm.reset();
        });
    }
});
