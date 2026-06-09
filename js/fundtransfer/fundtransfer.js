/**
 * Aadhaar-to-Aadhaar Fund Transfer System (Supabase Version)
 * Direct Integration with public.banking_customers & public.saving_bank_accounts
 */

let isAuthorizedTarget = false;
let targetAccountDetails = null;

document.addEventListener("DOMContentLoaded", function () {
    // Initial Setup
    clearFundTransferForm();
    refreshTransferLedger();

    // Event Binding: From Aadhaar Lookup
    document.getElementById('ft-from-aadhaar').addEventListener('blur', function () {
        processIdentityLookup(this.value, 'ft-from-name', this.id);
    });

    // Event Binding: To Aadhaar Lookup
    document.getElementById('ft-to-aadhaar').addEventListener('blur', function () {
        processIdentityLookup(this.value, 'ft-to-name', this.id);
    });

    // Reactive Amount Words Translation (From Utils.js)
    document.getElementById('ft-amount').addEventListener('input', function () {
        evaluateAmountConversion(this.value);
    });

    // Save Transfer Trigger
    document.getElementById('btn-ft-master-save').addEventListener('click', function () {
        executeFundTransferPersistence();
    });
});

/**
 * 1 & 4. Identity Lookup via Supabase
 */
async function processIdentityLookup(aadhaarVal, displayLabelId, inputFieldId) {
    const cleansedAadhaar = aadhaarVal.trim();
    const labelSelector = document.getElementById(displayLabelId);

    if (cleansedAadhaar.length !== 12 || isNaN(cleansedAadhaar)) {
        labelSelector.style.color = '#7d0022';
        labelSelector.innerText = "❌ Invalid Aadhaar Number format.";
        return;
    }

    labelSelector.style.color = '#666';
    labelSelector.innerText = "🔍 Checking database...";

    try {
        // Querying public.banking_customers
        const { data, error } = await supabase
            .from('banking_customers')
            .select('customer_name')
            .eq('aadhaar_number', cleansedAadhaar)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            labelSelector.style.color = '#28a745';
            labelSelector.innerText = `👤 ${data.customer_name}`;

            // Point 7 Check: If this is the "To Aadhaar", check if they are authorized staff
            if (inputFieldId === 'ft-to-aadhaar') {
                await evaluateAuthorizationNode(cleansedAadhaar);
            }
        } else {
            // Point 4: Customer not found -> Trigger your existing Registration Modal
            labelSelector.style.color = '#7d0022';
            labelSelector.innerText = "⚠️ Customer not registered. Opening Modal...";
            invokeRegistrationGateway(cleansedAadhaar, displayLabelId, inputFieldId);
        }
    } catch (err) {
        console.error("Supabase Lookup Error:", err);
        labelSelector.innerText = "Error searching customer table.";
    }
}

/**
 * Point 7: Check if target Aadhaar is an Authorized Person in saving_bank_accounts
 */
async function evaluateAuthorizationNode(aadhaarVal) {
    try {
        const { data, error } = await supabase
            .from('saving_bank_accounts')
            .select('id, account_number, account_holder_name, balance')
            .eq('aadhar_number', aadhaarVal)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            isAuthorizedTarget = true;
            targetAccountDetails = data;
            alert("⚠️ Authorized Staff profile detected. Cash payout requires Denomination check.");
            
            // Open denomination window from js/withdrawal/denomination.js
            if (typeof window.openDenominationModal === "function") {
                window.openDenominationModal();
            } else {
                console.warn("denomination.js modal function not found.");
            }
        } else {
            isAuthorizedTarget = false;
            targetAccountDetails = null;
        }
    } catch (err) {
        console.error("Authorization check fault:", err);
    }
}

/**
 * Point 4: Bridge to your existing New Customer Registration Modal
 */
function invokeRegistrationGateway(aadhaarVal, displayLabelId, inputFieldId) {
    if (typeof window.openWithdrawalRegistrationModal === "function") {
        window.openWithdrawalRegistrationModal(aadhaarVal, function (newCustomer) {
            document.getElementById(inputFieldId).value = newCustomer.aadhaar_number;
            const targetLabel = document.getElementById(displayLabelId);
            targetLabel.style.color = '#28a745';
            targetLabel.innerText = `👤 ${newCustomer.customer_name}`;
            
            if (inputFieldId === 'ft-to-aadhaar') {
                evaluateAuthorizationNode(newCustomer.aadhaar_number);
            }
        });
    } else {
        // Fallback placeholder for testing
        let mockName = prompt("Registration Fallback: Enter Customer Name:");
        if (mockName) {
            document.getElementById(displayLabelId).style.color = '#28a745';
            document.getElementById(displayLabelId).innerText = `👤 ${mockName}`;
        }
    }
}

/**
 * Point 6: Amount to Words conversion via Utils.js
 */
