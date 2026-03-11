
export interface Client {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    document: string; // CPF or CNPJ
    notes?: string;
    type: 'cliente' | 'fornecedor';
    createdAt: Date;
}
