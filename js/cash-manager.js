// ========================================================
// 💼 CORE ENGINE: COUNTER CASH MANAGER (MANUAL SYNC & NOTE EXCHANGE)
// ========================================================

window.initCashManagerPage = async function(currentUser) {
    console.log("⚡ Jarvis Cash Manager Engine Initializing...");

    // UI Tab Panel Elements
    const optButtons = document.querySelectorAll('.cash-opt-btn');
    const panels = document.querySelectorAll('.cash-panel');

    // Input Adjustment Fields
    const adjTypeSelect = document.getElementById('cash-adj-type');
    const adjAmountInput = document.getElementById('cash-adj-amount');

    // Action Save Buttons
    const btnAdjSave = document.getElementById('btn-cash-adj-save');
    const btnExchSave = document.getElementById('btn-cash-exch-save');

    // 🔄 [TAB PANEL SWAPPER]: Handles clean sidebar swapping layout
    optButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetPanel = btn.getAttribute('data-panel');

            // Sidebar navigation buttons active focus state mapping
            optButtons.forEach(b => {
                b.style.background = '#ffffff';
                b.style.color = '#495057';
                b.style.border = '1px solid #ced4da';
            });
            btn.style.background = targetPanel === 'exchange' ? '#343a40' : '#7d0022';
            btn.style.color = '#ffffff';
            btn.style.border = 'none';

            // Toggle active viewport panels display blocks
            panels.forEach(p => p.style.display = 'none');
            const targetElement = document.getElementById(`panel-cash-${targetPanel}`);
            if (targetElement) targetElement.style.display = 'block';

            // Mount standard component layout on swap triggers
            mountSharedComponentForPanel(targetPanel);
        });
    });

    // 🧮 [COMPONENT INJECTION HOOK]: Render standard component as per instructions
    function mountSharedComponentForPanel(panelType) {
        if (!window.DenominationInOutComponent) {
            console.error("❌ Generic DenominationInOutComponent asset reference missing!");
            return;
        }

        window.DenominationInOutComponent.clear();

        if (panelType === 'adjust') {
            window.DenominationInOutComponent.render('cash-adj-denom-container');
            updateHeaderLabelText("💵 डिनॉमिनेशन विवरण (कैश समायोजन)");
        } else if (panelType === 'exchange') {
            window.DenominationInOutComponent.render('cash-exch-denom-container');
            updateHeaderLabelText("🔄 डिनॉमिनेशन विवरण (नोट सुधार / एक्सचेंज)");
        }
    }

    function updateHeaderLabelText(textMsg) {
        setTimeout(() => {
            const labelNode = document.querySelector('#cash-adj-denom-container h4') || document.querySelector('#cash-exch-denom-container h4');
            if (labelNode) labelNode.innerText = textMsg;
        }, 50);
    }

    // 🚀 [ADJUSTMENT ROUTINE]: Process direct Cash In / Cash Out modifications
    if (btnAdjSave) {
        btnAdjSave.onclick = async function() {
            const mode = adjTypeSelect.value;
            const amount = parseFloat(adjAmountInput.value) || 0;

            if (amount <= 0) {
                window.showSystemAlert("कृपया एक वैध समायोजन राशि दर्ज करें।", "Validation Missing", "❌");
                return;
            }

            // Read live values from the active DenominationInOutComponent container grid
            const denoTotal = window.DenominationInOutComponent ? window.DenominationInOutComponent.calculate() : amount;
            if (denoTotal !== amount) {
                window.showSystemAlert(`राशि का मिलान नहीं हुआ!\nदर्ज राशि: ₹${amount}\nडिनॉमिनेशन कुल: ₹${denoTotal}`, "Tally Mismatch", "⚠️");
                return;
            }

            try {
                btnAdjSave.disabled = true;
                btnAdjSave.innerText = "Processing Cash Update...";

                // Fetch current user details snapshot to load latest cash balances
                const { data: liveUser } = await window.supabaseClient.from('user_roles').select('*').eq('ko_code', currentUser.ko_code).maybeSingle();
                const inputNotes = window.DenominationInOutComponent.getValues();

                let updatedNotesPayload = {};

                // Loop layout logic to mutate specific physical note counts inside user_roles schema row
                for (let note in inputNotes) {
                    // Mapping standard field names like 'denom_in_500' to schema format 'cash_500'
                    const noteValue = note.split('_')[2]; 
                    const dbColumnKey = `cash_${noteValue}`;

                    const currentStock = parseInt(liveUser[dbColumnKey]) || 0;
                    const enteredQty = inputNotes[note]; // Values picked up from component storage context

                    if (mode === 'in') {
                        updatedNotesPayload[dbColumnKey] = currentStock + enteredQty; // Cash Add
                    } else if (mode === 'out') {
                        updatedNotesPayload[dbColumnKey] = Math.max(0, currentStock - enteredQty; // Cash Subtract with negative protection
                    }
                }

                // Update database row
                const { error } = await window.supabaseClient.from('user_roles').update(updatedNotesPayload).eq('ko_code', currentUser.ko_code);
                if (error) throw error;

                window.showSystemAlert(`काउंटर पर सफलतापूर्वक कैश ${mode === 'in' ? 'बढ़ा' : 'घटा'} दिया गया है।`, "Success", "✅");
                adjAmountInput.value = "";
                mountSharedComponentForPanel('adjust');

            } catch (err) {
                console.error("Cash adjustment failed:", err);
                window.showSystemAlert("डेटाबेस समायोजन विफल हुआ।", "Error", "❌");
            } finally {
                btnAdjSave.disabled = false;
                btnAdjSave.innerText = "💾 Process Cash Adjustment";
            }
        };
    }

    // 🚀 [EXCHANGE ROUTINE]: Process Note correction without mutating Net Amount
    if (btnExchSave) {
        btnExchSave.onclick = async function() {
            // Read Net calculated amount from our unique target plugin logic 
            const netCashValue = window.DenominationInOutComponent ? window.DenominationInOutComponent.calculate() : 0;

            // Security core logic guard: Net Cash MUST be equal to zero for an isolated notes exchange matrix
            if (netCashValue !== 0) {
                window.showSystemAlert(`नोट एक्सचेंज निष्पादित नहीं किया जा सकता!\nनेट कैश टोटल ₹0 होना चाहिए, लेकिन अभी ₹${netCashValue} है।`, "Net Balance Violation", "⚠️");
                return;
            }

            try {
                btnExchSave.disabled = true;
                btnExchSave.innerText = "Executing Note Exchange...";

                const { data: liveUser } = await window.supabaseClient.from('user_roles').select('*').eq('ko_code', currentUser.ko_code).maybeSingle();
                const inputNotes = window.DenominationInOutComponent.getValues();

                let updatedNotesPayload = {};
                let hasSufficientStock = true;

                // Process standard collection loop map
                const noteDenoms = [500, 200, 100, 50, 20, 10, 5];
                
                for (let i = 0; i < noteDenoms.length; i++) {
                    const d = noteDenoms[i];
                    const dbColumnKey = `cash_${d}`;
                    
                    const currentStock = parseInt(liveUser[dbColumnKey]) || 0;
                    const inQty = inputNotes[`denom_in_${d}`] || 0;
                    const outQty = inputNotes[`denom_out_${d}`] || 0;

                    // Net mutation calculation per unique notes bucket row row
                    const adjustedStock = currentStock + inQty - outQty;

                    if (adjustedStock < 0) {
                        window.showSystemAlert(`आपके काउंटर पर ₹${d} के नोट पर्याप्त मात्रा में उपलब्ध नहीं हैं!`, "Insufficient Notes stock", "⚠️");
                        hasSufficientStock = false;
                        break;
                    }
                    updatedNotesPayload[dbColumnKey] = adjustedStock;
                }

                // Coins Execution block safety
                if (hasSufficientStock) {
                    const currentCoins = parseInt(liveUser['cash_coins']) || 0;
                    const cIn = inputNotes['denom_in_coins'] || 0;
                    const cOut = inputNotes['denom_out_coins'] || 0;
                    
                    if ((currentCoins + cIn - cOut) < 0) {
                        window.showSystemAlert("काउंटर तिजोरी में सिक्के कम हैं!", "Insufficient Coins stock", "⚠️");
                        hasSufficientStock = false;
                    } else {
                        updatedNotesPayload['cash_coins'] = currentCoins + cIn - cOut;
                    }
                }

                if (!hasSufficientStock) return;

                // Fire update commands inside user_roles row profile
                const { error } = await window.supabaseClient.from('user_roles').update(updatedNotesPayload).eq('ko_code', currentUser.ko_code);
                if (error) throw error;

                window.showSystemAlert("नोटों की अदला-बदली / सुधार सफलतापूर्वक पूरा हुआ।", "Vault Reconciled", "✅");
                mountSharedComponentForPanel('exchange');

            } catch (err) {
                console.error("Exchange profile adjustment error stack:", err);
                window.showSystemAlert("एक्सचेंज ट्रांजैक्शन विफल।", "Error", "❌");
            } finally {
                btnExchSave.disabled = false;
                btnExchSave.innerText = "🔄 Execute Note Exchange";
            }
        };
    }

    // Default boot setup triggers
    mountSharedComponentForPanel('adjust');
};
