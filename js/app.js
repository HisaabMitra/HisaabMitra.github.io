// js/app.js

document.addEventListener('DOMContentLoaded', async () => {
    // --- Elements ---
    const loginForm = document.getElementById('login-form');
    const authScreen = document.getElementById('auth-screen');
    const mainDashboard = document.getElementById('main-dashboard');
    const logoutBtn = document.getElementById('logout-btn');
    const workspace = document.getElementById('workspace');
    const navButtons = document.querySelectorAll('.nav-btn, .footer-btn');

    // ==========================================
    // INITIAL SESSION CHECK (Auto-Login)
    // ==========================================
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    
    if (session) {
        showDashboard(session.user.email);
    }

    // ==========================================
    // 1. SUPABASE AUTHENTICATION LOGIN
    // ==========================================
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            
            // Visual loading state
            submitBtn.textContent = "Verifying...";
            submitBtn.disabled = true;

            // Attempt actual login against Supabase Auth database
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                alert(`Authentication Failed: ${error.message}`);
                submitBtn.textContent = "Sign In";
                submitBtn.disabled = false;
            } else {
                showDashboard(data.user.email);
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const { error } = await supabaseClient.auth.signOut();
            if (error) {
                alert(`Logout error: ${error.message}`);
            } else {
                mainDashboard.classList.add('hidden');
                authScreen.classList.remove('hidden');
                loginForm.reset();
            }
        });
    }

    function showDashboard(userEmail) {
        authScreen.classList.add('hidden');
        mainDashboard.classList.remove('hidden');
        document.getElementById('user-display').textContent = `Welcome, ${userEmail.split('@')[0]}`;
        loadPage('home');
    }

    // ==========================================
    // 2. DYNAMIC ROUTING & PAGE SWAPPING (SPA)
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
            workspace.innerHTML = `
                <div style="padding: 20px; color: var(--color-maroon-main); text-align: center;">
                    <h3>⚠️ Component Loading Failure</h3>
                    <p>The layout module for <strong>"${pageName}.html"</strong> failed to render.</p>
                </div>`;
        }
    }

    function initializePageModules(pageName) {
        console.log(`Current active module initialized: ${pageName}`);
        
        // Trigger specific code routines depending on the incoming view panel
        if (pageName === 'search') {
            if (typeof initSearchModule === 'function') initSearchModule();
        } 
        else if (pageName === 'deposit') {
            if (typeof initDepositModule === 'function') {
                initDepositModule();
            } else {
                console.error("Deposit processing module initialization failed.");
            }
        }
    }
});
