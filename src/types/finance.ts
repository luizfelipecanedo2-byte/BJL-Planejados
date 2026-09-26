
export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'paid' | 'pending';

export interface Transaction {
    id: string;
    type: TransactionType;
    description: string;
    amount: number;
    category: string;
    subcategory: string;
    service: string; // Produto ou Serviço relacionado
    contact: string; // Cliente ou Fornecedor
    financialInstitution: string;
    paymentMethod: string;
    competenceDate: Date;
    dueDate: Date;
    paymentDate?: Date | null; // Data de Efetivação
    status: TransactionStatus;
    invoiceNumber: string;
    orderService?: string;
    boletoUrl?: string;
    costSplits?: TransactionCostSplit[];
}

export interface TransactionCostSplit {
    id?: string;
    client: string;
    amount: number;
    description: string;
}

// Categorias Ativas e Oficiais (exibidas para NOVOS lançamentos)
export const ACTIVE_CATEGORIES = {
    income: [
        "Receita com Serviço",
        "Receitas Financeiras",
        "Transferência"
    ],
    expense: [
        "Custo com Materiais e Obras",
        "Despesas com Vendas",
        "Despesas Operacionais",
        "Despesas com Pessoal",
        "Despesas com Maquinário e Veículos",
        "Impostos sobre Vendas",
        "Despesas Financeiras",
        "Transferência"
    ]
};

// Categorias Legadas (reconhecidas para manter 100% de compatibilidade com os dados anteriores)
export const LEGACY_CATEGORIES = {
    income: [
        "Receita com prestação de serviços",
        "Receita Investimento"
    ],
    expense: [
        "Despesa com Serviço",
        "Custo dos serviços",
        "Despesa Operacional",
        "Despesas administrativas",
        "Despesa com Pessoal",
        "Despesas com pessoal",
        "Despesa com Maquinário",
        "Maquinario",
        "Impostos",
        "Outras deduções"
    ]
};

// Todas as categorias unificadas (para relatórios, filtros e tabelas)
export const CATEGORIES = {
    income: [
        ...ACTIVE_CATEGORIES.income,
        ...LEGACY_CATEGORIES.income
    ],
    expense: [
        ...ACTIVE_CATEGORIES.expense,
        ...LEGACY_CATEGORIES.expense
    ]
};

