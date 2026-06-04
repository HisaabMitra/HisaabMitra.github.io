// शुद्ध हिंदी नंबर्स टू वर्ड्स कनवर्टर (ग्लोबल यूटिलिटी)
window.numberToHindiWords = function(amount) {
    if (amount === 0) return "शून्य";

    const hindiOnes = ["", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ", "दस", 
                       "ग्याराह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस", "बीस",
                       "इक्कीस", "बाईस", "तेईस", "चौबीस", "पच्चीस", "छब्बीस", "सत्ताईस", "अट्ठाइस", "उनतीस", "तीस",
                       "इकत्तीस", "बत्तीस", "तैंतीस", "चौंतीस", "पैंतीस", "छत्तीस", "सैंतीस", "अड़तीस", "उनतालीस", "चालिस",
                       "इकतालीस", "बयालीस", "तैंतालीस", "चैंतालीस", "पैंतालीस", "छियालीस", "सैंतालीस", "अड़तालीस", "उनचास", "पचास",
                       "इक्कावन", "बावन", "तिरेपन", "चौवन", "पचपन", "छप्पन", "सतावन", "अठावन", "उनसठ", "साठ",
                       "इकसठ", "बासठ", "तिरसठ", "चौंसठ", "पैंसठ", "छियासठ", "सरसठ", "अड़सठ", "उनहत्तर", "सत्तर",
                       "इहत्तर", "बहत्तर", "तिहत्तर", "चौहत्तर", "पचहत्तर", "छियाहत्तर", "सतहत्तर", "अठहत्तर", "उनासी", "अस्सी",
                       "इक्यासी", "बयासी", "तिरासी", "चौरासी", "पचासी", "छियासी", "सतासी", "अठासी", "नवासी", "नब्बे",
                       "इक्यानवे", "बयानवे", "तिस्यानवे", "चौरानवे", "पंचानवे", "छियानवे", "सत्तानवे", "अट्ठानवे", "निन्यानवे"];

    let words = "";
    if (Math.floor(amount / 10000000) > 0) { words += hindiOnes[Math.floor(amount / 10000000)] + " करोड़ "; amount %= 10000000; }
    if (Math.floor(amount / 100000) > 0) { words += hindiOnes[Math.floor(amount / 100000)] + " लाख "; amount %= 100000; }
    if (Math.floor(amount / 1000) > 0) { words += hindiOnes[Math.floor(amount / 1000)] + " हजार "; amount %= 1000; }
    if (Math.floor(amount / 100) > 0) { words += hindiOnes[Math.floor(amount / 100)] + " सौ "; amount %= 100; }
    if (amount > 0) { words += hindiOnes[amount]; }

    return words.trim();
}




// ========================================================
// 🔍 GLOBAL REUSABLE NEW CUSTOMER REGISTRATION ENGINE
// ========================================================

