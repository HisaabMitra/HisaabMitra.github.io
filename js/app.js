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
                // हमारे कस्टम टेबल से यूज़र का डेटा निकालें
                const { data: user, error } = await window.supabaseClient
                    .from('user_roles')
                    .select('*')
                    .eq('email', email)
                    .eq('password_text', password)
                    .single();

                if (error || !user) {
                    throw new Error("Invalid Email or Password. Please try again.");
                }

                // अप्रूवल स्टेटस चेक करें
                if (user.status !== 'approved') {
                    alert(`⚠️ Access Denied: Your account status is currently [${user.status.toUpperCase()}]. Please contact Super Admin.`);
                    return;
                }

                // अगर सब सही है तो डैशबोर्ड पर भेजें और रोल पास करें
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
        
        // रोल के हिसाब से मेनू फ़िल्टर करें
        applyMenuPermissions(user.role);
        
        // डिफ़ॉल्ट पेज लोड करें
        loadPage('home');
    }

    function applyMenuPermissions(role) {
        // सभी बटन ढूंढें जिनके पास 'data-page' एट्रिब्यूट है
        const allMenuButtons = document.querySelectorAll('[data-page]');

        allMenuButtons.forEach(btn => {
            const page = btn.getAttribute('data-page');

            if (role === 'agent') {
                // Agent को सिर्फ ट्रांजैक्शन और सर्च करने की अनुमति है
                const allowedAgentPages = ['home', 'deposit', 'withdrawal', 'search'];
                if (allowedAgentPages.includes(page)) {
                    btn.style.display = 'block'; // या 'inline-block' footer बटनों के लिए
                } else {
                    btn.style.display = 'none'; // बाकी सब छुपा दें
                }
            } 
            else if (role === 'admin') {
                // Admin को सब कुछ दिखेगा, लेकिन सुपर एडमिन के स्पेशल टूल्स नहीं (जैसे यूजर अप्रूवल)
                const restrictedAdminPages = ['settlement']; // आप अपने हिसाब से जोड़ सकते हैं
                if (restrictedAdminPages.includes(page)) {
                    btn.style.display = 'none';
                } else {
                    btn.style.display = 'block';
                }
            } 
            else if (role === 'super_admin') {
                // Super Admin को हर एक बटन दिखेगा
                btn.style.display = 'block';
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
    }
});