export const SUBCATEGORIES: Record<string, string[]> = {
    "Receita com Serviço": [
        "Entrada",
        "Parcela",
        "Restante",
        "Valor Total",
        "Venda à Vista"
    ],
    "Receitas Financeiras": [
        "Rendimento de Aplicação",
        "Juros Recebidos",
        "Descontos Obtidos"
    ],
    "Impostos sobre Vendas": [
        "Simples Nacional (DAS)",
        "ISS",
        "ICMS",
        "PIS/COFINS",
        "Nota Fiscal Emitida",
        "Outros Tributos"
    ],
    "Custo com Materiais e Obras": [
        "Compra de MDF e Madeira",
        "Ferragens e Corrediças",
        "Fitas de Borda e Colas",
        "Vidros, Espelhos e Serralheria",
        "Puxadores e Acessórios",
        "Mão de Obra Terceirizada (Montagem/Corte)",
        "Frete de Entrega da Obra",
        "Outros Insumos da Obra"
    ],
    "Despesas com Vendas": [
        "Comissão de Vendas",
        "RT Arquiteto / Reserva Técnica",
        "Marketing e Redes Sociais",
        "Tráfego Pago / Anúncios",
        "Material Promocional e Brindes",
        "Outros Custos Comerciais"
    ],
    "Despesas Operacionais": [
        "Aluguel da Oficina / Galpão / Loja",
        "Energia Elétrica",
        "Água e Esgoto",
        "Internet e Telefone",
        "Sistemas e Software (Promob/Corte)",
        "Contabilidade / Contador",
        "Material de Escritório e Limpeza",
        "Alvarás e Taxas Municipais"
    ],
    "Despesas com Pessoal": [
        "Salário Fixo da Equipe",
        "Alimentação e Refeição",
        "Pró-Labore / Retirada dos Sócios",
        "Encargos (INSS / FGTS)",
        "Bônus e Gratificações",
        "Uniformes e EPIs"
    ],
    "Despesas com Maquinário e Veículos": [
        "Manutenção de Máquinas (Seccionadora, Coladeira etc.)",
        "Peças, Serras e Lâminas",
        "Combustível e Lubrificantes",
        "Manutenção de Veículos / Van",
        "IPVA / Seguro de Veículos"
    ],
    "Despesas Financeiras": [
        "Taxas de Maquininha de Cartão",
        "Tarifas Bancárias e Boletos",
        "Juros de Antecipação de Recebíveis",
        "Juros de Empréstimos e Financiamentos",
        "Multas e Encargos Financeiros"
    ],
    "Transferência": [
        "Transferência entre Contas",
        "Retirada para Caixa",
        "Depósito Bancário",
        "Aporte de Capital",
        "Empréstimo Tomado / Pago"
    ],
    // Mapeamento retrocompatível para categorias legadas existentes no banco
    "Impostos": [
        "Simples Nacional",
        "DAS",
        "ICMS",
        "ISS",
        "PIS/COFINS",
        "IRPJ/CSLL",
        "IPTU",
        "IPVA"
    ],
    "Despesa Operacional": [
        "Água",
        "Aluguel",
        "Energia",
        "Internet",
        "Material de Escritório",
        "Sistemas",
        "Telefone",
        "Contabilidade"
    ],
    "Despesa com Serviço": [
        "Compra de Material",
        "Frete",
        "Mão de Obra",
        "Outros custos",
        "RT Arquiteto"
    ],
    "Despesa com Maquinário": [
        "Manutenção",
        "Peças",
        "Combustível",
        "Outros"
    ],
    "Despesas administrativas": [
        "Aluguel",
        "Energia",
        "Água",
        "Internet",
        "Telefone",
        "Contabilidade",
        "Contador",
        "Sistemas",
        "Promob",
        "maquininha de cartao",
        "Tarifa de banco",
        "Desconto do banco"
    ]
};

export const PAYMENT_METHODS = [
    "Dinheiro",
    "Pix",
    "Boleto",
    "Cartão Itaú",
    "Cartão C6",
    "Cartão Nubank",
    "Cartão Inter",
    "Cartão Mercado Pago",
    "Cartão Recarga Pay"
];

export const FINANCIAL_INSTITUTIONS = [
    "Banco Itaú",
    "Dinheiro",
    "Mercado Pago",
    "Recarga Pay",
    "Nubank"
];

export type DREGroupKey = 
    | 'receita_bruta'
    | 'deducoes_impostos'
    | 'custos_producao'      // CPV / CSP
    | 'despesas_vendas'      // Comercial, Marketing, RT
    | 'despesas_operacionais'// Administrativo, Galpão, Luz, Contador
    | 'despesas_pessoal'     // Salários fixos, Alimentação, Pró-Labore
    | 'despesas_maquinario'  // Manutenção máquinas, peças, combustível
    | 'despesas_financeiras' // Taxa maquininha, juros, tarifas
    | 'receitas_financeiras' // Rendimentos de aplicação
    | 'transferencias';      // Não operacional / Neutro

export const DRE_CANONICAL_GROUPS: Record<DREGroupKey, { name: string; type: 'income' | 'expense'; order: number }> = {
    receita_bruta: { name: "Receita com Serviço", type: 'income', order: 1 },
    deducoes_impostos: { name: "Impostos sobre Vendas", type: 'expense', order: 2 },
    custos_producao: { name: "Custo com Materiais e Obras", type: 'expense', order: 3 },
    despesas_vendas: { name: "Despesas com Vendas", type: 'expense', order: 4 },
    despesas_operacionais: { name: "Despesas Operacionais", type: 'expense', order: 5 },
    despesas_pessoal: { name: "Despesas com Pessoal", type: 'expense', order: 6 },
    despesas_maquinario: { name: "Despesas com Maquinário e Veículos", type: 'expense', order: 7 },
    despesas_financeiras: { name: "Despesas Financeiras", type: 'expense', order: 8 },
    receitas_financeiras: { name: "Receitas Financeiras", type: 'income', order: 9 },
    transferencias: { name: "Transferências", type: 'expense', order: 10 }
};

