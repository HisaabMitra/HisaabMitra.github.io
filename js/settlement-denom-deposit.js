// ========================================================
// 📥 SETTLEMENT DEPOSIT DENOMINATION ENGINE (COUNTER CASH OUT)
// ========================================================

window.SettleDepDenomComponent = {
    render: function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const notes = [500, 200, 100, 50, 20, 10, 5];
        
        container.innerHTML = `
            <h4 style="margin-top:0; color:#7d0022; font-size:0.95rem; font-weight:700; border-bottom:2px solid #7d0022; padding-bottom:8px; text-transform: uppercase; letter-spacing:0.5px;">📥 Cash Outflow Matrix (Paise Bank Bheje)</h4>
            <table style="width: 100%; border-collapse: collapse; text-align: center; margin-top:10px;">
                <thead>
                    <tr style="background:#fff5f5; color:#7d0022; font-size:0.8rem; text-transform: uppercase; font-weight:700;">
                        <th style="padding:10px; border-bottom: 1px solid #eaeaea;">Value</th>
                        <th style="padding:10px; border-bottom: 1px solid #eaeaea; color: #c0392b;">👉 OUT (Counter se nikla)</th>
                        <th style="padding:10px; border-bottom: 1px solid #eaeaea; color: #444;">Total Value</th>
                    </tr>
                </thead>
                <tbody>
                    ${notes.map((note, index) => `
                        <tr style="border-bottom: 1px solid #f6f6f6;">
                            <td style="padding:8px; font-size:0.9rem; color:#333;"><strong>₹${note}</strong></td>
                            <td style="padding:8px;"><input type="number" class="set-dep-out" data-note="${note}" value="0" min="0" tabindex="${30 + index}" style="width:70px; padding:6px; text-align:center; border:1px solid #dcdcdc; border-radius:4px; font-weight:600;"></td>
                            <td style="padding:8px; font-size:0.9rem; color:#c0392b; font-weight:700;" id="set-dep-display-${note}">₹0</td>
                        </tr>
                    `).join('')}
                    <tr style="border-bottom: 1px solid #f6f6f6; background: #fffdfd;">
                        <td style="padding:8px; font-size:0.9rem; color:#333;"><strong>🪙 Coins</strong></td>
                        <td style="padding:8px;"><input type="number" class="set-dep-out" data-note="coins" value="0" min="0" tabindex="37" style="width:70px; padding:6px; text-align:center; border:1px solid #dcdcdc; border-radius:4px; font-weight:600;" placeholder="Value"></td>
                        <td style="padding:8px; font-size:0.9rem; color:#c0392b; font-weight:700;" id="set-dep-display-coins">₹0</td>
                    </tr>
                </tbody>
            </table>
            <div style="margin-top:20px; padding:14px; background:#fdf2f4; border-left:4px solid #7d0022; border-radius:4px; font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#7d0022; font-size:0.9rem; text-transform:uppercase; letter-spacing:0.3px;">Total Deposit Tally:</span>
                <span id="set-dep-total-calculated" style="color:#7d0022; font-size:1.2rem;">₹0</span>
            </div>
        `;

        this.attachListeners();
    },

    calculate: function() {
        let grandTotal = 0;
        const notes = [500, 200, 100, 50, 20, 10, 5];

        notes.forEach(note => {
            const inputOut = document.querySelector(`.set-dep-out[data-note="${note}"]`);
            const display = document.getElementById(`set-dep-display-${note}`);
            if (inputOut) {
                const count = parseInt(inputOut.value) || 0;
                const rowValue = count * note;
                if (display) display.innerText = `₹${rowValue}`;
                grandTotal += rowValue;
            }
        });

        const coinsInput = document.querySelector('.set-dep-out[data-note="coins"]');
        const coinsDisplay = document.getElementById('set-dep-display-coins');
        if (coinsInput) {
            const coins = parseInt(coinsInput.value) || 0;
            if (coinsDisplay) coinsDisplay.innerText = `₹${coins}`;
            grandTotal += coins;
        }

        const totalCalculated = document.getElementById('set-dep-total-calculated');
        if (totalCalculated) totalCalculated.innerText = `₹${grandTotal}`;
        return grandTotal;
    },

    attachListeners: function() {
        document.querySelectorAll('.set-dep-out').forEach(input => {
            input.addEventListener('input', () => this.calculate());
            input.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
        });
    },

    getValues: function() {
        const notesData = {};
        [500, 200, 100, 50, 20, 10, 5].forEach(note => {
            const el = document.querySelector(`.set-dep-out[data-note="${note}"]`);
            notesData[`cash_${note}`] = el ? (parseInt(el.value) || 0) : 0;
        });
        const coinsEl = document.querySelector('.set-dep-out[data-note="coins"]');
        notesData['cash_coins'] = coinsEl ? (parseInt(coinsEl.value) || 0) : 0;
        return notesData;
    },

    clear: function() {
        document.querySelectorAll('.set-dep-out').forEach(input => input.value = 0);
        this.calculate();
    }
};
