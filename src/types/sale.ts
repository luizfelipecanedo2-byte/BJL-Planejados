export type SaleStatus = "prospecto" | "contato" | "visita" | "projeto" | "negociacao" | "fechado" | "nao_fechou" | "congelado" | "pos_venda";

export type SaleChannel = "instagram" | "cliente" | "arquiteto" | "indicacao";

export const CHANNEL_LABELS: Record<SaleChannel, string> = {
  instagram: "Instagram",
  cliente: "Cliente",
  arquiteto: "Arquiteto",
  indicacao: "Indicação",
};

export interface Sale {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  product: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  status: SaleStatus;
  channel?: SaleChannel;
  contactDate: string;
  expectedCloseDate: string;
  closedDate?: string;
  notes?: string;
  createdAt: string;
  budget_id?: string;
}

export const STATUS_LABELS: Record<SaleStatus, string> = {
  prospecto: "Prospecto",
  contato: "Contato Feito",
  visita: "Visita",
  projeto: "Projeto",
  negociacao: "Negociação",
  fechado: "Fechado",
  nao_fechou: "Não Fechou",
  congelado: "Congelado",
  pos_venda: "Pós Venda",
};

export const STATUS_COLORS: Record<SaleStatus, string> = {
  prospecto: "bg-kanban-prospecto",
  contato: "bg-kanban-contato",
  visita: "bg-kanban-visita",
  projeto: "bg-kanban-projeto",
  negociacao: "bg-kanban-negociacao",
  fechado: "bg-kanban-fechado",
  nao_fechou: "bg-kanban-nao_fechou",
  congelado: "bg-kanban-congelado",
  pos_venda: "bg-kanban-pos_venda",
};
