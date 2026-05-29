// डिनॉमिनेशन प्लगइन मॉड्यूल (Reusable Component)
window.DenominationComponent = {
    // 1. टेबल का HTML किसी भी div के अंदर लोड करने के लिए फंक्शन
    render: function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <h4 style="margin-top:0; color:#444; font-size:0.95rem; font-weight:700; border-bottom:2px solid #7d0022; padding-bottom:8px; text-transform: uppercase; letter-spacing:0.5px;">Denomination (IN / OUT)</h4>
            <table style="width: 100%; border-collapse: collapse; text-align: center; margin-top:10px;">
                <thead>
                    <tr style="background:#f4f6f8; color:#666; font-size:0.8rem; text-transform: uppercase; font-weight:700;">
                        <th style="padding:10px; border-bottom: 1px solid #eaeaea;">Value</th>
                        <th style="padding:10px; border-bottom: 1px solid #eaeaea; color: #27ae60;">Cash IN</th>
                        <th style="padding:10px; border-bottom: 1px solid #eaeaea; color: #c0392b;">Cash OUT</th>
                        <th style="padding:10px; border-bottom: 1px solid #eaeaea; color: #2c3e50;">Total</th>
                    </tr>
                </thead>
                <tbody id="denom-table-body">
                    ${[500, 200, 100, 50, 20, 10, 5].map(note => `
                        <tr style="border-bottom: 1px solid #f6f6f6;">
                            <td style="padding:8px; font-size:0.9rem; color:#333;"><strong>₹${note}</strong></td>
                            <td style="padding:8px;"><input type="number" class="denom-in" data-note="${note}" value="0" min="0" style="width:60px; padding:6px; text-align:center; border:1px solid #dcdcdc; border-radius:4px; font-weight:600;"></td>
                            <td style="padding:8px;"><input type="number" class="denom-out" data-note="${note}" value="0" min="0" style="width:60px; padding:6px; text-align:center; border:1px solid #dcdcdc; border-radius:4px; font-weight:600;"></td>
                            <td style="padding:8px; font-size:0.9rem; color:#2c3e50; font-weight:700;" id="total-display-${note}">₹0</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="margin-top:20px; padding:14px; background:#fdf2f4; border-left:4px solid #7d0022; border-radius:4px; font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#7d0022; font-size:0.9rem; text-transform:uppercase; letter-spacing:0.3px;">Net Cash Total:</span>
                <span id="denom-total-calculated" style="color:#7d0022; font-size:1.2rem;">₹0</span>
            </div>
        `;

        // इवेंट्स और स्क्रॉल व्हील को ब्लॉक करना अटैच करें
        this.attachListeners();
    },

    // 2. कैलकुलेशन लॉजिक
    calculate: function() {
        let grandTotalIn = 0;
        let grandTotalOut = 0;
        const notes = [500, 200, 100, 50, 20, 10, 5];

        notes.forEach(note => {
            const inputIn = document.querySelector(`.denom-in[data-note="${note}"]`);
            const inputOut = document.querySelector(`.denom-out[data-note="${note}"]`);
            const rowTotalDisplay = document.getElementById(`total-display-${note}`);

            if (inputIn && inputOut) {
                const countIn = parseInt(inputIn.value) || 0;
                const countOut = parseInt(inputOut.value) || 0;
                const rowNetValue = (countIn - countOut) * note;

                if (rowTotalDisplay) {
                    rowTotalDisplay.innerText = `₹${rowNetValue}`;
                    if (rowNetValue > 0) rowTotalDisplay.style.color = '#27ae60';
                    else if (rowNetValue < 0) rowTotalDisplay.style.color = '#c0392b';
                    else rowTotalDisplay.style.color = '#2c3e50';
                }
                grandTotalIn += countIn * note;
                grandTotalOut += countOut * note;
            }
        });

        const netCash = grandTotalIn - grandTotalOut;
        const netCashDisplay = document.getElementById('denom-total-calculated');
        if (netCashDisplay) netCashDisplay.innerText = `₹${netCash}`;
        return netCash;
    },

    // 3. श्रोता (Listeners) जोड़ना
    attachListeners: function() {
        document.querySelectorAll('.denom-in, .denom-out').forEach(input => {
            input.addEventListener('input', () => this.calculate());
            input.addEventListener('wheel', (e) => e.preventDefault());
        });
    },

    // 4. डेटा कलेक्ट करने के लिए (डेटाबेस में भेजने हेतु ऑब्जेक्ट रूप में)
    getValues: function() {
        const denomDetails = {};
        [500, 200, 100, 50, 20, 10, 5].forEach(note => {
            denomDetails[`denom_in_${note}`] = parseInt(document.querySelector(`.denom-in[data-note="${note}"]`).value) || 0;
            denomDetails[`denom_out_${note}`] = parseInt(document.querySelector(`.denom-out[data-note="${note}"]`).value) || 0;
        });
        return denomDetails;
    },

    // 5. रीसेट करने के लिए
    clear: function() {
        document.querySelectorAll('.denom-in, .denom-out').forEach(input => input.value = 0);
        this.calculate();
    }
};
