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
    <div className="animate-fade-in space-y-4">
      {/* Mobile View: Card-based layout */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {sales.length === 0 ? (
          <div className="text-center py-12 bg-card border rounded-xl shadow-sm text-muted-foreground italic">
            Nenhuma venda cadastrada
          </div>
        ) : (
          sales.map((sale) => (
            <div key={sale.id} className="bg-card border rounded-xl p-5 shadow-sm space-y-4 transition-all active:scale-[0.98]">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className={`${statusBadgeVariants[sale.status]} text-[10px] h-5 py-0 font-bold uppercase tracking-tight`}
                    >
                      {STATUS_LABELS[sale.status]}
                    </Badge>
                    {sale.channel && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium">
                        {CHANNEL_LABELS[sale.channel]}
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-lg text-foreground truncate leading-tight uppercase tracking-tight">
                    {sale.clientName}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate font-medium">{sale.clientEmail}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="icon" className="h-10 w-10 border-primary/20 bg-primary/5 shadow-sm shadow-primary/5" onClick={() => onEdit(sale)}>
                    <Pencil className="h-4 w-4 text-primary" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-10 w-10 border-red-100 bg-red-50/50 shadow-sm shadow-red-50" onClick={() => onDelete(sale.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 border-y border-border/50">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Produto</span>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm leading-tight">{sale.product}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">Qtd: {sale.quantity}</span>
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Valor Total</span>
                  <div className="text-lg font-black text-primary tracking-tighter">
                    {formatCurrency(sale.totalValue)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Data Contato</span>
                  <span className="text-xs font-bold text-foreground/80 font-mono">
                    {formatDate(sale.contactDate)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 text-right">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Previsão Fechamento</span>
                  <span className="text-xs font-bold text-emerald-600 font-mono">
                    {formatDate(sale.expectedCloseDate)}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Select
                  value={sale.status}
                  onValueChange={(v) => onStatusChange(sale.id, v as SaleStatus)}
                >
                  <SelectTrigger className="w-full h-11 border-border/40 bg-muted/20 rounded-xl px-4 font-bold text-xs uppercase tracking-widest">
                    <div className="flex items-center justify-between w-full">
                      <span>Alterar Status</span>
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl overflow-hidden border-border/40 shadow-2xl">
                    {(Object.keys(STATUS_LABELS) as SaleStatus[]).map((status) => (
                      <SelectItem key={status} value={status} className="font-bold text-xs uppercase tracking-widest py-3">
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
      <div className="hidden md:block rounded-xl border bg-card overflow-hidden shadow-2xl border-border/40">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30 h-14 border-b border-border/40">
              <TableHead className="w-16 text-center font-black uppercase text-[10px] tracking-widest text-primary">Editar</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Cliente</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Produto</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground text-right">Valor</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Status</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Canal</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Contato</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Previsão</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary text-right pr-6">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-12 text-muted-foreground italic h-32"
                >
                  Nenhuma venda cadastrada
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => (
                <TableRow
                  key={sale.id}
                  className="hover:bg-primary/[0.02] transition-colors h-16 border-b border-border/20 group"
                >
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg group-hover:scale-110 active:scale-95 transition-all"
                      onClick={() => onEdit(sale)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="py-1">
                      <p className="font-black text-sm uppercase tracking-tight text-foreground group-hover:text-primary transition-colors leading-tight">{sale.clientName}</p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter opacity-70">
                        {sale.clientEmail}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-tight">{sale.product}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        QTD: {sale.quantity}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-black text-foreground">
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
                          className={`${statusBadgeVariants[sale.status]} text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border h-6 cursor-pointer`}
                        >
                          {STATUS_LABELS[sale.status]}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl overflow-hidden border-border/40 shadow-2xl">
                        {(Object.keys(STATUS_LABELS) as SaleStatus[]).map(
                          (status) => (
                            <SelectItem key={status} value={status} className="font-bold text-[10px] uppercase tracking-widest py-2.5">
                              {STATUS_LABELS[status]}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/50 px-2 py-1 rounded border border-border/20">
                      {sale.channel ? CHANNEL_LABELS[sale.channel] : "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-[11px] font-bold font-mono text-muted-foreground">
                    {formatDate(sale.contactDate)}
                  </TableCell>
                  <TableCell className="text-[11px] font-bold font-mono text-emerald-600">
                    {formatDate(sale.expectedCloseDate)}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
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
