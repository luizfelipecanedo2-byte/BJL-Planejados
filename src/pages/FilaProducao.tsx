
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
  GripVertical
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    const { budgets, updateProductionStatus, updateProductionPriority, loading } = useBudgets();
    
    // Filter only approved budgets for production
    const productionBudgets = useMemo(() => {
        return budgets
            .filter(b => b.status === 'aprovado' && b.production_status !== 'entregue')
            .sort((a, b) => (b.production_priority || 0) - (a.production_priority || 0));
    }, [budgets]);

    const stats = useMemo(() => {
        const urgent = productionBudgets.filter(b => b.priority_level === 'urgente').length;
        const inProd = productionBudgets.filter(b => b.production_status !== 'aguardando' && b.production_status !== 'pronto').length;
        const ready = productionBudgets.filter(b => b.production_status === 'pronto').length;
        return { urgent, inProd, ready };
    }, [productionBudgets]);

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

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-amber-500 to-rose-500 text-glow">Fila de Produção</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Orquestração de Fábrica e Marcenaria High-End</p>
                </div>
            </div>

            {/* PRODUCTION HUD */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                                <span className="text-[10px] font-bold text-muted-foreground">Aguardando Expedição</span>
                            </h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                    <ArrowUpCircle className="h-4 w-4 text-primary" />
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Sequência Prioritária de Trabalho</h3>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {productionBudgets.map((budget, index) => {
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
                                                </div>
                                                <h4 className="text-lg font-black tracking-tight text-white uppercase group-hover:text-primary transition-colors">
                                                    {budget.client_name}
                                                </h4>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                    {budget.project_name} 
                                                    {budget.days_estimated && ` • Est. ${budget.days_estimated} dias`}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-3">
                                                <div className="min-w-[140px]">
                                                    <p className="text-[8px] font-black uppercase text-muted-foreground mb-1 ml-1">Prioridade</p>
                                                    <Select value={budget.priority_level || 'normal'} onValueChange={(val) => handleLevelChange(budget.id, val)}>
                                                        <SelectTrigger className="h-9 bg-white/5 border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl">
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

                    {productionBudgets.length === 0 && (
                        <div className="p-20 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
                            <Package className="h-12 w-12 text-white/10 mx-auto mb-4" />
                            <h4 className="text-xl font-black text-white/20 uppercase tracking-tighter">Nenhum projeto em produção</h4>
                            <p className="text-xs font-bold text-white/10 uppercase tracking-widest mt-2">Aprove orçamentos para que eles apareçam aqui.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Package = ({ className }: { className?: string }) => (
    <div className={className}>📦</div>
);

export default FilaProducao;
