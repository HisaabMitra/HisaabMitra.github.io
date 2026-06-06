// ========================================================
// ⚙️ JARVIS SETTINGS & MULTI-PRINTER ROUTING ENGINE (PYTHON AGENT MODE)
// ========================================================

window.initJarvisSettingsEngine = async function() {
    try {
        window.dbClient = window.supabaseClient || window.supabase;

        const displayName = document.getElementById('prof-display-name');
        const koCode = document.getElementById('prof-ko-code');
        const address = document.getElementById('prof-address');
        const inputKo = document.getElementById('merger-target-ko');

        // 🔄 STEP 1 & 2: Local Python Agent se printers load karna aur dropdown bharna
        // Note: Saved values iske andar hi automatic restore hongi dropdown bharne ke baad.
        await window.loadInstalledPrinters();

        // 👤 STEP 3: Profile section me current user ka live data inject karna
        if (window.currentUser) {
            if (displayName) displayName.value = window.currentUser.full_name || "";
            if (koCode) koCode.value = window.currentUser.ko_code || "";
            if (address) address.value = window.currentUser.address || "";
        }
        
        // KO Merger Input Handler
        if (inputKo) {
            inputKo.onkeydown = function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    window.searchKOForMerger();
                }
            };
        }
        
        // Current Merger Status Check
        window.checkCurrentMergerStatus();

    } catch (bootErr) {
        console.error("❌ Jarvis Settings Boot Engine Crashed:", bootErr);
    }
};

// 🎯 🖨️ Printer preferences ko browser storage (localStorage) me save karna
window.savePrinterPreferences = function() {
    try {
        const depositPrinterName = document.getElementById('cfg-deposit-printer-name').value.trim();
        const withdrawalPrinterName = document.getElementById('cfg-withdrawal-printer-name').value.trim();

        // Local storage me values locked
        localStorage.setItem('jarvis_default_deposit_printer', depositPrinterName);
        localStorage.setItem('jarvis_default_withdrawal_printer', withdrawalPrinterName);

        if (window.showSystemAlert) {
            window.showSystemAlert("🖨️ आपकी प्रिंटर प्राथमिकताएं सफलतापूर्वक सुरक्षित कर ली गई हैं!", "Saved Successfully", "✅");
        }
    } catch (err) {
        console.error("Failed to save printer preferences:", err);
    }
};

// 🎯 १. टारगेट KO कोड को खोजना और लाइव लेबल में वेरीफाई करना
window.searchKOForMerger = async function() {
    try {
        const targetKoInput = document.getElementById('merger-target-ko');
        if (!targetKoInput) return;

        const targetKo = targetKoInput.value.trim();
        const vBox = document.getElementById('merger-verification-box');
        const lblName = document.getElementById('lbl-merger-target-name');
        const lblAddress = document.getElementById('lbl-merger-target-address');
        const submitBtn = document.getElementById('btn-submit-merger');

        if (!targetKo) {
            window.showSystemAlert("कृपया खोजने के लिए एक वैध KO कोड दर्ज करें।", "Validation Error", "❌");
            return;
        }

        if (window.currentUser && targetKo.toUpperCase() === window.currentUser.ko_code.toUpperCase()) {
            window.showSystemAlert("आप अपने खुद के KO कोड के साथ मर्ज रिक्वेस्ट नहीं बना सकते सर!", "Operation Denied", "⚠️");
            return;
        }

        const client = window.supabaseClient || window.supabase;
        if (!client) {
            window.showSystemAlert("डेटाबेस क्लाइंट कनेक्ट नहीं है!", "Database Error", "❌");
            return;
        }

        const { data, error } = await client
            .from('user_roles')
            .select('full_name, address')
            .eq('ko_code', targetKo);

        if (error || !data || data.length === 0) {
            if (vBox) vBox.style.display = 'none';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.style.background = '#e9ecef';
                submitBtn.style.color = '#6c757d';
                submitBtn.style.cursor = 'not-allowed';
            }
            window.showSystemAlert(`KO कोड '${targetKo}' डेटाबेस में नहीं मिला। कृपया जांचें।`, "Not Found", "🔍");
            return;
        }

        const matchUser = data[0];

        if (lblName) lblName.innerText = matchUser.full_name.toUpperCase();
        if (lblAddress) lblAddress.innerText = matchUser.address || "KIOSK CENTER, INDIA";
        
        if (vBox) vBox.style.display = 'block'; 
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.background = '#7d0022';
            submitBtn.style.color = '#ffffff';
            submitBtn.style.cursor = 'pointer';
        }

    } catch (err) {
        console.error("Merger System Search Failure:", err);
    }
};

// 🎯 २. फाइनल मर्जर रिक्वेस्ट डेटाबेस में सबमिट करना
window.submitMergerRequest = async function() {
    try {
        const targetKo = document.getElementById('merger-target-ko').value.trim();
        if (!window.currentUser?.id) return;
        
        const client = window.supabaseClient || window.supabase;

        const { error } = await client
            .from('user_roles')
            .update({
                merger_requested_with: targetKo,
                merger_status: 'pending'
            })
            .eq('id', window.currentUser.id);

        if (error) throw error;

        window.currentUser.merger_status = 'pending';
        window.currentUser.merger_requested_with = targetKo;

        window.checkCurrentMergerStatus();
        window.showSystemAlert("🚀 मर्जर रिक्वेस्ट सुपर-एडमिन पोर्टल पर भेज दी गई है! अप्रूवल मिलते ही सिंक चालू हो जाएगा।", "Submitted", "✅");

    } catch (err) {
        console.error("Merger Submission Failed:", err);
        window.showSystemAlert("रिक्वेस्ट सबमिट करने में विफल।", "Error", "❌");
    }
};

