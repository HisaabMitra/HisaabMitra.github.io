// js/supabase/supabase.js

if (!window.supabase) {
    console.error("Supabase CDN failed to load. Check internet connectivity.");
}

// Attach the client directly to the global window scope
window.supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

console.log("Supabase Client initialized successfully.");
