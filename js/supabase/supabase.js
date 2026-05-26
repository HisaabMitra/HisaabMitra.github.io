// Check if the library loaded correctly from CDN
if (!window.supabase) {
    console.error("Supabase CDN failed to load. Check internet connectivity.");
}

// Create a single global Supabase client instance to use across all your files
const supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
