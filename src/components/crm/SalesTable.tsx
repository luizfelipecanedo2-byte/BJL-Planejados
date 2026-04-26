import { Sale, STATUS_LABELS, SaleStatus, CHANNEL_LABELS } from "@/types/sale";
import { formatCurrency, formatDate } from "@/lib/salesUtils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Pencil } from "lucide-react";

interface SalesTableProps {
  sales: Sale[];
  onStatusChange: (id: string, status: SaleStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (sale: Sale) => void;
}

const statusBadgeVariants: Record<SaleStatus, string> = {
  prospecto: "bg-kanban-prospecto/15 text-kanban-prospecto border-kanban-prospecto/30",
  contato: "bg-kanban-contato/15 text-kanban-contato border-kanban-contato/30",
  visita: "bg-kanban-visita/15 text-kanban-visita border-kanban-visita/30",
  projeto: "bg-kanban-projeto/15 text-kanban-projeto border-kanban-projeto/30",
  negociacao: "bg-kanban-negociacao/15 text-kanban-negociacao border-kanban-negociacao/30",
  fechado: "bg-kanban-fechado/15 text-kanban-fechado border-kanban-fechado/30",
  nao_fechou: "bg-kanban-nao_fechou/15 text-kanban-nao_fechou border-kanban-nao_fechou/30",
  congelado: "bg-kanban-congelado/15 text-kanban-congelado border-kanban-congelado/30",
  pos_venda: "bg-indigo-500/10 text-indigo-500 border-indigo-200/50",
};

const SalesTable = ({
  sales,
  onStatusChange,
  onDelete,
  onEdit,
}: SalesTableProps) => {
  return (
    <div className="animate-in fade-in duration-700 space-y-6">
      {/* Mobile View: Card-based layout */}
      <div className="grid grid-cols-1 gap-6 md:hidden">
        {sales.length === 0 ? (
          <div className="text-center py-16 glass-card rounded-[2rem] luxury-shadow text-muted-foreground italic font-medium">
            Nenhuma venda cadastrada
          </div>
        ) : (
          sales.map((sale) => (
            <div key={sale.id} className="glass-card rounded-[2rem] p-6 luxury-shadow space-y-5 transition-all active:scale-[0.98] border border-white/5">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant="outline"
                      className={`${statusBadgeVariants[sale.status]} text-[9px] h-6 py-0 font-black uppercase tracking-wider rounded-lg shadow-sm`}
                    >
                      {STATUS_LABELS[sale.status]}
                    </Badge>
                    {sale.channel && (
                      <span className="text-[9px] text-primary/60 bg-primary/5 px-2 py-0.5 rounded-lg font-black uppercase tracking-wider border border-primary/10">
                        {CHANNEL_LABELS[sale.channel]}
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-xl text-luxury tracking-tighter leading-none">
                    {sale.clientName}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60 truncate">{sale.clientEmail}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="ghost" size="icon" className="h-10 w-10 bg-primary/5 hover:bg-primary/10 rounded-xl transition-all" onClick={() => onEdit(sale)}>
                    <Pencil className="h-4 w-4 text-primary" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 bg-destructive/5 hover:bg-destructive/10 rounded-xl transition-all" onClick={() => onDelete(sale.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 py-4 border-y border-white/5">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40 text-luxury">Produto</span>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-luxury leading-tight">{sale.product}</span>
                    <span className="text-[10px] text-muted-foreground font-bold opacity-60">Qtd: {sale.quantity}</span>
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40 text-luxury">Valor Total</span>
                  <div className="text-xl font-black text-primary tracking-tighter text-luxury">
                    {formatCurrency(sale.totalValue)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary/40 text-luxury">Contato</span>
                  <span className="text-[11px] font-bold text-luxury opacity-80">
                    {formatDate(sale.contactDate)}
                  </span>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary/40 text-luxury">Previsão</span>
                  <span className="text-[11px] font-bold text-emerald-500 text-luxury">
                    {formatDate(sale.expectedCloseDate)}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Select
                  value={sale.status}
                  onValueChange={(v) => onStatusChange(sale.id, v as SaleStatus)}
                >
                  <SelectTrigger className="w-full h-12 bg-white/[0.03] border-white/5 rounded-2xl px-5 font-black text-[10px] uppercase tracking-[0.2em] text-luxury focus:ring-0">
                    <div className="flex items-center justify-between w-full">
                      <span>Alterar Status</span>
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl overflow-hidden glass-card border-white/10 luxury-shadow">
                    {(Object.keys(STATUS_LABELS) as SaleStatus[]).map((status) => (
                      <SelectItem key={status} value={status} className="font-black text-[10px] uppercase tracking-[0.2em] py-4 text-luxury focus:bg-primary/10">
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop View: Table layout */}
      <div className="hidden md:block glass-card rounded-[2.5rem] overflow-hidden luxury-shadow border border-white/5">
        <Table>
          <TableHeader>
            <TableRow className="bg-white/[0.02] hover:bg-white/[0.02] border-b border-white/5 h-16">
              <TableHead className="w-20 text-center">Editar</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Previsão</TableHead>
              <TableHead className="text-right pr-10">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-20 text-muted-foreground italic h-40 text-luxury"
                >
                  Nenhuma venda cadastrada
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => (
                <TableRow
                  key={sale.id}
                  className="h-20 group"
                >
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all group-hover:scale-110"
                      onClick={() => onEdit(sale)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-black text-sm text-luxury tracking-tight group-hover:text-primary transition-colors">{sale.clientName}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-50">
                        {sale.clientEmail}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-luxury tracking-wide">{sale.product}</p>
                      <p className="text-[10px] text-muted-foreground font-black opacity-50 uppercase">
                        QTD: {sale.quantity}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-black text-primary tracking-tighter text-base">
                    {formatCurrency(sale.totalValue)}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={sale.status}
                      onValueChange={(v) =>
                        onStatusChange(sale.id, v as SaleStatus)
                      }
                    >
                      <SelectTrigger className="w-fit h-7 border-none p-0 shadow-none hover:bg-transparent focus:ring-0">
                        <Badge
                          variant="outline"
                          className={`${statusBadgeVariants[sale.status]} text-[9px] font-black uppercase tracking-widest px-3 py-1 border rounded-lg shadow-sm cursor-pointer`}
                        >
                          {STATUS_LABELS[sale.status]}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl overflow-hidden glass-card border-white/10 luxury-shadow">
                        {(Object.keys(STATUS_LABELS) as SaleStatus[]).map(
                          (status) => (
                            <SelectItem key={status} value={status} className="font-black text-[10px] uppercase tracking-[0.2em] py-3 text-luxury focus:bg-primary/10">
                              {STATUS_LABELS[status]}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10 text-luxury">
                      {sale.channel ? CHANNEL_LABELS[sale.channel] : "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-[11px] font-bold text-luxury opacity-70">
                    {formatDate(sale.contactDate)}
                  </TableCell>
                  <TableCell className="text-[11px] font-bold text-emerald-500 text-luxury">
                    {formatDate(sale.expectedCloseDate)}
                  </TableCell>
                  <TableCell className="text-right pr-10">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                      onClick={() => onDelete(sale.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SalesTable;
