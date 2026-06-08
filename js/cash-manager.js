// ========================================================
// 💼 CORE ENGINE: COUNTER CASH MANAGER (PURE DENOMINATION RUNTIME)
// ========================================================

window.initCashManagerPage = async function(currentUser) {
    console.log("⚡ Jarvis Cash Manager Engine Initializing...");

    const btnMasterSave = document.getElementById('btn-cash-manager-master-save');

    // 🧮 [DIRECT INJECTION]: Kholte hi seedha naya 1stIn 2ndOut plugin load karein
    function bootUnifiedCashGrid() {
        if (!window.MasterDenom1stIn2ndOut) {
            console.error("❌ MasterDenom1stIn2ndOut plugin missing from global scope map!");
            return;
        }

        window.MasterDenom1stIn2ndOut.clear();
        window.MasterDenom1stIn2ndOut.render('cash-manager-unified-container');
    }

    // 🚀 [MASTER SAVE ACTION ROUTINE]: Syncs both IN and OUT fields seamlessly
    if (btnMasterSave) {
        btnMasterSave.onclick = async function() {
            if (!window.MasterDenom1stIn2ndOut) return;

            // Get live calculation summary matrix array
            const metrics = window.MasterDenom1stIn2ndOut.calculate();

            if (metrics.totalIn === 0 && metrics.totalOut === 0) {
                window.showSystemAlert("कृपया तालिका में नोटों की संख्या दर्ज करें।", "Empty Fields", "⚠️");
                return;
            }

            try {
                btnMasterSave.disabled = true;
                btnMasterSave.innerText = "Processing Cash Sync...";

                // Fetch current absolute live cash stocks from user_roles
                const { data: liveUser, error: fetchErr } = await window.supabaseClient
                    .from('user_roles')
                    .select('*')
                    .eq('ko_code', currentUser.ko_code)
                    .maybeSingle();

                if (fetchErr) throw fetchErr;

                const inputNotes = window.MasterDenom1stIn2ndOut.getValues();
                let updatedNotesPayload = {};
                let hasSufficientStock = true;

                const noteDenoms = [500, 200, 100, 50, 20, 10, 5];

                // 🌟 ATOMIC MUTATION LOOP
                for (let i = 0; i < noteDenoms.length; i++) {
                    const d = noteDenoms[i];
                    const dbColumnKey = `cash_${d}`;
                    
                    const currentStock = parseInt(liveUser[dbColumnKey]) || 0;
                    const inQty = inputNotes[`in_${d}`] || 0;
                    const outQty = inputNotes[`out_${d}`] || 0;

                    // Core Sync Formula: Naya Stock = Purana Stock + Inflow (IN) - Outflow (OUT)
                    const adjustedStock = currentStock + inQty - outQty;

                    if (adjustedStock < 0) {
                        window.showSystemAlert(`आपके काउंटर पर ₹${d} के नोट पर्याप्त मात्रा में उपलब्ध नहीं हैं कि इतने OUT किए जा सकें!`, "Stock Alert", "⚠️");
                        hasSufficientStock = false;
                        break;
                    }
                    updatedNotesPayload[dbColumnKey] = adjustedStock;
                }

                // Coins verification segment
                if (hasSufficientStock) {
                    const currentCoins = parseInt(liveUser['cash_coins']) || 0;
                    const coinIn = inputNotes['in_coins'] || 0;
                    const coinOut = inputNotes['out_coins'] || 0;
                    
                    const adjustedCoins = currentCoins + coinIn - coinOut;

                    if (adjustedCoins < 0) {
                        window.showSystemAlert("काउंटर तिजोरी में सिक्के कम हैं, इतने OUT नहीं किए जा सकते!", "Stock Alert", "⚠️");
                        hasSufficientStock = false;
                    } else {
                        updatedNotesPayload['cash_coins'] = adjustedCoins;
                    }
                }

                if (!hasSufficientStock) {
                    btnMasterSave.disabled = false;
                    btnMasterSave.innerText = "💾 Save Cash Adjustments";
                    return;
                }

                // Fire direct update command profile inside user_roles row mapping
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
