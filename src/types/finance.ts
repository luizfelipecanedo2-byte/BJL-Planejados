
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
}

export const CATEGORIES = {
    income: [
        "Receita com Serviço",
        "Receita Investimento"
    ],
    expense: [
        "Despesa Operacional",
        "Despesa com Serviço",
        "Despesa com Maquinário",
        "Despesa com Pessoal",
        "Impostos"
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
    ]
};

export const PAYMENT_METHODS = [
    "Dinheiro",
    "Pix",
    "Boleto",
    "Cartão C6",
    "Cartão Nubank",
    "Cartão Inter"
];
