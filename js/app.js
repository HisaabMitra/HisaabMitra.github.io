// js/app.js
// 🚀 CORE APP GATEWAY & ROUTING LAUNCHER (WITH SESSION STORAGE RESTORE FLIP)

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

    // ========================================================
    // 🛡️ [JARVIS AUTO-RESTORE ENGINE]: रिफ्रेश होने पर लॉगआउट रोकना
    // ========================================================
    const savedSession = sessionStorage.getItem('loggedInUser');
    if (savedSession) {
        try {
            const parsedUser = JSON.parse(savedSession);
            console.log(`🛡️ Session Restored for KO Code: ${parsedUser.ko_code}`);
            
            // सीधे मुख्य वेरिएबल और ग्लोबल विंडो में डेटा वापस डालें
            currentLoggedInUser = parsedUser;
            window.currentUser = parsedUser;

            // बिना लॉगिन स्क्रीन दिखाए सीधे काउंटर डैशबोर्ड पर फ्लिप करें
            proceedToDashboard(parsedUser);
        } catch (e) {
            console.error("Session corrupt, clear vault:", e);
            sessionStorage.removeItem('loggedInUser');
        }
    }

    // 🔌 INITIALIZE EXTERNAL ENGINE: ऑथ मॉड्यूल को एक्टिवेट करें
    if (typeof window.initAuthEngine === 'function') {
        window.initAuthEngine(
            () => currentLoggedInUser,
            (user) => { 
                currentLoggedInUser = user; 
                window.currentUser = user;
                // 💾 सफल लॉगिन होने पर तुरंत ब्राउज़र की पक्की तिजोरी में डेटा सेव करें
                sessionStorage.setItem('loggedInUser', JSON.stringify(user));
            },
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
        
        if (authScreen) authScreen.classList.add('hidden');
        if (mainDashboard) mainDashboard.classList.remove('hidden');
        
        const userDisplay = document.getElementById('user-display');
        if (userDisplay) {
            userDisplay.textContent = `${user.full_name} (${user.role.toUpperCase()})`;
        }
        
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
        if (!workspace) return;
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
                // कमीशन या बैलेंस लाइव चेंज होने पर भी तिजोरी को रिफ्रेश करें
                sessionStorage.setItem('loggedInUser', JSON.stringify(updatedUser));
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
            // 🗑️ लॉगआउट करने पर ब्राउज़र की तिजोरी को साफ़ करें ताकि अनधिकृत एक्सेस ब्लॉक हो सके
            sessionStorage.removeItem('loggedInUser');

            currentLoggedInUser = null;
            window.currentUser = null;
            
            if (mainDashboard) mainDashboard.classList.add('hidden');
            if (authScreen) authScreen.classList.remove('hidden');
            if (loginPanel) loginPanel.classList.remove('hidden');
            if (registerPanel) registerPanel.classList.add('hidden');
            
            const lForm = document.getElementById('login-form');
            if(lForm) lForm.reset();
        });
    }
});
