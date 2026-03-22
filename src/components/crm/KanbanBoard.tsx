import { Sale, STATUS_LABELS, SaleStatus } from "@/types/sale";
import { formatCurrency } from "@/lib/salesUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Flame, Clock } from "lucide-react";
import { differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

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
    try {
      if (!sale || !sale.status) return false;
      if (['fechado', 'nao_fechou', 'congelado'].includes(sale.status)) return false;
      if (!sale.expectedCloseDate) return false;

      const expectedDate = new Date(sale.expectedCloseDate);
      if (isNaN(expectedDate.getTime())) return false;

      const today = new Date();
      const diffTime = expectedDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays <= 7;
    } catch (e) {
      return false;
    }
  };

  const getDaysWithoutContact = (sale: Sale) => {
    try {
      if (!sale || !sale.status) return 0;
      if (['fechado', 'nao_fechou'].includes(sale.status)) return 0;
      if (!sale.contactDate) return 0;

      const contact = new Date(sale.contactDate);
      if (isNaN(contact.getTime())) return 0;

      const diff = differenceInDays(new Date(), contact);
      return isNaN(diff) ? 0 : diff;
    } catch (e) {
      return 0;
    }
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
            className={cn(
                "flex-shrink-0 w-72 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 flex flex-col h-[calc(100vh-280px)] shadow-2xl relative overflow-hidden group/column",
                columnColors[status]
            )}
            onDrop={(e) => handleDrop(e, status)}
            onDragOver={handleDragOver}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
            
            <div className="p-4 border-b border-white/5 relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-2 h-2 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]", dotColors[status])} />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-white/90">
                  {STATUS_LABELS[status]}
                </h3>
                <span className="ml-auto text-[10px] bg-white/10 text-white/60 rounded-full px-2.5 py-0.5 font-black">
                  {columnSales.length}
                </span>
              </div>
              <div className="flex justify-between items-end">
                  <p className="text-lg font-black text-white tracking-tighter shimmer-gold">
                    {formatCurrency(totalValue)}
                  </p>
                  <p className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">Volume Total</p>
              </div>
            </div>

            <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1 relative z-10">
              {columnSales.map((sale) => {
                const hot = isHotLead(sale);
                const lostDays = getDaysWithoutContact(sale);
                const showWarning = lostDays >= 15 && sale.status && !['fechado', 'nao_fechou', 'congelado'].includes(sale.status);

                return (
                  <Card
                    key={sale.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, sale.id)}
                    onClick={() => onEdit(sale)}
                    className={cn(
                        "cursor-grab active:cursor-grabbing hover:shadow-2xl transition-all duration-300 shadow-lg relative overflow-hidden group spotlight-card tilt-card border-beam-card rounded-2xl border-white/5 bg-white/[0.03] backdrop-blur-md",
                        hot ? 'border-orange-500/50 bg-orange-500/5' : ''
                    )}
                  >
                    {hot && (
                      <div className="absolute top-0 right-0 p-2 bg-gradient-to-br from-orange-400 to-orange-600 text-white rounded-bl-xl shadow-lg z-20">
                        <Flame size={14} className="animate-pulse" />
                      </div>
                    )}
                    <CardContent className="p-4 relative z-10">
                      {showWarning && (
                        <div className="flex items-center gap-1.5 text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full mb-3 w-fit border border-rose-500/20 backdrop-blur-sm">
                          <Clock size={12} className="animate-pulse" />
                          <span className="text-[9px] uppercase font-black tracking-widest">
                            {lostDays} DIAS EM HIATO
                          </span>
                        </div>
                      )}
                      
                      <div className="space-y-1 mb-4">
                        <p className="font-black text-sm tracking-tight text-white group-hover:text-primary transition-colors truncate pr-4 uppercase">
                            {sale.clientName || 'CLIENTE S/ NOME'}
                        </p>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest truncate">
                            {sale.product} {sale.quantity > 1 && `[×${sale.quantity}]`}
                        </p>
                      </div>

                      <div className="flex items-end justify-between gap-2 mt-auto">
                        <div className="space-y-1">
                            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest leading-none">Proposta</p>
                            <p className="text-base font-black text-primary tracking-tighter">
                                {formatCurrency(sale.totalValue || 0)}
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-1.5 bg-white/5 p-1.5 rounded-lg border border-white/5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <Phone className="h-3 w-3 text-white/40" />
                            <span className="text-[9px] font-black text-white/60 tracking-tighter">
                                {sale.clientPhone ? sale.clientPhone.split(' ').pop() : '---'}
                            </span>
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
