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
    .filter((s) => !["fechado", "nao_fechou", "pos_venda"].includes(s.status))
    .reduce((sum, s) => sum + s.totalValue, 0);

  const totalSales = sales.length;
  const closedSales = sales.filter((s) => s.status === "fechado").length;
  const lostSales = sales.filter((s) => s.status === "nao_fechou").length;
  const conversionRate =
    totalSales > 0
      ? Math.round((closedSales / totalSales) * 100)
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
    pos_venda: 0,
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

export function calculateLeadScore(sale: Sale): number {
  if (!sale) return 0;
  if (sale.status === "fechado" || sale.status === "pos_venda") return 100;
  if (sale.status === "nao_fechou" || sale.status === "congelado") return 0;

  const stageWeights: Record<string, number> = {
    prospecto: 15,
    contato: 30,
    visita: 50,
    projeto: 70,
    negociacao: 85,
  };

  let score = stageWeights[sale.status] || 20;

  if (sale.temperature === "quente") score += 10;
  else if (sale.temperature === "frio") score -= 10;

  const channel = (sale.channel || "").toLowerCase();
  if (channel.includes("indicacao") || channel.includes("indicação") || channel.includes("arquitet")) {
    score += 5;
  }

  return Math.min(99, Math.max(5, score));
}
