import React, { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";
import { Client } from "@/types/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
    Calculator, 
    ClipboardList, 
    DollarSign, 
    TrendingUp, 
    Calendar,
    Clock,
    History,
    MessageSquare,
    Phone,
    Mail,
    MapPin,
    CheckCircle2,
    Layers,
    UserCheck,
    Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/salesUtils";
import { WhatsAppQuickDialog } from "./WhatsAppQuickDialog";

interface TimelineEvent {
    id: string;
    date: Date;
    title: string;
    description: string;
    type: 'sale' | 'service_order' | 'transaction';
    amount?: number;
    status?: string;
}

interface ClientTimelineProps {
    client: Client | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function ClientTimeline({ client, open, onOpenChange }: ClientTimelineProps) {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterType, setFilterType] = useState<"all" | "sale" | "service_order" | "transaction">("all");
    const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

    useEffect(() => {
        if (open && client) {
            fetchTimelineData();
        }
    }, [open, client]);

    const fetchTimelineData = async () => {
        if (!client) return;
        setLoading(true);
        try {
            // 1. Fetch Sales
            const { data: sales } = await supabase
                .from('sales')
                .select('*')
                .eq('client_name', client.name);

            // 2. Fetch Service Orders
            const { data: orders } = await supabase
                .from('service_orders')
                .select('*')
                .eq('client', client.name);

            // 3. Fetch Transactions
            const { data: transactions } = await supabase
                .from('transactions')
                .select('*')
                .eq('contact', client.name);

            const allEvents: TimelineEvent[] = [];

            (sales || []).forEach(s => {
                allEvents.push({
                    id: s.id,
                    date: new Date(s.created_at),
                    title: `Venda / Proposta: ${s.product}`,
                    description: `${s.quantity}x ${s.product} • Canal: ${s.channel || "Direto"}`,
                    type: 'sale',
                    amount: s.total_value,
                    status: s.status
                });
            });

            (orders || []).forEach(o => {
                allEvents.push({
                    id: o.id,
                    date: new Date(o.created_at || o.open_date),
                    title: `Ordem de Serviço #${o.ticket_number}`,
                    description: `${o.type}: ${o.action}`,
                    type: 'service_order',
                    status: o.status
                });
            });

            (transactions || []).forEach(t => {
                allEvents.push({
                    id: t.id,
                    date: new Date(t.created_at || t.due_date),
                    title: `Lançamento: ${t.description}`,
                    description: `${t.category} • Vencimento: ${t.due_date || "-"}`,
                    type: 'transaction',
                    amount: t.amount,
                    status: t.status
                });
            });

            setEvents(allEvents.sort((a, b) => b.date.getTime() - a.date.getTime()));
        } catch (error) {
            console.error('Error fetching timeline:', error);
        } finally {
            setLoading(false);
        }
    };

    // Cálculos de Resumo 360°
    const summary = useMemo(() => {
        const salesEvents = events.filter(e => e.type === 'sale');
        const closedSales = salesEvents.filter(e => e.status === 'fechado' || e.status === 'pos_venda');
        const totalInvested = closedSales.reduce((acc, curr) => acc + (curr.amount || 0), 0);

        const orderEvents = events.filter(e => e.type === 'service_order');
        const pendingTransactions = events.filter(e => e.type === 'transaction' && e.status === 'pendente');
        const pendingAmount = pendingTransactions.reduce((acc, curr) => acc + (curr.amount || 0), 0);

        return {
            totalInvested,
            projectCount: closedSales.length || salesEvents.length,
            activeOrdersCount: orderEvents.length,
            pendingAmount
        };
    }, [events]);

    const filteredEvents = useMemo(() => {
        if (filterType === "all") return events;
        return events.filter(e => e.type === filterType);
    }, [events, filterType]);

    const getTypeIcon = (type: TimelineEvent['type']) => {
        switch (type) {
            case 'sale': return <Calculator className="h-4 w-4 text-amber-400" />;
            case 'service_order': return <ClipboardList className="h-4 w-4 text-blue-400" />;
            case 'transaction': return <DollarSign className="h-4 w-4 text-emerald-400" />;
        }
    };

    const getTypeColor = (type: TimelineEvent['type']) => {
        switch (type) {
            case 'sale': return "bg-amber-500/10 text-amber-500 border-amber-500/20";
            case 'service_order': return "bg-blue-500/10 text-blue-500 border-blue-500/20";
            case 'transaction': return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
        }
    };

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-full sm:max-w-2xl bg-card/95 backdrop-blur-2xl border-l border-white/10 p-0 overflow-hidden text-white shadow-2xl flex flex-col h-full">
                    {/* Header Executivo 360° */}
                    <div className="p-6 sm:p-7 border-b border-white/10 bg-black/40 relative shrink-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-black text-lg shadow-inner">
                                    {client?.name ? client.name.charAt(0).toUpperCase() : "C"}
                                </div>
                                <div>
                                    <SheetTitle className="text-xl font-bold text-white tracking-tight leading-tight">
                                        {client?.name}
                                    </SheetTitle>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                                        {client?.phone && (
                                            <span className="flex items-center gap-1 font-mono text-white/80">
                                                <Phone className="h-3 w-3 text-primary" /> {client.phone}
                                            </span>
                                        )}
                                        {client?.city && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3 text-muted-foreground" /> {client.city}/{client.state}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Botão de WhatsApp */}
                            {client?.phone && (
                                <Button
                                    type="button"
                                    onClick={() => setIsWhatsAppOpen(true)}
                                    className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 px-4 shadow-lg shadow-emerald-600/20 self-start sm:self-auto"
                                >
                                    <MessageSquare className="h-4 w-4" />
                                    <span>WhatsApp</span>
                                </Button>
                            )}
                        </div>

                        {/* Cards de Resumo 360° */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-0.5">
                                <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground block">
                                    Total Faturado
                                </span>
                                <span className="text-sm font-black text-emerald-400 font-mono block">
                                    {formatCurrency(summary.totalInvested)}
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-0.5">
                                <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground block">
                                    Projetos
                                </span>
                                <span className="text-sm font-black text-primary font-mono block">
                                    {summary.projectCount} {summary.projectCount === 1 ? "projeto" : "projetos"}
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-0.5">
                                <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground block">
                                    Ordens de Serviço
                                </span>
                                <span className="text-sm font-black text-blue-400 font-mono block">
                                    {summary.activeOrdersCount} na fábrica
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-0.5">
                                <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground block">
                                    A Receber
                                </span>
                                <span className="text-sm font-black text-amber-400 font-mono block">
                                    {formatCurrency(summary.pendingAmount)}
                                </span>
                            </div>
                        </div>

                        {/* Filtros de Abas */}
                        <div className="flex items-center gap-1.5 mt-4 overflow-x-auto">
                            <button
                                onClick={() => setFilterType("all")}
                                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                    filterType === "all"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-white/5 text-muted-foreground hover:text-white"
                                }`}
                            >
                                Todos ({events.length})
                            </button>
                            <button
                                onClick={() => setFilterType("sale")}
                                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                    filterType === "sale"
                                        ? "bg-amber-500 text-black"
                                        : "bg-white/5 text-muted-foreground hover:text-white"
                                }`}
                            >
                                Vendas & CRM
                            </button>
                            <button
                                onClick={() => setFilterType("service_order")}
                                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                    filterType === "service_order"
                                        ? "bg-blue-500 text-white"
                                        : "bg-white/5 text-muted-foreground hover:text-white"
                                }`}
                            >
                                Ordens de Serviço
                            </button>
                            <button
                                onClick={() => setFilterType("transaction")}
                                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                    filterType === "transaction"
                                        ? "bg-emerald-500 text-white"
                                        : "bg-white/5 text-muted-foreground hover:text-white"
                                }`}
                            >
                                Financeiro
                            </button>
                        </div>
                    </div>

                    {/* Lista de Eventos / Timeline */}
                    <div className="p-6 sm:p-7 flex-1 overflow-y-auto space-y-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-48 space-y-3">
                                <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                <p className="text-xs text-muted-foreground">Consolidando dados do cliente...</p>
                            </div>
                        ) : filteredEvents.length > 0 ? (
                            <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-white/10">
                                {filteredEvents.map((event, index) => (
                                    <div key={`${event.id}-${index}`} className="relative flex items-start gap-5 group">
                                        <div className={cn(
                                            "flex items-center justify-center w-10 h-10 rounded-xl border z-10 shrink-0 transition-transform group-hover:scale-110 shadow-lg",
                                            getTypeColor(event.type)
                                        )}>
                                            {getTypeIcon(event.type)}
                                        </div>

                                        <div className="flex flex-col gap-1.5 flex-1 pb-6 border-b border-white/5 last:border-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5">
                                                    <Calendar className="h-3 w-3 text-primary" />
                                                    {format(event.date, "dd/MM/yyyy • HH:mm", { locale: ptBR })}
                                                </span>
                                                <Badge variant="outline" className="text-[9px] uppercase font-bold px-2 py-0 h-4 border-white/10 bg-white/5">
                                                    {event.status || 'Ativo'}
                                                </Badge>
                                            </div>

                                            <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                                                {event.title}
                                            </h4>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                {event.description}
                                            </p>

                                            {event.amount && (
                                                <div className="mt-1">
                                                    <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                                        {formatCurrency(event.amount)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-16 text-center space-y-2">
                                <Clock className="h-8 w-8 text-white/20 mx-auto" />
                                <p className="text-xs font-bold text-white uppercase tracking-wider">Nenhum registro encontrado</p>
                                <p className="text-[10px] text-muted-foreground">Nenhum evento registrado nesta categoria para este cliente.</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-white/10 bg-black/40 flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                        <span>BJL Enterprise • Central 360°</span>
                        <span>{filteredEvents.length} registros</span>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Modal de WhatsApp Integrado */}
            {isWhatsAppOpen && client && (
                <WhatsAppQuickDialog
                    open={isWhatsAppOpen}
                    onOpenChange={setIsWhatsAppOpen}
                    clientName={client.name}
                    clientPhone={client.phone}
                    context="general"
                />
            )}
        </>
    );
}
