// ========================================================
// 🧮 MASTER PLUGIN: TWO-COLUMN UI (1st IN / 2nd OUT)
// ========================================================

window.MasterDenom1stIn2ndOut = {
    render: function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const notes = [500, 200, 100, 50, 20, 10, 5];
        
        container.innerHTML = `
            <h4 style="margin-top:0; color:#7d0022; font-size:0.95rem; font-weight:700; border-bottom:2px solid #7d0022; padding-bottom:8px; text-transform: uppercase; letter-spacing:0.5px;">📊 काउंटर नोट विवरण (IN / OUT)</h4>
            <table style="width: 100%; border-collapse: collapse; text-align: center; margin-top:10px;">
                <thead>
                    <tr style="background:#f8f9fa; color:#495057; font-size:0.8rem; text-transform: uppercase; font-weight:700;">
                        <th style="padding:10px; border-bottom: 2px solid #dee2e6; width: 20%;">मूल्य</th>
                        <th style="padding:10px; border-bottom: 2px solid #dee2e6; color: #27ae60; width: 30%;">📥 IN (आया)</th>
                        <th style="padding:10px; border-bottom: 2px solid #dee2e6; color: #c0392b; width: 30%;">📤 OUT (गया)</th>
                        <th style="padding:10px; border-bottom: 2px solid #dee2e6; color: #343a40; width: 20%;">कुल</th>
                    </tr>
                </thead>
                <tbody>
                    ${notes.map((note, index) => `
                        <tr style="border-bottom: 1px solid #eef0f2; vertical-align: middle;">
                            <td style="padding:8px; font-size:0.9rem; color:#212529;"><strong>₹${note}</strong></td>
                            <td style="padding:8px;"><input type="number" class="cm-note-in" data-note="${note}" value="0" min="0" tabindex="${10 + index}" style="width:65px; padding:6px; text-align:center; border:1px solid #ced4da; border-radius:4px; font-weight:600;"></td>
                            <td style="padding:8px;"><input type="number" class="cm-note-out" data-note="${note}" value="0" min="0" tabindex="${20 + index}" style="width:65px; padding:6px; text-align:center; border:1px solid #ced4da; border-radius:4px; font-weight:600;"></td>
                            <td style="padding:8px; font-size:0.9rem; color:#495057; font-weight:700;" id="cm-row-total-${note}">₹0</td>
                        </tr>
                    `).join('')}
                    
                    <tr style="border-bottom: 1px solid #eef0f2; background: #fffdfd; vertical-align: middle;">
                        <td style="padding:8px; font-size:0.9rem; color:#212529;"><strong>🪙 सिक्के</strong></td>
                        <td style="padding:8px;"><input type="number" class="cm-note-in" data-note="coins" value="0" min="0" tabindex="17" style="width:65px; padding:6px; text-align:center; border:1px solid #ced4da; border-radius:4px; font-weight:600;" placeholder="Value"></td>
                        <td style="padding:8px;"><input type="number" class="cm-note-out" data-note="coins" value="0" min="0" tabindex="27" style="width:65px; padding:6px; text-align:center; border:1px solid #ced4da; border-radius:4px; font-weight:600;" placeholder="Value"></td>
                        <td style="padding:8px; font-size:0.9rem; color:#495057; font-weight:700;" id="cm-row-total-coins">₹0</td>
                    </tr>
                </tbody>
            </table>

            <div style="margin-top:20px; padding:12px; background:#f8f9fa; border-radius:4px; font-size:0.85rem; display:flex; flex-direction:column; gap:6px; border:1px solid #e9ecef;">
                <div style="display:flex; justify-content:space-between; color:#27ae60;"><span>Total IN (+):</span><span id="cm-summary-in" style="font-weight:bold;">₹0</span></div>
                <div style="display:flex; justify-content:space-between; color:#c0392b;"><span>Total OUT (-):</span><span id="cm-summary-out" style="font-weight:bold;">₹0</span></div>
                <div style="display:flex; justify-content:space-between; color:#7d0022; font-size:1.05rem; font-weight:bold; border-top:1px dashed #dee2e6; padding-top:6px; margin-top:2px;">
                    <span>NET ADJUSTMENT:</span><span id="cm-summary-net">₹0</span>
                </div>
            </div>
        `;

        this.attachListeners();
    },

    calculate: function() {
        let totalIn = 0;
        let totalOut = 0;
        const notes = [500, 200, 100, 50, 20, 10, 5];

        // Notes Math Logic calculation
        notes.forEach(note => {
            const inEl = document.querySelector(`.cm-note-in[data-note="${note}"]`);
            const outEl = document.querySelector(`.cm-note-out[data-note="${note}"]`);
            const displayEl = document.getElementById(`cm-row-total-${note}`);

            const countIn = inEl ? (parseInt(inEl.value) || 0) : 0;
            const countOut = outEl ? (parseInt(outEl.value) || 0) : 0;
            
            // Net row value formula mapping
            const netRowValue = (countIn - countOut) * note;
            if (displayEl) {
                displayEl.innerText = `₹${netRowValue}`;
                if (netRowValue > 0) displayEl.style.color = '#27ae60';
                else if (netRowValue < 0) displayEl.style.color = '#c0392b';
                else displayEl.style.color = '#495057';
            }

            totalIn += countIn * note;
            totalOut += countOut * note;
        });

        // Coins Math Logic
        const coinInEl = document.querySelector('.cm-note-in[data-note="coins"]');
        const coinOutEl = document.querySelector('.cm-note-out[data-note="coins"]');
        const coinDisplayEl = document.getElementById('cm-row-total-coins');

        const coinsIn = coinInEl ? (parseInt(coinInEl.value) || 0) : 0;
        const coinsOut = coinOutEl ? (parseInt(coinOutEl.value) || 0) : 0;
        const netCoinsValue = coinsIn - coinsOut;

        if (coinDisplayEl) {
            coinDisplayEl.innerText = `₹${netCoinsValue}`;
            if (netCoinsValue > 0) coinDisplayEl.style.color = '#27ae60';
            else if (netCoinsValue < 0) coinDisplayEl.style.color = '#c0392b';
            else coinDisplayEl.style.color = '#495057';
        }

        totalIn += coinsIn;
        totalOut += coinsOut;

        // Sync summary labels screen elements
        const lblIn = document.getElementById('cm-summary-in');
        const lblOut = document.getElementById('cm-summary-out');
        const lblNet = document.getElementById('cm-summary-net');

        if (lblIn) lblIn.innerText = `₹${totalIn}`;
        if (lblOut) lblOut.innerText = `₹${totalOut}`;
        
        const netValue = totalIn - totalOut;
        if (lblNet) {
            lblNet.innerText = `₹${netValue}`;
            if (netValue > 0) lblNet.style.color = '#27ae60';
            else if (netValue < 0) lblNet.style.color = '#c0392b';
            else lblNet.style.color = '#7d0022';
        }

        return { totalIn, totalOut, netValue };
    },

    attachListeners: function() {
        document.querySelectorAll('.cm-note-in, .cm-note-out').forEach(input => {
            input.addEventListener('input', () => this.calculate());
            input.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
        });
    },

    getValues: function() {
        const dataPayload = {};
        const notes = [500, 200, 100, 50, 20, 10, 5];
        
        notes.forEach(note => {
            const inEl = document.querySelector(`.cm-note-in[data-note="${note}"]`);
            const outEl = document.querySelector(`.cm-note-out[data-note="${note}"]`);
            dataPayload[`in_${note}`] = inEl ? (parseInt(inEl.value) || 0) : 0;
            dataPayload[`out_${note}`] = outEl ? (parseInt(outEl.value) || 0) : 0;
        });

        const cIn = document.querySelector('.cm-note-in[data-note="coins"]');
        const cOut = document.querySelector('.cm-note-out[data-note="coins"]');
        dataPayload['in_coins'] = cIn ? (parseInt(cIn.value) || 0) : 0;
        dataPayload['out_coins'] = cOut ? (parseInt(cOut.value) || 0) : 0;

        return dataPayload;
    },

    clear: function() {
        document.querySelectorAll('.cm-note-in, .cm-note-out').forEach(input => input.value = 0);
        this.calculate();
    }
};
