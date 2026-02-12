import { ServiceOrder } from "@/types/serviceOrder";

export const mockOrders: ServiceOrder[] = [
    {
        id: "1",
        ticketNumber: "OS-001",
        openDate: new Date(2023, 10, 15),
        client: "João Silva",
        type: "Fabricação",
        action: "Confecção de Portão",
        status: "Encerrado",
        forecastDate: new Date(2023, 10, 20),
        completionDate: new Date(2023, 10, 19),
    },
    {
        id: "2",
        ticketNumber: "OS-002",
        openDate: new Date(new Date().setDate(new Date().getDate() - 7)), // 7 dias atrás
        client: "Maria Oliveira",
        type: "Assistência",
        action: "Reparo em Janela",
        status: "Em Andamento",
        forecastDate: new Date(new Date().setDate(new Date().getDate() + 2)),
    },
    {
        id: "3",
        ticketNumber: "OS-003",
        openDate: new Date(),
        client: "Carlos Souza",
        type: "Fabricação",
        action: "Instalação de Grades",
        status: "Em Andamento",
        forecastDate: new Date(new Date().setDate(new Date().getDate() + 5)),
    },
];

import { Transaction } from "@/types/finance";

export const mockTransactions: Transaction[] = [
    {
        id: "1",
        description: "Venda Cozinha Planejada",
        service: "Projeto e Instalação",
        amount: 12500.00,
        type: "income",
        category: "Receita com Serviço",
        subcategory: "Cozinha",
        competenceDate: new Date(),
        dueDate: new Date(),
        paymentDate: new Date(),
        status: "paid",
        paymentMethod: "Pix",
        contact: "Ana Maria",
        financialInstitution: "Banco Itaú",
        invoiceNumber: "NF-1020"
    },
    {
        id: "2",
        description: "Compra MDF",
        service: "Material",
        amount: 3200.00,
        type: "expense",
        category: "Despesa Operacional",
        subcategory: "MDF Branco Tx",
        competenceDate: new Date(),
        dueDate: new Date(),
        paymentDate: new Date(),
        status: "paid",
        paymentMethod: "Boleto",
        contact: "Madeireira Silva",
        financialInstitution: "Banco Itaú",
        invoiceNumber: "123456"
    },
    {
        id: "3",
        description: "Pagamento Montador",
        service: "Mão de Obra",
        amount: 800.00,
        type: "expense",
        category: "Despesa com Serviço",
        subcategory: "Diária Extra",
        competenceDate: new Date(new Date().setDate(new Date().getDate() - 2)),
        dueDate: new Date(),
        status: "pending",
        paymentMethod: "Pix",
        contact: "Carlos Montador",
        financialInstitution: "Banco Itaú",
        invoiceNumber: "Recibo"
    },
    {
        id: "4",
        description: "Pequenos Reparos",
        service: "Manutenção",
        amount: 350.00,
        type: "income",
        category: "Receita com Serviço",
        subcategory: "Troca de Dobradiça",
        competenceDate: new Date(),
        dueDate: new Date(),
        paymentDate: new Date(),
        status: "paid",
        paymentMethod: "Dinheiro",
        contact: "Sra. Lurdes",
        financialInstitution: "Dinheiro",
        invoiceNumber: "Recibo-001"
    }
];
