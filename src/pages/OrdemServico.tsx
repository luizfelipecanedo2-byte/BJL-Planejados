import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ServiceOrderTable from "@/components/crm/ServiceOrderTable";
import ServiceOrderFormDialog from "@/components/crm/ServiceOrderFormDialog";
import { ServiceOrder, ServiceStatus, OSStageConfig, OS_STAGE_COLORS } from "@/types/serviceOrder";
import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useSearchParams, Link } from "react-router-dom";
import ProductionTimeline from "@/components/crm/ProductionTimeline";
import OSKanbanBoard from "@/components/crm/OSKanbanBoard";
import ManageOSStagesDialog from "@/components/crm/ManageOSStagesDialog";
import { useOSStages } from "@/hooks/useOSStages";
import { Button } from "@/components/ui/button";
import { MagicButton } from "@/components/ui/magic-button";
import { Plus, Loader2, RefreshCw, DollarSign, CheckCircle, Hammer, Settings2, CalendarDays, AlertCircle, ChevronUp, ChevronDown, MessageSquare, Play, KanbanSquare, ClipboardList, Clock, TrendingUp, AlertTriangle, ShieldCheck, Camera, Ruler, Trash2, Layers } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import CapacityTab from "@/components/crm/CapacityTab";
import OSVisualGalleryDialog from "@/components/crm/OSVisualGalleryDialog";
import SparklineChart from "@/components/ui/SparklineChart";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { AnimatedPanelSaw } from "@/components/ui/SectorArt";

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

