// ========================================================
// 🖨️ 🌐 CLOUD-SYNC FUND TRANSFER PASBOOK PRINT ENGINE (LINE SYNC MODE)
// ========================================================

window.executeFundTransferPassbookPrint = async function(encodedTx, srNo) {
    try {
        const txData = JSON.parse(atob(encodedTx));
        console.log("🖨️ Initializing Silent FT Passbook Print synced with Withdrawal lines:", txData);

        const koCode = window.currentUser?.ko_code || "--";
        const userAddress = window.currentUser?.address || "KIOSK CENTER, INDIA";
        const todayDate = new Date().toISOString().split('T')[0];
        const client = window.supabaseClient || window.supabase;

        // 🌟 [PRINTER MAPPER]: Settings se save kiya hua withdrawal/passbook printer nikalna
        const targetPassbookPrinter = localStorage.getItem('jarvis_default_withdrawal_printer');

        if (!targetPassbookPrinter) {
            if (window.showSystemAlert) {
                window.showSystemAlert("कृपया पहले सेटिंग्स में जाकर विथड्रॉल/पासबुक प्रिंटर सेलेक्ट करें!", "Printer Not Set", "⚠️");
            } else {
                alert("⚠️ कृपया पहले सेटिंग्स में जाकर विथड्रॉल/पासबुक प्रिंटर सेलेक्ट करें!");
            }
            return;
        }

        // 🔗 [WITHDRAWAL LINE CO-ORDINATION SYNC]: Read shared line pointer from cloud group or storage
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

        // 📊 TEXT LAYOUT GENERATOR: Synced alignment layout for Matrix/Passbook streams
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

        // Khas Logic Hook: Sirf From Customer (Sender) ka Aadhaar, Name aur Amount transmit hoga
        receiptHTML += `
                ${srNo}       ${koCode}      ${txData.from_aadhaar}      ${txData.from_customer_name.toUpperCase()}      Rs.${parseFloat(txData.amount).toFixed(2)}
        `;

        if (lastPrintedLine === 14) {
            receiptHTML += `
                ----------------------------------------------------------------------
                --------------- End of Page ${currentPageNo} (Max 15 Lines) ---------------
            `;
        }

        // 🚀 TRANSMISSION PIPELINE: Fire silent command directly to Python Localhost Agent port 5000
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
            console.log(`🚀 FT entry successfully printed on row line index [${lastPrintedLine}] via ${targetPassbookPrinter}`);
            
            // Sync verification coordinates dialog handler
            setTimeout(() => {
                launchFTVerificationFlow(lastPrintedLine, todayDate, currentPageNo, isMergedUser, sharedGroupId);
            }, 100);
        } else {
            throw new Error(result.message || "Unknown response token from background agent");
        }

    } catch (err) {
        console.error("Fund Transfer Passbook Printing Fatal Failure:", err);
        if (window.showSystemAlert) {
            window.showSystemAlert("प्रिंटर एजेंट से संपर्क विफलता। कृपया HisaabMitra Agent चेक करें।", "Connection Error", "❌");
        }
    }
};

// ⏱️ ⌨️ LINE VERIFICATION HOOK (Shared core layout logic)
function launchFTVerificationFlow(currentLine, todayDate, currentPageNo, isMergedUser, sharedGroupId) {
    let timerDuration = 10;
    
    const executeYesAction = function() {
        clearInterval(autoYesTimer);
        window.removeEventListener('keydown', handleFTTimerKey, { capture: true });
        
        const modal = document.getElementById('custom-prompt-modal');
        if (modal) modal.style.display = 'none';

        // Shared line increment block trigger
        saveNextFTLinePointer(currentLine + 1, todayDate, currentPageNo, isMergedUser, sharedGroupId);
    };

    const executeNoAction = function() {
        clearInterval(autoYesTimer);
        window.removeEventListener('keydown', handleFTTimerKey, { capture: true });
        
        const modal = document.getElementById('custom-prompt-modal');
        if (modal) modal.style.display = 'none';
        
        if (window.showSystemAlert) {
            window.showSystemAlert("⚠️ कतार सुरक्षित रखी गई। अगली एंट्री दोबारा इसी लाइन निर्देशांक पर छपेगी।", "Line Retained", "⚠️");
        }
    };

    if (window.showSystemConfirm) {
        window.showSystemConfirm(
            `क्या फंड ट्रांसफर प्रविष्टि पासबुक पेज पर सही जगह और साफ प्रिंट हो गई है?\n\n(यदि आप कुछ नहीं चुनते, तो ${timerDuration} सेकंड में यह स्वतः 'YES' मान लिया जाएगा)`, 
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
                window.showSystemAlert("समय समाप्त! साझा पासबुक लाइन निर्देशांक आगे बढ़ा दिए गए हैं।", "Auto Acknowledged", "✅");
            }
        }
    }, 1000);

    if (submitBtn) {
        submitBtn.onclick = function(e) { e.preventDefault(); executeYesAction(); };
    }
    if (cancelBtn) {
        cancelBtn.onclick = function(e) { e.preventDefault(); executeNoAction(); };
    }

    function handleFTTimerKey(e) {
        const modal = document.getElementById('custom-prompt-modal');
        if (modal && modal.style.display === 'flex') {
            if (e.key === 'Enter') { e.preventDefault(); executeYesAction(); }
            if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); executeNoAction(); }
        }
    }
    window.addEventListener('keydown', handleFTTimerKey, { capture: true });
}

// 💾 SHARED POINTER UPDATER HUB (Keeps both screens completely synchronized)
async function saveNextFTLinePointer(nextLine, todayDate, currentPageNo, isMergedUser, sharedGroupId) {
    let nextPointerLine = nextLine;
    let nextPageCounter = currentPageNo;

    if (nextLine >= 15) {
        nextPointerLine = 0;
        nextPageCounter = currentPageNo + 1;
        if (window.showSystemAlert) {
            window.showSystemAlert(`📄 साझा पेज की सभी 15 कतारें भर चुकी हैं!\n\nअगला प्रिंट 'Page No: ${nextPageCounter}' के नए फ्रेश A4 पेज पर शुरू होगा। कृपया नया पासबुक पेज लगाएं।`, "Page Full", "ℹ️");
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
            console.error("Failed to sync shared line coordinates to cloud ledger:", dbErr);
        }
    } else {
        localStorage.setItem('passbook_last_line', nextPointerLine);
        localStorage.setItem('passbook_page_counter', nextPageCounter);
        localStorage.setItem('passbook_last_date', todayDate);
    }
    
    // Live summary update call triggers
    if (typeof window.loadTodayFundTransfers === 'function') window.loadTodayFundTransfers();
}

// Global Event Delegation Listener for Fund Transfer Table Print Clicks
document.removeEventListener('click', triggerFTSilentPassbookPrintHandler);
document.addEventListener('click', triggerFTSilentPassbookPrintHandler);

function triggerFTSilentPassbookPrintHandler(e) {
    const printBtn = e.target.closest('.btn-print-ft-receipt');
    if (printBtn) {
        e.preventDefault();
        e.stopPropagation(); // Stop standard browser interface rendering bubbles
        
        const encodedTx = printBtn.getAttribute('data-tx');
        const row = printBtn.closest('tr');
        const srNo = row ? row.cells[0].innerText : "1";
        if (encodedTx) {
            window.executeFundTransferPassbookPrint(encodedTx, srNo);
        }
    }
}
