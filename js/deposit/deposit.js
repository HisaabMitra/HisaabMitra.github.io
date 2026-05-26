// js/deposit/deposit.js

function initDepositModule() {
    const form = document.getElementById('deposit-transaction-form');
    if (!form) return;

    const denomInputs = document.querySelectorAll('.denom-input');
    const grossAmountInput = document.getElementById('tx-amount');
    const finalTotalDisplay = document.getElementById('denom-final-total');

    // ==========================================
    // 1. LIVE DENOMINATION CALCULATOR INTERACTION
    // ==========================================
    denomInputs.forEach(input => {
        // Run the calculation every time a user types or shifts quantities
        input.addEventListener('input', () => {
            calculateDenominations();
        });
    });

    function calculateDenominations() {
        let runningGrandTotal = 0;
        const rows = document.querySelectorAll('.denom-row');

        rows.forEach(row => {
            const noteValue = parseInt(row.getAttribute('data-note'), 10);
            const quantityInput = row.querySelector('.denom-input');
            const qty = parseInt(quantityInput.value, 10) || 0;

            // Compute sub-total value for this specific row
            const rowTotal = noteValue * qty;
            runningGrandTotal += rowTotal;

            // Render row text updates
            row.querySelector('.denom-total').textContent = rowTotal.toFixed(2);
        });

        // Push calculated data into final visible elements
        finalTotalDisplay.textContent = `₹ ${runningGrandTotal.toFixed(2)}`;
        grossAmountInput.value = runningGrandTotal > 0 ? runningGrandTotal : "";
    }

    // ==========================================
    // 2. SUBMIT TRANSACTION & SYNC LEDGER
    // ==========================================
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        const grossAmount = parseFloat(grossAmountInput.value) || 0;

        if (grossAmount <= 0) {
            alert("❌ Operational Error: Total counted cash must be greater than zero.");
            return;
        }

        // Gather UI inputs
        const bankName = document.getElementById('tx-bank').value.trim();
        const beneficiary = document.getElementById('tx-account').value.trim();
        const commission = parseFloat(document.getElementById('tx-commission').value) || 0;
        const referenceNo = document.getElementById('tx-reference').value.trim();

        // Package individual denomination counts into a structured string or JSON mapping for audits
        const denominationSummary = gatherDenominationJSON();

        // Lock button interaction during server roundtrip
        submitBtn.textContent = "Syncing Ledger Account...";
        submitBtn.disabled = true;

        try {
            // Retrieve current user identification from session context
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            const operatorId = session ? session.user.id : null;

            // Insert into your database deposits ledger log
            const { error } = await window.supabaseClient
                .from('deposits')
                .insert([
                    {
                        account_no: "ACC1001", // Default internal counter account reference or link to your custom layout system
                        amount: grossAmount,
                        reference_no: referenceNo,
                        remarks: `Bank: ${bankName} | Beneficiary: ${beneficiary} | Commission: ${commission} | Notes: ${denominationSummary}`,
                        created_by: operatorId
                    }
                ]);

            if (error) throw error;

            alert("✅ Deposit entry posted successfully! Cash drawer ledger updated.");
            form.reset();
            calculateDenominations(); // Re-zero elements safely

        } catch (err) {
            console.error("Database Post Error:", err.message);
            alert(`⚠️ Core Error: Failed to write to ledger. ${err.message}`);
        } finally {
            submitBtn.textContent = "Execute & Sync Ledger";
            submitBtn.disabled = false;
        }
    });

    function gatherDenominationJSON() {
        const rows = document.querySelectorAll('.denom-row');
        let parts = [];
        rows.forEach(row => {
            const note = row.getAttribute('data-note');
            const qty = row.querySelector('.denom-input').value || 0;
            if (qty > 0) parts.push(`[${note}x${qty}]`);
        });
        return parts.join(' ');
    }
}
