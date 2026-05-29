// ==========================================
// DEPOSIT MODULE - CORE LOGIC WITH SUPABASE
// ==========================================

// ========================================================
// शुद्ध हिंदी नंबर्स टू वर्ड्स कनवर्टर (100% देवनागरी टेक्स्ट)
// ========================================================
function numberToHindiWords(amount) {
    if (amount === 0) return "शून्य";

    const hindiOnes = ["", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ", "दस", 
                       "ग्याराह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस", "बीस",
                       "इक्कीस", "बाईस", "तेईस", "चौबीस", "पच्चीस", "छब्बीस", "सत्ताईस", "अट्ठाइस", "उनतीस", "तीस",
                       "इकत्तीस", "बत्तीस", "तैंतीस", "चौंतीस", "पैंतीस", "छत्तीस", "सैंतीस", "अड़तीस", "उनतालीस", "चालिस",
                       "इकतालीस", "बयालीस", "तैंतालीस", "चैंतालीस", "पैंतालीस", "छियालीस", "सैंतालीस", "अड़तालीस", "उनचाas", "पचास",
                       "इक्कावन", "बावन", "तिरेपन", "चौवन", "पचपन", "छप्पन", "सतावन", "अठावन", "उनसठ", "साठ",
                       "इकसठ", "बासठ", "तिरसठ", "चौंसठ", "पैंसठ", "छियासठ", "सरसठ", "अड़सठ", "उनहत्तर", "सत्तर",
                       "इहत्तर", "बहत्तर", "तिहत्तर", "चौहत्तर", "पचहत्तर", "छियाहत्तर", "सतहत्तर", "अठहत्तर", "उनासी", "अस्सी",
                       "इक्यासी", "बयासी", "तिरासी", "चौरासी", "पचासी", "छियासी", "सतासी", "अठासी", "नवासी", "नब्बे",
                       "इक्यानवे", "बयानवे", "तिस्यानवे", "चौरानवे", "पंचानवे", "छियानवे", "सत्तानवे", "अट्ठानवे", "निन्यानवे"];

    let words = "";

    // करोड़
    if (Math.floor(amount / 10000000) > 0) {
        words += hindiOnes[Math.floor(amount / 10000000)] + " करोड़ ";
        amount %= 10000000;
    }
    // लाख
    if (Math.floor(amount / 100000) > 0) {
        words += hindiOnes[Math.floor(amount / 100000)] + " लाख ";
        amount %= 100000;
    }
    // हज़ार
    if (Math.floor(amount / 1000) > 0) {
        words += hindiOnes[Math.floor(amount / 1000)] + " हजार ";
        amount %= 1000;
    }
    // सौ
    if (Math.floor(amount / 100) > 0) {
        words += hindiOnes[Math.floor(amount / 100)] + " सौ ";
        amount %= 100;
    }
    // 1 से 99
    if (amount > 0) {
        words += hindiOnes[amount];
    }

    return words.trim();
}

