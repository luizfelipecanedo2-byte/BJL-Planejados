import { useState, useEffect } from "react";
import { Sale } from "@/types/sale";

const STORAGE_KEY = "crm-sales-data";

const sampleSales: Sale[] = [
  {
    id: "1",
    clientName: "Maria Silva",
    clientPhone: "(11) 99999-1234",
    clientEmail: "maria@empresa.com",
    product: "Consultoria Premium",
    quantity: 1,
    unitPrice: 5000,
    totalValue: 5000,
    status: "fechado",
    contactDate: "2026-01-15",
    expectedCloseDate: "2026-02-01",
    closedDate: "2026-01-28",
    createdAt: "2026-01-15",
  },
  {
    id: "2",
    clientName: "João Mendes",
    clientPhone: "(21) 98888-5678",
    clientEmail: "joao@tech.io",
    product: "Plano Anual",
    quantity: 1,
    unitPrice: 12000,
    totalValue: 12000,
    status: "negociacao",
    contactDate: "2026-02-01",
    expectedCloseDate: "2026-02-15",
    createdAt: "2026-02-01",
  },
  {
    id: "3",
    clientName: "Ana Costa",
    clientPhone: "(31) 97777-9012",
    clientEmail: "ana@loja.com.br",
    product: "Pacote Básico",
    quantity: 3,
    unitPrice: 1500,
    totalValue: 4500,
    status: "contato",
    contactDate: "2026-02-05",
    expectedCloseDate: "2026-02-20",
    createdAt: "2026-02-05",
  },
  {
    id: "4",
    clientName: "Carlos Oliveira",
    clientPhone: "(41) 96666-3456",
    clientEmail: "carlos@startup.com",
    product: "Consultoria Premium",
    quantity: 1,
    unitPrice: 5000,
    totalValue: 5000,
    status: "prospecto",
    contactDate: "2026-02-08",
    expectedCloseDate: "2026-03-01",
    createdAt: "2026-02-08",
  },
  {
    id: "5",
    clientName: "Fernanda Lima",
    clientPhone: "(51) 95555-7890",
    clientEmail: "fernanda@agencia.com",
    product: "Plano Anual",
    quantity: 1,
    unitPrice: 12000,
    totalValue: 12000,
    status: "nao_fechou",
    contactDate: "2026-01-10",
    expectedCloseDate: "2026-01-25",
    notes: "Optou por concorrente",
    createdAt: "2026-01-10",
  },
  {
    id: "6",
    clientName: "Roberto Santos",
    clientPhone: "(61) 94444-1111",
    clientEmail: "roberto@corp.com",
    product: "Pacote Básico",
    quantity: 5,
    unitPrice: 1500,
    totalValue: 7500,
    status: "fechado",
    contactDate: "2026-01-20",
    expectedCloseDate: "2026-02-05",
    closedDate: "2026-02-03",
    createdAt: "2026-01-20",
  },
];

export function useSales() {
  const [sales, setSales] = useState<Sale[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return sampleSales;
      }
    }
    return sampleSales;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
  }, [sales]);

  const addSale = (sale: Omit<Sale, "id" | "createdAt">) => {
    const newSale: Sale = {
      ...sale,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split("T")[0],
    };
    setSales((prev) => [newSale, ...prev]);
  };

  const updateSale = (id: string, updates: Partial<Sale>) => {
    setSales((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const deleteSale = (id: string) => {
    setSales((prev) => prev.filter((s) => s.id !== id));
  };

  const updateStatus = (id: string, status: Sale["status"]) => {
    updateSale(id, {
      status,
      ...(status === "fechado"
        ? { closedDate: new Date().toISOString().split("T")[0] }
        : {}),
    });
  };

  return { sales, addSale, updateSale, deleteSale, updateStatus };
}
