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
        const denomWrapper = document.getElementById('ft-denomination-wrapper-node');
        
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

        if (!flags.isFromValid || !flags.isToValid) {
            if (window.showSystemAlert) {
                window.showSystemAlert("लेनदेन निष्पादित करने से पहले दोनों पक्षों का पंजीकृत होना अनिवार्य है!", "Verification Missing", "⚠️");
            }
            return;
        }

        const isEditMode = saveBtn.dataset.mode === "edit";

        // ⭐ THE POWER INTERCEPTOR: Prompt user if linked terminal detected inside registry
        if (window.matchedSavingAccountObj && !window.denomInjectedActive && !isEditMode) {
            if (window.showSystemConfirm) {
                window.showSystemConfirm(
                    `🛡️ Authorized Account Holder Detected! Kya aap is transaction ke liye physical notes Denomination adjustments check karna chahte hain?`,
                    "Denomination Routing Verification",
                    function() {
                        // IF YES: Mount layout structure frames
                        if (denomWrapper) denomWrapper.style.display = 'flex';
                        window.denomInjectedActive = true;
                        if (window.JarvisDenominationEngine) {
                            window.JarvisDenominationEngine.render('ft-injected-matrix-anchor');
                        }
                    },
                    function() {
                        // IF NO: Straight procedural pass down bypass execution line
                        proceedWithDatabasePersistence(saveBtn, currentUser, fromAadhaar, toAadhaar, amount, remarks, isEditMode, null, lblFromName, lblToName);
                    }
                );
                return; // Stop sync cascade loop till prompt resolves
            }
        }

        // Compilation data packs if matrix loop injection is active
        let finalDenomJSON = null;
        if (window.denomInjectedActive && window.JarvisDenominationEngine) {
            const dataPack = window.JarvisDenominationEngine.getValues();
            
            if (dataPack.totalOutAmount !== amount && dataPack.totalOutAmount > 0) {
                window.showSystemAlert(`Denomination Total OUT (₹${dataPack.totalOutAmount}) details must match Transfer Amount (₹${amount})!`, "Denomination Mismatch", "⚠️");
                return;
            }
            
            finalDenomJSON = {
                out: dataPack.outBreakdown,
                in: dataPack.inBreakdown,
                totalOut: dataPack.totalOutAmount,
                totalIn: dataPack.totalInAmount
            };
        }

        // Fire sequential database loop process
        proceedWithDatabasePersistence(saveBtn, currentUser, fromAadhaar, toAadhaar, amount, remarks, isEditMode, finalDenomJSON, lblFromName, lblToName);

    } catch (fatalErr) {
        console.error("❌ Fatal Error in Fund Transfer Storage Pipeline Engine:", fatalErr);
    }
};

// Internal standalone persistence function
async function proceedWithDatabasePersistence(saveBtn, currentUser, fromAadhaar, toAadhaar, amount, remarks, isEditMode, denomPayload, lblFromName, lblToName) {
    try {
        saveBtn.disabled = true;
        saveBtn.innerText = "Processing...";

        const transferPayload = {
            ko_code: currentUser.ko_code,
            from_aadhaar: fromAadhaar,
            from_customer_name: lblFromName ? lblFromName.innerText : "UNKNOWN REMITTER",
            to_aadhaar: toAadhaar,
            to_customer_name: lblToName ? lblToName.innerText : "UNKNOWN BENEFICIARY",
            amount: amount,
            remarks: remarks,
            denomination_json: denomPayload, // Inject nested matrix payload object
            transaction_date: new Date().toISOString()
        };

        let clientError = null;

        if (isEditMode) {
            const targetTxId = saveBtn.dataset.editingFtId;
            const { error } = await window.supabaseClient
                .from('fund_transfers')
                .update(transferPayload)
                .eq('id', targetTxId);
            clientError = error;
        } else {
            const { error } = await window.supabaseClient
                .from('fund_transfers')
                .insert([transferPayload]);
            clientError = error;

            // ⭐ THE LEDGER INTERFACE BALANCER TRIGGER: Sync balance only if account match sequence holds
            if (!clientError && window.matchedSavingAccountObj) {
                const oldBalanceVal = parseFloat(window.matchedSavingAccountObj.balance) || 0;
                const newBalanceVal = oldBalanceVal + amount; // Credit flow

                // Step A: Live balance increment inside bank terminal accounts core table
                await window.supabaseClient
                    .from('saving_bank_accounts')
                    .update({ balance: newBalanceVal })
                    .eq('id', window.matchedSavingAccountObj.id);

                // Step B: Write explicit tracking narration inside saving_account_transactions table log bounds
                await window.supabaseClient
                    .from('saving_account_transactions')
                    .insert([{
                        ko_code: currentUser.ko_code,
                        account_id: window.matchedSavingAccountObj.id,
                        account_number: window.matchedSavingAccountObj.account_number,
                        transaction_type: 'credit',
                        channel: 'fund_transfer',
                        amount: amount,
                        old_balance: oldBalanceVal,
                        new_balance: newBalanceVal,
                        particulars: `Fund Transfer Received from Remitter Aadhaar: ${fromAadhaar}. Remarks: ${remarks}`
                    }]);
            }
        }

        if (clientError) throw clientError;

        if (window.showSystemAlert) {
            window.showSystemAlert(
                isEditMode ? "फंड ट्रांसफर एंट्री सफलतापूर्वक अपडेट कर दी गई है।" : "फंड ट्रांसफर सफलतापूर्वक पूर्ण हो चुका है।",
                "Transaction Success",
                "✅"
            );
        }

        if (typeof window.masterFundTransferClear === 'function') window.masterFundTransferClear();
        if (typeof window.loadTodayFundTransfers === 'function') window.loadTodayFundTransfers();

    } catch (err) {
        console.error("Database Save Execution Error:", err);
        if (window.showSystemAlert) window.showSystemAlert("डेटाबेस लेजर सिंक विफलता।", "Database Error", "❌");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = saveBtn.dataset.mode === "edit" ? "🔄 Update Transfer" : "🚀 Execute Transfer";
    }
}
