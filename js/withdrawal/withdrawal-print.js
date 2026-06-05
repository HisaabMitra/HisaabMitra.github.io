// ========================================================
// 🖨️ 🌐 CLOUD-SYNC MASTER PASBOOK PRINT ENGINE (PRODUCTION READY)
// ========================================================

window.executeWithdrawalPassbookPrint = async function(encodedTx, srNo) {
    try {
        const txData = JSON.parse(atob(encodedTx));

        const koCode = window.currentUser?.ko_code || "--";
        const userAddress = window.currentUser?.address || "KIOSK CENTER, INDIA";
        const todayDate = new Date().toISOString().split('T')[0];
        const client = window.supabaseClient || window.supabase;

        // 🌟 [LOCAL STORAGE MAPPER]: सेटिंग्स से सेव किया हुआ मैन्युअल पासबुक प्रिंटर का नाम निकालें
        const targetPassbookPrinter = localStorage.getItem('jarvis_default_withdrawal_printer') || "Passbook_Print";

        // [JARVIS CLOUD ROUTER LOGIC]: चेक करें कि क्या यह यूजर किसी प्रिंटर ग्रुप में मर्ज है
        const isMergedUser = window.currentUser?.merger_status === 'merged' && window.currentUser?.printer_group_id;
        const sharedGroupId = window.currentUser?.printer_group_id || null;

        let lastPrintedLine = 0;
        let currentPageNo = 1;
        let lastPrintedDate = todayDate;

        if (isMergedUser) {
            const { data: cloudGroup, error: fetchErr } = await client
                .from('shared_printer_groups')
                .select('*')
                .eq('group_id', sharedGroupId)
                .maybeSingle();

            if (fetchErr) throw fetchErr;

            if (cloudGroup) {
                lastPrintedLine = parseInt(cloudGroup.last_printed_line) || 0;
                currentPageNo = parseInt(cloudGroup.page_counter) || 1;
                lastPrintedDate = cloudGroup.last_printed_date || todayDate;
            }
        } else {
            lastPrintedLine = parseInt(localStorage.getItem('passbook_last_line')) || 0;
            currentPageNo = parseInt(localStorage.getItem('passbook_page_counter')) || 1;
            lastPrintedDate = localStorage.getItem('passbook_last_date') || "";
        }

        let forceHeaderReprint = false;
        if (lastPrintedDate !== todayDate) {
            forceHeaderReprint = true;
            currentPageNo = 1;
            if (lastPrintedLine >= 15) lastPrintedLine = 0;
        }

        const rowHeight = 52;         
        const baseHeaderOffset = 130;  
        const dynamicTopMargin = baseHeaderOffset + (lastPrintedLine * rowHeight);

        const dateParts = todayDate.split('-');
        const displayDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

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

        let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <!-- 🎯 विंडोज़ डायरेक्ट रूटिंग लॉक: टाइटल टैग को सीधे आपके सेव किए गए पासबुक प्रिंटर के नाम पर सेट किया गया है -->
            <title>${targetPassbookPrinter}</title>
            <style>
                @page { size: A4 portrait; margin: 8mm 6mm; }
                body {
                    margin: 0; padding: 0;
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 14px; line-height: 1.2; color: #000;
                }
                .header-block { text-align: center; width: 100%; margin-bottom: 5px; }
                .header-title { font-size: 18px; font-weight: bold; text-transform: uppercase; }
                .header-address { font-size: 12px; text-transform: uppercase; margin-top: 1px; }
                .meta-line { font-size: 14px; font-weight: bold; text-align: center; margin: 4px 0; }
                .matrix-table { width: 100%; border-collapse: collapse; margin-top: 2px; }
                .matrix-table th {
                    border-bottom: 1px dashed #000; border-top: 1px dashed #000;
                    padding: 6px 2px; text-align: left; font-weight: bold; font-size: 14px;
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

        printFrame.srcdoc = htmlContent;

        printFrame.onload = function() {
            try {
                printFrame.contentWindow.focus();
                printFrame.contentWindow.print();
                
                setTimeout(() => {
                    launchPassbookVerificationFlow(lastPrintedLine, todayDate, currentPageNo, isMergedUser, sharedGroupId);
                }, 100);
            } catch (printErr) {
                console.error("Internal Iframe Print Error:", printErr);
            }
        };

    } catch (err) {
        console.error("Passbook Print System Failure:", err);
    }
};

// ⏱️ ⌨️ कीबोर्ड शॉर्टकट समर्थित क्लॉथ-सिंक वेरिफिकेशन इंजन
function launchPassbookVerificationFlow(currentLine, todayDate, currentPageNo, isMergedUser, sharedGroupId) {
    let timerDuration = 10;
    
    const executeYesAction = function() {
        clearInterval(autoYesTimer);
        window.removeEventListener('keydown', handleTimerKey, { capture: true });
        
        const modal = document.getElementById('custom-prompt-modal');
        if (modal) modal.style.display = 'none';

        saveNextPassbookLinePointer(currentLine + 1, todayDate, currentPageNo, isMergedUser, sharedGroupId);
    };

    const executeNoAction = function() {
        clearInterval(autoYesTimer);
        window.removeEventListener('keydown', handleTimerKey, { capture: true });
        
        const modal = document.getElementById('custom-prompt-modal');
        if (modal) modal.style.display = 'none';
        
        if (window.showSystemAlert) {
            window.showSystemAlert("⚠️ अगली बार प्रिंट करने पर यह दोबारा इसी लाइन पर छपेगा।", "Line Retained", "⚠️");
        }
    };

    if (window.showSystemConfirm) {
        window.showSystemConfirm(
            `क्या विथड्रॉल प्रविष्टि पासबुक पेज पर सही जगह और साफ़ प्रिंट हो गई है?\n\n(यदि आप कुछ नहीं चुनते, तो ${timerDuration} सेकंड में यह स्वतः 'YES' मान लिया जाएगा)`, 
            "Print Alignment Verification", 
            function() { executeYesAction(); }
        );
    }

    const submitBtn = document.getElementById('custom-prompt-submit-btn');
    const cancelBtn = document.getElementById('custom-prompt-cancel-btn');
    if (submitBtn) submitBtn.innerText = `Yes, Clear Line (${timerDuration}s)`;

    const autoYesTimer = setInterval(() => {
        timerDuration--;
        if (submitBtn && document.getElementById('custom-prompt-modal').style.display === 'flex') {
            submitBtn.innerText = `Yes, Clear Line (${timerDuration}s)`;
        }

        if (timerDuration <= 0) {
            executeYesAction();
            if (window.showSystemAlert) {
                window.showSystemAlert("समय समाप्त! लाइन आगे बढ़ा दी गई है।", "Auto Acknowledged", "✅");
            }
        }
    }, 1000);

    if (submitBtn) {
        submitBtn.onclick = function(e) { e.preventDefault(); executeYesAction(); };
    }
    if (cancelBtn) {
        cancelBtn.onclick = function(e) { e.preventDefault(); executeNoAction(); };
    }

    function handleTimerKey(e) {
        const modal = document.getElementById('custom-prompt-modal');
        if (modal && modal.style.display === 'flex') {
            if (e.key === 'Enter') { e.preventDefault(); executeYesAction(); }
            if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); executeNoAction(); }
        }
    }
    window.addEventListener('keydown', handleTimerKey, { capture: true });
}

