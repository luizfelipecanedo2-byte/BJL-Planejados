
export interface Product {
    id: string;
    idEstoque?: string;
    name: string;
    unitPrice: number;
    quantity: number;
    minStockLevel: number;
}
