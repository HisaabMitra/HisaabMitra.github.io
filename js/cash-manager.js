// ========================================================
// 💼 CORE ENGINE: COUNTER CASH MANAGER (MANUAL SYNC & NOTE EXCHANGE)
// ========================================================

window.initCashManagerPage = async function(currentUser) {
    console.log("⚡ Jarvis Cash Manager Engine Initializing...");

    const optButtons = document.querySelectorAll('.cash-opt-btn');
    const panels = document.querySelectorAll('.cash-panel');
    const adjTypeSelect = document.getElementById('cash-adj-type');
    const btnAdjSave = document.getElementById('btn-cash-adj-save');
    const btnExchSave = document.getElementById('btn-cash-exch-save');

    // 🔄 [TAB PANEL SWAPPER]
    optButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetPanel = btn.getAttribute('data-panel');

            optButtons.forEach(b => {
                b.style.background = '#ffffff';
                b.style.color = '#495057';
                b.style.border = '1px solid #ced4da';
            });
            btn.style.background = targetPanel === 'exchange' ? '#343a40' : '#7d0022';
            btn.style.color = '#ffffff';
            btn.style.border = 'none';

            panels.forEach(p => p.style.display = 'none');
            const targetElement = document.getElementById(`panel-cash-${targetPanel}`);
            if (targetElement) targetElement.style.display = 'block';

            mountSharedComponentForPanel(targetPanel);
        });
    });

    // 🧮 [COMPONENT INJECTION HOOK]
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

    // 🚀 [ADJUSTMENT ROUTINE]: Pure Denomination-Driven Cash Modification
    if (btnAdjSave) {
        btnAdjSave.onclick = async function() {
            const mode = adjTypeSelect.value;

            // 🌟 LOOK FIX: Seedha active component ki live calculated value ko hi main amount manenge
            const amount = window.DenominationInOutComponent ? window.DenominationInOutComponent.calculate() : 0;

            if (amount <= 0) {
                window.showSystemAlert("कृपया डिनॉमिनेशन तालिका में नोटों की संख्या दर्ज करें।", "Validation Missing", "❌");
                return;
            }

            try {
                btnAdjSave.disabled = true;
                btnAdjSave.innerText = "Processing Cash Update...";

                const { data: liveUser } = await window.supabaseClient.from('user_roles').select('*').eq('ko_code', currentUser.ko_code).maybeSingle();
                const inputNotes = window.DenominationInOutComponent.getValues();

                let updatedNotesPayload = {};

                for (let note in inputNotes) {
                    const noteValue = note.split('_')[2]; 
                    const dbColumnKey = `cash_${noteValue}`;

                    const currentStock = parseInt(liveUser[dbColumnKey]) || 0;
                    
                    // DenominationInOutComponent ke dono input (In aur Out fields) ka net aggregate rashi context nikalte hain
                    const inQty = inputNotes[`denom_in_${noteValue}`] || 0;
                    const outQty = inputNotes[`denom_out_${noteValue}`] || 0;
                    const netEnteredQty = inQty + outQty; // Kyunki adjustment me user kisi bhi ek side note dal sakta h

                    if (mode === 'in') {
                        updatedNotesPayload[dbColumnKey] = currentStock + netEnteredQty;
                    } else if (mode === 'out') {
                        if (currentStock < netEnteredQty) {
                            window.showSystemAlert(`आपके काउंटर पर ₹${noteValue} के पर्याप्त नोट उपलब्ध नहीं हैं!`, "Stock Alert", "⚠️");
                            btnAdjSave.disabled = false;
                            btnAdjSave.innerText = "💾 Process Cash Adjustment";
                            return;
                        }
                        updatedNotesPayload[dbColumnKey] = Math.max(0, currentStock - netEnteredQty);
                    }
                }

                // Update database row
                const { error } = await window.supabaseClient.from('user_roles').update(updatedNotesPayload).eq('ko_code', currentUser.ko_code);
                if (error) throw error;

                window.showSystemAlert(`डिनॉमिनेशन के अनुसार ₹${amount} काउंटर कैश में सफलतापूर्वक ${mode === 'in' ? 'जोड़' : 'घटा'} दिए गए हैं।`, "Adjustment Complete", "✅");
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

    // 🚀 [EXCHANGE ROUTINE]: Process Note correction without mutating Net Amount (Exact ₹0 Tally)
    if (btnExchSave) {
        btnExchSave.onclick = async function() {
            const netCashValue = window.DenominationInOutComponent ? window.DenominationInOutComponent.calculate() : 0;

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

                const noteDenoms = [500, 200, 100, 50, 20, 10, 5];
                
                for (let i = 0; i < noteDenoms.length; i++) {
                    const d = noteDenoms[i];
                    const dbColumnKey = `cash_${d}`;
                    
                    const currentStock = parseInt(liveUser[dbColumnKey]) || 0;
                    const inQty = inputNotes[`denom_in_${d}`] || 0;
                    const outQty = inputNotes[`denom_out_${d}`] || 0;

                    const adjustedStock = currentStock + inQty - outQty;

                    if (adjustedStock < 0) {
                        window.showSystemAlert(`आपके काउंटर पर ₹${d} के नोट पर्याप्त मात्रा में उपलब्ध नहीं हैं!`, "Insufficient Notes stock", "⚠️");
                        hasSufficientStock = false;
                        break;
                    }
                    updatedNotesPayload[dbColumnKey] = adjustedStock;
                }

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
