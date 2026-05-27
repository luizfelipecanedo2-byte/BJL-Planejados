import { useState } from "react";
import { Sale, STATUS_LABELS, SaleStatus, LeadTemperature, TEMPERATURE_LABELS } from "@/types/sale";
import { formatCurrency } from "@/lib/salesUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Flame, Clock, Plus } from "lucide-react";
import { differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface KanbanBoardProps {
  sales: Sale[];
  onStatusChange: (id: string, status: SaleStatus) => void;
  onEdit: (sale: Sale) => void;
  onAddQuickSale: (status: SaleStatus, clientName: string, product: string, totalValue: number) => Promise<void>;
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

const temperatureBadgeStyles: Record<LeadTemperature, string> = {
  quente: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  morno: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  frio: "bg-sky-500/20 text-sky-400 border-sky-500/30",
};

// Cores de borda e brilho do cartão baseado na temperatura do lead
const temperatureCardStyles: Record<LeadTemperature, string> = {
  quente: "border-rose-500/40 bg-rose-500/[0.03] shadow-[0_0_15px_rgba(244,63,94,0.08)] hover:border-rose-500/60 transition-all",
  morno: "border-amber-500/30 bg-amber-500/[0.02] shadow-[0_0_15px_rgba(245,158,11,0.04)] hover:border-amber-500/50 transition-all",
  frio: "border-white/5 bg-white/[0.01] hover:border-white/20 transition-all",
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

const KanbanBoard = ({ sales, onStatusChange, onEdit, onAddQuickSale }: KanbanBoardProps) => {
  const [draggedOverColumn, setDraggedOverColumn] = useState<SaleStatus | null>(null);

  const handleDragStart = (e: React.DragEvent, saleId: string) => {
    e.dataTransfer.setData("saleId", saleId);
  };

  const handleDrop = (e: React.DragEvent, status: SaleStatus) => {
    e.preventDefault();
    setDraggedOverColumn(null);
    const saleId = e.dataTransfer.getData("saleId");
    if (saleId) {
      onStatusChange(saleId, status);
    }
  };

  const handleDragOver = (e: React.DragEvent, status: SaleStatus) => {
    e.preventDefault();
    setDraggedOverColumn(status);
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
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
              "flex-shrink-0 w-72 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 flex flex-col h-[calc(100vh-280px)] shadow-2xl relative overflow-hidden group/column transition-all duration-300",
              columnColors[status],
              draggedOverColumn === status ? "border-primary/60 bg-primary/[0.03] scale-[1.01]" : ""
            )}
            onDrop={(e) => handleDrop(e, status)}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
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
                      "cursor-grab active:cursor-grabbing hover:shadow-2xl transition-all duration-300 shadow-lg relative overflow-hidden group spotlight-card tilt-card border-beam-card rounded-2xl backdrop-blur-md",
                      temperatureCardStyles[sale.temperature || "morno"]
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
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {sale.budget_id && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Orçamento Ativo
                            </span>
                          )}
                          {sale.temperature && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border ${temperatureBadgeStyles[sale.temperature]}`}>
                              {TEMPERATURE_LABELS[sale.temperature]}
                            </span>
                          )}
                        </div>
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

            {/* Rodapé da Coluna com Adição Rápida */}
            <div className="p-3 border-t border-white/5 relative z-10 bg-black/10">
              <ColumnQuickAdd
                status={status}
                onAdd={(name, product, val) => onAddQuickSale(status, name, product, val)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Componente auxiliar para a adição rápida de leads
interface ColumnQuickAddProps {
  status: SaleStatus;
  onAdd: (clientName: string, product: string, totalValue: number) => Promise<void>;
}

const ColumnQuickAdd = ({ status, onAdd }: ColumnQuickAddProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [product, setProduct] = useState("");
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAdd(name.trim(), product.trim(), parseFloat(value) || 0);
      setName("");
      setProduct("");
      setValue("");
      setIsOpen(false);
    } catch (err) {
      console.error("Error adding lead in column:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-2 px-4 flex items-center justify-center gap-2 border border-dashed border-white/10 hover:border-primary/45 rounded-xl bg-white/[0.01] hover:bg-primary/5 text-[9px] font-black text-white/40 hover:text-primary uppercase tracking-[0.2em] transition-all duration-300"
      >
        <Plus className="h-3 w-3" />
        Adicionar Lead
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-black/30 border border-white/5 rounded-2xl flex flex-col gap-2.5 animate-in fade-in duration-300">
      <Input
        placeholder="Nome do cliente..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="bg-black/40 border-white/10 h-8 text-xs font-bold text-white placeholder:text-white/20 focus-visible:ring-primary/40 rounded-lg"
        required
        autoFocus
      />
      <Input
        placeholder="Móvel/Serviço..."
        value={product}
        onChange={(e) => setProduct(e.target.value)}
        className="bg-black/40 border-white/10 h-8 text-xs font-bold text-white placeholder:text-white/20 focus-visible:ring-primary/40 rounded-lg"
      />
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-white/30 font-mono">R$</span>
        <Input
          type="number"
          placeholder="Valor..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="bg-black/40 border-white/10 h-8 text-xs font-bold pl-8 text-white placeholder:text-white/20 focus-visible:ring-primary/40 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="flex-1 text-[9px] font-black uppercase text-white/40 hover:text-white/80 h-7 rounded-lg hover:bg-white/5"
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          className="flex-1 text-[9px] font-black uppercase bg-primary hover:bg-primary/90 text-black h-7 rounded-lg"
          disabled={!name.trim() || isSubmitting}
        >
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
};

export default KanbanBoard;
