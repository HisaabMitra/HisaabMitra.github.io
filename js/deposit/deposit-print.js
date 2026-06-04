// ========================================================
// 🖨️ ULTRA-COMPACT 58MM POS THERMAL PRINT ENGINE (DEPOSIT)
// ========================================================

window.executeDepositPrintReceipt = function(encodedTx) {
    try {
        // १. बेस 64 डेटा को डिकोड करें
        const txData = JSON.parse(atob(encodedTx));
        console.log("🖨️ Initializing Ultra-Compact POS Print:", txData);

        // २. तारीख को DD-MM-YYYY फॉर्मेट में बदलें
        const txDate = new Date(txData.transaction_date);
        const day = String(txDate.getDate()).padStart(2, '0');
        const month = String(txDate.getMonth() + 1).padStart(2, '0');
        const year = txDate.getFullYear();
        const formattedDate = `${day}-${month}-${year}`;

        // 🎯 ३. लॉगिन यूज़र का लाइव एड्रेस डेटाबेस (currentUser) से उठाएं
        const userAddress = window.currentUser?.customer_address || "KIOSK CENTER, INDIA";
        
        // अमाउंट इन वर्ड्स ( utils.js हिन्दी कनवर्टर सिंक )
        const amountInWords = window.numberToHindiWords ? `${window.numberToHindiWords(parseInt(txData.amount))} रुपए मात्र` : "Rupees Only";

        // ४. प्रिंट के लिए हिडन Iframe हुक मैकेनिज्म
        let printFrame = document.getElementById('pos-print-iframe');
        if (!printFrame) {
            printFrame = document.createElement('iframe');
            printFrame.id = 'pos-print-iframe';
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

        // 📊 58mm थर्मल प्रिंटर के लिए ज़ीरो-गैप और बॉर्डर-लेस HTML लेआउट
        const receiptHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    @page { size: 58mm auto; margin: 0; }
                    body {
                        width: 48mm; /* 58mm पेपर पर सेफ प्रिंटिंग विड्थ */
                        margin: 0 auto;
                        padding: 2px 0;
                        font-family: 'Courier New', Courier, monospace;
                        font-size: 11px;
                        line-height: 1.1; /* ⚡ लाइनों के बीच का गैप न्यूनतम किया */
                        color: #000;
                        text-align: center;
                    }
                    .header {
                        font-weight: bold;
                        font-size: 12px;
                        margin: 0;
                        padding: 0;
                        text-transform: uppercase;
                    }
                    .address {
                        font-size: 9px;
                        margin: 1px 0 3px 0;
                        padding-bottom: 3px;
                        border-bottom: 1px dashed #000;
                        text-transform: uppercase;
                    }
                    /* 📅 डेट को बिल्कुल सेंटर में अलाइन किया */
                    .date-line {
                        text-align: center;
                        margin: 2px 0 5px 0;
                        font-weight: bold;
                    }
                    /* 🚫 मुख्य डेटा कंटेनर - बॉर्डर पूरी तरह गायब */
                    .info-container {
                        text-align: center;
                        margin: 4px 0;
                        padding: 0;
                    }
                    .info-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 2px; /* न्यूनतम वर्टिकल स्पेस */
                    }
                    .label {
                        font-weight: bold;
                    }
                    .value {
                        text-align: right;
                        text-transform: uppercase;
                    }
                    /* अमाउंट हाइलाइट बिना किसी बॉक्स बॉर्डर के */
                    .amount-highlight {
                        font-size: 12px;
                        font-weight: bold;
                        border-top: 1px dashed #000;
                        margin-top: 3px;
                        padding-top: 3px;
                    }
                    .words-section {
                        text-align: left;
                        font-size: 9px;
                        font-style: italic;
                        margin: 4px 0;
                        border-bottom: 1px dashed #000;
                        padding-bottom: 3px;
                    }
                    .footer {
                        font-size: 8px;
                        font-weight: bold;
                        margin-top: 3px;
                        line-height: 1.1;
                    }
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

        // ५. Iframe में कंटेंट इंजेक्ट करें और प्रिंट ट्रिगर करें
        doc.open();
        doc.write(receiptHTML);
        doc.close();

        setTimeout(() => {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
        }, 150);

    } catch (err) {
        console.error("POS Receipt Printing Fatal Failure:", err);
        if (window.showSystemAlert) {
            window.showSystemAlert("रसीद प्रिंट करने में त्रुटि: " + err.message, "Print Error", "❌");
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
