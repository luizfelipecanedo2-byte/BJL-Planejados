
import { createClient } from '@supabase/supabase-js';

console.log("Checking database data with types...");

const supabaseUrl = 'https://wbbzeaydeyhpbugomxra.supabase.co';
const supabaseKey = 'sb_publishable__zle9WhSPyzY8s5v2lV3Xg_xacH2h8L';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    try {
        const { data: sampleTrans } = await supabase.from('transactions').select('*').limit(10);
        console.log("Sample Transactions (type, category, amount):");
        sampleTrans?.forEach(t => console.log(`- ${t.type} | ${t.category} | ${t.amount}`));

        const { data: sampleExpenses } = await supabase.from('service_expenses').select('*').limit(5);
        console.log("\nSample Service Expenses:");
        sampleExpenses?.forEach(e => console.log(`- ${e.client_name} | ${e.environment} | ${e.service_value} | ${e.spent_value}`));
    } catch (e) {
        console.error(e);
    }
}

check();
