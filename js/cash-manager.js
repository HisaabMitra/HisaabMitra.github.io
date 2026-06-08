// ========================================================
// 💼 CORE ENGINE: COUNTER CASH MANAGER (PURE DENOMINATION RUNTIME)
// ========================================================

window.initCashManagerPage = async function(currentUser) {
    console.log("⚡ Jarvis Cash Manager Engine Initializing...");

    const btnMasterSave = document.getElementById('btn-cash-manager-master-save');
    const inputReason = document.getElementById('cash-manager-reason');
    const inputParticular = document.getElementById('cash-manager-particular');
    const inputAmount = document.getElementById('cash-manager-amount');

    // 🔄 Current Editing Transaction ID track karne ke liye state holder
    let currentEditingTxId = null;

    // 🧮 [DIRECT INJECTION]: Kholte hi naya 1stIn 2ndOut plugin load karein
    function bootUnifiedCashGrid() {
        if (!window.MasterDenom1stIn2ndOut) {
            console.error("❌ MasterDenom1stIn2ndOut plugin missing from global scope map!");
            return;
        }

        window.MasterDenom1stIn2ndOut.clear();
        window.MasterDenom1stIn2ndOut.render('cash-manager-unified-container');
        
        // Reset inputs & state
        if(inputParticular) inputParticular.value = "";
        if(inputAmount) inputAmount.value = "";
        currentEditingTxId = null;
        if(btnMasterSave) btnMasterSave.innerText = "💾 Save Cash Adjustments";
        
        // Refresh Today's Table Data View
        renderTodayEntriesTable();
    }

    // 📊 [RENDER FUNCTION FOR RIGHT SIDE TABLE]
    async function renderTodayEntriesTable() {
        const tableBody = document.getElementById('cash-manager-today-table-body');
        if (!tableBody) return;

        try {
            const today = new Date().toISOString().split('T')[0];

            const { data: entries, error } = await window.supabaseClient
                .from('cash_transactions')
                .select('*')
                .eq('ko_code', currentUser.ko_code)
                .gte('created_at', `${today}T00:00:00`)
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

            tableBody.innerHTML = entries.map(item => `
                <tr style="border-bottom: 1px solid #dee2e6; background: ${currentEditingTxId === item.id ? '#fff3cd' : 'transparent'};">
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

    // 🚀 [EXECUTE ATOMIC SAVE / UPDATE WORKFLOW]
    async function executeSaveWorkflow(finalParticular, finalAmount, inputNotes) {
        try {
            btnMasterSave.disabled = true;
            btnMasterSave.innerText = "Processing Cash Sync...";

            // 1. Fetch live stocks before mutating
            const { data: liveUser, error: userFetchErr } = await window.supabaseClient
                .from('user_roles')
                .select('*')
                .eq('ko_code', currentUser.ko_code)
                .maybeSingle();

            if (userFetchErr || !liveUser) throw new Error("तिजोरी स्टॉक फ़ेच विफल!");

            let oldTx = null;
            // Edit mode active hai toh purani transaction uthao taaki real atomic reversal updates kar sakein
            if (currentEditingTxId) {
                const { data: foundTx } = await window.supabaseClient
                    .from('cash_transactions')
                    .select('*')
                    .eq('id', currentEditingTxId)
                    .maybeSingle();
                oldTx = foundTx;
            }

            // 2. 🌟 ATOMIC MUTATION LOOP (Aapke standard algorithm ke mutabik)
            let nextVaultData = {};
            const noteDenoms = [500, 200, 100, 50, 20, 10, 5];
            let hasSufficientStock = true;

            for (let i = 0; i < noteDenoms.length; i++) {
                const d = noteDenoms[i];
                const dbColumnKey = `cash_${d}`;
                const currentCount = parseInt(liveUser[dbColumnKey]) || 0;

                // Naye input values
                const newIn = parseInt(inputNotes[`in_${d}`]) || 0;
                const newOut = parseInt(inputNotes[`out_${d}`]) || 0;

                // Purani values rollback ke liye (sirf tab jab Edit update cycle chal raha ho)
                const oldIn = oldTx ? (parseInt(oldTx[`in_${d}`]) || 0) : 0;
                const oldOut = oldTx ? (parseInt(oldTx[`out_${d}`]) || 0) : 0;

                // 🔄 Formula: Current Wallet Count - Old_In + Old_Out (Reversal done) + New_In - New_Out (New data done)
                const adjustedStock = currentCount - oldIn + oldOut + newIn - newOut;

                if (adjustedStock < 0) {
                    window.showSystemAlert(`आपके काउंटर पर ₹${d} के नोट पर्याप्त मात्रा में उपलब्ध नहीं हैं!`, "Stock Alert", "⚠️");
                    hasSufficientStock = false;
                    break;
                }
                nextVaultData[dbColumnKey] = adjustedStock;
            }

            // Coins handling sync
            if (hasSufficientStock) {
                const currentCoins = parseInt(liveUser['cash_coins']) || 0;
                const newCoinsIn = parseInt(inputNotes['in_coins']) || 0;
                const newCoinsOut = parseInt(inputNotes['out_coins']) || 0;
                const oldCoinsIn = oldTx ? (parseInt(oldTx['in_coins']) || 0) : 0;
                const oldCoinsOut = oldTx ? (parseInt(oldTx['out_coins']) || 0) : 0;

                const adjustedCoins = currentCoins - oldCoinsIn + oldCoinsOut + newCoinsIn - newCoinsOut;

                if (adjustedCoins < 0) {
                    window.showSystemAlert("काउंटर तिजोरी में सिक्के कम हैं!", "Stock Alert", "⚠️");
                    hasSufficientStock = false;
                } else {
                    nextVaultData['cash_coins'] = adjustedCoins;
                }
            }

            if (!hasSufficientStock) {
                btnMasterSave.disabled = false;
                btnMasterSave.innerText = currentEditingTxId ? "🔄 Update Cash Adjustments" : "💾 Save Cash Adjustments";
                return;
            }

            // 3. Update core user_roles stock
            const { error: userUpdateErr } = await window.supabaseClient
                .from('user_roles')
                .update(nextVaultData)
                .eq('ko_code', currentUser.ko_code);

            if (userUpdateErr) throw userUpdateErr;

            // 4. Update or Insert inside cash_transactions table exactly with native columns (in_X / out_X)
            const transactionPayload = {
                ko_code: currentUser.ko_code,
                reason: inputReason.value,
                particular: finalParticular,
                amount: finalAmount
            };

            noteDenoms.forEach(d => {
                transactionPayload[`in_${d}`] = parseInt(inputNotes[`in_${d}`]) || 0;
                transactionPayload[`out_${d}`] = parseInt(inputNotes[`out_${d}`]) || 0;
            });
            transactionPayload[`in_coins`] = parseInt(inputNotes[`in_coins`]) || 0;
            transactionPayload[`out_coins`] = parseInt(inputNotes[`out_coins`]) || 0;

            if (currentEditingTxId) {
                // Modification flow
                const { error: txUpdateErr } = await window.supabaseClient
                    .from('cash_transactions')
                    .update(transactionPayload)
                    .eq('id', currentEditingTxId);
                
                if (txUpdateErr) throw txUpdateErr;
                window.showSystemAlert("🔄 ट्रांजैक्शन सफलतापूर्वक संशोधित और तिजोरी सिंक हो गई!", "Update Success", "✅");
            } else {
                // New transaction flow
                transactionPayload.created_at = new Date().toISOString();
                const { error: txInsertErr } = await window.supabaseClient
                    .from('cash_transactions')
                    .insert([transactionPayload]);

                if (txInsertErr) throw txInsertErr;
                window.showSystemAlert("काउंटर का फिजिकल कैश स्टॉक सफलतापूर्वक अपडेट कर दिया गया है।", "Stock Updated", "✅");
            }

            bootUnifiedCashGrid();

        } catch (err) {
            console.error("Master cash manager failure:", err);
            window.showSystemAlert("डेटाबेस सिंक प्रक्रिया विफल हुई: " + err.message, "Error", "❌");
        } finally {
            btnMasterSave.disabled = false;
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

            const inputNotes = window.MasterDenom1stIn2ndOut.getValues();

            if (!particularVal) {
                if (window.showSystemConfirm) {
                    window.showSystemConfirm(
                        "Particular से transaction का reason clear hota hai. क्या आप आगे बढ़ना चाहते हैं?", 
                        "Confirmation Required", 
                        async function() {
                            particularVal = "Contra";
                            if (inputParticular) inputParticular.value = "Contra";
                            await executeSaveWorkflow(particularVal, amountVal, inputNotes);
                        }
                    );
                }
            } else {
                await executeSaveWorkflow(particularVal, amountVal, inputNotes);
            }
        };
    }

   // ✏️ [EDIT ENTRY FUNCTION]: Correct sequence implementation (Render -> setValues -> calculate)
    window.editCashEntry = async function(id) {
        if (!id) return;
        
        try {
            // Step 1: Fetch live single entry data block directly from database
            const { data: item, error } = await window.supabaseClient
                .from('cash_transactions')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (error || !item) {
                window.showSystemAlert("डेटाबेस से ट्रांजैक्शन रिकॉर्ड लोड करने में विफलता।", "Fetch Error", "❌");
                return;
            }

            // Active edit mode state
            currentEditingTxId = id;
            if (btnMasterSave) btnMasterSave.innerText = "🔄 Update Cash Adjustments";

            // Step 2: Populate form base standard input controls
            if (inputReason) inputReason.value = item.reason || "Contra";
            if (inputParticular) inputParticular.value = item.particular || "";
            if (inputAmount) inputAmount.value = item.amount || "";

            // Step 3: Trigger core plugin logic injection sequence
            if (window.MasterDenom1stIn2ndOut) {
                
                // 🔄 FIRST: Naya blank grid container design layout render karein
                if (typeof window.MasterDenom1stIn2ndOut.render === 'function') {
                    window.MasterDenom1stIn2ndOut.render('cash-manager-unified-container');
                }

                // Parse payload values matching exact native table scheme columns
                const valuesToSet = {};
                const noteDenoms = [500, 200, 100, 50, 20, 10, 5];
                
                noteDenoms.forEach(d => {
                    valuesToSet[`in_${d}`] = parseInt(item[`in_${d}`]) || 0;
                    valuesToSet[`out_${d}`] = parseInt(item[`out_${d}`]) || 0;
                });
                valuesToSet[`in_coins`] = parseInt(item['in_coins']) || 0;
                valuesToSet[`out_coins`] = parseInt(item['out_coins']) || 0;
                
                // 🔄 SECOND: Input boxes inject hone ke baad unke andar values set karein
                if (typeof window.MasterDenom1stIn2ndOut.setValues === 'function') {
                    window.MasterDenom1stIn2ndOut.setValues(valuesToSet);
                }

                // Highlight background render refresh table grid updates
                renderTodayEntriesTable();
                window.showSystemAlert("ट्रांजैक्शन संशोधन मोड सक्रिय। डेटा लोड कर दिया गया है।", "Edit Mode Live", "ℹ️");
            }
        } catch(err) {
            console.error("Direct table fetch fail stack:", err);
            window.showSystemAlert("एडिट प्रक्रिया विफल हुई।", "Error", "❌");
        }
    };

    // 🗑️ [DELETE & ROLLBACK SYSTEM]: Sync with native columns
    window.deleteCashEntry = async function(id) {
        if (window.showSystemConfirm) {
            window.showSystemConfirm(
                "क्या आप इस Cash Entry को डिलीट करना चाहते हैं? इससे स्टॉक वापस पहले जैसा रोल-बैक हो जाएगा।", 
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
                            
                            // Rollback using correct schema keys: in_X and out_X
                            const oldIn = parseInt(targetTx[`in_${d}`]) || 0;
                            const oldOut = parseInt(targetTx[`out_${d}`]) || 0;
                            
                            rollbackPayload[dbKey] = curStock - oldIn + oldOut;
                        });

                        const curCoins = parseInt(liveUser['cash_coins']) || 0;
                        rollbackPayload['cash_coins'] = curCoins - (parseInt(targetTx['in_coins']) || 0) + (parseInt(targetTx['out_coins']) || 0);

                        await window.supabaseClient.from('user_roles').update(rollbackPayload).eq('ko_code', currentUser.ko_code);
                        await window.supabaseClient.from('cash_transactions').delete().eq('id', id);

                        window.showSystemAlert("एंट्री डिलीट कर दी गई है और स्टॉक रोल-बैक हो चुका है।", "Deleted Successfully", "✅");
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
