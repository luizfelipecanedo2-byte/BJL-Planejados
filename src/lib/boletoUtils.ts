// Utilitário para validação e decodificação de Boletos Brasileiros (Febraban)
// Suporta Boletos de Cobrança Bancária (47 dígitos) e Concessionárias/Tributos (48 dígitos)

export interface DecodedBoleto {
    isValid: boolean;
    type: 'bancario' | 'concessionaria' | 'invalido';
    cleanCode: string;
    formattedCode: string;
    bankCode?: string;
    bankName?: string;
    amount?: number;
    dueDate?: string; // Formato YYYY-MM-DD
    rawDueDate?: Date;
    errorMessage?: string;
}

const BANK_NAMES: Record<string, string> = {
    '001': 'Banco do Brasil',
    '033': 'Santander',
    '104': 'Caixa Econômica',
    '237': 'Bradesco',
    '341': 'Banco Itaú',
    '260': 'Nubank',
    '077': 'Banco Inter',
    '212': 'Banco Original',
    '422': 'Banco Safra',
    '748': 'Sicredi',
    '756': 'Sicoob',
    '389': 'Banco Mercantil',
    '655': 'Banco Votorantim',
    '208': 'BTG Pactual',
    '041': 'Banrisul',
    '136': 'Unicred',
    '464': 'Banco Sumitomo Mitsui',
    '633': 'Banco Rendimento'
};

/**
 * Converte fator de vencimento Febraban em data real (YYYY-MM-DD).
 * Fator base original: 07/10/1997.
 * Novo ciclo Febraban (iniciado em 22/02/2025 quando o fator atingiu 9999):
 * Fator 1000 = 22/02/2025.
 */
function decodeExpirationDate(factorStr: string): { str: string; date: Date } | null {
    const factor = parseInt(factorStr, 10);
    if (isNaN(factor) || factor <= 0) return null;

    // Data base inicial da Febraban
    const baseDateOld = new Date(1997, 9, 7); // 07/10/1997 (mês 9 é outubro no JS)
    const dueDateOld = new Date(baseDateOld.getTime() + factor * 24 * 60 * 60 * 1000);

    // Novo ciclo Febraban (após 21/02/2025)
    // Em 21/02/2025 o fator atingiu 9999. Em 22/02/2025 o fator reiniciou em 1000.
    const baseDateNew = new Date(2025, 1, 22); // 22/02/2025
    const dueDateNew = new Date(baseDateNew.getTime() + (factor - 1000) * 24 * 60 * 60 * 1000);

    const now = new Date();
    // Se a data antiga calculada for anterior a 2025 e hoje estamos em 2025+, usamos o novo ciclo
    const finalDate = (now.getFullYear() >= 2025 && dueDateOld.getFullYear() < 2025) ? dueDateNew : dueDateOld;

    const year = finalDate.getFullYear();
    const month = String(finalDate.getMonth() + 1).padStart(2, '0');
    const day = String(finalDate.getDate()).padStart(2, '0');

    return {
        str: `${year}-${month}-${day}`,
        date: finalDate
    };
}

/**
 * Decodifica uma linha digitável ou código de barras de boleto
 */
export function decodeBoleto(input: string): DecodedBoleto {
    if (!input) {
        return { isValid: false, type: 'invalido', cleanCode: '', formattedCode: '', errorMessage: 'Código não informado' };
    }

    // Remove qualquer caractere não numérico
    const clean = input.replace(/\D/g, '');

    // 1. Boleto Bancário de Cobrança (47 dígitos na linha digitável)
    if (clean.length === 47) {
        const bankCode = clean.slice(0, 3);
        const bankName = BANK_NAMES[bankCode] || `Banco ${bankCode}`;

        // Campo 5: posições 33 a 46 (14 dígitos)
        // primeiros 4 dígitos: fator de vencimento (pos 33 a 36 inclusive)
        // últimos 10 dígitos: valor nominal em centavos (pos 37 a 46 inclusive)
        const factorStr = clean.slice(33, 37);
        const amountCentsStr = clean.slice(37, 47);

        const amountCents = parseInt(amountCentsStr, 10);
        const amount = isNaN(amountCents) ? 0 : amountCents / 100;

        const expiration = decodeExpirationDate(factorStr);

        // Formatação visual da linha digitável bancária
        // AAABC.CCCCX DDDDD.DDDDDY EEEEE.EEEEEZ K UUUUVVVVVVVVVV
        const formatted = `${clean.slice(0, 5)}.${clean.slice(5, 10)} ${clean.slice(10, 15)}.${clean.slice(15, 21)} ${clean.slice(21, 26)}.${clean.slice(26, 32)} ${clean.slice(32, 33)} ${clean.slice(33, 47)}`;

        return {
            isValid: true,
            type: 'bancario',
            cleanCode: clean,
            formattedCode: formatted,
            bankCode,
            bankName,
            amount: amount > 0 ? amount : undefined,
            dueDate: expiration?.str,
            rawDueDate: expiration?.date
        };
    }

    // 2. Boleto de Concessionária / Tributos (48 dígitos na linha digitável)
    if (clean.length === 48) {
        // Ex: 846... 
        // Valor geralmente está nos dígitos 4 a 15
        const amountCentsStr = clean.slice(4, 15);
        const amountCents = parseInt(amountCentsStr, 10);
        const amount = isNaN(amountCents) ? 0 : amountCents / 100;

        const formatted = `${clean.slice(0, 12)} ${clean.slice(12, 24)} ${clean.slice(24, 36)} ${clean.slice(36, 48)}`;

        return {
            isValid: true,
            type: 'concessionaria',
            cleanCode: clean,
            formattedCode: formatted,
            bankName: 'Concessionária / Tributo',
            amount: amount > 0 ? amount : undefined
        };
    }

    // 3. Código de barras bruto (44 dígitos)
    if (clean.length === 44) {
        const bankCode = clean.slice(0, 3);
        const bankName = BANK_NAMES[bankCode] || `Banco ${bankCode}`;
        const factorStr = clean.slice(5, 9);
        const amountCentsStr = clean.slice(9, 19);

        const amountCents = parseInt(amountCentsStr, 10);
        const amount = isNaN(amountCents) ? 0 : amountCents / 100;
        const expiration = decodeExpirationDate(factorStr);

        return {
            isValid: true,
            type: 'bancario',
            cleanCode: clean,
            formattedCode: clean,
            bankCode,
            bankName,
            amount: amount > 0 ? amount : undefined,
            dueDate: expiration?.str,
            rawDueDate: expiration?.date
        };
    }

    return {
        isValid: false,
        type: 'invalido',
        cleanCode: clean,
        formattedCode: clean,
        errorMessage: `Linha digitável possui ${clean.length} dígitos (esperado: 47 para bancos ou 48 para concessionárias).`
    };
}
