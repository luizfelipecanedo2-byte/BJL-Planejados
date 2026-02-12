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
};

const SalesTable = ({
  sales,
  onStatusChange,
  onDelete,
  onEdit,
}: SalesTableProps) => {
  return (
    <div className="animate-fade-in">
      <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">Cliente</TableHead>
              <TableHead className="font-semibold">Produto</TableHead>
              <TableHead className="font-semibold text-right">Valor</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Canal</TableHead>
              <TableHead className="font-semibold">Contato</TableHead>
              <TableHead className="font-semibold">Previsão</TableHead>
              <TableHead className="font-semibold w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-12 text-muted-foreground"
                >
                  Nenhuma venda cadastrada
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => (
                <TableRow
                  key={sale.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{sale.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {sale.clientEmail}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{sale.product}</p>
                      <p className="text-xs text-muted-foreground">
                        Qtd: {sale.quantity}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(sale.totalValue)}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={sale.status}
                      onValueChange={(v) =>
                        onStatusChange(sale.id, v as SaleStatus)
                      }
                    >
                      <SelectTrigger className="w-[150px] h-8 border-none p-0 shadow-none">
                        <Badge
                          variant="outline"
                          className={`${statusBadgeVariants[sale.status]} text-xs`}
                        >
                          {STATUS_LABELS[sale.status]}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS_LABELS) as SaleStatus[]).map(
                          (status) => (
                            <SelectItem key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm">
                    {sale.channel ? CHANNEL_LABELS[sale.channel] : "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(sale.contactDate)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(sale.expectedCloseDate)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => onEdit(sale)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(sale.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
