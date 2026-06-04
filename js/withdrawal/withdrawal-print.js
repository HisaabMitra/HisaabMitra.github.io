// ========================================================
// 🖨️ DOT-MATRIX PLQ-20 STYLE A4 LINE-BY-LINE PRINT ENGINE
// ========================================================

window.executeWithdrawalPassbookPrint = function(encodedTx, srNo) {
    try {
        const txData = JSON.parse(atob(encodedTx));
        console.log("🖨️ Matrix Passbook Thread Triggered for SrNo:", srNo, txData);

        const koCode = window.currentUser?.ko_code || "--";
        const userAddress = window.currentUser?.customer_address || "BRANCH AREA, INDIA";
        const todayDate = new Date().toISOString().split('T')[0];

        // 1. 🔍 ट्रैक करें कि प्रिंटर अभी किस लाइन पर है (0 से 14 तक कुल 15 कतारें)
        let lastPrintedLine = parseInt(localStorage.getItem('passbook_last_line')) || 0;
        let lastPrintedDate = localStorage.getItem('passbook_last_date') || "";

        // 🎯 नियम: यदि आज नई तारीख है और पुरानी तारीख से अलग है, तो पेज पर दोबारा हेडर प्रिंट होगा!
        let forceHeaderReprint = false;
        if (lastPrintedDate !== todayDate) {
            forceHeaderReprint = true;
            // नई तारीख शुरू होने पर अगर लाइन आगे बढ़ चुकी थी, तो बीच में हेडर देने के लिए उसे वैसे ही रखेंगे
            if (lastPrintedLine >= 15) lastPrintedLine = 0; 
        }

        // 2. गणना करें कि इस एंट्री को टॉप से कितने वर्टिकल स्पेस (Margin-Top) के बाद छपना है
        // A4 पेज पर हेडर के बाद प्रत्येक रो के लिए लगभग 40px का फिक्स गैप दे रहे हैं
        const rowHeight = 42; 
        const baseHeaderOffset = 140; // हेडर का स्पेस
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

        // 📊 PLQ-20 और A4 पेज के लिए सटीक CSS और कंडीशनल लेआउट
        let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page { size: A4 portrait; margin: 0; }
                body {
                    margin: 0;
                    padding: 20mm 15mm;
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 12px;
                    color: #000;
                }
                .header-block {
                    text-align: center;
                    width: 100%;
                    margin-bottom: 15px;
                }
                .header-title { font-size: 18px; font-weight: bold; text-transform: uppercase; }
                .header-address { font-size: 11px; text-transform: uppercase; margin-top: 2px; }
                
                /* 🎛️ ग्रिड टेबल स्ट्रक्चर */
                .matrix-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                .matrix-table th {
                    border-bottom: 2px solid #000;
                    border-top: 2px solid #000;
                    padding: 8px 4px;
                    text-align: left;
                    font-weight: bold;
                    font-size: 12px;
                }
                .matrix-table td { padding: 10px 4px; font-size: 12px; }
                .sig-line { width: 100px; border-bottom: 1px solid #000; display: inline-block; height: 12px; }
            </style>
        </head>
        <body>
        `;

        // अगर पहली लाइन है (0) या तारीख बदल गई है, तो हेडर और थ्रेड हेडिंग प्रिंट करें
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
                            <th style="width: 18%;">Signature</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="visibility: hidden;"><td>Spacer</td></tr>
                    </tbody>
                </table>
            `;
        }

        // 🎯 जादुई सिंगल कतार जो ठीक उसी पुरानी छोड़ी हुई जगह पर प्रिंट होगी
        // यदि हेडर साथ में नहीं छप रहा है, तो हम इसे dynamicTopMargin के जरिए नीचे धकेलेंगे
        const inlineStyle = (lastPrintedLine === 0 || forceHeaderReprint) 
            ? `margin-top: 5px;` 
            : `position: absolute; top: ${dynamicTopMargin}px; left: 15mm; width: calc(100% - 30mm);`;

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
                <div style="position: absolute; bottom: 20mm; left: 15mm; width: calc(100% - 30mm); text-align: center; font-size: 10px; font-weight: bold; border-top: 1px dashed #000; padding-top: 5px;">
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
            
            // 5. 🚨 प्रिंट खत्म होते ही आपका कस्टमाइज्ड 10-सेकंड ऑटो प्रॉम्ट चालू करें
            launchPassbookVerificationFlow(lastPrintedLine, todayDate);
        }, 200);

    } catch (err) {
        console.error("Passbook Print System Failure:", err);
    }
};