/**
 * Normaliza e padroniza os nomes de subcategorias na DRE,
 * eliminando duplicidades por grafia ou codificação.
 */
export const standardizeDRESubcategory = (canonicalCategory: string, rawSub?: string | null): string => {
    const cleanStr = (rawSub || '').trim();
    const s = cleanStr.toLowerCase();

    if (!s || s === '(sem subcategoria)' || s.includes('editar esta sub') || s === '-') {
        return 'Outros / Diversos';
    }

    // Despesas com Pessoal
    if (canonicalCategory === 'Despesas com Pessoal') {
        if (s.includes('sal')) return 'Salário Fixo da Equipe';
        if (s.includes('alim') || s.includes('refei') || s.includes('churrasco') || s.includes('comida') || s.includes('copos')) return 'Alimentação e Refeição';
        if (s.includes('inss') || s.includes('fgts') || s.includes('encargo')) return 'Encargos (INSS / FGTS)';
        if (s.includes('bon') || s.includes('gratifica') || s.includes('extra')) return 'Bônus e Gratificações';
        if (s.includes('pró-labore') || s.includes('pro-labore') || s.includes('felipe') || s.includes('matheus')) return 'Pró-Labore / Retirada dos Sócios';
        if (s.includes('uniforme') || s.includes('epi')) return 'Uniformes e EPIs';
    }

    // Custo com Materiais e Obras
    if (canonicalCategory === 'Custo com Materiais e Obras') {
        if (s.includes('mdf') || s.includes('madeira') || s.includes('material') || s.includes('marcenaria')) return 'Compra de MDF e Madeira';
        if (s.includes('ferrag') || s.includes('corredi')) return 'Ferragens e Corrediças';
        if (s.includes('fita') || s.includes('cola')) return 'Fitas de Borda e Colas';
        if (s.includes('vidro') || s.includes('espelho') || s.includes('serralheria')) return 'Vidros e Serralheria';
        if (s.includes('puxador')) return 'Puxadores e Acessórios';
        if (s.includes('mão de obra') || s.includes('mao de obra') || s.includes('montagem') || s.includes('obra')) return 'Mão de Obra Terceirizada';
        if (s.includes('frete')) return 'Frete de Entrega da Obra';
    }

    // Despesas Operacionais
    if (canonicalCategory === 'Despesas Operacionais') {
        if (s.includes('aluguel')) return 'Aluguel da Oficina / Galpão / Loja';
        if (s.includes('energia') || s.includes('luz')) return 'Energia Elétrica';
        if (s.includes('água') || s.includes('agua') || s.includes('esgoto') || s.includes('gua')) return 'Água e Esgoto';
        if (s.includes('internet') || s.includes('telefone')) return 'Internet e Telefone';
        if (s.includes('sistema') || s.includes('promob') || s.includes('software') || s.includes('corte') || s.includes('notebook') || s.includes('computador')) return 'Sistemas e Software (Promob/Corte)';
        if (s.includes('contab') || s.includes('contador')) return 'Contabilidade / Contador';
        if (s.includes('alvará') || s.includes('alvara') || s.includes('taxa') || s.includes('detran')) return 'Alvarás e Taxas Municipais';
        if (s.includes('escritório') || s.includes('escritorio') || s.includes('limpeza') || s.includes('etiqueta')) return 'Material de Escritório e Limpeza';
        if (s.includes('desconto') || s.includes('abatimento')) return 'Descontos e Abatimentos';
    }

    // Despesas com Maquinário e Veículos
    if (canonicalCategory === 'Despesas com Maquinário e Veículos') {
        if (s.includes('manuten')) return 'Manutenção de Máquinas';
        if (s.includes('peça') || s.includes('peca') || s.includes('lâmina') || s.includes('serra') || s.includes('ferramenta')) return 'Peças e Ferramental';
        if (s.includes('combust') || s.includes('gasolina') || s.includes('carro') || s.includes('veículo') || s.includes('veiculo') || s.includes('gas')) return 'Combustível e Manutenção Veículos';
    }

    // Despesas com Vendas
    if (canonicalCategory === 'Despesas com Vendas') {
        if (s.includes('comiss')) return 'Comissão de Vendas';
        if (s.includes('rt') || s.includes('arquiteto') || s.includes('reserva')) return 'RT Arquiteto / Reserva Técnica';
        if (s.includes('instagram') || s.includes('marketing') || s.includes('tráfego') || s.includes('trafego') || s.includes('anúncio')) return 'Marketing e Redes Sociais';
        if (s.includes('brinde') || s.includes('promocional')) return 'Material Promocional e Brindes';
    }

    // Impostos sobre Vendas
    if (canonicalCategory === 'Impostos sobre Vendas') {
        if (s.includes('simples') || s.includes('das') || s.includes('imposto')) return 'Simples Nacional (DAS)';
        if (s.includes('iss')) return 'ISS';
        if (s.includes('icms')) return 'ICMS';
        if (s.includes('nota fiscal')) return 'Nota Fiscal Emitida';
    }

    // Despesas Financeiras
    if (canonicalCategory === 'Despesas Financeiras') {
        if (s.includes('maquininha') || s.includes('cartão') || s.includes('cartao')) return 'Taxas de Cartão e Maquininha';
        if (s.includes('tarifa') || s.includes('desconto do banco') || s.includes('banco') || s.includes('juros')) return 'Tarifas Bancárias e Juros';
    }

    // Receita com Serviço
    if (canonicalCategory === 'Receita com Serviço') {
        if (s.includes('entrad')) return 'Entrada';
        if (s.includes('parcel')) return 'Parcela';
        if (s.includes('restant')) return 'Restante';
        if (s.includes('total')) return 'Valor Total';
        if (s.includes('vista')) return 'Venda à Vista';
    }

    // Receitas Financeiras
    if (canonicalCategory === 'Receitas Financeiras') {
        if (s.includes('rendimento')) return 'Rendimento de Aplicação';
        if (s.includes('juro')) return 'Juros Recebidos';
        if (s.includes('desconto')) return 'Descontos Obtidos';
    }

    return cleanStr.charAt(0).toUpperCase() + cleanStr.slice(1);
};