function evaluateAmountConversion(numericValue) {
    const wordTargetNode = document.getElementById('ft-amount-words');
    if (!numericValue || parseFloat(numericValue) <= 0) {
        wordTargetNode.innerText = "Amount in words will appear here...";
        return;
    }

    if (typeof window.convertAmountToWords === "function") {
        wordTargetNode.innerText = window.convertAmountToWords(numericValue);
    } else if (typeof window.AmountInWords === "function") {
        wordTargetNode.innerText = window.AmountInWords(numericValue);
    } else {
        wordTargetNode.innerText = `${numericValue} Rupees Only.`;
    }
}

/**
 * Save Operation: Write to Supabase Tables
 */
async function executeFundTransferPersistence() {
    const fromAadhaar = document.getElementById('ft-from-aadhaar').value.trim();
    const toAadhaar = document.getElementById('ft-to-aadhaar').value.trim();
    const amount = parseFloat(document.getElementById('ft-amount').value);
    const remarks = document.getElementById('ft-remarks').value.trim();

    if (!fromAadhaar || !toAadhaar || isNaN(amount) || amount <= 0) {
        alert("❌ Please fill all mandatory fields correctly.");
        return;
    }

    // Point 7 Validation: Match denomination total with input amount if authorized person
    let denominationData = null;
    if (isAuthorizedTarget) {
        if (typeof window.getCurrentDenominationTotal === "function") {
            const decompTotal = parseFloat(window.getCurrentDenominationTotal());
            if (decompTotal !== amount) {
                alert(`❌ Denomination mis-match! Denomination total (${decompTotal}) must match the Transfer Amount (${amount}).`);
                return;
            }
            denominationData = window.getDenominationMatrix ? window.getDenominationMatrix() : {};
        }
    }

    try {
        // Step 1: Log the Master Fund Transfer entry in saving_account_transactions
        const metaParticulars = {
            from_aadhaar: fromAadhaar,
            to_aadhaar: toAadhaar,
            user_remarks: remarks,
            denomination_retained: denominationData,
            is_staff: isAuthorizedTarget
        };

        let oldBalance = 0;
        let newBalance = 0;
        let accountId = null;
        let accountNumber = 'CUST_TO_CUST_TRANSFER';

        // Step 2: If authorized staff, perform balance mutations
        if (isAuthorizedTarget && targetAccountDetails) {
            accountId = targetAccountDetails.id;
            accountNumber = targetAccountDetails.account_number;
            oldBalance = parseFloat(targetAccountDetails.balance);
            newBalance = oldBalance + amount;

            // Update balance in saving_bank_accounts
            const { error: balError } = await supabase
                .from('saving_bank_accounts')
                .update({ balance: newBalance })
                .eq('id', accountId);

            if (balError) throw balError;
        }

        // Insert primary transaction record
        const { error: txError } = await supabase
            .from('saving_account_transactions')
            .insert([{
                ko_code: 'KO_SYSTEM',
                account_id: accountId,
                account_number: accountNumber,
                transaction_type: isAuthorizedTarget ? 'CREDIT' : 'TRANSFER',
                channel: 'fund_transfer',
                amount: amount,
                old_balance: oldBalance,
                new_balance: newBalance,
                particulars: JSON.stringify(metaParticulars)
            }]);

        if (txError) throw txError;

        alert("🎉 Fund Transfer saved successfully!");
        clearFundTransferForm();
        refreshTransferLedger();

    } catch (err) {
        console.error("Save Pipeline Error:", err);
        alert("❌ Error saving transaction: " + err.message);
    }
}

/**
 * Table Rendering: Pull Today's entries from Supabase
 */
async function refreshTransferLedger() {
    const contentMountPoint = document.getElementById('ft-today-table-body');
    contentMountPoint.innerHTML = '';

    try {
        const todayStr = new Date().toISOString().split('T')[0];

        // Fetch today's fund transfer transactions
        const { data, error } = await supabase
            .from('saving_account_transactions')
            .select('*')
            .eq('channel', 'fund_transfer')
            .gte('created_at', `${todayStr}T00:00:00Z`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            contentMountPoint.innerHTML = `
                <tr>
                    <td colspan="3" style="padding: 20px; text-align: center; color: #888; font-style: italic;">No entries recorded today yet.</td>
                </tr>`;
            return;
        }

        for (const entry of data) {
            const meta = JSON.parse(entry.particulars || '{}');
            
            // Format time
            const txTime = new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const rowStructure = document.createElement('tr');
            rowStructure.innerHTML = `
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                    <small style="color: #666; display: block;">Time: ${txTime} | Remarks: ${meta.user_remarks || 'N/A'}</small>
                    <strong>From Aadhaar:</strong> ${meta.from_aadhaar}<br>
                    <strong>To Aadhaar:</strong> ${meta.to_aadhaar} ${meta.is_staff ? '<b>(Staff)</b>' : ''}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #7d0022; vertical-align: middle;">
                    ₹${parseFloat(entry.amount).toFixed(2)}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; vertical-align: middle;">
                    <button type="button" onclick="initializeTransactionRollback('${entry.id}', 'edit')" style="background: transparent; border: none; cursor: pointer; font-size: 1.1rem; padding: 4px; margin-right: 8px;" title="Edit Entry">✏️</button>
                    <button type="button" onclick="initializeTransactionRollback('${entry.id}', 'delete')" style="background: transparent; border: none; cursor: pointer; font-size: 1.1rem; padding: 4px; margin-right: 8px;" title="Delete Entry">🗑️</button>
                    <button type="button" onclick="dispatchPrintStream('${entry.id}')" style="background: transparent; border: none; cursor: pointer; font-size: 1.1rem; padding: 4px;" title="Print Receipt">🖨️</button>
                </td>
            `;
            contentMountPoint.appendChild(rowStructure);
        }
    } catch (err) {
        console.error("Fetch Ledger Error:", err);
    }
}

