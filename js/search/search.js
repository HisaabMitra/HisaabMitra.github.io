// js/search/search.js

function initSearchModule() {
    const searchForm = document.getElementById('search-account-form');
    const resultCard = document.getElementById('search-result-card');
    const errorCard = document.getElementById('search-error-card');

    if (!searchForm) return;

    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const queryVal = document.getElementById('search-query').value.trim();
        const submitBtn = searchForm.querySelector('button[type="submit"]');

        // UI Reset
        resultCard.classList.add('hidden');
        errorCard.classList.add('hidden');
        submitBtn.textContent = "Looking up...";
        submitBtn.disabled = true;

        try {
            // Query Supabase: Look for matches inside account_no OR phone_no
            const { data, error } = await window.supabaseClient
                .from('accounts')
                .select('*')
                .or(`account_no.eq.${queryVal},phone_no.eq.${queryVal}`)
                .single(); // Expecting exactly one matched account row

            if (error || !data) {
                throw new Error("Account records matching criteria empty.");
            }

            // Map data safely into HTML interface properties
            document.getElementById('res-name').textContent = data.customer_name;
            document.getElementById('res-account-no').textContent = data.account_no;
            document.getElementById('res-phone').textContent = data.phone_no || 'N/A';
            
            // Format monetary readout nicely
            document.getElementById('res-balance').textContent = `₹ ${Number(data.current_balance || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
})}`;
            // Reveal result card UI
            resultCard.classList.remove('hidden');

        } catch (err) {
            console.warn(err.message);
            errorCard.classList.remove('hidden');
        } finally {
            submitBtn.textContent = "Search";
            submitBtn.disabled = false;
        }
    });
}