/**
 * Classificador inteligente de lançamentos para a DRE
 * Suporta categorias novas e legadas presentes no banco de dados.
 */
export const classifyTransactionForDRE = (t: {
    type: TransactionType;
    category?: string | null;
    subcategory?: string | null;
    description?: string | null;
}): DREGroupKey => {
    const norm = (s?: string | null) => (s || '').toLowerCase().trim();
    const cat = norm(t.category);
    const sub = norm(t.subcategory);
    const desc = norm(t.description);

    if (cat.includes('transferência') || cat.includes('transferencia')) {
        return 'transferencias';
    }

    if (t.type === 'income') {
        if (cat.includes('financeira') || cat.includes('investimento') || sub.includes('rendimento') || desc.includes('rendimento')) {
            return 'receitas_financeiras';
        }
        return 'receita_bruta';
    }

    // Classificação de Despesas / Custos:
    // 1. Impostos / Deduções
    if (
        cat.includes('imposto') || 
        cat.includes('dedução') || 
        cat.includes('deducao') ||
        sub.includes('simples nacional') ||
        sub.includes('das') ||
        sub.includes('iss') ||
        sub.includes('icms') ||
        sub.includes('pis') ||
        sub.includes('cofins') ||
        sub.includes('tributo') ||
        sub.includes('imposto') ||
        desc.includes('simples nacional') ||
        desc.includes('guia das') ||
        desc.includes('imposto')
    ) {
        return 'deducoes_impostos';
    }

    // 2. Despesas Financeiras (Taxas de cartão, tarifas bancárias, juros)
    if (
        cat.includes('financeira') ||
        sub.includes('maquininha') ||
        sub.includes('tarifa') ||
        sub.includes('banco') ||
        sub.includes('juros') ||
        sub.includes('antecipação') ||
        sub.includes('antecipacao') ||
        sub.includes('cartão') ||
        sub.includes('cartao') ||
        desc.includes('maquininha') ||
        desc.includes('tarifa de banco') ||
        desc.includes('taxa cartão') ||
        desc.includes('taxa cartao') ||
        desc.includes('desconto do banco')
    ) {
        return 'despesas_financeiras';
    }

    // 3. Custos Diretos com Obra / Produção (CPV / CSP)
    if (
        cat.includes('custo com materiais') ||
        cat.includes('custo dos serviços') ||
        cat.includes('custo dos servicos') ||
        cat.includes('despesa com serviço') ||
        cat.includes('despesa com servico') ||
        sub.includes('mdf') ||
        sub.includes('madeira') ||
        sub.includes('ferragem') ||
        sub.includes('fita de borda') ||
        sub.includes('compra de material') ||
        sub.includes('insumo') ||
        sub.includes('vidro') ||
        sub.includes('puxador') ||
        (sub.includes('frete') && !sub.includes('vendas')) ||
        (cat.includes('serviço') && sub.includes('mão de obra')) ||
        sub.includes('marcenaria') ||
        sub.includes('obra') ||
        sub.includes('mão de obra') ||
        sub.includes('mao de obra') ||
        desc.includes('mdf') ||
        desc.includes('madeira') ||
        desc.includes('compensado')
    ) {
        return 'custos_producao';
    }

    // 4. Despesas Comerciais e Vendas (Comissão, RT Arquiteto, Marketing)
    if (
        cat.includes('vendas') ||
        cat.includes('comercial') ||
        sub.includes('comissão') ||
        sub.includes('comissao') ||
        sub.includes('rt arquiteto') ||
        sub.includes('reserva técnica') ||
        sub.includes('marketing') ||
        sub.includes('tráfego') ||
        sub.includes('trafego') ||
        sub.includes('instagram') ||
        sub.includes('brinde') ||
        desc.includes('comissão') ||
        desc.includes('rt ')
    ) {
        return 'despesas_vendas';
    }

    // 5. Despesas com Maquinário e Veículos
    if (
        cat.includes('maquinário') ||
        cat.includes('maquinario') ||
        sub.includes('seccionadora') ||
        sub.includes('coladeira') ||
        sub.includes('lâmina') ||
        sub.includes('lamina') ||
        sub.includes('serra') ||
        sub.includes('peças') ||
        sub.includes('pecas') ||
        sub.includes('combustível') ||
        sub.includes('combustivel') ||
        sub.includes('gasolina') ||
        sub.includes('van') ||
        sub.includes('veículo') ||
        sub.includes('veiculo') ||
        sub.includes('carro') ||
        sub.includes('gas') ||
        sub.includes('manuten')
    ) {
        return 'despesas_maquinario';
    }

    // 6. Despesas com Pessoal
    if (
        cat.includes('pessoal') ||
        sub.includes('salário') ||
        sub.includes('salario') ||
        sub.includes('alimentação') ||
        sub.includes('alimentacao') ||
        sub.includes('pró-labore') ||
        sub.includes('pro-labore') ||
        sub.includes('inss') ||
        sub.includes('fgts') ||
        sub.includes('bônus') ||
        sub.includes('bonus') ||
        sub.includes('churrasco') ||
        sub.includes('comida') ||
        sub.includes('copos') ||
        sub.includes('felipe') ||
        sub.includes('matheus')
    ) {
        return 'despesas_pessoal';
    }

    // 7. Despesas Operacionais Fixas / Administrativas (Padrão)
    return 'despesas_operacionais';
};


