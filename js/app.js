// js/app.js
// 🚀 CORE APP GATEWAY & ROUTING LAUNCHER

document.addEventListener('DOMContentLoaded', () => {
    let currentLoggedInUser = null; 
    
    // --- UI Panels Elements ---
    const loginPanel = document.getElementById('login-panel');
    const registerPanel = document.getElementById('register-panel');
    const authScreen = document.getElementById('auth-screen');
    const mainDashboard = document.getElementById('main-dashboard');
    const workspace = document.getElementById('workspace');

    // --- Buttons & Forms ---
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

    // 🔌 INITIALIZE EXTERNAL ENGINE: ऑथ मॉड्यूल को एक्टिवेट करें
    if (typeof window.initAuthEngine === 'function') {
        window.initAuthEngine(
            () => currentLoggedInUser,
            (user) => { currentLoggedInUser = user; window.currentUser = user; },
            (user) => {
                if (window.DashboardController) {
                    window.DashboardController.showDashboard(user, proceedToDashboard);
                }
            }
        );
    }

    function proceedToDashboard(user) {
        currentLoggedInUser = user; 
        window.currentUser = user;
        authScreen.classList.add('hidden');
        mainDashboard.classList.remove('hidden');
        document.getElementById('user-display').textContent = `${user.full_name} (${user.role.toUpperCase()})`;
        
        if (window.DashboardController) window.DashboardController.applyMenuPermissions(user.role); 
        
        loadPage(user.role === 'super_admin' ? 'super-admin' : 'home');
    }

    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const btnTarget = e.target.closest('[data-page]');
            if (!btnTarget) return;

            const pageName = btnTarget.getAttribute('data-page');
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            if (btnTarget.classList.contains('nav-btn')) btnTarget.classList.add('active');
            
            loadPage(pageName);
        });
    });

    // 🌟 [MASTER CASH-BREAKER CORE LOADER ENGINE] 🌟
    async function loadPage(pageName) {
        workspace.innerHTML = `<div class="loading">Loading component...</div>`;
        try {
            const cacheBreaker = Date.now();
            const response = await fetch(`./pages/${pageName}.html?v=${cacheBreaker}`);
            if (!response.ok) throw new Error(`Page lookup error (${response.status})`);
            
            workspace.innerHTML = await response.text();
            initializePageModules(pageName);
        } catch (error) {
            workspace.innerHTML = `<div style="padding: 20px; color: var(--color-maroon-main); text-align: center;"><h3>⚠️ Component Failure</h3></div>`;
        }
    }

    // 🌟 [CRITICAL SYNCHRONIZATION HUB] 🌟
    function initializePageModules(pageName) {
        if (pageName === 'home' && typeof window.initHomepageModule === 'function') {
            window.initHomepageModule(currentLoggedInUser, (updatedUser) => {
                currentLoggedInUser = updatedUser;
                window.currentUser = updatedUser;
            });
        }

        if (pageName === 'deposit') {
            if (typeof window.initDepositPage === 'function') {
                window.initDepositPage(currentLoggedInUser);
            } else {
                console.error("initDepositPage function missing in deposit.js");
            }
        }

        if (pageName === 'withdrawal') {
            if (typeof window.initWithdrawalPage === 'function') {
                window.initWithdrawalPage(currentLoggedInUser);
            } else {
                console.error("initWithdrawalPage function missing in withdrawal.js");
            }

            if (window.WitDenominationComponent) {
                setTimeout(() => {
                    window.WitDenominationComponent.clear();
                    window.WitDenominationComponent.render('master-shared-denomination-container');
                }, 100);
            }
        }

        if (pageName === 'search' && typeof initSearchModule === 'function') initSearchModule();
        if (pageName === 'super-admin' && typeof initSuperAdminModule === 'function') initSuperAdminModule();
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            currentLoggedInUser = null;
            window.currentUser = null;
            mainDashboard.classList.add('hidden');
            authScreen.classList.remove('hidden');
            loginPanel.classList.remove('hidden');
            registerPanel.classList.add('hidden');
            const lForm = document.getElementById('login-form');
            if(lForm) lForm.reset();
        });
    }
});
