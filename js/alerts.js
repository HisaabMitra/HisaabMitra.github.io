// ========================================================
// 📂 FILE: js/alerts.js (Complete Keyboard & Scope Upgrade)
// ========================================================

// 1. सामान्य सिस्टम अलर्ट (जो app.js और पूरे प्रोजेक्ट में यूज़ हो रहा है - Enter/Esc सपोर्ट के साथ)
window.showSystemAlert = function(message, title = "System Notification", icon = "⚠️") {
    const modal = document.getElementById('custom-alert-modal');
    const msgElem = document.getElementById('custom-alert-message');
    const titleElem = document.getElementById('custom-alert-title');
    const iconElem = document.getElementById('custom-alert-icon');
    const btn = document.getElementById('custom-alert-btn');

    if (!modal || !msgElem) {
        alert(message); // फॉलबैक (सुरक्षा के लिए)
        return;
    }

    // डेटा सेट करें
    msgElem.innerText = message;
    if (titleElem) titleElem.innerText = title;
    if (iconElem) iconElem.innerText = icon;

    // मोडल डिस्प्ले करें
    modal.style.display = 'flex';

    // क्लोज फंक्शन (लिसनर क्लीनअप के साथ)
    const closeAlert = function() {
        modal.style.display = 'none';
        window.removeEventListener('keydown', handleAlertKey, { capture: true });
    };

    // ओके बटन क्लिक हैंडलर
    btn.onclick = closeAlert;

    // ⌨️ कीबोर्ड इवेंट हैंडलर
    function handleAlertKey(e) {
        if (modal.style.display === 'flex') {
            if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Esc') {
                e.preventDefault();
                e.stopPropagation();
                closeAlert(); // किसी भी की (Key) से अलर्ट सेफ एग्जिट
            }
        }
    }

    // लिसनर को कैप्चर फेज में बाइंड करें
    window.addEventListener('keydown', handleAlertKey, { capture: true });
};

// 2. नया कन्फर्मेशन अलर्ट (डिपॉजिट/विथड्रॉल में Yes/No पूछने के लिए - Enter/Esc सपोर्ट के साथ)
window.showSystemConfirm = function(message, title = "Confirmation Required", onConfirm) {
    const modal = document.getElementById('custom-prompt-modal');
    const msgElem = document.getElementById('custom-prompt-message');
    const titleElem = document.getElementById('custom-prompt-title');
    const inputElement = document.getElementById('custom-prompt-input');
    const inputDiv = inputElement ? inputElement.parentElement : null; // इनपुट का कंटेनर div
    const cancelBtn = document.getElementById('custom-prompt-cancel-btn');
    const submitBtn = document.getElementById('custom-prompt-submit-btn');

    if (!modal) {
        if (confirm(message)) onConfirm();
        return;
    }

    // डेटा सेट करें
    msgElem.innerText = message;
    if (titleElem) titleElem.innerText = title;
    
    // चूंकि यह सिर्फ Yes/No कन्फर्मेशन है, इसलिए पासवर्ड इनपुट बॉक्स को छुपा देते हैं
    if (inputDiv) inputDiv.style.display = 'none';
    if (submitBtn) submitBtn.innerText = "Yes, Proceed";

    modal.style.display = 'flex';

    // 'Yes, Proceed' (सबमिट) ट्रिगर फंक्शन
    const handleConfirmAction = function() {
        modal.style.display = 'none';
        if (inputDiv) inputDiv.style.display = 'block'; // रिसेट स्टेट
        if (submitBtn) submitBtn.innerText = "Update Password"; 
        window.removeEventListener('keydown', handleConfirmKey, { capture: true }); // लिसनर साफ करें
        if (onConfirm) onConfirm(); // डिपॉजिट/विथड्रॉल कोर सेव फंक्शन रन करें
    };

    // Cancel (रद्द) ट्रिगर फंक्शन
    const handleCancelAction = function() {
        modal.style.display = 'none';
        if (inputDiv) inputDiv.style.display = 'block'; // रिसेट स्टेट
        if (submitBtn) submitBtn.innerText = "Update Password"; 
        window.removeEventListener('keydown', handleConfirmKey, { capture: true }); // लिसनर साफ करें
    };

    submitBtn.onclick = handleConfirmAction;
    cancelBtn.onclick = handleCancelAction;

    // ⌨️ कीबोर्ड कन्फर्मेशन लॉजिक (Strict Capture Layer)
    function handleConfirmKey(e) {
        if (modal.style.display === 'flex') {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                handleConfirmAction(); // Enter से "Yes, Proceed" रन होगा
            }
            if (e.key === 'Escape' || e.key === 'Esc') {
                e.preventDefault();
                e.stopPropagation();
                handleCancelAction(); // Esc से Cancel मोड एग्जिट
            }
        }
    }

    window.addEventListener('keydown', handleConfirmKey, { capture: true });
};

// 3. पुराना ओरिजिनल प्रॉम्ट (पासवर्ड रीसेट इनपुट बॉक्स के साथ - Enter/Esc सपोर्ट)
window.showSystemPrompt = function(message, title = "Reset Password") {

    return new Promise((resolve) => {

        const modal = document.getElementById('custom-prompt-modal');
        const msgElem = document.getElementById('custom-prompt-message');
        const titleElem = document.getElementById('custom-prompt-title');
        const inputElement = document.getElementById('custom-prompt-input');
        const inputDiv = inputElement ? inputElement.parentElement : null;
        const cancelBtn = document.getElementById('custom-prompt-cancel-btn');
        const submitBtn = document.getElementById('custom-prompt-submit-btn');

        if (!modal || !inputElement) {
            resolve(prompt(message));
            return;
        }

        if (inputDiv) inputDiv.style.display = 'block';

        inputElement.value = "";
        msgElem.innerText = message;
        titleElem.innerText = title;
        submitBtn.innerText = "Update Password";

        modal.style.display = 'flex';
        inputElement.focus(); // इनपुट बॉक्स पर टाइपिंग के लिए डायरेक्ट फोकस लॉक

        // प्रॉम्ट क्लोज और रिज़ॉल्व फंक्शन
        const cleanupAndResolve = function (value) {
            modal.style.display = 'none';
            window.removeEventListener('keydown', handlePromptKey, { capture: true }); // लिसनर साफ करें
            resolve(value);
        };

        submitBtn.onclick = function () {
            cleanupAndResolve(inputElement.value.trim());
        };

        cancelBtn.onclick = function () {
            cleanupAndResolve(null);
        };

        // ⌨️ प्रॉम्ट इनपुट कीबोर्ड लॉजिक
        function handlePromptKey(e) {
            if (modal.style.display === 'flex') {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    cleanupAndResolve(inputElement.value.trim()); // Enter से पासवर्ड अपडेट सबमिट
                }
                if (e.key === 'Escape' || e.key === 'Esc') {
                    e.preventDefault();
                    e.stopPropagation();
                    cleanupAndResolve(null); // Esc से रिज़ॉल्व null (Cancel)
                }
            }
        }

        window.addEventListener('keydown', handlePromptKey, { capture: true });
    });
};
