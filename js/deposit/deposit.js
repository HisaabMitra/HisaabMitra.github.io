window.initDepositPage = async function (currentUser) {
    const workspace = document.getElementById('workspace');
    if (!workspace) return;

    try {


        // 1. काउंटर KO Code सेट करें
        const koCodeLabel = document.getElementById('lbl-ko-code');
        if (koCodeLabel) koCodeLabel.innerText = currentUser.ko_code;

        // 2. डिनॉमिनेशन कंपोनेंट
        if (window.DenominationComponent) {
            setTimeout(() => {
                window.DenominationComponent.render('denomination-widget-container');
            }, 100); 
        }

       // --- टेबल रिफ्रेश लॉजिक (Updated with Edit Button) ---
      async function loadTodayTransactions() {
    const tbody = document.getElementById('today-tx-body');
    if (!tbody) return;

    const today = new Date().toISOString().split('T')[0];

    try {
        const { data, error } = await window.supabaseClient
            .from('deposit_transactions')
            .select('*') // यहाँ '*' कर दिया ताकि डिनॉमिनेशन का सारा डेटा भी टेबल रो में आ सके
            .eq('ko_code', currentUser.ko_code)
            .gte('transaction_date', `${today}T00:00:00`)
            .order('transaction_date', { ascending: false });

        if (error) throw error;

        // HTML टेबल का हेडर भी अपडेट करना होगा एक्शन कॉलम के लिए
        const tableElement = tbody.closest('table');
        if (tableElement && !tableElement.querySelector('.action-header')) {
            const theadRow = tableElement.querySelector('thead tr');
            if (theadRow) {
                theadRow.insertAdjacentHTML('beforeend', '<th class="action-header" style="padding:12px; border-bottom: 1px solid #eee; text-align: center;">Action</th>');
            }
        }

        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:15px;">आज आपका कोई ट्रांजैक्शन नहीं मिला</td></tr>';
            return;
        }

        data.forEach(tx => {
            const time = new Date(tx.transaction_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const name = tx.customer_name || "N/A";
            
            // हर ट्रांजैक्शन का पूरा डेटा हम JSON स्ट्रिंग बनाकर बटन के एट्रिब्यूट में छुपा देंगे
            const txStr = btoa(JSON.stringify(tx)); // सुरक्षित रखने के लिए base64 में बदला

            // 100% क्लीन और फिक्स्ड HTML स्ट्रक्चर
            tbody.insertAdjacentHTML('beforeend', `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding:12px; border-bottom:1px solid #eee;">${tx.account_number}</td>
                    <td style="padding:12px; border-bottom:1px solid #eee; text-transform: uppercase;">${name}</td>
                    <td style="padding:12px; border-bottom:1px solid #eee; font-weight:bold; color:#27ae60;">₹${tx.amount}</td>
                    <td style="padding:12px; border-bottom:1px solid #eee;">${time}</td>
                    <td style="padding:12px; border-bottom:1px solid #eee; text-align:center;">
                        <div style="display:inline-flex; align-items:center; gap:15px; justify-content:center;">
                            <span class="btn-edit-tx" data-tx="${txStr}" style="cursor:pointer; font-size:1.1rem; user-select:none; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" title="Edit Transaction">
                                ✏️
                            </span>

                            <span class="btn-print-receipt" data-tx="${txStr}" style="cursor:pointer; font-size:1.2rem; user-select:none; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" title="Print Thermal Receipt">
                                🖨️
                            </span>
                        </div>
                    </td>
                </tr>
            `);
        });

        // 🌟 दोनों इवेंट लिसनर्स को एक्टिवेट किया ताकि क्लिक काम करे
        if (typeof attachEditEventListeners === 'function') attachEditEventListeners();
        if (typeof attachPrintEventListeners === 'function') attachPrintEventListeners();

    } catch (err) { 
        console.error("Table Load Error:", err); 
    }
}

        // एडिट बटन क्लिक होने पर पुराना डेटा ऊपर फॉर्म में भरने का फंक्शन
        function attachEditEventListeners() {
            document.querySelectorAll('.btn-edit-tx').forEach(btn => {
                btn.onclick = function() {
                    try {
                        // बटन से ट्रांजैक्शन का डेटा वापस ऑब्जेक्ट में बदलें
                        const txData = JSON.parse(atob(this.getAttribute('data-tx')));
                        
                        // 1. ऊपर के इनपुट बॉक्स में पुरानी वैल्यूज भरें
                        document.getElementById('dep-account-no').value = txData.account_number;
                        document.getElementById('dep-cust-name').value = txData.customer_name;
                        document.getElementById('dep-amount').value = txData.amount;
                        document.getElementById('dep-remarks').value = txData.remarks || "";
                        
                        // अमाउंट इन वर्ड्स को अपडेट करें
                        const wordsDisplay = document.getElementById('dep-amount-words');
                        if (wordsDisplay) {
                            wordsDisplay.innerText = `${window.numberToHindiWords(parseInt(txData.amount))} रुपए मात्र`;
                        }

                        // 2. डिनॉ敏नेशन टेबल के अंदर पुराने नोटों की वैल्यूज लोड करें
                        const notes = [500, 200, 100, 50, 20, 10, 5];
                        notes.forEach(note => {
                            const inInput = document.querySelector(`.denom-in[data-note="${note}"]`);
                            const outInput = document.querySelector(`.denom-out[data-note="${note}"]`);
                            if (inInput) inInput.value = txData[`denom_in_${note}`] || 0;
                            if (outInput) outInput.value = txData[`denom_out_${note}`] || 0;
                        });
                        
                        // कॉइन्स भी लोड करें
                        const coinsIn = document.querySelector('.denom-in[data-note="coins"]');
                        const coinsOut = document.querySelector('.denom-out[data-note="coins"]');
                        if (coinsIn) coinsIn.value = txData[`denom_in_coins`] || 0;
                        if (coinsOut) coinsOut.value = txData[`denom_out_coins`] || 0;

                        // डिनॉमिनेशन का टोटल दोबारा कैलकुलेट करें
                        if (window.DenominationComponent) {
                            window.DenominationComponent.calculate();
                        }

                        // 3. 🌟 सबसे महत्वपूर्ण: सेव बटन को एडिट मोड में बदलें
                        const saveBtn = document.getElementById('btn-dep-save');
                        if (saveBtn) {
                            saveBtn.innerText = "🔄 Update Transaction";
                            saveBtn.style.background = "#d35400"; // संतरी रंग ताकि ऑपरेटर को पता रहे कि एडिट हो रहा है
                            saveBtn.dataset.mode = "edit";
                            saveBtn.dataset.editingTxId = txData.transaction_id; // पुरानी ट्रांजैक्शन आईडी सेव करली
                        }

                        window.showSystemAlert("पुरानी एंट्री लोड हो गई है! अब आप बदलाव करके अपडेट कर सकते हैं।", "Edit Mode Activated", "ℹ️");

                    } catch (err) {
                        console.error("Error loading tx for edit:", err);
                    }
                };
            });
        }


        

        // इसे ग्लोबल ताकि deposit-save.js इसे कॉल कर सके
        window.loadTodayTransactions = loadTodayTransactions;
        loadTodayTransactions();

        // 3. DOM एलिमेंट्स
        const accInput = document.getElementById('dep-account-no');
        const custNameInput = document.getElementById('dep-cust-name');
        const amountInput = document.getElementById('dep-amount');
        const wordsDisplay = document.getElementById('dep-amount-words');
        const speakBtn = document.getElementById('btn-speak-hindi');
        const remarksInput = document.getElementById('dep-remarks');
        
        const ncModal = document.getElementById('new-cust-modal');
        const ncAccInput = document.getElementById('nc-account-no');
        const ncNameInput = document.getElementById('nc-name');
        const ncMobileInput = document.getElementById('nc-mobile');
        const ncAddressInput = document.getElementById('nc-address');

        // नाम और पता Uppercase में बदलें
        [ncNameInput, ncAddressInput].forEach(el => {
            if(el) el.addEventListener('input', function() { this.value = this.value.toUpperCase(); });
        });

        // अमाउंट इन वर्ड्स
        amountInput.addEventListener('input', () => {
            const amt = parseInt(amountInput.value) || 0;
            wordsDisplay.innerText = amt === 0 ? "Zero Rupees Only" : `${window.numberToHindiWords(amt)} रुपए मात्र`;
        });
        amountInput.addEventListener('wheel', e => e.preventDefault());

        // हिंदी वॉयस असिस्टेंट
        let systemVoices = [];
        function loadVoices() { systemVoices = window.speechSynthesis.getVoices(); }
        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) window.speechSynthesis.onvoiceschanged = loadVoices;

        speakBtn.addEventListener('click', () => {
            const amt = parseInt(amountInput.value) || 0;
            if (amt === 0) return window.showSystemAlert("कृपया पहले सही अमाउंट दर्ज करें!", "Validation Error", "⚠️");
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(`${window.numberToHindiWords(amt)} रुपए जमा के लिए तैयार है`);
            utterance.lang = 'hi-IN';
            let hindiVoice = systemVoices.find(v => v.lang.startsWith('hi') || v.name.includes('Hindi'));
            if (hindiVoice) utterance.voice = hindiVoice;
            window.speechSynthesis.speak(utterance);
        });

        function formatAccountNumber(inputAcc, solId) {
            let acc = inputAcc.trim();
            if (acc.length > 10 || !acc.includes('-')) return acc;
            const parts = acc.split('-');
            return `${solId}${parts[0].padStart(2, '0')}${parts[1].padStart(8, '0')}`;
        }

        async function searchCustomer() {
            let accountNo = accInput.value.trim();
            if (!accountNo) return;
            const userSolId = currentUser.sol_id || '193000'; 
            const formattedAccountNo = formatAccountNumber(accountNo, userSolId);
            if (formattedAccountNo !== accountNo) { accInput.value = formattedAccountNo; accountNo = formattedAccountNo; }
            try {
                const { data, error } = await window.supabaseClient.from('banking_customers').select('customer_name').eq('account_number', accountNo).single();
                if (data) custNameInput.value = data.customer_name;
                else { ncAccInput.value = accountNo; ncModal.style.display = 'flex'; }
            } catch (err) { console.error("Search error:", err.message); }
        }
        accInput.addEventListener('blur', searchCustomer);

        // नया कस्टमर रजिस्ट्रेशन
        document.getElementById('btn-nc-continue').addEventListener('click', async () => {
            const accNo = ncAccInput.value.trim();
            const cName = ncNameInput.value.trim();
            const cMobile = ncMobileInput.value.trim();
            const cAddress = ncAddressInput.value.trim();
            if (!cName || !cMobile) return window.showSystemAlert("नाम और मोबाइल नंबर अनिवार्य हैं!", "Validation Error", "❌");
            try {
                const { error } = await window.supabaseClient.from('banking_customers').insert([{ account_number: accNo, customer_name: cName, mobile_number: cMobile, customer_address: cAddress, registered_by_ko: currentUser.ko_code }]);
                if (error) throw error;
                custNameInput.value = cName;
                ncModal.style.display = 'none';
                window.showSystemAlert("कस्टमर पंजीकृत!", "Success", "✅");
            } catch (err) { window.showSystemAlert("विफल: " + err.message, "Error", "❌"); }
        });

        document.getElementById('btn-nc-cancel').addEventListener('click', () => { ncModal.style.display = 'none'; accInput.value = ""; custNameInput.value = ""; });

        // --- 🧹 Clear और रीसेट बटन लॉजिक (Updated with Edit Mode Reset) ---
        document.getElementById('btn-dep-clear').addEventListener('click', () => {
            // 1. सारे मुख्य इनपुट फील्ड्स को खाली करें
            if (accInput) accInput.value = ""; 
            if (custNameInput) custNameInput.value = ""; 
            if (amountInput) amountInput.value = ""; 
            if (remarksInput) remarksInput.value = "";
            
            // 2. अमाउंट इन वर्ड्स को रीसेट करें
            if (wordsDisplay) wordsDisplay.innerText = "Zero Rupees Only";
            
            // 3. डिनॉमिनेशन कॉम्पोनेन्ट (नोट और कॉइन्स) को 0 करें
            if (window.DenominationComponent && typeof window.DenominationComponent.clear === 'function') {
                window.DenominationComponent.clear();
            }

            // 4. प्रिंट बटन को वापस डिसेबल (बंद) करें
            const printBtn = document.getElementById('btn-dep-print');
            if (printBtn) printBtn.disabled = true;

            // 5. 🌟 अगर एडिट मोड एक्टिव था, तो सेव बटन को वापस नॉर्मल (💾 Save) करें
            const saveBtn = document.getElementById('btn-dep-save');
            if (saveBtn) {
                saveBtn.innerText = "💾 Save";
                saveBtn.style.background = "#7d0022"; // वापस पुराना मैरून थीम कलर
                saveBtn.style.boxShadow = "0 2px 6px rgba(125,0,34,0.2)";
                
                // डेटासेट से एडिट मोड के फ्लैग्स डिलीट करें
                delete saveBtn.dataset.mode;
                delete saveBtn.dataset.editingTxId;
            }
            
            console.log("Workspace & Edit Mode completely reset.");
        });

    } catch (error) { console.error("Error:", error); }
};









