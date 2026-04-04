import { ServiceOrder, ServiceStatus } from "@/types/serviceOrder";
import { cn } from "@/lib/utils";
import { 
    format, 
    addDays, 
    startOfDay, 
    isSameDay, 
    differenceInDays, 
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isWeekend
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useRef, useEffect } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Info, Hammer, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ProductionTimelineProps {
    orders: ServiceOrder[];
    onEdit: (order: ServiceOrder) => void;
}

const ProductionTimeline = ({ orders, onEdit }: ProductionTimelineProps) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    // Configurações do Timeline
    const daysToShow = 45; // Mostra 45 dias
    const startDate = startOfDay(addDays(new Date(), -7)); // Começa 1 semana atrás
    const days = useMemo(() => {
        return Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i));
    }, [startDate]);

    const activeOrders = useMemo(() => {
        return orders
            .filter(o => o.status !== "Entregue e Finalizado" && o.status !== "A Definir")
            .sort((a, b) => a.forecastDate.getTime() - b.forecastDate.getTime());
    }, [orders]);

    const getStatusColor = (status: ServiceStatus) => {
        switch (status) {
            case "Plano de corte": return "bg-slate-500";
            case "Pronto para produção": return "bg-blue-500";
            case "Corte da caixa": return "bg-orange-500";
            case "Fita": return "bg-amber-500";
            case "Montagem das caixas": return "bg-yellow-600";
            case "Corte das portas + Tamponados": return "bg-indigo-500";
            case "Colocação dos tamponados": return "bg-purple-500";
            case "Embalagem": return "bg-pink-500";
            case "Pronto para entrega": return "bg-cyan-500";
            case "Instalação": return "bg-emerald-400";
            default: return "bg-slate-400";
        }
    };

    // Scroll para o dia de hoje no carregamento
    useEffect(() => {
        if (scrollContainerRef.current) {
            const todayIndex = days.findIndex(d => isSameDay(d, new Date()));
            if (todayIndex !== -1) {
                const scrollPos = (todayIndex * 120) - 200; // 120px é a largura da coluna
                scrollContainerRef.current.scrollLeft = scrollPos;
            }
        }
    }, [days]);

    const calculateBarPosition = (order: ServiceOrder) => {
        const orderStart = startOfDay(order.openDate);
        const orderEnd = startOfDay(order.forecastDate);
        
        // Se a ordem começa antes do nosso range, clipamos
        const displayStart = orderStart < startDate ? startDate : orderStart;
        const displayEnd = orderEnd;

        const startOffset = differenceInDays(displayStart, startDate);
        const duration = differenceInDays(displayEnd, displayStart) + 1;

        return {
            left: startOffset * 120, // 120px per day
            width: Math.max(duration * 120, 100), // Mínimo de 100px para visibilidade
        };
    };

    return (
        <div className="flex flex-col h-full bg-slate-950/50 rounded-3xl border border-white/10 overflow-hidden backdrop-blur-xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                        <CalendarDays className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black tracking-tighter uppercase text-white">Cronograma de Produção</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Visualização em Tempo Real (45 Dias)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex gap-2 mr-4">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded bg-blue-500" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Produção</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded bg-amber-500" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Atraso</span>
                        </div>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => scrollContainerRef.current?.scrollBy({ left: -300, behavior: 'smooth' })} className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => scrollContainerRef.current?.scrollBy({ left: 300, behavior: 'smooth' })} className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="relative flex-1 overflow-hidden flex flex-col">
                {/* Header de Datas */}
                <div className="flex ml-[250px] border-b border-white/5 bg-slate-900/50">
                    {days.map((day, i) => (
                        <div 
                            key={i} 
                            className={cn(
                                "min-w-[120px] py-4 text-center border-r border-white/5 flex flex-col items-center justify-center gap-1",
                                isSameDay(day, new Date()) ? "bg-primary/20" : "",
                                isWeekend(day) ? "bg-slate-950/30" : ""
                            )}
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                {format(day, 'EEE', { locale: ptBR })}
                            </span>
                            <span className={cn(
                                "text-lg font-black tracking-tighter",
                                isSameDay(day, new Date()) ? "text-primary" : "text-slate-300"
                            )}>
                                {format(day, 'dd/MM')}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Grid de Conteúdo */}
                <div 
                    ref={scrollContainerRef}
                    className="flex-1 overflow-auto scroll-smooth scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                >
                    <div className="relative min-h-full">
                        {/* Linhas Horizontais */}
                        {activeOrders.map((_, i) => (
                            <div key={i} className="absolute left-0 right-0 border-b border-white/5 h-[80px]" style={{ top: i * 80 }} />
                        ))}

                        {/* Colunas Verticais e Hoje */}
                        <div className="absolute top-0 bottom-0 left-[250px] flex pointer-events-none">
                            {days.map((day, i) => (
                                <div 
                                    key={i} 
                                    className={cn(
                                        "min-w-[120px] border-r border-white/5 h-full",
                                        isSameDay(day, new Date()) ? "bg-primary/5 border-x-2 border-primary/20 z-10" : ""
                                    )}
                                />
                            ))}
                        </div>

                        {/* Listagem de Projetos e Barras */}
                        <div className="relative z-20">
                            {activeOrders.map((order, i) => {
                                const pos = calculateBarPosition(order);
                                const isOverdue = new Date() > order.forecastDate;

                                return (
                                    <div key={order.id} className="h-[80px] flex items-center relative group">
                                        {/* Título do Projeto (Fixo à esquerda) */}
                                        <div className="sticky left-0 w-[250px] h-full bg-slate-900/95 backdrop-blur-xl border-r border-white/10 px-6 flex flex-col justify-center z-30 shadow-2xl">
                                            <h4 className="text-sm font-black text-white truncate uppercase tracking-tight group-hover:text-primary transition-colors">
                                                {order.client}
                                            </h4>
                                            <div className="flex items-center gap-2">
                                                <span className={cn("inline-block w-2 h-2 rounded-full", getStatusColor(order.status))} />
                                                <span className="text-[9px] font-bold text-slate-500 uppercase truncate">
                                                    {order.status}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Barra de Tempo */}
                                        <div className="ml-[250px] relative w-full h-full">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div 
                                                            className={cn(
                                                                "absolute h-10 top-1/2 -translate-y-1/2 rounded-2xl flex items-center px-4 cursor-pointer transition-all hover:scale-[1.02] shadow-lg group/bar overflow-hidden",
                                                                getStatusColor(order.status),
                                                                isOverdue && !isSameDay(new Date(), order.forecastDate) ? "ring-2 ring-rose-500 ring-offset-2 ring-offset-slate-950" : ""
                                                            )}
                                                            style={{ 
                                                                left: pos.left, 
                                                                width: pos.width 
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onEdit(order);
                                                            }}
                                                        >
                                                            {/* Brilho Animado */}
                                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/bar:animate-shimmer" />
                                                            
                                                            <span className="text-[10px] font-black text-white uppercase truncate drop-shadow-md">
                                                                {order.client} ({order.ticketNumber})
                                                            </span>

                                                            {isOverdue && (
                                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-rose-100 flex items-center gap-1 px-2 py-0.5 bg-rose-600 rounded-full text-[8px] font-black uppercase">
                                                                    <Clock className="h-2.5 w-2.5" />
                                                                    Atraso
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="bg-slate-900 border-white/10 p-4 rounded-2xl shadow-2xl">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2">
                                                                <span className="font-black text-lg uppercase tracking-tight">{order.client}</span>
                                                                <span className="text-[10px] font-bold text-slate-500">#{order.ticketNumber}</span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4 pt-1">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[8px] font-black text-slate-500 uppercase">Início</span>
                                                                    <span className="text-xs font-bold text-white">{format(order.openDate, 'dd/MM/yyyy')}</span>
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[8px] font-black text-slate-500 uppercase">Previsão</span>
                                                                    <span className={cn("text-xs font-bold", isOverdue ? "text-rose-500" : "text-emerald-500")}>
                                                                        {format(order.forecastDate, 'dd/MM/yyyy')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="pt-2">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <Hammer className="h-3 w-3 text-primary" />
                                                                    <span className="text-[10px] font-black text-white uppercase">{order.status}</span>
                                                                </div>
                                                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                                                    <div className={cn("h-full", getStatusColor(order.status))} style={{ width: '60%' }} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer / Legenda */}
            <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-between">
                <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Total Projetos Ativos:</span>
                        <span className="text-xs font-black text-white">{activeOrders.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Próxima Entrega:</span>
                        <span className="text-xs font-black text-emerald-500">
                            {activeOrders[0] ? format(activeOrders[0].forecastDate, 'dd/MM') : '—'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-bold text-slate-600 uppercase tracking-tighter">
                    <Info className="h-3 w-3" />
                    Clique nas barras para editar a Ordem de Serviço
                </div>
            </div>
        </div>
    );
};

export default ProductionTimeline;
