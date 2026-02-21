
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://wbbzeaydeyhpbugomxra.supabase.co';
const supabaseKey = 'sb_publishable__zle9WhSPyzY8s5v2lV3Xg_xacH2h8L'; // Public key is fine for inserts if RLS allows or I use service role. 
// Wait, the key in lib/supabase.ts is ANON/Public key. RLS allows inserts?
// The user previously said "RLS for public access was enabled".
// "create policy "Acesso Publico Clientes" on public.clients for all using (true);"
// So public key should work for inserts.

const supabase = createClient(supabaseUrl, supabaseKey);

const csvFilePath = path.join(__dirname, 'Sheet_BD_CLIENTES.csv');

function parseCSV(text) {
    const lines = text.split('\n');
    const result = [];
    // Start from index 2 (skipping empty line 0 and header line 1)

    for (let i = 2; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const row = [];
        let inQuote = false;
        let currentField = '';

        for (let j = 0; j < lines[i].length; j++) {
            const char = lines[i][j];
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                row.push(currentField.trim().replace(/^"|"$/g, ''));
                currentField = '';
            } else {
                currentField += char;
            }
        }
        row.push(currentField.trim().replace(/^"|"$/g, ''));

        if (row.length > 1) { // Avoid empty rows
            result.push(row);
        }
    }
    return result;
}

async function importClients() {
    try {
        const fileContent = fs.readFileSync(csvFilePath, 'utf-8'); // Hope it reads decently
        const rows = parseCSV(fileContent);

        console.log(`Found ${rows.length} rows to process.`);

        for (const row of rows) {
            // Indices based on investigation
            // 1: Nome
            // 2: CPF / CNPJ
            // 6: tipo_cliente
            // 7: Telefone
            // 8: Email
            // 14: Endereço (Full)
            // 15: end_rua
            // 16: end_numero
            // 17: end_bairro
            // 19: end_CEP
            // 20: end_cidade
            // 21: end_estado
            // 22: Cliente / Fornecedor
            // 23: Informações Adicionais

            const nome = row[1];
            if (!nome || nome === '0') continue;

            const tipoCliente = row[6] || '';
            const classificacao = row[22] || '';
            const obs = row[23] || '';
            const addressFull = row[14] || `${row[15] || ''}, ${row[16] || ''} - ${row[17] || ''}`;

            const newClient = {
                name: nome,
                document: row[2] || '',
                phone: row[7] || '',
                email: row[8] || '',
                address: addressFull.replace(/^, - $/, ''), // Cleanup empty address
                city: row[20] || '',
                state: row[21] || '',
                zip_code: row[19] || '',
                notes: `Tipo: ${tipoCliente} | Classificação: ${classificacao} | Obs: ${obs}`.trim()
            };

            // Clean up
            Object.keys(newClient).forEach(key => {
                if (!newClient[key]) newClient[key] = '';
            });

            console.log(`Importing: ${newClient.name}`);

            const { error } = await supabase
                .from('clients')
                .insert([newClient]);

            if (error) {
                console.error(`Error inserting ${newClient.name}:`, error.message);
            }
        }
        console.log('Import finished.');
    } catch (err) {
        console.error('Error:', err);
    }
}

importClients();
