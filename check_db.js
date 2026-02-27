
import { createClient } from '@supabase/supabase-js';

console.log("Checking database data...");

const supabaseUrl = 'https://wbbzeaydeyhpbugomxra.supabase.co';
const supabaseKey = 'sb_publishable__zle9WhSPyzY8s5v2lV3Xg_xacH2h8L';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    try {
        const { count: transCount, error: tErr } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
        if (tErr) console.error("Error trans:", tErr);
        console.log(`Transactions count: ${transCount}`);

        const { data: sampleTrans } = await supabase.from('transactions').select('*').limit(5);
        console.log("Sample Transactions (competence_date, category, amount):");
        sampleTrans?.forEach(t => console.log(`- ${t.competence_date} | ${t.category} | ${t.amount}`));

        const { count: expenseCount, error: eErr } = await supabase.from('service_expenses').select('*', { count: 'exact', head: true });
        if (eErr) console.error("Error expenses:", eErr);
        console.log(`Service Expenses count: ${expenseCount}`);

        const { data: sampleExpenses } = await supabase.from('service_expenses').select('*').limit(5);
        console.log("Sample Service Expenses (client, environment, service_value):");
        sampleExpenses?.forEach(e => console.log(`- ${e.client_name} | ${e.environment} | ${e.service_value}`));
    } catch (e) {
        console.error(e);
    }
}

check();
