import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ServiceOrderTable from "@/components/crm/ServiceOrderTable";
import ServiceOrderFormDialog from "@/components/crm/ServiceOrderFormDialog";
import { ServiceOrder } from "@/types/serviceOrder";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { mockOrders } from "@/data/mockData";

const OrdemServico = () => {
    const [orders, setOrders] = useState<ServiceOrder[]>(mockOrders);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);

    const handleNewOrder = () => {
        setEditingOrder(null);
        setIsDialogOpen(true);
    };

    const handleEditOrder = (order: ServiceOrder) => {
        setEditingOrder(order);
        setIsDialogOpen(true);
    };

    const handleSubmit = (orderData: Omit<ServiceOrder, "id">) => {
        const newOrder: ServiceOrder = {
            ...orderData,
            id: Math.random().toString(36).substr(2, 9),
        };
        setOrders([newOrder, ...orders]);
        toast.success("Ordem de serviço criada com sucesso!");
    };

    const handleUpdate = (id: string, updates: Partial<ServiceOrder>) => {
        setOrders(orders.map(order =>
            order.id === id ? { ...order, ...updates } : order
        ));
        toast.success("Ordem de serviço atualizada com sucesso!");
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
                    <ServiceOrderTable orders={orders} onEdit={handleEditOrder} />
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
