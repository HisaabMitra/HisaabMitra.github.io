// ==========================================================================
// 💸 SYSTEM COMPONENT: DYNAMIC DENOMINATION MATRIX ENGINE (1st OUT - 2nd IN)
// ==========================================================================

window.JarvisDenominationEngine = {
    containerId: null,
    noteValues: [500, 200, 100, 50, 20, 10, 5, 2, 1],
    state: {
        out: {}, // Storage for OUT notes quantity {500: 0, 200: 0...}
        in: {}   // Storage for IN notes quantity {500: 0, 200: 0...}
    },

    // 🛠️ [INITIALIZE & RENDER THE MATRIX]
    render: function(targetContainerId, initialData = null) {
        this.containerId = targetContainerId;
        const container = document.getElementById(targetContainerId);
        if (!container) {
            console.error(`❌ Target DOM element '${targetContainerId}' missing for Denomination Engine.`);
            return;
        }

        // State reset or back-load logic (Crucial for EDIT mode stability)
        this.state.out = {};
        this.state.in = {};
        this.noteValues.forEach(v => {
            this.state.out[v] = 0;
            this.state.in[v] = 0;
        });

        // ⭐ THE EDIT RECOVERY FIX: Agar puraana data milta h toh state me load karein
        if (initialData) {
            if (initialData.out) this.state.out = { ...this.state.out, ...initialData.out };
            if (initialData.in) this.state.in = { ...this.state.in, ...initialData.in };
        }

        // Generate Dual Column Layout HTML Grid
        let html = `
        <div style="background: #fdfdfd; border: 1px solid #dee2e6; border-radius: 6px; padding: 15px; font-family: sans-serif; box-sizing: border-box; width: 100%;">
            <div style="display: flex; background: #7d0022; color: white; font-weight: bold; padding: 10px; border-radius: 4px; font-size: 0.9rem; text-align: center; margin-bottom: 10px;">
                <div style="flex: 1;">Denom VALUE</div>
                <div style="flex: 1.5; background: #940028; border-radius: 3px 0 0 3px;">1st OUT (Gaya) Qty</div>
                <div style="flex: 1.5; background: #28a745; border-radius: 0 3px 3px 0;">2nd IN (Aaya) Qty</div>
            </div>
            <div style="max-height: 280px; overflow-y: auto; padding-right: 2px;">
        `;

        this.noteValues.forEach(value => {
            const outQty = this.state.out[value] || "";
            const inQty = this.state.in[value] || "";
            const outTotal = (this.state.out[value] || 0) * value;
            const inTotal = (this.state.in[value] || 0) * value;

            html += `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; border-bottom: 1px dashed #efefef; padding-bottom: 5px; font-size: 0.88rem;">
                <!-- Denomination Rate Label -->
                <div style="flex: 1; font-weight: bold; color: #495057; text-align: left; padding-left: 5px;">
                    ₹${value}
                </div>
                
                <!-- 1st OUT COLUMN INPUT & DISPLAY -->
                <div style="flex: 1.5; display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                    <input type="number" class="denom-out-input" data-rate="${value}" value="${outQty}" placeholder="0" min="0" oninput="window.JarvisDenominationEngine.updateValue(${value}, 'out', this.value)" style="width: 100%; padding: 6px; border: 1px solid #ced4da; border-radius: 4px; text-align: right; box-sizing: border-box; font-weight: 600; color: #7d0022; outline: none;">
                    <span id="lbl-out-total-${value}" style="font-size: 0.75rem; color: #888; font-weight: 500;">₹${outTotal.toFixed(2)}</span>
                </div>

                <!-- 2nd IN COLUMN INPUT & DISPLAY -->
                <div style="flex: 1.5; display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                    <input type="number" class="denom-in-input" data-rate="${value}" value="${inQty}" placeholder="0" min="0" oninput="window.JarvisDenominationEngine.updateValue(${value}, 'in', this.value)" style="width: 100%; padding: 6px; border: 1px solid #ced4da; border-radius: 4px; text-align: right; box-sizing: border-box; font-weight: 600; color: #28a745; outline: none;">
                    <span id="lbl-in-total-${value}" style="font-size: 0.75rem; color: #888; font-weight: 500;">₹${inTotal.toFixed(2)}</span>
                </div>
            </div>
            `;
        });

        // Sticky Bottom Summary Calculator Banner Bar
        html += `
            </div>
            <div style="display: flex; justify-content: space-between; background: #e9ecef; padding: 12px; border-radius: 4px; margin-top: 10px; font-weight: bold; font-size: 0.9rem; border: 1px solid #dee2e6;">
                <div style="color: #7d0022;">Total OUT: <span id="denom-final-out-amt">₹0.00</span></div>
                <div style="color: #28a745;">Total IN: <span id="denom-final-in-amt">₹0.00</span></div>
            </div>
        </div>
        `;

        container.innerHTML = html;
        this.calculateTotals(); // Initial math build
    },

    // 🔄 [REAL-TIME VALUE MATRIC TRACKER]
    updateValue: function(rate, type, value) {
        const parsedQty = parseInt(value) || 0;
        
        // Update local object state memory
        if (type === 'out') {
            this.state.out[rate] = parsedQty;
            const subLabel = document.getElementById(`lbl-out-total-${rate}`);
            if (subLabel) subLabel.innerText = `₹${(parsedQty * rate).toFixed(2)}`;
        } else {
            this.state.in[rate] = parsedQty;
            const subLabel = document.getElementById(`lbl-in-total-${rate}`);
            if (subLabel) subLabel.innerText = `₹${(parsedQty * rate).toFixed(2)}`;
        }

        this.calculateTotals();
    },

    // 🧮 [CALCULATE MATH AGGREGATES SUMMARY]
    calculateTotals: function() {
        let totalOut = 0;
        let totalIn = 0;

        this.noteValues.forEach(v => {
            totalOut += (this.state.out[v] || 0) * v;
            totalIn += (this.state.in[v] || 0) * v;
        });

        const outDisplay = document.getElementById('denom-final-out-amt');
        const inDisplay = document.getElementById('denom-final-in-amt');

        if (outDisplay) outDisplay.innerText = `₹${totalOut.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        if (inDisplay) inDisplay.innerText = `₹${totalIn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    },

    // 📤 [EXPORT LIVE STATE DATA PACKS TO CONTROLLER]
    getValues: function() {
        let finalOutSum = 0;
        let finalInSum = 0;

        this.noteValues.forEach(v => {
            finalOutSum += (this.state.out[v] || 0) * v;
            finalInSum += (this.state.in[v] || 0) * v;
        });

        return {
            outBreakdown: { ...this.state.out },
            inBreakdown: { ...this.state.in },
            totalOutAmount: finalOutSum,
            totalInAmount: finalInSum,
            netAdjustment: finalInSum - finalOutSum // Live differentiation check metric
        };
    },

    // 🧹 [WIPE CONTROLS RESET]
    clear: function() {
        this.state.out = {};
        this.state.in = {};
        this.noteValues.forEach(v => {
            this.state.out[v] = 0;
            this.state.in[v] = 0;
        });
        
        // Re-inject pristine fields mapping
        if (this.containerId) {
            this.render(this.containerId);
        }
    }
};