/**
 * Edit and Delete Rollback Sequence
 * Reverts balances, deletes transaction log, and handles form reloading on edit
 */
async function initializeTransactionRollback(transactionId, pipelineAction) {
    const confirmationMsg = pipelineAction === 'edit'
        ? "Editing this record will completely roll back balances and load data into inputs. Proceed?"
        : "Are you sure you want to completely delete and roll back this transaction?";

    if (!confirm(confirmationMsg)) return;

    try {
        // 1. Get current transaction data
        const { data: txRow, error: fetchError } = await supabase
            .from('saving_account_transactions')
            .select('*')
            .eq('id', transactionId)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!txRow) throw new Error("Transaction record not found.");

        const meta = JSON.parse(txRow.particulars || '{}');

        // 2. If staff was involved, reverse the credit balance mutation
        if (txRow.account_id) {
            const { data: currentAccount, error: accFetchError } = await supabase
                .from('saving_bank_accounts')
                .select('balance')
                .eq('id', txRow.account_id)
                .maybeSingle();

            if (accFetchError) throw accFetchError;

            if (currentAccount) {
                const reversedBalance = parseFloat(currentAccount.balance) - parseFloat(txRow.amount);
                
                // Rollback account balance
                const { error: balRollbackError } = await supabase
                    .from('saving_bank_accounts')
                    .update({ balance: reversedBalance })
                    .eq('id', txRow.account_id);

                if (balRollbackError) throw balRollbackError;
            }
        }

        // 3. Delete transaction log record
        const { error: deleteError } = await supabase
            .from('saving_account_transactions')
            .delete()
            .eq('id', transactionId);

        if (deleteError) throw deleteError;

        alert("🔄 Transaction successfully rolled back!");

        // 4. If action was 'edit', reload values back into the form fields
        if (pipelineAction === 'edit') {
            document.getElementById('ft-from-aadhaar').value = meta.from_aadhaar || '';
            document.getElementById('ft-to-aadhaar').value = meta.to_aadhaar || '';
            document.getElementById('ft-amount').value = txRow.amount || '';
            document.getElementById('ft-remarks').value = meta.user_remarks || '';

            // Re-trigger dynamic checks and conversions
            processIdentityLookup(meta.from_aadhaar, 'ft-from-name', 'ft-from-aadhaar');
            processIdentityLookup(meta.to_aadhaar, 'ft-to-name', 'ft-to-aadhaar');
            evaluateAmountConversion(txRow.amount);
        }

        refreshTransferLedger();

    } catch (err) {
        console.error("Rollback Processing Error:", err);
        alert("❌ Failed to process rollback: " + err.message);
    }
}

/**
 * Print Routine: Connects to your withdrawal printing module
 */
function dispatchPrintStream(transactionId) {
    if (typeof window.printWithdrawalReceipt === "function") {
        window.printWithdrawalReceipt(transactionId, "fund-transfer");
    } else {
        alert(`Receipt Print triggered for Transaction ID: ${transactionId}`);
    }
}

/**
 * Global Initialization Entry Point required by app.js router
 */
window.initFundTransferPage = function() {
    console.log("🚀 app.js routing invoked initFundTransferPage()");
    clearFundTransferForm();
    refreshTransferLedger();
};

/**
 * Reset form input parameters safely checking element existence
 */
function clearFundTransferForm() {
    const fromAadhaar = document.getElementById('ft-from-aadhaar');
    const toAadhaar = document.getElementById('ft-to-aadhaar');
    const fromName = document.getElementById('ft-from-name');
    const toName = document.getElementById('ft-to-name');
    const amount = document.getElementById('ft-amount');
    const amountWords = document.getElementById('ft-amount-words');
    const remarks = document.getElementById('ft-remarks');

    // Element checks lagaye hain taaki null property error na aaye agar ID different ho
    if (fromAadhaar) fromAadhaar.value = '';
    if (toAadhaar) toAadhaar.value = '';
    if (fromName) fromName.innerText = '';
    if (toName) toName.innerText = '';
    if (amount) amount.value = '';
    if (amountWords) amountWords.innerText = 'Amount in words will appear here...';
    if (remarks) remarks.value = '';
    
    isAuthorizedTarget = false;
    targetAccountDetails = null;
    console.log("🧼 Fund Transfer Form Cleared");
}
