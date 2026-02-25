
import { ServiceOrder } from "@/types/serviceOrder";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { Pencil, Trash2 } from "lucide-react";

interface ServiceOrderTableProps {
    orders: ServiceOrder[];
    onEdit: (order: ServiceOrder) => void;
    onDelete: (id: string) => void;
}

const ServiceOrderTable = ({ orders, onEdit, onDelete }: ServiceOrderTableProps) => {
    const getStatusDisplay = (order: ServiceOrder) => {
        if (order.status === "Encerrado") {
            return <Badge variant="secondary">Encerrado</Badge>;
        }

        const daysOpen = differenceInDays(new Date(), new Date(order.openDate));
        return (
            <Badge className="bg-yellow-500 hover:bg-yellow-600">
                Em andamento há {daysOpen} {daysOpen === 1 ? "dia" : "dias"}
            </Badge>
        );
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>N° Chamado</TableHead>
                        <TableHead>Data Abertura</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total Horas</TableHead>
                        <TableHead>Previsão</TableHead>
                        <TableHead>Conclusão</TableHead>
                        <TableHead className="w-[50px]">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders.map((order) => (
                        <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.ticketNumber}</TableCell>
                            <TableCell>
                                {order.openDate instanceof Date && !isNaN(order.openDate.getTime())
                                    ? format(order.openDate, "dd/MM/yyyy", { locale: ptBR })
                                    : "S/D"}
                            </TableCell>
                            <TableCell>{order.client}</TableCell>
                            <TableCell>{order.type}</TableCell>
                            <TableCell>{order.action}</TableCell>
                            <TableCell>{getStatusDisplay(order)}</TableCell>
                            <TableCell className="font-bold">
                                {(order.laborLogs || []).reduce((acc, l) => acc + l.hours, 0).toFixed(1)}h
                            </TableCell>
                            <TableCell>
                                {order.forecastDate instanceof Date && !isNaN(order.forecastDate.getTime())
                                    ? format(order.forecastDate, "dd/MM/yyyy", { locale: ptBR })
                                    : "S/D"}
                            </TableCell>
                            <TableCell>
                                {order.completionDate instanceof Date && !isNaN(order.completionDate.getTime())
                                    ? format(order.completionDate, "dd/MM/yyyy", { locale: ptBR })
                                    : "-"}
                            </TableCell>
                            <TableCell className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => onEdit(order)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => onDelete(order.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    {orders.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                Nenhuma ordem de serviço encontrada.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
};

export default ServiceOrderTable;

