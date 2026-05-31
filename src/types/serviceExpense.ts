
export interface ExpenseItem {
    description: string;
    unit: string;
    quantity: number;
    unitValue: number;
    totalValue: number;
}

export interface ServiceExpense {
    id: string;
    clientName: string;
    environment: string;
    serviceValue: number;
    spentValue: number;
    items?: ExpenseItem[];
    autoItems?: ExpenseItem[];
    createdAt: Date;
}
