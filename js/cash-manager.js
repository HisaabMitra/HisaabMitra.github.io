// ========================================================
// 💼 CORE ENGINE: COUNTER CASH MANAGER (PURE DENOMINATION RUNTIME)
// ========================================================

window.initCashManagerPage = async function(currentUser) {
    console.log("⚡ Jarvis Cash Manager Engine Initializing...");

    const btnMasterSave = document.getElementById('btn-cash-manager-master-save');
    const inputReason = document.getElementById('cash-manager-reason');
    const inputParticular = document.getElementById('cash-manager-particular');
    const inputAmount = document.getElementById('cash-manager-amount');

    // 🧮 [DIRECT INJECTION]: Kholte hi seedha naya 1stIn 2ndOut plugin load karein
    function bootUnifiedCashGrid() {
        if (!window.MasterDenom1stIn2ndOut) {
            console.error("❌ MasterDenom1stIn2ndOut plugin missing from global scope map!");
            return;
        }

        window.MasterDenom1stIn2ndOut.clear();
        window.MasterDenom1stIn2ndOut.render('cash-manager-unified-container');
        
        // Reset inputs
        if(inputParticular) inputParticular.value = "";
        if(inputAmount) inputAmount.value = "";
        
        // Refresh Today's Table Data View
        renderTodayEntriesTable();
    }

    // 📊 [RENDER FUNCTION FOR RIGHT SIDE TABLE]
    async function renderTodayEntriesTable() {
        const tableBody = document.getElementById('cash-manager-today-table-body');
        if (!tableBody) return;

        try {
            // Hum safe-side ke liye aaj ki entries pull kar rahe hain schema se
            const todayStart = new Date();
            todayStart.setHours(0,0,0,0);

            const { data: entries, error } = await window.supabaseClient
                .from('cash_transactions') // Aapki real dynamic table ka naam yahan likhein agar badalna ho
                .select('*')
                .eq('ko_code', currentUser.ko_code)
                .gte('created_at', todayStart.toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!entries || entries.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="4" style="padding: 20px; text-align: center; color: #888; font-style: italic;">No entries recorded today yet.</td></tr>`;
                return;
            }

            tableBody.innerHTML = entries.map(item => `
                <tr style="border-bottom: 1px solid #dee2e6;">
                    <td style="padding: 10px; font-weight: 500;">${item.reason || 'Contra'}</td>
                    <td style="padding: 10px; color: #555;">${item.particular || '-'}</td>
                    <td style="padding: 10px; font-weight: bold; color: #7d0022;">₹${item.amount || 0}</td>
                    <td style="padding: 10px; text-align: center;">
                        <button onclick="window.editCashEntry('${item.id}')" style="background:#007bff; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer; margin-right:5px; font-size:0.8rem;">✏️ Edit</button>
                        <button onclick="window.deleteCashEntry('${item.id}')" style="background:#dc3545; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer; font-size:0.8rem;">🗑️ Delete</button>
                    </td>
                </tr>
            `).join('');

        } catch (err) {
            console.error("Error loading today's cash table grid:", err);
            tableBody.innerHTML = `<tr><td colspan="4" style="padding: 20px; text-align: center; color: red;">Failed to load data table.</td></tr>`;
        }
    }

    // 🚀 [MASTER SAVE ACTION ROUTINE]: Syncs fields seamlessly
    if (btnMasterSave) {
        btnMasterSave.onclick = async function() {
            if (!window.MasterDenom1stIn2ndOut) return;

            // Get live calculation summary matrix array
            const metrics = window.MasterDenom1stIn2ndOut.calculate();
            let particularVal = inputParticular.value.trim();
            const amountVal = parseFloat(inputAmount.value) || 0;

            const isDenominationEmpty = (metrics.totalIn === 0 && metrics.totalOut === 0);

            // 🛑 CRITICAL LOGIC RULE 1: Particular empty check
            if (!particularVal) {
                const userChoice = confirm("Particular भरना भविष्य में इस transaction को याद रखने के लिए ज़रूरी है! क्या आप आगे बढ़ना चाहते हैं?");
                if (!userChoice) {
                    return; // Stop transaction process right here
                } else {
                    particularVal = "Contra";
                    inputParticular.value = "Contra"; // Form interface me set kiya
                }
            }

            // 🛑 CRITICAL LOGIC RULE 2: Amount strict verification
            if (isDenominationEmpty && amountVal === 0) {
                // Denomination empty hai aur amount bhi 0 hai -> Save silently absolute standard
                window.showSystemAlert("कोई बदलाव नहीं मिला (Amount & Denominations are zero)।", "No Change", "ℹ️");
                return;
            }

            if (!isDenominationEmpty && amountVal === 0) {
                // Denomination entered hai lekin input amount field 0 hai -> block execute
                window.showSystemAlert("Denomination में वैल्यू होने के कारण Amount दर्ज करना आवश्यक है!", "Validation Error", "⚠️");
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

                // 1. Update user_roles mapping stock
                const { error: updateErr } = await window.supabaseClient
                    .from('user_roles')
                    .update(updatedNotesPayload)
                    .eq('ko_code', currentUser.ko_code);

                if (updateErr) throw updateErr;

                // 2. [EXTRA BONUS RUNTIME]: Transaction log mapping context table me entry record karein
                await window.supabaseClient
                    .from('cash_transactions')
                    .insert([{
                        ko_code: currentUser.ko_code,
                        reason: inputReason.value,
                        particular: particularVal,
                        amount: amountVal,
                        created_at: new Date().toISOString()
                    }]);

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

    // Global scopes functions so table buttons triggers directly click handle
    window.editCashEntry = async function(id) {
        alert("Edit function trigger for transaction ID: " + id + ". Setup custom inline input logic as per requirements.");
    };

    window.deleteCashEntry = async function(id) {
        if(confirm("क्या आप इस Cash Entry को डिलीट करना चाहते हैं?")) {
             try {
                 await window.supabaseClient.from('cash_transactions').delete().eq('id', id);
                 bootUnifiedCashGrid();
             } catch(e) { console.error(e); }
        }
    };

    // Run direct initial load synchronization procedures on boot trigger
    bootUnifiedCashGrid();
};