// 🖨️ THERMAL RECEIPT PRINT ENGINE (58mm / 2-Inch Standard)
function attachPrintEventListeners() {
    document.querySelectorAll('.btn-print-receipt').forEach(btn => {
        btn.onclick = function() {
            try {
                // बटन से ट्रांजैक्शन का डेटा निकालें
                const txData = JSON.parse(atob(this.getAttribute('data-tx')));
                
                const dateObj = new Date(txData.transaction_date);
                const formattedDate = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                // 2-Inch (58mm) थर्मल प्रिंटर के लिए एकदम सटीक HTML/CSS डिज़ाइन
                const receiptHtml = `
                    <html>
                    <head>
                        <title>Print Receipt</title>
                        <style>
                            @page { size: 58mm auto; margin: 0; }
                            body { 
                                width: 54mm; 
                                margin: 0 auto; 
                                padding: 5px 2px; 
                                font-family: 'Courier New', Courier, monospace; 
                                font-size: 11px; 
                                color: #000; 
                                line-height: 1.2;
                            }
                            .text-center { text-align: center; }
                            .text-right { text-align: right; }
                            .bold { font-weight: bold; }
                            .header-title { font-size: 14px; margin: 0; text-transform: uppercase; }
                            .divider { border-top: 1px dashed #000; margin: 5px 0; }
                            .flex-justify { display: flex; justify-content: space-between; }
                            .amount-box { 
                                font-size: 15px; 
                                border: 1px dashed #000; 
                                padding: 5px; 
                                margin: 8px 0; 
                                text-align: center; 
                                font-weight: bold; 
                            }
                        </style>
                    </head>
                    <body>
                        <div class="text-center">
                            <h3 class="header-title bold">FINANCIAL KIOSK</h3>
                            <div style="font-size: 10px;">CUSTOMER DEPOSIT RECEIPT</div>
                        </div>
                        
                        <div class="divider"></div>
                        
                        <div><span class="bold">KO CODE:</span> ${txData.ko_code || window.currentUser?.ko_code || 'N/A'}</div>
                        <div class="flex-justify">
                            <span><span class="bold">DATE:</span> ${formattedDate}</span>
                            <span>${formattedTime}</span>
                        </div>
                        
                        <div class="divider"></div>
                        
                        <div style="margin-bottom: 3px;"><span class="bold">A/C NO:</span> ${txData.account_number}</div>
                        <div style="text-transform: uppercase;"><span class="bold">NAME:</span> ${txData.customer_name}</div>
                        
                        <div class="amount-box">
                            CASH DEP: ₹${parseFloat(txData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>

                        ${txData.remarks ? `<div style="font-size: 10px; font-style: italic;"><span class="bold">RMK:</span> ${txData.remarks}</div>` : ''}
                        
                        <div class="divider"></div>
                        
                        <div class="text-center" style="font-size: 9px; margin-top: 5px;">
                            *** THANK YOU ***<br>
                            This is a system generated slip.
                        </div>
                        
                        <div style="height: 30px;"></div>
                    </body>
                    </html>
                `;

                // एक छिपी हुई (Hidden) Iframe बनाकर उसमें प्रिंट कमांड भेजना ताकि बिना पेज भटके प्रिंट हो सके
                const iframe = document.createElement('iframe');
                iframe.style.position = 'fixed';
                iframe.style.right = '0';
                iframe.style.bottom = '0';
                iframe.style.width = '0';
                iframe.style.height = '0';
                iframe.style.border = '0';
                document.body.appendChild(iframe);

                const doc = iframe.contentWindow.document;
                doc.open();
                doc.write(receiptHtml);
                doc.close();

                // जैसे ही iframe लोड होगा, प्रिंटर का पॉप-अप आ जाएगा
                iframe.contentWindow.focus();
                setTimeout(() => {
                    iframe.contentWindow.print();
                    // प्रिंट होने के बाद iframe को डिलीट कर दें ताकि मेमोरी फुल न हो
                    setTimeout(() => { document.body.removeChild(iframe); }, 1000);
                }, 500);

            } catch (err) {
                console.error("Receipt Printing Failed:", err);
                window.showSystemAlert("रसीद प्रिंट करने में समस्या आई!", "Printing Error", "❌");
            }
        };
    });
}





