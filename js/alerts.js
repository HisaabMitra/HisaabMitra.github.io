// ==========================================
// 📂 FILE: js/alerts.js (Complete Replace)
// ==========================================

// 1. सामान्य सिस्टम अलर्ट (जो app.js और पूरे प्रोजेक्ट में यूज़ हो रहा है)
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

    // ओके बटन क्लिक हैंडलर
    btn.onclick = function() {
        modal.style.display = 'none';
    };
};

// 2. नया कन्फर्मेशन अलर्ट (डिपॉजिट/विथड्रॉल में Yes/No पूछने के लिए)
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

    // 'Yes, Proceed' (सबमिट) दबाने पर
    submitBtn.onclick = function() {
        modal.style.display = 'none';
        if (inputDiv) inputDiv.style.display = 'block'; // इनपुट बॉक्स वापस नॉर्मल (Block) करें
        if (submitBtn) submitBtn.innerText = "Update Password"; // टेक्स्ट वापस पुराना सेट करें
        if (onConfirm) onConfirm(); // डिपॉजिट का सेव फंक्शन रन करें
    };

    // Cancel दबाने पर
    cancelBtn.onclick = function() {
        modal.style.display = 'none';
        if (inputDiv) inputDiv.style.display = 'block'; // इनपुट बॉक्स वापस नॉर्मल करें
        if (submitBtn) submitBtn.innerText = "Update Password"; // टेक्स्ट वापस पुराना सेट करें
    };
};

// 3. पुराना ओरिजिनल प्रॉम्ट (अगर आपको भविष्य में पासवर्ड रीसेट के लिए इनपुट बॉक्स के साथ यूज़ करना हो)
window.showSystemPrompt = function(message, title = "Reset Password", onSubmit) {
    const modal = document.getElementById('custom-prompt-modal');
    const msgElem = document.getElementById('custom-prompt-message');
    const titleElem = document.getElementById('custom-prompt-title');
    const inputElement = document.getElementById('custom-prompt-input');
    const inputDiv = inputElement ? inputElement.parentElement : null;
    const cancelBtn = document.getElementById('custom-prompt-cancel-btn');
    const submitBtn = document.getElementById('custom-prompt-submit-btn');

    if (!modal || !inputElement) return;

    // इनपुट बॉक्स को पक्का दिखाएं और टेक्स्ट रीसेट करें
    if (inputDiv) inputDiv.style.display = 'block';
    inputElement.value = "";
    msgElem.innerText = message;
    if (titleElem) titleElem.innerText = title;
    if (submitBtn) submitBtn.innerText = "Update Password";

    modal.style.display = 'flex';

    submitBtn.onclick = function() {
        const inputValue = inputElement.value.trim();
        modal.style.display = 'none';
        if (onSubmit) onSubmit(inputValue); // टाइप की हुई वैल्यू वापस भेजें
    };

    cancelBtn.onclick = function() {
        modal.style.display = 'none';
    };
};
