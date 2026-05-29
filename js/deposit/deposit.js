// ==========================================
// DEPOSIT MODULE - CORE LOGIC WITH SUPABASE
// ==========================================

// 1. नंबर को शब्दों में बदलने का फंक्शन (Number to Words)
function numberToWords(amount) {
    if (amount === 0) return "Zero Rupees Only";
    const single = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    
    function convertLessThanOneThousand(number) {
        let rem = number % 100;
        let word = "";
        if (number >= 100) {
            word += single[Math.floor(number / 100)] + " Hundred ";
        }
        if (rem < 20) {
            word += single[rem];
        } else {
            word += tens[Math.floor(rem / 10)];
            if (rem % 10 > 0) word += " " + single[rem % 10];
        }
        return word;
    }

    let word = "";
    let crores = Math.floor(amount / 10000000);
    amount %= 10000000;
    let lakhs = Math.floor(amount / 100000);
    amount %= 100000;
    let thousands = Math.floor(amount / 1000);
    amount %= 1000;

    if (crores > 0) word += convertLessThanOneThousand(crores) + " Crore ";
    if (lakhs > 0) word += convertLessThanOneThousand(lakhs) + " Lakh ";
    if (thousands > 0) word += convertLessThanOneThousand(thousands) + " Thousand ";
    if (amount > 0) word += convertLessThanOneThousand(amount);
    
    return word.trim() + " Rupees Only";
}

// 2. नंबर को हिंदी शब्दों में बदलने का फंक्शन (For Voice Assistant)
function numberToHindiWords(amount) {
    if (amount === 0) return "शून्य";
    // साधारण बोलचाल के लिए मुख्य नंबर्स
    if (amount === 1000) return "एक हजार";
    if (amount === 2000) return "दो हजार";
    if (amount === 5000) return "पाँच हजार";
    if (amount === 10000) return "दस हजार";
    
    // डिफ़ॉल्ट इंग्लिश ट्रांसलेशन सपोर्ट या बेसिक स्ट्रिंग
    return amount + " रुपए";
}

