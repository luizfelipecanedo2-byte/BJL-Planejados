// Parser inteligente de extratos bancários Itaú (OFX e CSV)

export interface BankStatementItem {
    id: string;
    fitid?: string;
    date: Date;
    dateStr: string; // YYYY-MM-DD
    displayDate: string; // DD/MM/AAAA
    amount: number;
    type: 'credit' | 'debit';
    memo: string;
    cleanMemo: string;
    suggestedCategory?: string;
    status: 'matched' | 'partial_match' | 'unmatched';
    matchedTransactionId?: string;
    matchedTransactionDesc?: string;
}

/**
 * Remove códigos bancários desnecessários e deixa o nome amigável
 * Ex: "PIX TRANSF LOJA ROSSI 123456" -> "Loja Rossi"
 */
export function cleanMemoText(memo: string): string {
    if (!memo) return "Transação Bancária";

    let clean = memo
        .replace(/PIX TRANSF/gi, '')
        .replace(/PIX ENVIADO/gi, '')
        .replace(/PIX RECEBIDO/gi, '')
        .replace(/COMPRA CARTAO/gi, '')
        .replace(/PAGAMENTO BOLETO/gi, '')
        .replace(/PGTO BOLETO/gi, '')
        .replace(/TARIFA MENSAL/gi, 'Tarifa Bancária')
        .replace(/RENDIMENTO APLIC/gi, 'Rendimento de Aplicação')
        .replace(/TRANSF ELET DIR/gi, 'TED')
        .replace(/\b\d{6,}\b/g, '') // remove números longos/protocolos
        .replace(/\s+/g, ' ')
        .trim();

    return clean || memo;
}

export interface SuggestedCategoryInfo {
    category: string;
    subcategory: string;
}

export function suggestCategoryAndSubcategory(memo: string, type: 'credit' | 'debit'): SuggestedCategoryInfo {
    const text = (memo || '').toLowerCase();

    if (type === 'credit') {
        if (text.includes('rendimento') || text.includes('cdi') || text.includes('juros') || text.includes('aplic')) {
            return { category: 'Receitas financeiras', subcategory: 'Rendimento' };
        }
        return { category: 'Receita com Serviço', subcategory: 'Parcela' };
    }

    if (text.includes('tarifa') || text.includes('manut') || text.includes('iof') || text.includes('anuidade') || text.includes('banco') || text.includes('itau')) {
        return { category: 'Despesas administrativas', subcategory: 'Tarifas Bancárias' };
    }
    if (text.includes('ced') || text.includes('bruta') || text.includes('madeira') || text.includes('mdf') || text.includes('compensado') || text.includes('fita')) {
        return { category: 'Despesa com Serviço', subcategory: 'Compra de Material' };
    }
    if (text.includes('rossi') || text.includes('parafuso') || text.includes('ferrag') || text.includes('cola') || text.includes('tint') || text.includes('verniz') || text.includes('puxador') || text.includes('corredica') || text.includes('dobradica') || text.includes('rodizio')) {
        return { category: 'Despesa com Serviço', subcategory: 'Compra de Material' };
    }
    if (text.includes('posto') || text.includes('combustivel') || text.includes('gasolina') || text.includes('etanol') || text.includes('diesel') || text.includes('shell') || text.includes('ipiranga') || text.includes('petrobras')) {
        return { category: 'Despesa com Maquinário', subcategory: 'Combustível' };
    }
    if (text.includes('almoco') || text.includes('lanche') || text.includes('refeicao') || text.includes('restaurante') || text.includes('padaria') || text.includes('marmita') || text.includes('ifood')) {
        return { category: 'Despesa com Pessoal', subcategory: 'Alimentação' };
    }
    if (text.includes('aluguel') || text.includes('energia') || text.includes('enel') || text.includes('cemig') || text.includes('sabesp') || text.includes('copasa') || text.includes('internet') || text.includes('claro') || text.includes('vivo')) {
        return { category: 'Despesa Operacional', subcategory: 'Energia' };
    }
    if (text.includes('das') || text.includes('simples') || text.includes('tributo') || text.includes('receita federal') || text.includes('gps')) {
        return { category: 'Impostos', subcategory: 'Simples Nacional' };
    }
    return { category: 'Despesa Operacional', subcategory: 'Outros' };
}

export function suggestCategory(memo: string): string {
    return suggestCategoryAndSubcategory(memo, 'debit').category;
}

/**
 * Converte data no formato OFX (ex: 20260923120000 ou 20260923) para Date
 */
function parseOfxDate(dateStr: string): Date {
    const clean = dateStr.trim();
    if (clean.length >= 8) {
        const year = parseInt(clean.slice(0, 4), 10);
        const month = parseInt(clean.slice(4, 6), 10) - 1;
        const day = parseInt(clean.slice(6, 8), 10);
        return new Date(year, month, day, 12, 0, 0);
    }
    return new Date();
}

/**
 * Parser de arquivo OFX (padrão Itaú / Febraban)
 */
