import { ServiceOrder, ServiceStatus } from "@/types/serviceOrder";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Calendar, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

interface OSKanbanBoardProps {
  orders: ServiceOrder[];
  onStatusChange: (id: string, status: ServiceStatus) => void;
  onEdit: (order: ServiceOrder) => void;
}

const statusOrder: ServiceStatus[] = [
  "A Definir",
  "Plano de corte",
  "Pronto para produção",
  "Corte da caixa",
  "Fita",
  "Montagem das caixas",
  "Corte das portas + Tamponados",
  "Colocação dos tamponados",
  "Embalagem",
  "Pronto para entrega",
  "Instalação",
  "Entregue e Finalizado"
];

const columnColors: Record<ServiceStatus, string> = {
  "A Definir": "border-t-slate-500",
  "Plano de corte": "border-t-slate-600",
  "Pronto para produção": "border-t-blue-500",
  "Corte da caixa": "border-t-orange-500",
  "Fita": "border-t-amber-500",
  "Montagem das caixas": "border-t-yellow-600",
  "Corte das portas + Tamponados": "border-t-indigo-500",
  "Colocação dos tamponados": "border-t-purple-500",
  "Embalagem": "border-t-pink-500",
  "Pronto para entrega": "border-t-cyan-500",
  "Instalação": "border-t-emerald-400",
  "Entregue e Finalizado": "border-t-emerald-600",
};

const dotColors: Record<ServiceStatus, string> = {
  "A Definir": "bg-slate-500",
  "Plano de corte": "bg-slate-600",
  "Pronto para produção": "bg-blue-500",
  "Corte da caixa": "bg-orange-500",
  "Fita": "bg-amber-500",
  "Montagem das caixas": "bg-yellow-600",
  "Corte das portas + Tamponados": "bg-indigo-500",
  "Colocação dos tamponados": "bg-purple-500",
  "Embalagem": "bg-pink-500",
  "Pronto para entrega": "bg-cyan-500",
  "Instalação": "bg-emerald-400",
  "Entregue e Finalizado": "bg-emerald-600",
};

const OSKanbanBoard = ({ orders, onStatusChange, onEdit }: OSKanbanBoardProps) => {
  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData("orderId", orderId);
  };

  const handleDrop = (e: React.DragEvent, status: ServiceStatus) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData("orderId");
    if (orderId) {
      onStatusChange(orderId, status);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 animate-fade-in custom-scrollbar">
      {statusOrder.map((status) => {
        const columnOrders = orders.filter((o) => o.status === status);
        const totalValue = columnOrders.reduce(
          (sum, o) => sum + (o.amount || 0),
          0
        );

        return (
          <div
            key={status}
            className={cn(
              "flex-shrink-0 w-72 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 flex flex-col h-[calc(100vh-320px)] shadow-2xl relative overflow-hidden group/column",
              columnColors[status]
            )}
            onDrop={(e) => handleDrop(e, status)}
            onDragOver={handleDragOver}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
            
            <div className="p-4 border-b border-white/5 relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]", dotColors[status])} />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white/90 truncate max-w-[160px]" title={status}>
                  {status}
                </h3>
                <span className="ml-auto text-[10px] bg-white/10 text-white/60 rounded-full px-2.5 py-0.5 font-black">
                  {columnOrders.length}
                </span>
              </div>
              <div className="flex justify-between items-end">
                <p className="text-sm font-black text-white tracking-tighter shimmer-gold">
                  {formatCurrency(totalValue)}
                </p>
                <p className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">Total OS</p>
              </div>
            </div>

            <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1 relative z-10">
              {columnOrders.map((order) => {
                const isUrgent = order.priorityLevel === 'urgente';
                const isHigh = order.priorityLevel === 'alta';

                return (
                  <Card
                    key={order.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, order.id)}
                    onClick={() => onEdit(order)}
                    className={cn(
                      "cursor-grab active:cursor-grabbing hover:shadow-2xl transition-all duration-300 shadow-lg relative overflow-hidden group spotlight-card border-beam-card rounded-2xl border-white/5 bg-white/[0.03] backdrop-blur-md",
                      isUrgent ? 'border-rose-500/50 bg-rose-500/5 shadow-[0_0_15px_rgba(244,63,94,0.05)]' : 
                      isHigh ? 'border-amber-500/30 bg-amber-500/5' : ''
                    )}
                  >
                    <CardContent className="p-4 relative z-10 space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[8px] font-black text-muted-foreground uppercase opacity-70">
                            {order.ticketNumber}
                          </span>
                          {order.priorityLevel && order.priorityLevel !== 'normal' && (
                            <span className={cn(
                              "text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                              order.priorityLevel === 'urgente' ? "bg-rose-500 text-white" :
                              order.priorityLevel === 'alta' ? "bg-amber-500 text-black" :
                              "bg-slate-600 text-white"
                            )}>
                              {order.priorityLevel}
                            </span>
                          )}
                        </div>
                        <p className="font-black text-sm tracking-tight text-white group-hover:text-primary transition-colors truncate uppercase">
                          {order.client}
                        </p>
                        <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest truncate">
                          {order.action}
                        </p>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-white/60">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-white/30" />
                          <span>
                            {new Date(order.forecastDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </span>
                        </div>
                        {order.amount && (
                          <span className="font-black text-primary">
                            {formatCurrency(order.amount)}
                          </span>
                        )}
                      </div>

                      {order.clientPhone && (
                        <div className="flex items-center gap-1.5 bg-white/5 p-1.5 rounded-lg border border-white/5 opacity-60 group-hover:opacity-100 transition-opacity w-fit text-[9px] font-black text-white/60">
                          <Phone className="h-3 w-3 text-white/40" />
                          <span>{order.clientPhone}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {columnOrders.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-20 py-8 text-center">
                  <ClipboardList size={24} className="mb-1" />
                  <p className="text-[8px] font-bold uppercase tracking-widest">Sem OS nesta etapa</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OSKanbanBoard;
