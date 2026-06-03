// js/withdrawal/denomination.js
// 💸 dedicated aePS WITHDRAWAL DENOMINATION COMPONENT

window.WitDenominationComponent = {
    
    // 1. विथड्रॉल के हिसाब से HTML रेंडर करना (Out Left, In Right)
    render: function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error("Withdrawal Denomination Container Missing:", containerId);
            return;
        }

        const notes = [500, 200, 100, 50, 20, 10, 5];
        
        container.innerHTML = `
            <h4 style="margin-top:0; color:#7d0022; font-size:0.95rem; font-weight:700; border-bottom:2px solid #7d0022; padding-bottom:8px; text-transform: uppercase; letter-spacing:0.5px;">💸 Cash Outflow Panel</h4>
            <table style="width: 100%; border-collapse: collapse; text-align: center; margin-top:10px;">
                <thead>
                    <tr style="background:#fff5f5; color:#c5221f; font-size:0.8rem; text-transform: uppercase; font-weight:700;">
                        <th style="padding:10px; border-bottom: 1px solid #eaeaea;">Value</th>
                        <th style="padding:10px; border-bottom: 1px solid #eaeaea; color: #c0392b;">👉 OUT (देना)</th>
                        <th style="padding:10px; border-bottom: 1px solid #eaeaea; color: #27ae60;">📥 IN (लेना)</th>
                        <th style="padding:10px; border-bottom: 1px solid #eaeaea; color: #2c3e50;">Total Out</th>
                    </tr>
                </thead>
                <tbody id="wit-denom-table-body">
                    ${notes.map((note, index) => `
                        <tr style="border-bottom: 1px solid #f6f6f6;">
                            <td style="padding:8px; font-size:0.9rem; color:#333;"><strong>₹${note}</strong></td>
                            <td style="padding:8px;"><input type="number" class="wit-denom-out" data-note="${note}" value="0" min="0" tabindex="${20 + index}" style="width:60px; padding:6px; text-align:center; border:1px solid #dcdcdc; border-radius:4px; font-weight:600;"></td>
                            <td style="padding:8px;"><input type="number" class="wit-denom-in" data-note="${note}" value="0" min="0" tabindex="${10 + index}" style="width:60px; padding:6px; text-align:center; border:1px solid #dcdcdc; border-radius:4px; font-weight:600;"></td>
                            <td style="padding:8px; font-size:0.9rem; color:#c0392b; font-weight:700;" id="wit-total-display-${note}">₹0</td>
                        </tr>
                    `).join('')}
                    
                    <tr style="border-bottom: 1px solid #f6f6f6; background: #fffdfd;">
                        <td style="padding:8px; font-size:0.9rem; color:#333;"><strong>🪙 Coins</strong></td>
                        <td style="padding:8px;"><input type="number" class="wit-denom-out" data-note="coins" value="0" min="0" tabindex="27" style="width:60px; padding:6px; text-align:center; border:1px solid #dcdcdc; border-radius:4px; font-weight:600;" placeholder="Value"></td>
                        <td style="padding:8px;"><input type="number" class="wit-denom-in" data-note="coins" value="0" min="0" tabindex="17" style="width:60px; padding:6px; text-align:center; border:1px solid #dcdcdc; border-radius:4px; font-weight:600;" placeholder="Value"></td>
                        <td style="padding:8px; font-size:0.9rem; color:#c0392b; font-weight:700;" id="wit-total-display-coins">₹0</td>
                    </tr>
                </tbody>
            </table>
            <div style="margin-top:20px; padding:14px; background:#fdf2f4; border-left:4px solid #7d0022; border-radius:4px; font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#7d0022; font-size:0.9rem; text-transform:uppercase; letter-spacing:0.3px;">Net Cash Out (Dispensing):</span>
                <span id="wit-denom-total-calculated" style="color:#7d0022; font-size:1.2rem;">₹0</span>
            </div>
        `;

        this.attachListeners();
    },

    // 2. विथड्रॉल के लिए विशेष गुणा-भाग (Focus on Out Cash)
    calculate: function() {
        let grandTotalOut = 0;
        const notes = [500, 200, 100, 50, 20, 10, 5];

        notes.forEach(note => {
            const inputOut = document.querySelector(`.wit-denom-out[data-note="${note}"]`);
            const rowTotalDisplay = document.getElementById(`wit-total-display-${note}`);

            if (inputOut) {
                const countOut = parseInt(inputOut.value) || 0;
                const rowNetValue = countOut * note;

                if (rowTotalDisplay) {
                    rowTotalDisplay.innerText = `₹${rowNetValue}`;
                }
                grandTotalOut += rowNetValue;
            }
        });

        const coinsOutInput = document.querySelector('.wit-denom-out[data-note="coins"]');
        const coinsTotalDisplay = document.getElementById('wit-total-display-coins');

        if (coinsOutInput) {
            const coinsOut = parseInt(coinsOutInput.value) || 0;
            if (coinsTotalDisplay) {
                coinsTotalDisplay.innerText = `₹${coinsOut}`;
            }
            grandTotalOut += coinsOut;
        }

        const netCashDisplay = document.getElementById('wit-denom-total-calculated');
        if (netCashDisplay) netCashDisplay.innerText = `₹${grandTotalOut.toLocaleString('en-IN')}`;
        return grandTotalOut;
    },

    attachListeners: function() {
        document.querySelectorAll('.wit-denom-in, .wit-denom-out').forEach(input => {
            input.addEventListener('input', () => this.calculate());
            input.addEventListener('wheel', (e) => e.preventDefault());
        });
    },

    getValues: function() {
        const denomDetails = {};
        [500, 200, 100, 50, 20, 10, 5].forEach(note => {
            const inEl = document.querySelector(`.wit-denom-in[data-note="${note}"]`);
            const outEl = document.querySelector(`.wit-denom-out[data-note="${note}"]`);
            denomDetails[`denom_in_${note}`] = inEl ? (parseInt(inEl.value) || 0) : 0;
            denomDetails[`denom_out_${note}`] = outEl ? (parseInt(outEl.value) || 0) : 0;
        });
        
        const cInEl = document.querySelector('.wit-denom-in[data-note="coins"]');
        const cOutEl = document.querySelector('.wit-denom-out[data-note="coins"]');
        denomDetails[`denom_in_coins`] = cInEl ? (parseInt(cInEl.value) || 0) : 0;
        denomDetails[`denom_out_coins`] = cOutEl ? (parseInt(cOutEl.value) || 0) : 0;
        
        return denomDetails;
    },

    clear: function() {
        document.querySelectorAll('.wit-denom-in, .wit-denom-out').forEach(input => input.value = 0);
        this.calculate();
    }
};
