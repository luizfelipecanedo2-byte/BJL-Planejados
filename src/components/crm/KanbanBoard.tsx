import { Sale, STATUS_LABELS, SaleStatus } from "@/types/sale";
import { formatCurrency } from "@/lib/salesUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Phone } from "lucide-react";

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
};

const statusOrder: SaleStatus[] = [
  "prospecto",
  "contato",
  "visita",
  "projeto",
  "negociacao",
  "fechado",
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
              {columnSales.map((sale) => (
                <Card
                  key={sale.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, sale.id)}
                  onClick={() => onEdit(sale)}
                  className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow border-none shadow-sm"
                >
                  <CardContent className="p-3">
                    <p className="font-medium text-sm mb-1">
                      {sale.clientName}
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {sale.product}{" "}
                      {sale.quantity > 1 && `(×${sale.quantity})`}
                    </p>
                    <p className="text-sm font-mono font-semibold text-primary mb-2">
                      {formatCurrency(sale.totalValue)}
                    </p>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span className="text-[10px]">{sale.clientPhone}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;
