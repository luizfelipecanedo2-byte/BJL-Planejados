
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://wbbzeaydeyhpbugomxra.supabase.co';
const supabaseKey = 'sb_publishable__zle9WhSPyzY8s5v2lV3Xg_xacH2h8L';
const supabase = createClient(supabaseUrl, supabaseKey);

const csvFilePath = path.join(__dirname, 'Sheet_LANCAMENTOS.csv');

function parseCSV(text) {
    const lines = text.split('\n');
    const result = [];

    // Header logic (unchanged)
    let headerIndex = -1;
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
        if (lines[i].includes('RecDesp') && lines[i].includes('Valor')) {
            headerIndex = i;
            break;
        }
    }

    if (headerIndex === -1) return [];

    for (let i = headerIndex + 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

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

        if (row.length > 20) result.push(row);
    }
    return result;
}

function parseDate(dateStr) {
    if (!dateStr || dateStr.trim() === '') return null;

    // Trying MM/DD/YYYY standard from Excel csv export
    // The previous run (ID 899) failed with "2026-19-01" -> Month 19 invalid.
    // Excel usually exports MM/DD/YYYY unless system locale is BR.
    // If system locale is BR, it exports DD/MM/YYYY.
    // BUT the error "month 19" means it interpreted '19' as month.
    // So '19/01/2026' was parsed as M=19, D=01.
    // This happened when I forced the "Standard American" logic (M/D/Y).

    // SO: The date in CSV IS DD/MM/YYYY (Brazilian).
    // Example: 19/01/2026 (19th Jan).
    // My previous code (ID 903) tried: const month = parts[0] (19) -> ERROR.

    // CORRECT LOGIC FOR BR DATE (DD/MM/YYYY):
    // parts[0] = Day
    // parts[1] = Month
    // parts[2] = Year

    const parts = dateStr.split('/');
    if (parts.length === 3) {
        // Input: DD/MM/YYYY (e.g., 31/01/2026)
        const month = parts[0].padStart(2, '0');
        const day = parts[1].padStart(2, '0');
        const year = parts[2];
        // Output must be: YYYY-MM-DD
        return `${year}-${month}-${day}`;
    }

    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return null;
}

function parseCurrency(valStr) {
    if (!valStr) return 0;
    let clean = valStr.replace('R$', '').trim();
    if (clean.includes(',') && clean.includes('.')) {
        if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
            clean = clean.replace(/\./g, '').replace(',', '.');
        } else {
            clean = clean.replace(/,/g, '');
        }
    } else if (clean.includes(',')) {
        clean = clean.replace(',', '.');
    }
    return parseFloat(clean) || 0;
}

async function importTransactions() {
    try {
        const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
        const rows = parseCSV(fileContent);

        console.log(`Found ${rows.length} transactions.`);

        let count = 0;
        for (const row of rows) {
            const recDesp = row[3];
            const description = row[19];
            const valStr = row[20];

            if (!description && !valStr) continue;

            const type = (recDesp && recDesp.toLowerCase().includes('desp')) || (recDesp && recDesp.toLowerCase().includes('pagar')) ? 'expense' : 'income';
            const amount = parseCurrency(valStr);
            const category = row[17] || 'Outros';
            const subcategory = row[18] || '';
            const financialInst = row[15] || '';
            const paymentMethod = row[16] || '';
            const contact = row[14] || '';

            const competenceDate = parseDate(row[11]);
            const dueDate = parseDate(row[12]);
            const paymentDate = parseDate(row[21]);

            const statusStr = row[22];
            const status = (statusStr && statusStr.toLowerCase().includes('conclu')) ? 'paid' : 'pending';
            const invoice = row[23] || '';

            if (amount === 0 && !description) continue;

            let finalBank = financialInst;
            if (financialInst.toLowerCase().includes('itau')) finalBank = 'Banco Itaú';
            if (financialInst.toLowerCase().includes('dinheiro')) finalBank = 'Dinheiro';

            const newTransaction = {
                type: type,
                description: description || 'Sem descrição',
                amount: Math.abs(amount),
                category: category,
                subcategory: subcategory,
                service: '',
                contact: contact,
                financial_institution: finalBank,
                payment_method: paymentMethod,
                competence_date: competenceDate || new Date().toISOString().split('T')[0],
                due_date: dueDate || new Date().toISOString().split('T')[0],
                payment_date: paymentDate,
                status: status,
                invoice_number: invoice,
                order_service: ''
            };

            const { error } = await supabase.from('transactions').insert([newTransaction]);

            if (error) {
                console.error(`Error:`, error.message); // Should be cleaner now
            } else {
                count++;
                if (count % 50 === 0) console.log(`Imported ${count}...`);
            }
        }
        console.log(`Finished. Imported ${count} transactions.`);
    } catch (err) {
        console.error('Error:', err);
    }
}

importTransactions();
