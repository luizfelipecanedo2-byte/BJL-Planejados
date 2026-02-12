import { Sale, SaleStatus } from "@/types/sale";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function getMetrics(sales: Sale[]) {
  const totalRevenue = sales
    .filter((s) => s.status === "fechado")
    .reduce((sum, s) => sum + s.totalValue, 0);

  const pipelineValue = sales
    .filter((s) => !["fechado", "nao_fechou"].includes(s.status))
    .reduce((sum, s) => sum + s.totalValue, 0);

  const totalSales = sales.length;
  const closedSales = sales.filter((s) => s.status === "fechado").length;
  const lostSales = sales.filter((s) => s.status === "nao_fechou").length;
  const conversionRate =
    closedSales + lostSales > 0
      ? Math.round((closedSales / (closedSales + lostSales)) * 100)
      : 0;

  const byStatus: Record<SaleStatus, number> = {
    prospecto: 0,
    contato: 0,
    visita: 0,
    projeto: 0,
    negociacao: 0,
    fechado: 0,
    nao_fechou: 0,
    congelado: 0,
  };
  sales.forEach((s) => {
    byStatus[s.status]++;
  });

  return {
    totalRevenue,
    pipelineValue,
    totalSales,
    closedSales,
    lostSales,
    conversionRate,
    byStatus,
  };
}
