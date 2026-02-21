
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://wbbzeaydeyhpbugomxra.supabase.co';
const supabaseKey = 'sb_publishable__zle9WhSPyzY8s5v2lV3Xg_xacH2h8L';
const supabase = createClient(supabaseUrl, supabaseKey);

async function parseAndImport(filePath, type) {
    console.log(`Processing ${path.basename(filePath)}...`);
    const text = fs.readFileSync(filePath, 'utf-8');
    const lines = text.split('\n');
    let headerIndex = -1;
    let headers = [];

    // Find header row
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('id_cliente') && line.includes('Nome')) {
            headerIndex = i;
            // Parse header line to check column positions if needed
            // For now rely on known indices: 
            // PF: ,id,Nome,CPF,RG,Tel,Email,End,Nac,EC,Prof,Tipo,Obs
            // PJ: ,id,Nome,CNPJ,IE,Tel,Email,End,Adm,CPFAdm,Tipo,Obs
            break;
        }
    }

    if (headerIndex === -1) {
        console.log(`No header found in ${path.basename(filePath)}`);
        return;
    }

    const rows = [];
    for (let i = headerIndex + 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        // Simple CSV split logic handling quotes (same as before)
        const row = [];
        let inQuote = false;
        let currentField = '';
        for (let j = 0; j < lines[i].length; j++) {
            const char = lines[i][j];
            if (char === '"') inQuote = !inQuote;
            else if (char === ',' && !inQuote) {
                row.push(currentField.trim().replace(/^"|"$/g, ''));
                currentField = '';
            } else currentField += char;
        }
        row.push(currentField.trim().replace(/^"|"$/g, ''));

        if (row.length > 2) rows.push(row);
    }

    console.log(`Found ${rows.length} rows in ${path.basename(filePath)}`);

    for (const row of rows) {
        let name, doc, phone, email, address, notes = '';

        // Adjust indices based on finding 1 leading comma (index 0 is empty)
        // If row[1] is id_cliente, row[2] is Nome.

        if (type === 'PF') {
            // PF: ,id,Nome,CPF,RG,Tel,Email,End,Nac,EC,Prof,Tipo,Obs
            name = row[2];
            doc = row[3];
            phone = row[5];
            email = row[6];
            address = row[7];
            const nac = row[8] || '';
            const ec = row[9] || '';
            const prof = row[10] || '';
            const classification = row[11] || ''; // Cliente/Fornecedor
            const obs = row[12] || '';
            notes = `Tipo: PF | Classificação: ${classification} | Nac: ${nac} | EC: ${ec} | Prof: ${prof} | Obs: ${obs}`.trim();
        } else {
            // PJ: ,id,Nome,CNPJ,IE,Tel,Email,End,Adm,CPFAdm,Tipo,Obs
            name = row[2];
            doc = row[3];
            phone = row[5];
            email = row[6];
            address = row[7];
            const adm = row[8] || '';
            const cpfAdm = row[9] || '';
            const classification = row[10] || '';
            const obs = row[11] || '';
            notes = `Tipo: PJ | Classificação: ${classification} | Adm: ${adm} (CPF: ${cpfAdm}) | Obs: ${obs}`.trim();
        }

        if (!name || name === '0') continue;

        // Check duplicate by name (simple check)
        const { data: existing } = await supabase
            .from('clients')
            .select('id')
            .eq('name', name)
            .single();

        if (existing) {
            console.log(`Skipping duplicate: ${name}`);
            continue;
        }

        const newClient = {
            name: name,
            document: doc || '',
            phone: phone || '',
            email: email || '',
            address: address || '',
            notes: notes
        };

        // Clean
        Object.keys(newClient).forEach(k => !newClient[k] && (newClient[k] = ''));

        console.log(`Importing: ${name}`);
        const { error } = await supabase.from('clients').insert([newClient]);
        if (error) console.error(`Error inserting ${name}:`, error.message);
    }
}

async function run() {
    await parseAndImport(path.join(__dirname, 'Sheet_CLIENTES_PF.csv'), 'PF');
    await parseAndImport(path.join(__dirname, 'Sheet_CLIENTES_PJ.csv'), 'PJ');
    console.log('All imports finished.');
}

run();