// ========================================================
// 📦 BULK DEPOSIT & LIVE AUTO-REGISTRATION SYSTEM (INTEGRATED)
// ========================================================

let bulkRowCounter = 0;
let activeRegistrationResolve = null; // मॉडल के प्रॉम्ट रिस्पॉन्स को होल्ड करने के लिए

// [1] सिंगल और बल्क पैनल के बीच टॉगल स्विच
document.addEventListener('click', (e) => {
    if (!e.target) return;
    
    if (e.target.id === 'mode-single-dep') {
        document.getElementById('bulk-deposit-panel')?.classList.add('hidden');
        document.getElementById('single-deposit-form-block')?.classList.remove('hidden');
        e.target.className = "btn btn-primary";
        document.getElementById('mode-bulk-dep').className = "btn btn-secondary";
    }
    
    if (e.target.id === 'mode-bulk-dep') {
        document.getElementById('single-deposit-form-block')?.classList.add('hidden');
        document.getElementById('bulk-deposit-panel')?.classList.remove('hidden');
        e.target.className = "btn btn-primary";
        document.getElementById('mode-single-dep').className = "btn btn-secondary";
        
        // डिफ़ॉल्ट रूप से पहली खाली रो जनरेट करें
        const tbody = document.getElementById('bulk-accounts-tbody');
        if (tbody && tbody.children.length === 0) {
            addNewBulkRow();
        }
    }
});

