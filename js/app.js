// js/app.js

document.addEventListener('DOMContentLoaded', () => {
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
    // 2. USER REGISTRATION (PENDING APPROVAL)
    // ==========================================
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;
            const role = document.getElementById('reg-role').value;
            const submitBtn = registerForm.querySelector('button[type="submit"]');

            submitBtn.textContent = "Submitting Request...";
            submitBtn.disabled = true;

            try {
                const { data, error } = await window.supabaseClient
                    .from('user_roles')
                    .insert([
                        { full_name: name, email: email, password_text: password, role: role, status: 'pending' }
                    ]);

                if (error) throw error;

                alert("✅ Registration Request Submitted! It is pending approval from Super Admin.");
                registerForm.reset();
                registerPanel.classList.add('hidden');
                loginPanel.classList.remove('hidden');

            } catch (err) {
                alert(`❌ Request Failed: ${err.message}`);
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
                    alert("❌ Invalid Email or Password. Please try again.");
                    return;
                }

                const user = users[0];

                // 1. स्टेटस चेक
                if (user.status !== 'approved') {
                    alert(`⚠️ Access Denied: Your account status is [${user.status.toUpperCase()}]. Reason: ${user.objection_remark || 'N/A'}`);
                    return;
                }

                // 2. लाइव एक्सपायरी डेट चेक
                if (user.expiry_date) {
                    const today = new Date();
                    const expiry = new Date(user.expiry_date);
                    if (expiry < today) {
                        alert("🚨 Access Code Expired! Your 6-month system clearance has ended. Please contact Super Admin for renewal.");
                        return;
                    }
                }

                showDashboard(user);

            } catch (err) {
                alert(`❌ Auth Error: ${err.message}`);
            } finally {
                submitBtn.textContent = "Sign In";
                submitBtn.disabled = false;
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            mainDashboard.classList.add('hidden');
            authScreen.classList.remove('hidden');
            loginForm.reset();
        });
    }

    // ==========================================
    // 4. ROLE-BASED MENUS CONFIGURATION (RBAC)
    // ==========================================
   function showDashboard(user) {
        authScreen.classList.add('hidden');
        mainDashboard.classList.remove('hidden');
        document.getElementById('user-display').textContent = `${user.full_name} (${user.role.toUpperCase()})`;
        
        applyMenuPermissions(user.role);
        
        // सुपर एडमिन को सीधे उसके कंट्रोल पेज पर भेजें, एजेंट्स को होम पेज पर
        if (user.role === 'super_admin') {
            loadPage('super-admin');
            // साइडबार के एक्टिव क्लास को सेट करें
            document.querySelectorAll('.nav-btn').forEach(btn => {
                if(btn.getAttribute('data-page') === 'super-admin') btn.classList.add('active');
                else btn.classList.remove('active');
            });
        } else {
            loadPage('home');
        }
    }

    function applyMenuPermissions(role) {
        const allMenuButtons = document.querySelectorAll('[data-page]');

        allMenuButtons.forEach(btn => {
            const page = btn.getAttribute('data-page');

            if (role === 'agent') {
                const allowedAgentPages = ['home', 'deposit', 'withdrawal', 'search'];
                btn.style.display = allowedAgentPages.includes(page) ? 'block' : 'none';
            } 
            else if (role === 'admin') {
                const restrictedAdminPages = ['super-admin'];
                btn.style.display = restrictedAdminPages.includes(page) ? 'none' : 'block';
            } 
            else if (role === 'super_admin') {
                // सुपर एडमिन के लिए सिर्फ उसका अपना टूल पेज दिखेगा, होम बटन बिल्कुल छुप जाएगा!
                const allowedSuperPages = ['super-admin'];
                btn.style.display = allowedSuperPages.includes(page) ? 'block' : 'none';
            }
        });
    }

    // ==========================================
    // 5. Dynamic SPA Routing
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
     if (pageName === 'search' && typeof initSearchModule === 'function') initSearchModule();
     if (pageName === 'deposit' && typeof initDepositModule === 'function') initDepositModule();

     // सुपर एडमिन का नया पेज इनिशियलाइज़ेशन यहाँ जोड़ें
     if (pageName === 'super-admin' && typeof initSuperAdminModule === 'function') initSuperAdminModule();
 }
    
});
