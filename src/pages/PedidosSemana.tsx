import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Order } from "@/types/order";
import OrderFormDialog from "@/components/crm/OrderFormDialog";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil, TrendingUp, Printer, CheckCircle2 } from "lucide-react";
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
        const loadData = async () => {
            await fetchOrders();
            
            // Sincronização automática apenas na SEGUNDA-FEIRA (1) e apenas UMA VEZ ao dia
            // Se o usuário apagar um item, ele não voltará ao recarregar a página no mesmo dia
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const lastSync = localStorage.getItem('last_stock_sync');
            
            if (today.getDay() === 1 && lastSync !== todayStr) {
                await syncStockWithOrders();
                localStorage.setItem('last_stock_sync', todayStr);
            }
        };
        loadData();
    }, []);

    const syncStockWithOrders = async (clearFirst = false) => {
        try {
            if (clearFirst) {
                const { error: deleteError } = await supabase
                    .from('weekly_orders')
                    .delete()
                    .eq('status', 'pendente');
                
                if (deleteError) throw deleteError;
            }

            // 1. Buscar estoque
            const { data: inventoryData, error: inventoryError } = await supabase
                .from('inventory')
                .select('*');
            
            if (inventoryError) throw inventoryError;

            // 2. Buscar pedidos pendentes atuais para evitar duplicados (se não foi limpo)
            const { data: pendingOrders, error: ordersError } = await supabase
                .from('weekly_orders')
                .select('product')
                .eq('status', 'pendente');
            
            if (ordersError) throw ordersError;

            const pendingProductsSet = clearFirst ? new Set() : new Set((pendingOrders || []).map(o => o.product));
            
            // 3. Filtrar itens com estoque baixo que não estão nos pedidos
            const lowStockItems = (inventoryData || []).filter(item => 
                Number(item.quantity) < Number(item.min_stock_level) && 
                !pendingProductsSet.has(item.name)
            );

            if (lowStockItems.length === 0) return;

            // 4. Inserir novos pedidos
            const newOrders = lowStockItems.map(item => {
                const quantityToOrder = Math.max(1, Number(item.min_stock_level) - Number(item.quantity));
                return {
                    product: item.name,
                    quantity: quantityToOrder,
                    unit_price: Number(item.unit_price),
                    total_value: Number(item.unit_price) * quantityToOrder,
                    client: 'REPOSIÇÃO ESTOQUE',
                    supplier: 'A DEFINIR',
                    order_date: new Date().toISOString().split('T')[0],
                    status: 'pendente'
                };
            });

            const { error: insertError } = await supabase
                .from('weekly_orders')
                .insert(newOrders);

            if (insertError) throw insertError;

            toast.info(`${lowStockItems.length} itens de reposição automática adicionados.`);
            
            // Recarregar pedidos para mostrar os novos
            await fetchOrders();
        } catch (error) {
            console.error('Erro ao sincronizar estoque:', error);
        }
    };

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
                date: new Date(o.order_date + 'T12:00:00'),
                status: o.status || 'pendente'
            }));

            setOrders(mappedOrders.filter(o => o.status === 'pendente'));
        } catch (error) {
            console.error('Error fetching orders:', error);
            toast.error("Erro ao carregar pedidos.");
        }
    };

    const handleMarkAsOrdered = async (id: string) => {
        try {
            const { error } = await supabase
                .from('weekly_orders')
                .update({ status: 'comprado' })
                .eq('id', id);

            if (error) throw error;

            toast.success("Pedido marcado como comprado!");
            setOrders(prev => prev.filter(o => o.id !== id));
        } catch (error) {
            console.error('Error marking order:', error);
            toast.error("Erro ao atualizar pedido.");
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
                    date: new Date(data.order_date + 'T12:00:00'),
                    status: data.status || 'pendente'
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

    const isCHM = (sup: string | undefined) => {
        if (!sup) return false;
        const up = sup.toUpperCase();
        return up.includes("CHM") || up.includes("C HM") || up.includes("MORAIS") || up.includes("CED");
    };

    const isBRUTA = (sup: string | undefined) => {
        if (!sup) return false;
        const up = sup.toUpperCase();
        return up.includes("BRUTA");
    };

    const isDefinir = (sup: string | undefined) => {
        if (!sup) return true;
        const up = sup.toUpperCase();
        return up === "A DEFINIR" || up === "DEFINIR" || up === "NULL" || up === "";
    };

    const OrderSection = ({ title, type, colorClass, bgColorClass, borderClass }: { title: string, type: 'CHM' | 'BRUTA' | 'OTHER' | 'DEFINIR', colorClass: string, bgColorClass: string, borderClass: string }) => {
        const filtered = orders.filter(o => {
            if (type === 'DEFINIR') return isDefinir(o.supplier);
            if (type === 'CHM') return isCHM(o.supplier) && !isDefinir(o.supplier);
            if (type === 'BRUTA') return isBRUTA(o.supplier) && !isDefinir(o.supplier);
            return !isCHM(o.supplier) && !isBRUTA(o.supplier) && !isDefinir(o.supplier);
        });

        if (filtered.length === 0) return null;

        const getSupplierStyles = (sup: string) => {
            const upSup = sup.toUpperCase();
            if (upSup.includes("CHM") || upSup.includes("MORAIS") || upSup.includes("C HM") || upSup.includes("CED")) 
                return "border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
            if (upSup.includes("BRUTA")) 
                return "border-orange-500 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.1)]";
            return "border-white/10 bg-black/20";
        };

        const getSupplierTextColor = (sup: string) => {
            const upSup = sup.toUpperCase();
            if (upSup.includes("CHM") || upSup.includes("MORAIS") || upSup.includes("C HM") || upSup.includes("CED")) 
                return "text-emerald-500";
            if (upSup.includes("BRUTA")) 
                return "text-orange-500";
            return "text-white";
        };

        return (
            <Card className={cn("border backdrop-blur-2xl transition-all duration-300 overflow-hidden", borderClass, bgColorClass)}>
                <CardHeader className="pb-4 border-b border-white/5 bg-white/5">
                    <CardTitle className={cn("text-[10px] font-black uppercase tracking-[0.3em]", colorClass)}>{title}</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-3">
                        {/* Header mimic */}
                        <div className="grid grid-cols-12 gap-4 px-6 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50">
                            <div className="col-span-1">Ação</div>
                            <div className="col-span-1">Data</div>
                            <div className="col-span-3">Produto</div>
                            <div className="col-span-2">Fornecedor</div>
                            <div className="col-span-2">Cliente</div>
                            <div className="col-span-1 text-center">Qtd</div>
                            <div className="col-span-2 text-right">Total</div>
                        </div>

                        {filtered.map((order) => {
                            const supStyle = getSupplierStyles(order.supplier);
                            const supText = getSupplierTextColor(order.supplier);
                            
                            return (
                                <div 
                                    key={order.id} 
                                    className={cn(
                                        "grid grid-cols-12 gap-4 items-center px-6 py-4 rounded-xl border-2 transition-all group relative",
                                        supStyle,
                                        "hover:bg-black/40"
                                    )}
                                >
                                    <div className="col-span-1">
                                        <Button
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white transition-all shadow-sm"
                                            onClick={() => handleMarkAsOrdered(order.id)}
                                            title="Marcar como Pedido"
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="col-span-1 text-[10px] font-bold text-muted-foreground/80">
                                        {format(new Date(order.date), "dd/MM")}
                                    </div>
                                    <div className="col-span-3 text-[11px] font-black uppercase tracking-tight text-white group-hover:text-primary transition-colors">
                                        {order.product}
                                    </div>
                                    <div className={cn("col-span-2 text-[10px] font-black uppercase tracking-widest", supText)}>
                                        {order.supplier}
                                    </div>
                                    <div className="col-span-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter truncate">
                                        {order.client}
                                    </div>
                                    <div className="col-span-1 text-center font-black text-[11px]">
                                        {order.quantity}
                                    </div>
                                    <div className={cn("col-span-2 text-right font-black text-xs tabular-nums items-center flex justify-end gap-2", supText)}>
                                        {type === 'DEFINIR' && (
                                            <div className="flex gap-1 mr-2 opacity-100 animate-in fade-in zoom-in duration-300">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    title="Mover para CHM"
                                                    className="h-8 px-2 text-[8px] border-emerald-500/50 hover:bg-emerald-500 hover:text-white"
                                                    onClick={() => handleUpdateOrder(order.id, { supplier: "CHM Morais" })}
                                                >
                                                    CHM
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    title="Mover para BRUTA"
                                                    className="h-8 px-2 text-[8px] border-orange-500/50 hover:bg-orange-500 hover:text-white"
                                                    onClick={() => handleUpdateOrder(order.id, { supplier: "BRUTA" })}
                                                >
                                                    BRUTA
                                                </Button>
                                            </div>
                                        )}
                                        {formatCurrency(order.totalValue)}
                                    </div>

                                    {/* Action buttons overlay */}
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10"
                                            onClick={() => handleEditOrder(order)}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500"
                                            onClick={() => handleDeleteOrder(order.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
                        onClick={() => syncStockWithOrders(false)} 
                        variant="outline"
                        className="gap-2 h-11 px-5 border-blue-500/20 bg-blue-500/5 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-blue-500 hover:text-white group transition-all"
                    >
                        <TrendingUp className="h-4 w-4 group-hover:scale-110 transition-transform text-blue-400" />
                        Sincronizar
                    </Button>
                    <Button 
                        onClick={() => {
                            if (window.confirm("Isso apagará os pedidos pendentes atuais e criará uma lista nova baseada no estoque contado. Deseja continuar?")) {
                                syncStockWithOrders(true);
                            }
                        }} 
                        variant="outline"
                        className="gap-2 h-11 px-5 border-orange-500/20 bg-orange-500/5 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-orange-600 hover:text-white group transition-all"
                    >
                        <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform text-orange-400" />
                        Reiniciar p/ Sexta
                    </Button>
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
                <div className="lg:col-span-2">
                    <OrderSection 
                        title="Pedidos para Definir Fornecedor" 
                        type="DEFINIR" 
                        colorClass="text-blue-400" 
                        bgColorClass="bg-blue-500/5" 
                        borderClass="border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)] border-dashed"
                    />
                </div>

                <OrderSection 
                    title="CHM Morais / CED" 
                    type="CHM" 
                    colorClass="text-emerald-400" 
                    bgColorClass="bg-emerald-500/5" 
                    borderClass="border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                />
                
                <OrderSection 
                    title="BRUTA" 
                    type="BRUTA" 
                    colorClass="text-orange-400" 
                    bgColorClass="bg-orange-500/5" 
                    borderClass="border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.1)]"
                />

                <div className="lg:col-span-2">
                    <OrderSection 
                        title="Demais Fornecedores" 
                        type="OTHER" 
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
                    orders={orders} 
                    onClose={() => setIsPrintOpen(false)} 
                />
            )}
        </div>
    );
};

export default PedidosSemana;
