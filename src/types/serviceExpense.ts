
export interface ExpenseItem {
    description: string;
    value: number;
}

export interface ServiceExpense {
    id: string;
    clientName: string;
    environment: string;
    serviceValue: number;
    spentValue: number;
    items?: ExpenseItem[];
    createdAt: Date;
}
