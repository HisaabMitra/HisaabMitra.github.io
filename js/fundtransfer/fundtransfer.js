/**
 * Aadhaar-to-Aadhaar Fund Transfer System Core Logic
 * Handles dynamic search, validation, automated registration modal triggers, 
 * amount-to-words parsing, authorized staff checks, and local storage/state rendering.
 */

// Global state tracking for transaction constraints
let isAuthorizedTarget = false;
let currentActiveTransfers = [];

document.addEventListener("DOMContentLoaded", function () {
    // 1. Initial configuration and cache loading
    initializeFundTransferSystem();

    // 2. Event Binding for Aadhaar input handling (From Side)
    document.getElementById('ft-from-aadhaar').addEventListener('blur', function () {
        processIdentityLookup(this.value, 'ft-from-name', this.id);
    });

    // 3. Event Binding for Aadhaar input handling (To Side)
    document.getElementById('ft-to-aadhaar').addEventListener('blur', function () {
        processIdentityLookup(this.value, 'ft-to-name', this.id);
    });

    // 4. Reactive Amount Monitoring for Text Translation
    document.getElementById('ft-amount').addEventListener('input', function () {
        evaluateAmountConversion(this.value);
    });

    // 5. Global Action trigger for primary storage lifecycle
    document.getElementById('btn-ft-master-save').addEventListener('click', function () {
        executeFundTransferPersistence();
    });
});

/**
 * Initializes setup and pulls historical daily context rows
 */
function initializeFundTransferSystem() {
    clearFundTransferForm();
    refreshTransferLedger();
}

/**
 * Handles Identity lookups across public.banking_customers schema
 */
function processIdentityLookup(aadhaarVal, displayLabelId, inputFieldId) {
    const cleansedAadhaar = aadhaarVal.trim();
    const labelSelector = document.getElementById(displayLabelId);

    if (cleansedAadhaar.length !== 12 || isNaN(cleansedAadhaar)) {
        labelSelector.style.color = '#7d0022';
        labelSelector.innerText = "❌ Invalid Aadhaar Number format.";
        return;
    }

    labelSelector.style.color = '#666';
    labelSelector.innerText = "🔍 Checking registry...";

    // Dynamic backend execution against public.banking_customers
    fetch(`api/get_customer_by_identity.php?identity_token=${encodeURIComponent(cleansedAadhaar)}`)
        .then(res => res.json())
        .then(response => {
            if (response.success && response.identity_found) {
                labelSelector.style.color = '#28a745';
                labelSelector.innerText = `👤 ${response.customer_name}`;

                // Point 7 Evaluation: Check if Target entity exists within public.saving_bank_accounts
                if (inputFieldId === 'ft-to-aadhaar') {
                    evaluateAuthorizationNode(cleansedAadhaar);
                }
            } else {
                // Point 4 Override: Open standard registration wrapper if entity missing
                labelSelector.style.color = '#7d0022';
                labelSelector.innerText = "⚠️ Identity context absent. Opening registration...";
                invokeRegistrationGateway(cleansedAadhaar, displayLabelId, inputFieldId);
            }
        })
        .catch(err => {
            console.error("Lookup interface exception:", err);
            labelSelector.innerText = "Error executing schema lookups.";
        });
}

/**
 * Evaluates target accounts within the authorized public.saving_bank_accounts grid
 */
function evaluateAuthorizationNode(aadhaarVal) {
    fetch(`api/check_account_clearance.php?identity_token=${encodeURIComponent(aadhaarVal)}`)
        .then(res => res.json())
        .then(response => {
            if (response.success && response.is_authorized_staff) {
                isAuthorizedTarget = true;
                alert("⚠️ Authorized Staff destination flagged. Cash layout tracking enforced via local inventory modules.");
                
                // Invoke local global inventory interface from js/withdrawal/denomination.js
                if (typeof window.openDenominationModal === "function") {
                    window.openDenominationModal();
                } else {
                    console.warn("External currency calculation system (denomination.js) unavailable.");
                }
            } else {
                isAuthorizedTarget = false;
            }
        })
        .catch(err => console.error("Authorization check fault:", err));
}

/**
 * Interface routing to activate system registration dialog standard modules
 */
