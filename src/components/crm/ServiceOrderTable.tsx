
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
import { Pencil, Trash2, TrendingUp, AlertTriangle } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ServiceOrderTableProps {
    orders: ServiceOrder[];
    onEdit: (order: ServiceOrder) => void;
    onDelete: (id: string) => void;
    isAdmin?: boolean;
}

const ServiceOrderTable = ({ orders, onEdit, onDelete, isAdmin = false }: ServiceOrderTableProps) => {
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
                                {isAdmin && (
                                    <Button variant="outline" size="icon" className="h-9 w-9 text-red-500 border-red-200 hover:bg-red-50" onClick={() => onDelete(order.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
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

                        {/* Radar de Margem Mobile */}
                        {(order.spentCost !== undefined || (order.amount && order.amount > 0)) && (
                            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Radar Margem:</span>
                                <div className="flex items-center gap-1.5">
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                                        order.marginStatus === 'danger' ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                                        order.marginStatus === 'warning' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                                        "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    )}>
                                        {order.marginStatus === 'danger' ? '⚠️ Estouro' : order.marginStatus === 'warning' ? 'Atenção' : 'Saudável'} ({order.costRatio || 0}%)
                                    </span>
                                    <span className="font-bold text-amber-400 text-[11px]">
                                        R$ {(order.spentCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        )}
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
                            <TableHead className="text-right">Radar de Margem (Materiais)</TableHead>
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
                                    <HoverCard>
                                        <HoverCardTrigger asChild>
                                            <div className="inline-flex flex-col items-end cursor-pointer group/radar">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-transform group-hover/radar:scale-105",
                                                    order.marginStatus === 'danger' ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.15)] animate-pulse" :
                                                    order.marginStatus === 'warning' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                                                    (order.spentCost && order.spentCost > 0) ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                                                    "bg-muted/30 text-muted-foreground border border-border/40"
                                                )}>
                                                    {order.marginStatus === 'danger' ? '⚠️ Estouro' : order.marginStatus === 'warning' ? 'Atenção' : order.spentCost ? 'Saudável' : 'Sem gasto'}
                                                    {order.costRatio !== undefined && order.costRatio > 0 && ` (${order.costRatio}%)`}
                                                </span>
                                                <span className="text-[10px] font-bold text-muted-foreground mt-0.5">
                                                    {order.spentCost ? `Gasto: R$ ${order.spentCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                                                </span>
                                            </div>
                                        </HoverCardTrigger>
                                        <HoverCardContent className="w-80 bg-slate-950 border-slate-800 text-white p-3 z-50 shadow-2xl">
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-start border-b border-white/10 pb-2">
                                                    <div>
                                                        <h5 className="font-bold text-xs text-white">Radar de Margem — {order.ticketNumber}</h5>
                                                        <p className="text-[10px] text-muted-foreground">{order.client}</p>
                                                    </div>
                                                    <span className={cn(
                                                        "text-[9px] font-black px-1.5 py-0.5 rounded",
                                                        order.marginStatus === 'danger' ? "bg-rose-500 text-white" :
                                                        order.marginStatus === 'warning' ? "bg-amber-500 text-black" :
                                                        "bg-emerald-500 text-white"
                                                    )}>
                                                        {order.marginStatus === 'danger' ? 'ALERTA DE PREJUÍZO' : order.marginStatus === 'warning' ? 'ATENÇÃO' : 'MARGEM SAUDÁVEL'}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                                                    <div>
                                                        <span className="text-[9px] uppercase font-bold text-muted-foreground block">Valor da OS</span>
                                                        <span className="font-bold text-emerald-400">
                                                            {order.amount ? `R$ ${order.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não informado'}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[9px] uppercase font-bold text-muted-foreground block">Gasto em Materiais</span>
                                                        <span className="font-bold text-amber-400">
                                                            {order.spentCost ? `R$ ${order.spentCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {order.materialsDetails && order.materialsDetails.length > 0 && (
                                                    <div className="pt-2 border-t border-white/10 space-y-1">
                                                        <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Materiais Rateados ({order.materialsDetails.length})</span>
                                                        <div className="max-h-28 overflow-y-auto space-y-1 text-[10px] pr-1">
                                                            {order.materialsDetails.slice(0, 5).map((m, idx) => (
                                                                <div key={idx} className="flex justify-between items-center text-slate-300">
                                                                    <span className="truncate max-w-[170px]">{m.description}</span>
                                                                    <span className="font-mono font-bold text-amber-300">R$ {m.amount.toFixed(2)}</span>
                                                                </div>
                                                            ))}
                                                            {order.materialsDetails.length > 5 && (
                                                                <p className="text-[9px] text-muted-foreground italic text-center">+ {order.materialsDetails.length - 5} outros itens</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </HoverCardContent>
                                    </HoverCard>
                                </TableCell>
                                <TableCell className="text-right">
                                    {isAdmin && (
                                        <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" onClick={() => onDelete(order.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {orders.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
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

