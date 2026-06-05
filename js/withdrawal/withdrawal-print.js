// ========================================================
// 🖨️ DOT-MATRIX PLQ-20 STYLE A4 LINE-BY-LINE PRINT ENGINE (WITH KEYBOARD SHORTCUTS FOR TIMER)
// ========================================================

window.executeWithdrawalPassbookPrint = function(encodedTx, srNo) {
    try {
        const txData = JSON.parse(atob(encodedTx));
        console.log("🖨️ Matrix Passbook Thread Triggered for SrNo:", srNo, txData);

        const koCode = window.currentUser?.ko_code || "--";
        const userAddress = window.currentUser?.address || "KIOSK CENTER, INDIA";
        const todayDate = new Date().toISOString().split('T')[0];

        // 1. ट्रैक करें कि प्रिंटर अभी किस लाइन पर है (0 से 14 तक कुल 15 कतारें)
        let lastPrintedLine = parseInt(localStorage.getItem('passbook_last_line')) || 0;
        let lastPrintedDate = localStorage.getItem('passbook_last_date') || "";
        
        // पेज नंबरिंग इंजन काउंटर लोड करें
        let currentPageNo = parseInt(localStorage.getItem('passbook_page_counter')) || 1;

        // नियम: यदि आज नई तारीख है, तो पेज नंबर दोबारा 1 से शुरू होगा और हेडर फोर्स रीप्रिंट होगा
        let forceHeaderReprint = false;
        if (lastPrintedDate !== todayDate) {
            forceHeaderReprint = true;
            currentPageNo = 1; 
            localStorage.setItem('passbook_page_counter', 1);
            if (lastPrintedLine >= 15) lastPrintedLine = 0; 
        }

        // 15 एंट्री को पूरे A4 पेज के अंत तक फैलाने के लिए रो-हाइट (52px) सेट है
        const rowHeight = 52;         
        const baseHeaderOffset = 130;  
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

        // PLQ-20 के लिए संकीर्ण (Narrow Margin) और वर्टिकली स्ट्रेच्ड HTML लेआउट
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
                    font-size: 14px;
                    line-height: 1.2;
                    color: #000;
                }
                .header-block {
                    text-align: center;
                    width: 100%;
                    margin-bottom: 5px;
                }
                .header-title { font-size: 18px; font-weight: bold; text-transform: uppercase; }
                .header-address { font-size: 12px; text-transform: uppercase; margin-top: 1px; }
                .meta-line { font-size: 14px; font-weight: bold; text-align: center; margin: 4px 0; }
                .matrix-table { width: 100%; border-collapse: collapse; margin-top: 2px; }
                .matrix-table th {
                    border-bottom: 1px dashed #000;
                    border-top: 1px dashed #000;
                    padding: 6px 2px;
                    text-align: left;
                    font-weight: bold;
                    font-size: 14px;
                }
                .matrix-table td { padding: 12px 2px; font-size: 11px; }
                .sig-line { width: 85px; border-bottom: 1px dashed #000; display: inline-block; height: 12px; }
            </style>
        </head>
        <body>
        `;

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

        const inlineStyle = (lastPrintedLine === 0 || forceHeaderReprint) 
            ? `margin-top: 4px;` 
            : `position: absolute; top: ${dynamicTopMargin}px; left: 0; width: 100%;`;

        htmlContent += `
            <table class="matrix-table" style="${inlineStyle}">
                <tbody>
                    <tr>
                        <td style="width: 8%; text-align:center; font-weight:bold;">${srNo}</td>
                        <td style="width: 12%;">${koCode}</td>
                        <td style="width: 22%; letter-spacing: 0.5px;">[Aadhaar Redacted]</td>
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

        doc.open();
        doc.write(htmlContent);
        doc.close();

        setTimeout(() => {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
            
            // 5. प्रिंट खत्म होते ही कीबोर्ड-शॉर्टकट वाले प्रॉम्ट को चालू करें
            launchPassbookVerificationFlow(lastPrintedLine, todayDate, currentPageNo);
        }, 200);

    } catch (err) {
        console.error("Passbook Print System Failure:", err);
    }
};

