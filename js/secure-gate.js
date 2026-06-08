// ========================================================
// 🔐 SECURITY GATE ENGINE: 4-DIGIT AUTO-SUBMIT PIN RUNTIME
// ========================================================

window.JarvisSecureGate = {
    modal: null,
    boxes: [],
    statusMsg: null,
    targetPageName: null,
    currentUser: null,
    isRegisterMode: false,

    // 🚀 [LAUNCH SECURITY CHECK GATE]
    gatekeep: async function(pageName, user) {
        this.targetPageName = pageName;
        this.currentUser = user;

        // Dom components references fetch karein
        this.modal = document.getElementById('jarvis-secure-pin-modal');
        this.boxes = Array.from(document.querySelectorAll('.pin-digit-box'));
        this.statusMsg = document.getElementById('pin-modal-status-msg');

        if (!this.modal || this.boxes.length === 0) {
            console.error("❌ Critical Secure Pin UI elements missing from DOM mapping!");
            return;
        }

        try {
            // Live database check: User ka pin exist karta h ya null h?
            const { data: roleData, error } = await window.supabaseClient
                .from('user_roles')
                .select('secure_pin')
                .eq('ko_code', user.ko_code)
                .maybeSingle();

            if (error) throw error;

            // Modal text components references mapping
            const titleEl = document.getElementById('pin-modal-title');
            const descEl = document.getElementById('pin-modal-desc');
            const iconEl = document.getElementById('pin-modal-icon');

            if (roleData && roleData.secure_pin) {
                // Scenario B: Registered User Matrix Mode
                this.isRegisterMode = false;
                if (titleEl) titleEl.innerText = "Security PIN Required";
                if (descEl) descEl.innerText = "Enter your 4-digit authorization PIN to unlock the Accounts Manager terminal.";
                if (iconEl) iconEl.innerText = "🔒";
            } else {
                // Scenario A: First-Time User Registration Mode
                this.isRegisterMode = true;
                if (titleEl) titleEl.innerText = "Create Security PIN";
                if (descEl) descEl.innerText = "Setup a new 4-digit secure access PIN for your accounts manager node registration.";
                if (iconEl) iconEl.innerText = "🆕";
            }

            // Interface clear and dynamic presentation
            this.clearGate();
            this.modal.classList.remove('hidden');
            this.attachListeners();

            // Pehle input box par automatic cursor blink
            setTimeout(() => this.boxes[0].focus(), 150);

        } catch (err) {
            console.error("Secure Gate verification failure:", err);
            window.showSystemAlert("सुरक्षा द्वार प्रमाणीकरण विफल हुआ।", "Security Error", "❌");
        }
    },

    // ⌨️ [ATTACH SERIALIZED KEYBOARD INTERFACE LISTENERS]
    attachListeners: function() {
        // Global document window keydown handler specifically tracking ESC key
        this._escHandler = (e) => {
            if (e.key === 'Escape' || e.keyCode === 27) {
                console.log("⌨️ ESC Key Detected: Aborting Secure Session Frame.");
                this.closeGate();
            }
        };
        document.addEventListener('keydown', this._escHandler);

        // Individual digitized digit layout input loops mapping
        this.boxes.forEach((box, idx) => {
            // Clear baseline behavior anomalies
            box.oninput = (e) => {
                const val = box.value;
                // Numeric constraint validation handle filter
                box.value = val.replace(/\D/g, ''); 
                
                if (box.value.length === 1) {
                    // Moving cursor forward automatically
                    if (idx < 3) {
                        this.boxes[idx + 1].focus();
                    } else {
                        // ⭐ THE 4th-DIGIT TRIGGER AUTOMATION SYSTEM
                        box.blur(); // Remove active visual layout
                        this.evaluatePinSequence();
                    }
                }
            };

            // Handling backspaces layout triggers
            box.onkeydown = (e) => {
                if (e.key === 'Backspace' && box.value.length === 0 && idx > 0) {
                    // Shift focus back on historical previous segment node index
                    this.boxes[idx - 1].focus();
                    this.boxes[idx - 1].value = '';
                }
            };
        });

        // Click outside layout boundaries trigger safe escape rollback closure
        if (this.modal) {
            this.modal.onclick = (e) => {
                if (e.target === this.modal) {
                    this.closeGate();
                }
            };
        }
    },

    // 🧮 [EVALUATE SUBMITTED DATA BLOCKS AUTOMATICALLY]
    evaluatePinSequence: async function() {
        // Combine numbers into a unified 4-digit string
        const enteredPin = this.boxes.map(b => b.value).join('');
        if (enteredPin.length < 4) return;

        if (this.statusMsg) this.statusMsg.innerText = "Verifying Auth Token...";

        try {
            if (this.isRegisterMode) {
                // Scenario A Logic: Save newly created pin token inside user roles
                const { error: regErr } = await window.supabaseClient
                    .from('user_roles')
                    .update({ secure_pin: enteredPin })
                    .eq('ko_code', this.currentUser.ko_code);

                if (regErr) throw regErr;

                window.showSystemAlert("🎉 आपका 4-Digit सुरक्षा पिन सफलतापूर्वक सेट हो गया है।", "PIN Created", "✅");
                this.proceedToTargetPage();

            } else {
                // Scenario B Logic: Core real-time comparison query matching
                const { data: checkData } = await window.supabaseClient
                    .from('user_roles')
                    .select('secure_pin')
                    .eq('ko_code', this.currentUser.ko_code)
                    .maybeSingle();

                if (checkData && checkData.secure_pin === enteredPin) {
                    // Valid Authenticated Action Core Frame Lift
                    this.proceedToTargetPage();
                } else {
                    // Invalid Code Verification Failure Feedback Matrix Loop
                    if (this.statusMsg) this.statusMsg.innerText = "❌ Incorrect Security PIN! Try Again.";
                    this.flashErrorFeedbackAnimation();
                }
            }
        } catch (err) {
            console.error("Token verification processing crash context:", err);
            if (this.statusMsg) this.statusMsg.innerText = "System validation error.";
        }
    },

    // 🎨 [ERROR FEEDBACK ANIMATION LAYOUT STRUCTURING]
    flashErrorFeedbackAnimation: function() {
        this.boxes.forEach(b => {
            b.style.borderColor = '#dc3545';
            b.style.background = '#f8d7da';
        });

        // Small timeout delay framework to reset interfaces safely back to inputs grid
        setTimeout(() => {
            this.boxes.forEach(b => {
                b.value = '';
                b.style.borderColor = '#ccc';
                b.style.background = '#ffffff';
            });
            if (this.statusMsg) this.statusMsg.innerText = '';
            this.boxes[0].focus(); // Reposition cursor back to index node 0
        }, 1200);
    },

    // 🔓 [SUCCESS ROUTE SWITCH SYSTEM]
    proceedToTargetPage: function() {
        this.removeListeners();
        if (this.modal) this.modal.classList.add('hidden');

        // Central framework switcher connection route bridge inside app.js layout engine
        if (typeof window.loadPage === 'function') {
            window.loadPage(this.targetPageName);
        } else {
            // Direct internal safety hook execution lookup fallback structure
            const targetElementWrapper = document.getElementById('jarvis-accounts-manager-wrapper');
            if (targetElementWrapper) targetElementWrapper.style.display = 'flex';
            if (typeof window.initAccountsManagerPage === 'function') {
                window.initAccountsManagerPage(this.currentUser);
            }
        }
    },

    // 🧹 [RESET CORES]
    clearGate: function() {
        this.boxes.forEach(b => {
            b.value = '';
            b.style.borderColor = '#ccc';
            b.style.background = '#ffffff';
        });
        if (this.statusMsg) this.statusMsg.innerText = '';
    },

    // 🛑 [CLOSE & DISCONNECT LAYOUT ENTRIES SAFE ESCAPE]
    closeGate: function() {
        this.removeListeners();
        if (this.modal) this.modal.classList.add('hidden');
        console.log("🔒 Safe Rollback Executed: Navigation Terminated By Operator.");
        
        // Dynamic bottom button highlights cleanup reset tracking matrix nodes
        document.querySelectorAll('.nav-btn, .footer-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    },

    // 🗑️ [CLEANUP EVENT INFECTIONS]
    removeListeners: function() {
        if (this._escHandler) {
            document.removeEventListener('keydown', this._escHandler);
        }
    }
};
