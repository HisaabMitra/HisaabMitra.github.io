// ========================================================
// 💼 CORE ENGINE: COUNTER CASH MANAGER (PURE DENOMINATION RUNTIME)
// ========================================================

window.initCashManagerPage = async function(currentUser) {
    console.log("⚡ Jarvis Cash Manager Engine Initializing...");

    const btnMasterSave = document.getElementById('btn-cash-manager-master-save');

    // 🧮 [DIRECT INJECTION ROUTINE]: Khulate hi seedha plugin load karein
    function bootUnifiedCashGrid() {
        if (!window.DenominationInOutComponent) {
            console.error("❌ Generic DenominationInOutComponent asset reference missing from global scope!");
            return;
        }

        window.DenominationInOutComponent.clear();
        window.DenominationInOutComponent.render('cash-manager-unified-container');
        
        // Technical headers clean up right away
        setTimeout(() => {
            const h4Title = document.querySelector('#cash-manager-unified-container h4');
            if (h4Title) h4Title.innerText = "📊 काउंटर नोट विवरण (IN / OUT)";
        }, 50);
    }

    // 🚀 [MASTER SAVE ACTION ROUTINE]: Syncs both IN and OUT fields simultaneously
    if (btnMasterSave) {
        btnMasterSave.onclick = async function() {
            if (!window.DenominationInOutComponent) return;

            try {
                btnMasterSave.disabled = true;
                btnMasterSave.innerText = "Processing Cash Sync...";

                // Fetch current absolute live cash stocks from data vault node
                const { data: liveUser, error: fetchErr } = await window.supabaseClient
                    .from('user_roles')
                    .select('*')
                    .eq('ko_code', currentUser.ko_code)
                    .maybeSingle();

                if (fetchErr) throw fetchErr;

                // Grab live values mapped from inside active component fields array
                const inputNotes = window.DenominationInOutComponent.getValues();
                let updatedNotesPayload = {};
                let hasSufficientStock = true;

                const noteDenoms = [500, 200, 100, 50, 20, 10, 5];
                let processedAnyNote = false;

                // 🌟 ATOMIC ARITHMETIC LOOP: Calculate Net cash columns mutation mapping
                for (let i = 0; i < noteDenoms.length; i++) {
                    const d = noteDenoms[i];
                    const dbColumnKey = `cash_${d}`;
                    
                    const currentStock = parseInt(liveUser[dbColumnKey]) || 0;
                    const inQty = inputNotes[`denom_in_${d}`] || 0;
                    const outQty = inputNotes[`denom_out_${d}`] || 0;

                    if (inQty > 0 || outQty > 0) processedAnyNote = true;

                    // Core Formula: Naya Stock = Purana Stock + Aaya Hua Note (IN) - Gaya Hua Note (OUT)
                    const adjustedStock = currentStock + inQty - outQty;

                    if (adjustedStock < 0) {
                        window.showSystemAlert(`आपके काउंटर पर ₹${d} के नोट पर्याप्त मात्रा में उपलब्ध नहीं हैं कि इतने OUT किए जा सकें!`, "Stock Alert", "⚠️");
                        hasSufficientStock = false;
                        break;
                    }
                    updatedNotesPayload[dbColumnKey] = adjustedStock;
                }

                // Coins Flow processing segment
                if (hasSufficientStock) {
                    const currentCoins = parseInt(liveUser['cash_coins']) || 0;
                    const cIn = inputNotes['denom_in_coins'] || 0;
                    const cOut = inputNotes['denom_out_coins'] || 0;
                    
                    if (cIn > 0 || cOut > 0) processedAnyNote = true;

                    if ((currentCoins + cIn - cOut) < 0) {
                        window.showSystemAlert("काउंटर तिजोरी में सिक्के कम हैं, इतने OUT नहीं किए जा सकते!", "Stock Alert", "⚠️");
                        hasSufficientStock = false;
                    } else {
                        updatedNotesPayload['cash_coins'] = currentCoins + cIn - cOut;
                    }
                }

                if (!hasSufficientStock) {
                    btnMasterSave.disabled = false;
                    btnMasterSave.innerText = "💾 Save Cash Adjustments";
                    return;
                }

                if (!processedAnyNote) {
                    window.showSystemAlert("कृपया तालिका में कम से कम एक नोट की मात्रा दर्ज करें।", "Empty Fields", "⚠️");
                    btnMasterSave.disabled = false;
                    btnMasterSave.innerText = "💾 Save Cash Adjustments";
                    return;
                }

                // Commit the atomic merged payload directly into user_roles row profile
                const { error: updateErr } = await window.supabaseClient
                    .from('user_roles')
                    .update(updatedNotesPayload)
                    .eq('ko_code', currentUser.ko_code);

                if (updateErr) throw updateErr;

                window.showSystemAlert("काउंटर का फिजिकल कैश स्टॉक सफलतापूर्वक अपडेट कर दिया गया है।", "Stock Updated", "✅");
                bootUnifiedCashGrid();

            } catch (err) {
                console.error("Master cash manager core failure stack:", err);
                window.showSystemAlert("डेटाबेस स्टॉक अपडेट विफल हुआ।", "Error", "❌");
            } finally {
                btnMasterSave.disabled = false;
                btnMasterSave.innerText = "💾 Save Cash Adjustments";
            }
        };
    }

    // Run direct initial load synchronization procedures on boot trigger
    bootUnifiedCashGrid();
};
