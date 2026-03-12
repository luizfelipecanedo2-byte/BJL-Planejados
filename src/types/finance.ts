
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
    paymentDate?: Date; // Data de Efetivação
    status: TransactionStatus;
    invoiceNumber: string;
    orderService?: string;
    boletoUrl?: string;
}

export const CATEGORIES = {
    income: [
        "Receita com Serviço",
        "Receita Investimento",
        "Receitas financeiras",
        "Receita com prestação de serviços",
        "Transferência"
    ],
    expense: [
        "Despesa Operacional",
        "Despesa com Serviço",
        "Despesa com Maquinário",
        "Despesa com Pessoal",
        "Impostos",
        "Despesas administrativas",
        "Outras deduções",
        "Despesas com vendas",
        "Transferência"
    ]
};

export const SUBCATEGORIES: Record<string, string[]> = {
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
    "Despesa com Pessoal": [
        "Alimentação",
        "Salário",
        "INSS",
        "FGTS"
    ],
    "Receita com Serviço": [
        "Entrada",
        "Parcela",
        "Restante",
        "Valor Total"
    ],
    "Transferência": [
        "Transferência entre Contas",
        "Retirada para Caixa",
        "Depósito Bancário"
    ]
};

export const PAYMENT_METHODS = [
    "Dinheiro",
    "Pix",
    "Boleto",
    "Cartão C6",
    "Cartão Nubank",
    "Cartão Inter",
    "Cartão Mercado Pago"
];
