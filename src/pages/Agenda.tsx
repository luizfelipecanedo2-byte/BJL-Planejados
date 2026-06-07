import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    DollarSign,
    Users,
    ClipboardList,
    CheckSquare,
    Package,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    CheckCircle2,
    Clock,
    Plus,
    X,
    Eye
} from "lucide-react";
import { format, addMonths, subMonths, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { playClickSound, playHoverSound } from "@/lib/audio";

interface CalendarEvent {
    id: string;
    type: "expense" | "income" | "visit" | "budget" | "task" | "order";
    title: string;
    description?: string;
    date: Date;
    value?: number;
    status: string; // 'pending' | 'paid' | 'completed' | 'closed' etc.
    originalData: any;
}

export default function Agenda() {
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [loading, setLoading] = useState<boolean>(true);
    const [events, setEvents] = useState<CalendarEvent[]>([]);

    // State to force re-render when an item is modified
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

    // Helpers to parse date string without timezone shift
    const parseDateStr = (dateStr: string | null): Date | null => {
        if (!dateStr) return null;
        const d = new Date(dateStr + "T12:00:00");
        return isNaN(d.getTime()) ? null : d;
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Calculate month parameters
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDayOfMonth.getDay(); // 0: Sunday, 1: Monday, etc.

    // Date range for filtering database queries
    const startDateStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const endDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    useEffect(() => {
        const fetchAllEvents = async () => {
            setLoading(true);
            try {
                // Fetch transactions, tasks, sales, budgets, weekly orders in parallel
                const [
                    { data: transactions, error: transError },
                    { data: tasks, error: tasksError },
                    { data: sales, error: salesError },
                    { data: budgets, error: budgetsError },
                    { data: weeklyOrders, error: ordersError }
                ] = await Promise.all([
                    supabase.from("transactions").select("*").gte("due_date", startDateStr).lte("due_date", endDateStr),
                    supabase.from("tasks").select("*").gte("due_date", startDateStr).lte("due_date", endDateStr),
                    supabase.from("sales").select("*").or(`contact_date.gte.${startDateStr},expected_close_date.gte.${startDateStr}`),
                    supabase.from("budgets").select("*"),
                    supabase.from("weekly_orders").select("*").gte("order_date", startDateStr).lte("order_date", endDateStr)
                ]);

                if (transError) throw transError;
                if (tasksError) throw tasksError;
                if (salesError) throw salesError;
                if (budgetsError) throw budgetsError;
                if (ordersError) throw ordersError;

                const allEvents: CalendarEvent[] = [];

                // 1. Map Transactions (Contas a pagar / receber)
                (transactions || []).forEach((t: any) => {
                    const eventDate = parseDateStr(t.due_date);
                    if (eventDate) {
                        const isExpense = t.type === "expense";
                        allEvents.push({
                            id: t.id,
                            type: isExpense ? "expense" : "income",
                            title: t.description || (isExpense ? "Despesa" : "Receita"),
                            description: `Categoria: ${t.category || "Geral"}${t.payment_method ? ` • Mapeado via ${t.payment_method}` : ""}`,
                            date: eventDate,
                            value: Number(t.amount),
                            status: t.status,
                            originalData: t
                        });
                    }
                });

                // 2. Map Tasks (Tarefas)
                (tasks || []).forEach((task: any) => {
                    const eventDate = parseDateStr(task.due_date);
                    if (eventDate) {
                        allEvents.push({
                            id: task.id,
                            type: "task",
                            title: task.title,
                            description: `${task.description || "Sem descrição"}${task.project_name ? ` [Projeto: ${task.project_name}]` : ""}`,
                            date: eventDate,
                            status: task.status,
                            originalData: task
                        });
                    }
                });

                // 3. Map Sales (Visitas / Contatos Clientes)
                (sales || []).forEach((sale: any) => {
                    // Visita / Contato
                    const contactDate = parseDateStr(sale.contact_date);
                    if (contactDate && contactDate >= firstDayOfMonth && contactDate <= new Date(year, month, daysInMonth)) {
                        allEvents.push({
                            id: `${sale.id}-contact`,
                            type: "visit",
                            title: `Visitar/Contatar: ${sale.client_name}`,
                            description: `Produto: ${sale.product} • Canal: ${sale.channel || "Não informado"}${sale.notes ? ` • Obs: ${sale.notes}` : ""}`,
                            date: contactDate,
                            value: Number(sale.total_value),
                            status: sale.status,
                            originalData: sale
                        });
                    }

                    // Fechamento esperado
                    const closeDate = parseDateStr(sale.expected_close_date);
                    if (closeDate && closeDate >= firstDayOfMonth && closeDate <= new Date(year, month, daysInMonth)) {
                        allEvents.push({
                            id: `${sale.id}-close`,
                            type: "visit",
                            title: `Fechamento Esperado: ${sale.client_name}`,
                            description: `Previsão de venda para ${sale.product} (${sale.status})`,
                            date: closeDate,
                            value: Number(sale.total_value),
                            status: sale.status,
                            originalData: sale
                        });
                    }
                });

                // 4. Map Budgets (Orçamentos a entregar / produção)
                (budgets || []).forEach((b: any) => {
                    // Budgets can be mapped by created_at (timestamp) or production_date (string)
                    const budgetDate = parseDateStr(b.production_date) || (b.created_at ? new Date(b.created_at) : null);
                    if (budgetDate && budgetDate >= firstDayOfMonth && budgetDate <= new Date(year, month, daysInMonth)) {
                        allEvents.push({
                            id: b.id,
                            type: "budget",
                            title: `Orçamento: ${b.client_name}`,
                            description: `Projeto: ${b.project_name} • Status: ${b.status} • Prioridade: ${b.priority_level || "normal"}`,
                            date: budgetDate,
                            value: Number(b.total_value),
                            status: b.status,
                            originalData: b
                        });
                    }
                });

                // 5. Map Weekly Orders (Pedidos da semana)
                (weeklyOrders || []).forEach((order: any) => {
                    const eventDate = parseDateStr(order.order_date);
                    if (eventDate) {
                        allEvents.push({
                            id: order.id,
                            type: "order",
                            title: `Pedido: ${order.product}`,
                            description: `Qtd: ${order.quantity} • Fornecedor: ${order.supplier || "Não definido"} • Cliente: ${order.client}`,
                            date: eventDate,
                            value: Number(order.total_value),
                            status: order.status,
                            originalData: order
                        });
                    }
                });

                setEvents(allEvents);
            } catch (err: any) {
                console.error("Erro ao carregar dados da agenda:", err);
                toast.error("Erro ao carregar os eventos da agenda.");
            } finally {
                setLoading(false);
            }
        };

        fetchAllEvents();
    }, [currentDate, refreshTrigger]);

    // Handle Month changes
    const nextMonth = () => {
        playClickSound();
        setCurrentDate(addMonths(currentDate, 1));
    };

    const prevMonth = () => {
        playClickSound();
        setCurrentDate(subMonths(currentDate, 1));
    };

    const setToday = () => {
        playClickSound();
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
    };

    // Calculate grid days representation
    const calendarDays = useMemo(() => {
        const gridDays: (Date | null)[] = [];
        
        // Offset padding for start of month
        for (let i = 0; i < startOffset; i++) {
            gridDays.push(null);
        }

        // Real month days
        for (let day = 1; day <= daysInMonth; day++) {
            gridDays.push(new Date(year, month, day));
        }

        return gridDays;
    }, [year, month, startOffset, daysInMonth]);

    // Group events of the selected day
    const selectedDayEvents = useMemo(() => {
        return events.filter(e => isSameDay(e.date, selectedDate));
    }, [events, selectedDate]);

    // Quick action: Toggle task completion status
    const handleToggleTaskStatus = async (event: CalendarEvent) => {
        playClickSound();
        const task = event.originalData;
        const newStatus = task.status === "pending" ? "completed" : "pending";
        const completedAt = newStatus === "completed" ? new Date().toISOString() : null;

        try {
            const { error } = await supabase
                .from("tasks")
                .update({ status: newStatus, completed_at: completedAt })
                .eq("id", task.id);

            if (error) throw error;

            toast.success(newStatus === "completed" ? "Tarefa concluída!" : "Tarefa marcada como pendente");
            setRefreshTrigger(prev => prev + 1);
        } catch (err: any) {
            console.error("Erro ao atualizar tarefa:", err);
            toast.error("Erro ao atualizar tarefa.");
        }
    };

    // Quick action: Toggle transaction payment status
    const handleToggleTransactionStatus = async (event: CalendarEvent) => {
        playClickSound();
        const trans = event.originalData;
        const newStatus = trans.status === "paid" ? "pending" : "paid";
        const todayStr = new Date().toISOString().split("T")[0];
        const paymentDate = newStatus === "paid" ? todayStr : null;

        try {
            const { error } = await supabase
                .from("transactions")
                .update({ status: newStatus, payment_date: paymentDate })
                .eq("id", trans.id);

            if (error) throw error;

            toast.success(newStatus === "paid" ? "Lançamento marcado como pago!" : "Lançamento marcado como pendente");
            setRefreshTrigger(prev => prev + 1);
        } catch (err: any) {
            console.error("Erro ao atualizar transação:", err);
            toast.error("Erro ao atualizar transação.");
        }
    };

    // Quick action: Mark weekly order as ordered/bought
    const handleToggleOrderStatus = async (event: CalendarEvent) => {
        playClickSound();
        const order = event.originalData;
        const newStatus = order.status === "pendente" ? "comprado" : "pendente";

        try {
            const { error } = await supabase
                .from("weekly_orders")
                .update({ status: newStatus })
                .eq("id", order.id);

            if (error) throw error;

            toast.success(newStatus === "comprado" ? "Pedido marcado como comprado!" : "Pedido marcado como pendente");
            setRefreshTrigger(prev => prev + 1);
        } catch (err: any) {
            console.error("Erro ao atualizar pedido:", err);
            toast.error("Erro ao atualizar status do pedido.");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-luxury shimmer-gold uppercase">
                        Agenda Geral
                    </h1>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">
                        Cronograma unificado de finanças, tarefas, clientes, orçamentos e pedidos.
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={prevMonth}
                        onMouseEnter={playHoverSound}
                        className="rounded-xl border-white/10 hover:bg-white/5"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <span className="text-sm font-black uppercase tracking-wider text-white px-4 min-w-[150px] text-center">
                        {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                    </span>
                    
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={nextMonth}
                        onMouseEnter={playHoverSound}
                        className="rounded-xl border-white/10 hover:bg-white/5"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="outline"
                        onClick={setToday}
                        onMouseEnter={playHoverSound}
                        className="ml-2 rounded-xl border-white/10 hover:bg-white/5 font-bold uppercase text-[10px] tracking-wider"
                    >
                        Hoje
                    </Button>
                </div>
            </div>

            {/* Main view container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* 1. Calendar Monthly Grid (Col Span 8) */}
                <Card className="lg:col-span-8 glass-card border border-white/10 shadow-2xl overflow-hidden relative">
                    <CardHeader className="border-b border-white/5 bg-white/[0.01] py-4">
                        <div className="grid grid-cols-7 text-center font-bold text-[10px] uppercase tracking-widest text-primary/70">
                            <div>Dom</div>
                            <div>Seg</div>
                            <div>Ter</div>
                            <div>Qua</div>
                            <div>Qui</div>
                            <div>Sex</div>
                            <div>Sáb</div>
                        </div>
                    </CardHeader>
                    
                    <CardContent className="p-0 relative">
                        {loading && (
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-20 flex items-center justify-center">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Carregando Agenda...</span>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-7 grid-rows-5 border-collapse min-h-[500px]">
                            {calendarDays.map((day, idx) => {
                                const isSelected = day && isSameDay(day, selectedDate);
                                const isToday = day && isSameDay(day, new Date());
                                
                                // Get events for this specific day
                                const dayEvents = day 
                                    ? events.filter(e => isSameDay(e.date, day))
                                    : [];

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            if (day) {
                                                playClickSound();
                                                setSelectedDate(day);
                                            }
                                        }}
                                        className={cn(
                                            "border-r border-b border-white/5 p-2 min-h-[90px] transition-all flex flex-col justify-between relative group",
                                            day ? "cursor-pointer hover:bg-white/[0.02]" : "bg-black/10 opacity-30 select-none",
                                            isSelected ? "bg-primary/5 border-primary/20" : "",
                                            (idx + 1) % 7 === 0 ? "border-r-0" : ""
                                        )}
                                    >
                                        {/* Day number */}
                                        <div className="flex justify-between items-start">
                                            <span className={cn(
                                                "text-xs font-black rounded-lg w-6 h-6 flex items-center justify-center transition-colors",
                                                isToday ? "bg-primary text-black font-black shadow-[0_0_15px_rgba(251,191,36,0.5)]" : "text-muted-foreground",
                                                isSelected && !isToday ? "border border-primary/40 text-primary" : ""
                                            )}>
                                                {day ? day.getDate() : ""}
                                            </span>

                                            {dayEvents.length > 0 && (
                                                <span className="text-[8px] font-black uppercase text-primary bg-primary/10 px-1.5 py-0.5 rounded-md border border-primary/20">
                                                    {dayEvents.length}
                                                </span>
                                            )}
                                        </div>

                                        {/* Event dots / mini list */}
                                        <div className="mt-2 space-y-1 overflow-hidden max-h-[70px]">
                                            {/* Grid layout on desktop, or simply small bullet bars */}
                                            {dayEvents.slice(0, 3).map((ev, eIdx) => {
                                                const colorClass = 
                                                    ev.type === "expense" ? "bg-rose-500/10 border-rose-500/30 text-rose-400" :
                                                    ev.type === "income" ? "bg-blue-500/10 border-blue-500/30 text-blue-400" :
                                                    ev.type === "visit" ? "bg-purple-500/10 border-purple-500/30 text-purple-400" :
                                                    ev.type === "budget" ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                                                    ev.type === "task" ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" :
                                                    "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"; // order

                                                return (
                                                    <div
                                                        key={eIdx}
                                                        className={cn(
                                                            "hidden sm:block text-[8px] font-bold truncate rounded-md px-1 py-0.5 border leading-tight",
                                                            colorClass
                                                        )}
                                                        title={ev.title}
                                                    >
                                                        {ev.type === "expense" && "- "}
                                                        {ev.type === "income" && "+ "}
                                                        {ev.title}
                                                    </div>
                                                );
                                            })}

                                            {/* Micro-dots for mobile / overflow indicator */}
                                            <div className="flex flex-wrap gap-1 mt-1 justify-start">
                                                {dayEvents.map((ev, eIdx) => {
                                                    const dotColorClass = 
                                                        ev.type === "expense" ? "bg-rose-500" :
                                                        ev.type === "income" ? "bg-blue-500" :
                                                        ev.type === "visit" ? "bg-purple-500" :
                                                        ev.type === "budget" ? "bg-amber-500" :
                                                        ev.type === "task" ? "bg-cyan-500" :
                                                        "bg-emerald-500"; // order

                                                    return (
                                                        <span
                                                            key={eIdx}
                                                            className={cn(
                                                                "w-1.5 h-1.5 rounded-full sm:hidden",
                                                                dotColorClass
                                                            )}
                                                        />
                                                    );
                                                })}

                                                {dayEvents.length > 3 && (
                                                    <span className="hidden sm:inline text-[7px] font-black text-muted-foreground tracking-tighter">
                                                        +{dayEvents.length - 3} mais
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Selected Day Details Sidebar Panel (Col Span 4) */}
                <div className="lg:col-span-4 space-y-6">
                    
                    {/* Main Details Panel */}
                    <Card className="glass-card border border-white/10 shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                        
                        <CardHeader className="border-b border-white/5 relative z-10 py-5">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-black uppercase tracking-wider text-luxury">
                                    Detalhes do Dia
                                </CardTitle>
                                <span className="text-[10px] font-black uppercase text-primary tracking-widest bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                                    {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                                </span>
                            </div>
                        </CardHeader>
                        
                        <CardContent className="p-6 space-y-6 relative z-10">
                            {selectedDayEvents.length === 0 ? (
                                <div className="text-center py-12 space-y-3">
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-muted-foreground/40">
                                        <CalendarIcon className="w-6 h-6" />
                                    </div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Nenhum evento agendado
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/60 max-w-[200px] mx-auto">
                                        Não há contas, tarefas, visitas ou pedidos programados para este dia.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                                    {selectedDayEvents.map((ev, evIdx) => {
                                        // Specific UI details depending on type
                                        const themeColors = 
                                            ev.type === "expense" ? { border: "border-rose-500/20", bg: "bg-rose-500/5", iconColor: "text-rose-500", label: "Despesa" } :
                                            ev.type === "income" ? { border: "border-blue-500/20", bg: "bg-blue-500/5", iconColor: "text-blue-500", label: "Receita" } :
                                            ev.type === "visit" ? { border: "border-purple-500/20", bg: "bg-purple-500/5", iconColor: "text-purple-500", label: "Cliente/Visita" } :
                                            ev.type === "budget" ? { border: "border-amber-500/20", bg: "bg-amber-500/5", iconColor: "text-amber-500", label: "Orçamento" } :
                                            ev.type === "task" ? { border: "border-cyan-500/20", bg: "bg-cyan-500/5", iconColor: "text-cyan-500", label: "Tarefa" } :
                                            { border: "border-emerald-500/20", bg: "bg-emerald-500/5", iconColor: "text-emerald-500", label: "Pedido de Compra" }; // order

                                        const formattedValue = ev.value !== undefined
                                            ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(ev.value)
                                            : null;

                                        return (
                                            <div
                                                key={evIdx}
                                                className={cn(
                                                    "p-3 rounded-2xl border transition-all duration-300 flex flex-col justify-between gap-3 hover:border-white/20",
                                                    themeColors.border,
                                                    themeColors.bg
                                                )}
                                            >
                                                {/* Meta Info & Category */}
                                                <div className="flex items-center justify-between">
                                                    <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-black/30 border border-white/5", themeColors.iconColor)}>
                                                        {themeColors.label}
                                                    </span>
                                                    
                                                    {/* Status Badge */}
                                                    <Badge className={cn(
                                                        "text-[8px] font-black uppercase tracking-wider px-2 py-0.5",
                                                        ev.status === "paid" || ev.status === "completed" || ev.status === "comprado" || ev.status === "aprovado"
                                                            ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                                                            : "bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                                                    )}>
                                                        {ev.status === "paid" ? "Pago" : 
                                                         ev.status === "completed" ? "Concluído" : 
                                                         ev.status === "comprado" ? "Comprado" :
                                                         ev.status === "pending" || ev.status === "pendente" ? "Pendente" : 
                                                         ev.status}
                                                    </Badge>
                                                </div>

                                                {/* Content Details */}
                                                <div>
                                                    <h4 className="text-xs font-bold text-white uppercase tracking-tight">
                                                        {ev.title}
                                                    </h4>
                                                    {ev.description && (
                                                        <p className="text-[10px] text-muted-foreground mt-1 font-medium leading-normal">
                                                            {ev.description}
                                                        </p>
                                                    )}
                                                    {formattedValue && (
                                                        <p className={cn("text-xs font-black mt-2", themeColors.iconColor)}>
                                                            Valor: {formattedValue}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Action Panel */}
                                                <div className="flex items-center justify-end pt-2 border-t border-white/5 gap-2">
                                                    
                                                    {/* Action 1: Complete / Incomplete Task */}
                                                    {ev.type === "task" && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleToggleTaskStatus(ev)}
                                                            className={cn(
                                                                "h-7 rounded-lg font-black uppercase text-[8px] tracking-wider px-3",
                                                                ev.status === "completed"
                                                                    ? "hover:text-amber-400 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20"
                                                                    : "hover:text-emerald-400 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20"
                                                            )}
                                                        >
                                                            {ev.status === "completed" ? "Reabrir" : "Concluir"}
                                                        </Button>
                                                    )}

                                                    {/* Action 2: Toggle Finance Paid/Pending */}
                                                    {(ev.type === "expense" || ev.type === "income") && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleToggleTransactionStatus(ev)}
                                                            className={cn(
                                                                "h-7 rounded-lg font-black uppercase text-[8px] tracking-wider px-3",
                                                                ev.status === "paid"
                                                                    ? "hover:text-amber-400 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20"
                                                                    : "hover:text-emerald-400 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20"
                                                            )}
                                                        >
                                                            {ev.status === "paid" ? "Estornar" : "Pagar/Receber"}
                                                        </Button>
                                                    )}

                                                    {/* Action 3: Mark Weekly Order as Purchased */}
                                                    {ev.type === "order" && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleToggleOrderStatus(ev)}
                                                            className={cn(
                                                                "h-7 rounded-lg font-black uppercase text-[8px] tracking-wider px-3",
                                                                ev.status === "comprado"
                                                                    ? "hover:text-amber-400 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20"
                                                                    : "hover:text-emerald-400 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20"
                                                            )}
                                                        >
                                                            {ev.status === "comprado" ? "Pendente" : "Marcar Comprado"}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Legend Card */}
                    <Card className="glass-card border border-white/10 shadow-lg p-4 space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            Legenda de Cores
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-[10px] uppercase font-bold tracking-tight text-white/80">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                <span>Contas a Pagar</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                <span>Contas a Receber</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                                <span>Visitas/CRM</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                <span>Orçamentos</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                                <span>Tarefas</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                <span>Pedidos da Semana</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
