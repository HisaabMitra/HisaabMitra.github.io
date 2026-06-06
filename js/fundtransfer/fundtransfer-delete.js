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

        // 🛡️ Guardrails Confirmation Prompt System Call
        if (window.showSystemConfirm) {
            window.showSystemConfirm(
                "क्या आप वाकई इस फंड ट्रांसफर रिकॉर्ड को हमेशा के लिए डिलीट करना चाहते हैं?\n\n(यह एक्शन डेटाबेस से रिकॉर्ड को पूरी तरह साफ़ कर देगा!)", 
                "Confirm Fund Transfer Deletion", 
                async function() {
                    try {
                        console.log(`🗑️ Initiating backend deletion sequence for TX ID: ${transactionId}`);

                        // Supabase Target Row Deletion Pipeline Operation
                        const { error } = await client
                            .from('fund_transfers')
                            .delete()
                            .eq('id', transactionId);

                        if (error) throw error;

                        // Success Alerts Triggers
                        if (window.showSystemAlert) {
                            window.showSystemAlert("फंड ट्रांसफर रिकॉर्ड सफलतापूर्वक डेटाबेस से डिलीट कर दिया गया है।", "Deleted Successfully", "✅");
                        } else {
                            alert("✅ रिकॉर्ड सफलतापूर्वक डिलीट कर दिया गया है।");
                        }

                        // Form state master clean state logic triggers
                        if (typeof window.masterFundTransferClear === 'function') {
                            window.masterFundTransferClear();
                        }

                        // Dynamic live table ledger auto reload dispatcher context
                        if (typeof window.loadTodayFundTransfers === 'function') {
                            window.loadTodayFundTransfers();
                        }

                    } catch (dbErr) {
                        console.error("❌ Supabase Delete Row Sync Engine Crash:", dbErr);
                        if (window.showSystemAlert) {
                            window.showSystemAlert("डेटाबेस डिलीट विफलता। कृपया इंटरनेट नेटवर्क कनेक्शन जांचें।", "Deletion Error", "❌");
                        }
                    }
                }
            );
        } else {
            // Standard fallback fallback validation if custom alert UI breaks
            if (confirm("क्या आप वाकई इस रिकॉर्ड को डिलीट करना चाहते हैं?")) {
                const { error } = await client.from('fund_transfers').delete().eq('id', transactionId);
                if (!error) {
                    if (typeof window.loadTodayFundTransfers === 'function') window.loadTodayFundTransfers();
                }
            }
        }

    } catch (fatalErr) {
        console.error("❌ Fatal Error in Fund Transfer Deletion Hub Pipeline:", fatalErr);
    }
};
