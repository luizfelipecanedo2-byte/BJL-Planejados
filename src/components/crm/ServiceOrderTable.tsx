
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
import { useState } from "react";

interface ServiceOrderTableProps {
    orders: ServiceOrder[];
    onEdit: (order: ServiceOrder) => void;
    onDelete: (id: string) => void;
}

const ServiceOrderTable = ({ orders, onEdit, onDelete }: ServiceOrderTableProps) => {
    const getStatusDisplay = (order: ServiceOrder) => {
        if (order.status === "Entregue e Finalizado") {
            return <Badge variant="secondary" className="bg-emerald-500 text-white hover:bg-emerald-600">Entregue e Finalizado</Badge>;
        }

        const daysOpen = differenceInDays(new Date(), new Date(order.openDate));
        return (
            <div className="flex flex-col gap-1">
                <Badge className="bg-amber-500 hover:bg-amber-600 whitespace-nowrap">
                    {order.status}
                </Badge>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    Há {daysOpen} {daysOpen === 1 ? "dia" : "dias"}
                </span>
            </div>
        );
    };

    const getTotalHours = (order: ServiceOrder) => {
        return (order.laborLogs || []).reduce((acc, l) => acc + l.hours, 0).toFixed(1);
    };

    const formatDate = (date: Date | undefined) => {
        if (date instanceof Date && !isNaN(date.getTime())) {
            return format(date, "dd/MM/yyyy", { locale: ptBR });
        }
        return "-";
    };

    return (
        <div className="space-y-4">
            {/* Mobile View: Card-based layout */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
                {orders.map((order) => (
                    <div key={order.id} className="bg-card border rounded-xl p-4 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                                        #{order.ticketNumber}
                                    </span>
                                    <h3 className="font-bold text-base leading-tight">{order.client}</h3>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {order.type} - {order.action}
                                </p>
                            </div>
                            <div className="flex gap-1">
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => onEdit(order)}>
                                    <Pencil className="h-4 w-4 text-primary" />
                                </Button>
                                <Button variant="outline" size="icon" className="h-9 w-9 text-red-500 border-red-200 hover:bg-red-50" onClick={() => onDelete(order.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 py-2 border-y border-border/50">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Abertura</span>
                                <span className="text-sm">{formatDate(order.openDate)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Prev. Entrega</span>
                                <span className="text-sm">{formatDate(order.forecastDate)}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <div>
                                {getStatusDisplay(order)}
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-muted-foreground block">Horas:</span>
                                <span className="font-bold">{getTotalHours(order)}h</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop View: Table layout */}
            <div className="hidden md:block rounded-md border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead className="w-[80px]">Editar</TableHead>
                            <TableHead>N° Chamado</TableHead>
                            <TableHead>Data Abertura</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Ação</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Horas</TableHead>
                            <TableHead>Previsão</TableHead>
                            <TableHead>Conclusão</TableHead>
                            <TableHead className="w-[50px] text-right">Excluir</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => (
                            <TableRow key={order.id} className="hover:bg-muted/10 transition-colors">
                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" className="hover:scale-110 active:scale-95 transition-all" onClick={() => onEdit(order)}>
                                            <Pencil className="h-4 w-4 text-primary" />
                                        </Button>
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium font-mono text-xs">{order.ticketNumber}</TableCell>
                                <TableCell>{formatDate(order.openDate)}</TableCell>
                                <TableCell className="font-semibold">{order.client}</TableCell>
                                <TableCell>{order.type}</TableCell>
                                <TableCell className="max-w-[200px] truncate">{order.action}</TableCell>
                                <TableCell>{getStatusDisplay(order)}</TableCell>
                                <TableCell className="font-bold">
                                    {getTotalHours(order)}h
                                </TableCell>
                                <TableCell>{formatDate(order.forecastDate)}</TableCell>
                                <TableCell>{formatDate(order.completionDate)}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" onClick={() => onDelete(order.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {orders.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                                    Nenhuma ordem de serviço encontrada.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default ServiceOrderTable;