function invokeRegistrationGateway(aadhaarVal, displayLabelId, inputFieldId) {
    if (typeof window.openWithdrawalRegistrationModal === "function") {
        window.openWithdrawalRegistrationModal(aadhaarVal, function (newIdentityRecord) {
            document.getElementById(inputFieldId).value = newIdentityRecord.aadhaar_number;
            const targetLabel = document.getElementById(displayLabelId);
            targetLabel.style.color = '#28a745';
            targetLabel.innerText = `👤 ${newIdentityRecord.customer_name}`;
            
            if (inputFieldId === 'ft-to-aadhaar') {
                evaluateAuthorizationNode(newIdentityRecord.aadhaar_number);
            }
        });
    } else {
        // Fallback interface handler if environment bindings are running asynchronously
        let placeholderManualEntry = prompt("Customer registration fallback sequence. Enter display name:");
        if (placeholderManualEntry) {
            const mockIdentity = {
                aadhaar_number: aadhaarVal,
                customer_name: placeholderManualEntry
            };
            document.getElementById(inputFieldId).value = mockIdentity.aadhaar_number;
            const targetLabel = document.getElementById(displayLabelId);
            targetLabel.style.color = '#28a745';
            targetLabel.innerText = `👤 ${mockIdentity.customer_name}`;
            
            if (inputFieldId === 'ft-to-aadhaar') {
                evaluateAuthorizationNode(mockIdentity.aadhaar_number);
            }
        }
    }
}

/**
 * Feeds localized balance mutations out to utility structures
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
 * Orchestrates payload packing and dispatches mutations out to database structures
 */
function executeFundTransferPersistence() {
    const remitterIdentity = document.getElementById('ft-from-aadhaar').value.trim();
    const beneficiaryIdentity = document.getElementById('ft-to-aadhaar').value.trim();
    const operationValue = document.getElementById('ft-amount').value.trim();
    const administrativeRemarks = document.getElementById('ft-remarks').value.trim();

    if (!remitterIdentity || !beneficiaryIdentity || !operationValue) {
        alert("❌ Missing structural metrics. Complete all mandatory properties.");
        return;
    }

    // Point 7 Validation Verification: Reconcile input values against physical inventory mutations
    let bundledDenominationMetadata = null;
    if (isAuthorizedTarget) {
        if (typeof window.getCurrentDenominationTotal === "function") {
            const calculatedSum = window.getCurrentDenominationTotal();
            if (parseFloat(calculatedSum) !== parseFloat(operationValue)) {
                alert(`❌ Denomination discrepancy detected. Physical tracking total (${calculatedSum}) must scale identically with stated currency target amount (${operationValue}).`);
                return;
            }
            bundledDenominationMetadata = window.getDenominationMatrix ? window.getDenominationMatrix() : {};
        } else {
            alert("⚠️ Inventory mapping script is structurally decoupled from current active view context.");
        }
    }

    const payloadContext = {
        source_identity: remitterIdentity,
        destination_identity: beneficiaryIdentity,
        allocated_amount: parseFloat(operationValue),
        notes: administrativeRemarks,
        is_staff_involved: isAuthorizedTarget,
        inventory_adjustments: bundledDenominationMetadata
    };

    fetch('api/persist_fund_transfer.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadContext)
    })
    .then(res => res.json())
    .then(response => {
        if (response.success) {
            alert("🎉 Asset execution completed. Ledger record appended successfully.");
            clearFundTransferForm();
            refreshTransferLedger();
        } else {
            alert(`Execution failure: ${response.message}`);
        }
    })
    .catch(err => console.error("Pipeline failure:", err));
}

/**
 * Gathers active operational events from active daily table segments
 */
