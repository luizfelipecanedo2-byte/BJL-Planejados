
import { useBudgets, Budget } from "@/hooks/useBudgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ChevronUp, 
  ChevronDown, 
  Hammer, 
  Scissors, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Truck,
  ArrowUpCircle,
  GripVertical,
  MessageSquare,
  Settings2,
  CalendarDays,
  Play
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const STATUS_CONFIG = {
  'aguardando': { label: 'Aguardando', icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
  'corte': { label: 'Corte', icon: Scissors, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  'montagem': { label: 'Montagem', icon: Hammer, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  'acabamento': { label: 'Acabamento', icon: CheckCircle2, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  'pronto': { label: 'Pronto', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
  'entregue': { label: 'Entregue', icon: Truck, color: 'text-slate-500', bg: 'bg-slate-500/5', border: 'border-slate-500/10' }
};

const PRIORITY_CONFIG = {
  'baixa': { label: 'Baixa', color: 'text-slate-400', glow: '' },
  'normal': { label: 'Normal', color: 'text-blue-400', glow: '' },
  'alta': { label: 'Alta', color: 'text-orange-500', glow: 'shadow-[0_0_15px_rgba(249,115,22,0.2)]' },
  'urgente': { label: 'Urgente', color: 'text-rose-500', glow: 'shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse border-rose-500/50' }
};

const FilaProducao = () => {
    const { budgets, updateProductionStatus, updateProductionPriority, loading, saveBudget } = useBudgets();
    const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
    const [editingDates, setEditingDates] = useState<Record<string, string>>({});
    
    // Filter only approved budgets for production
    const approvedBudgets = useMemo(() => {
        return budgets.filter(b => b.status === 'aprovado' && b.production_status !== 'entregue');
    }, [budgets]);

    const defineBudgets = useMemo(() => {
        return approvedBudgets.filter(b => b.production_status === 'aguardando' || !b.production_status);
    }, [approvedBudgets]);

    const activeProductionBudgets = useMemo(() => {
        return approvedBudgets
            .filter(b => b.production_status && b.production_status !== 'aguardando')
            .sort((a, b) => (b.production_priority || 0) - (a.production_priority || 0));
    }, [approvedBudgets]);

    const stats = useMemo(() => {
        const urgent = activeProductionBudgets.filter(b => b.priority_level === 'urgente').length;
        const inProd = activeProductionBudgets.filter(b => b.production_status !== 'aguardando' && b.production_status !== 'pronto').length;
        const ready = activeProductionBudgets.filter(b => b.production_status === 'pronto').length;
        const waiting = defineBudgets.length;
        return { urgent, inProd, ready, waiting };
    }, [activeProductionBudgets, defineBudgets]);

    const handleMoveUp = async (budget: Budget) => {
        const currentPrio = budget.production_priority || 0;
        await updateProductionPriority(budget.id, currentPrio + 1);
    };

    const handleMoveDown = async (budget: Budget) => {
        const currentPrio = budget.production_priority || 0;
        await updateProductionPriority(budget.id, Math.max(0, currentPrio - 1));
    };

    const handleLevelChange = async (budgetId: string, level: any) => {
        const budget = budgets.find(b => b.id === budgetId);
        if (budget) {
            await updateProductionPriority(budgetId, budget.production_priority || 0, level);
        }
    };

    const handleSaveDate = async (budget: Budget) => {
        const date = editingDates[budget.id];
        if (!date) return;
        await saveBudget({ id: budget.id, production_date: date }, []);
        setEditingDates(prev => {
            const next = { ...prev };
            delete next[budget.id];
            return next;
        });
        toast.success("Data de previsão atualizada!");
    };

    const handleStartProduction = async (budget: Budget) => {
        if (!budget.production_date && !editingDates[budget.id]) {
            toast.error("Por favor, defina a data de previsão antes de iniciar.");
            return;
        }
        
        const date = editingDates[budget.id] || budget.production_date;
        const notes = editingNotes[budget.id] || budget.production_notes;
        
        await saveBudget({ 
            id: budget.id, 
            production_status: 'corte', 
            production_date: date,
            production_notes: notes
        }, []);
        
        toast.success("Móvel enviado para serra (Corte iniciado)!");
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-amber-500 to-rose-500 text-glow">Fila de Produção</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Orquestração de Fábrica e Marcenaria High-End</p>
                </div>
            </div>

            {/* PRODUCTION HUD */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card border-beam-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-blue-500">
                            <Settings2 className="h-32 w-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">A Definir</p>
                            <h3 className="text-3xl font-black text-blue-500 tracking-tighter uppercase flex items-center gap-3">
                                <AnimatedCounter value={stats.waiting} />
                                <span className="text-[10px] font-bold text-muted-foreground">Novos Pagos</span>
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card border-beam-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-rose-500">
                            <AlertCircle className="h-32 w-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Pedidos Urgentes</p>
                            <h3 className="text-3xl font-black text-rose-500 tracking-tighter uppercase flex items-center gap-3">
                                <AnimatedCounter value={stats.urgent} />
                                <span className="text-[10px] font-bold text-muted-foreground">Prioridade Máxima</span>
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card border-beam-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-amber-500">
                             <Hammer className="h-32 w-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Em Fabricação</p>
                            <h3 className="text-3xl font-black text-amber-500 tracking-tighter uppercase flex items-center gap-3">
                                <AnimatedCounter value={stats.inProd} />
                                <span className="text-[10px] font-bold text-muted-foreground">Na Bancada</span>
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card border-beam-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-emerald-500">
                             <CheckCircle2 className="h-32 w-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Prontos p/ Entrega</p>
                            <h3 className="text-3xl font-black text-emerald-500 tracking-tighter uppercase flex items-center gap-3">
                                <AnimatedCounter value={stats.ready} />
                                <span className="text-[10px] font-bold text-muted-foreground">Expedição</span>
                            </h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="definir" className="w-full">
                <TabsList className="bg-white/5 border border-white/10 rounded-2xl p-1 mb-8">
                    <TabsTrigger value="definir" className="rounded-xl px-8 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white">
                        <Settings2 className="h-3 w-3 mr-2" />
                        Definir (Aguardando Pauta)
                    </TabsTrigger>
                    <TabsTrigger value="producao" className="rounded-xl px-8 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                        <Hammer className="h-3 w-3 mr-2" />
                        Em Produção (Fábrica)
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="definir" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        {defineBudgets.map((budget) => (
                            <Card key={budget.id} className="border border-white/5 bg-white/[0.02] backdrop-blur-3xl overflow-hidden group">
                                <div className="p-6 flex flex-col md:flex-row gap-6">
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <h4 className="text-xl font-black tracking-tight text-white uppercase group-hover:text-primary transition-colors">
                                                {budget.client_name}
                                            </h4>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                                {budget.project_name}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            <div>
                                                <p className="text-[8px] font-black uppercase text-primary/70 mb-2 flex items-center gap-1">
                                                    <CalendarDays className="h-2.5 w-2.5" /> Data de Previsão
                                                </p>
                                                <div className="flex gap-2">
                                                    <Input 
                                                        type="date" 
                                                        className="h-10 bg-white/5 border-white/5 text-[11px] font-black rounded-xl"
                                                        value={editingDates[budget.id] || budget.production_date || ""}
                                                        onChange={(e) => setEditingDates(prev => ({ ...prev, [budget.id]: e.target.value }))}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-[8px] font-black uppercase text-primary/70 mb-2 flex items-center gap-1">
                                                    <ArrowUpCircle className="h-2.5 w-2.5" /> Nível de Prioridade
                                                </p>
                                                <Select value={budget.priority_level || 'normal'} onValueChange={(val) => handleLevelChange(budget.id, val)}>
                                                    <SelectTrigger className="h-10 bg-white/5 border-white/5 text-[10px] font-black uppercase tracking-widest rounded-xl">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-black/90 border-white/10 backdrop-blur-xl">
                                                        <SelectItem value="baixa" className="text-[10px] font-black uppercase">Baixa</SelectItem>
                                                        <SelectItem value="normal" className="text-[10px] font-black uppercase">Normal</SelectItem>
                                                        <SelectItem value="alta" className="text-[10px] font-black uppercase text-orange-500">Alta</SelectItem>
                                                        <SelectItem value="urgente" className="text-[10px] font-black uppercase text-rose-500">Urgente</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="sm:col-span-2 lg:col-span-1">
                                                <p className="text-[8px] font-black uppercase text-primary/70 mb-2 flex items-center gap-1">
                                                    <MessageSquare className="h-2.5 w-2.5" /> Notas Técnicas
                                                </p>
                                                <Textarea 
                                                    placeholder="Instruções para a marcenaria..." 
                                                    className="bg-white/5 border-white/5 text-[11px] font-bold min-h-[60px] rounded-xl resize-none"
                                                    value={editingNotes[budget.id] !== undefined ? editingNotes[budget.id] : (budget.production_notes || "")}
                                                    onChange={(e) => setEditingNotes(prev => ({ ...prev, [budget.id]: e.target.value }))}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-center gap-3 md:w-48">
                                        <Button 
                                            className="h-16 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-xl shadow-emerald-900/10 group/btn"
                                            onClick={() => handleStartProduction(budget)}
                                        >
                                            <Play className="h-4 w-4 mr-2 group-hover/btn:rotate-12 transition-transform" />
                                            Iniciar Produção
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}

                        {defineBudgets.length === 0 && (
                            <div className="p-20 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
                                <Package className="h-12 w-12 text-white/10 mx-auto mb-4" />
                                <h4 className="text-xl font-black text-white/20 uppercase tracking-tighter">Nada pendente para definir</h4>
                                <p className="text-xs font-bold text-white/10 uppercase tracking-widest mt-2">Novas vendas aprovadas aparecerão aqui.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="producao" className="space-y-4">
                    <div className="flex items-center gap-3 px-2 mb-2">
                        <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Linha de Montagem Ativa</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                    {activeProductionBudgets.map((budget, index) => {
                        const status = STATUS_CONFIG[budget.production_status || 'aguardando'];
                        const priority = PRIORITY_CONFIG[budget.priority_level || 'normal'];
                        const StatusIcon = status.icon;

                        return (
                            <Card 
                                key={budget.id} 
                                className={cn(
                                    "border transition-all duration-300 backdrop-blur-3xl overflow-hidden group",
                                    budget.priority_level === 'urgente' ? "border-rose-500/30 bg-rose-500/5 shadow-[0_0_30px_rgba(244,63,94,0.1)]" : "border-white/5 bg-white/[0.02]",
                                    priority.glow
                                )}
                            >
                                <div className="p-1 flex flex-col md:flex-row items-stretch md:items-center gap-4">
                                    {/* Action Column */}
                                    <div className="flex md:flex-col items-center justify-center p-2 bg-white/5 rounded-2xl gap-2 min-w-[50px]">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary hover:text-white" onClick={() => handleMoveUp(budget)}>
                                            <ChevronUp className="h-5 w-5" />
                                        </Button>
                                        <div className="text-[10px] font-black text-white/40">#{index + 1}</div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary hover:text-white" onClick={() => handleMoveDown(budget)}>
                                            <ChevronDown className="h-5 w-5" />
                                        </Button>
                                    </div>

                                    {/* Info Column */}
                                    <div className="flex-1 p-4">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border", status.border, status.bg, status.color)}>
                                                        {status.label}
                                                    </span>
                                                    <span className={cn("text-[8px] font-black uppercase tracking-wider", priority.color)}>
                                                        {priority.label}
                                                    </span>
                                                    {budget.production_date && (
                                                        <span className="text-[8px] font-black uppercase tracking-wider text-primary/80 flex items-center gap-1 ml-2">
                                                            <CalendarDays className="h-2 w-2" />
                                                            Entrega: {new Date(budget.production_date).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="text-lg font-black tracking-tight text-white uppercase group-hover:text-primary transition-colors">
                                                    {budget.client_name}
                                                </h4>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                    {budget.project_name} 
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-3">
                                                <div className="min-w-[140px]">
                                                    <p className="text-[8px] font-black uppercase text-muted-foreground mb-1 ml-1">Fase da Produção</p>
                                                    <Select value={budget.production_status || 'aguardando'} onValueChange={(val) => updateProductionStatus(budget.id, val)}>
                                                        <SelectTrigger className="h-9 bg-white/5 border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-black/90 border-white/10 backdrop-blur-xl">
                                                            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                                                <SelectItem key={key} value={key} className="text-[10px] font-black uppercase">
                                                                    <div className="flex items-center gap-2">
                                                                        <config.icon className="h-3 w-3" />
                                                                        {config.label}
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Notes Section */}
                                {budget.production_notes && (
                                    <div className="px-6 py-3 bg-white/[0.01] border-t border-white/5">
                                        <div className="flex items-center gap-2 mb-1">
                                            <MessageSquare className="h-2.5 w-2.5 text-primary/40" />
                                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30">Notas Técnicas do Gestor</span>
                                        </div>
                                        <p className="text-[11px] text-white/60 font-medium italic">"{budget.production_notes}"</p>
                                    </div>
                                )}

                                {/* Progress Bar Visual */}
                                <div className="h-1 w-full bg-white/5 relative overflow-hidden">
                                     {budget.production_status !== 'aguardando' && (
                                         <div 
                                            className={cn("h-full bg-primary transition-all duration-1000", 
                                                budget.production_status === 'corte' ? 'w-1/4' : 
                                                budget.production_status === 'montagem' ? 'w-2/4' :
                                                budget.production_status === 'acabamento' ? 'w-3/4' : 'w-full'
                                            )} 
                                         />
                                     )}
                                </div>
                            </Card>
                        );
                    })}

                    {activeProductionBudgets.length === 0 && (
                        <div className="p-20 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
                            <Hammer className="h-12 w-12 text-white/10 mx-auto mb-4" />
                            <h4 className="text-xl font-black text-white/20 uppercase tracking-tighter">Nenhum móvel na fábrica</h4>
                            <p className="text-xs font-bold text-white/10 uppercase tracking-widest mt-2">Vá na aba 'Definir' e clique em Iniciar Produção.</p>
                        </div>
                    )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

const Package = ({ className }: { className?: string }) => (
    <div className={className}>📦</div>
);

export default FilaProducao;
