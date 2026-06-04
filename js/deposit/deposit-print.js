// ========================================================
// 🖨️ 58MM POS THERMAL PRINT ENGINE FOR DEPOSIT RECEIPTS
// ========================================================

window.executeDepositPrintReceipt = function(encodedTx) {
    try {
        // १. बेस 64 डेटा को डिकोड करें
        const txData = JSON.parse(atob(encodedTx));
        console.log("🖨️ Initializing POS Print for Transaction:", txData);

        // २. तारीख को DD-MM-YYYY फॉर्मेट में बदलें
        const txDate = new Date(txData.transaction_date);
        const day = String(txDate.getDate()).padStart(2, '0');
        const month = String(txDate.getMonth() + 1).padStart(2, '0');
        const year = txDate.getFullYear();
        const formattedDate = `${day}-${month}-${year}`;

        // ३. यूजर का एड्रेस डेटाबेस/ग्लोबल मेमोरी से उठाएं
        const userAddress = window.currentUser?.customer_address || "BRANCH AREA, INDIA";
        
        // ⚠️ अमाउंट इन वर्ड्स (यदि पहले से नहीं है, तो कनवर्टर का उपयोग करें)
        const amountInWords = window.numberToHindiWords ? `${window.numberToHindiWords(parseInt(txData.amount))} रुपए मात्र` : "Rupees Only";

        // ४. प्रिंट के लिए एक छुपा हुआ Iframe बनाएँ ताकि मुख्य पेज की डिजाइन न बिगड़े
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

        // 📊 58mm थर्मल प्रिंटर के लिए सटीक HTML और CSS लेआउट
        const receiptHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    @page { size: 58mm auto; margin: 0; }
                    body {
                        width: 48mm; /* 58mm पेपर पर मार्जिन छोड़कर सेफ वर्किंग एरिया */
                        margin: 0 auto;
                        padding: 5px 0;
                        font-family: 'Courier New', Courier, monospace; /* थर्मल प्रिंटर के लिए बेस्ट फॉन्ट */
                        font-size: 11px;
                        line-height: 1.3;
                        color: #000;
                        text-align: center;
                    }
                    .header {
                        font-weight: bold;
                        font-size: 13px;
                        margin-bottom: 2px;
                        text-transform: uppercase;
                    }
                    .address {
                        font-size: 9px;
                        margin-bottom: 5px;
                        border-bottom: 1px dashed #000;
                        padding-bottom: 5px;
                        text-transform: uppercase;
                    }
                    .date-line {
                        text-align: left;
                        margin-bottom: 8px;
                        font-weight: bold;
                    }
                    /* 📦 मुख्य डेटा बॉक्स */
                    .info-box {
                        border: 1px solid #000;
                        padding: 6px;
                        text-align: left;
                        margin-bottom: 8px;
                        border-radius: 4px;
                    }
                    .info-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 4px;
                    }
                    .info-row:last-child {
                        margin-bottom: 0;
                    }
                    .label {
                        font-weight: bold;
                    }
                    .value {
                        text-align: right;
                        text-transform: uppercase;
                    }
                    .amount-highlight {
                        font-size: 13px;
                        font-weight: bold;
                        border-top: 1px dashed #000;
                        margin-top: 4px;
                        padding-top: 4px;
                    }
                    .words-section {
                        text-align: left;
                        font-size: 10px;
                        font-style: italic;
                        margin-bottom: 10px;
                        border-bottom: 1px dashed #000;
                        padding-bottom: 5px;
                    }
                    .footer {
                        font-size: 8px;
                        font-weight: bold;
                        margin-top: 5px;
                        line-height: 1.2;
                    }
                </style>
            </head>
            <body>
                <div class="header">Kiosk Banking System</div>
                <div class="address">${userAddress}</div>
                
                <div class="date-line">Date: ${formattedDate}</div>
                
                <div class="info-box">
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

        // प्रिंटिंग हुक (थोड़ा सा टाइमआउट ताकि CSS पूरी तरह लोड हो सके)
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