// [2] डायनेमिक न्यू अकाउंट रो (Row) जोड़ने का फंक्शन
function addNewBulkRow() {
    const tbody = document.getElementById('bulk-accounts-tbody');
    if (!tbody) return;

    bulkRowCounter++;
    const rowId = `bulk-row-${bulkRowCounter}`;

    const trHtml = `
        <tr id="${rowId}" style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px;">
                <input type="text" class="bulk-acc-input" data-row="${rowId}" placeholder="Enter Account No." style="width: 95%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            </td>
            <td style="padding: 8px;">
                <input type="text" class="bulk-name-input" id="name-${rowId}" placeholder="A/C No. का इंतज़ार है..." style="width: 95%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; background: #f8f9fa; text-transform: uppercase;" readonly>
            </td>
            <td style="padding: 8px;">
                <input type="number" class="bulk-amount-input" placeholder="Max 25000" min="1" max="25000" style="width: 90%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            </td>
            <td style="padding: 8px; text-align: center;">
                <button type="button" onclick="removeBulkRow('${rowId}')" style="background: #c5221f; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;">❌</button>
            </td>
        </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', trHtml);
    attachBulkRowEvents(rowId);
}

// रो डिलीट करने का फंक्शन
window.removeBulkRow = function(rowId) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
    calculateBulkGrandTotal();
};

// [3] 💥 लाइव डेटाबेस वेरिफिकेशन और न्यू कस्टमर प्रॉम्ट इंजन 💥
function attachBulkRowEvents(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;

    const accInput = row.querySelector('.bulk-acc-input');
    const nameInput = row.querySelector('.bulk-name-input');
    const amtInput = row.querySelector('.bulk-amount-input');

    if (!accInput) return;

    // अकाउंट नंबर बॉक्स से बाहर क्लिक (Blur) होने पर लाइव चेक
    accInput.addEventListener('blur', async () => {
        const accountNo = accInput.value.trim();
        if (!accountNo) return;

        nameInput.value = "डेटाबेस में खोज जारी है...";

        try {
            // 'customers' टेबल से लाइव वेरिफिकेशन
            const { data: customer, error } = await window.supabaseClient
                .from('customers') 
                .select('customer_name')
                .eq('account_number', accountNo)
                .maybeSingle();

            if (error) throw error;

            if (customer) {
                // स्थिति A: कस्टमर मिल गया!
                nameInput.value = customer.customer_name.toUpperCase();
                nameInput.removeAttribute('readonly');
                nameInput.style.background = "#fff";
            } else {
                // स्थिति B: नया खाता मिला! सीधे HTML मॉडल को प्रॉम्ट में बदलें
                nameInput.value = "NOT REGISTERED";
                
                // प्रॉम्ट मॉडल को स्क्रीन पर खोलें और अकाउंट लॉक करें
                openRegistrationModalForBulk(accountNo, (registeredName) => {
                    if (registeredName) {
                        nameInput.value = registeredName.toUpperCase();
                        nameInput.style.background = "#fff";
                        nameInput.removeAttribute('readonly');
                        amtInput.focus(); // सीधा कर्सर अमाउंट वाले बॉक्स में भेजें
                    } else {
                        nameInput.value = "";
                        accInput.value = "";
                        accInput.focus();
                    }
                });
            }
        } catch (err) {
            console.error("Bulk Ledger Check Error:", err);
            nameInput.value = "FETCH ERROR";
        }
    });
    
    amtInput.addEventListener('input', () => {
        calculateBulkGrandTotal();
    });
}

// [4] 🖥️ HTML मॉडल को कंट्रोल करने का डायनेमिक इंजन
function openRegistrationModalForBulk(accountNo, callback) {
    const modal = document.getElementById('new-cust-modal');
    if (!modal) {
        window.showSystemAlert("Error: new-cust-modal HTML में नहीं मिला!", "System Error", "❌");
        callback(null);
        return;
    }

    // इनपुट फ़ील्ड्स को रीसेट और लॉक करें
    document.getElementById('nc-account-no').value = accountNo;
    document.getElementById('nc-name').value = "";
    document.getElementById('nc-mobile').value = "";
    document.getElementById('nc-address').value = "";

    // मॉडल को विज़िबल करें
    modal.style.setProperty('display', 'flex', 'important');
    document.getElementById('nc-name').focus();

    // पहले से लगे पुराने लिसनर्स को हटाने के लिए क्लोनिंग (बग प्रोटेक्शन)
    const btnContinue = document.getElementById('btn-nc-continue');
    const btnCancel = document.getElementById('btn-nc-cancel');
    
    const newBtnContinue = btnContinue.cloneNode(true);
    const newBtnCancel = btnCancel.cloneNode(true);
    
    btnContinue.parentNode.replaceChild(newBtnContinue, btnContinue);
    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);

    // Cancel बटन दबाने पर
    newBtnCancel.onclick = function() {
        modal.style.display = 'none';
        callback(null);
    };

    // Register & Continue बटन दबाने पर
    newBtnContinue.onclick = async function() {
        const fullName = document.getElementById('nc-name').value.trim().toUpperCase();
        const mobile = document.getElementById('nc-mobile').value.trim();
        const address = document.getElementById('nc-address').value.trim().toUpperCase();

        if (!fullName || !mobile) {
            window.showSystemAlert("कृपया कस्टमर का नाम और मोबाइल नंबर ज़रूर भरें!", "Validation Warning", "⚠️");
            return;
        }

        newBtnContinue.textContent = "पंजीकरण जारी...";
        newBtnContinue.disabled = true;

        try {
            // 'customers' मास्टर टेबल में नया डेटा इन्सर्ट करें
            const { error: insertErr } = await window.supabaseClient
                .from('customers')
                .insert([{
                    account_number: accountNo,
                    customer_name: fullName,
                    mobile_no: mobile,
                    address: address
                }]);

            if (insertErr) throw insertErr;

            modal.style.display = 'none';
            window.showSystemAlert(`🎉 खाता संख्या ${accountNo} सफलतापूर्वक पंजीकृत हो गया!`, "Success", "✅");
            callback(fullName); // नाम वापस भेजें

        } catch (err) {
            console.error("Auto Registration Failed:", err);
            window.showSystemAlert("पंजीकरण विफल: " + err.message, "Database Error", "❌");
            callback(null);
        } finally {
            newBtnContinue.textContent = "Register & Continue";
            newBtnContinue.disabled = false;
        }
    };
}

// [5] ग्रैंड टोटल की गणना
function calculateBulkGrandTotal() {
    let grandTotal = 0;
    document.querySelectorAll('.bulk-amount-input').forEach(input => {
        grandTotal += parseFloat(input.value) || 0;
    });
    console.log("Required Grand Total For Vault Match:", grandTotal);
}

// ऐड रो बटन को क्लिक इवेंट असाइन करना
document.addEventListener('DOMContentLoaded', () => {
    const addRowBtn = document.getElementById('btn-bulk-add-row');
    if (addRowBtn) {
        addRowBtn.onclick = addNewBulkRow;
    }
});


