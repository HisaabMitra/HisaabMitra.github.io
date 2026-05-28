// js/app.js

document.addEventListener('DOMContentLoaded', () => {
    // js/app.js में सबसे ऊपर डोम लोडेड के तुरंत बाद यह फंक्शन डालें:
window.showSystemAlert = function(message, title = "System Notification", icon = "⚠️") {
    const modal = document.getElementById('custom-alert-modal');
    const titleEl = document.getElementById('custom-alert-title');
    const msgEl = document.getElementById('custom-alert-message');
    const iconEl = document.getElementById('custom-alert-icon');
    const btn = document.getElementById('custom-alert-btn');

    // अगर कोई सफलता का संदेश है तो आइकॉन बदलें
    if (message.includes("✅") || message.includes("Successfully")) icon = "✅";
    if (message.includes("❌") || message.includes("Failed")) icon = "❌";
    if (message.includes("🚨") || message.includes("Expired")) icon = "🚨";

    titleEl.textContent = title;
    msgEl.textContent = message.replace(/✅|❌|⚠️|🚨/g, ''); // डुप्लीकेट आइकॉन हटाना
    iconEl.textContent = icon;
    
    modal.style.display = 'flex';

    // बटन क्लिक पर बंद होने का लॉजिक
    return new Promise((resolve) => {
        btn.onclick = () => {
            modal.style.display = 'none';
            resolve(true);
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
            const koCode = document.getElementById('reg-ko-code').value.trim(); // नया
            const mobile = document.getElementById('reg-mobile').value.trim(); // नया
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
                    // री-सबमिशन मोड (Update)
                    const { error: updateError } = await window.supabaseClient
                        .from('user_roles')
                        .update({
                            full_name: name,
                            password_text: password,
                            role: role,
                            ko_code: koCode,    // नया
                            mobile_no: mobile,  // नया
                            status: 'pending', 
                            objection_remark: null 
                        })
                        .eq('email', email);

                    if (updateError) throw updateError;
                    window.showSystemAlert("🔄 Request Re-Submitted Successfully with updated KO Code & Mobile!");
                } else {
                    // फ्रेश रजिस्ट्रेशन मोड (Insert)
                    const { error: insertError } = await window.supabaseClient
                        .from('user_roles')
                        .insert([
                            { 
                                full_name: name, 
                                email: email, 
                                password_text: password, 
                                role: role, 
                                ko_code: koCode,    // नया
                                mobile_no: mobile,  // नया
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

                // --- नया सुधार: REJECTED / OBJECTION HANDLE ---
                if (user.status === 'rejected') {
                    const reason = user.objection_remark || "Reason not specified by Admin.";
                    
                    // यूज़र को स्क्रीन पर ही कारण दिखाना और दोबारा फॉर्म भरने के लिए तैयार करना
                    window.showSystemAlert(`⚠️ Objection Raised!\n\nReason for Rejection: "${reason}"\n\nPlease click 'Create Account' to correct your details and re-submit your registration.`);
                    
                    // पुराने रजिस्ट्रेशन फॉर्म में उसका डेटा ऑटो-फिल कर देना ताकि उसे मेहनत न करनी पड़े
                    document.getElementById('reg-name').value = user.full_name;
                    document.getElementById('reg-email').value = user.email;
                    document.getElementById('reg-email').readOnly = true; // ईमेल को लॉक रखें ताकि नया खाता न बने, वही अपडेट हो
                    document.getElementById('reg-ko-code').value = user.ko_code || "";
                    document.getElementById('reg-mobile').value = user.mobile_no || "";
                    document.getElementById('reg-password').value = user.password_text;
                    document.getElementById('reg-role').value = user.role;
                    
                    // स्क्रीन को तुरंत रजिस्ट्रेशन पैनल पर स्विच कर देना
                    loginPanel.classList.add('hidden');
                    registerPanel.classList.remove('hidden');
                    
                    // सबमिट बटन का टेक्स्ट बदल देना ताकि उसे पता चले कि वह री-सबमिट कर रहा है
                    registerPanel.querySelector('button[type="submit"]').textContent = "Re-Submit Updated Request";
                    return;
                }

                // --- PENDING CHECK ---
                if (user.status === 'pending') {
                    window.showSystemAlert(`⏳ Access Pending: Your account is awaiting clearance from Super Admin.`);
                    return;
                }

                // --- LIVE EXPIRY CHECK ---
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
