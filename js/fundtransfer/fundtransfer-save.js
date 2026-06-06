// ========================================================
// 💾 JARVIS FUND TRANSFER SECURE STORAGE & DATABASE INSERTER ENGINE
// ========================================================

window.executeFundTransferSave = async function(saveBtn, currentUser, flags) {
    try {
        // UI Elements Extraction Context from DOM
        const fromAadhaarInput = document.getElementById('ft-from-aadhaar');
        const toAadhaarInput = document.getElementById('ft-to-aadhaar');
        const ftAmountInput = document.getElementById('ft-amount');
        const ftRemarksInput = document.getElementById('ft-remarks');
        
        const lblFromName = document.getElementById('lbl-ft-from-name');
        const lblToName = document.getElementById('lbl-ft-to-name');

        if (!fromAadhaarInput || !toAadhaarInput || !ftAmountInput) {
            console.error("❌ Required Fund Transfer Form Input Node Elements missing!");
            return;
        }

        const fromAadhaar = fromAadhaarInput.value.trim();
        const toAadhaar = toAadhaarInput.value.trim();
        const amount = parseFloat(ftAmountInput.value) || 0;
        const remarks = ftRemarksInput.value.trim();

        // 🛡️ Guardrails Validation Checks
        if (!fromAadhaar || !toAadhaar || amount <= 0) {
            if (window.showSystemAlert) {
                window.showSystemAlert("कृपया प्रेषक/प्राप्तकर्ता आधार और वैध राशि दर्ज करें।", "Validation Error", "❌");
            }
            return;
        }

        // Flags Check (Verification statuses pass down from fundtransfer.js stack)
        if (!flags.isFromValid || !flags.isToValid) {
            if (window.showSystemAlert) {
                window.showSystemAlert("लेनदेन निष्पादित करने से पहले दोनों पक्षों का पंजीकृत होना अनिवार्य है!", "Verification Missing", "⚠️");
            }
            return;
        }

        // Active State Modification (Duplicate submission locking mechanism)
        saveBtn.disabled = true;
        saveBtn.innerText = "Processing...";

        // Transaction Data Payload Array compilation mapping
        const transferPayload = {
            ko_code: currentUser.ko_code,
            from_aadhaar: fromAadhaar,
            from_customer_name: lblFromName ? lblFromName.innerText : "UNKNOWN REMITTER",
            to_aadhaar: toAadhaar,
            to_customer_name: lblToName ? lblToName.innerText : "UNKNOWN BENEFICIARY",
            amount: amount,
            remarks: remarks,
            transaction_date: new Date().toISOString()
        };

        const isEditMode = saveBtn.dataset.mode === "edit";
        let clientError = null;

        // Core Supabase Table Transaction Handlers
        if (isEditMode) {
            // UPDATE ROW LOGIC
            const targetTxId = saveBtn.dataset.editingFtId;
            const { error } = await window.supabaseClient
                .from('fund_transfers')
                .update(transferPayload)
                .eq('id', targetTxId);
            clientError = error;
        } else {
            // INSERT NEW ROW LOGIC
            const { error } = await window.supabaseClient
                .from('fund_transfers')
                .insert([transferPayload]);
            clientError = error;
        }

        if (clientError) throw clientError;

        // Success Confirmation Triggers
        if (window.showSystemAlert) {
            window.showSystemAlert(
                isEditMode ? "फंड ट्रांसफर एंट्री सफलतापूर्वक अपडेट कर दी गई है।" : "फंड ट्रांसफर सफलतापूर्वक पूर्ण हो चुका है।",
                "Transaction Success",
                "✅"
            );
        }

        // Form clean stack reset trigger
        if (typeof window.masterFundTransferClear === 'function') {
            window.masterFundTransferClear();
        }

        // Dynamic table auto refresh trigger post transmission
        if (typeof window.loadTodayFundTransfers === 'function') {
            window.loadTodayFundTransfers();
        }

    } catch (fatalErr) {
        console.error("❌ Fatal Error in Fund Transfer Storage Pipeline Engine:", fatalErr);
        if (window.showSystemAlert) {
            window.showSystemAlert("डेटाबेेस सिंक विफलता। कृपया इंटरनेट नेटवर्क कनेक्शन जांचें।", "Database Error", "❌");
        }
    } finally {
        // Re-enable button actions safely
        saveBtn.disabled = false;
        saveBtn.innerText = saveBtn.dataset.mode === "edit" ? "🔄 Update Transfer" : "🚀 Execute Transfer";
    }
};
