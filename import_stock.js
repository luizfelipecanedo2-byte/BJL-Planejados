import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wbbzeaydeyhpbugomxra.supabase.co';
const supabaseKey = 'sb_publishable__zle9WhSPyzY8s5v2lV3Xg_xacH2h8L';
const supabase = createClient(supabaseUrl, supabaseKey);

const stockItems = [
    { id_estoque: "1", name: "Parafuso 40x45", unit_price: 16.00, quantity: 7, min_stock_level: 6 },
    { id_estoque: "2", name: "Parafuso 40x40", unit_price: 22.00, quantity: 2, min_stock_level: 3 },
    { id_estoque: "3", name: "Parafuso 35x25", unit_price: 27.00, quantity: 4, min_stock_level: 3 },
    { id_estoque: "4", name: "Parafuso 40x25", unit_price: 33.00, quantity: 5, min_stock_level: 3 },
    { id_estoque: "5", name: "Parafuso 35x14", unit_price: 19.00, quantity: 3, min_stock_level: 3 },
    { id_estoque: "6", name: "Parafuso 60x60", unit_price: 16.00, quantity: 2, min_stock_level: 3 },
    { id_estoque: "7", name: "Dobradiças reta", unit_price: 3.50, quantity: 56, min_stock_level: 30 },
    { id_estoque: "8", name: "Corrediças 45cm", unit_price: 12.50, quantity: 1, min_stock_level: 4 },
    { id_estoque: "9", name: "Corrediças 40cm", unit_price: 10.90, quantity: 0, min_stock_level: 8 },
    { id_estoque: "10", name: "Corrediças 35cm", unit_price: 10.00, quantity: 3, min_stock_level: 4 },
    { id_estoque: "11", name: "Corrediça 30cm", unit_price: 10.00, quantity: 0, min_stock_level: 4 },
    { id_estoque: "12", name: "Broca 3/14", unit_price: 2.00, quantity: 10, min_stock_level: 5 },
    { id_estoque: "13", name: "Ponteira Philips PH2", unit_price: 7.00, quantity: 6, min_stock_level: 5 },
    { id_estoque: "14", name: "Cola Tek Bond", unit_price: 13.50, quantity: 7, min_stock_level: 6 },
    { id_estoque: "15", name: "Chapa 15 mm Branco Tx", unit_price: 175.00, quantity: 6, min_stock_level: 3 },
    { id_estoque: "16", name: "Fita 22 mm Branco tx", unit_price: 22.50, quantity: 4, min_stock_level: 4 },
    { id_estoque: "17", name: "Fita 40 mm Branco Tx", unit_price: 40.00, quantity: 5, min_stock_level: 2 },
    { id_estoque: "18", name: "Cantoneira Armario", unit_price: 1.00, quantity: 50, min_stock_level: 50 },
    { id_estoque: "19", name: "Suporte Invisivel 15 cm", unit_price: 8.00, quantity: 10, min_stock_level: 5 },
    { id_estoque: "20", name: "Thinner 5 litros", unit_price: 85.00, quantity: 0, min_stock_level: 1 },
    { id_estoque: "21", name: "Cola em Grão Kisa Fix Branca", unit_price: 0.00, quantity: 0, min_stock_level: 0 },
    { id_estoque: "22", name: "Cola em Grão Rendicola Transparente", unit_price: 0.00, quantity: 0, min_stock_level: 2 },
    { id_estoque: "23", name: "Tapa Furo Branco", unit_price: 0.00, quantity: 10, min_stock_level: 0 },
    { id_estoque: "24", name: "Cantoneira Zamac", unit_price: 0.00, quantity: 50, min_stock_level: 0 },
];

async function run() {
    console.log('Starting stock import with IDs...');

    for (const item of stockItems) {
        console.log(`Checking/Importing: ${item.name}`);

        const { data: existing } = await supabase
            .from('inventory')
            .select('id')
            .eq('name', item.name)
            .maybeSingle();

        if (existing) {
            const { error } = await supabase
                .from('inventory')
                .update({
                    id_estoque: item.id_estoque,
                    unit_price: item.unit_price,
                    quantity: item.quantity,
                    min_stock_level: item.min_stock_level
                })
                .eq('id', existing.id);

            if (error) console.error(`Error updating ${item.name}:`, error.message);
        } else {
            const { error } = await supabase.from('inventory').insert([item]);
            if (error) console.error(`Error inserting ${item.name}:`, error.message);
        }
    }

    console.log('Stock import with IDs finished.');
}

run();
