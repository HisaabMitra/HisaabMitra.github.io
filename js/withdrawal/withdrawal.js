// ========================================================
// 🏦 JARVIS WITHDRAWAL CORE ENGINE & TRANSACTION LEDGER
// ========================================================

// १. विथड्रॉल मॉड्यूल का मुख्य इनिशियलाइज़र हुक (जो app.js कॉल करता है)
window.initWithdrawalPage = function(currentUserData) {
    // अगर यूजर डेटा पास हुआ है तो ग्लोबल में सिंक रखें
    if (currentUserData) {
        window.currentUser = currentUserData;
    }
    
    // आज के सारे ट्रांजैक्शंस ग्रिड में लोड करें
    if (typeof window.loadTodayWithdrawals === 'function') {
        window.loadTodayWithdrawals();
    }
};

// २. सुप्राबेस से आज के विथड्रॉल रिकॉर्ड्स लोड करके टेबल में दिखाना
window.loadTodayWithdrawals = async function() {
    const tbody = document.getElementById('withdrawal-table-body');
    if (!tbody) return;

    const client = window.supabaseClient || window.supabase;
    const today = new Date().toISOString().split('T')[0];
    const koCode = window.currentUser?.ko_code || '';

    try {
        // आज की तारीख और इस काउंटर के KO कोड के अनुसार डेटा लाएं
        const { data, error } = await client
            .from('withdrawals')
            .select('*')
            .eq('ko_code', koCode)
            .gte('created_at', today + 'T00:00:00')
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="padding: 15px; text-align: center; color: #666; font-style: italic;">आज इस काउंटर पर कोई विथड्रॉल नहीं हुआ है।</td></tr>`;
            return;
        }

        tbody.innerHTML = ""; // पुराना लेआउट साफ़ करें
        
        data.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid #dee2e6";
            
            // सुरक्षा और प्रिंट इंजन के लिए डेटा को बेस64 में एनकोड करें
            const txPayload = btoa(JSON.stringify({
                aadhaar_number: row.aadhaar_number || "--------",
                customer_name: row.customer_name || "VALUED CUSTOMER",
                amount: row.amount
            }));

            tr.innerHTML = `
                <td style="padding: 12px; font-weight: bold; text-align: center;">${index + 1}</td>
                <td style="padding: 12px; font-family: monospace;">${new Date(row.created_at).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'})}</td>
                <td style="padding: 12px; font-weight: 600; color: #7d0022;">${row.account_number || '--------'}</td>
                <td style="padding: 12px; text-transform: uppercase;">${row.customer_name}</td>
                <td style="padding: 12px; font-weight: bold; color: #137333;">₹ ${parseFloat(row.amount).toFixed(2)}</td>
                <td style="padding: 12px; text-align: center;">
                    <span style="background: #d4edda; color: #155724; padding: 3px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: bold;">SUCCESS</span>
                </td>
                <td style="padding: 12px; text-align: center;">
                    <!-- 🖨️ मास्टर प्रिंट बटन जो withdrawal-print.js को ट्रिगर करता है -->
                    <button type="button" class="btn-print-wit-receipt" data-tx="${txPayload}" style="background: #7d0022; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.85rem;">
                        <i class="fas fa-print"></i> Passbook Print
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Failed to compile today's withdrawals ledger:", err);
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 15px; text-align: center; color: red; font-weight: bold;">डेटा लोड करने में त्रुटि: ${err.message}</td></tr>`;
    }
};

// ३. नया विथड्रॉल ट्रांजैक्शन डेटाबेस में सेव करना
window.saveNewWithdrawalTransaction = async function(e) {
    if(e) e.preventDefault();

    const accNo = document.getElementById('wit-account-no')?.value.trim();
    const custName = document.getElementById('wit-cust-name')?.value.trim();
    const amount = document.getElementById('wit-amount')?.value.trim();
    const aadharNo = document.getElementById('wit-aadhar-no')?.value.trim();

    if (!accNo || !custName || !amount) {
        window.showSystemAlert("कृपया सभी अनिवार्य फ़ील्ड (खाता संख्या, नाम और राशि) भरें।", "Validation Error", "❌");
        return;
    }

    const client = window.supabaseClient || window.supabase;
    const koCode = window.currentUser?.ko_code || 'UNKNOWN';

    try {
        const { error } = await client
            .from('withdrawals')
            .insert([{
                ko_code: koCode,
                account_number: accNo,
                customer_name: custName,
                amount: parseFloat(amount),
                aadhaar_number: aadharNo || "--------",
                created_at: new Date().toISOString()
            }]);

        if (error) throw error;

        window.showSystemAlert("🏦 विथड्रॉल ट्रांजैक्शन डेटाबेस में सफलतापूर्वक सुरक्षित कर दिया गया है!", "Transaction Saved", "✅");
        
        // फॉर्म रीसेट करें
        const form = document.getElementById('withdrawal-master-form');
        if(form) form.reset();

        // टेबल ग्रिड को तुरंत रिफ्रेश करें
        window.loadTodayWithdrawals();

    } catch (err) {
        console.error("Critical Failure in saving withdrawal transaction:", err);
        window.showSystemAlert("ट्रांजैक्शन सेव करने में विफलता: " + err.message, "Database Error", "❌");
    }
};
