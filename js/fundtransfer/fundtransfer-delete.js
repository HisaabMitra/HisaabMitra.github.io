// ========================================================
// 🗑️ JARVIS FUND TRANSFER SECURE TRANSACTION DELETION ENGINE
// ========================================================

window.executeFundTransferDelete = async function(transactionId) {
    if (!transactionId) {
        console.error("❌ Cannot execute deletion: Missing target Transaction ID Token.");
        return;
    }

    try {
        const client = window.supabaseClient || window.supabase;
        if (!client) {
            console.error("❌ Database client context not initialized in memory.");
            return;
        }

        if (window.showSystemConfirm) {
            window.showSystemConfirm(
                "क्या आप वाकई इस फंड ट्रांसफर रिकॉर्ड को हमेशा के लिए डिलीट करना चाहते हैं?\n\n(यह एक्शन डेटाबेस से रिकॉर्ड को डिलीट कर प्राप्तकर्ता बैंक खाते का बैलेंस स्वतः रोलबैक कर देगा!)", 
                "Confirm Fund Transfer Deletion & Rollback", 
                async function() {
                    try {
                        console.log(`🗑️ Initiating backup evaluation check for TX ID: ${transactionId}`);

                        // Step 1: Pre-fetch transaction metadata attributes before purge line fires
                        const { data: targetTx } = await client
                            .from('fund_transfers')
                            .select('*')
                            .eq('id', transactionId)
                            .maybeSingle();

                        if (!targetTx) {
                            window.showSystemAlert("रिकॉर्ड डेटाबेस में नहीं मिला।", "Error", "⚠️");
                            return;
                        }

                        // Step 2: Execute actual rows removal pipeline operations
                        const { error: delError } = await client
                            .from('fund_transfers')
                            .delete()
                            .eq('id', transactionId);

                        if (delError) throw delError;

                        // ⭐ THE BALANCING ROLLBACK LOGIC: Revert saving bank balance if linked
                        if (targetTx.to_aadhaar) {
                            const { data: linkedBankAcc } = await client
                                .from('saving_bank_accounts')
                                .select('*')
                                .eq('aadhar_number', targetTx.to_aadhaar)
                                .maybeSingle();

                            if (linkedBankAcc) {
                                const currentOldBalance = parseFloat(linkedBankAcc.balance) || 0;
                                const revertedNewBalance = currentOldBalance - parseFloat(targetTx.amount); // Debit minus rollback sequence

                                // Re-update balance metrics parameters bounds
                                await client
                                    .from('saving_bank_accounts')
                                    .update({ balance: revertedNewBalance })
                                    .eq('id', linkedBankAcc.id);

                                // Write reversal entry inside saving ledger history tracking table logs
                                await client
                                    .from('saving_account_transactions')
                                    .insert([{
                                        ko_code: targetTx.ko_code,
                                        account_id: linkedBankAcc.id,
                                        account_number: linkedBankAcc.account_number,
                                        transaction_type: 'debit',
                                        channel: 'fund_transfer',
                                        amount: parseFloat(targetTx.amount),
                                        old_balance: currentOldBalance,
                                        new_balance: revertedNewBalance,
                                        particulars: `REVERSAL ROLLBACK: Fund Transfer Deletion Core Purge. Tx ID reference trace: ...${transactionId.slice(-6)}`
                                    }]);
                                
                                console.log(`🔄 Balance Rollback Successful! Debited ₹${targetTx.amount} back from Account ID Node.`);
                            }
                        }

                        if (window.showSystemAlert) {
                            window.showSystemAlert("फंड ट्रांसफर रिकॉर्ड डिलीट कर बैंक बैलेंस सफलतापूर्वक रोलबैक कर दिया गया है।", "Deleted & Reverted", "✅");
                        }

                        if (typeof window.masterFundTransferClear === 'function') window.masterFundTransferClear();
                        if (typeof window.loadTodayFundTransfers === 'function') window.loadTodayFundTransfers();

                    } catch (dbErr) {
                        console.error("❌ Supabase Delete Row Sync Engine Crash:", dbErr);
                        if (window.showSystemAlert) window.showSystemAlert("डेटाबेस डिलीट विफलता।", "Deletion Error", "❌");
                    }
                }
            );
        }
    } catch (fatalErr) {
        console.error("❌ Fatal Error in Fund Transfer Deletion Hub Pipeline:", fatalErr);
    }
};