// ⏱️ ⌨️ कीबोर्ड शॉर्टकट (Enter / Esc) समर्थित 10-सेकंड वेरिफिकेशन इंजन
function launchPassbookVerificationFlow(currentLine, todayDate, currentPageNo) {
    let timerDuration = 10;
    
    // कोर 'YES' सबमिशन लॉजिक
    const executeYesAction = function() {
        clearInterval(autoYesTimer);
        window.removeEventListener('keydown', handleTimerKey, { capture: true }); // लिसनर साफ़ करें
        saveNextPassbookLinePointer(currentLine + 1, todayDate, currentPageNo);
    };

    // कोर 'NO' कैंसिलेशन लॉजिक
    const executeNoAction = function() {
        clearInterval(autoYesTimer);
        window.removeEventListener('keydown', handleTimerKey, { capture: true }); // LSN क्लीन
        const modal = document.getElementById('custom-prompt-modal');
        if (modal) modal.style.display = 'none';
        window.showSystemAlert("⚠️ अगली बार प्रिंट करने पर यह दोबारा इसी लाइन पर छपेगा।", "Line Retained", "⚠️");
    };

    // हमारे कस्टमाइज्ड सिस्टम कन्फर्म को कॉल करें
    window.showSystemConfirm(
        `क्या विथड्रॉल प्रविष्टि पासबुक पेज पर सही जगह और साफ़ प्रिंट हो गई है?\n\n(यदि आप कुछ नहीं चुनते, तो ${timerDuration} सेकंड में यह स्वतः 'YES' मान लिया जाएगा)`, 
        "Print Alignment Verification", 
        function() {
            // यह तब चलता है जब यूजर 'Yes' बटन पर माउस क्लिक करता है
            executeYesAction();
        }
    );

    const submitBtn = document.getElementById('custom-prompt-submit-btn');
    const cancelBtn = document.getElementById('custom-prompt-cancel-btn');
    
    if (submitBtn) submitBtn.innerText = `Yes, Clear Line (${timerDuration}s)`;

    // ⚡ टाइमर काउंटडाउन
    const autoYesTimer = setInterval(() => {
        timerDuration--;
        if (submitBtn && document.getElementById('custom-prompt-modal').style.display === 'flex') {
            submitBtn.innerText = `Yes, Clear Line (${timerDuration}s)`;
        }

        // ⏳ समय समाप्त होने पर ऑटो-यस सबमिट करें
        if (timerDuration <= 0) {
            clearInterval(autoYesTimer);
            window.removeEventListener('keydown', handleTimerKey, { capture: true });
            const modal = document.getElementById('custom-prompt-modal');
            if (modal && modal.style.display === 'flex') {
                modal.style.display = 'none';
                saveNextPassbookLinePointer(currentLine + 1, todayDate, currentPageNo);
                window.showSystemAlert("समय समाप्त! लाइन आगे बढ़ा दी गई है।", "Auto Acknowledged", "✅");
            }
        }
    }, 1000);

    // माउस क्लिक इवेंट्स के लिए टाइमर ओवरराइड्स
    submitBtn.onclick = executeYesAction;
    cancelBtn.onclick = executeNoAction;

    // ⌨️ 🌟 [JARVIS TIMER SHORTCUTS]: Enter और Escape की (Key) इंटरसेप्शन लॉजिक
    function handleTimerKey(e) {
        const modal = document.getElementById('custom-prompt-modal');
        if (modal && modal.style.display === 'flex') {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                modal.style.display = 'none';
                executeYesAction(); // Enter से "Yes, Clear Line"
            }
            if (e.key === 'Escape' || e.key === 'Esc') {
                e.preventDefault();
                e.stopPropagation();
                executeNoAction(); // Escape से Cancel और रो रिटेन
            }
        }
    }

    // कैप्चर फेज में लिसनर चालू करें ताकि यह पूरे पेज पर सबसे पहले रन हो
    window.addEventListener('keydown', handleTimerKey, { capture: true });
}

function saveNextPassbookLinePointer(nextLine, todayDate, currentPageNo) {
    if (nextLine >= 15) {
        localStorage.setItem('passbook_last_line', 0);
        localStorage.setItem('passbook_page_counter', currentPageNo + 1);
        window.showSystemAlert(`📄 इस पेज की सभी 15 कतारें भर चुकी हैं!\n\nअगला प्रिंट 'Page No: ${currentPageNo + 1}' पर शुरू होगा। कृपया नया पेज लगाएं।`, "Page Full", "ℹ️");
    } else {
        localStorage.setItem('passbook_last_line', nextLine);
    }
    localStorage.setItem('passbook_last_date', todayDate);
    
    if (typeof window.loadTodayWithdrawals === 'function') window.loadTodayWithdrawals();
}

// Global Event Delegation Listener for Withdrawal Print Button
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
