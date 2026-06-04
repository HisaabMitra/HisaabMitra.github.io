// ========================================================
// 🖨️ DOT-MATRIX PLQ-20 STYLE A4 LINE-BY-LINE PRINT ENGINE (UPDATED TIMER & ADDR)
// ========================================================

window.executeWithdrawalPassbookPrint = function(encodedTx, srNo) {
    try {
        const txData = JSON.parse(atob(encodedTx));
        console.log("🖨️ Matrix Passbook Thread Triggered for SrNo:", srNo, txData);

        const koCode = window.currentUser?.ko_code || "--";
        
        // 🎯 सुधार: एड्रेस अब सीधे लॉगिन यूजर के डेटाबेस फ़ील्ड (.address) से डायनेमिकली लोड होगा
        const userAddress = window.currentUser?.address || "KIOSK CENTER, INDIA";
        const todayDate = new Date().toISOString().split('T')[0];

        // 1. ट्रैक करें कि प्रिंटर अभी किस लाइन पर है (0 से 14 तक कुल 15 कतारें)
        let lastPrintedLine = parseInt(localStorage.getItem('passbook_last_line')) || 0;
        let lastPrintedDate = localStorage.getItem('passbook_last_date') || "";

        // नियम: यदि आज नई तारीख है और पुरानी तारीख से अलग है, तो पेज पर दोबारा हेडर प्रिंट होगा
        let forceHeaderReprint = false;
        if (lastPrintedDate !== todayDate) {
            forceHeaderReprint = true;
            if (lastPrintedLine >= 15) lastPrintedLine = 0; 
        }

        // 2. गणना करें कि इस एंट्री को टॉप से कितने वर्टिकल स्पेस (Margin-Top) के बाद छपना है
        // नैरो मार्जिन के हिसाब से कोऑर्डिनेट्स को री-मैप किया गया है
        const rowHeight = 35; 
        const baseHeaderOffset = 110; // हेडर का वर्टिकल स्पेस
        const dynamicTopMargin = baseHeaderOffset + (lastPrintedLine * rowHeight);

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

        // 📊 PLQ-20 के लिए बिल्कुल संकीर्ण (Narrow Margin) और ज़ीरो-गैप HTML लेआउट
        let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                /* 🎯 पेज मार्जिन को बिल्कुल संकीर्ण (Narrow - 5mm) लॉक कर दिया गया है */
                @page { size: A4 portrait; margin: 5mm; }
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 12px;
                    line-height: 1.1;
                    color: #000;
                }
                .header-block {
                    text-align: center;
                    width: 100%;
                    margin-bottom: 10px;
                }
                .header-title { font-size: 16px; font-weight: bold; text-transform: uppercase; }
                .header-address { font-size: 10px; text-transform: uppercase; margin-top: 1px; }
                
                /* 🎛️ नैरो ग्रिड टेबल स्ट्रक्चर */
                .matrix-table { width: 100%; border-collapse: collapse; margin-top: 2px; }
                .matrix-table th {
                    border-bottom: 1px dashed #000;
                    border-top: 1px dashed #000;
                    padding: 6px 2px;
                    text-align: left;
                    font-weight: bold;
                    font-size: 11px;
                }
                .matrix-table td { padding: 8px 2px; font-size: 11px; }
                .sig-line { width: 80px; border-bottom: 1px dashed #000; display: inline-block; height: 10px; }
            </style>
        </head>
        <body>
        `;

        // अगर पहली लाइन है (0) या तारीख बदल गई है, तो हेडर कॉलम प्रिंट करें
        if (lastPrintedLine === 0 || forceHeaderReprint) {
            htmlContent += `
                <div class="header-block">
                    <div class="header-title">Kiosk Banking System</div>
                    <div class="header-address">${userAddress}</div>
                </div>
                <table class="matrix-table">
                    <thead>
                        <tr>
                            <th style="width: 8%; text-align:center;">Sr.No</th>
                            <th style="width: 12%;">KO-Code</th>
                            <th style="width: 22%;">Aadhar Number</th>
                            <th style="width: 25%;">Name</th>
                            <th style="width: 15%;">Amount</th>
                            <th style="width: 18%; text-align:center;">Signature</th>
                        </tr>
                    </thead>
                </table>
            `;
        }

        // 🎯 एब्सोल्यूट कोऑर्डिनेट कतार जो ठीक उसी पुरानी छोड़ी हुई जगह पर छपेगी
        const inlineStyle = (lastPrintedLine === 0 || forceHeaderReprint) 
            ? `margin-top: 2px;` 
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
                <div style="position: absolute; bottom: 5mm; left: 0; width: 100%; text-align: center; font-size: 10px; font-weight: bold; border-top: 1px dashed #000; padding-top: 4px;">
                    This is a computer generated receipt hence no need of signature.
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
            launchPassbookVerificationFlow(lastPrintedLine, todayDate);
        }, 200);

    } catch (err) {
        console.error("Passbook Print System Failure:", err);
    }
};

// ⏱️ सुधरा हुआ परफेक्ट 10-सेकंड ऑटोमैटिक यस/नो वेरिफिकेशन सिस्टम
function launchPassbookVerificationFlow(currentLine, todayDate) {
    let timerDuration = 10;
    
    window.showSystemConfirm(
        `क्या विथड्रॉल प्रविष्टि पासबुक पेज पर सही जगह और साफ़ प्रिंट हो गई है?\n\n(यदि आप कुछ नहीं चुनते, तो ${timerDuration} सेकंड में यह स्वतः 'YES' मान लिया जाएगा)`, 
        "Print Alignment Verification", 
        function() {
            saveNextPassbookLinePointer(currentLine + 1, todayDate);
        }
    );

    const submitBtn = document.getElementById('custom-prompt-submit-btn');
    const cancelBtn = document.getElementById('custom-prompt-cancel-btn');
    
    if (submitBtn) submitBtn.innerText = `Yes, Clear Line (${timerDuration}s)`;

    // ⚡ टाइमर फिक्स: अब यह परफेक्ट 1 सेकंड के अंतराल (1000ms) पर टिक-टिक करेगा
    const autoYesTimer = setInterval(() => {
        timerDuration--;
        if (submitBtn && document.getElementById('custom-prompt-modal').style.display === 'flex') {
            submitBtn.innerText = `Yes, Clear Line (${timerDuration}s)`;
        }

        // ⏳ समय समाप्त होने पर ऑटो-सबमिट
        if (timerDuration <= 0) {
            clearInterval(autoYesTimer);
            const modal = document.getElementById('custom-prompt-modal');
            if (modal && modal.style.display === 'flex') {
                modal.style.display = 'none';
                saveNextPassbookLinePointer(currentLine + 1, todayDate);
                window.showSystemAlert("समय समाप्त! एंट्री को सफल मानकर कतार लाइन आगे बढ़ा दी गई है।", "Auto Acknowledged", "✅");
            }
        }
    }, 1000); // 🌟 यहाँ 1000ms कर दिया गया है जिससे अब पूरा 10 सेकंड टिकेगा!

    submitBtn.addEventListener('click', () => clearInterval(autoYesTimer));
    cancelBtn.addEventListener('click', () => {
        clearInterval(autoYesTimer);
        window.showSystemAlert("⚠️ संरेखण (Alignment) निरस्त! अगली बार प्रिंट करने पर यह दोबारा इसी लाइन पर छपेगा।", "Line Retained", "⚠️");
    });
}

function saveNextPassbookLinePointer(nextLine, todayDate) {
    if (nextLine >= 15) {
        localStorage.setItem('passbook_last_line', 0);
        window.showSystemAlert("📄 इस पेज की सभी 15 कतारें भर चुकी हैं! कृपया प्रिंटर में नया A4 पेज लोड करें।", "Page Full", "ℹ️");
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
