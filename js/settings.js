// ========================================================
// ⚙️ JARVIS SETTINGS & MERGER ROUTING ENGINE
// ========================================================

(function initSettingsPage() {
    console.log("⚙️ Jarvis Settings Core Initializing...");
    
    // प्रोफाइल सेक्शन्स में करंट यूज़र का लाइव डेटा इंजेक्ट करें
    if (window.currentUser) {
        document.getElementById('prof-display-name').value = window.currentUser.full_name || "";
        document.getElementById('prof-ko-code').value = window.currentUser.ko_code || "";
        document.getElementById('prof-address').value = window.currentUser.address || "";
        
        // चेक करें कि क्या यूजर का मर्जर स्टेटस पहले से ही पेंडिंग या मर्ज्ड है
        checkCurrentMergerStatus();
    }
})();

// १. टारगेट KO कोड को खोजना और लाइव लेबल में वेरीफाई करना
async function searchKOForMerger() {
    const targetKo = document.getElementById('merger-target-ko').value.trim();
    const vBox = document.getElementById('merger-verification-box');
    const lblName = document.getElementById('lbl-merger-target-name');
    const lblAddress = document.getElementById('lbl-merger-target-address');
    const submitBtn = document.getElementById('btn-submit-merger');

    if (!targetKo) {
        window.showSystemAlert("कृपया खोजने के लिए एक वैध KO कोड दर्ज करें।", "Validation Error", "❌");
        return;
    }

    if (targetKo === window.currentUser?.ko_code) {
        window.showSystemAlert("आप अपने खुद के KO कोड के साथ मर्ज रिक्वेस्ट नहीं बना सकते सर!", "Operation Denied", "⚠️");
        return;
    }

    try {
        // सुप्राबेस से लाइव यूजर सर्च क्वेरी (user_roles टेबल से)
        const { data, error } = await window.supabase
            .from('user_roles')
            .select('full_name, address')
            .eq('ko_code', targetKo)
            .single();

        if (error || !data) {
            vBox.classList.add('d-none');
            submitBtn.disabled = true;
            window.showSystemAlert(`KO कोड '${targetKo}' डेटाबेस में नहीं मिला। कृपया जांचें।`, "Not Found", "🔍");
            return;
        }

        // लाइव डेटा डिस्प्ले करें
        lblName.innerText = data.full_name.toUpperCase();
        lblAddress.innerText = data.address || "KIOSK CENTER, INDIA";
        
        vBox.classList.remove('d-none');
        submitBtn.disabled = false; // बटन इनेबल करें

    } catch (err) {
        console.error("Merger System Search Failure:", err);
    }
}

// २. फाइनल मर्जर रिक्वेस्ट डेटाबेस में सबमिट करना
async function submitMergerRequest() {
    const targetKo = document.getElementById('merger-target-ko').value.trim();
    
    if (!window.currentUser?.id) return;

    try {
        // यूज़र की रो को 'pending' और टारगेट KO कोड के साथ अपडेट करें
        const { error } = await window.supabase
            .from('user_roles')
            .update({
                merger_requested_with: targetKo,
                merger_status: 'pending'
            })
            .eq('id', window.currentUser.id);

        if (error) throw error;

        // लोकल यूज़र ऑब्जेक्ट स्टेट भी अपडेट करें
        window.currentUser.merger_status = 'pending';
        window.currentUser.merger_requested_with = targetKo;

        checkCurrentMergerStatus();
        window.showSystemAlert("🚀 मर्जर रिक्वेस्ट सुपर-एडमिन पोर्टल पर भेज दी गई है! अप्रूवल मिलते ही सिंक चालू हो जाएगा।", "Submitted", "✅");

    } catch (err) {
        console.error("Merger Submission Failed:", err);
        window.showSystemAlert("रिक्वेस्ट सबमिट करने में विफल। कृपया पुन: प्रयास करें।", "Error", "❌");
    }
}

// ३. करंट मर्जर स्टेटस चेक और UI लॉक मैकेनिज्म
function checkCurrentMergerStatus() {
    const alertBox = document.getElementById('merger-status-alert');
    const submitBtn = document.getElementById('btn-submit-merger');
    const searchBtn = document.getElementById('btn-search-merger-ko');
    const inputKo = document.getElementById('merger-target-ko');

    const status = window.currentUser?.merger_status || 'none';
    const target = window.currentUser?.merger_requested_with || '';

    if (status === 'pending') {
        alertBox.className = "alert alert-warning small p-2 mt-2";
        alertBox.innerHTML = `<i class="fas fa-clock me-1"></i> <strong>Pending Approval:</strong> आपकी KO कोड <b>${target}</b> के साथ मर्ज करने की रिक्वेस्ट सुपर-एडमिन के पास विचाराधीन है।`;
        alertBox.classList.remove('d-none');
        
        // UI एलिमेंट्स को लॉक करें ताकि दोबारा रिक्वेस्ट न भेजी जा सके
        if(submitBtn) submitBtn.disabled = true;
        if(searchBtn) searchBtn.disabled = true;
        if(inputKo) inputKo.disabled = true;
    } else if (status === 'merged') {
        alertBox.className = "alert alert-success small p-2 mt-2";
        alertBox.innerHTML = `<i class="fas fa-check-circle me-1"></i> <strong>Merged & Active:</strong> आपका काउंटर इस समय KO कोड <b>${target}</b> के साथ सफलतापूर्वक लिंक्ड है। पासबुक प्रिंटर कतारें लाइव सिंक हो रही हैं!`;
        alertBox.classList.remove('d-none');
        
        if(submitBtn) submitBtn.disabled = true;
        if(searchBtn) searchBtn.disabled = true;
        if(inputKo) inputKo.disabled = true;
    }
}

// ४. प्रोफाइल अपडेट हैंडलर
async function updateProfileSettings() {
    const newAddress = document.getElementById('prof-address').value.trim();
    if(!newAddress) return;

    try {
        const { error } = await window.supabase
            .from('user_roles')
            .update({ address: newAddress })
            .eq('id', window.currentUser.id);

        if (error) throw error;
        window.currentUser.address = newAddress;
        window.showSystemAlert("प्रोफाइल का पता सफलतापूर्वक अपडेट कर दिया गया है।", "Success", "✅");
    } catch (err) {
        console.error("Profile Update Failed:", err);
    }
}
