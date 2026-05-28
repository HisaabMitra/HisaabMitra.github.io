// js/app.js

document.addEventListener('DOMContentLoaded', () => {
    // ग्लोबल होल्डर (लॉगिन यूजर का डेटा स्टोर रखने के लिए)
    let currentLoggedInUser = null; 

    // ==========================================
    // GLOBAL CUSTOM ALERTS & PROMPTS
    // ==========================================
    window.showSystemAlert = function(message, title = "System Notification", icon = "⚠️") {
        const modal = document.getElementById('custom-alert-modal');
        const titleEl = document.getElementById('custom-alert-title');
        const msgEl = document.getElementById('custom-alert-message');
        const iconEl = document.getElementById('custom-alert-icon');
        const btn = document.getElementById('custom-alert-btn');

        if (message.includes("✅") || message.includes("Successfully")) icon = "✅";
        if (message.includes("❌") || message.includes("Failed")) icon = "❌";
        if (message.includes("🚨") || message.includes("Expired")) icon = "🚨";

        titleEl.textContent = title;
        msgEl.textContent = message.replace(/✅|❌|⚠️|🚨/g, ''); 
        iconEl.textContent = icon;
        
        modal.style.display = 'flex';

        return new Promise((resolve) => {
            btn.onclick = () => {
                modal.style.display = 'none';
                resolve(true);
            };
        });
    };

    window.showSystemPrompt = function(message, title = "System Input") {
        const modal = document.getElementById('custom-prompt-modal');
        const titleEl = document.getElementById('custom-prompt-title');
        const msgEl = document.getElementById('custom-prompt-message');
        const inputEl = document.getElementById('custom-prompt-input');
        const submitBtn = document.getElementById('custom-prompt-submit-btn');
        const cancelBtn = document.getElementById('custom-prompt-cancel-btn');

        titleEl.textContent = title;
        msgEl.textContent = message;
        inputEl.value = ''; 
        
        modal.style.display = 'flex';
        inputEl.focus();

        return new Promise((resolve) => {
            submitBtn.onclick = () => {
                const val = inputEl.value.trim();
                modal.style.display = 'none';
                resolve(val); 
            };
            
            cancelBtn.onclick = () => {
                modal.style.display = 'none';
                resolve(null); 
            };
        });
    };

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

    // ==========================================
    // 1. LOGIN / REGISTER PANEL TOGGLE
    // ==========================================
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
            const submitBtn = registerForm.querySelector('button[type="submit"]');

            submitBtn.textContent = "Processing Request...";
            submitBtn.disabled = true;

            try {
                const { data: existingUser, error: checkError } = await window.supabaseClient
                    .from('user_roles')
                    .select('*')
                    .eq('email', email);

                if (checkError) throw checkError;

                if (existingUser && existingUser.length > 0 && existingUser[0].status === 'rejected') {
                    const { error: updateError } = await window.supabaseClient
                        .from('user_roles')
                        .update({
                            full_name: name,
                            password_text: password,
                            role: role,
                            ko_code: koCode,    
                            mobile_no: mobile,  
                            status: 'pending', 
                            objection_remark: null 
                        })
                        .eq('email', email);

                    if (updateError) throw updateError;
                    window.showSystemAlert("🔄 Request Re-Submitted Successfully with updated KO Code & Mobile!");
                } else {
                    const { error: insertError } = await window.supabaseClient
                        .from('user_roles')
                        .insert([
                            { 
                                full_name: name, 
                                email: email, 
                                password_text: password, 
                                role: role, 
                                ko_code: koCode,    
                                mobile_no: mobile,  
                                status: 'pending' 
                            }
                        ]);

                    if (insertError) throw insertError;
                    window.showSystemAlert("✅ Registration Request Submitted with KO Code!");
                }

                registerForm.reset();
                document.getElementById('reg-email').readOnly = false;
                submitBtn.textContent = "Submit Registration";
                registerPanel.classList.add('hidden');
                loginPanel.classList.remove('hidden');

            } catch (err) {
                window.showSystemAlert(`❌ Request Failed: ${err.message}`);
            } finally {
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
                    
                    window.showSystemAlert(`⚠️ Objection Raised!\n\nReason for Rejection: "${reason}"\n\nPlease click 'Create Account' to correct your details and re-submit your registration.`);
                    
                    document.getElementById('reg-name').value = user.full_name;
                    document.getElementById('reg-email').value = user.email;
                    document.getElementById('reg-email').readOnly = true; 
                    document.getElementById('reg-ko-code').value = user.ko_code || "";
                    document.getElementById('reg-mobile').value = user.mobile_no || "";
                    document.getElementById('reg-password').value = user.password_text;
                    document.getElementById('reg-role').value = user.role;
                    
                    loginPanel.classList.add('hidden');
                    registerPanel.classList.remove('hidden');
                    
                    registerPanel.querySelector('button[type="submit"]').textContent = "Re-Submit Updated Request";
                    return;
                }

                if (user.status === 'pending') {
                    window.showSystemAlert(`⏳ Access Pending: Your account is awaiting clearance from Super Admin.`);
                    return;
                }

                if (user.expiry_date) {
                    const today = new Date();
                    const expiry = new Date(user.expiry_date);
                    if (expiry < today) {
                        window.showSystemAlert("🚨 Access Code Expired! Your 6-month system clearance has ended. Please contact Super Admin for renewal.");
                        return;
                    }
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
    // 4. ROLE-BASED MENUS & PROFILE INTEGRITY CHECK
    // ==========================================
    async function showDashboard(user) {
        if (user.role === 'super_admin') {
            proceedToDashboard(user);
            return;
        }

        const isKoMissing = !user.ko_code || user.ko_code.trim() === "";
        const isMobileMissing = !user.mobile_no || user.mobile_no.trim() === "";
        const isNameMissing = !user.full_name || user.full_name.trim() === "";

        if (isKoMissing || isMobileMissing || isNameMissing) {
            const mdModal = document.getElementById('missing-detail-modal');
            const mdForm = document.getElementById('missing-detail-form');
            
            document.getElementById('md-ko-block').style.display = isKoMissing ? 'block' : 'none';
            document.getElementById('md-ko-input').required = isKoMissing;

            document.getElementById('md-mobile-block').style.display = isMobileMissing ? 'block' : 'none';
            document.getElementById('md-mobile-input').required = isMobileMissing;

            document.getElementById('md-name-block').style.display = isNameMissing ? 'block' : 'none';
            document.getElementById('md-name-input').required = isNameMissing;

            mdModal.style.display = 'flex';

            mdForm.onsubmit = async (e) => {
                e.preventDefault();
                const submitBtn = document.getElementById('md-submit-btn');
                submitBtn.textContent = "Updating Vault Records...";
                submitBtn.disabled = true;

                const updatedKo = isKoMissing ? document.getElementById('md-ko-input').value.trim() : user.ko_code;
                const updatedMobile = isMobileMissing ? document.getElementById('md-mobile-input').value.trim() : user.mobile_no;
                const updatedName = isNameMissing ? document.getElementById('md-name-input').value.trim() : user.full_name;

                try {
                    const { error } = await window.supabaseClient
                        .from('user_roles')
                        .update({
                            ko_code: updatedKo,
                            mobile_no: updatedMobile,
                            full_name: updatedName
                        })
                        .eq('id', user.id);

                    if (error) throw error;

                    user.ko_code = updatedKo;
                    user.mobile_no = updatedMobile;
                    user.full_name = updatedName;

                    mdModal.style.display = 'none';
                    mdForm.reset();
                    
                    await window.showSystemAlert("Your profile logs have been updated successfully. Workspace is now unlocked!", "Verification Success", "✅");
                    
                    proceedToDashboard(user);

                } catch (err) {
                    await window.showSystemAlert(`Failed to patch credentials: ${err.message}`, "Security Error", "❌");
                } finally {
                    submitBtn.textContent = "Save & Unlock Workspace";
                    submitBtn.disabled = false;
                }
            };
        } else {
            proceedToDashboard(user);
        }
    }

    function proceedToDashboard(user) {
        currentLoggedInUser = user; 
        authScreen.classList.add('hidden');
        mainDashboard.classList.remove('hidden');
        document.getElementById('user-display').textContent = `${user.full_name} (${user.role.toUpperCase()})`;
        
        applyMenuPermissions(user.role); 
        
        if (user.role === 'super_admin') {
            loadPage('super-admin');
            document.querySelectorAll('.nav-btn').forEach(btn => {
                if(btn.getAttribute('data-page') === 'super-admin') btn.classList.add('active');
                else btn.classList.remove('active');
            });
        } else {
            loadPage('home');
        }
    }

    // ==========================================
    // 5. STRENGTHENED MENU PERMISSIONS (LOCK SYSTEM)
    // ==========================================
    function applyMenuPermissions(role) {
        const allMenuButtons = document.querySelectorAll('[data-page]');

        allMenuButtons.forEach(btn => {
            const page = btn.getAttribute('data-page');

            // 1. अगर यूज़र AGENT है: सिर्फ होम, डिपॉजिट, विड्रॉल और सर्च दिखेगा
            if (role === 'agent') {
                const allowedAgentPages = ['home', 'deposit', 'withdrawal', 'search'];
                if (allowedAgentPages.includes(page)) {
                    btn.style.setProperty('display', 'block', 'important');
                } else {
                    btn.style.setProperty('display', 'none', 'important');
                }
            } 
            
            // 2. अगर यूज़र ADMIN है: उसे सुपर एडमिन को छोड़कर बाकी सब दिखेगा
            else if (role === 'admin') {
                if (page === 'super-admin') {
                    btn.style.setProperty('display', 'none', 'important');
                } else {
                    btn.style.setProperty('display', 'block', 'important');
                }
            } 
            
            // 3. अगर यूज़र SUPER ADMIN है: उसे केवल और केवल उसका अपना कंट्रोल पैनल दिखेगा
            else if (role === 'super_admin') {
                if (page === 'super-admin') {
                    btn.style.setProperty('display', 'block', 'important');
                } else {
                    btn.style.setProperty('display', 'none', 'important');
                }
            }
        });
    }

    // ==========================================
    // 6. Dynamic SPA Routing
    // ==========================================
    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const pageName = e.target.getAttribute('data-page');
            if (e.target.classList.contains('nav-btn')) {
                document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
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
            console.error('Routing Error:', error);
            workspace.innerHTML = `<div style="padding: 20px; color: var(--color-maroon-main); text-align: center;"><h3>⚠️ Component Failure</h3></div>`;
        }
    }

    function initializePageModules(pageName) {
        if (pageName === 'home') initHomepageModule();
        if (pageName === 'search' && typeof initSearchModule === 'function') initSearchModule();
        if (pageName === 'deposit' && typeof initDepositModule === 'function') initDepositModule();
        if (pageName === 'super-admin' && typeof initSuperAdminModule === 'function') initSuperAdminModule();
    }

    // ==========================================
    // 7. MULTI-TENANT KO-CODE LIVE BALANCE LOGIC
    // ==========================================
    async function initHomepageModule() {
        if (!currentLoggedInUser || !currentLoggedInUser.ko_code) return;

        const koCode = currentLoggedInUser.ko_code;
        const koDisplay = document.getElementById('hp-ko-display');
        const balanceDisplay = document.getElementById('hp-settlement-balance');

        if (koDisplay) koDisplay.textContent = `KO CODE: ${koCode}`;

        try {
            let { data: balanceData, error } = await window.supabaseClient
                .from('ko_balances')
                .select('*')
                .eq('ko_code', koCode);

            if (error) throw error;

            if (!balanceData || balanceData.length === 0) {
                const { data: newRecord, error: insertError } = await window.supabaseClient
                    .from('ko_balances')
                    .insert([{ ko_code: koCode }]) 
                    .select('*');

                if (insertError) throw insertError;
                balanceData = newRecord;
            }

            const record = balanceData[0];

            if (balanceDisplay) {
                balanceDisplay.textContent = `₹ ${parseFloat(record.settlement_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
            }

            if(document.getElementById('note-count-2000')) document.getElementById('note-count-2000').textContent = record.note_2000 || 0;
            if(document.getElementById('note-count-500')) document.getElementById('note-count-500').textContent = record.note_500 || 0;
            if(document.getElementById('note-count-200')) document.getElementById('note-count-200').textContent = record.note_200 || 0;
            if(document.getElementById('note-count-100')) document.getElementById('note-count-100').textContent = record.note_100 || 0;
            if(document.getElementById('note-count-50')) document.getElementById('note-count-50').textContent = record.note_50 || 0;
            if(document.getElementById('note-count-20')) document.getElementById('note-count-20').textContent = record.note_20 || 0;
            if(document.getElementById('note-count-10')) document.getElementById('note-count-10').textContent = record.note_10 || 0;
            if(document.getElementById('coin-total-count')) document.getElementById('coin-total-count').textContent = record.coins || 0;

        } catch (err) {
            console.error("Homepage Balance Load Error:", err);
        }
    }
    
    // लॉगआउट हैंडलर
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
