// ========================================================
// 🖨️ 🌐 CLOUD-SYNC MASTER PASBOOK PRINT ENGINE (PRODUCTION READY - SILENT LOGIC)
// ========================================================

window.executeWithdrawalPassbookPrint = async function(encodedTx, srNo) {
    try {
        const txData = JSON.parse(atob(encodedTx));
        console.log("🖨️ Initializing Silent Matrix Passbook Print via Python Agent:", txData);

        const koCode = window.currentUser?.ko_code || "--";
        const userAddress = window.currentUser?.address || "KIOSK CENTER, INDIA";
        const todayDate = new Date().toISOString().split('T')[0];
        const client = window.supabaseClient || window.supabase;

        // 🌟 [LOCAL STORAGE MAPPER]: सेटिंग्स से सेव किया हुआ मैन्युअल पासबुक प्रिंटर का नाम निकालें
        const targetPassbookPrinter = localStorage.getItem('jarvis_default_withdrawal_printer');

        if (!targetPassbookPrinter) {
            if (window.showSystemAlert) {
                window.showSystemAlert("कृपया पहले सेटिंग्स में जाकर विथड्रॉल पासबुक प्रिंटर सेलेक्ट करें!", "Printer Not Set", "⚠️");
            } else {
                alert("⚠️ कृपया पहले सेटिंग्स में जाकर विथड्रॉल पासबुक प्रिंटर सेलेक्ट करें!");
            }
            return;
        }

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

        const dateParts = todayDate.split('-');
        const displayDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

        // 📊 Pure layout optimization for Matrix/Passbook printer parsing stream text array
        // Isme standard styling and tabular context format embedded hai background processor ke liye
        let receiptHTML = "";

        if (lastPrintedLine === 0 || forceHeaderReprint) {
            receiptHTML += `
                Kiosk Banking System
                Center: ${userAddress}
                Date: ${displayDate} | Page No: ${currentPageNo}
                ----------------------------------------------------------------------
                Sr.No   KO-Code      Account / Details           Name         Amount
                ----------------------------------------------------------------------
            `;
        }

        receiptHTML += `
                ${srNo}       ${koCode}      ${txData.aadhaar_number}      ${txData.customer_name.toUpperCase()}      Rs.${parseFloat(txData.amount).toFixed(2)}
        `;

        if (lastPrintedLine === 14) {
            receiptHTML += `
                ----------------------------------------------------------------------
                --------------- End of Page ${currentPageNo} (Max 15 Lines) ---------------
            `;
        }

        // 🚀 STEP 5: Old iframe mechanism dropped - Core background payload fetch router connection
        const response = await fetch("http://127.0.0.1:5000/print", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                printer_name: targetPassbookPrinter,
                content: receiptHTML
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log(`🚀 Matrix passbook entry successfully transmitted to: ${targetPassbookPrinter}`);
            
            // Trigger confirmation logic post transmission
            setTimeout(() => {
                launchPassbookVerificationFlow(lastPrintedLine, todayDate, currentPageNo, isMergedUser, sharedGroupId);
            }, 100);
        } else {
            throw new Error(result.message || "Unknown error response from local agent");
        }

    } catch (err) {
        console.error("Passbook Print System Failure:", err);
        if (window.showSystemAlert) {
            window.showSystemAlert("प्रिंटर एजेंट से संपर्क नहीं हो पाया। कृपया सुनिश्चित करें कि Python Agent बैकग्राउंड में सक्रिय है।", "Connection Error", "❌");
        }
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
        if (submitBtn && document.getElementById('custom-prompt-modal') && document.getElementById('custom-prompt-modal').style.display === 'flex') {
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
document.removeEventListener('click', triggerPassbookSilentPrintHandler);
document.addEventListener('click', triggerPassbookSilentPrintHandler);

function triggerPassbookSilentPrintHandler(e) {
    const printBtn = e.target.closest('.btn-print-wit-receipt');
    if (printBtn) {
        e.preventDefault();
        e.stopPropagation(); // Standard chrome dialogue framework bypass configuration
        
        const encodedTx = printBtn.getAttribute('data-tx');
        const row = printBtn.closest('tr');
        const srNo = row ? row.cells[0].innerText : "1";
        if (encodedTx) {
            window.executeWithdrawalPassbookPrint(encodedTx, srNo);
        }
    }
}
