// ========================================================
// 🖨️ DOT-MATRIX PLQ-20 STYLE A4 LINE-BY-LINE PRINT ENGINE (VERTICAL STRETCH & AUTO PAGE NO)
// ========================================================

window.executeWithdrawalPassbookPrint = function(encodedTx, srNo) {
    try {
        const txData = JSON.parse(atob(encodedTx));
        console.log("🖨️ Matrix Passbook Thread Triggered for SrNo:", srNo, txData);

        const koCode = window.currentUser?.ko_code || "--";
        const userAddress = window.currentUser?.address || "KIOSK CENTER, INDIA";
        const todayDate = new Date().toISOString().split('T')[0];

        // 1. 🔍 ट्रैक करें कि प्रिंटर अभी किस लाइन पर है (0 से 14 तक कुल 15 कतारें)
        let lastPrintedLine = parseInt(localStorage.getItem('passbook_last_line')) || 0;
        let lastPrintedDate = localStorage.getItem('passbook_last_date') || "";
        
        // 📄 पेज नंबरिंग इंजन काउंटर लोड करें
        let currentPageNo = parseInt(localStorage.getItem('passbook_page_counter')) || 1;

        // 🎯 नियम: यदि आज नई तारीख है, तो पेज नंबर दोबारा 1 से शुरू होगा और हेडर फोर्स रीप्रिंट होगा
        let forceHeaderReprint = false;
        if (lastPrintedDate !== todayDate) {
            forceHeaderReprint = true;
            currentPageNo = 1; // तारीख बदलते ही पेज नंबर वापस 1 पर रीसेट
            localStorage.setItem('passbook_page_counter', 1);
            if (lastPrintedLine >= 15) lastPrintedLine = 0; 
        }

        // 🚀 सुधार: 15 एंट्री को पूरे A4 पेज के अंत तक फैलाने के लिए रो-हाइट और बेस ऑफसेट को बढ़ाया
        const rowHeight = 52;         // ⚡ प्रत्येक एंट्री के बीच अंगूठे/हस्ताक्षर के लिए बड़ा और पर्याप्त वर्टिकल स्पेस
        const baseHeaderOffset = 130;  // हेडर और टेबल थ्रेड का शुरुआती टॉप मार्जिन
        const dynamicTopMargin = baseHeaderOffset + (lastPrintedLine * rowHeight);

        // तारीख को प्रिंट डिस्प्ले के लिए DD-MM-YYYY फॉर्मेट करें
        const dateParts = todayDate.split('-');
        const displayDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

        // 3. प्रिंटर के लिए छुपा हुआ Iframe तैयार करें
        let printFrame = document.getElementById('matrix-print-iframe');
        if (!printFrame) {
            printFrame = document.createElement('iframe');
            printFrame.id = 'matrix-print-iframe';
            printFrame.style.position = 'fixed';
            printFrame.style.bottom = '0';
            printFrame.style.right = '0';
            printFrame.style.width = '0';
            printFrame.style.height = '0';
            printFrame.style.border = 'none';
            document.body.appendChild(printFrame);
        }

        const frameDoc = printFrame.contentWindow || printFrame.contentDocument;
        const doc = frameDoc.document || frameDoc;

        // 📊 PLQ-20 के लिए बिल्कुल संकीर्ण (Narrow Margin) और वर्टिकली स्ट्रेच्ड HTML लेआउट
        let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page { size: A4 portrait; margin: 8mm 6mm; }
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 12px;
                    line-height: 1.2;
                    color: #000;
                }
                .header-block {
                    text-align: center;
                    width: 100%;
                    margin-bottom: 5px;
                }
                .header-title { font-size: 16px; font-weight: bold; text-transform: uppercase; }
                .header-address { font-size: 10px; text-transform: uppercase; margin-top: 1px; }
                
                /* 📅 डेट और डायनेमिक पेज नंबर लाइन जो सेंटर में रहेगी */
                .meta-line {
                    font-size: 11px;
                    font-weight: bold;
                    text-align: center;
                    margin: 4px 0;
                }
                
                .matrix-table { width: 100%; border-collapse: collapse; margin-top: 2px; }
                .matrix-table th {
                    border-bottom: 1px dashed #000;
                    border-top: 1px dashed #000;
                    padding: 6px 2px;
                    text-align: left;
                    font-weight: bold;
                    font-size: 11px;
                }
                .matrix-table td { padding: 12px 2px; font-size: 11px; }
                .sig-line { width: 85px; border-bottom: 1px dashed #000; display: inline-block; height: 12px; }
            </style>
        </head>
        <body>
        `;

        // अगर पहली लाइन है (0) या तारीख बदल गई है, तो हेडर कॉलम और लाइव पेज नंबर प्रिंट करें
        if (lastPrintedLine === 0 || forceHeaderReprint) {
            htmlContent += `
                <div class="header-block">
                    <div class="header-title">Kiosk Banking System</div>
                    <div class="header-address">${userAddress}</div>
                </div>
                <div class="meta-line">Date: ${displayDate} | Page No: ${currentPageNo}</div>
                
                <table class="matrix-table">
                    <thead>
                        <tr>
                            <th style="width: 8%; text-align:center;">Sr.No</th>
                            <th style="width: 12%;">KO-Code</th>
                            <th style="width: 22%;">Aadhar Number</th>
                            <th style="width: 25%;">Name</th>
                            <th style="width: 15%;">Amount</th>
                            <th style="width: 18%; text-align:center;">Signature/Thumb</th>
                        </tr>
                    </thead>
                </table>
            `;
        }

        // एब्सोल्यूट कोऑर्डिनेट कतार जो ठीक उसी पुरानी छोड़ी हुई जगह पर छपेगी
        const inlineStyle = (lastPrintedLine === 0 || forceHeaderReprint) 
            ? `margin-top: 4px;` 
            : `position: absolute; top: ${dynamicTopMargin}px; left: 0; width: 100%;`;

        htmlContent += `
            <table class="matrix-table" style="${inlineStyle}">
                <tbody>
                    <tr>
                        <td style="width: 8%; text-align:center; font-weight:bold;">${srNo}</td>
                        <td style="width: 12%;">${koCode}</td>
                        <td style="width: 22%; letter-spacing: 0.5px;">${txData.aadhaar_number}</td>
                        <td style="width: 25%; text-transform: uppercase; white-space: nowrap; overflow: hidden;">${txData.customer_name}</td>
                        <td style="width: 15%; font-weight: bold;">₹${parseFloat(txData.amount).toFixed(2)}</td>
                        <td style="width: 18%; text-align:center;"><span class="sig-line"></span></td>
                    </tr>
                </tbody>
            </table>
            
            ${(lastPrintedLine === 14) ? `
                <div style="position: absolute; bottom: 10mm; left: 0; width: 100%; text-align: center; font-size: 11px; font-weight: bold; letter-spacing: 1px; color:#000;">
                    ---- page is end ----
                </div>
            ` : ''}
        </body>
        </html>
        `;

        // 4. प्रिंटर स्क्रिप्ट ट्रिगर
        doc.open();
        doc.write(htmlContent);
        doc.close();

        setTimeout(() => {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
            
            // 5. प्रिंट खत्म होते ही 10-सेकंड ऑटो प्रॉम्ट चालू करें
            launchPassbookVerificationFlow(lastPrintedLine, todayDate, currentPageNo);
        }, 200);

    } catch (err) {
        console.error("Passbook Print System Failure:", err);
    }
};

// ⏱️ परफेक्ट 10-सेकंड ऑटोमैटिक यस/नो वेरिफिकेशन सिस्टम
function launchPassbookVerificationFlow(currentLine, todayDate, currentPageNo) {
    let timerDuration = 10;
    
    window.showSystemConfirm(
        `क्या विथड्रॉल प्रविष्टि पासबुक पेज पर सही जगह और साफ़ प्रिंट हो गई है?\n\n(यदि आप कुछ नहीं चुनते, तो ${timerDuration} सेकंड में यह स्वतः 'YES' मान लिया जाएगा)`, 
        "Print Alignment Verification", 
        function() {
            saveNextPassbookLinePointer(currentLine + 1, todayDate, currentPageNo);
        }
    );

    const submitBtn = document.getElementById('custom-prompt-submit-btn');
    const cancelBtn = document.getElementById('custom-prompt-cancel-btn');
    
    if (submitBtn) submitBtn.innerText = `Yes, Clear Line (${timerDuration}s)`;

    const autoYesTimer = setInterval(() => {
        timerDuration--;
        if (submitBtn && document.getElementById('custom-prompt-modal').style.display === 'flex') {
            submitBtn.innerText = `Yes, Clear Line (${timerDuration}s)`;
        }

        if (timerDuration <= 0) {
            clearInterval(autoYesTimer);
            const modal = document.getElementById('custom-prompt-modal');
            if (modal && modal.style.display === 'flex') {
                modal.style.display = 'none';
                saveNextPassbookLinePointer(currentLine + 1, todayDate, currentPageNo);
                window.showSystemAlert("समय समाप्त! एंट्री को सफल मानकर कतार लाइन आगे बढ़ा दी गई है।", "Auto Acknowledged", "✅");
            }
        }
    }, 1000);

    submitBtn.addEventListener('click', () => clearInterval(autoYesTimer));
    cancelBtn.addEventListener('click', () => {
        clearInterval(autoYesTimer);
        window.showSystemAlert("⚠️ संरेखण (Alignment) निरस्त! अगली बार प्रिंट करने पर यह दोबारा इसी लाइन पर छपेगा।", "Line Retained", "⚠️");
    });
}

function saveNextPassbookLinePointer(nextLine, todayDate, currentPageNo) {
    if (nextLine >= 15) {
        // 🌟 15 लाइन पूरी होते ही पेज भर गया: लाइन वापस 0 करें और पेज नंबर काउंटर को 1 प्लस बढ़ाएं
        localStorage.setItem('passbook_last_line', 0);
        localStorage.setItem('passbook_page_counter', currentPageNo + 1);
        window.showSystemAlert(`📄 इस पेज की सभी 15 कतारें भर चुकी हैं!\n\nअगला प्रिंट 'Page No: ${currentPageNo + 1}' के नए फ्रेश A4 पेज पर शुरू होगा। कृपया नया पेज लगाएं।`, "Page Full", "ℹ️");
    } else {
        localStorage.setItem('passbook_last_line', nextLine);
    }
    localStorage.setItem('passbook_last_date', todayDate);
    
    if (typeof window.loadTodayWithdrawals === 'function') window.loadTodayWithdrawals();
}

// 🌐 Global Event Delegation Listener for Withdrawal Print Button
document.addEventListener('click', (e) => {
    const printBtn = e.target.closest('.btn-print-wit-receipt');
    if (printBtn) {
        const encodedTx = printBtn.getAttribute('data-tx');
        const row = printBtn.closest('tr');
        const srNo = row ? row.cells[0].innerText : "1";
        
        if (encodedTx) {
            window.executeWithdrawalPassbookPrint(encodedTx, srNo);
        }
    }
});
