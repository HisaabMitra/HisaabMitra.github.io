// js/app.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const loginForm = document.getElementById('login-form');
    const authScreen = document.getElementById('auth-screen');
    const mainDashboard = document.getElementById('main-dashboard');
    const logoutBtn = document.getElementById('logout-btn');
    const workspace = document.getElementById('workspace');
    const navButtons = document.querySelectorAll('.nav-btn, .footer-btn');

    // ==========================================
    // 1. AUTHENTICATION TRANSITION (Temporary Mimic)
    // ==========================================
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Temporary validation placeholder until Supabase integration
            const email = document.getElementById('username').value;
            
            // UI Toggle: Hide login, show dashboard
            authScreen.classList.add('hidden');
            mainDashboard.classList.remove('hidden');
            
            document.getElementById('user-display').textContent = `Welcome, ${email.split('@')[0]}`;
            
            // Load the default landing workspace view
            loadPage('home');
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Reverse UI Toggle
            mainDashboard.classList.add('hidden');
            authScreen.classList.remove('hidden');
            loginForm.reset();
        });
    }

    // ==========================================
    // 2. DYNAMIC ROUTING & PAGE SWAPPING (SPA)
    // ==========================================
    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const pageName = e.target.getAttribute('data-page');
            
            // Only update "active" highlight styling for sidebar buttons
            if (e.target.classList.contains('nav-btn')) {
                document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
            }
            
            loadPage(pageName);
        });
    });

    /**
     * Fetches static HTML component files from the /pages directory 
     * and injects them seamlessly into the dashboard workspace.
     */
    async function loadPage(pageName) {
        workspace.innerHTML = `<div class="loading">Loading component...</div>`;
        
        try {
            // Note: GitHub pages paths are relative to root repository
            const response = await fetch(`pages/${pageName}.html`);
            
            if (!response.ok) {
                throw new Error(`Page component could not be retrieved (${response.status})`);
            }
            
            const htmlContent = await response.text();
            workspace.innerHTML = htmlContent;
            
            // Hook up specific module features if a specialized loader exists
            initializePageModules(pageName);
            
        } catch (error) {
            console.error('Routing Error:', error);
            workspace.innerHTML = `
                <div style="padding: 20px; color: var(--color-maroon-main); text-align: center;">
                    <h3>⚠️ Component Loading Failure</h3>
                    <p>The layout module for <strong>"${pageName}.html"</strong> was not found or failed to render.</p>
                </div>`;
        }
    }

    /**
     * Placeholder function where we will initialize functional JS 
     * (like deposit calculators, charts, tables) depending on which view is injected.
     */
    function initializePageModules(pageName) {
        console.log(`Current active module initialized: ${pageName}`);
        // Future code steps will plug into here (e.g., if (pageName === 'deposit') initDeposit();)
    }
});
