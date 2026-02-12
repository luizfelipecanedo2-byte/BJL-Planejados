export interface Order {
    id: string;
    product: string;
    quantity: number;
    unitPrice: number;
    totalValue: number;
    client: string; // Ideally this would be a Client ID referncing the client list, but string for now is fine as requested.
    supplier: string; // Same here.
    date: Date;
}