// 🎯 ३. करंट मर्जर और income रिक्वेस्ट स्टेटस चेक मैकेनिज्म
window.checkCurrentMergerStatus = async function() {
    try {
        const alertBox = document.getElementById('merger-status-alert');
        const submitBtn = document.getElementById('btn-submit-merger');
        const searchBtn = document.getElementById('btn-search-merger-ko');
        const inputKo = document.getElementById('merger-target-ko');

        if (!alertBox) return;

        const myKo = window.currentUser?.ko_code || '';
        const status = window.currentUser?.merger_status || 'none';
        const target = window.currentUser?.merger_requested_with || '';

        if (status === 'pending') {
            alertBox.style.display = 'block';
            alertBox.style.background = '#fff3cd';
            alertBox.style.color = '#856404';
            alertBox.style.border = '1px solid #ffeeba';
            alertBox.innerHTML = `⏳ <strong>Pending Outgoing Request:</strong> आपने KO कोड <b>${target}</b> के साथ मर्ज करने की रिक्वेस्ट सुपर-एडमिन के पास भेजी हुई है। अप्रूवल का इंतज़ार है।`;
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.style.background = '#e9ecef';
                submitBtn.style.color = '#6c757d';
                submitBtn.style.cursor = 'not-allowed';
            }
            if (searchBtn) searchBtn.disabled = true;
            if (inputKo) inputKo.disabled = true;
            return; 
        } 
        
        if (status === 'merged') {
            alertBox.style.display = 'block';
            alertBox.style.background = '#d4edda';
            alertBox.style.color = '#155724';
            alertBox.style.border = '1px solid #c3e6cb';
            alertBox.innerHTML = `✅ <strong>Merged & Active:</strong> आपका काउंटर इस समय KO कोड <b>${target}</b> के साथ सफलतापूर्वक लिंक्ड है। पासबुक प्रिंटर कतारें लाइव सिंक हो रही हैं!`;
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.style.background = '#e9ecef';
                submitBtn.style.color = '#6c757d';
                submitBtn.style.cursor = 'not-allowed';
            }
            if (searchBtn) searchBtn.disabled = true;
            if (inputKo) inputKo.disabled = true;
            return;
        }

        if (status === 'none' && myKo) {
            const client = window.supabaseClient || window.supabase;

            const { data: incomingReq, error } = await client
                .from('user_roles')
                .select('full_name, ko_code')
                .eq('merger_requested_with', myKo)
                .eq('merger_status', 'pending');

            if (!error && incomingReq && incomingReq.length > 0) {
                const requester = incomingReq[0];
                
                alertBox.style.display = 'block';
                alertBox.style.background = '#cfe2ff';
                alertBox.style.color = '#084298';
                alertBox.style.border = '1px solid #b6d4fe';
                alertBox.innerHTML = `🔔 <strong>Incoming Merger Notification:</strong> ऑपरेटर <b>${requester.full_name.toUpperCase()} (KO Code: ${requester.ko_code})</b> ने आपके काउंटर/प्रिंटर के साथ मर्ज होने की रिक्वेस्ट सुपर-एडमिन को भेजी है।`;
                return;
            }
        }

        alertBox.style.display = 'none';

    } catch (err) {
        console.error("Error in checking two-way merger status UI:", err);
    }
};

// 🎯 ४. प्रोफाइल अपडेट हैंडलर
window.updateProfileSettings = async function() {
    try {
        const newAddress = document.getElementById('prof-address').value.trim();
        if (!newAddress) return;
        const client = window.supabaseClient || window.supabase;

        const { error } = await client
            .from('user_roles')
            .update({ address: newAddress })
            .eq('id', window.currentUser.id);

        if (error) throw error;
        window.currentUser.address = newAddress;
        window.showSystemAlert("प्रोफाइल का पता सफलतापूर्वक अपडेट कर दिया गया है।", "Success", "✅");
    } catch (err) {
        console.error("Profile Update Failed:", err);
    }
};

// 🎯 🐍 ५. पाइथन लोकल एजेंट से लाइव प्रिंटर लोड करने वाला फंक्शन (With Exact Flow)
window.loadInstalledPrinters = async function () {
    try {
        // HTTP Call to local agent
        const response = await fetch("http://127.0.0.1:5000/printers");
        const result = await response.json();

        if (!result.success) {
            throw new Error("Printer fetch failed");
        }

        const depositSelect = document.getElementById("cfg-deposit-printer-name");
        const withdrawalSelect = document.getElementById("cfg-withdrawal-printer-name");

        if (!depositSelect || !withdrawalSelect) return;

        // Reset Options
        depositSelect.innerHTML = '<option value="">Select Printer</option>';
        withdrawalSelect.innerHTML = '<option value="">Select Printer</option>';

        // Dropdown Fill Loop
        result.printers.forEach((printer) => {
            const text = printer.name + (printer.default ? " (Default)" : "");
            
            depositSelect.add(new Option(text, printer.name));
            withdrawalSelect.add(new Option(text, printer.name));
        });

        // 🌟 Exact Flow Fix: Dropdown fill hone ke thik baad saved printer restore karein
        depositSelect.value = localStorage.getItem('jarvis_default_deposit_printer') || "";
        withdrawalSelect.value = localStorage.getItem('jarvis_default_withdrawal_printer') || "";

    } catch (err) {
        console.error("Printer Agent Connection Failed", err);

        if (window.showSystemAlert) {
            window.showSystemAlert(
                "Printer Agent not running. Please start HisaabMitra Printer Agent.",
                "Printer Service Offline",
                "⚠️"
            );
        }
    }
};
