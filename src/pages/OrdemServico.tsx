import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ServiceOrderTable from "@/components/crm/ServiceOrderTable";
import ServiceOrderFormDialog from "@/components/crm/ServiceOrderFormDialog";
import { ServiceOrder } from "@/types/serviceOrder";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const OrdemServico = () => {
    const [orders, setOrders] = useState<ServiceOrder[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);

    const [isLoading, setIsLoading] = useState(true);

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
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('service_orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;



            const mappedOrders: ServiceOrder[] = (data || []).map(o => ({
                id: o.id,
                ticketNumber: o.ticket_number || "S/N",
                openDate: parseDate(o.open_date),
                client: o.client || "Não informado",
                type: o.type as any || "Fabricação",
                action: o.action || "",
                status: o.status as any || "Em Andamento",
                forecastDate: parseDate(o.forecast_date),
                completionDate: o.completion_date ? parseDate(o.completion_date) : undefined,
                notes: o.notes,
                attachments: o.attachments || [],
                laborLogs: []
            }));

            // Mostra o que já tem
            setOrders(mappedOrders);
            setIsLoading(false);

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
            const newOrder = {
                ticket_number: orderData.ticketNumber,
                open_date: orderData.openDate.toISOString().split('T')[0],
                client: orderData.client,
                type: orderData.type,
                action: orderData.action,
                status: orderData.status,
                forecast_date: orderData.forecastDate.toISOString().split('T')[0],
                completion_date: orderData.completionDate ? orderData.completionDate.toISOString().split('T')[0] : null,
                notes: orderData.notes,
                attachments: orderData.attachments || []
            };

            const { data, error } = await supabase
                .from('service_orders')
                .insert([newOrder])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                // Inserir logs de horas se houver
                if (orderData.laborLogs && orderData.laborLogs.length > 0) {
                    const logsToInsert = orderData.laborLogs.map(l => ({
                        service_order_id: data.id,
                        date: new Date(l.date).toISOString().split('T')[0],
                        hours: l.hours,
                        description: l.description
                    }));
                    await supabase.from('service_order_labor_logs').insert(logsToInsert);
                }

                const createdOrder: ServiceOrder = {
                    id: data.id,
                    ticketNumber: data.ticket_number,
                    openDate: parseDate(data.open_date),
                    client: data.client,
                    type: data.type as any,
                    action: data.action,
                    status: data.status as any,
                    forecastDate: parseDate(data.forecast_date),
                    completionDate: data.completion_date ? parseDate(data.completion_date) : undefined,
                    notes: data.notes,
                    attachments: data.attachments || [],
                    laborLogs: orderData.laborLogs || []
                };
                setOrders([createdOrder, ...orders]);
            }
            toast.success("Ordem de serviço criada!");
        } catch (error) {
            console.error('Error adding order:', error);
            toast.error("Erro ao criar ordem de serviço.");
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
            if (updates.status) updateData.status = updates.status;
            if (updates.forecastDate) updateData.forecast_date = updates.forecastDate.toISOString().split('T')[0];
            if (updates.completionDate) updateData.completion_date = updates.completionDate.toISOString().split('T')[0];
            if (updates.notes !== undefined) updateData.notes = updates.notes;
            if (updates.attachments !== undefined) updateData.attachments = updates.attachments;

            const { error } = await supabase
                .from('service_orders')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            // Sincronizar logs de horas
            if (updates.laborLogs) {
                // Delete existing first
                await supabase.from('service_order_labor_logs').delete().eq('service_order_id', id);

                // Insert current ones
                if (updates.laborLogs.length > 0) {
                    const logsToInsert = updates.laborLogs.map((l: any) => ({
                        service_order_id: id,
                        date: new Date(l.date).toISOString().split('T')[0],
                        hours: l.hours,
                        description: l.description
                    }));
                    await supabase.from('service_order_labor_logs').insert(logsToInsert);
                }
            }

            setOrders(orders.map(order =>
                order.id === id ? { ...order, ...updates } : order
            ));
            toast.success("Ordem de serviço atualizada!");
        } catch (error) {
            console.error('Error updating order:', error);
            toast.error("Erro ao atualizar ordem de serviço.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Ordem de Serviço</h2>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchOrders}
                        disabled={isLoading}
                        className="gap-1.5"
                    >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        Atualizar
                    </Button>
                    <Button onClick={handleNewOrder} size="sm" className="gap-1.5">
                        <Plus className="h-4 w-4" />
                        Nova OS
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Lista de Ordens de Serviço</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground italic">
                            <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary/50" />
                            Carregando ordens de serviço...
                        </div>
                    ) : (
                        <ServiceOrderTable
                            orders={orders}
                            onEdit={handleEditOrder}
                            onDelete={handleDeleteOrder}
                        />
                    )}
                </CardContent>
            </Card>

            <ServiceOrderFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSubmit={handleSubmit}
                onUpdate={handleUpdate}
                editingOrder={editingOrder}
            />
        </div>
    );
};

export default OrdemServico;

