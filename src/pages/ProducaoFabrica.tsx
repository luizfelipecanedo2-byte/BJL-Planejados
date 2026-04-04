import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { ServiceOrder, ServiceStatus } from "@/types/serviceOrder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hammer, Play, CheckCircle2, ChevronRight, FileText, Image as ImageIcon, Loader2, RefreshCw, Smartphone, Package, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const STATUS_ORDER: ServiceStatus[] = [
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

const ProducaoFabrica = () => {
    const [orders, setOrders] = useState<ServiceOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    useEffect(() => {
        fetchProductionOrders();
    }, []);

    const fetchProductionOrders = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('service_orders')
                .select('*')
                .not('status', 'eq', 'A Definir')
                .not('status', 'eq', 'Entregue e Finalizado')
                .order('production_priority', { ascending: false });

            if (error) throw error;

            const mapped: ServiceOrder[] = (data || []).map(o => ({
                id: o.id,
                ticketNumber: o.ticket_number,
                openDate: new Date(o.open_date),
                client: o.client,
                type: o.type as any,
                action: o.action,
                status: o.status as any,
                forecastDate: new Date(o.forecast_date),
                notes: o.notes,
                attachments: o.attachments || [],
                productionPriority: o.production_priority || 0,
                productionNotes: o.production_notes || ""
            }));

            setOrders(mapped);
        } catch (error) {
            console.error('Error fetching production orders:', error);
            toast.error("Erro ao carregar produção.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdvanceStatus = async (order: ServiceOrder) => {
        const currentIndex = STATUS_ORDER.indexOf(order.status);
        if (currentIndex === -1 || currentIndex === STATUS_ORDER.length - 1) return;

        const nextStatus = STATUS_ORDER[currentIndex + 1];
        
        try {
            const updateData: any = { status: nextStatus };
            
            // Se for o último passo, define data de conclusão
            if (nextStatus === "Entregue e Finalizado") {
                updateData.completion_date = new Date().toISOString().split('T')[0];
                updateData.production_priority = 0;
            }

            const { error } = await supabase
                .from('service_orders')
                .update(updateData)
                .eq('id', order.id);

            if (error) throw error;

            toast.success(`${order.client}: Movido para ${nextStatus}!`);
            
            // Remove da lista se estiver finalizado, ou atualiza localmente
            if (nextStatus === "Entregue e Finalizado") {
                setOrders(orders.filter(o => o.id !== order.id));
            } else {
                setOrders(orders.map(o => o.id === order.id ? { ...o, status: nextStatus } : o));
            }
        } catch (error) {
            console.error('Error advancing status:', error);
            toast.error("Erro ao atualizar status.");
        }
    };

    const getStatusProgress = (status: ServiceStatus) => {
        const idx = STATUS_ORDER.indexOf(status);
        return ((idx + 1) / STATUS_ORDER.length) * 100;
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
            default: return "bg-slate-400";
        }
    };

    return (
        <div className="min-h-screen bg-black pb-24 lg:pb-12 p-4 pt-10">
            {/* Header Mobile Otimizado */}
            <div className="flex items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-orange-500 to-amber-700">Mãos à Obra</h1>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                        <Smartphone className="h-3 w-3" />
                        Contexto Chão de Fábrica
                    </div>
                </div>
                <Button 
                    size="icon" 
                    variant="outline" 
                    onClick={fetchProductionOrders} 
                    className="rounded-full border-white/10 bg-white/5 h-12 w-12"
                    disabled={isLoading}
                >
                    <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
                </Button>
            </div>

            {/* Listagem de Cards Gigantes para Celular */}
            <div className="space-y-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-pulse">
                        <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
                        <span className="font-black uppercase tracking-widest text-xs">Sincronizando Fábrica...</span>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-10">
                        <Package className="h-16 w-16 text-white/10 mb-4" />
                        <h3 className="text-xl font-bold text-white/50">Tudo limpo por aqui!</h3>
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-2">Nenhuma OS em produção no momento.</p>
                    </div>
                ) : (
                    orders.map((order, idx) => (
                        <Card key={order.id} className="border-none shadow-2xl bg-card/60 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden relative group active:scale-[0.98] transition-transform">
                            {/* Barra de Progresso no Topo */}
                            <div className="absolute top-0 left-0 w-full h-[6px] bg-white/5">
                                <div 
                                    className={cn("h-full transition-all duration-1000", getStatusColor(order.status))}
                                    style={{ width: `${getStatusProgress(order.status)}%` }}
                                />
                            </div>

                            <CardContent className="p-8 pt-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                                                {order.ticketNumber}
                                            </span>
                                            {order.productionPriority > 0 && (
                                                <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                                                    Prioridade #{idx + 1}
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none pt-2">
                                            {order.client}
                                        </h2>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                            {order.action}
                                        </p>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="rounded-2xl h-14 w-14 bg-white/5 border border-white/5"
                                        onClick={() => {
                                            setSelectedOrder(order);
                                            setIsDetailsOpen(true);
                                        }}
                                    >
                                        <Info className="h-6 w-6 text-white/40" />
                                    </Button>
                                </div>

                                <div className="space-y-6">
                                    {/* Status Atual */}
                                    <div className="bg-white/[0.03] rounded-3xl p-6 border border-white/5 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">Estágio Atual</p>
                                            <p className={cn("text-xl font-black uppercase tracking-tighter", getStatusColor(order.status).replace('bg-', 'text-'))}>
                                                {order.status}
                                            </p>
                                        </div>
                                        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center opacity-40", getStatusColor(order.status))}>
                                            <Hammer className="h-6 w-6 text-white" />
                                        </div>
                                    </div>

                                    {/* Botão de Ação Gigante */}
                                    <Button 
                                        className={cn(
                                            "w-full h-24 rounded-[2rem] text-xl font-black uppercase tracking-widest flex items-center justify-center gap-4 shadow-2xl shadow-primary/10 group active:scale-95 transition-all",
                                            "bg-gradient-to-r from-primary via-amber-500 to-primary-foreground text-black hover:opacity-90"
                                        )}
                                        onClick={() => handleAdvanceStatus(order)}
                                    >
                                        <CheckCircle2 className="h-8 w-8" />
                                        <span>FINALIZAR ETAPA</span>
                                        <ChevronRight className="h-8 w-8 ml-2 group-hover:translate-x-2 transition-transform" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Modal de Detalhes Mobile */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="w-[95%] rounded-[3rem] bg-slate-950 border-white/10 p-8 max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-white">
                            {selectedOrder?.client}
                        </DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-widest text-primary">
                            Detalhes Técnicos & Notas
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-8 mt-6">
                        {/* Ajuste de Estágio (Correção) */}
                        <div className="space-y-3 p-6 bg-primary/5 rounded-[2rem] border border-primary/20">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Hammer className="h-3 w-3" />
                                Ajustar Estágio Atual (Correção)
                            </h4>
                            <Select 
                                value={selectedOrder?.status} 
                                onValueChange={async (newStatus) => {
                                    if (!selectedOrder) return;
                                    try {
                                        const { error } = await supabase
                                            .from('service_orders')
                                            .update({ status: newStatus })
                                            .eq('id', selectedOrder.id);
                                        
                                        if (error) throw error;
                                        
                                        // Atualiza o estado local
                                        setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, status: newStatus as any } : o));
                                        setSelectedOrder({ ...selectedOrder, status: newStatus as any });
                                        toast.success("Estágio corrigido com sucesso!");
                                    } catch (err) {
                                        toast.error("Erro ao corrigir estágio.");
                                    }
                                }}
                            >
                                <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl text-white font-bold uppercase tracking-tight">
                                    <SelectValue placeholder="Selecione o estágio" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white font-bold uppercase text-[10px]">
                                    {STATUS_ORDER.map(status => (
                                        <SelectItem key={status} value={status}>{status}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[8px] font-bold text-muted-foreground uppercase text-center mt-2 px-4">
                                Use este campo se avançar o projeto por engano.
                            </p>
                        </div>

                        {/* Notas */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <FileText className="h-3 w-3" />
                                Observações do Gestor
                            </h4>
                            <div className="bg-white/5 rounded-3xl p-6 border border-white/5 text-sm text-slate-300 leading-relaxed italic">
                                {selectedOrder?.productionNotes || selectedOrder?.notes || "Nenhuma observação técnica para este projeto."}
                            </div>
                        </div>

                        {/* Anexos */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <ImageIcon className="h-3 w-3" />
                                Arquivos e Projetos ({selectedOrder?.attachments?.length || 0})
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                {selectedOrder?.attachments?.map((url, i) => (
                                    <a 
                                        key={i} 
                                        href={url} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="h-24 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-center group hover:bg-primary/20 transition-colors"
                                    >
                                        <div className="flex flex-col items-center gap-1">
                                            <FileText className="h-6 w-6 text-white/20 group-hover:text-primary transition-colors" />
                                            <span className="text-[8px] font-black text-white/30 group-hover:text-primary uppercase">Abrir Ver {i+1}</span>
                                        </div>
                                    </a>
                                ))}
                                {(!selectedOrder?.attachments || selectedOrder.attachments.length === 0) && (
                                    <div className="col-span-2 py-8 text-center bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                                        <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Nenhum projeto anexado</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Button 
                            className="w-full h-16 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-xs"
                            onClick={() => setIsDetailsOpen(false)}
                        >
                            FECHAR
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProducaoFabrica;
