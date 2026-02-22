import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ServiceOrderTable from "@/components/crm/ServiceOrderTable";
import ServiceOrderFormDialog from "@/components/crm/ServiceOrderFormDialog";
import { ServiceOrder } from "@/types/serviceOrder";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const OrdemServico = () => {
    const [orders, setOrders] = useState<ServiceOrder[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const { data, error } = await supabase
                .from('service_orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedOrders: ServiceOrder[] = (data || []).map(o => ({
                id: o.id,
                ticketNumber: o.ticket_number,
                openDate: new Date(o.open_date + 'T12:00:00'),
                client: o.client,
                type: o.type as any,
                action: o.action,
                status: o.status as any,
                forecastDate: new Date(o.forecast_date + 'T12:00:00'),
                completionDate: o.completion_date ? new Date(o.completion_date + 'T12:00:00') : undefined,
                notes: o.notes,
                attachments: o.attachments || []
            }));

            setOrders(mappedOrders);
        } catch (error) {
            console.error('Error fetching orders:', error);
            toast.error("Erro ao carregar ordens de serviço.");
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
                const createdOrder: ServiceOrder = {
                    id: data.id,
                    ticketNumber: data.ticket_number,
                    openDate: new Date(data.open_date + 'T12:00:00'),
                    client: data.client,
                    type: data.type as any,
                    action: data.action,
                    status: data.status as any,
                    forecastDate: new Date(data.forecast_date + 'T12:00:00'),
                    completionDate: data.completion_date ? new Date(data.completion_date + 'T12:00:00') : undefined,
                    notes: data.notes,
                    attachments: data.attachments || []
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
                <Button onClick={handleNewOrder} size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    Nova OS
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Lista de Ordens de Serviço</CardTitle>
                </CardHeader>
                <CardContent>
                    <ServiceOrderTable
                        orders={orders}
                        onEdit={handleEditOrder}
                        onDelete={handleDeleteOrder}
                    />
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

