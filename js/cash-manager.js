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
                console.warn("Table missing or fetch error:", error.message);
                tableBody.innerHTML = `<tr><td colspan="4" style="padding: 20px; text-align: center; color: #888; font-style: italic;">No database table found. Create 'cash_transactions' table to view logs.</td></tr>`;
                return;
            }

            if (!entries || entries.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="4" style="padding: 20px; text-align: center; color: #888; font-style: italic;">No entries recorded today yet.</td></tr>`;
                return;
            }

            // Keval row ID pass karenge onclick me, koi temporary memory object nahi!
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

    // 🚀 [EXECUTE ATOMIC SAVE TRANSACTION]
    async function executeSaveWorkflow(finalParticular, finalAmount, updatedNotesPayload, inputNotes) {
        try {
            btnMasterSave.disabled = true;
            btnMasterSave.innerText = "Processing Cash Sync...";

            // 1. Update user_roles mapping stock counter vault
            const { error: updateErr } = await window.supabaseClient
                .from('user_roles')
                .update(updatedNotesPayload)
                .eq('ko_code', currentUser.ko_code);

            if (updateErr) throw updateErr;

            // 2. Transaction ledger table history insertion with full breakdown structure
            try {
                const transactionPayload = {
                    ko_code: currentUser.ko_code,
                    reason: inputReason.value,
                    particular: finalParticular,
                    amount: finalAmount,
                    created_at: new Date().toISOString()
                };

                const noteDenoms = [500, 200, 100, 50, 20, 10, 5];
                noteDenoms.forEach(d => {
                    transactionPayload[`in_${d}`] = parseInt(inputNotes[`in_${d}`]) || 0;
                    transactionPayload[`out_${d}`] = parseInt(inputNotes[`out_${d}`]) || 0;
                });
                transactionPayload[`in_coins`] = parseInt(inputNotes[`in_coins`]) || 0;
                transactionPayload[`out_coins`] = parseInt(inputNotes[`out_coins`]) || 0;

                await window.supabaseClient
                    .from('cash_transactions')
                    .insert([transactionPayload]);
            } catch(tblErr) {
                console.error("Ledger log insertion bypassed:", tblErr);
            }

            window.showSystemAlert("काउंटर का फिजिकल कैश स्टॉक सफलतापूर्वक अपडेट कर दिया गया है।", "Stock Updated", "✅");
            bootUnifiedCashGrid();

        } catch (err) {
            console.error("Master cash manager failure:", err);
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

            const metrics = window.MasterDenom1stIn2ndOut.calculate();
            let particularVal = inputParticular.value.trim();
            const amountVal = parseFloat(inputAmount.value) || 0;

            const isDenominationEmpty = (metrics.totalIn === 0 && metrics.totalOut === 0);
            const netAdjustment = Math.abs(metrics.totalIn - metrics.totalOut);

            if (isDenominationEmpty && amountVal === 0) {
                window.showSystemAlert("कोई बदलाव नहीं मिला (Amount & Denominations are zero)।", "No Change", "ℹ️");
                return;
            }

            if (netAdjustment > 0 && (amountVal === 0 || !particularVal)) {
                window.showSystemAlert("Denomination में अंतर (Plus/Minus) होने के कारण Amount और Particular दोनों भरना अनिवार्य है!", "Fields Required", "⚠️");
                return;
            }

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

            for (let i = 0; i < noteDenoms.length; i++) {
                const d = noteDenoms[i];
                const dbColumnKey = `cash_${d}`;
                const currentStock = parseInt(liveUser[dbColumnKey]) || 0;
                const inQty = inputNotes[`in_${d}`] || 0;
                const outQty = inputNotes[`out_${d}`] || 0;

                const adjustedStock = currentStock + inQty - outQty;
                if (adjustedStock < 0) {
                    window.showSystemAlert(`आपके काउंटर पर ₹${d} के नोट पर्याप्त मात्रा में उपलब्ध नहीं हैं!`, "Stock Alert", "⚠️");
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
                    window.showSystemAlert("काउंटर तिजोरी में सिक्के कम हैं!", "Stock Alert", "⚠️");
                    hasSufficientStock = false;
                } else {
                    updatedNotesPayload['cash_coins'] = adjustedCoins;
                }
            }

            if (!hasSufficientStock) return;

            // 🛑 RULE 2: Confirmation Handle
            if (!particularVal) {
                if (window.showSystemConfirm) {
                    window.showSystemConfirm(
                        "Particular से transaction का reason clear hota hai. क्या आप आगे बढ़ना चाहते हैं?", 
                        "Confirmation Required", 
                        async function() {
                            particularVal = "Contra";
                            if (inputParticular) inputParticular.value = "Contra";
                            await executeSaveWorkflow(particularVal, amountVal, updatedNotesPayload, inputNotes);
                        }
                    );
                }
            } else {
                await executeSaveWorkflow(particularVal, amountVal, updatedNotesPayload, inputNotes);
            }
        };
    }

    // ✏️ [EDIT ENTRY FUNCTION]: Pure Dynamic Database Fetch Mechanism
    window.editCashEntry = async function(id) {
        if (!id) return;
        
        try {
            // Memory se nahi, seedha data table se live row fetch karein
            const { data: item, error } = await window.supabaseClient
                .from('cash_transactions')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (error || !item) {
                window.showSystemAlert("डेटाबेस से ट्रांजैक्शन रिकॉर्ड लोड करने में विफलता।", "Fetch Error", "❌");
                return;
            }

            // 1. Form fields populate karein
            if (inputReason) inputReason.value = item.reason || "Contra";
            if (inputParticular) inputParticular.value = item.particular || "";
            if (inputAmount) inputAmount.value = item.amount || "";

            // 2. Core plugin values setup mapping
            if (window.MasterDenom1stIn2ndOut) {
                const valuesToSet = {};
                const noteDenoms = [500, 200, 100, 50, 20, 10, 5];
                
                noteDenoms.forEach(d => {
                    valuesToSet[`in_${d}`] = parseInt(item[`in_${d}`]) || 0;
                    valuesToSet[`out_${d}`] = parseInt(item[`out_${d}`]) || 0;
                });
                valuesToSet[`in_coins`] = parseInt(item['in_coins']) || 0;
                valuesToSet[`out_coins`] = parseInt(item['out_coins']) || 0;
                
                // Plugin state values apply
                if (typeof window.MasterDenom1stIn2ndOut.setValues === 'function') {
                    window.MasterDenom1stIn2ndOut.setValues(valuesToSet);
                } else if (window.MasterDenom1stIn2ndOut.values) {
                    window.MasterDenom1stIn2ndOut.values = { ...window.MasterDenom1stIn2ndOut.values, ...valuesToSet };
                }

                // UI REFRESH: Grid ko force re-render karein taaki data screen pe dikhe
                if (typeof window.MasterDenom1stIn2ndOut.render === 'function') {
                    window.MasterDenom1stIn2ndOut.render('cash-manager-unified-container');
                }

                window.showSystemAlert("डेटाबेस से लाइव नोट काउंट फॉर्म में लोड कर दिए गए हैं।", "Edit Mode Live", "ℹ️");
            }
        } catch(err) {
            console.error("Direct table fetch fail stack:", err);
            window.showSystemAlert("एडिट प्रोसेस क्रैश हुआ।", "Error", "❌");
        }
    };

    // 🗑️ [DELETE & ROLLBACK SYSTEM]
    window.deleteCashEntry = async function(id) {
        if (window.showSystemConfirm) {
            window.showSystemConfirm(
                "क्या आप इस Cash Entry को डिलीट करना चाहते हैं? इससे स्टॉक वापस पहले जैसा हो जाएगा।", 
                "Rollback Confirmation", 
                async function() {
                    try {
                        const { data: targetTx, error: txErr } = await window.supabaseClient
                            .from('cash_transactions')
                            .select('*')
                            .eq('id', id)
                            .maybeSingle();

                        if (txErr || !targetTx) throw new Error("Transaction log not found");

                        const { data: liveUser } = await window.supabaseClient
                            .from('user_roles')
                            .select('*')
                            .eq('ko_code', currentUser.ko_code)
                            .maybeSingle();

                        let rollbackPayload = {};
                        const noteDenoms = [500, 200, 100, 50, 20, 10, 5];
                        
                        noteDenoms.forEach(d => {
                            const dbKey = `cash_${d}`;
                            const curStock = parseInt(liveUser[dbKey]) || 0;
                            const oldIn = parseInt(targetTx[`in_${d}`]) || 0;
                            const oldOut = parseInt(targetTx[`out_${d}`]) || 0;
                            
                            rollbackPayload[dbKey] = curStock - oldIn + oldOut;
                        });

                        const curCoins = parseInt(liveUser['cash_coins']) || 0;
                        rollbackPayload['cash_coins'] = curCoins - (parseInt(targetTx['in_coins']) || 0) + (parseInt(targetTx['out_coins']) || 0);

                        await window.supabaseClient.from('user_roles').update(rollbackPayload).eq('ko_code', currentUser.ko_code);
                        await window.supabaseClient.from('cash_transactions').delete().eq('id', id);

                        window.showSystemAlert("एंट्री डिलीट कर दी गई है!", "Deleted Successfully", "✅");
                        bootUnifiedCashGrid();

                    } catch(e) { 
                        console.error("Rollback fail status:", e); 
                        window.showSystemAlert("रोल-बैक या डिलीट प्रक्रिया विफल हुई।", "Error", "❌");
                    }
                }
            );
        }
    };

    bootUnifiedCashGrid();
};