window.showDynamicNewCustomerModal = function(options) {
    return new Promise((resolve) => {
        // अगर पहले से मोडल डोम में नहीं है, तो उसे लाइव क्रिएट करें
        let modal = document.getElementById('global-new-cust-modal');
        if (!modal) {
            const modalHTML = `
                <div id="global-new-cust-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.55); backdrop-filter: blur(3px); z-index: 99999; align-items: center; justify-content: center;">
                    <div style="background: white; padding: 25px 30px; border-radius: 10px; max-width: 400px; width: 90%; text-align: left; box-shadow: 0 10px 30px rgba(0,0,0,0.2); border-top: 6px solid #7d0022;">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom: 8px;">
                            <span style="font-size: 1.5rem;">🔍</span>
                            <h3 style="color:#7d0022; margin:0; font-size:1.3rem; font-weight:700;">New Customer Detected</h3>
                        </div>
                        <p style="font-size:0.85rem; color:#666; margin-bottom:20px; line-height:1.4;">Please enter detail and registered Customer!</p>
                        
                        <div style="margin-bottom:14px;">
                            <label style="font-size:0.8rem; font-weight:600; color:#555; display:block; margin-bottom:4px;" id="lbl-gl-acc">A/C No. <span id="req-gl-acc">*</span></label>
                            <input type="text" id="nc-gl-account-no" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box; font-size:0.9rem;">
                        </div>
                        <div style="margin-bottom:14px;">
                            <label style="font-size:0.8rem; font-weight:600; color:#555; display:block; margin-bottom:4px;" id="lbl-gl-aadhaar">Aadhar No. <span id="req-gl-aadhaar">*</span></label>
                            <input type="text" id="nc-gl-aadhaar-no" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box; font-size:0.9rem;">
                        </div>
                        <div style="margin-bottom:14px;">
                            <label style="font-size:0.8rem; font-weight:600; color:#555; display:block; margin-bottom:4px;">Name *</label>
                            <input type="text" id="nc-gl-name" placeholder="Enter full name" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box; font-size:0.9rem; text-transform: uppercase;">
                        </div>
                        <div style="margin-bottom:14px;">
                            <label style="font-size:0.8rem; font-weight:600; color:#555; display:block; margin-bottom:4px;">Mobile *</label>
                            <input type="tel" id="nc-gl-mobile" placeholder="10-digit mobile number" maxlength="10" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box; font-size:0.9rem;">
                        </div>
                        <div style="margin-bottom:22px;">
                            <label style="font-size:0.8rem; font-weight:600; color:#555; display:block; margin-bottom:4px;">Address *</label>
                            <input type="text" id="nc-gl-address" placeholder="City / Branch Area" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box; font-size:0.9rem; text-transform: uppercase;">
                        </div>
                        <div style="display: flex; gap:12px; justify-content: flex-end;">
                            <button id="btn-nc-gl-cancel" style="padding:10px 16px; background:#f4f6f8; border:1px solid #ddd; color:#555; cursor:pointer; border-radius:6px; font-weight:600; font-size:0.85rem;">Cancel</button>
                            <button id="btn-nc-gl-continue" style="padding:10px 20px; background:#7d0022; color:white; border:none; cursor:pointer; border-radius:6px; font-weight:700; font-size:0.85rem;">Register & Continue</button>
                        </div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            modal = document.getElementById('global-new-cust-modal');
        }

        // DOM इनपुट एलिमेंट्स हुक्स
        const inputAcc = document.getElementById('nc-gl-account-no');
        const inputAadhaar = document.getElementById('nc-gl-aadhaar-no');
        const inputName = document.getElementById('nc-gl-name');
        const inputMobile = document.getElementById('nc-gl-mobile');
        const inputAddress = document.getElementById('nc-gl-address');
        const btnCancel = document.getElementById('btn-nc-gl-cancel');
        const btnContinue = document.getElementById('btn-nc-gl-continue');

        // पुराने डेटा को क्लीन करें
        inputAcc.value = options.account_number || "";
        inputAadhaar.value = options.aadhaar_number || "";
        inputName.value = "";
        inputMobile.value = "";
        inputAddress.value = "";
        
        inputAcc.readOnly = false;
        inputAadhaar.readOnly = false;

        // 🎯 शर्त नियम सेटिंग्स (Deposit vs Withdrawal Condition Mapping)
        if (options.source === 'deposit') {
            // डिपॉजिट पेज: ए/सी नंबर लॉक और मैंडेटरी, आधार नॉन-मैंडेटरी
            if (options.account_number) inputAcc.readOnly = true;
            document.getElementById('req-gl-acc').style.display = 'inline';
            document.getElementById('req-gl-aadhaar').style.display = 'none';
        } else if (options.source === 'withdrawal') {
            // विथड्रॉल पेज: आधार नंबर लॉक और मैंडेटरी, ए/सी नॉन-मैंडेटरी
            if (options.aadhaar_number) inputAadhaar.readOnly = true;
            document.getElementById('req-gl-acc').style.display = 'none';
            document.getElementById('req-gl-aadhaar').style.display = 'inline';
        }

        modal.style.setProperty('display', 'flex', 'important');
        inputName.focus();

        // सबमिशन हैंडलर
        btnContinue.onclick = async function() {
            const accVal = inputAcc.value.trim();
            const aadhaarVal = inputAadhaar.value.trim();
            const nameVal = inputName.value.trim().toUpperCase();
            const mobileVal = inputMobile.value.trim();
            const addressVal = inputAddress.value.trim().toUpperCase();

            // १. यूनिवर्सल मैंडेटरी फील्ड्स वैलिडेशन Check
            if (!nameVal || !mobileVal || !addressVal || mobileVal.length !== 10) {
                window.showSystemAlert("कृपया नाम, 10-अंकीय मोबाइल नंबर और पता अनिवार्य रूप से भरें!", "Validation Warning", "⚠️");
                return;
            }

            // २. कंडीशनल मैंडेटरी फील्ड्स चेक
            if (options.source === 'deposit' && !accVal) {
                window.showSystemAlert("डिपॉजिट काउंटर पर खाता संख्या (A/C No.) अनिवार्य है!", "Validation Warning", "⚠️");
                return;
            }
            if (options.source === 'withdrawal' && (!aadhaarVal || aadhaarVal.length !== 12)) {
                window.showSystemAlert("विथड्रॉल काउंटर पर 12-अंकीय आधार संख्या अनिवार्य है!", "Validation Warning", "⚠️");
                return;
            }

            btnContinue.textContent = "Processing...";
            btnContinue.disabled = true;

            try {
                // डेटाबेस पेलोड निर्माण
                const insertPayload = {
                    account_number: accVal || null,
                    [ 'aadhaar_number' ]: aadhaarVal || null,
                    customer_name: nameVal,
                    mobile_number: mobileVal,
                    customer_address: addressVal
                };

                const { error: insErr } = await window.supabaseClient
                    .from('banking_customers')
                    .insert([insertPayload]);

                if (insErr) throw insErr;

                modal.style.display = 'none';
                window.showSystemAlert("🎉 नया ग्राहक सफलतापूर्वक पंजीकृत कर लिया गया है!", "Registration Success", "✅");
                
                // रिजल्ट वापस भेजें
                resolve({ success: true, customer_name: nameVal, account_number: accVal, aadhaar_number: aadhaarVal });

            } catch (err) {
                window.showSystemAlert("पंजीकरण डेटाबेस विफलता: " + err.message, "Database Error", "❌");
                resolve({ success: false });
            } finally {
                btnContinue.textContent = "Register & Continue";
                btnContinue.disabled = false;
            }
        };

        // कैंसिल बटन हैंडलर
        btnCancel.onclick = function() {
            modal.style.display = 'none';
            resolve({ success: false, cancelled: true });
        };
    });
};


