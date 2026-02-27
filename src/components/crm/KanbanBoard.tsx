import { Sale, STATUS_LABELS, SaleStatus } from "@/types/sale";
import { formatCurrency } from "@/lib/salesUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Calendar, Flame, AlertTriangle, Clock } from "lucide-react";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface KanbanBoardProps {
  sales: Sale[];
  onStatusChange: (id: string, status: SaleStatus) => void;
  onEdit: (sale: Sale) => void;
}

const columnColors: Record<SaleStatus, string> = {
  prospecto: "border-t-kanban-prospecto",
  contato: "border-t-kanban-contato",
  visita: "border-t-kanban-visita",
  projeto: "border-t-kanban-projeto",
  negociacao: "border-t-kanban-negociacao",
  fechado: "border-t-kanban-fechado",
  nao_fechou: "border-t-kanban-nao_fechou",
  congelado: "border-t-kanban-congelado",
  pos_venda: "border-t-kanban-pos_venda",
};

const dotColors: Record<SaleStatus, string> = {
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

const statusOrder: SaleStatus[] = [
  "prospecto",
  "contato",
  "visita",
  "projeto",
  "negociacao",
  "fechado",
  "pos_venda",
  "nao_fechou",
  "congelado",
];

const KanbanBoard = ({ sales, onStatusChange, onEdit }: KanbanBoardProps) => {
  const handleDragStart = (e: React.DragEvent, saleId: string) => {
    e.dataTransfer.setData("saleId", saleId);
  };

  const handleDrop = (e: React.DragEvent, status: SaleStatus) => {
    e.preventDefault();
    const saleId = e.dataTransfer.getData("saleId");
    if (saleId) {
      onStatusChange(saleId, status);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const isHotLead = (sale: Sale) => {
    // Aberto e com previsão de fechamento próxima (próximos 7 dias ou atrasado)
    if (['fechado', 'nao_fechou', 'congelado'].includes(sale.status)) return false;
    if (!sale.expectedCloseDate) return false;

    const expectedDate = new Date(sale.expectedCloseDate);
    const today = new Date();
    const diffTime = expectedDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays <= 7;
  };

  const getDaysWithoutContact = (sale: Sale) => {
    if (['fechado', 'nao_fechou'].includes(sale.status)) return 0;
    if (!sale.contactDate) return 0;

    // Usar a última data de contato mapeada. Como não temos 'updatedAt' ou 'lastContactDate' explícito, 
    // usaremos a contactDate (que o usuário deveria atualizar ao fazer novo contato)
    const contact = new Date(sale.contactDate);
    const today = new Date();
    return differenceInDays(today, contact);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 animate-fade-in">
      {statusOrder.map((status) => {
        const columnSales = sales.filter((s) => s.status === status);
        const totalValue = columnSales.reduce(
          (sum, s) => sum + s.totalValue,
          0
        );

        return (
          <div
            key={status}
            className={`flex-shrink-0 w-64 bg-muted/40 rounded-lg border-t-[3px] ${columnColors[status]}`}
            onDrop={(e) => handleDrop(e, status)}
            onDragOver={handleDragOver}
          >
            <div className="p-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${dotColors[status]}`}
                />
                <h3 className="text-sm font-semibold">
                  {STATUS_LABELS[status]}
                </h3>
                <span className="ml-auto text-xs bg-muted rounded-full px-2 py-0.5 text-muted-foreground font-medium">
                  {columnSales.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {formatCurrency(totalValue)}
              </p>
            </div>

            <div className="p-2 space-y-2 min-h-[200px]">
              {columnSales.map((sale) => {
                const hot = isHotLead(sale);
                const lostDays = getDaysWithoutContact(sale);
                const showWarning = lostDays >= 15 && !['fechado', 'nao_fechou', 'congelado'].includes(sale.status);

                return (
                  <Card
                    key={sale.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, sale.id)}
                    onClick={() => onEdit(sale)}
                    className={`cursor-grab active:cursor-grabbing transition-all border-l-4 shadow-sm hover:shadow-md relative overflow-hidden group
                        ${hot ? 'border-l-orange-500 bg-orange-50/30' : 'border-l-transparent'}
                    `}
                  >
                    {hot && (
                      <div className="absolute top-0 right-0 p-1.5 bg-orange-500 text-white rounded-bl-lg shrink-0">
                        <Flame size={14} className="animate-pulse" />
                      </div>
                    )}
                    <CardContent className="p-3 pt-4">
                      {showWarning && (
                        <div className="flex items-center gap-1.5 text-red-500 bg-red-50 px-2 py-1 rounded-md mb-2 w-fit border border-red-100">
                          <Clock size={12} className="animate-pulse" />
                          <span className="text-[10px] uppercase font-bold tracking-tighter">
                            {lostDays} dias sem contato
                          </span>
                        </div>
                      )}

                      <p className="font-bold text-sm mb-0.5 leading-tight truncate pr-4 text-foreground/90">
                        {sale.clientName}
                      </p>

                      <p className="text-[11px] text-muted-foreground mb-2 font-medium">
                        {sale.product}{" "}
                        {sale.quantity > 1 && `(×${sale.quantity})`}
                      </p>

                      <div className="flex items-center justify-between mt-3">
                        <p className="text-sm font-black text-primary tracking-tighter bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                          {formatCurrency(sale.totalValue)}
                        </p>
                        <div className="flex items-center gap-1.5 text-muted-foreground opacity-60">
                          <Phone className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;