// 3. मुख्य डिपॉजिट मॉड्यूल इनिशियलाइज़ेशन
window.initDepositPage = function (currentUser) {
    const workspace = document.getElementById('workspace');
    if (!workspace) return;

    // यूआई रेंडर करना (Upgraded Maroon Theme & Compact Buttons Layout)
    workspace.innerHTML = `
    <div class="deposit-wrapper" style="padding: 24px; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); animation: modalFadeIn 0.3s ease;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h2 style="color: #7d0022; margin: 0; font-size: 1.6rem; font-weight: 700; letter-spacing: 0.5px;">💰 DEPOSIT ENTRY</h2>
            <span style="background: #fdf2f4; color: #7d0022; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; border: 1px solid #f9d5dc;">
                Counter KO Code: <strong>${currentUser.ko_code}</strong>
            </span>
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin-bottom: 25px;">

        <div style="display: flex; gap: 30px; flex-wrap: wrap; align-items: flex-start;">
            
            <div style="flex: 1.1; min-width: 340px; display: flex; flex-direction: column; gap: 18px;">
                
                <div class="form-group">
                    <label style="font-weight:600; color: #444; display:block; margin-bottom:6px; font-size:0.9rem;">Customer Account Number *</label>
                    <input type="text" id="dep-account-no" placeholder="Enter Account Number" style="width:100%; padding: 11px 14px; font-size:1.1rem; font-weight:bold; border: 1px solid #dcdcdc; border-radius:6px; box-sizing: border-box; transition: all 0.3s;">
                </div>

                <div class="form-group">
                    <label style="font-weight:600; color: #444; display:block; margin-bottom:6px; font-size:0.9rem;">Customer Name</label>
                    <input type="text" id="dep-cust-name" placeholder="Name will auto-appear" readonly style="width:100%; padding: 11px 14px; background: #f8f9fa; border: 1px solid #e9ecef; border-radius:6px; font-weight: bold; color: #7d0022; box-sizing: border-box;">
                </div>

                <div class="form-group">
                    <label style="font-weight:600; color: #444; display:block; margin-bottom:6px; font-size:0.9rem;">Amount to Deposit (₹) *</label>
                    <input type="number" id="dep-amount" placeholder="0.00" style="width:100%; padding: 11px 14px; font-size:1.2rem; font-weight:bold; color: #27ae60; border: 1px solid #dcdcdc; border-radius:6px; box-sizing: border-box;">
                </div>

                <div style="background: #fafafa; padding: 12px 15px; border: 1px solid #eaeaea; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1; padding-right: 10px;">
                        <span style="font-size: 0.75rem; color:#888; display:block; text-transform: uppercase; font-weight:700;">Amount in Words</span>
                        <strong id="dep-amount-words" style="color: #2c3e50; font-size: 0.9rem; word-break: break-word;">Zero Rupees Only</strong>
                    </div>
                    <button id="btn-speak-hindi" type="button" style="background: #7d0022; border:none; color:white; cursor:pointer; font-size:0.8rem; padding: 8px 12px; border-radius:6px; font-weight:600; display:flex; align-items:center; gap:5px; transition: background 0.2s;">
                        🔊 सुने
                    </button>
                </div>

                <div class="form-group">
                    <label style="font-weight:600; color: #444; display:block; margin-bottom:6px; font-size:0.9rem;">Remarks</label>
                    <input type="text" id="dep-remarks" placeholder="Optional notes" style="width:100%; padding: 11px 14px; border: 1px solid #dcdcdc; border-radius:6px; box-sizing: border-box;">
                </div>

                <div style="display: flex; gap: 10px; margin-top: 10px; box-sizing: border-box;">
                    <button id="btn-dep-save" class="btn" style="flex: 1; background: #7d0022; color:white; padding: 12px 5px; font-weight:bold; font-size:0.85rem; cursor:pointer; border-radius:6px; border:none; text-transform: uppercase; letter-spacing: 0.3px; transition: background 0.2s; box-shadow: 0 2px 6px rgba(125,0,34,0.2);">
                        💾 Save
                    </button>
                    <button id="btn-dep-print" class="btn" style="flex: 1; background: #2980b9; color:white; padding: 12px 5px; font-weight:bold; font-size:0.85rem; cursor:pointer; border-radius:6px; border:none; text-transform: uppercase; letter-spacing: 0.3px; transition: background 0.2s;" disabled>
                        🖨️ Print
                    </button>
                    <button id="btn-dep-clear" class="btn" style="flex: 0.9; background: #7f8c8d; color:white; padding: 12px 5px; font-weight:bold; font-size:0.85rem; cursor:pointer; border-radius:6px; border:none; text-transform: uppercase; letter-spacing: 0.3px; transition: background 0.2s;">
                        🧹 Clear
                    </button>
                </div>
            </div>

            <div style="flex: 0.9; min-width: 320px; background: #fdfdfd; padding: 20px; border: 1px solid #eef0f2; border-radius: 8px; box-shadow: inset 0 1px 3px rgba(0,0,0,0.02);">
                <h4 style="margin-top:0; color:#444; font-size:0.95rem; font-weight:700; border-bottom:2px solid #7d0022; padding-bottom:8px; text-transform: uppercase; letter-spacing:0.5px;">Denomination (IN / OUT)</h4>
                
               <table style="width: 100%; border-collapse: collapse; text-align: center; margin-top:10px;">
    <thead>
        <tr style="background:#f4f6f8; color:#666; font-size:0.8rem; text-transform: uppercase; font-weight:700;">
            <th style="padding:10px; border-bottom: 1px solid #eaeaea;">Value</th>
            <th style="padding:10px; border-bottom: 1px solid #eaeaea; color: #27ae60;">Cash IN</th>
            <th style="padding:10px; border-bottom: 1px solid #eaeaea; color: #c0392b;">Cash OUT</th>
            <th style="padding:10px; border-bottom: 1px solid #eaeaea; color: #2c3e50;">Total</th>
        </tr>
    </thead>
    <tbody id="denom-table-body">
        ${[500, 200, 100, 50, 20, 10, 5].map(note => `
            <tr style="border-bottom: 1px solid #f6f6f6;" id="row-${note}">
                <td style="padding:8px; font-size:0.9rem; color:#333;"><strong>₹${note}</strong></td>
                <td style="padding:8px;"><input type="number" class="denom-in" data-note="${note}" value="0" min="0" style="width:60px; padding:6px; text-align:center; border:1px solid #dcdcdc; border-radius:4px; font-weight:600;"></td>
                <td style="padding:8px;"><input type="number" class="denom-out" data-note="${note}" value="0" min="0" style="width:60px; padding:6px; text-align:center; border:1px solid #dcdcdc; border-radius:4px; font-weight:600;"></td>
                <td style="padding:8px; font-size:0.9rem; color:#2c3e50; font-weight:700;" class="note-row-total">₹0</td>
            </tr>
        `).join('')}
    </tbody>
</table>

                <div style="margin-top:20px; padding:14px; background:#fdf2f4; border-left:4px solid #7d0022; border-radius:4px; font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#7d0022; font-size:0.9rem; text-transform:uppercase; letter-spacing:0.3px;">Net Cash Total:</span>
                    <span id="denom-total-calculated" style="color:#7d0022; font-size:1.2rem;">₹0</span>
                </div>
            </div>
        </div>
    </div>

    <div id="new-cust-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.55); backdrop-filter: blur(3px); z-index: 99999; align-items: center; justify-content: center;">
        <div style="background: white; padding: 25px 30px; border-radius: 10px; max-width: 400px; width: 90%; text-align: left; box-shadow: 0 10px 30px rgba(0,0,0,0.2); border-top: 6px solid #7d0022; animation: modalFadeIn 0.2s cubic-bezier(0.1, 0.8, 0.25, 1);">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom: 8px;">
                <span style="font-size: 1.5rem;">🔍</span>
                <h3 style="color:#7d0022; margin:0; font-size:1.3rem; font-weight:700;">New Customer Detected</h3>
            </div>
            <p style="font-size:0.85rem; color:#666; margin-bottom:20px; line-height:1.4;">This account is not registered in the system. Complete the quick registration to proceed:</p>
            
            <div style="margin-bottom:14px;">
                <label style="font-size:0.8rem; font-weight:600; color:#555; display:block; margin-bottom:4px;">Account Number</label>
                <input type="text" id="nc-account-no" readonly style="width:100%; padding:10px; background:#f8f9fa; border:1px solid #e9ecef; border-radius:6px; font-weight:bold; box-sizing:border-box; color:#444;">
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-size:0.8rem; font-weight:600; color:#555; display:block; margin-bottom:4px;">Customer Full Name *</label>
                <input type="text" id="nc-name" placeholder="Enter full name" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box; font-size:0.9rem;">
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-size:0.8rem; font-weight:600; color:#555; display:block; margin-bottom:4px;">Mobile Number *</label>
                <input type="tel" id="nc-mobile" placeholder="10-digit mobile number" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box; font-size:0.9rem;">
            </div>
            <div style="margin-bottom:22px;">
                <label style="font-size:0.8rem; font-weight:600; color:#555; display:block; margin-bottom:4px;">Address</label>
                <input type="text" id="nc-address" placeholder="City / Branch Area" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box; font-size:0.9rem;">
            </div>

            <div style="display: flex; gap:12px; justify-content: flex-end;">
                <button id="btn-nc-cancel" style="padding:10px 16px; background:#f4f6f8; border:1px solid #ddd; color:#555; cursor:pointer; border-radius:6px; font-weight:600; font-size:0.85rem; transition: background 0.2s;">Cancel</button>
                <button id="btn-nc-continue" style="padding:10px 20px; background:#7d0022; color:white; border:none; cursor:pointer; border-radius:6px; font-weight:700; font-size:0.85rem; box-shadow: 0 2px 5px rgba(125,0,34,0.2); transition: background 0.2s;">Register & Continue</button>
            </div>
        </div>
    </div>
    `;

    // --- एलिमेंट्स के रेफेरेंस ---
    const accInput = document.getElementById('dep-account-no');
    const custNameInput = document.getElementById('dep-cust-name');
    const amountInput = document.getElementById('dep-amount');
    const wordsDisplay = document.getElementById('dep-amount-words');
    const speakBtn = document.getElementById('btn-speak-hindi');
    const remarksInput = document.getElementById('dep-remarks');
    const netCashDisplay = document.getElementById('denom-total-calculated');
    
    const ncModal = document.getElementById('new-cust-modal');
    const ncAccInput = document.getElementById('nc-account-no');
    const ncNameInput = document.getElementById('nc-name');
    const ncMobileInput = document.getElementById('nc-mobile');
    const ncAddressInput = document.getElementById('nc-address');
    
    let lastSavedTransaction = null; // प्रिंट रसीद के लिए ट्रैक करने को

    // --- 4. रीयल-टाइम डिनॉमिनेशन कैलकुलेटर लॉजिक ---
    function calculateDenominationTotal() {
        let totalIn = 0;
        let totalOut = 0;

        document.querySelectorAll('.denom-in').forEach(input => {
            const note = parseInt(input.getAttribute('data-note'));
            const count = parseInt(input.value) || 0;
            totalIn += note * count;
        });

        document.querySelectorAll('.denom-out').forEach(input => {
            const note = parseInt(input.getAttribute('data-note'));
            const count = parseInt(input.value) || 0;
            totalOut += note * count;
        });

        const netCash = totalIn - totalOut;
        netCashDisplay.innerText = `₹${netCash}`;
        return netCash;
    }

    document.querySelectorAll('.denom-in, .denom-out').forEach(input => {
        input.addEventListener('input', calculateDenominationTotal);
    });

    // --- 5. अमाउंट इनपुट चेंजेस और नंबर-टू-वर्ड्स सिंक (FIXED: Calls Correct Hindi Function) ---
    amountInput.addEventListener('input', () => {
        const amt = parseInt(amountInput.value) || 0;
        if (amt === 0) {
            wordsDisplay.innerText = "Zero Rupees Only";
            return;
        }
        // लाइव स्क्रीन पर हिंदी शब्द दिखाना
        const hindiWords = numberToHindiWords(amt);
        wordsDisplay.innerText = `${hindiWords} रुपए मात्र`;
    });

// --- 6. हिंदी आवाज़ असिस्टेंट (क्रोम + माइक्रोसॉफ्ट एज यूनिवर्सल फिक्स) ---
    let systemVoices = [];

    // एज ब्राउज़र के लिए वॉयस लिस्ट को बैकग्राउंड में लोड करना
    function loadVoices() {
        systemVoices = window.speechSynthesis.getVoices();
    }
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    speakBtn.addEventListener('click', () => {
        const amt = parseInt(amountInput.value) || 0;
        if (amt === 0) {
            alert("कृपया पहले सही अमाउंट दर्ज करें!");
            return;
        }
        
        const hindiText = numberToHindiWords(amt); 
        const finalPhrase = `${hindiText} रुपए जमा के लिए तैयार है`; 
        
        // पहले से चल रही आवाज़ को बंद करें
        window.speechSynthesis.cancel(); 
        
        const utterance = new SpeechSynthesisUtterance(finalPhrase);
        utterance.rate = 0.85;  
        utterance.pitch = 1.0; 
        utterance.lang = 'hi-IN'; 

        // ताजा वॉयस लिस्ट दोबारा निकालें (एज के लिए सबसे ज़रूरी)
        if (systemVoices.length === 0) {
            systemVoices = window.speechSynthesis.getVoices();
        }

        // माइक्रोसॉफ्ट एज (Microsoft Natural Voices) और क्रोम दोनों के लिए बेस्ट हिंदी आवाज़ ढूंढना
        let hindiVoice = systemVoices.find(voice => 
            voice.lang === 'hi-IN' || 
            voice.lang.includes('hi_IN') || 
            voice.name.includes('Hindi') || 
            voice.name.includes('Hemant') || 
            voice.name.includes('Kalpana')
        );
        
        if (hindiVoice) {
            utterance.voice = hindiVoice;
            console.log("Selected Voice for Edge/Chrome:", hindiVoice.name);
        } else {
            // बैकअप अगर कोई लिस्ट न मिले
            utterance.lang = 'hi-IN';
        }
        
        // बोलना शुरू करें
        window.speechSynthesis.speak(utterance);
    });

    // --- 7. अकाउंट नंबर सर्च लॉजिक (Supabase) ---
    async function searchCustomer() {
        const accountNo = accInput.value.trim();
        if (!accountNo) return;

        try {
            // ग्लोबल कस्टमर डेटाबेस में ढूंढना
            const { data, error } = await window.supabaseClient
                .from('banking_customers')
                .select('customer_name')
                .eq('account_number', accountNo)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (data) {
                // कस्टमर मिल गया
                custNameInput.value = data.customer_name;
            } else {
                // कस्टमर नया है -> पॉपअप खोलें
                ncAccInput.value = accountNo;
                ncNameInput.value = "";
                ncMobileInput.value = "";
                ncAddressInput.value = "";
                ncModal.style.display = 'flex';
            }
        } catch (err) {
            console.error("Customer Fetch Error:", err.message);
        }
    }

    accInput.addEventListener('blur', searchCustomer);

    // --- 8. नया कस्टमर रजिस्ट्रेशन सबमिशन ---
    document.getElementById('btn-nc-continue').addEventListener('click', async () => {
        const accNo = ncAccInput.value.trim();
        const cName = ncNameInput.value.trim();
        const cMobile = ncMobileInput.value.trim();
        const cAddress = ncAddressInput.value.trim();

        if (!cName || !cMobile) {
            alert("कृपया नाम और मोबाइल नंबर अनिवार्य रूप से भरें!");
            return;
        }

        try {
            const { error } = await window.supabaseClient
                .from('banking_customers')
                .insert([{
                    account_number: accNo,
                    customer_name: cName,
                    mobile_number: cMobile,
                    customer_address: cAddress,
                    registered_by_ko: currentUser.ko_code
                }]);

            if (error) throw error;

            custNameInput.value = cName;
            ncModal.style.display = 'none';
            if(window.showSystemAlert) window.showSystemAlert("कस्टमर सफलतापूर्वक रजिस्टर्ड हो गया है!", "सफलता", "✅");
        } catch (err) {
            alert("कस्टमर ऐड करने में विफल: " + err.message);
        }
    });

    document.getElementById('btn-nc-cancel').addEventListener('click', () => {
        ncModal.style.display = 'none';
        accInput.value = "";
        custNameInput.value = "";
    });

    // --- 9. सेव ट्रांजैक्शन लॉजिक (Save Entry विद बिजनेस रूल्स) ---
    document.getElementById('btn-dep-save').addEventListener('click', async () => {
        const accountNo = accInput.value.trim();
        const custName = custNameInput.value.trim();
        const amount = parseFloat(amountInput.value) || 0;
        const remarks = remarksInput.value.trim();
        const netCash = calculateDenominationTotal();

        // बेसिक वैलिडेशन
        if (!accountNo || !custName || amount <= 0) {
            if(window.showSystemAlert) window.showSystemAlert("कृपया अकाउंट नंबर, नाम और मान्य राशि भरें!", "त्रुटि", "❌");
            return;
        }

        // डिनॉमिनेशन ब्लैंक/ज़ीरो अलर्ट बाईपास चेक
        if (netCash === 0) {
            const proceedWithoutDenom = confirm("⚠️ डिनॉमिनेशन ऐड नहीं है। क्या आप बिना कैश डिटेल के आगे बढ़ना चाहते हैं?");
            if (!proceedWithoutDenom) return;
        } else if (netCash !== amount) {
            // अगर डिनॉमिनेशन नेट कैश अमाउंट से मैच नहीं होता
            alert(`❌ डिनॉमिनेशन का शुद्ध योग (₹${netCash}) आपके जमा अमाउंट (₹${amount}) से मेल नहीं खाता है। कृपया सुधारें!`);
            return;
        }

        // कमीशन कैलकुलेशन: 0.40% विद मैक्स कैप ₹50
        let calcCommission = amount * 0.004;
        if (calcCommission > 50) calcCommission = 50;

        try {
            // स्टेप A: डिपॉजिट ट्रांजैक्शन记录 को सेव करना
            const denomDetails = {};
            [500, 200, 100, 50, 20, 10, 5].forEach(note => {
                denomDetails[`denom_in_${note}`] = parseInt(document.querySelector(`.denom-in[data-note="${note}"]`).value) || 0;
                denomDetails[`denom_out_${note}`] = parseInt(document.querySelector(`.denom-out[data-note="${note}"]`).value) || 0;
            });

            const { data: txData, error: txError } = await window.supabaseClient
                .from('deposit_transactions')
                .insert([{
                    ko_code: currentUser.ko_code,
                    account_number: accountNo,
                    amount: amount,
                    commission: calcCommission,
                    remarks: remarks,
                    ...denomDetails
                }])
                .select()
                .single();

            if (txError) throw txError;

            // स्टेप B: ऑपरेटर का सेटलमेंट बैलेंस कम करना और कैश तिजोरी प्लस/माइनस करना
            const updatedBalance = parseFloat(currentUser.settlement_balance || 100000) - amount;
            
            const cashUpdates = {};
            [500, 200, 100, 50, 20, 10, 5].forEach(note => {
                const currentCashInVault = currentUser[`cash_${note}`] || 0;
                const netNoteChange = denomDetails[`denom_in_${note}`] - denomDetails[`denom_out_${note}`];
                cashUpdates[`cash_${note}`] = currentCashInVault + netNoteChange;
            });

            const { error: userUpdateError } = await window.supabaseClient
                .from('user_roles')
                .update({
                    settlement_balance: updatedBalance,
                    ...cashUpdates
                })
                .eq('id', currentUser.id);

            if (userUpdateError) throw userUpdateError;

            // लोकल मेमोरी वेरिएबल को अपडेट करें ताकि डैशबोर्ड पर सही दिखे
            currentUser.settlement_balance = updatedBalance;
            Object.keys(cashUpdates).forEach(key => {
                currentUser[key] = cashUpdates[key];
            });

            lastSavedTransaction = txData;
            document.getElementById('btn-dep-print').removeAttribute('disabled');
            
            if(window.showSystemAlert) {
                window.showSystemAlert(`सफलतापूर्वक ₹${amount} जमा किए गए।\nकमीशन अर्जित: ₹${calcCommission.toFixed(2)}`, "ट्रांजैक्शन सफल", "✅");
            }

            // फॉर्म रीसेट
            document.getElementById('btn-dep-clear').click();

        } catch (err) {
            alert("ट्रांजैक्शन प्रोसेस करने में विफल: " + err.message);
        }
    });

    // --- 10. क्लियर बटन लॉजिक ---
    document.getElementById('btn-dep-clear').addEventListener('click', () => {
        accInput.value = "";
        custNameInput.value = "";
        amountInput.value = "";
        remarksInput.value = "";
        wordsDisplay.innerText = "Zero Rupees Only";
        document.querySelectorAll('.denom-in, .denom-out').forEach(input => input.value = 0);
        calculateDenominationTotal();
    });

    // --- 11. प्रिंट रसीद बटन लॉजिक ---
    document.getElementById('btn-dep-print').addEventListener('click', () => {
        if (!lastSavedTransaction) return;
        
        const printWindow = window.open('', '_blank', 'width=600,height=600');
        printWindow.document.write(`
            <html>
            <head><title>Deposit Receipt</title></head>
            <body style="font-family:monospace; padding:20px; color:#000;">
                <center>
                    <h2>FINANCIAL PORTAL</h2>
                    <h3>DEPOSIT TRANSACTION RECEIPT</h3>
                    <p>----------------------------------------</p>
                </center>
                <p><strong>Date/Time:</strong> ${new Date(lastSavedTransaction.transaction_date).toLocaleString()}</p>
                <p><strong>KO Code:</strong> ${lastSavedTransaction.ko_code}</p>
                <p><strong>Account No:</strong> ${lastSavedTransaction.account_number}</p>
                <p><strong>Amount Deposited:</strong> ₹${lastSavedTransaction.amount}</p>
                <p><strong>Remarks:</strong> ${lastSavedTransaction.remarks || 'N/A'}</p>
                <center>
                    <p>----------------------------------------</p>
                    <p>Thank you for banking with us!</p>
                </center>
                <script>window.print(); window.close();</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    });
};
