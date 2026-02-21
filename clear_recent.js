
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wbbzeaydeyhpbugomxra.supabase.co';
const supabaseKey = 'sb_publishable__zle9WhSPyzY8s5v2lV3Xg_xacH2h8L';
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearRecentTransactions() {
    console.log("Clearing transactions created today...");

    // Get start of today (UTC)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { error } = await supabase
        .from('transactions')
        .delete()
        .gte('created_at', todayISO);

    if (error) {
        console.error("Error clearing transactions:", error.message);
    } else {
        console.log("Recent transactions cleared successfully.");
    }
}

clearRecentTransactions();
