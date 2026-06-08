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

    // 🚀 [EXECUTE ATOMIC SAVE TRANSACTION]: actual database injection routine logic split
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

            // 2. Transaction ledger table history insertion
            await window.supabaseClient
                .from('cash_transactions')
                .insert([{
                    ko_code: currentUser.ko_code,
                    reason: inputReason.value,
                    particular: finalParticular,
                    amount: finalAmount,
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
    }

    // 🚀 [MASTER SAVE ACTION ROUTINE]
    if (btnMasterSave) {
        btnMasterSave.onclick = async function() {
            if (!window.MasterDenom1stIn2ndOut) return;

            // Calculate live calculation matrices summary array
            const metrics = window.MasterDenom1stIn2ndOut.calculate();
            let particularVal = inputParticular.value.trim();
            const amountVal = parseFloat(inputAmount.value) || 0;

            // Donomination grid entry elements dynamic absolute totals evaluate
            const isDenominationEmpty = (metrics.totalIn === 0 && metrics.totalOut === 0);
            
            // ⭐ LOGIC RULE: Calculate true "Net Change" / Net Adjustment
            const netAdjustment = Math.abs(metrics.totalIn - metrics.totalOut);

            // 🛑 CRITICAL VALIDATION: Agar user ne kuch bhi note change nahi kiya aur na hi amount dala
            if (isDenominationEmpty && amountVal === 0) {
                window.showSystemAlert("कोई बदलाव नहीं मिला (Amount & Denominations are zero)।", "No Change", "ℹ️");
                return;
            }

            // 🛑 CRITICAL VALIDATION: Agar Net Adjustment 0 se upar hai par Amount abhi bhi 0 hai -> tabhi block lagao
            if (netAdjustment > 0 && amountVal === 0) {
                window.showSystemAlert("Denomination में Net Adjustment होने के कारण Amount दर्ज करना आवश्यक है!", "Validation Error", "⚠️");
                return;
            }

            // Fetch current absolute live cash stocks from user_roles beforehand
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

            // 🌟 ATOMIC MUTATION STOCK CALCULATION LOOP
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

            if (!hasSufficientStock) return;

            // 🛑 CUSTOM APP ALERT IMPLEMENTATION: Particular empty warning handler inside app standard panel
            if (!particularVal) {
                // Agar aapke system me custom dynamic confirm system window h, toh usko toggle karein. 
                // Alternatively, custom modal injection style fallback trigger wrapper element inside code:
                if (window.showSystemConfirm) {
                    window.showSystemConfirm(
                        "Particular भरना भविष्य में इस transaction को याद रखने के लिए ज़रूरी है! क्या आप आगे बढ़ना चाहते हैं?", 
                        async function(confirmed) {
                            if (confirmed) {
                                particularVal = "Contra";
                                inputParticular.value = "Contra";
                                await executeSaveWorkflow(particularVal, amountVal, updatedNotesPayload);
                            }
                        }
                    );
                } else {
                    // Failback dynamic UI alert framework to match style panel
                    const userConfirmation = confirm("Particular भरना भविष्य में इस transaction को याद रखने के लिए ज़रूरी है! क्या आप आगे बढ़ना चाहते हैं?");
                    if (userConfirmation) {
                        particularVal = "Contra";
                        inputParticular.value = "Contra";
                        await executeSaveWorkflow(particularVal, amountVal, updatedNotesPayload);
                    }
                }
            } else {
                // Agar particular already populated fill hai toh seedha execute hoga entry loop workflow
                await executeSaveWorkflow(particularVal, amountVal, updatedNotesPayload);
            }
        };
    }

    window.editCashEntry = async function(id) {
        alert("Edit function trigger for transaction ID: " + id);
    };

    window.deleteCashEntry = async function(id) {
        if(confirm("क्या आप इस Cash Entry को डिलीट करना चाहते हैं?")) {
             try {
                 await window.supabaseClient.from('cash_transactions').delete().eq('id', id);
                 bootUnifiedCashGrid();
             } catch(e) { console.error(e); }
        }
    };

    bootUnifiedCashGrid();
};