// 3. मुख्य डिपॉजिट मॉड्यूल इनिशियलाइज़ेशन
window.initDepositPage = function (currentUser) {
    const workspace = document.getElementById('workspace');
    if (!workspace) return;

    // यूआई रेंडर करना
    workspace.innerHTML = `
    <div class="deposit-wrapper" style="padding: 20px; background: #fff; border-radius: 8px; animation: modalFadeIn 0.3s ease;">
        <h2 style="color: var(--color-maroon-main); margin-top:0;">💰 DEPOSIT ENTRY</h2>
        <p style="color:#666; font-size:0.9rem;">Counter Operator KO Code: <strong style="color:#000;">${currentUser.ko_code}</strong></p>
        <hr style="border: 0; border-top: 1px solid #ddd; margin-bottom: 20px;">

        <div style="display: flex; gap: 30px; flex-wrap: wrap;">
            
            <div style="flex: 1; min-width: 320px; display: flex; flex-direction: column; gap: 15px;">
                <div class="form-group">
                    <label style="font-weight:bold; display:block; margin-bottom:5px;">Customer Account Number *</label>
                    <input type="text" id="dep-account-no" placeholder="Enter Account Number & Press Tab/Click Outside" style="width:100%; padding: 12px; font-size:1.1rem; font-weight:bold; border: 1px solid #ccc; border-radius:4px;">
                </div>

                <div class="form-group">
                    <label style="font-weight:bold; display:block; margin-bottom:5px;">Customer Name</label>
                    <input type="text" id="dep-cust-name" placeholder="Name will auto-appear from DB" readonly style="width:100%; padding: 12px; background: #f4f4f4; border: 1px solid #ccc; border-radius:4px; font-weight: bold; color: var(--color-maroon-main);">
                </div>

                <div class="form-group">
                    <label style="font-weight:bold; display:block; margin-bottom:5px;">Amount to Deposit (₹) *</label>
                    <input type="number" id="dep-amount" placeholder="Enter Amount" style="width:100%; padding: 12px; font-size:1.2rem; font-weight:bold; color: #27ae60; border: 1px solid #ccc; border-radius:4px;">
                </div>

                <div style="background: #fdfefe; padding: 15px; border: 1px solid #d4efdf; border-radius: 4px; position:relative;">
                    <span style="font-size: 0.85rem; color:#555; display:block; font-weight:600;">Amount in Words:</span>
                    <strong id="dep-amount-words" style="color: #196f3d; font-size: 1rem; display:block; margin-top:3px;">Zero Rupees Only</strong>
                    <button id="btn-speak-hindi" type="button" style="margin-top:8px; background:#7d0022; border:none; color:white; cursor:pointer; font-size:0.8rem; padding:4px 10px; border-radius:3px; font-weight:bold;">🔊 Listen in Hindi</button>
                </div>

                <div class="form-group">
                    <label style="font-weight:bold; display:block; margin-bottom:5px;">Remarks</label>
                    <input type="text" id="dep-remarks" placeholder="Optional remarks for this transaction" style="width:100%; padding: 12px; border: 1px solid #ccc; border-radius:4px;">
                </div>
            </div>

            <div style="flex: 1; min-width: 350px; background: #fdfdfd; padding: 20px; border: 1px solid #e0e0e0; border-radius: 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <h4 style="margin-top:0; color:#333; border-bottom:2px solid #7d0022; padding-bottom:5px;">Denomination Management (IN / OUT)</h4>
                
                <table style="width: 100%; border-collapse: collapse; text-align: center; margin-top:10px;">
                    <thead>
                        <tr style="background:#7d0022; color:white; font-size:0.9rem;">
                            <th style="padding:8px;">Value</th>
                            <th style="padding:8px;">Cash IN (Recv)</th>
                            <th style="padding:8px;">Cash OUT (Ret)</th>
                        </tr>
                    </thead>
                    <tbody id="denom-table-body">
                        ${[500, 200, 100, 50, 20, 10, 5].map(note => `
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding:8px;"><strong>₹${note}</strong></td>
                                <td style="padding:8px;"><input type="number" class="denom-in" data-note="${note}" value="0" min="0" style="width:70px; padding:6px; text-align:center; border:1px solid #ccc; border-radius:4px;"></td>
                                <td style="padding:8px;"><input type="number" class="denom-out" data-note="${note}" value="0" min="0" style="width:70px; padding:6px; text-align:center; border:1px solid #ccc; border-radius:4px;"></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="margin-top:20px; padding:12px; background:#ebf5fb; border-left:5px solid #2980b9; border-radius:4px; font-weight:bold; display:flex; justify-content:space-between; font-size:1.1rem;">
                    <span style="color:#2980b9;">Net Calculated Cash:</span>
                    <span id="denom-total-calculated" style="color:#2c3e50;">₹0</span>
                </div>
            </div>
        </div>

        <div style="margin-top: 30px; display: flex; gap: 12px; flex-wrap: wrap; border-top: 1px solid #eee; padding-top:20px;">
            <button id="btn-dep-save" class="btn" style="background: #27ae60; color:white; padding: 12px 30px; font-weight:bold; font-size:1rem; cursor:pointer; border-radius:4px; border:none;">💾 Save Entry</button>
            <button id="btn-dep-print" class="btn" style="background: #2980b9; color:white; padding: 12px 25px; cursor:pointer; border-radius:4px; border:none;" disabled>🖨️ Print Receipt</button>
            <button id="btn-dep-clear" class="btn" style="background: #7f8c8d; color:white; padding: 12px 25px; cursor:pointer; border-radius:4px; border:none;">🧹 Clear</button>
        </div>
    </div>

    <div id="new-cust-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 99999; align-items: center; justify-content: center;">
        <div style="background: white; padding: 30px; border-radius: 8px; max-width: 420px; width: 90%; text-align: left; box-shadow: 0 4px 25px rgba(0,0,0,0.3); border-top: 5px solid #2980b9; animation: modalFadeIn 0.2s ease;">
            <h3 style="color:#2980b9; margin-top:0; font-size:1.3rem;">🔍 Detect New Customer</h3>
            <p style="font-size:0.85rem; color:#666; margin-bottom:20px;">This account number is not registered. Fill info to register and continue:</p>
            
            <div style="margin-bottom:12px;">
                <label style="font-size:0.85rem; font-weight:bold; display:block; margin-bottom:4px;">Account Number:</label>
                <input type="text" id="nc-account-no" readonly style="width:100%; padding:10px; background:#f4f4f4; border:1px solid #ccc; border-radius:4px; font-weight:bold; box-sizing:border-box;">
            </div>
            <div style="margin-bottom:12px;">
                <label style="font-size:0.85rem; font-weight:bold; display:block; margin-bottom:4px;">Customer Full Name *</label>
                <input type="text" id="nc-name" placeholder="Enter Full Name" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
            </div>
            <div style="margin-bottom:12px;">
                <label style="font-size:0.85rem; font-weight:bold; display:block; margin-bottom:4px;">Mobile Number *</label>
                <input type="tel" id="nc-mobile" placeholder="10 Digit Mobile" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
            </div>
            <div style="margin-bottom:20px;">
                <label style="font-size:0.85rem; font-weight:bold; display:block; margin-bottom:4px;">Address</label>
                <input type="text" id="nc-address" placeholder="City / Area" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
            </div>

            <div style="display: flex; gap:10px; justify-content: flex-end;">
                <button id="btn-nc-cancel" style="padding:10px 18px; background:#e0e0e0; border:none; cursor:pointer; border-radius:4px; font-weight:600;">Cancel</button>
                <button id="btn-nc-continue" style="padding:10px 18px; background:#2980b9; color:white; border:none; cursor:pointer; border-radius:4px; font-weight:bold;">Continue Transaction</button>
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

    // --- 5. अमाउंट इनपुट चेंजेस और नंबर-टू-वर्ड्स सिंक ---
    amountInput.addEventListener('input', () => {
        const amt = parseInt(amountInput.value) || 0;
        wordsDisplay.innerText = numberToWords(amt);
    });

    // --- 6. हिंदी आवाज़ असिस्टेंट (Text to Speech) ---
    speakBtn.addEventListener('click', () => {
        const amt = parseInt(amountInput.value) || 0;
        if (amt === 0) {
            alert("कृपया पहले सही अमाउंट दर्ज करें!");
            return;
        }
        const hindiText = numberToHindiWords(amt);
        const utterance = new SpeechSynthesisUtterance(`${hindiText} रुपए मात्र जमा करने के लिए`);
        utterance.lang = 'hi-IN';
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
            const proceedWithoutDenom = confirm("⚠️ डिनॉमिनेशन ऐड नहीं है। क्या आप बिना कैश डिटेल के आगे बढ़ना चाहते हैं?");
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
            // स्टेप A: डिपॉजिट ट्रांजैक्शन रिकॉर्ड को सेव करना
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
