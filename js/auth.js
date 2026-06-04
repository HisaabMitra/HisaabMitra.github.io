// js/auth.js
// 🔐 DEDICATED AUTHENTICATION & REGISTRATION ENGINE (WITH STORAGE LOCK SYNC)

window.initAuthEngine = function(getLoggedUser, setLoggedUser, showDashboardCallback) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginPanel = document.getElementById('login-panel');
    const registerPanel = document.getElementById('register-panel');

    // १. यूजर रजिस्ट्रेशन और री-सबमिशन लॉजिक
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value.trim().toUpperCase(); 
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;
            const role = document.getElementById('reg-role').value;
            const koCode = document.getElementById('reg-ko-code').value.trim(); 
            const mobile = document.getElementById('reg-mobile').value.trim(); 
            const settlementAcc = document.getElementById('reg-settlement-acc').value.trim();
            const solId = document.getElementById('reg-sol-id').value.trim();
            const address = document.getElementById('reg-address').value.trim().toUpperCase(); 
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
                    address: address, 
                    status: 'pending',
                    objection_remark: null
                };

                if (existingUser && existingUser.length > 0 && existingUser[0].status === 'rejected') {
                    const { error: updateError } = await window.supabaseClient
                        .from('user_roles')
                        .update(payload)
                        .eq('email', email);

                    if (updateError) throw updateError;
                    window.showSystemAlert("🔄 Request Re-Submitted Successfully with updated Bank Credentials!", "Re-Submission", "🔄");
                } else {
                    const { error: insertError = null } = await window.supabaseClient
                        .from('user_roles')
                        .insert([{ email: email, ...payload }]);

                    if (insertError) throw insertError;
                    window.showSystemAlert("✅ Registration Request Submitted with SOL ID & Settlement Account!", "Registered", "✅");
                }

                registerForm.reset();
                registerPanel.classList.add('hidden');
                loginPanel.classList.remove('hidden');

            } catch (err) {
                window.showSystemAlert(`❌ Request Failed: ${err.message}`, "Error", "❌");
            } finally {
                submitBtn.textContent = "Submit Registration";
                submitBtn.disabled = false;
            }
        });
    }

    // २. डेटाबेस लॉगिन और स्टेटस वेरिफिकेशन इंजन
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
                    window.showSystemAlert("❌ Invalid Email or Password. Please try again.", "Auth Failure", "❌");
                    return;
                }

                const user = users[0];

                if (user.status === 'rejected') {
                    const reason = user.objection_remark || "Reason not specified by Admin.";
                    window.showSystemAlert(`⚠️ Objection Raised!\n\nReason: "${reason}"\n\nPlease correct details and re-submit.`, "Registration Rejected", "⚠️");
                    
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
                    window.showSystemAlert(`⏳ Access Pending: Your account is awaiting clearance from Super Admin.`, "Approval Pending", "⏳");
                    return;
                }

                // 💾 🌟 [JARVIS MASTER LOCK]: एक्टिव ऑपरेटर क्रेडेंशियल को ब्राउज़र स्टोरेज में राइट करें
                sessionStorage.setItem('loggedInUser', JSON.stringify(user));
                
                // ग्लोबल स्टेट वैरिएबल्स असाइन करें
                setLoggedUser(user);

                // ऐप गेटवे को कमांड ट्रांसफर करें
                showDashboardCallback(user);

            } catch (err) {
               window.showSystemAlert(`❌ Auth Error: ${err.message}`, "System Crash", "❌");
            } finally {
                submitBtn.textContent = "Sign In";
                submitBtn.disabled = false;
            }
        });
    }
};
