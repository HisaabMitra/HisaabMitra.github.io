// ========================================================
// 🧮 GENERIC DENOMINATION PLUGIN: IN-OUT (CASH INFLOW)
// ========================================================

window.DenominationInOutComponent = {
    render: function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const notes = [500, 200, 100, 50, 20, 10, 5];
        
        container.innerHTML = `
            <h4 style="margin-top:0; color:#27ae60; font-size:0.95rem; font-weight:700; border-bottom:2px solid #27ae60; padding-bottom:8px; text-transform: uppercase; letter-spacing:0.5px;">📤 डिनॉमिनेशन विवरण (निकासी)</h4>
            <table style="width: 100%; border-collapse: collapse; text-align: center; margin-top:10px;">
                <thead>
                    <tr style="background:#f4faf6; color:#27ae60; font-size:0.8rem; text-transform: uppercase; font-weight:700;">
                        <th style="padding:10px; border-bottom: 1px solid #eaeaea;">नोट का मूल्य</th>
                        <th style="padding:10px; border-bottom: 1px solid #eaeaea; color: #27ae60;">संख्या (IN)</th>
                        <th style="padding:10px; border-bottom: 1px solid #eaeaea; color: #444;">कुल राशि</th>
                    </tr>
                </thead>
                <tbody>
                    ${notes.map((note, index) => `
                        <tr style="border-bottom: 1px solid #f6f6f6;">
                            <td style="padding:8px; font-size:0.9rem; color:#333;"><strong>₹${note}</strong></td>
                            <td style="padding:8px;"><input type="number" class="gen-in-val" data-note="${note}" value="0" min="0" tabindex="${40 + index}" style="width:70px; padding:6px; text-align:center; border:1px solid #dcdcdc; border-radius:4px; font-weight:600;"></td>
                            <td style="padding:8px; font-size:0.9rem; color:#27ae60; font-weight:700;" id="gen-in-display-${note}">₹0</td>
                        </tr>
                    `).join('')}
                    <tr style="border-bottom: 1px solid #f6f6f6; background: #fffdfd;">
                        <td style="padding:8px; font-size:0.9rem; color:#333;"><strong>🪙 सिक्के</strong></td>
                        <td style="padding:8px;"><input type="number" class="gen-in-val" data-note="coins" value="0" min="0" tabindex="47" style="width:70px; padding:6px; text-align:center; border:1px solid #dcdcdc; border-radius:4px; font-weight:600;" placeholder="राशि"></td>
                        <td style="padding:8px; font-size:0.9rem; color:#27ae60; font-weight:700;" id="gen-in-display-coins">₹0</td>
                    </tr>
                </tbody>
            </table>
            <div style="margin-top:20px; padding:14px; background:#f4faf6; border-left:4px solid #27ae60; border-radius:4px; font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#27ae60; font-size:0.9rem; text-transform:uppercase; letter-spacing:0.3px;">कुल निकासी मूल्य:</span>
                <span id="gen-in-total-calculated" style="color:#27ae60; font-size:1.2rem;">₹0</span>
            </div>
        `;

        this.attachListeners();
    },

    calculate: function() {
        let grandTotal = 0;
        const notes = [500, 200, 100, 50, 20, 10, 5];

        notes.forEach(note => {
            const inputIn = document.querySelector(`.gen-in-val[data-note="${note}"]`);
            const display = document.getElementById(`gen-in-display-${note}`);
            if (inputIn) {
                const count = parseInt(inputIn.value) || 0;
                const rowValue = count * note;
                if (display) display.innerText = `₹${rowValue}`;
                grandTotal += rowValue;
            }
        });

        const coinsInput = document.querySelector('.gen-in-val[data-note="coins"]');
        const coinsDisplay = document.getElementById('gen-in-display-coins');
        if (coinsInput) {
            const coins = parseInt(coinsInput.value) || 0;
            if (coinsDisplay) coinsDisplay.innerText = `₹${coins}`;
            grandTotal += coins;
        }

        const totalCalculated = document.getElementById('gen-in-total-calculated');
        if (totalCalculated) totalCalculated.innerText = `₹${grandTotal}`;
        return grandTotal;
    },

    attachListeners: function() {
        document.querySelectorAll('.gen-in-val').forEach(input => {
            input.addEventListener('input', () => this.calculate());
            input.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
        });
    },

    getValues: function() {
        const notesData = {};
        [500, 200, 100, 50, 20, 10, 5].forEach(note => {
            const el = document.querySelector(`.gen-in-val[data-note="${note}"]`);
            notesData[`cash_${note}`] = el ? (parseInt(el.value) || 0) : 0;
        });
        const coinsEl = document.querySelector('.gen-in-val[data-note="coins"]');
        notesData['cash_coins'] = coinsEl ? (parseInt(coinsEl.value) || 0) : 0;
        return notesData;
    },

    clear: function() {
        document.querySelectorAll('.gen-in-val').forEach(input => input.value = 0);
        this.calculate();
    }
};
