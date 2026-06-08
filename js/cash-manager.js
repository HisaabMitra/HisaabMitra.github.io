// ========================================================
// 💼 CORE ENGINE: COUNTER CASH MANAGER (PURE DENOMINATION RUNTIME)
// ========================================================

window.initCashManagerPage = async function(currentUser) {
    console.log("⚡ Jarvis Cash Manager Engine Initializing...");

    const btnMasterSave = document.getElementById('btn-cash-manager-master-save');
    const inputReason = document.getElementById('cash-manager-reason');
    const inputParticular = document.getElementById('cash-manager-particular');
    const inputAmount = document.getElementById('cash-manager-amount');

    // 🧮 [DIRECT INJECTION]: Kholte hi naya 1stIn 2ndOut plugin load karein
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
            const todayStart = new Date();
            todayStart.setHours(0,0,0,0);

            const { data: entries, error } = await window.supabaseClient
                .from('cash_transactions')
                .select('*')
                .eq('ko_code', currentUser.ko_code)
                .gte('created_at', todayStart.toISOString())
                .order('created_at', { ascending: false });

            if (error) {
                // Agar table nahi bani toh console par error dikhe par UI crash na ho
                console.warn("Table 'cash_transactions' missing or fetch error:", error.message);
                tableBody.innerHTML = `<tr><td colspan="4" style="padding: 20px; text-align: center; color: #888; font-style: italic;">No database table found. Create 'cash_transactions' table to view logs.</td></tr>`;
                return;
            }

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

    // 🚀 [EXECUTE ATOMIC SAVE TRANSACTION]: Saves to DB safely
    async function executeSaveWorkflow(finalParticular, finalAmount, updatedNotesPayload) {
        try {
            btnMasterSave.disabled = true;
            btnMasterSave.innerText = "Processing Cash Sync...";

            // 1. Update user_roles mapping stock counter vault
            const { error: updateErr } = await window.supabaseClient
                .from('user_roles')
                .update(updatedNotesPayload)
                .eq('ko_code', currentUser.ko_code);

            if (updateErr) throw updateErr;

            // 2. Transaction ledger table history insertion (Try block safe for missing table)
            try {
                await window.supabaseClient
                    .from('cash_transactions')
                    .insert([{
                        ko_code: currentUser.ko_code,
                        reason: inputReason.value,
                        particular: finalParticular,
                        amount: finalAmount,
                        created_at: new Date().toISOString()
                    }]);
            } catch(tblErr) {
                console.error("Ledger log insertion bypassed due to table absence:", tblErr);
            }

            window.showSystemAlert("काउंटर का फिजिकल कैश स्टॉक सफलतापूर्वक अपडेट कर दिया गया है।", "Stock Updated", "✅");
            bootUnifiedCashGrid();

        } catch (err) {
            console.error("Master cash manager core failure stack:", err);
            window.showSystemAlert("डेटाबेस स्टॉक अपडेट विफल हुआ।", "Error", "❌");
        } finally {
            btnMasterSave.disabled = false;
            btnMasterSave.innerText = "💾 Save Cash Adjustments";
        }
    }

    // 🚀 [MASTER SAVE ACTION ROUTINE]
    if (btnMasterSave) {
        btnMasterSave.onclick = async function() {
            if (!window.MasterDenom1stIn2ndOut) return;

            // Calculate live totals from plugin grid
            const metrics = window.MasterDenom1stIn2ndOut.calculate();
            let particularVal = inputParticular.value.trim();
            const amountVal = parseFloat(inputAmount.value) || 0;

            const isDenominationEmpty = (metrics.totalIn === 0 && metrics.totalOut === 0);
            
            // ⭐ LOGIC: Calculate net absolute change gap between total IN flow and OUT flow
            const netAdjustment = Math.abs(metrics.totalIn - metrics.totalOut);

            // 🛑 RULE 0: Agar sab kuch zero hai toh roko
            if (isDenominationEmpty && amountVal === 0) {
                window.showSystemAlert("कोई बदलाव नहीं मिला (Amount & Denominations are zero)।", "No Change", "ℹ️");
                return;
            }

            // 🛑 RULE 1: Agar Net Adjustment plus ya minus me hai (Not Zero), toh Amount aur Particular dono Mandatory hain!
            if (netAdjustment > 0) {
                if (amountVal === 0 || !particularVal) {
                    window.showSystemAlert("Denomination में अंतर (Plus/Minus) होने के कारण Amount और Particular दोनों भरना अनिवार्य है!", "Fields Required", "⚠️");
                    return;
                }
            }

            // Fetch live stocks data row mapping inside database
            let liveUser, fetchErr;
            try {
                const response = await window.supabaseClient
                    .from('user_roles')
                    .select('*')
                    .eq('ko_code', currentUser.ko_code)
                    .maybeSingle();
                liveUser = response.data;
                fetchErr = response.error;
            } catch(e) { fetchErr = e; }

            if (fetchErr || !liveUser) {
                window.showSystemAlert("डेटाबेस से स्टॉक फ़ेच करने में विफलता।", "Error", "❌");
                return;
            }

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

                const adjustedStock = currentStock + inQty - outQty;

                if (adjustedStock < 0) {
                    window.showSystemAlert(`आपके काउंटर पर ₹${d} के नोट पर्याप्त मात्रा में उपलब्ध नहीं हैं कि इतने OUT किए जा सकें!`, "Stock Alert", "⚠️");
                    hasSufficientStock = false;
                    break;
                }
                updatedNotesPayload[dbColumnKey] = adjustedStock;
            }

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

            if (!hasSufficientStock) return;

            // 🛑 RULE 2: Agar Net Adjustment 0 hai, par Particular khali hai -> Pop-up confirmation alert trigger
            if (!particularVal) {
                if (window.showSystemConfirm) {
                    window.showSystemConfirm(
                        "Particular से transaction का reason clear hota hai. क्या आप आगे बढ़ना चाहते हैं?", 
                        async function(confirmed) {
                            if (confirmed) {
                                particularVal = "Contra";
                                if (inputParticular) inputParticular.value = "Contra";
                                await executeSaveWorkflow(particularVal, amountVal, updatedNotesPayload);
                            }
                        }
                    );
                } else {
                    // Failback custom confirm mock layout system integration
                    const userChoice = confirm("Particular से transaction का reason clear hota hai. क्या आप आगे बढ़ना चाहते हैं?");
                    if (userChoice) {
                        particularVal = "Contra";
                        if (inputParticular) inputParticular.value = "Contra";
                        await executeSaveWorkflow(particularVal, amountVal, updatedNotesPayload);
                    }
                }
            } else {
                // Agar Particular pehle se bhara hai, ya fir rule 1 pass ho chuka hai
                await executeSaveWorkflow(particularVal, amountVal, updatedNotesPayload);
            }
        };
    }

    // Global scopes functions for table action updates
    window.editCashEntry = async function(id) {
        window.showSystemAlert("Edit function clicked for transaction: " + id, "Edit Trigger", "ℹ️");
    };

    window.deleteCashEntry = async function(id) {
        if (window.showSystemConfirm) {
            window.showSystemConfirm(
                "क्या आप इस Cash Entry को डिलीट करना चाहते हैं?", 
                async function(confirmed) {
                    if (confirmed) {
                        try {
                            await window.supabaseClient.from('cash_transactions').delete().eq('id', id);
                            bootUnifiedCashGrid();
                        } catch(e) { console.error(e); }
                    }
                }
            );
        } else {
            if(confirm("क्या आप इस Cash Entry को डिलीट करना चाहते हैं?")) {
                try {
                    await window.supabaseClient.from('cash_transactions').delete().eq('id', id);
                    bootUnifiedCashGrid();
                } catch(e) { console.error(e); }
            }
        }
    };

    bootUnifiedCashGrid();
};
