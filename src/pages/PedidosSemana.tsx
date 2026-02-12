import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Order } from "@/types/order";
import OrderFormDialog from "@/components/crm/OrderFormDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

const PedidosSemana = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);

    const handleNewOrder = () => {
        setEditingOrder(null);
        setIsDialogOpen(true);
    };

    const handleOrderSubmit = (orderData: Omit<Order, "id">) => {
        const newOrder: Order = {
            ...orderData,
            id: Math.random().toString(36).substr(2, 9),
        };
        setOrders([...orders, newOrder]);
        setIsDialogOpen(false);
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                                        Nenhum pedido registrado nesta semana.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell>{format(new Date(), "dd/MM/yyyy")}</TableCell>
                                        <TableCell>{order.product}</TableCell>
                                        <TableCell>{order.client}</TableCell>
                                        <TableCell>{order.supplier}</TableCell>
                                        <TableCell>{order.quantity}</TableCell>
                                        <TableCell>{formatCurrency(order.unitPrice)}</TableCell>
                                        <TableCell className="font-bold">{formatCurrency(order.totalValue)}</TableCell>
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
                editingOrder={editingOrder}
            />
        </div>
    );
};

export default PedidosSemana;
