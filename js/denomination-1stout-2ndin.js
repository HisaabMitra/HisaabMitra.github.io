// ==========================================================================
// 💸 SYSTEM COMPONENT: DYNAMIC DENOMINATION MATRIX ENGINE (1st OUT - 2nd IN)
// ==========================================================================

window.JarvisDenominationEngine = {
    containerId: null,
    noteValues: [500, 200, 100, 50, 20, 10, 5, 2, 1],
    state: {
        out: {}, // Storage memory loop for OUT notes quantity {500: 0, 200: 0...}
        in: {}   // Storage memory loop for IN notes quantity {500: 0, 200: 0...}
    },

    // 🛠️ [INITIALIZE & RENDER THE MATRIX - PREMIUM UI DESIGN]
    render: function(targetContainerId, initialData = null) {
        this.containerId = targetContainerId;
        const container = document.getElementById(targetContainerId);
        if (!container) {
            console.error(`❌ Target DOM element '${targetContainerId}' missing for Denomination Engine.`);
            return;
        }

        // State reset baseline matrix initialization
        this.state.out = {};
        this.state.in = {};
        this.noteValues.forEach(v => {
            this.state.out[v] = 0;
            this.state.in[v] = 0;
        });

        // ⭐ THE EDIT HYDRATION RECOVERY ROAD: Auto back-load data if available inside record rows
        if (initialData) {
            if (initialData.out) this.state.out = { ...this.state.out, ...initialData.out };
            if (initialData.in) this.state.in = { ...this.state.in, ...initialData.in };
        }

        // Generate Ultra-Clean Layout HTML Grid with Protected Spacings
        let html = `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-family: system-ui, -apple-system, sans-serif; box-sizing: border-box; width: 100%; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); margin-top: 10px;">
            <div style="display: flex; background: #7d0022; color: #ffffff; font-weight: 700; padding: 12px; border-radius: 6px; font-size: 0.85rem; text-align: center; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; box-sizing: border-box;">
                <div style="flex: 1; text-align: left; padding-left: 8px;">Denom</div>
                <div style="flex: 1.5; background: rgba(255,255,255,0.12); border-radius: 4px; padding: 3px 0; margin-right: 4px;">1st OUT (Gaya)</div>
                <div style="flex: 1.5; background: rgba(255,255,255,0.12); border-radius: 4px; padding: 3px 0; margin-left: 4px;">2nd IN (Aaya)</div>
            </div>
            
            <div style="max-height: 285px; overflow-y: auto; padding-right: 6px; box-sizing: border-box;">
        `;

        this.noteValues.forEach(value => {
            const outQty = this.state.out[value] || "";
            const inQty = this.state.in[value] || "";
            const outTotal = (this.state.out[value] || 0) * value;
            const inTotal = (this.state.in[value] || 0) * value;

            html += `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; box-sizing: border-box;">
                <div style="flex: 1; font-weight: 700; color: #334155; text-align: left; padding-left: 6px; font-size: 0.95rem; user-select: none;">
                    ₹${value}
                </div>
                
                <div style="flex: 1.5; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; box-sizing: border-box;">
                    <input type="number" class="denom-out-input" data-rate="${value}" value="${outQty}" placeholder="0" min="0" oninput="window.JarvisDenominationEngine.updateValue(${value}, 'out', this.value)" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 5px; text-align: right; box-sizing: border-box; font-weight: 700; color: #7d0022; font-size: 0.95rem; background: #fffcfc; outline: none; transition: border-color 0.2s;">
                    <span id="lbl-out-total-${value}" style="font-size: 0.75rem; color: #64748b; font-weight: 600; padding-right: 2px;">₹${outTotal.toFixed(2)}</span>
                </div>

                <div style="flex: 1.5; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; box-sizing: border-box;">
                    <input type="number" class="denom-in-input" data-rate="${value}" value="${inQty}" placeholder="0" min="0" oninput="window.JarvisDenominationEngine.updateValue(${value}, 'in', this.value)" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 5px; text-align: right; box-sizing: border-box; font-weight: 700; color: #28a745; font-size: 0.95rem; background: #fafdfa; outline: none; transition: border-color 0.2s;">
                    <span id="lbl-in-total-${value}" style="font-size: 0.75rem; color: #64748b; font-weight: 600; padding-right: 2px;">₹${inTotal.toFixed(2)}</span>
                </div>
            </div>
            `;
        });

        // Sticky Bottom Balanced Summary Banner Bar
        html += `
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 14px 16px; border-radius: 6px; margin-top: 12px; font-weight: 700; font-size: 0.92rem; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.02); box-sizing: border-box;">
                <div style="color: #7d0022; font-weight: 700;">Total OUT: <span id="denom-final-out-amt" style="font-size: 1.05rem; font-weight: 800; margin-left: 3px;">₹0.00</span></div>
                <div style="color: #28a745; font-weight: 700;">Total IN: <span id="denom-final-in-amt" style="font-size: 1.05rem; font-weight: 800; margin-left: 3px;">₹0.00</span></div>
            </div>
        </div>
        `;

        container.innerHTML = html;
        this.calculateTotals(); // Initial runtime computation execution
    },

    // 🔄 [REAL-TIME LIVE VALUE UPDATE MATRIX TRACKER]
    updateValue: function(rate, type, value) {
        const parsedQty = Math.max(0, parseInt(value) || 0);
        
        // Synchronizing values inside internal memory arrays objects
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

    // 🧮 [COMPUTE AGGREGATES SUMMARY CALCULATORS]
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

    // 📤 [EXPORT CONTEXT ATTRIBUTES TO INTERCEPTOR]
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
            netAdjustment: finalInSum - finalOutSum // Differentiation checking parameter
        };
    },

    // 🧹 [WIPE SYSTEM INPUTS MATRIX CONTEXT]
    clear: function() {
        this.state.out = {};
        this.state.in = {};
        this.noteValues.forEach(v => {
            this.state.out[v] = 0;
            this.state.in[v] = 0;
        });
        
        if (this.containerId) {
            this.render(this.containerId);
        }
    }
};