export function parseOFX(content: string): BankStatementItem[] {
    const items: BankStatementItem[] = [];

    // Busca blocos <STMTTRN>...</STMTTRN>
    const regex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;

    let idx = 0;
    while ((match = regex.exec(content)) !== null) {
        const block = match[1];

        const trntypeMatch = block.match(/<TRNTYPE>([^\r\n<]+)/i);
        const dtpostedMatch = block.match(/<DTPOSTED>([^\r\n<]+)/i);
        const trnamtMatch = block.match(/<TRNAMT>([^\r\n<]+)/i);
        const fitidMatch = block.match(/<FITID>([^\r\n<]+)/i);
        const memoMatch = block.match(/<MEMO>([^\r\n<]+)/i);

        const rawAmount = parseFloat((trnamtMatch?.[1] || '0').replace(',', '.'));
        const date = dtpostedMatch ? parseOfxDate(dtpostedMatch[1]) : new Date();

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const displayDate = `${day}/${month}/${year}`;

        const memo = (memoMatch?.[1] || '').trim();
        const clean = cleanMemoText(memo);
        const type = rawAmount >= 0 ? 'credit' : 'debit';
        const absAmount = Math.abs(rawAmount);

        items.push({
            id: `ofx-${idx++}-${Date.now()}`,
            fitid: fitidMatch?.[1]?.trim(),
            date,
            dateStr,
            displayDate,
            amount: absAmount,
            type,
            memo,
            cleanMemo: clean,
            suggestedCategory: suggestCategory(memo),
            status: 'unmatched'
        });
    }

    return items;
}

/**
 * Parser de arquivo CSV do Itaú (ex: Data;Lançamento;Valor;Saldo)
 */
export function parseCSV(content: string): BankStatementItem[] {
    const items: BankStatementItem[] = [];
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);

    let idx = 0;
    for (const line of lines) {
        // Ignora cabeçalhos comuns do Itaú
        if (line.toLowerCase().includes('data') && line.toLowerCase().includes('valor')) continue;
        if (line.toLowerCase().includes('saldo') && line.toLowerCase().includes('extrato')) continue;

        // Suporta delimitador ponto e vírgula ou vírgula
        const separator = line.includes(';') ? ';' : ',';
        const parts = line.split(separator).map(p => p.replace(/^"|"$/g, '').trim());

        if (parts.length < 3) continue;

        // Data (DD/MM/AAAA)
        const datePart = parts[0];
        const dateMatch = datePart.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (!dateMatch) continue;

        const day = dateMatch[1].padStart(2, '0');
        const month = dateMatch[2].padStart(2, '0');
        let yearStr = dateMatch[3];
        if (yearStr.length === 2) yearStr = `20${yearStr}`;
        const year = parseInt(yearStr, 10);

        const date = new Date(year, parseInt(month, 10) - 1, parseInt(day, 10), 12, 0, 0);
        const dateStr = `${year}-${month}-${day}`;
        const displayDate = `${day}/${month}/${year}`;

        const memo = parts[1] || 'Lançamento Bancário';

        // Valor
        const rawAmountStr = parts[2].replace('R$', '').replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
        const rawAmount = parseFloat(rawAmountStr);
        if (isNaN(rawAmount)) continue;

        const type = rawAmount >= 0 ? 'credit' : 'debit';
        const absAmount = Math.abs(rawAmount);

        items.push({
            id: `csv-${idx++}-${Date.now()}`,
            date,
            dateStr,
            displayDate,
            amount: absAmount,
            type,
            memo,
            cleanMemo: cleanMemoText(memo),
            suggestedCategory: suggestCategory(memo),
            status: 'unmatched'
        });
    }

    return items;
}

/**
 * Detecta automaticamente o formato e processa o arquivo
 */
export function parseOfxOrCsv(fileName: string, content: string): BankStatementItem[] {
    const isOfx = fileName.toLowerCase().endsWith('.ofx') || content.includes('<OFX>') || content.includes('<STMTTRN>');
    if (isOfx) {
        return parseOFX(content);
    }
    return parseCSV(content);
}

export interface MatchedResultItem {
    statementItem: BankStatementItem;
    crmTransaction?: any;
    confidence: 'exact' | 'probable' | 'none';
}

/**
 * Cruza o extrato bancário com os lançamentos cadastrados no CRM
 */
export function matchBankItemsWithCRM(statementItems: BankStatementItem[], crmTransactions: any[]): {
    matched: MatchedResultItem[];
    unmatched: BankStatementItem[];
} {
    const matched: MatchedResultItem[] = [];
    const unmatched: BankStatementItem[] = [];
    const usedTxIds = new Set<string>();

    for (const item of statementItems) {
        const expectedType = item.type === 'credit' ? 'income' : 'expense';

        // 1. Busca correspondência exata: mesmo tipo e valor idêntico (diferença <= 0.02)
        const candidates = crmTransactions.filter(tx => {
            if (usedTxIds.has(tx.id)) return false;
            if (tx.type !== expectedType) return false;
            return Math.abs(tx.amount - item.amount) <= 0.05;
        });

        if (candidates.length > 0) {
            // Escolhe o candidato com a menor diferença de dias
            let bestCandidate = candidates[0];
            let smallestDaysDiff = Infinity;

            const itemTime = item.date.getTime();

            for (const c of candidates) {
                const txDate = new Date(c.paymentDate || c.dueDate || c.competenceDate).getTime();
                const daysDiff = Math.abs(itemTime - txDate) / (1000 * 60 * 60 * 24);
                if (daysDiff < smallestDaysDiff) {
                    smallestDaysDiff = daysDiff;
                    bestCandidate = c;
                }
            }

            // Se a diferença for menor que 7 dias, consideramos batido
            if (smallestDaysDiff <= 7) {
                usedTxIds.add(bestCandidate.id);
                matched.push({
                    statementItem: {
                        ...item,
                        status: 'matched',
                        matchedTransactionId: bestCandidate.id,
                        matchedTransactionDesc: bestCandidate.description
                    },
                    crmTransaction: bestCandidate,
                    confidence: smallestDaysDiff <= 1 ? 'exact' : 'probable'
                });
                continue;
            }
        }

        unmatched.push({
            ...item,
            status: 'unmatched'
        });
    }

    return { matched, unmatched };
}