function refreshTransferLedger() {
    fetch('api/fetch_daily_transfers.php')
        .then(res => res.json())
        .then(data => {
            const contentMountPoint = document.getElementById('ft-today-table-body');
            contentMountPoint.innerHTML = ''; // Dynamic clean state reset

            if (!data || data.length === 0) {
                contentMountPoint.innerHTML = `
                    <tr>
                        <td colspan="3" style="padding: 20px; text-align: center; color: #888; font-style: italic;">No entries recorded today yet.</td>
                    </tr>`;
                return;
            }

            currentActiveTransfers = data;

            data.forEach(entry => {
                const rowStructure = document.createElement('tr');
                rowStructure.innerHTML = `
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">
                        <small style="color: #666; display: block;">ID: #${entry.transaction_id} | ${entry.timestamp}</small>
                        <strong>From:</strong> ${entry.source_identity_masked} (${entry.source_name})<br>
                        <strong>To:</strong> ${entry.destination_identity_masked} (${entry.destination_name})
                    </td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #7d0022; vertical-align: middle;">
                        ₹${parseFloat(entry.allocated_amount).toFixed(2)}
                    </td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; vertical-align: middle;">
                        <button type="button" onclick="initializeTransactionRollback('${entry.transaction_id}', 'edit')" style="background: transparent; border: none; cursor: pointer; font-size: 1.1rem; padding: 4px;" title="Edit Entry">✏️</button>
                        <button type="button" onclick="initializeTransactionRollback('${entry.transaction_id}', 'delete')" style="background: transparent; border: none; cursor: pointer; font-size: 1.1rem; padding: 4px;" title="Delete Entry">🗑️</button>
                        <button type="button" onclick="dispatchPrintStream('${entry.transaction_id}')" style="background: transparent; border: none; cursor: pointer; font-size: 1.1rem; padding: 4px;" title="Print Receipt">🖨️</button>
                    </td>
                `;
                contentMountPoint.appendChild(rowStructure);
            });
        })
        .catch(err => console.error("Error refreshing ledger tables:", err));
}

/**
 * Handles cascading database resets for records and returns notes back to physical cash vaults
 */
function initializeTransactionRollback(transactionId, pipelineAction) {
    const targetingMessage = pipelineAction === 'edit' 
        ? "Editing this record will completely roll back transaction updates, balance changes, and note inventory metrics. Proceed?" 
        : "Are you certain you want to purge this record and revert adjustments to system inventory?";
        
    if (!confirm(targetingMessage)) return;

    fetch('api/rollback_fund_transfer.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: transactionId, execution_mode: pipelineAction })
    })
    .then(res => res.json())
    .then(response => {
        if (response.success) {
            alert(`Operation execution succeeded: Record states successfully re-adjusted.`);
            
            if (pipelineAction === 'edit' && response.cached_payload) {
                // Pre-populate input configurations for quick corrective editing
                document.getElementById('ft-from-aadhaar').value = response.cached_payload.source_identity || '';
                document.getElementById('ft-to-aadhaar').value = response.cached_payload.destination_identity || '';
                document.getElementById('ft-amount').value = response.cached_payload.allocated_amount || '';
                document.getElementById('ft-remarks').value = response.cached_payload.notes || '';
                
                // Repopulate dynamic calculations
                processIdentityLookup(response.cached_payload.source_identity, 'ft-from-name', 'ft-from-aadhaar');
                processIdentityLookup(response.cached_payload.destination_identity, 'ft-to-name', 'ft-to-aadhaar');
                evaluateAmountConversion(response.cached_payload.allocated_amount);
            }
            refreshTransferLedger();
        } else {
            alert(`Rollback fault instance: ${response.message}`);
        }
    })
    .catch(err => console.error("Rollback execution framework exception:", err));
}

/**
 * Integrates directly with withdrawal printing routines on consecutive lines
 */
function dispatchPrintStream(transactionId) {
    if (typeof window.printWithdrawalReceipt === "function") {
        window.printWithdrawalReceipt(transactionId, "fund-transfer-stream");
    } else {
        alert(`Print processing stream triggered for Target Event Code: #${transactionId}`);
    }
}

/**
 * Resets local states and interface properties back to baseline states
 */
function clearFundTransferForm() {
    document.getElementById('ft-from-aadhaar').value = '';
    document.getElementById('ft-to-aadhaar').value = '';
    document.getElementById('ft-from-name').innerText = '';
    document.getElementById('ft-to-name').innerText = '';
    document.getElementById('ft-amount').value = '';
    document.getElementById('ft-amount-words').innerText = 'Amount in words will appear here...';
    document.getElementById('ft-remarks').value = '';
    isAuthorizedTarget = false;
}