// 💾 लाइन कतार और काउंटर डेटाबेस / लोकल स्टोरेज सिंकिंग हाउस
async function saveNextPassbookLinePointer(nextLine, todayDate, currentPageNo, isMergedUser, sharedGroupId) {
    let nextPointerLine = nextLine;
    let nextPageCounter = currentPageNo;

    if (nextLine >= 15) {
        nextPointerLine = 0;
        nextPageCounter = currentPageNo + 1;
        if (window.showSystemAlert) {
            window.showSystemAlert(`📄 इस पेज की सभी 15 कतारें भर चुकी हैं!\n\nअगला प्रिंट 'Page No: ${nextPageCounter}' के नए फ्रेश A4 पेज पर शुरू होगा। कृपया नया पेज लगाएं।`, "Page Full", "ℹ️");
        }
    }

    if (isMergedUser && sharedGroupId) {
        const client = window.supabaseClient || window.supabase;
        try {
            const { error } = await client
                .from('shared_printer_groups')
                .update({
                    last_printed_line: nextPointerLine,
                    page_counter: nextPageCounter,
                    last_printed_date: todayDate,
                    updated_at: new Date().toISOString()
                })
                .eq('group_id', sharedGroupId);

            if (error) throw error;
        } catch (dbErr) {
            console.error("Failed to sync print coordinates to cloud ledger:", dbErr);
        }
    } else {
        localStorage.setItem('passbook_last_line', nextPointerLine);
        localStorage.setItem('passbook_page_counter', nextPageCounter);
        localStorage.setItem('passbook_last_date', todayDate);
    }
    
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
