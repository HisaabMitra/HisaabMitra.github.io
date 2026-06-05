// ========================================================
// ⚙️ JARVIS SETTINGS & MERGER ROUTING ENGINE (GLOBAL SCOPE FIXED)
// ========================================================

window.initJarvisSettingsEngine = function() {
    console.log("⚙️ Jarvis Settings Core Initializing via App Gateway...");
    
    try {
        // आपके index.html में मौजूद लाइव सुप्राबेस क्लाइंट को ढूंढें
        window.dbClient = window.supabaseClient || window.supabase;

        // प्रोफाइल सेक्शन्स में करंट यूज़र का लाइव डेटा इंजेक्ट करें
        const displayName = document.getElementById('prof-display-name');
        const koCode = document.getElementById('prof-ko-code');
        const address = document.getElementById('prof-address');
        const inputKo = document.getElementById('merger-target-ko');

        if (window.currentUser) {
            if (displayName) displayName.value = window.currentUser.full_name || "";
            if (koCode) koCode.value = window.currentUser.ko_code || "";
            if (address) address.value = window.currentUser.address || "";
        }
        
        // ⌨️ [ENTER KEY HOOK]: इनपुट बॉक्स में Enter दबाते ही सर्च ट्रिगर करें
        if (inputKo) {
            inputKo.onkeydown = function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    window.searchKOForMerger();
                }
            };
        }
        
        // मर्जर स्टेटस चेक करें
        window.checkCurrentMergerStatus();
        console.log("⚙️ Jarvis Settings DOM Render Completed Successfully.");

    } catch (bootErr) {
        console.error("❌ Jarvis Settings Boot Engine Crashed:", bootErr);
    }
};

// 🎯 १. टारगेट KO कोड को खोजना और लाइव लेबल में वेरीफाई करना (ग्लोबल स्कोप)
window.searchKOForMerger = async function() {
    console.log("🔍 Search KO Target Triggered...");
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

        // लाइव डेटाबेस सर्च थ्रेड
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

        // लाइव डेटा डिस्प्ले और बॉक्स विज़िबिलिटी फ़ोर्स करना
        if (lblName) lblName.innerText = matchUser.full_name.toUpperCase();
        if (lblAddress) lblAddress.innerText = matchUser.address || "KIOSK CENTER, INDIA";
        
        if (vBox) vBox.style.display = 'block'; // display block force करें
        
        // सबमिट बटन को चमकीला और एक्टिव करें
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

// 🎯 २. फाइनल मर्जर रिक्वेस्ट डेटाबेस में सबमिट करना (ग्लोबल स्कोप)
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

// 🎯 ३. करंट मर्जर स्टेटस चेक और UI लॉक मैकेनिज्म (ग्लोबल स्कोप)
window.checkCurrentMergerStatus = function() {
    try {
        const alertBox = document.getElementById('merger-status-alert');
        const submitBtn = document.getElementById('btn-submit-merger');
        const searchBtn = document.getElementById('btn-search-merger-ko');
        const inputKo = document.getElementById('merger-target-ko');

        const status = window.currentUser?.merger_status || 'none';
        const target = window.currentUser?.merger_requested_with || '';

        if (!alertBox) return;

        if (status === 'pending') {
            alertBox.style.display = 'block';
            alertBox.style.background = '#fff3cd';
            alertBox.style.color = '#856404';
            alertBox.innerHTML = `⏳ <strong>Pending Approval:</strong> आपकी KO कोड <b>${target}</b> के साथ मर्ज करने की रिक्वेस्ट सुपर-एडमिन के पास विचाराधीन है।`;
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.style.background = '#e9ecef';
                submitBtn.style.color = '#6c757d';
                submitBtn.style.cursor = 'not-allowed';
            }
            if (searchBtn) searchBtn.disabled = true;
            if (inputKo) inputKo.disabled = true;
        } else if (status === 'merged') {
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
        }
    } catch (err) {
        console.error("Error in checking merger status UI:", err);
    }
};

// 🎯 ४. प्रोफाइल अपडेट हैंडलर (ग्लोबल स्कोप)
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
