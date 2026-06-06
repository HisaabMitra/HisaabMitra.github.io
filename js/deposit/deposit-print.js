// ========================================================
// 🖨️ ULTRA-COMPACT 58MM POS THERMAL PRINT ENGINE (DEPOSIT - SILENT MODE)
// ========================================================

window.executeDepositPrintReceipt = async function(encodedTx) {
    try {
        // १. बेस 64 डेटा को डिकोड करें
        const txData = JSON.parse(atob(encodedTx));
        console.log("🖨️ Initializing Silent POS Print via Python Agent:", txData);

        // २. तारीख को DD-MM-YYYY फॉर्मेट में बदलें
        const txDate = new Date(txData.transaction_date);
        const day = String(txDate.getDate()).padStart(2, '0');
        const month = String(txDate.getMonth() + 1).padStart(2, '0');
        const year = txDate.getFullYear();
        const formattedDate = `${day}-${month}-${year}`;

        // 🎯 ३. लॉगिन यूज़र का लाइव एड्रेस डेटाबेस (currentUser) से उठाएं
        const userAddress = window.currentUser?.address || "KIOSK CENTER, INDIA";
        
        // अमाउंट इन वर्ड्स ( utils.js हिन्दी कनवर्टर सिंक )
        const amountInWords = window.numberToHindiWords ? `${window.numberToHindiWords(parseInt(txData.amount))} रुपए मात्र` : "Rupees Only";

        // 💾 🖨️ STEP 4: LocalStorage se counter ka select kiya hua deposit printer uthayein
        const selectedPrinter = localStorage.getItem('jarvis_default_deposit_printer');

        if (!selectedPrinter) {
            if (window.showSystemAlert) {
                window.showSystemAlert("कृपया पहले सेटिंग्स में जाकर इस काउंटर के लिए डिपॉजिट प्रिंटर सेलेक्ट करें!", "Printer Not Set", "⚠️");
            } else {
                alert("⚠️ कृपया पहले सेटिंग्स में जाकर इस काउंटर के लिए डिपॉजिट प्रिंटर सेलेक्ट करें!");
            }
            return;
        }

        // 📊 58mm थर्मल प्रिंटर के लिए ज़ीरो-गैप और बॉर्डर-लेस HTML लेआउट (Python Parsing ke liye ready)
        const receiptHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    @page { size: 58mm auto; margin: 0; }
                    html, body { margin: 0; padding: 0; width: 58mm; background: #fff; }
                    body { padding: 4px 2mm; box-sizing: border-box; font-family: 'Courier New', Courier, monospace; font-size: 11px; line-height: 1.1; color: #000; }
                    .header { font-weight: bold; font-size: 14px; margin: 0; text-align: center; text-transform: uppercase; }
                    .address { font-size: 10px; margin: 2px 0; padding-bottom: 3px; border-bottom: 1px dashed #000; text-align: center; text-transform: uppercase; }
                    .date-line { text-align: center; margin: 3px 0; font-weight: bold; }
                    .info-container { margin: 4px 0; }
                    .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
                    .label { font-weight: bold; }
                    .value { text-align: right; text-transform: uppercase; }
                    .amount-highlight { font-size: 13px; font-weight: bold; border-top: 1px dashed #000; margin-top: 3px; padding-top: 3px; }
                    .words-section { text-align: left; font-size: 10px; font-style: italic; margin: 4px 0; border-bottom: 1px dashed #000; padding-bottom: 3px; }
                    .footer { font-size: 9px; font-weight: bold; margin-top: 3px; line-height: 1.1; text-align: center; }
                </style>
            </head>
            <body>
                <div class="header">Kiosk Banking System</div>
                <div class="address">${userAddress}</div>
                
                <div class="date-line">Date: ${formattedDate}</div>
                
                <div class="info-container">
                    <div class="info-row">
                        <span class="label">A/c No:</span>
                        <span class="value">${txData.account_number}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Name:</span>
                        <span class="value">${txData.customer_name}</span>
                    </div>
                    <div class="info-row amount-highlight">
                        <span class="label">Amount:</span>
                        <span class="value">₹${parseFloat(txData.amount).toFixed(2)}</span>
                    </div>
                </div>

                <div class="words-section">
                    <span class="label">Words:</span> ${amountInWords}
                </div>

                <div class="footer">
                    --------------------------<br>
                    This is a computer generated receipt hence no need of signature.
                    <br>--------------------------
                </div>
            </body>
            </html>
        `;

        // 🚀 STEP 5: Hidden iframe ki jagah seedha Python Local Agent ko data hit karein
        const response = await fetch("http://127.0.0.1:5000/print", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                printer_name: selectedPrinter,
                content: receiptHTML // HTML format data python printer handle ko transfer kiya
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log(`🚀 Receipt printed silently on: ${selectedPrinter}`);
            if (window.showSystemAlert) {
                window.showSystemAlert("रसीद सफलतापूर्वक प्रिंटर पर भेज दी गई है।", "Print Successful", "✅");
            }
        } else {
            throw new Error(result.message || "Unknown error from agent");
        }

    } catch (err) {
        console.error("POS Receipt Printing Fatal Failure:", err);
        if (window.showSystemAlert) {
            window.showSystemAlert("प्रिंट सर्विस ऑफलाइन है या कोई त्रुटि है। कृपया HisaabMitra Agent चेक करें।", "Print Error", "❌");
        } else {
            alert("❌ रसीद प्रिंट करने में त्रुटि: " + err.message);
        }
    }
};

// 🌐 Global Event Delegation for Live Print Trigger Button
document.addEventListener('click', (e) => {
    const printBtn = e.target.closest('.btn-print-receipt');
    if (printBtn) {
        const encodedTx = printBtn.getAttribute('data-tx');
        if (encodedTx && typeof window.executeDepositPrintReceipt === 'function') {
            window.executeDepositPrintReceipt(encodedTx);
        }
    }
});
