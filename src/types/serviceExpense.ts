
export interface ExpenseItem {
    description: string;
    unit: string;
    quantity: number;
    unitValue: number;
    totalValue: number;
}

export interface ServiceIncomeItem {
    id: string;
    description: string;
    amount: number;
    status: 'paid' | 'pending';
    dueDate?: Date;
    paymentDate?: Date | null;
    paymentMethod?: string;
}

export interface ServiceExpense {
    id: string;
    clientName: string;
    environment: string;
    serviceValue: number;
    spentValue: number;
    receivedValue?: number;
    pendingReceivable?: number;
    incomeItems?: ServiceIncomeItem[];
    items?: ExpenseItem[];
    autoItems?: ExpenseItem[];
    createdAt: Date;
}
