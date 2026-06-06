// ========================================================
// ⚙️ JARVIS SETTINGS & MULTI-PRINTER ROUTING ENGINE
// ========================================================

window.initJarvisSettingsEngine = async function() {
    try {
        console.log("🖨️ Initializing Jarvis Settings Core Panels...");
        window.dbClient = window.supabaseClient || window.supabase;

        const displayName = document.getElementById('prof-display-name');
        const koCode = document.getElementById('prof-ko-code');
        const address = document.getElementById('prof-address');
        const inputKo = document.getElementById('merger-target-ko');

        // Automatic printer fetch call to local agent
        await window.loadInstalledPrinters();

        // Inject currently logged-in user details
        if (window.currentUser) {
            if (displayName) displayName.value = window.currentUser.full_name || "";
            if (koCode) koCode.value = window.currentUser.ko_code || "";
            if (address) address.value = window.currentUser.address || "";
        }
        
        if (inputKo) {
            inputKo.onkeydown = function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    window.searchKOForMerger();
                }
            };
        }
        
        window.checkCurrentMergerStatus();

    } catch (bootErr) {
        console.error("❌ Jarvis Settings Boot Engine Crashed:", bootErr);
    }
};

window.savePrinterPreferences = function() {
    try {
        const depositPrinterName = document.getElementById('cfg-deposit-printer-name').value.trim();
        const withdrawalPrinterName = document.getElementById('cfg-withdrawal-printer-name').value.trim();

        // Store selected options directly into browser storage cache
        localStorage.setItem('jarvis_default_deposit_printer', depositPrinterName);
        localStorage.setItem('jarvis_default_withdrawal_printer', withdrawalPrinterName);

        if (window.showSystemAlert) {
            window.showSystemAlert("🖨️ आपकी PRINT प्राथमिकताएं सफलतापूर्वक सुरक्षित कर ली गई हैं!", "Saved Successfully", "✅");
        }
    } catch (err) {
        console.error("Failed to save printer preferences:", err);
    }
};

// 🎯 TARGET KO EXTRACTOR & VALIDATOR
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
        const { data, error } = await client.from('user_roles').select('full_name, address').eq('ko_code', targetKo);

        if (error || !data || data.length === 0) {
            if (vBox) vBox.style.display = 'none';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.style.background = '#e9ecef';
                submitBtn.style.cursor = 'not-allowed';
            }
            window.showSystemAlert(`KO कोड '${targetKo}' डेटाबेस में नहीं मिला।`, "Not Found", "🔍");
            return;
        }
        if (lblName) lblName.innerText = data[0].full_name.toUpperCase();
        if (lblAddress) lblAddress.innerText = data[0].address || "KIOSK CENTER, INDIA";
        if (vBox) vBox.style.display = 'block'; 
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.background = '#7d0022';
            submitBtn.style.color = '#ffffff';
            submitBtn.style.cursor = 'pointer';
        }
    } catch (err) { console.error(err); }
};

window.submitMergerRequest = async function() {
    try {
        const targetKo = document.getElementById('merger-target-ko').value.trim();
        const client = window.supabaseClient || window.supabase;
        const { error } = await client.from('user_roles').update({ merger_requested_with: targetKo, merger_status: 'pending' }).eq('id', window.currentUser.id);
        if (error) throw error;
        window.currentUser.merger_status = 'pending';
        window.currentUser.merger_requested_with = targetKo;
        window.checkCurrentMergerStatus();
        window.showSystemAlert("🚀 मर्जर रिक्वेस्ट सुपर-एडमिन पोर्टल पर भेज दी गई है!", "Submitted", "✅");
    } catch (err) { console.error(err); }
};

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
            alertBox.innerHTML = `⏳ <strong>Pending:</strong> आपने KO कोड <b>${target}</b> के साथ मर्ज करने की रिक्वेस्ट भेजी हुई है।`;
            if (submitBtn) submitBtn.disabled = true;
            if (searchBtn) searchBtn.disabled = true;
            if (inputKo) inputKo.disabled = true;
            return; 
        } 
        if (status === 'merged') {
            alertBox.style.display = 'block';
            alertBox.innerHTML = `✅ <strong>Active:</strong> आपका काउंटर KO कोड <b>${target}</b> के साथ सफलतापूर्वक लिंक्ड है।`;
            if (submitBtn) submitBtn.disabled = true;
            if (searchBtn) searchBtn.disabled = true;
            if (inputKo) inputKo.disabled = true;
            return;
        }
        alertBox.style.display = 'none';
    } catch (err) { console.error(err); }
};

window.updateProfileSettings = async function() {
    try {
        const newAddress = document.getElementById('prof-address').value.trim();
        const client = window.supabaseClient || window.supabase;
        await client.from('user_roles').update({ address: newAddress }).eq('id', window.currentUser.id);
        window.currentUser.address = newAddress;
        window.showSystemAlert("प्रोफाइल का पता सफलतापूर्वक अपडेट कर दिया गया है।", "Success", "✅");
    } catch (err) { console.error(err); }
};

window.loadInstalledPrinters = async function () {
    try {
        const response = await fetch("http://127.0.0.1:5000/printers");
        const result = await response.json();
        if (!result.success) throw new Error("Printer fetch failed");

        const depositSelect = document.getElementById("cfg-deposit-printer-name");
        const withdrawalSelect = document.getElementById("cfg-withdrawal-printer-name");
        if (!depositSelect || !withdrawalSelect) return;

        depositSelect.innerHTML = '<option value="">Select Printer</option>';
        withdrawalSelect.innerHTML = '<option value="">Select Printer</option>';

        result.printers.forEach((printer) => {
            const text = printer.name + (printer.default ? " (Default)" : "");
            depositSelect.add(new Option(text, printer.name));
            withdrawalSelect.add(new Option(text, printer.name));
        });

        depositSelect.value = localStorage.getItem('jarvis_default_deposit_printer') || "";
        withdrawalSelect.value = localStorage.getItem('jarvis_default_withdrawal_printer') || "";
    } catch (err) {
        console.error("Printer Agent Offline", err);
    }
};
