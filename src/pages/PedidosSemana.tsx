import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Order } from "@/types/order";
import OrderFormDialog from "@/components/crm/OrderFormDialog";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const PedidosSemana = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const { data, error } = await supabase
                .from('weekly_orders')
                .select('*')
                .order('order_date', { ascending: false });

            if (error) throw error;

            const mappedOrders: Order[] = (data || []).map(o => ({
                id: o.id,
                product: o.product,
                quantity: Number(o.quantity),
                unitPrice: Number(o.unit_price),
                totalValue: Number(o.total_value),
                client: o.client,
                supplier: o.supplier,
                date: new Date(o.order_date + 'T12:00:00')
            }));

            setOrders(mappedOrders);
        } catch (error) {
            console.error('Error fetching orders:', error);
            toast.error("Erro ao carregar pedidos.");
        }
    };

    const handleNewOrder = () => {
        setEditingOrder(null);
        setIsDialogOpen(true);
    };

    const handleEditOrder = (order: Order) => {
        setEditingOrder(order);
        setIsDialogOpen(true);
    };

    const handleUpdateOrder = async (id: string, updates: Partial<Order>) => {
        try {
            const updateData: any = {};
            if (updates.product) updateData.product = updates.product;
            if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
            if (updates.unitPrice !== undefined) updateData.unit_price = updates.unitPrice;
            if (updates.totalValue !== undefined) updateData.total_value = updates.totalValue;
            if (updates.client) updateData.client = updates.client;
            if (updates.supplier) updateData.supplier = updates.supplier;
            if (updates.date) updateData.order_date = updates.date.toISOString().split('T')[0];

            const { error } = await supabase
                .from('weekly_orders')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            setOrders(orders.map(o => o.id === id ? { ...o, ...updates } : o));
            toast.success("Pedido atualizado!");
        } catch (error) {
            console.error('Error updating order:', error);
            toast.error("Erro ao atualizar pedido.");
        }
    };

    const handleDeleteOrder = async (id: string) => {
        try {
            const { error } = await supabase
                .from('weekly_orders')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setOrders(orders.filter(o => o.id !== id));
            toast.success("Pedido removido!");
        } catch (error) {
            console.error('Error deleting order:', error);
            toast.error("Erro ao remover pedido.");
        }
    };

    const handleOrderSubmit = async (orderData: Omit<Order, "id">) => {
        try {
            const newOrder = {
                product: orderData.product,
                quantity: orderData.quantity,
                unit_price: orderData.unitPrice,
                total_value: orderData.totalValue,
                client: orderData.client,
                supplier: orderData.supplier,
                order_date: orderData.date.toISOString().split('T')[0]
            };

            const { data, error } = await supabase
                .from('weekly_orders')
                .insert([newOrder])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                const createdOrder: Order = {
                    id: data.id,
                    product: data.product,
                    quantity: Number(data.quantity),
                    unitPrice: Number(data.unit_price),
                    totalValue: Number(data.total_value),
                    client: data.client,
                    supplier: data.supplier,
                    date: new Date(data.order_date + 'T12:00:00')
                };
                setOrders([createdOrder, ...orders]);
            }
            setIsDialogOpen(false);
            toast.success("Pedido registrado!");
        } catch (error) {
            console.error('Error adding order:', error);
            toast.error("Erro ao registrar pedido.");
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
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Pedidos da Semana</h2>
                <Button onClick={handleNewOrder} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Pedido
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pedidos Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Produto</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Fornecedor</TableHead>
                                <TableHead>Qtd</TableHead>
                                <TableHead>Valor Unit.</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead className="w-[50px]">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                                        Nenhum pedido registrado nesta semana.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell>{format(new Date(order.date), "dd/MM/yyyy")}</TableCell>
                                        <TableCell>{order.product}</TableCell>
                                        <TableCell>{order.client}</TableCell>
                                        <TableCell>{order.supplier}</TableCell>
                                        <TableCell>{order.quantity}</TableCell>
                                        <TableCell>{formatCurrency(order.unitPrice)}</TableCell>
                                        <TableCell className="font-bold">{formatCurrency(order.totalValue)}</TableCell>
                                        <TableCell className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEditOrder(order)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleDeleteOrder(order.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <OrderFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSubmit={handleOrderSubmit}
                onUpdate={handleUpdateOrder}
                editingOrder={editingOrder}
            />
        </div>
    );
};

export default PedidosSemana;
