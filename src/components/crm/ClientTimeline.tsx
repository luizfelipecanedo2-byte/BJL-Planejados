import { useState, useEffect } from "react";
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
    History
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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

    useEffect(() => {
        if (open && client) {
            fetchTimelineData();
        }
    }, [open, client]);

    const fetchTimelineData = async () => {
        if (!client) return;
        setLoading(true);
        try {
            // Fetch Sales
            const { data: sales } = await supabase
                .from('sales')
                .select('*')
                .eq('client_name', client.name);

            // Fetch Service Orders
            const { data: orders } = await supabase
                .from('service_orders')
                .select('*')
                .eq('client', client.name);

            // Fetch Transactions
            const { data: transactions } = await supabase
                .from('transactions')
                .select('*')
                .eq('contact', client.name);

            const allEvents: TimelineEvent[] = [];

            (sales || []).forEach(s => {
                allEvents.push({
                    id: s.id,
                    date: new Date(s.created_at),
                    title: `Orçamento: ${s.product}`,
                    description: `${s.quantity}x ${s.product}`,
                    type: 'sale',
                    amount: s.total_value,
                    status: s.status
                });
            });

            (orders || []).forEach(o => {
                allEvents.push({
                    id: o.id,
                    date: new Date(o.created_at || o.open_date),
                    title: `OS #${o.ticket_number}: ${o.type}`,
                    description: o.action,
                    type: 'service_order',
                    status: o.status
                });
            });

            (transactions || []).forEach(t => {
                allEvents.push({
                    id: t.id,
                    date: new Date(t.created_at || t.due_date),
                    title: `Financeiro: ${t.description}`,
                    description: t.category,
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

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    const getTypeIcon = (type: TimelineEvent['type']) => {
        switch (type) {
            case 'sale': return <Calculator className="h-4 w-4" />;
            case 'service_order': return <ClipboardList className="h-4 w-4" />;
            case 'transaction': return <DollarSign className="h-4 w-4" />;
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
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl glass-card border-l border-white/10 p-0 overflow-hidden luxury-shadow">
                <div className="h-32 bg-primary p-8 text-primary-foreground relative overflow-hidden">
                    <div className="absolute inset-0 aurora-bg opacity-30" />
                    <SheetHeader className="relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                                <History className="h-6 w-6" />
                            </div>
                            <div>
                                <SheetTitle className="text-2xl font-black uppercase tracking-tighter text-white">Linha do Tempo</SheetTitle>
                                <SheetDescription className="text-white/70 font-medium">{client?.name}</SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>
                </div>

                <div className="p-8 h-[calc(100vh-128px)] overflow-y-auto hide-scrollbar space-y-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Carregando Histórico...</p>
                        </div>
                    ) : events.length > 0 ? (
                        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/50 before:via-white/10 before:to-transparent">
                            {events.map((event, index) => (
                                <div key={`${event.id}-${index}`} className="relative flex items-start gap-6 group">
                                    <div className={cn(
                                        "flex items-center justify-center w-10 h-10 rounded-xl border z-10 shrink-0 transition-all duration-500 group-hover:scale-110 shadow-lg",
                                        getTypeColor(event.type)
                                    )}>
                                        {getTypeIcon(event.type)}
                                    </div>
                                    <div className="flex flex-col gap-2 flex-1 pb-8 border-b border-white/5 last:border-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                                <Calendar className="h-3 w-3" />
                                                {format(event.date, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                            </span>
                                            <Badge variant="outline" className="text-[9px] uppercase font-black px-2 py-0 h-4 border-white/10 bg-white/5">
                                                {event.status || 'Finalizado'}
                                            </Badge>
                                        </div>
                                        <h4 className="text-base font-black text-luxury tracking-tight group-hover:text-primary transition-colors">
                                            {event.title}
                                        </h4>
                                        <p className="text-sm text-muted-foreground font-medium line-clamp-2">
                                            {event.description}
                                        </p>
                                        {event.amount && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <div className="px-2 py-1 bg-white/5 rounded-lg border border-white/5 text-xs font-bold text-luxury">
                                                    {formatCurrency(event.amount)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-dashed border-white/10">
                                <Clock className="h-10 w-10 text-white/10" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Nenhuma atividade encontrada</p>
                                <p className="text-[10px] text-muted-foreground/40 px-12">Este cliente ainda não possui registros financeiros, orçamentos ou ordens de serviço vinculadas.</p>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-center">
                    <p className="text-[9px] font-black uppercase text-muted-foreground/30 tracking-[0.3em]">BJL PLANEJADOS • VISÃO 360º</p>
                </div>
            </SheetContent>
        </Sheet>
    );
}
