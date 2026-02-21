import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wbbzeaydeyhpbugomxra.supabase.co';
const supabaseKey = 'sb_publishable__zle9WhSPyzY8s5v2lV3Xg_xacH2h8L';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listStock() {
    const { data, error } = await supabase
        .from('inventory')
        .select('id_estoque, name, quantity')
        .order('id_estoque', { ascending: true });

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    // Sort naturally in JS because id_estoque is TEXT
    data.sort((a, b) => {
        const idA = parseInt(a.id_estoque || "999");
        const idB = parseInt(b.id_estoque || "999");
        return idA - idB;
    });

    console.log('--- ESTOQUE ATUAL ---');
    data.forEach(item => {
        console.log(`ID: ${item.id_estoque || '-'} | ${item.name} | Qtd: ${item.quantity}`);
    });
}

listStock();
