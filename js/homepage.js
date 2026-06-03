// js/homepage.js
// 📊 REAL-TIME LEDGER & HOME COMPONENT SYNC ENGINE

window.initHomepageModule = async function(currentLoggedInUser, updatedUserCallback) {
    if (!currentLoggedInUser || !currentLoggedInUser.ko_code) return;

    const koCode = currentLoggedInUser.ko_code;
    const koDisplay = document.getElementById('hp-ko-display');
    const balanceDisplay = document.getElementById('hp-settlement-balance');
    const cashInHandDisplay = document.getElementById('hp-cash-in-hand');
    const commissionDisplay = document.getElementById('hp-today-commission');
    const toggleCommBtn = document.getElementById('btn-toggle-commission'); 

    if (koDisplay) koDisplay.textContent = `KO CODE: ${koCode}`;

    try {
        const { data: userUpdate, error: fetchErr } = await window.supabaseClient
            .from('user_roles')
            .select('*')
            .eq('id', currentLoggedInUser.id)
            .single();

        if (!fetchErr && userUpdate) {
            currentLoggedInUser = userUpdate;
            updatedUserCallback(userUpdate); // अपग्रेड कोर यूज़र स्टेट
        }

        if (balanceDisplay) {
            const sBal = parseFloat(currentLoggedInUser.settlement_balance) || 0;
            balanceDisplay.textContent = `₹ ${sBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        }

        const n500 = parseInt(currentLoggedInUser.cash_500) || 0;
        const n200 = parseInt(currentLoggedInUser.cash_200) || 0;
        const n100 = parseInt(currentLoggedInUser.cash_100) || 0;
        const n50  = parseInt(currentLoggedInUser.cash_50)  || 0;
        const n20  = parseInt(currentLoggedInUser.cash_20)  || 0;
        const n10  = parseInt(currentLoggedInUser.cash_10)  || 0;
        const n5   = parseInt(currentLoggedInUser.cash_5)   || 0;
        const cCoins = parseInt(currentLoggedInUser.cash_coins) || 0; 

        const finalCashInHand = (n500 * 500) + (n200 * 200) + (n100 * 100) + (n50 * 50) + (n20 * 20) + (n10 * 10) + (n5 * 5) + cCoins;

        if (cashInHandDisplay) {
            cashInHandDisplay.textContent = `₹ ${finalCashInHand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        }

        if(document.getElementById('note-count-500')) document.getElementById('note-count-500').textContent = n500;
        if(document.getElementById('note-count-200')) document.getElementById('note-count-200').textContent = n200;
        if(document.getElementById('note-count-100')) document.getElementById('note-count-100').textContent = n100;
        if(document.getElementById('note-count-50')) document.getElementById('note-count-50').textContent = n50;
        if(document.getElementById('note-count-20')) document.getElementById('note-count-20').textContent = n20;
        if(document.getElementById('note-count-10')) document.getElementById('note-count-10').textContent = n10;
        if(document.getElementById('note-count-5')) document.getElementById('note-count-5').textContent = n5;
        if(document.getElementById('coin-total-count')) document.getElementById('coin-total-count').textContent = `₹ ${cCoins}`;

        // 🌟 [DUAL COMMISSION SYNCHRONIZATION ENGINE]
        if (commissionDisplay && toggleCommBtn) {
            const todayStr = new Date().toISOString().split('T')[0]; 

            const { data: depList, error: depErr } = await window.supabaseClient
                .from('deposit_transactions')
                .select('commission')
                .eq('ko_code', koCode)
                .gte('transaction_date', `${todayStr}T00:00:00`);

            if (depErr) throw depErr;

            const { data: witList, error: witErr } = await window.supabaseClient
                .from('withdrawal_transactions')
                .select('commission')
                .eq('ko_code', koCode)
                .gte('transaction_date', `${todayStr}T00:00:00`);

            if (witErr) throw witErr;

            let totalTodayCommission = 0;
            
            if (depList && depList.length > 0) {
                totalTodayCommission += depList.reduce((sum, tx) => sum + (parseFloat(tx.commission) || 0), 0);
            }
            if (witList && witList.length > 0) {
                totalTodayCommission += witList.reduce((sum, tx) => sum + (parseFloat(tx.commission) || 0), 0);
            }

            const formattedCommission = `₹ ${totalTodayCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
            const maskedCommission = "₹ ••••••";

            commissionDisplay.textContent = maskedCommission;
            toggleCommBtn.textContent = "👁️";
            toggleCommBtn.onclick = null;

            let isHidden = true;
            toggleCommBtn.onclick = function() {
                if (isHidden) {
                    commissionDisplay.textContent = formattedCommission; 
                    toggleCommBtn.textContent = "🙈"; 
                    isHidden = false;
                } else {
                    commissionDisplay.textContent = maskedCommission; 
                    toggleCommBtn.textContent = "👁️"; 
                    isHidden = true;
                }
            };
        }

    } catch (err) {
        console.error("Homepage Module Sync Error:", err);
    }
};