// ⏱️ 10-सेकंड ऑटोमैटिक यस/नो वेरिफिकेशन सिस्टम
function launchPassbookVerificationFlow(currentLine, todayDate) {
    let timerDuration = 10;
    
    // हमारे कन्फर्म मोडल को कॉल करें
    window.showSystemConfirm(
        `क्या विथड्रॉल एंट्री पासबुक पेज पर सही जगह और साफ़ प्रिंट हो गई है?\n\n(यदि आप कुछ नहीं चुनते, तो ${timerDuration} सेकंड में यह स्वतः 'YES' मान लिया जाएगा)`, 
        "Print Alignment Verification", 
        function() {
            // ऑपरेटर ने 'YES' दबाया या टाइमर खत्म हुआ -> लाइन इंडेक्स को आगे बढ़ाओ
            saveNextPassbookLinePointer(currentLine + 1, todayDate);
        }
    );

    // बटन के टेक्स्ट को डायनेमिकली अपडेट करने और 10 सेकंड बाद ऑटो-सबमिट करने का लॉजिक
    const submitBtn = document.getElementById('custom-prompt-submit-btn');
    const cancelBtn = document.getElementById('custom-prompt-cancel-btn');
    
    if (submitBtn) submitBtn.innerText = `Yes, Clear Line (${timerDuration}s)`;

    const autoYesTimer = setInterval(() => {
        timerDuration--;
        if (submitBtn && document.getElementById('custom-prompt-modal').style.display === 'flex') {
            submitBtn.innerText = `Yes, Clear Line (${timerDuration}s)`;
        }

        // ⏳ समय समाप्त! ऑटोमैटिक 'YES' एक्शन ट्रिगर करें
        if (timerDuration <= 0) {
            clearInterval(autoYesTimer);
            const modal = document.getElementById('custom-prompt-modal');
            if (modal && modal.style.display === 'flex') {
                modal.style.display = 'none';
                saveNextPassbookLinePointer(currentLine + 1, todayDate);
                window.showSystemAlert("समय समाप्त! एंट्री को सफल मानकर कतार लाइन आगे बढ़ा दी गई है।", "Auto Acknowledged", "✅");
            }
        }
    }, 100);

    // यदि ऑपरेटर ने टाइमर के बीच में ही मैन्युअली 'YES' या 'NO' दबा दिया तो टाइमर को रोकें
    submitBtn.addEventListener('click', () => clearInterval(autoYesTimer));
    cancelBtn.addEventListener('click', () => {
        clearInterval(autoYesTimer);
        // ऑपरेटर ने 'NO' कर दिया -> लाइन वहीं रहेगी, स्टोरेज में बदलाव नहीं होगा
        window.showSystemAlert("⚠️ संरेखण (Alignment) निरस्त! अगली बार प्रिंट करने पर यह दोबारा इसी लाइन पर छपेगा।", "Line Retained", "⚠️");
    });
}

// पॉइंटर को लॉक करने का हेल्पर फंक्शन
function saveNextPassbookLinePointer(nextLine, todayDate) {
    if (nextLine >= 15) {
        // 15 लाइन पूरी होते ही पेज भर गया, वापस 0 कर दो ताकि नया पेज लगे
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
        // टेबल से लाइव क्रम संख्या (Sr. No.) निकालने के लिए DOM ट्रैवर्सल
        const row = printBtn.closest('tr');
        const srNo = row ? row.cells[0].innerText : "1";
        
        if (encodedTx) {
            window.executeWithdrawalPassbookPrint(encodedTx, srNo);
        }
    }
});
