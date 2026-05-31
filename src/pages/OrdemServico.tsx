import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ServiceOrderTable from "@/components/crm/ServiceOrderTable";
import ServiceOrderFormDialog from "@/components/crm/ServiceOrderFormDialog";
import { ServiceOrder, ServiceStatus } from "@/types/serviceOrder";
import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import ProductionTimeline from "@/components/crm/ProductionTimeline";
import OSKanbanBoard from "@/components/crm/OSKanbanBoard";
import { Button } from "@/components/ui/button";
import { MagicButton } from "@/components/ui/magic-button";
import { Plus, Loader2, RefreshCw, DollarSign, CheckCircle, Hammer, Settings2, CalendarDays, AlertCircle, ChevronUp, ChevronDown, MessageSquare, Play, KanbanSquare, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { useCompanySettings } from "@/hooks/useCompanySettings";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    DndContext, 
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { GripVertical, User } from "lucide-react";

const OrdemServico = () => {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    const { settings } = useCompanySettings();
    const [orders, setOrders] = useState<ServiceOrder[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const isAdmin = userRole === 'admin';

    const parseDate = (dateStr: any) => {
        if (!dateStr) return new Date();
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) {
            const d2 = new Date(dateStr + (dateStr.includes('T') ? '' : 'T12:00:00'));
            return isNaN(d2.getTime()) ? new Date() : d2;
        }
        return d;
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            let user = session?.user || null;
            if (!user) {
                const { data: { user: gotUser } } = await supabase.auth.getUser();
                user = gotUser;
            }

            if (user) {
                setCurrentUserId(user.id);
                if (user.email === 'luizfelipe.canedo2@gmail.com') {
                    setUserRole('admin');
                } else {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();
                    setUserRole(profile?.role || 'colaborador');
                }
            }
        } catch (err) {
            console.warn("Erro ao buscar dados do usuário na OS:", err);
        }
        await fetchOrders();
    };

    const fetchOrders = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('service_orders')
                .select('*, clients(phone)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedOrders: ServiceOrder[] = (data || []).map(o => ({
                id: o.id,
                ticketNumber: o.ticket_number || "S/N",
                openDate: parseDate(o.open_date),
                clientId: o.client_id,
                client: o.client || "Não informado",
                clientPhone: (o.clients as any)?.phone || "",
                type: o.type as any || "Fabricação",
                action: o.action || "",
                status: o.status as any || "Plano de corte",
                forecastDate: parseDate(o.forecast_date),
                completionDate: o.completion_date ? parseDate(o.completion_date) : undefined,
                notes: o.notes,
                attachments: o.attachments || [],
                amount: o.amount || 0,
                laborLogs: [],
                priorityLevel: o.priority_level || 'normal',
                productionPriority: o.production_priority || 0,
                productionNotes: o.production_notes || ""
            }));

            // Mostra o que já tem
            setOrders(mappedOrders);
            setIsLoading(false);

            // Fetch tasks to calculate environment progress
            try {
                const { data: tasksData, error: tasksError } = await supabase
                    .from('tasks')
                    .select('*');
                if (!tasksError && tasksData) {
                    setTasks(tasksData);
                }
            } catch (err) {
                console.warn("Erro ao buscar tarefas na OS:", err);
            }

            // Passo 2: Tenta buscar as horas separadamente
            try {
                const { data: logsData, error: logsError } = await supabase
                    .from('service_order_labor_logs')
                    .select('*');

                if (!logsError && logsData) {
                    const ordersWithLogs = mappedOrders.map(order => ({
                        ...order,
                        laborLogs: logsData
                            .filter((l: any) => l.service_order_id === order.id)
                            .map((l: any) => ({
                                id: l.id,
                                date: parseDate(l.date),
                                hours: Number(l.hours),
                                description: l.description
                            }))
                    }));
                    setOrders(ordersWithLogs);
                }
            } catch (logsErr) {
                console.warn("Erro ao buscar logs de horas:", logsErr);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            toast.error("Erro ao carregar ordens de serviço.");
            setIsLoading(false);
        }
    };

    const handleNewOrder = () => {
        setEditingOrder(null);
        setIsDialogOpen(true);
    };

    const handleEditOrder = (order: ServiceOrder) => {
        setEditingOrder(order);
        setIsDialogOpen(true);
    };

    const handleDeleteOrder = async (id: string) => {
        if (!window.confirm("Tem certeza que deseja remover esta ordem de serviço?")) return;
        try {
            const { error } = await supabase
                .from('service_orders')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setOrders(orders.filter(order => order.id !== id));
            toast.success("Ordem de serviço removida!");
        } catch (error) {
            console.error('Error deleting order:', error);
            toast.error("Erro ao remover ordem de serviço.");
        }
    };

    const handleSubmit = async (orderData: Omit<ServiceOrder, "id">) => {
        try {
            const formatDate = (date: any) => {
                if (!date || isNaN(new Date(date).getTime())) return null;
                return new Date(date).toISOString().split('T')[0];
            };

            const newOrder = {
                ticket_number: orderData.ticketNumber,
                open_date: formatDate(orderData.openDate),
                client: orderData.client,
                type: orderData.type,
                action: orderData.action,
                status: orderData.status,
                forecast_date: formatDate(orderData.forecastDate),
                completion_date: formatDate(orderData.completionDate),
                notes: orderData.notes,
                attachments: orderData.attachments || [],
                client_id: orderData.clientId || null,
                amount: orderData.amount || 0
            };

            console.log("Enviando nova OS:", newOrder);

            const { data, error } = await supabase
                .from('service_orders')
                .insert([newOrder])
                .select();

            if (error) throw error;

            if (data && data[0]) {
                const insertedOrder = data[0];
                // Inserir logs de horas se houver
                if (orderData.laborLogs && orderData.laborLogs.length > 0) {
                    const logsToInsert = orderData.laborLogs.map(l => {
                        const dateObj = l.date instanceof Date ? l.date : new Date(l.date);
                        const dateStr = !isNaN(dateObj.getTime()) 
                            ? dateObj.toISOString().split('T')[0] 
                            : new Date().toISOString().split('T')[0];

                        return {
                            service_order_id: insertedOrder.id,
                            date: dateStr,
                            hours: isNaN(Number(l.hours)) ? 0 : Number(l.hours),
                            description: l.description || ""
                        };
                    });

                    const { error: logsError } = await supabase.from('service_order_labor_logs').insert(logsToInsert);
                    if (logsError) {
                        console.error("Erro ao inserir logs na criação:", logsError);
                        toast.error("OS criada, mas houve erro ao salvar as horas.");
                    }
                }

                const createdOrder: ServiceOrder = {
                    id: insertedOrder.id,
                    ticketNumber: insertedOrder.ticket_number,
                    openDate: parseDate(insertedOrder.open_date),
                    clientId: insertedOrder.client_id,
                    client: insertedOrder.client,
                    type: insertedOrder.type as any,
                    action: insertedOrder.action,
                    status: insertedOrder.status as any,
                    forecastDate: parseDate(insertedOrder.forecast_date),
                    completionDate: insertedOrder.completion_date ? parseDate(insertedOrder.completion_date) : undefined,
                    notes: insertedOrder.notes,
                    attachments: insertedOrder.attachments || [],
                    amount: insertedOrder.amount || 0,
                    laborLogs: orderData.laborLogs || []
                };
                setOrders([createdOrder, ...orders]);
            }
            toast.success("Ordem de serviço criada!");
        } catch (error: any) {
            console.error('Error adding order:', error);
            toast.error(`Erro ao criar OS: ${error.message || 'Erro desconhecido'}`);
        }
    };

    const handleUpdate = async (id: string, updates: Partial<ServiceOrder>) => {
        try {
            const updateData: any = {};
            if (updates.ticketNumber) updateData.ticket_number = updates.ticketNumber;
            if (updates.openDate) updateData.open_date = updates.openDate.toISOString().split('T')[0];
            if (updates.client) updateData.client = updates.client;
            if (updates.type) updateData.type = updates.type;
            if (updates.action) updateData.action = updates.action;
            if (updates.status) {
                updateData.status = updates.status;
                if (updates.status === "Entregue e Finalizado") {
                    updateData.completion_date = updates.completionDate 
                        ? updates.completionDate.toISOString().split('T')[0]
                        : new Date().toISOString().split('T')[0];
                    updateData.production_priority = 0;
                    
                    // Atualizar o objeto de updates local também
                    updates.completionDate = updates.completionDate || new Date();
                    updates.productionPriority = 0;
                }
            }
            if (updates.forecastDate) updateData.forecast_date = updates.forecastDate.toISOString().split('T')[0];

            // Permitir limpar a data de conclusão
            if (updates.hasOwnProperty('completionDate')) {
                updateData.completion_date = updates.completionDate
                    ? updates.completionDate.toISOString().split('T')[0]
                    : null;
            }

            if (updates.notes !== undefined) updateData.notes = updates.notes;
            if (updates.attachments !== undefined) updateData.attachments = updates.attachments;
            if (updates.clientId !== undefined) updateData.client_id = updates.clientId || null;
            if (updates.amount !== undefined) updateData.amount = updates.amount || 0;
            
            // Campos de Produção
            if (updates.priorityLevel !== undefined) updateData.priority_level = updates.priorityLevel;
            if (updates.productionPriority !== undefined) updateData.production_priority = updates.productionPriority;
            if (updates.productionNotes !== undefined) updateData.production_notes = updates.productionNotes;

            const { error } = await supabase
                .from('service_orders')
                .update(updateData)
                .eq('id', id);

            if (error) {
                console.error("Erro ao atualizar service_orders:", error);
                throw error;
            }

            // Sincronizar logs de horas
            if (updates.laborLogs) {
                // Delete existing first
                const { error: deleteError } = await supabase
                    .from('service_order_labor_logs')
                    .delete()
                    .eq('service_order_id', id);

                if (deleteError) {
                    console.error("Erro ao deletar logs antigos:", deleteError);
                }

                // Insert current ones
                if (updates.laborLogs.length > 0) {
                    const logsToInsert = updates.laborLogs.map((l: any) => {
                        const dateObj = l.date instanceof Date ? l.date : new Date(l.date);
                        const dateStr = !isNaN(dateObj.getTime())
                            ? dateObj.toISOString().split('T')[0]
                            : new Date().toISOString().split('T')[0];

                        return {
                            service_order_id: id,
                            date: dateStr,
                            hours: Number(l.hours) || 0,
                            description: l.description || ""
                        };
                    });

                    const { error: insertError } = await supabase
                        .from('service_order_labor_logs')
                        .insert(logsToInsert);

                    if (insertError) {
                        console.error("Erro ao inserir novos logs:", insertError);
                        toast.error(`Erro nas horas: ${insertError.message}`);
                    }
                }
            }

            setOrders(orders.map(order =>
                order.id === id ? { ...order, ...updates } : order
            ));
            toast.success("Ordem de serviço atualizada!");
        } catch (error: any) {
            console.error('Error updating order:', error);
            toast.error(`Erro ao atualizar: ${error.message || 'Erro desconhecido'}`);
        }
    };

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = productionQueue.findIndex((item) => item.id === active.id);
            const newIndex = productionQueue.findIndex((item) => item.id === over.id);

            const newQueue = arrayMove(productionQueue, oldIndex, newIndex);
            
            // Atualizar localmente para responsividade imediata
            const updatedOrders = orders.map(order => {
                const queueItemIndex = newQueue.findIndex(item => item.id === order.id);
                if (queueItemIndex !== -1) {
                    // Inverter a lógica pois ordenamos por b.priority - a.priority
                    // Então o primeiro item da lista (index 0) deve ter a MAIOR prioridade
                    return { ...order, productionPriority: newQueue.length - queueItemIndex };
                }
                return order;
            });
            setOrders(updatedOrders);

            // Persistir todas as mudanças de prioridade no banco
            for (let i = 0; i < newQueue.length; i++) {
                const orderId = newQueue[i].id;
                const newPrio = newQueue.length - i;
                
                // Chamada silenciosa (sem toast para cada item)
                await supabase
                    .from('service_orders')
                    .update({ production_priority: newPrio })
                    .eq('id', orderId);
            }
            toast.success("Ordem da fila atualizada!");
        }
    };

    const handleStartOrder = async (order: ServiceOrder) => {
        await handleUpdate(order.id, { status: 'Plano de corte' });
        toast.success("OS enviada para produção!");
    };

    const handleNotifyClient = (order: ServiceOrder) => {
        if (!order.clientPhone) {
            toast.error("Cliente sem telefone cadastrado.");
            return;
        }

        const firstName = order.client.split(' ')[0];
        const status = order.status;
        const ticket = order.ticketNumber;
        const action = order.action;

        const companyName = settings?.name || "BJL Planejados";
        const message = `Oi, ${firstName}! Notícia boa! 🎉 O seu sonho na ${companyName} está ganhando forma. Sua Ordem de Serviço (*${ticket}*) acaba de entrar na etapa de: *${status}*. Estamos muito animados com o progresso! Qualquer dúvida, conte conosco. 🔨💎`;

        
        const encodedMessage = encodeURIComponent(message);
        const phone = order.clientPhone.replace(/\D/g, "");
        // Garante o código do país se não houver
        const formattedPhone = phone.length <= 11 ? `55${phone}` : phone;
        const url = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
        
        window.open(url, '_blank');
        toast.info("WhatsApp iniciado.");
    };

    const inProgressStatuses: ServiceStatus[] = [
        "Plano de corte",
        "Pronto para produção",
        "Corte da caixa",
        "Fita",
        "Montagem das caixas",
        "Corte das portas + Tamponados",
        "Colocação dos tamponados",
        "Embalagem",
        "Pronto para entrega",
        "Instalação",
        "Entregue e Finalizado"
    ];
    const inProgress = orders.filter(o => inProgressStatuses.includes(o.status)).length;
    const defining = orders.filter(o => o.status === "A Definir").length;
    const totalValueActive = orders.filter(o => inProgressStatuses.includes(o.status)).reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const getDaysRemaining = (forecastDate: Date) => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const forecast = new Date(forecastDate);
        forecast.setHours(0,0,0,0);
        const diffTime = forecast.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // Group all tasks (pending & completed) to compute environment completion status
    const environmentsMap = new Map<string, { total: number; completed: number }>();
    
    tasks.forEach(t => {
        if (!t.project_name || !t.environment_name) return;
        const key = `${t.project_name.trim().toLowerCase()} - ${t.environment_name.trim().toLowerCase()}`;
        const existing = environmentsMap.get(key) || { total: 0, completed: 0 };
        existing.total += 1;
        if (t.status === 'completed') {
            existing.completed += 1;
        }
        environmentsMap.set(key, existing);
    });

    const totalEnvironmentsCount = environmentsMap.size;
    let completedEnvironmentsCount = 0;
    environmentsMap.forEach((val) => {
        if (val.completed === val.total) {
            completedEnvironmentsCount += 1;
        }
    });

    const totalOrdersCount = orders.length;
    const completedOrdersCount = orders.filter(o => o.status === "Entregue e Finalizado").length;
    const pendingOrdersCount = totalOrdersCount - completedOrdersCount;

    const criticalDeliveriesCount = orders.filter(o => {
        if (o.status === "Entregue e Finalizado" || o.status === "A Definir") return false;
        const days = getDaysRemaining(o.forecastDate);
        return days <= 7;
    }).length;

    const completedThisMonth = orders.filter(o => {
        const isClosed = o.status === "Entregue e Finalizado";
        const date = o.completionDate || o.openDate;
        return isClosed && date.getMonth() === new Date().getMonth() && date.getFullYear() === new Date().getFullYear();
    }).length;
    
    const productionQueue = orders
        .filter(o => inProgressStatuses.includes(o.status))
        .sort((a, b) => {
            const aIsFinished = a.status === "Entregue e Finalizado";
            const bIsFinished = b.status === "Entregue e Finalizado";
            
            if (aIsFinished && !bIsFinished) return 1;
            if (!aIsFinished && bIsFinished) return -1;
            
            return (b.productionPriority || 0) - (a.productionPriority || 0);
        });

    const defineList = orders.filter(o => o.status === "A Definir");

    const getStatusProgress = (status: ServiceStatus) => {
        switch (status) {
            case "Plano de corte": return 5;
            case "Pronto para produção": return 15;
            case "Corte da caixa": return 25;
            case "Fita": return 35;
            case "Montagem das caixas": return 45;
            case "Corte das portas + Tamponados": return 55;
            case "Colocação dos tamponados": return 65;
            case "Embalagem": return 75;
            case "Pronto para entrega": return 85;
            case "Instalação": return 95;
            case "Entregue e Finalizado": return 100;
            default: return 0;
        }
    };

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
            case "Entregue e Finalizado": return "bg-emerald-600";
            default: return "bg-slate-400";
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                   <h2 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-amber-500 to-amber-700 text-glow">Ordens de Serviço</h2>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Gestão de Produção e Assistência High-End</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchOrders}
                        disabled={isLoading}
                        className="gap-1.5 h-11 border-white/10 bg-white/5 font-black uppercase tracking-widest text-[10px] rounded-xl"
                    >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        Atualizar
                    </Button>
                    <MagicButton onClick={handleNewOrder} className="gap-1.5 h-11 px-6 shadow-xl shadow-primary/20">
                        <Plus className="h-4 w-4" />
                        Nova OS
                    </MagicButton>
                </div>
            </div>

            {/* OS HUD */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-blue-500">
                            <Settings2 className="h-32 w-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">A Definir</p>
                            <h3 className="text-3xl font-black text-blue-500 tracking-tighter">
                                <AnimatedCounter value={defining} />
                                <span className="text-sm font-bold uppercase ml-2 text-muted-foreground">Pauta</span>
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-primary">
                            <RefreshCw className="h-32 w-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Em Produção</p>
                            <h3 className="text-3xl font-black text-primary tracking-tighter">
                                <AnimatedCounter value={inProgress} />
                                <span className="text-sm font-bold uppercase ml-2 text-muted-foreground">Ativas</span>
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-amber-500">
                            <DollarSign className="h-32 w-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Volume Financeiro</p>
                            <h3 className="text-3xl font-black text-amber-500 tracking-tighter">
                                <AnimatedCounter value={totalValueActive} formatter={formatCurrency} />
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-emerald-500">
                            <CheckCircle className="h-32 w-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Concluídas (Mês)</p>
                            <h3 className="text-3xl font-black text-emerald-500 tracking-tighter">
                                <AnimatedCounter value={completedThisMonth} />
                                <span className="text-sm font-bold uppercase ml-2 text-muted-foreground">Finalizadas</span>
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-orange-500">
                            <ClipboardList className="h-32 w-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Progresso de OS</p>
                            <h3 className="text-3xl font-black text-orange-500 tracking-tighter flex items-baseline">
                                <AnimatedCounter value={completedOrdersCount} />
                                <span className="text-xl text-muted-foreground font-bold mx-1">/</span>
                                <AnimatedCounter value={totalOrdersCount} />
                                <span className="text-xs font-bold uppercase ml-2 text-muted-foreground">OSs</span>
                            </h3>
                            <p className="text-[9px] text-amber-500/80 font-black uppercase tracking-widest mt-1">({pendingOrdersCount} em aberto)</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-rose-500">
                            <AlertCircle className="h-32 w-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Entregas Críticas</p>
                            <h3 className="text-3xl font-black text-rose-500 tracking-tighter">
                                <AnimatedCounter value={criticalDeliveriesCount} />
                                <span className="text-sm font-bold uppercase ml-2 text-muted-foreground">7 dias</span>
                            </h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="producao" className="w-full">
                <TabsList className="bg-white/5 border border-white/10 rounded-2xl p-1 mb-6">
                    <TabsTrigger value="definir" className="rounded-xl px-8 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white">
                        <Settings2 className="h-3 w-3 mr-2" />
                        Definir (Aguardando Pauta)
                    </TabsTrigger>
                    <TabsTrigger value="producao" className="rounded-xl px-8 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                         <Hammer className="h-3 w-3 mr-2" />
                        Fila de Produção
                    </TabsTrigger>
                    <TabsTrigger value="todos" className="rounded-xl px-8 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-slate-700 data-[state=active]:text-white">
                        <RefreshCw className="h-3 w-3 mr-2" />
                        Todas OSs
                    </TabsTrigger>
                    <TabsTrigger value="cronograma" className="rounded-xl px-8 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white">
                        <CalendarDays className="h-3 w-3 mr-2" />
                        Histórico Cronograma
                    </TabsTrigger>
                    <TabsTrigger value="kanban" className="rounded-xl px-8 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                        <KanbanSquare className="h-3 w-3 mr-2" />
                        Kanban (Visual)
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="definir" className="space-y-4">
                     <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl rounded-3xl overflow-hidden">
                        <CardHeader className="bg-muted/20 pb-4">
                            <CardTitle className="text-xl font-black tracking-tighter uppercase">Projetos a Definir</CardTitle>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Aguardando definição de data e prioridade</p>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground italic">
                                    <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary/50" />
                                    Carregando ordens de serviço...
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {defineList.map((order) => (
                                        <Card key={order.id} className="border border-white/5 bg-white/[0.02] overflow-hidden group">
                                            <div className="p-6 flex flex-col md:flex-row gap-6">
                                                <div className="flex-1 space-y-4">
                                                    <div>
                                                        <h4 className="text-xl font-black tracking-tight text-white uppercase group-hover:text-primary transition-colors">
                                                            {order.client}
                                                        </h4>
                                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                                            {order.ticketNumber} - {order.action}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-4">
                                                        <Button variant="outline" size="sm" onClick={() => handleEditOrder(order)} className="text-[10px] font-black uppercase rounded-xl h-8">Editar OS</Button>
                                                        {isAdmin && (
                                                            <Button variant="ghost" size="sm" onClick={() => handleDeleteOrder(order.id)} className="text-[10px] font-black uppercase text-rose-500/50 hover:text-rose-500 h-8">Remover</Button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col justify-center gap-3 md:w-48">
                                                    <Button 
                                                        className="h-16 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-xl shadow-emerald-900/10 group/btn"
                                                        onClick={() => handleStartOrder(order)}
                                                    >
                                                        <Play className="h-4 w-4 mr-2" />
                                                        Mandar p/ Produção
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                    {defineList.length === 0 && (
                                        <div className="p-12 text-center text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Nenhuma OS aguardando definição.</div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="producao" className="space-y-4">
                    <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                        modifiers={[restrictToVerticalAxis]}
                    >
                        <SortableContext 
                            items={productionQueue.map(o => o.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="grid grid-cols-1 gap-4">
                                {productionQueue.map((order, index) => (
                                    <SortableServiceOrderCard 
                                        key={order.id}
                                        order={order}
                                        index={index}
                                        tasks={tasks.filter(t => {
                                            const projName = t.project_name?.trim().toLowerCase() || "";
                                            const clientName = order.client?.trim().toLowerCase() || "";
                                            const ticketNum = order.ticketNumber?.trim().toLowerCase() || "";
                                            
                                            if (projName === clientName) return true;
                                            if (ticketNum && projName.includes(ticketNum)) return true;
                                            return false;
                                        })}
                                        onEdit={handleEditOrder}
                                        onNotify={handleNotifyClient}
                                        onUpdate={handleUpdate}
                                        getStatusColor={getStatusColor}
                                        getStatusProgress={getStatusProgress}
                                    />
                                ))}
                                {productionQueue.length === 0 && (
                                     <div className="p-12 text-center text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Fila vazia. Libere OSs na aba Definir.</div>
                                )}
                            </div>
                        </SortableContext>
                    </DndContext>
                </TabsContent>

                <TabsContent value="todos">
                    <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl rounded-3xl overflow-hidden">
                        <CardHeader className="bg-muted/20 pb-4">
                            <CardTitle className="text-xl font-black tracking-tighter uppercase">Histórico de Ordens de Serviço</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground italic">
                                    <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary/50" />
                                    Carregando ordens de serviço...
                                </div>
                            ) : (
                                <ServiceOrderTable
                                    orders={[...orders].sort((a, b) => {
                                        const aIsFinished = a.status === "Entregue e Finalizado";
                                        const bIsFinished = b.status === "Entregue e Finalizado";
                                        if (aIsFinished && !bIsFinished) return 1;
                                        if (!aIsFinished && bIsFinished) return -1;
                                        return 0; // Mantém a ordem original para itens não finalizados
                                    })}
                                    onEdit={handleEditOrder}
                                    onDelete={handleDeleteOrder}
                                    isAdmin={isAdmin}
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="cronograma">
                    <ProductionTimeline 
                        orders={orders}
                        onEdit={handleEditOrder}
                    />
                </TabsContent>

                <TabsContent value="kanban">
                    <OSKanbanBoard 
                        orders={orders}
                        onStatusChange={(id, status) => handleUpdate(id, { status })}
                        onEdit={handleEditOrder}
                    />
                </TabsContent>
            </Tabs>

            <ServiceOrderFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSubmit={handleSubmit}
                onUpdate={handleUpdate}
                editingOrder={editingOrder}
            />

            {/* Floating Action Button for Mobile */}
            <Button
                onClick={handleNewOrder}
                className="lg:hidden fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-2xl z-40 gap-0 p-0 flex items-center justify-center animate-in fade-in zoom-in duration-300"
                size="icon"
            >
                <Plus className="h-7 w-7" />
            </Button>
        </div>
    );
};

export default OrdemServico;

interface SortableItemProps {
    order: ServiceOrder;
    index: number;
    tasks: any[];
    onEdit: (order: ServiceOrder) => void;
    onNotify: (order: ServiceOrder) => void;
    onUpdate: (id: string, updates: Partial<ServiceOrder>) => void;
    getStatusColor: (status: any) => string;
    getStatusProgress: (status: any) => number;
}

const SortableServiceOrderCard = ({
    order,
    index,
    tasks,
    onEdit,
    onNotify,
    onUpdate,
    getStatusColor,
    getStatusProgress }: SortableItemProps) => {
  const [showEnv, setShowEnv] = React.useState(false);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: order.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        opacity: isDragging ? 0.6 : 1,
    };

    const isUrgent = order.priorityLevel === 'urgente';

    // Extractor de colaboradores do projeto
    const projectCollaborators = useMemo(() => {
        if (!tasks || tasks.length === 0) return [];
        const collabs = new Set<string>();
        tasks.forEach(t => {
            if (t.description) {
                const match = t.description.match(/^\[Colaborador:\s*([^\]]+)\]/);
                if (match) {
                    collabs.add(match[1].trim());
                }
            }
        });
        return Array.from(collabs);
    }, [tasks]);

    // Group tasks by environment to show room-by-room progress
    const environmentProgress = useMemo(() => {
        if (!tasks || tasks.length === 0) return [];
        
        const envGroups: { [key: string]: { total: number; completed: number } } = {};
        
        tasks.forEach(t => {
            const env = (t.environment_name || "Geral").trim();
            if (!envGroups[env]) {
                envGroups[env] = { total: 0, completed: 0 };
            }
            envGroups[env].total += 1;
            if (t.status === 'completed') {
                envGroups[env].completed += 1;
            }
        });
        
        return Object.entries(envGroups).map(([name, stats]) => ({
            name,
            total: stats.total,
            completed: stats.completed,
            percentage: Math.round((stats.completed / stats.total) * 100),
            isDone: stats.completed === stats.total
        }));
    }, [tasks]);

    // Deadline Countdown calculation
    const getDaysRemaining = (forecastDate: Date) => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const forecast = new Date(forecastDate);
        forecast.setHours(0,0,0,0);
        const diffTime = forecast.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const daysRemaining = getDaysRemaining(order.forecastDate);
    const isFinished = order.status === "Entregue e Finalizado";

    let deadlineBadge = null;
    if (isFinished) {
        deadlineBadge = (
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Entrega Concluída
            </span>
        );
    } else if (daysRemaining < 0) {
        deadlineBadge = (
            <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/15 px-2.5 py-1 rounded-full border border-rose-500/30 flex items-center gap-1 animate-pulse">
                <AlertCircle className="h-3 w-3" />
                Atrasado há {Math.abs(daysRemaining)} {Math.abs(daysRemaining) === 1 ? 'dia' : 'dias'}
            </span>
        );
    } else if (daysRemaining <= 3) {
        deadlineBadge = (
            <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 flex items-center gap-1 animate-pulse">
                <AlertCircle className="h-3 w-3" />
                Crítico: {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}
            </span>
        );
    } else if (daysRemaining <= 7) {
        deadlineBadge = (
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Atenção: {daysRemaining}d
            </span>
        );
    } else {
        deadlineBadge = (
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                Prazo: {daysRemaining}d
            </span>
        );
    }

    return (
        <div ref={setNodeRef} style={style}>
            <Card 
                className={cn(
                    "border transition-all duration-300 backdrop-blur-3xl overflow-hidden group relative",
                    isUrgent ? "border-rose-500/30 bg-rose-500/5 shadow-[0_0_30px_rgba(244,63,94,0.1)]" : "border-white/5 bg-white/[0.02]",
                    order.status === "Entregue e Finalizado" && "bg-emerald-600/90 border-emerald-400/50"
                )}
                onClick={() => setShowEnv(true)}
            >
                {/* Background Progress Fill */}
                {order.status !== "Entregue e Finalizado" && (
                    <div 
                        className={cn("absolute inset-0 transition-all duration-1000 opacity-[0.08] pointer-events-none", getStatusColor(order.status))}
                        style={{ width: `${getStatusProgress(order.status)}%` }}
                    />
                )}

                <div className="p-2 flex flex-col md:flex-row items-stretch md:items-center gap-4 relative z-10">
                    {/* Botão de Arraste */}
                    <div 
                        {...attributes} 
                        {...listeners} 
                        className="flex md:flex-col items-center justify-center p-2 bg-white/5 rounded-2xl gap-2 min-w-[50px] cursor-grab active:cursor-grabbing hover:bg-white/10 transition-colors"
                    >
                        <GripVertical className="h-5 w-5 text-white/30" />
                        <div className="text-[10px] font-black text-white/40">#{index + 1}</div>
                    </div>

                    <div className="flex-1 p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <Select value={order.status} onValueChange={(val) => onUpdate(order.id, { status: val as any })}>
                                        <SelectTrigger className={cn("h-6 border-none shadow-none text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full w-auto gap-1", getStatusColor(order.status), "text-white")}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-white/10 text-[10px] uppercase font-bold">
                                            <SelectItem value="Plano de corte">Plano de corte</SelectItem>
                                            <SelectItem value="Pronto para produção">Pronto para produção</SelectItem>
                                            <SelectItem value="Corte da caixa">Corte da caixa</SelectItem>
                                            <SelectItem value="Fita">Fita</SelectItem>
                                            <SelectItem value="Montagem das caixas">Montagem das caixas</SelectItem>
                                            <SelectItem value="Corte das portas + Tamponados">Corte das portas + Tamponados</SelectItem>
                                            <SelectItem value="Colocação dos tamponados">Colocação dos tamponados</SelectItem>
                                            <SelectItem value="Embalagem">Embalagem</SelectItem>
                                            <SelectItem value="Pronto para entrega">Pronto para entrega</SelectItem>
                                            <SelectItem value="Instalação">Instalação</SelectItem>
                                            <SelectItem value="Entregue e Finalizado">Entregue e Finalizado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    
                                    <span className={cn("text-[8px] font-black uppercase tracking-wider", isUrgent ? "text-rose-500" : "text-slate-400")}>
                                        Prioridade: {order.priorityLevel || 'normal'}
                                    </span>
                                    
                                    {deadlineBadge}
                                </div>
                                <h4 className="text-lg font-black tracking-tight text-white uppercase group-hover:text-primary transition-colors break-words whitespace-normal">
                                    {order.client}
                                </h4>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
                                    {order.ticketNumber} - {order.action}
                                </p>
                                
                                {projectCollaborators.length > 0 && (
                                    <div className="flex items-center gap-1.5 flex-wrap mb-3">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Equipe:</span>
                                        {projectCollaborators.map(c => (
                                            <span key={c} className="text-[8px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <User className="h-2 w-2 text-primary/70" />
                                                {c}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                
                                {/* Barra de Progresso compacta no fundo */}
                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                        className={cn("h-full transition-all duration-1000", order.status === "Entregue e Finalizado" ? "bg-white" : getStatusColor(order.status))}
                                        style={{ width: `${getStatusProgress(order.status)}%` }}
                                    />
                                </div>

                                {/* Lista de Ambientes e seu progresso */}
                                {environmentProgress.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-white/5 space-y-2.5">
                                        <div className="text-[8px] font-black uppercase tracking-[0.25em] text-white/30 mb-2">Ambientes do Projeto</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {environmentProgress.map(env => (
                                                <div key={env.name} className="bg-white/[0.01] border border-white/5 p-2 rounded-xl flex flex-col gap-1 transition-colors hover:bg-white/[0.03]">
                                                    <div className="flex justify-between items-center gap-2">
                                                        <span className="text-[10px] font-black text-white/80 uppercase truncate flex-1">{env.name}</span>
                                                        <span className={cn(
                                                            "text-[9px] font-black tracking-tight shrink-0",
                                                            env.isDone ? "text-emerald-400" : "text-primary/70"
                                                        )}>
                                                            {env.completed}/{env.total}
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                        <div 
                                                            className={cn("h-full transition-all duration-500", env.isDone ? "bg-emerald-500" : "bg-primary")}
                                                            style={{ width: `${env.percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-center">
                                {order.clientPhone && (
                                    <Button 
                                        variant="default" 
                                        size="sm" 
                                        onClick={() => onNotify(order)} 
                                        className="text-[10px] font-black uppercase rounded-xl h-8 bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shadow-lg shadow-emerald-900/20"
                                    >
                                        <MessageSquare className="h-3 w-3 text-emerald-200" />
                                        Notificar
                                    </Button>
                                )}
                                <Button variant="outline" size="sm" onClick={() => onEdit(order)} className="text-[10px] font-black uppercase rounded-xl h-8 border-white/10 hover:bg-white/5">Detalhes</Button>
                            </div>
                        </div>
                    </div>
                </div>
                {order.productionNotes && (
                    <div className="px-6 py-3 bg-white/[0.01] border-t border-white/5">
                        <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="h-2.5 w-2.5 text-primary/40" />
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30">Instruções de Produção</span>
                        </div>
                        <p className="text-[11px] text-white/60 font-medium italic">"{order.productionNotes}"</p>
                    </div>
                )}
                        </Card>
            {/* Environment Dialog */}
            <Dialog open={showEnv} onOpenChange={setShowEnv}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ambiente da Ordem de Serviço</DialogTitle>
                    </DialogHeader>
                    <div className="p-4">
                        <p className="text-lg font-medium">{order.action || "Sem ação definida"}</p>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

