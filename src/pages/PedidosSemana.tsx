import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Order } from "@/types/order";
import OrderFormDialog from "@/components/crm/OrderFormDialog";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil, TrendingUp, Printer } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { MagicButton } from "@/components/ui/magic-button";
import { cn } from "@/lib/utils";
import WeeklyOrderPrintView from "@/components/crm/WeeklyOrderPrintView";

const PedidosSemana = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [isPrintOpen, setIsPrintOpen] = useState(false);

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
        if (!window.confirm("Tem certeza que deseja remover este pedido?")) return;
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

    const totalOrders = orders.length;
    const totalValue = orders.reduce((acc, o) => acc + o.totalValue, 0);
    const avgOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0;

    // Filters for this week (Monday to Sunday)
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const currentWeekOrders = orders.filter(o => {
        const orderDate = new Date(o.date);
        return isWithinInterval(orderDate, { start: weekStart, end: weekEnd });
    });

    const OrderSection = ({ title, supplierName, colorClass, bgColorClass, borderClass }: { title: string, supplierName?: string | string[], colorClass: string, bgColorClass: string, borderClass: string }) => {
        const filtered = Array.isArray(supplierName) 
            ? orders.filter(o => !supplierName.includes(o.supplier))
            : orders.filter(o => o.supplier === supplierName);

        if (filtered.length === 0 && Array.isArray(supplierName)) return null;
        if (filtered.length === 0 && !Array.isArray(supplierName)) return null;

        return (
            <Card className={cn("border backdrop-blur-2xl transition-all duration-300 overflow-hidden", borderClass, bgColorClass)}>
                <CardHeader className="pb-2">
                    <CardTitle className={cn("text-sm font-black uppercase tracking-widest", colorClass)}>{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-border/20">
                                <TableHead className="text-[10px] font-black uppercase">Data</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Produto</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Cliente</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Qtd</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-right">Total</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((order) => (
                                <TableRow key={order.id} className="border-b border-border/10 hover:bg-white/5 transition-colors group">
                                    <TableCell className="py-3 text-[11px] font-medium text-muted-foreground">{format(new Date(order.date), "dd/MM/yyyy")}</TableCell>
                                    <TableCell className="py-3 text-[11px] font-bold text-foreground">{order.product}</TableCell>
                                    <TableCell className="py-3 text-[11px] text-muted-foreground">{order.client}</TableCell>
                                    <TableCell className="py-3 text-[11px] font-mono">{order.quantity}</TableCell>
                                    <TableCell className={cn("py-3 text-[11px] font-black text-right", colorClass)}>{formatCurrency(order.totalValue)}</TableCell>
                                    <TableCell className="py-3 flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditOrder(order)}>
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-500/20" onClick={() => handleDeleteOrder(order.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                   <h2 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-amber-500 to-amber-700 text-glow">Pedidos da Semana</h2>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Monitoramento de Compras e Suprimentos</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        onClick={() => setIsPrintOpen(true)} 
                        variant="outline"
                        className="gap-2 h-11 px-5 border-white/10 bg-white/5 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-primary hover:text-primary-foreground group transition-all"
                    >
                        <Printer className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        Relatório PDF
                    </Button>
                    <MagicButton onClick={handleNewOrder} className="gap-1.5 h-11 px-6 shadow-xl shadow-primary/20">
                        <Plus className="h-4 w-4" />
                        Novo Pedido
                    </MagicButton>
                </div>
            </div>

            {/* WEEKLY ORDERS HUD */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card tilt-card border-beam-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-primary">
                            <Plus className="h-32 w-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Volume de Pedidos</p>
                            <h3 className="text-3xl font-black text-primary tracking-tighter">
                                <AnimatedCounter value={totalOrders} />
                                <span className="text-sm font-bold uppercase ml-2 text-muted-foreground">Registros</span>
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card tilt-card border-beam-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-amber-500">
                             <TrendingUp className="h-32 w-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Investimento Total</p>
                            <h3 className="text-3xl font-black text-amber-500 tracking-tighter">
                                <AnimatedCounter value={totalValue} formatter={formatCurrency} />
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card tilt-card border-beam-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-blue-500">
                             <TrendingUp className="h-32 w-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Ticket Médio p/ Pedido</p>
                            <h3 className="text-3xl font-black text-white tracking-tighter">
                                <AnimatedCounter value={avgOrderValue} formatter={formatCurrency} />
                            </h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <OrderSection 
                    title="CHM Morais" 
                    supplierName="CHM Morais" 
                    colorClass="text-emerald-500" 
                    bgColorClass="bg-emerald-500/5" 
                    borderClass="border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                />
                
                <OrderSection 
                    title="BRUTA" 
                    supplierName="BRUTA" 
                    colorClass="text-orange-500" 
                    bgColorClass="bg-orange-500/5" 
                    borderClass="border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.1)]"
                />

                <div className="lg:col-span-2">
                    <OrderSection 
                        title="Demais Fornecedores" 
                        supplierName={["CHM Morais", "BRUTA"]} 
                        colorClass="text-primary" 
                        bgColorClass="bg-card/40" 
                        borderClass="border-white/10"
                    />
                </div>
            </div>

            <OrderFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSubmit={handleOrderSubmit}
                onUpdate={handleUpdateOrder}
                editingOrder={editingOrder}
            />

            {isPrintOpen && (
                <WeeklyOrderPrintView 
                    orders={currentWeekOrders} 
                    onClose={() => setIsPrintOpen(false)} 
                />
            )}
        </div>
    );
};

export default PedidosSemana;