// Cache Inteligente em Memória para abertura instantânea (0ms)
const osMemoryCache: {
    orders: ServiceOrder[];
    tasks: any[];
    lastFetchedAt: number;
} = {
    orders: [],
    tasks: [],
    lastFetchedAt: 0,
};

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
    const [searchParams, setSearchParams] = useSearchParams();
    const [orders, setOrders] = useState<ServiceOrder[]>(() => osMemoryCache.orders);
    const [tasks, setTasks] = useState<any[]>(() => osMemoryCache.tasks);
    const [availableOffcutsCount, setAvailableOffcutsCount] = useState<number>(0);
    const [availableOffcutsSample, setAvailableOffcutsSample] = useState<string[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        if (searchParams.get("new") === "true") {
            setEditingOrder(null);
            setIsDialogOpen(true);
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.delete("new");
                return next;
            }, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        supabase
            .from("mdf_offcuts")
            .select("color_name, thickness_mm, width_cm, height_cm, quantity, status")
            .eq("status", "disponivel")
            .gt("quantity", 0)
            .limit(20)
            .then(({ data }) => {
                if (data && data.length > 0) {
                    const totalQty = data.reduce((acc, r) => acc + (Number(r.quantity) || 1), 0);
                    setAvailableOffcutsCount(totalQty);
                    setAvailableOffcutsSample(
                        data.slice(0, 4).map((r) => `${r.color_name} ${r.thickness_mm}mm (${r.width_cm}x${r.height_cm}cm)`)
                    );
                }
            });
    }, []);
    const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
    const [selectedGalleryOrder, setSelectedGalleryOrder] = useState<ServiceOrder | null>(null);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isManageStagesOpen, setIsManageStagesOpen] = useState(false);
    const [stageTargetOrder, setStageTargetOrder] = useState<ServiceOrder | null>(null);

    const {
        totalCustomStagesCount,
        getCustomStagesForOrder,
        getStagesForOrder,
        getProductionStagesForOrder,
        addCustomStageForOrder,
        removeCustomStageForOrder,
        setCustomStagesForOrder,
        clearCustomStagesForOrder,
        getStageBgClass,
        getStageBorderClass,
        getStageProgress,
        buildKanbanStages,
    } = useOSStages();

    const kanbanStages = useMemo(
        () => buildKanbanStages(orders),
        [orders, buildKanbanStages]
    );

    const handleOpenManageStages = (targetOrder?: ServiceOrder) => {
        setStageTargetOrder(targetOrder || null);
        setIsManageStagesOpen(true);
    };

    useEffect(() => { osMemoryCache.orders = orders; }, [orders]);
    useEffect(() => { osMemoryCache.tasks = tasks; }, [tasks]);

    const handleOpenGallery = (order: ServiceOrder) => {
        setSelectedGalleryOrder(order);
        setIsGalleryOpen(true);
    };

    const handleUpdateGalleryAttachments = (orderId: string, updatedAttachments: string[]) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, attachments: updatedAttachments } : o));
        if (selectedGalleryOrder && selectedGalleryOrder.id === orderId) {
            setSelectedGalleryOrder(prev => prev ? { ...prev, attachments: updatedAttachments } : null);
        }
    };
    const [isLoading, setIsLoading] = useState(() => osMemoryCache.orders.length === 0);
    const [userRole, setUserRole] = useState<string | null>("admin");
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
        const now = Date.now();
        try {
            if (localStorage.getItem("mock_admin_session") === "true") {
                setUserRole('admin');
                if (osMemoryCache.orders.length > 0 && now - osMemoryCache.lastFetchedAt < 45000) {
                    setIsLoading(false);
                    return;
                }
                osMemoryCache.lastFetchedAt = now;
                await fetchOrders();
                return;
            }
            const { data: { session } } = await supabase.auth.getSession();
            let user = session?.user || null;
            if (!user) {
                const { data: { user: gotUser } } = await supabase.auth.getUser();
                user = gotUser;
            }

            if (user) {
                setCurrentUserId(user.id);
                if (user.email === 'luizfelipe@bjl.com' || user.email === 'luizfelipe.canedo2@gmail.com') {
                    setUserRole('admin');
                } else {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();
                    setUserRole(profile?.role || 'admin');
                }
            }
        } catch (err) {
            console.warn("Erro ao buscar dados do usuário na OS:", err);
        }
        if (osMemoryCache.orders.length > 0 && now - osMemoryCache.lastFetchedAt < 45000) {
            setIsLoading(false);
            return;
        }
        osMemoryCache.lastFetchedAt = now;
        await fetchOrders();
    };

    const fetchOrders = async () => {
        try {
            if (osMemoryCache.orders.length === 0) {
                setIsLoading(true);
            }
            const { data, error } = await supabase
                .from('service_orders')
                .select('*, clients(phone, address, city, state)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedOrders: ServiceOrder[] = (data || []).map(o => ({
                id: o.id,
                ticketNumber: o.ticket_number || "S/N",
                openDate: parseDate(o.open_date),
                clientId: o.client_id,
                client: o.client || "Não informado",
                clientPhone: (o.clients as any)?.phone || "",
                clientAddress: (o.clients as any)?.address || "",
                clientCity: (o.clients as any)?.city || "",
                type: o.type as any || "Fabricação",
                action: o.action || "",
                status: o.status as any || "Plano de corte",
                forecastDate: parseDate(o.forecast_date),
                completionDate: o.completion_date ? parseDate(o.completion_date) : undefined,
                notes: o.notes,
                attachments: o.attachments || [],
                amount: o.amount || 0,
                daysEstimated: o.days_estimated || 1,
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

            // Passo 2: Buscar horas, alocações e custos reais de materiais
            try {
                let allTransData: any[] = [];
                let from = 0;
                const pageSize = 1000;
                let hasMore = true;

                while (hasMore) {
                    const { data: batch, error: batchError } = await supabase
                        .from('transactions')
                        .select('id, description, amount, type, order_service, service, contact, category, competence_date, invoice_number')
                        .range(from, from + pageSize - 1);
                    if (batchError) break;
                    if (batch && batch.length > 0) {
                        allTransData = allTransData.concat(batch);
                        from += pageSize;
                        if (batch.length < pageSize) hasMore = false;
                    } else {
                        hasMore = false;
                    }
                }

                const [{ data: logsData }, { data: allocData }, { data: manualExpData }] = await Promise.all([
                    supabase.from('service_order_labor_logs').select('*'),
                    supabase.from('transaction_allocations').select('*'),
                    supabase.from('service_expenses').select('*')
                ]);

                const allocations = allocData || [];
                const manualExpensesList = manualExpData || [];
                const allocatedTxIds = new Set<string>();
                allocations.forEach((a: any) => {
                    if (a.transaction_id) allocatedTxIds.add(a.transaction_id);
                });
                const expenses = allTransData.filter(t => t.type === 'expense');
                const norm = (s?: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

                const enrichedOrders = mappedOrders.map(order => {
                    const ticketClean = norm(order.ticketNumber);
                    const clientClean = norm(order.client);
                    const actionClean = norm(order.action);
                    const osFullString = norm(`${order.ticketNumber} - ${order.client}${order.action ? ` (${order.action})` : ''}`);

                    const matchedAllocations = allocations.filter(a => {
                        if (!a.client_name) return false;
                        const aName = norm(a.client_name);
                        const osMatchesInAlloc = Array.from(aName.matchAll(/\bos[-\s#]*(\d+(?:-\d+)?)\b/gi)).map(m => m[1].replace(/^0+(?=\d)/, ""));
                        const osTargetToken = Array.from(ticketClean.matchAll(/\bos[-\s#]*(\d+(?:-\d+)?)\b/gi)).map(m => m[1].replace(/^0+(?=\d)/, ""))[0] || (ticketClean.match(/\d+/)?.[0]?.replace(/^0+(?=\d)/, "") || "");
                        if (osMatchesInAlloc.length > 0 && osTargetToken) {
                            return osMatchesInAlloc.includes(osTargetToken);
                        }
                        if (aName === osFullString || aName === clientClean) return true;
                        if (ticketClean && ticketClean !== 's/n' && aName.includes(ticketClean)) return true;
                        if (clientClean && aName.includes(clientClean) && actionClean && aName.includes(actionClean)) return true;
                        return false;
                    });

                    const allocCost = matchedAllocations.reduce((sum, a) => sum + Number(a.amount || 0), 0);

                    const matchedManualExpenses = manualExpensesList.filter((e: any) => {
                        const eClient = norm(e.client_name);
                        const eEnv = norm(e.environment);
                        if (clientClean && eClient === clientClean && actionClean && eEnv === actionClean) return true;
                        if (ticketClean && ticketClean !== 's/n' && eClient.startsWith(ticketClean)) return true;
                        return false;
                    });
                    const manualCost = matchedManualExpenses.reduce((sum: number, e: any) => sum + Number(e.spent_value || 0), 0);

                    const matchedDirectTx = expenses.filter(t => {
                        if (allocatedTxIds.has(t.id)) return false;
                        if (!ticketClean || ticketClean === 's/n') return false;
                        const matchesOS = t.order_service && norm(t.order_service).includes(ticketClean);
                        const matchesService = t.service && norm(t.service).includes(ticketClean);
                        const matchesDesc = t.description && norm(t.description).includes(ticketClean);
                        const hasOtherExplicitOS =
                            (t.order_service && /\bos[-\s#]*\d+/i.test(t.order_service)) ||
                            (t.service && /\bos[-\s#]*\d+/i.test(t.service)) ||
                            (t.description && /\bos[-\s#]*\d+/i.test(t.description));
                        const matchesContact = !hasOtherExplicitOS && t.contact && clientClean && norm(t.contact) === clientClean;
                        return matchesOS || matchesService || matchesDesc || (matchesContact && t.category === "Despesa com Serviço");
                    });

                    const directCost = matchedDirectTx.reduce((sum, t) => sum + Number(t.amount || 0), 0);
                    const spentCost = allocCost + directCost + manualCost;

                    const amount = order.amount || 0;
                    const costRatio = amount > 0 ? (spentCost / amount) * 100 : (spentCost > 0 ? 100 : 0);

                    let marginStatus: 'healthy' | 'warning' | 'danger' = 'healthy';
                    if (amount > 0) {
                        if (costRatio > 55) {
                            marginStatus = 'danger';
                        } else if (costRatio > 40) {
                            marginStatus = 'warning';
                        } else {
                            marginStatus = 'healthy';
                        }
                    } else if (spentCost > 0) {
                        marginStatus = 'warning';
                    }

                    const materialsDetails = [
                        ...matchedAllocations.map(a => ({
                            description: a.description ? `${a.description} (${a.client_name})` : a.client_name,
                            amount: Number(a.amount),
                            invoice: ''
                        })),
                        ...matchedDirectTx.map(t => ({
                            description: t.description,
                            amount: Number(t.amount),
                            date: t.competence_date,
                            invoice: t.invoice_number || ''
                        }))
                    ];

                    const logs = (logsData || [])
                        .filter((l: any) => l.service_order_id === order.id)
                        .map((l: any) => ({
                            id: l.id,
                            date: parseDate(l.date),
                            hours: Number(l.hours),
                            description: l.description
                        }));

                    return {
                        ...order,
                        laborLogs: logs,
                        spentCost,
                        costRatio: Math.round(costRatio * 10) / 10,
                        marginStatus,
                        materialsDetails
                    };
                });

                setOrders(enrichedOrders);
            } catch (enrichErr) {
                console.warn("Erro ao enriquecer OS com horas e custos:", enrichErr);
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
        const orderTasks = tasks.filter(t => {
            if (t.service_order_id === order.id) return true;
            
            const projName = t.project_name?.trim().toLowerCase() || "";
            const clientName = order.client?.trim().toLowerCase() || "";
            const ticketNum = order.ticketNumber?.trim().toLowerCase() || "";
            
            if (projName === clientName) return true;
            if (ticketNum && projName.includes(ticketNum)) return true;
            return false;
        });
        setEditingOrder({
            ...order,
            tasks: orderTasks
        });
        setIsDialogOpen(true);
    };

    const handleDeleteOrder = async (id: string) => {
        if (!window.confirm("Tem certeza que deseja apagar esta Ordem de Serviço?")) return;
        try {
            // Remove vínculos opcionais antes de apagar a OS para evitar bloqueio de chave estrangeira
            await supabase.from('service_order_labor_logs').delete().eq('service_order_id', id);
            await supabase.from('tasks').delete().eq('service_order_id', id);

            const { error } = await supabase
                .from('service_orders')
                .delete()
                .eq('id', id);

            if (error) throw error;

            clearCustomStagesForOrder(id);
            setOrders(prev => prev.filter(order => order.id !== id));
            toast.success("Ordem de Serviço apagada com sucesso!");
        } catch (error) {
            console.error('Error deleting order:', error);
            toast.error("Erro ao apagar Ordem de Serviço.");
        }
    };

    const handleSubmit = async (orderData: Omit<ServiceOrder, "id">) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id;

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
                amount: orderData.amount || 0,
                days_estimated: orderData.daysEstimated || 1
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

                // Inserir tarefas se houver
                let insertedTasksList: any[] = [];
                if (orderData.tasks && orderData.tasks.length > 0) {
                    const tasksToInsert = orderData.tasks.map((t: any) => ({
                        title: t.title,
                        environment_name: t.environment_name || null,
                        assigned_to: t.assigned_to || null,
                        priority: t.priority || 'normal',
                        due_date: t.due_date || formatDate(orderData.forecastDate) || new Date().toISOString().split('T')[0],
                        created_by: userId,
                        status: 'pending',
                        project_name: `${insertedOrder.ticket_number || "S/N"} - ${insertedOrder.client}${insertedOrder.action ? ` (${insertedOrder.action})` : ""}`,
                        service_order_id: insertedOrder.id,
                        estimated_hours: t.estimated_hours || 0
                    }));

                    const { data: insertedTasks, error: tasksError } = await supabase
                        .from('tasks')
                        .insert(tasksToInsert)
                        .select();

                    if (tasksError) {
                        console.error("Erro ao inserir tarefas na criação:", tasksError);
                        toast.error("OS criada, mas houve erro ao salvar as tarefas.");
                    } else if (insertedTasks) {
                        insertedTasksList = insertedTasks;
                        setTasks(prev => [...insertedTasks, ...prev]);
                    }
                }

                if (orderData.customStages && orderData.customStages.length > 0) {
                    await setCustomStagesForOrder(insertedOrder.id, orderData.customStages);
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
                    daysEstimated: insertedOrder.days_estimated || orderData.daysEstimated || 1,
                    laborLogs: orderData.laborLogs || [],
                    tasks: insertedTasksList
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
            if (updates.daysEstimated !== undefined) updateData.days_estimated = updates.daysEstimated;

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

            // Sincronizar tarefas
            if (updates.tasks) {
                const { data: { user } } = await supabase.auth.getUser();
                const userId = user?.id;

                const currentDbTasks = tasks.filter(t => t.service_order_id === id);
                const updatedTasksWithRealIds = updates.tasks.filter((t: any) => t.id && !t.id.startsWith('temp-'));
                const realIdsToKeep = updatedTasksWithRealIds.map((t: any) => t.id);
                
                const tasksToDelete = currentDbTasks.filter(t => !realIdsToKeep.includes(t.id));
                if (tasksToDelete.length > 0) {
                    const deleteIds = tasksToDelete.map(t => t.id);
                    const { error: deleteTasksErr } = await supabase
                        .from('tasks')
                        .delete()
                        .in('id', deleteIds);
                    if (deleteTasksErr) console.error("Erro ao deletar tarefas removidas:", deleteTasksErr);
                }

                const tasksToInsert = updates.tasks.filter((t: any) => !t.id || t.id.startsWith('temp-')).map((t: any) => ({
                    title: t.title,
                    environment_name: t.environment_name || null,
                    assigned_to: t.assigned_to || null,
                    priority: t.priority || 'normal',
                    due_date: t.due_date || (updates.forecastDate ? updates.forecastDate.toISOString().split('T')[0] : (editingOrder?.forecastDate ? new Date(editingOrder.forecastDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])),
                    created_by: userId,
                    status: t.status || 'pending',
                    project_name: `${updates.ticketNumber || editingOrder?.ticketNumber || 'S/N'} - ${updates.client || editingOrder?.client || ''}${updates.action ? ` (${updates.action})` : (editingOrder?.action ? ` (${editingOrder.action})` : "")}`,
                    service_order_id: id,
                    estimated_hours: t.estimated_hours || 0
                }));

                const tasksToUpdate = updates.tasks.filter((t: any) => t.id && !t.id.startsWith('temp-'));

                let newInsertedTasks: any[] = [];
                if (tasksToInsert.length > 0) {
                    const { data: inserted, error: insertTasksErr } = await supabase
                        .from('tasks')
                        .insert(tasksToInsert)
                        .select();
                    if (insertTasksErr) console.error("Erro ao inserir novas tarefas:", insertTasksErr);
                    else if (inserted) {
                        newInsertedTasks = inserted;
                    }
                }

                if (tasksToUpdate.length > 0) {
                    for (const t of tasksToUpdate) {
                        const { error: updateTaskErr } = await supabase
                            .from('tasks')
                            .update({
                                title: t.title,
                                environment_name: t.environment_name || null,
                                assigned_to: t.assigned_to || null,
                                priority: t.priority || 'normal',
                                due_date: t.due_date,
                                estimated_hours: t.estimated_hours || 0,
                                project_name: `${updates.ticketNumber || editingOrder?.ticketNumber || t.project_name?.split(' - ')[0] || 'S/N'} - ${updates.client || editingOrder?.client || t.project_name?.split(' - ')[1]?.split(' (')[0] || ''}`
                            })
                            .eq('id', t.id);
                        if (updateTaskErr) console.error(`Erro ao atualizar tarefa ${t.id}:`, updateTaskErr);
                    }
                }

                setTasks(prev => {
                    const withoutOS = prev.filter(t => t.service_order_id !== id && !tasksToDelete.map(td => td.id).includes(t.id));
                    const updatedAndNew = [
                        ...tasksToUpdate,
                        ...newInsertedTasks
                    ];
                    return [...updatedAndNew, ...withoutOS];
                });
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

    const isInProductionQueue = (status: ServiceStatus) => status !== "A Definir";
    const inProgress = orders.filter(o => isInProductionQueue(o.status)).length;
    const defining = orders.filter(o => o.status === "A Definir").length;
    const totalValueActive = orders.filter(o => isInProductionQueue(o.status)).reduce((acc, curr) => acc + (curr.amount || 0), 0);
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
        .filter(o => isInProductionQueue(o.status))
        .sort((a, b) => {
            const aIsFinished = a.status === "Entregue e Finalizado";
            const bIsFinished = b.status === "Entregue e Finalizado";
            
            if (aIsFinished && !bIsFinished) return 1;
            if (!aIsFinished && bIsFinished) return -1;
            
            return (b.productionPriority || 0) - (a.productionPriority || 0);
        });

    const defineList = orders.filter(o => o.status === "A Definir");
    const activeOrders = orders.filter(o => isInProductionQueue(o.status));
    const totalMaterialsCost = orders.reduce((sum, o) => sum + (o.spentCost || 0), 0);
    const dangerOrdersCount = orders.filter(o => o.marginStatus === 'danger').length;
    const warningOrdersCount = orders.filter(o => o.marginStatus === 'warning').length;
    const healthyOrdersCount = orders.filter(o => o.marginStatus === 'healthy' && (o.spentCost || 0) > 0).length;

    const getStatusProgress = getStageProgress;
    const getStatusColor = getStageBgClass;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    return (
        <div className="space-y-6">
            <ModuleHeader
                badge="PROD.ENGINE // ESQUADREJADEIRA"
                statusLabel={`${inProgress} OS em Produção`}
                title="Ordens de"
                highlight="Serviço"
                subtitle="Linha de corte, fitagem, montagem de caixas, instalação e controle de margem fabril em tempo real."
                art={<AnimatedPanelSaw size="md" className="w-20 h-16" />}
                actions={
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchOrders}
                            disabled={isLoading}
                            className="gap-1.5 h-10 border-white/10 bg-white/[0.03] hover:bg-white/[0.07] font-black uppercase tracking-widest text-[10px] rounded-xl"
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                            Atualizar
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenManageStages()}
                            className="gap-1.5 h-10 border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-black uppercase tracking-widest text-[10px] rounded-xl"
                            title="Adicionar ou gerenciar etapas individuais por Ordem de Serviço"
                        >
                            <Layers className="h-3.5 w-3.5" />
                            Etapas por OS {totalCustomStagesCount > 0 ? `(${totalCustomStagesCount})` : ""}
                        </Button>
                        <MagicButton onClick={handleNewOrder} className="gap-1.5 h-10 px-5 shadow-xl shadow-primary/20">
                            <Plus className="h-4 w-4" />
                            Nova OS
                        </MagicButton>
                    </div>
                }
            />

            {/* OS HUD */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <Card className="executive-card border-metallic shadow-xl overflow-hidden group spotlight-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-blue-500">
                            <Settings2 className="h-32 w-32" />
                        </div>
                        <div className="relative z-10 flex items-center justify-between w-full">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">A Definir</p>
                                <h3 className="text-3xl font-black text-blue-500 tracking-tighter">
                                    <AnimatedCounter value={defining} />
                                    <span className="text-sm font-bold uppercase ml-2 text-muted-foreground">Pauta</span>
                                </h3>
                            </div>
                            <SparklineChart data={[5, 8, 6, 9, 7, 10, defining || 4]} variant="blue" width={85} height={30} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="executive-card border-metallic shadow-xl overflow-hidden group spotlight-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-primary">
                            <RefreshCw className="h-32 w-32" />
                        </div>
                        <div className="relative z-10 flex items-center justify-between w-full">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Em Produção</p>
                                <h3 className="text-3xl font-black text-primary tracking-tighter">
                                    <AnimatedCounter value={inProgress} />
                                    <span className="text-sm font-bold uppercase ml-2 text-muted-foreground">Ativas</span>
                                </h3>
                            </div>
                            <SparklineChart data={[8, 12, 11, 15, 14, 18, inProgress || 10]} variant="primary" width={85} height={30} />
                        </div>
                    </CardContent>
                </Card>

                {isAdmin && (
                    <Card className="executive-card border-metallic shadow-xl overflow-hidden group spotlight-card">
                        <CardContent className="p-6 flex items-center justify-between relative">
                            <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-amber-500">
                                <DollarSign className="h-32 w-32" />
                            </div>
                            <div className="relative z-10 flex items-center justify-between w-full">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Volume Financeiro</p>
                                    <h3 className="text-3xl font-black text-amber-500 tracking-tighter">
                                        <AnimatedCounter value={totalValueActive} formatter={formatCurrency} />
                                    </h3>
                                </div>
                                <SparklineChart data={[30, 42, 38, 55, 60, 68, 85]} variant="amber" width={85} height={30} />
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="executive-card border-metallic shadow-xl overflow-hidden group spotlight-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-emerald-500">
                            <CheckCircle className="h-32 w-32" />
                        </div>
                        <div className="relative z-10 flex items-center justify-between w-full">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Concluídas (Mês)</p>
                                <h3 className="text-3xl font-black text-emerald-500 tracking-tighter">
                                    <AnimatedCounter value={completedThisMonth} />
                                    <span className="text-sm font-bold uppercase ml-2 text-muted-foreground">Finalizadas</span>
                                </h3>
                            </div>
                            <SparklineChart data={[2, 4, 3, 7, 9, 8, completedThisMonth || 12]} variant="emerald" width={85} height={30} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="executive-card border-metallic shadow-xl overflow-hidden group spotlight-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-orange-500">
                            <ClipboardList className="h-32 w-32" />
                        </div>
                        <div className="relative z-10 flex items-center justify-between w-full">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Progresso de OS</p>
                                <h3 className="text-3xl font-black text-orange-500 tracking-tighter flex items-baseline">
                                    <AnimatedCounter value={completedOrdersCount} />
                                    <span className="text-xl text-muted-foreground font-bold mx-1">/</span>
                                    <AnimatedCounter value={totalOrdersCount} />
                                    <span className="text-xs font-bold uppercase ml-2 text-muted-foreground">OSs</span>
                                </h3>
                                <p className="text-[9px] text-amber-500/80 font-black uppercase tracking-widest mt-1">({pendingOrdersCount} em aberto)</p>
                            </div>
                            <SparklineChart data={[10, 14, 18, 16, 22, 26, totalOrdersCount || 30]} variant="amber" width={85} height={30} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="executive-card border-metallic shadow-xl overflow-hidden group spotlight-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-rose-500">
                            <AlertCircle className="h-32 w-32" />
                        </div>
                        <div className="relative z-10 flex items-center justify-between w-full">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Entregas Críticas</p>
                                <h3 className="text-3xl font-black text-rose-500 tracking-tighter">
                                    <AnimatedCounter value={criticalDeliveriesCount} />
                                    <span className="text-sm font-bold uppercase ml-2 text-muted-foreground">7 dias</span>
                                </h3>
                            </div>
                            <SparklineChart data={[8, 6, 7, 4, 3, 5, criticalDeliveriesCount || 2]} variant="rose" width={85} height={30} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Alerta Inteligente de Aproveitamento de Sobras & Retalhos de MDF no Plano de Corte */}
            {availableOffcutsCount > 0 && orders.some(o => o.status === "Plano de corte") && (
                <div className="px-5 py-3.5 rounded-3xl bg-amber-500/10 border border-amber-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 shrink-0">
                            <Layers className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-300">
                                    🪵 Economia de Chapas • Plano de Corte Ativo
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-200 border border-amber-500/30">
                                    {availableOffcutsCount} retalhos disponíveis
                                </span>
                            </div>
                            <p className="text-xs text-white/85 mt-0.5">
                                Há OS em <strong>Plano de Corte</strong> e você possui sobras catalogadas no estoque ({availableOffcutsSample.join(" • ")}).
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/admin/estoque"
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-display font-black uppercase text-[10px] tracking-wider shrink-0 text-center transition-all"
                    >
                        Consultar Retalhos MDF
                    </Link>
                </div>
            )}

            {/* Radar de Prejuízo & Margem */}
            {isAdmin && (
                <div className="p-5 rounded-3xl executive-card border-metallic shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-3 rounded-xl border flex items-center justify-center shrink-0",
                            dangerOrdersCount > 0 ? "bg-rose-500/10 border-rose-500/30 text-rose-500 animate-pulse" :
                            warningOrdersCount > 0 ? "bg-amber-500/10 border-amber-500/30 text-amber-500" :
                            "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                        )}>
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-black uppercase tracking-wider text-white">Radar Inteligente de Margem da Produção</h4>
                                {dangerOrdersCount > 0 && (
                                    <span className="text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full animate-pulse">
                                        ⚠️ {dangerOrdersCount} OS com Risco de Prejuízo
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                Monitoramento em tempo real do custo de chapas, ferragens e insumos (CED, Bruta e avulsos) rateados por projeto.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 self-end md:self-center">
                        <div className="text-right">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">Materiais Consumidos</span>
                            <span className="text-lg font-black text-amber-400 tracking-tight">
                                {formatCurrency(totalMaterialsCost)}
                            </span>
                        </div>
                        <div className="h-8 w-px bg-white/10 hidden sm:block" />
                        <div className="flex items-center gap-2">
                            <div className="flex flex-col items-center bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1 min-w-[70px]">
                                <span className="text-[9px] font-bold text-emerald-400 uppercase">Saudáveis</span>
                                <span className="text-xs font-black text-emerald-300">{healthyOrdersCount}</span>
                            </div>
                            <div className="flex flex-col items-center bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1 min-w-[70px]">
                                <span className="text-[9px] font-bold text-amber-400 uppercase">Atenção</span>
                                <span className="text-xs font-black text-amber-300">{warningOrdersCount}</span>
                            </div>
                            <div className="flex flex-col items-center bg-rose-500/10 border border-rose-500/20 rounded-lg px-2.5 py-1 min-w-[70px]">
                                <span className="text-[9px] font-bold text-rose-400 uppercase">Estouro</span>
                                <span className="text-xs font-black text-rose-300">{dangerOrdersCount}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Tabs defaultValue="producao" className="w-full">
                <TabsList className="bg-[#090d16] border border-white/[0.08] rounded-2xl p-1.5 mb-6 flex-wrap h-auto gap-1 shadow-2xl">
                    <TabsTrigger
                        value="definir"
                        className="rounded-xl px-5 py-2 font-black uppercase tracking-widest text-[10px] transition-all duration-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white border border-transparent data-[state=active]:border-blue-400/50"
                    >
                        <Settings2 className="h-3.5 w-3.5 mr-2" />
                        Definir (Pauta)
                    </TabsTrigger>
                    <TabsTrigger
                        value="producao"
                        className="rounded-xl px-5 py-2 font-black uppercase tracking-widest text-[10px] transition-all duration-200 data-[state=active]:bg-emerald-600 data-[state=active]:text-white border border-transparent data-[state=active]:border-emerald-400/50"
                    >
                        <Hammer className="h-3.5 w-3.5 mr-2" />
                        Fila de Produção
                    </TabsTrigger>
                    <TabsTrigger
                        value="todos"
                        className="rounded-xl px-5 py-2 font-black uppercase tracking-widest text-[10px] transition-all duration-200 data-[state=active]:bg-slate-800 data-[state=active]:text-white border border-transparent data-[state=active]:border-slate-500"
                    >
                        <RefreshCw className="h-3.5 w-3.5 mr-2" />
                        Todas OSs
                    </TabsTrigger>
                    <TabsTrigger
                        value="cronograma"
                        className="rounded-xl px-5 py-2 font-black uppercase tracking-widest text-[10px] transition-all duration-200 data-[state=active]:bg-cyan-600 data-[state=active]:text-white border border-transparent data-[state=active]:border-cyan-400/50"
                    >
                        <CalendarDays className="h-3.5 w-3.5 mr-2" />
                        Histórico Cronograma
                    </TabsTrigger>
                    <TabsTrigger
                        value="kanban"
                        className="rounded-xl px-5 py-2 font-black uppercase tracking-widest text-[10px] transition-all duration-200 data-[state=active]:bg-purple-600 data-[state=active]:text-white border border-transparent data-[state=active]:border-purple-400/50"
                    >
                        <KanbanSquare className="h-3.5 w-3.5 mr-2" />
                        Kanban (Visual)
                    </TabsTrigger>
                    <TabsTrigger
                        value="capacity"
                        className="rounded-xl px-5 py-2 font-black uppercase tracking-widest text-[10px] transition-all duration-200 data-[state=active]:bg-amber-600 data-[state=active]:text-white border border-transparent data-[state=active]:border-amber-400/50"
                    >
                        <Clock className="h-3.5 w-3.5 mr-2" />
                        Capacity Planning
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
                                        onDelete={handleDeleteOrder}
                                        onNotify={handleNotifyClient}
                                        onUpdate={handleUpdate}
                                        getStatusColor={getStatusColor}
                                        getStatusProgress={getStatusProgress}
                                        onOpenGallery={handleOpenGallery}
                                        stages={getProductionStagesForOrder(order.id, order.status)}
                                        customStagesCount={getCustomStagesForOrder(order.id).length}
                                        onOpenManageStages={handleOpenManageStages}
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
                                    onOpenGallery={handleOpenGallery}
                                    getStatusColor={getStatusColor}
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="cronograma">
                    <ProductionTimeline 
                        orders={orders}
                        onEdit={handleEditOrder}
                        getStatusColor={getStatusColor}
                    />
                </TabsContent>

                <TabsContent value="kanban">
                    <OSKanbanBoard 
                        orders={orders}
                        onStatusChange={(id, status) => handleUpdate(id, { status })}
                        onEdit={handleEditOrder}
                        onDelete={handleDeleteOrder}
                        onOpenGallery={handleOpenGallery}
                        isAdmin={isAdmin}
                        stages={kanbanStages}
                        getStageBorderClass={getStageBorderClass}
                        getStageBgClass={getStageBgClass}
                        getCustomStagesCount={(orderId) => getCustomStagesForOrder(orderId).length}
                        onManageOrderStages={(order) => handleOpenManageStages(order)}
                    />
                </TabsContent>

                <TabsContent value="capacity">
                    <CapacityTab 
                        orders={orders}
                        settings={settings}
                    />
                </TabsContent>
            </Tabs>

            <ServiceOrderFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSubmit={handleSubmit}
                onUpdate={handleUpdate}
                editingOrder={editingOrder}
                isAdmin={isAdmin}
                orderCustomStages={editingOrder ? getCustomStagesForOrder(editingOrder.id) : []}
                onAddStageForOrder={addCustomStageForOrder}
                onRemoveStageForOrder={removeCustomStageForOrder}
            />

            <OSVisualGalleryDialog
                open={isGalleryOpen}
                onOpenChange={setIsGalleryOpen}
                order={selectedGalleryOrder}
                onUpdateOrder={handleUpdateGalleryAttachments}
            />

            <ManageOSStagesDialog
                open={isManageStagesOpen}
                onOpenChange={(open) => {
                    setIsManageStagesOpen(open);
                    if (!open) setStageTargetOrder(null);
                }}
                orders={orders}
                targetOrder={stageTargetOrder}
                getStagesForOrder={getStagesForOrder}
                getCustomStagesForOrder={getCustomStagesForOrder}
                onAddStageForOrder={addCustomStageForOrder}
                onRemoveStageForOrder={removeCustomStageForOrder}
                onApplyStageToOrder={(orderId, stageName) =>
                    handleUpdate(orderId, { status: stageName })
                }
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
    onDelete?: (id: string) => void;
    onNotify: (order: ServiceOrder) => void;
    onUpdate: (id: string, updates: Partial<ServiceOrder>) => void;
    getStatusColor: (status: any, orderId?: string) => string;
    getStatusProgress: (status: any, orderId?: string) => number;
    onOpenGallery?: (order: ServiceOrder) => void;
    stages: OSStageConfig[];
    customStagesCount?: number;
    onOpenManageStages?: (targetOrder?: ServiceOrder) => void;
}

const SortableServiceOrderCard = ({
    order,
    index,
    tasks,
    onEdit,
    onDelete,
    onNotify,
    onUpdate,
    getStatusColor,
    getStatusProgress,
    onOpenGallery,
    stages,
    customStagesCount = 0,
    onOpenManageStages }: SortableItemProps) => {
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
                        className={cn("absolute inset-0 transition-all duration-1000 opacity-[0.08] pointer-events-none", getStatusColor(order.status, order.id))}
                        style={{ width: `${getStatusProgress(order.status, order.id)}%` }}
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
                                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                        <Select
                                            value={order.status}
                                            onValueChange={(val) => {
                                                if (val === "__add_new_stage__") {
                                                    if (onOpenManageStages) onOpenManageStages(order);
                                                    return;
                                                }
                                                onUpdate(order.id, { status: val as ServiceStatus });
                                            }}
                                        >
                                            <SelectTrigger className={cn("h-6 border-none shadow-none text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full w-auto gap-1", getStatusColor(order.status, order.id), "text-white")}>
                                                <SelectValue>{order.status}</SelectValue>
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/10 text-[10px] uppercase font-bold">
                                                {stages.map((stage) => {
                                                    const dotBg = OS_STAGE_COLORS[stage.color]?.bg || "bg-teal-500";
                                                    return (
                                                        <SelectItem key={stage.name} value={stage.name}>
                                                            <span className="inline-flex items-center gap-1.5">
                                                                <span className={cn("w-2 h-2 rounded-full inline-block shrink-0", dotBg)} />
                                                                <span>{stage.name}</span>
                                                                {!stage.isDefault && (
                                                                    <span className="text-[8px] font-black text-primary ml-1">
                                                                        (SÓ DESTA OS)
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </SelectItem>
                                                    );
                                                })}
                                                {onOpenManageStages && (
                                                    <SelectItem
                                                        value="__add_new_stage__"
                                                        className="text-primary font-black border-t border-white/10 mt-1"
                                                    >
                                                        + Adicionar etapa só nesta OS...
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>

                                        {onOpenManageStages && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenManageStages(order);
                                                }}
                                                className={cn(
                                                    "h-6 px-2 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all flex items-center gap-1",
                                                    customStagesCount > 0
                                                        ? "bg-primary/20 text-primary border-primary/40 hover:bg-primary/30"
                                                        : "bg-white/5 text-white/60 border-white/10 hover:text-primary hover:border-primary/40 hover:bg-primary/10"
                                                )}
                                                title={`Adicionar ou gerenciar etapas exclusivas de ${order.client}`}
                                            >
                                                <Plus className="h-2.5 w-2.5" />
                                                <span>
                                                    {customStagesCount > 0
                                                        ? `${customStagesCount} extra${customStagesCount > 1 ? "s" : ""}`
                                                        : "Etapa"}
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                    
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
                                
                                {/* Stepper Visual Industrial de 5 Estágios da Fábrica */}
                                {(() => {
                                    const progress = getStatusProgress(order.status, order.id);
                                    const stages = [
                                        { label: "1. Corte", threshold: 25 },
                                        { label: "2. Fita", threshold: 35 },
                                        { label: "3. Montagem", threshold: 55 },
                                        { label: "4. Embalagem", threshold: 75 },
                                        { label: "5. Instalação", threshold: 95 },
                                    ];
                                    return (
                                        <div className="mt-2 mb-1">
                                            <div className="grid grid-cols-5 gap-1.5 mb-1.5">
                                                {stages.map((st) => {
                                                    const isReached = progress >= st.threshold;
                                                    return (
                                                        <div key={st.label} className="flex flex-col gap-1">
                                                            <div className={cn(
                                                                "h-1.5 rounded-full transition-colors duration-300",
                                                                order.status === "Entregue e Finalizado"
                                                                    ? "bg-white"
                                                                    : isReached
                                                                    ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.35)]"
                                                                    : "bg-white/[0.07]"
                                                            )} />
                                                            <span className={cn(
                                                                "text-[8px] font-black uppercase tracking-wider truncate",
                                                                order.status === "Entregue e Finalizado"
                                                                    ? "text-white/90"
                                                                    : isReached
                                                                    ? "text-amber-400"
                                                                    : "text-white/25"
                                                            )}>
                                                                {st.label}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Termômetro Duplo da Obra: 1. Prazo/Custo Fabril (Dias Orçados vs Horas Reais) | 2. Margem de Material */}
                                {(() => {
                                    const estimatedDays = Math.max(1, Number(order.daysEstimated) || 1);
                                    const totalLoggedHours = (order.laborLogs || []).reduce((acc, l) => acc + (Number(l.hours) || 0), 0);
                                    const realDaysFromHours = totalLoggedHours > 0 ? Math.round((totalLoggedHours / 8.8) * 10) / 10 : 0;
                                    const openDateMs = order.openDate ? new Date(order.openDate).getTime() : Date.now();
                                    const endDateMs = order.completionDate ? new Date(order.completionDate).getTime() : Date.now();
                                    const elapsedCalendarDays = Math.max(1, Math.round((endDateMs - openDateMs) / (1000 * 60 * 60 * 24)));
                                    const isTimeWarning = realDaysFromHours > estimatedDays;
                                    const spentCost = Number(order.spentCost || 0);
                                    const costRatio = Number(order.costRatio || 0);

                                    return (
                                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div className="px-3 py-2 rounded-xl bg-black/30 border border-white/[0.07] flex items-center justify-between text-[10px] font-mono">
                                                <span className="text-muted-foreground flex items-center gap-1.5">
                                                    <Clock className="h-3 w-3 text-amber-400" />
                                                    Tempo Fábrica:
                                                </span>
                                                <span className={cn("font-bold", isTimeWarning ? "text-rose-400" : "text-amber-200")}>
                                                    Orçado: {estimatedDays}d • {totalLoggedHours > 0 ? `Apontado: ${totalLoggedHours}h (~${realDaysFromHours}d)` : `Em curso: ${elapsedCalendarDays}d`}
                                                </span>
                                            </div>

                                            <div className="px-3 py-2 rounded-xl bg-black/30 border border-white/[0.07] flex items-center justify-between text-[10px] font-mono">
                                                <span className="text-muted-foreground flex items-center gap-1.5">
                                                    <DollarSign className="h-3 w-3 text-emerald-400" />
                                                    Insumos Obra:
                                                </span>
                                                <span className={cn(
                                                    "font-bold",
                                                    order.marginStatus === "danger" ? "text-rose-400" :
                                                    order.marginStatus === "warning" ? "text-amber-400" : "text-emerald-400"
                                                )}>
                                                    {spentCost > 0
                                                        ? `R$ ${spentCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${costRatio}% do contrato)`
                                                        : "Sem notas rateadas"}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}

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
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onOpenGallery) onOpenGallery(order);
                                    }}
                                    className={cn(
                                        "text-[10px] font-black uppercase rounded-xl h-8 gap-1.5 border transition-all",
                                        (order.attachments?.length || 0) > 0
                                            ? "bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                                            : "bg-white/5 text-white/60 border-white/10 hover:text-white"
                                    )}
                                    title="Abrir Galeria Visual e Medidas do Local"
                                >
                                    <Camera className="h-3.5 w-3.5 text-amber-400" />
                                    <span>{(order.attachments?.length || 0) > 0 ? `${order.attachments?.length} fotos` : 'Medidas'}</span>
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const progress = getStatusProgress(order.status, order.id);
                                        const w = window.open("", "_blank");
                                        if (!w) {
                                            toast.error("Permita pop-ups para gerar o Card Visual do Cliente.");
                                            return;
                                        }
                                        const stagesHtml = [
                                            { label: "1. Plano de Corte", threshold: 25 },
                                            { label: "2. Fitagem & Usinagem", threshold: 35 },
                                            { label: "3. Pré-Montagem Fabril", threshold: 55 },
                                            { label: "4. Acabamento & Embalagem", threshold: 75 },
                                            { label: "5. Entrega & Instalação", threshold: 95 },
                                        ]
                                            .map((st) => {
                                                const done = order.status === "Entregue e Finalizado" || progress >= st.threshold;
                                                return `<div style="flex:1;padding:12px;border-radius:12px;background:${done ? "#fef3c7" : "#f1f5f9"};border:2px solid ${done ? "#d97706" : "#cbd5e1"};text-align:center;">
                                                    <div style="font-size:18px;margin-bottom:4px;">${done ? "✅" : "⏳"}</div>
                                                    <div style="font-size:11px;font-weight:800;color:${done ? "#92400e" : "#64748b"};text-transform:uppercase;">${st.label}</div>
                                                </div>`;
                                            })
                                            .join("");

                                        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Status do Projeto - ${order.client}</title>
                                        <style>body{font-family:'Segoe UI',system-ui,sans-serif;background:#1c1108;color:#fff;margin:0;padding:30px;display:flex;justify-content:center;}
                                        .card{max-width:760px;width:100%;background:#fff;color:#0f172a;border-radius:24px;padding:32px;box-shadow:0 25px 50px rgba(0,0,0,0.5);border-top:8px solid #d97706;}
                                        @media print{body{background:#fff;padding:0;}.no-print{display:none!important;}.card{box-shadow:none;}}</style></head>
                                        <body><div class="card">
                                            <div class="no-print" style="display:flex;justify-content:flex-end;gap:10px;margin-bottom:16px;">
                                                <button onclick="window.print()" style="background:#d97706;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-weight:800;cursor:pointer;">Imprimir / Salvar PDF para WhatsApp</button>
                                            </div>
                                            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #f1f5f9;padding-bottom:16px;margin-bottom:20px;">
                                                <div>
                                                    <div style="font-size:11px;font-weight:800;color:#d97706;text-transform:uppercase;letter-spacing:1.5px;">BJL Planejados • Acompanhamento de Produção</div>
                                                    <h1 style="margin:4px 0 0;font-size:24px;font-weight:900;">${order.client}</h1>
                                                    <p style="margin:4px 0 0;font-size:13px;color:#64748b;font-weight:600;">Ordem de Serviço: ${order.ticketNumber} • Ambiente(s): ${order.action || "Móveis Sob Medida"}</p>
                                                </div>
                                                <div style="text-align:right;">
                                                    <span style="display:inline-block;background:#fef3c7;color:#92400e;border:1px solid #f59e0b;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:900;text-transform:uppercase;">Etapa Atual: ${order.status}</span>
                                                    <div style="font-size:11px;color:#64748b;margin-top:6px;">Previsão: ${new Date(order.forecastDate).toLocaleDateString("pt-BR")}</div>
                                                </div>
                                            </div>
                                            <h3 style="font-size:12px;text-transform:uppercase;color:#475569;letter-spacing:1px;margin-bottom:12px;">Linha do Tempo da Marcenaria (${progress}% Concluído)</h3>
                                            <div style="display:flex;gap:10px;margin-bottom:24px;">${stagesHtml}</div>
                                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px;font-size:12px;color:#334155;line-height:1.5;">
                                                <strong>Compromisso de Qualidade BJL Planejados:</strong> Seu projeto está sendo executado com rigor milimétrico em nossa oficina. Qualquer dúvida, nossa equipe está à disposição!
                                            </div>
                                        </div></body></html>`);
                                        w.document.close();
                                    }}
                                    className="text-[10px] font-black uppercase rounded-xl h-8 border-amber-500/35 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 gap-1"
                                    title="Gerar Card / PDF Visual da Linha do Tempo da Obra para enviar ao cliente no WhatsApp"
                                >
                                    <span>📄 Status Cliente</span>
                                </Button>

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
                                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(order); }} className="text-[10px] font-black uppercase rounded-xl h-8 border-white/10 hover:bg-white/5">Detalhes</Button>
                                {onDelete && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(order.id);
                                        }}
                                        className="text-[10px] font-black uppercase rounded-xl h-8 px-2.5 text-rose-400 hover:text-white hover:bg-rose-600 border border-rose-500/30 bg-rose-500/10 gap-1 transition-all"
                                        title="Apagar Ordem de Serviço"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">Apagar</span>
                                    </Button>
                                )}
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

