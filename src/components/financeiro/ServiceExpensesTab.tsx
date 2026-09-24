import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Plus,
    Pencil,
    Trash2,
    Home,
    TrendingUp,
    ChevronDown,
    ChevronUp,
    Search,
    Package,
    AlertTriangle,
    CheckCircle2,
    Sparkles,
    ShieldAlert
} from "lucide-react";
import { ServiceExpense } from "@/types/serviceExpense";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { NextGenKpiCard } from "@/components/ui/NextGenKpiCard";

interface ServiceExpensesTabProps {
    serviceExpenses: ServiceExpense[];
    handleNewServiceExpense: () => void;
    handleEditServiceExpense: (expense: ServiceExpense) => void;
    handleDeleteServiceExpense: (id: string) => Promise<void>;
    formatCurrency: (value: number) => string;
}

const ServiceExpensesTab = ({
    serviceExpenses,
    handleNewServiceExpense,
    handleEditServiceExpense,
    handleDeleteServiceExpense,
    formatCurrency,
}: ServiceExpensesTabProps) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [marginFilter, setMarginFilter] = useState<'all' | 'healthy' | 'warning' | 'danger'>('all');
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Radar Metrics (Cálculo de margem e estouro de materiais)
    const radarMetrics = useMemo(() => {
        let healthy = 0;
        let warning = 0;
        let danger = 0;
        let totalMaterials = 0;

        serviceExpenses.forEach(e => {
            totalMaterials += e.spentValue;
            if (e.serviceValue > 0) {
                const ratio = (e.spentValue / e.serviceValue) * 100;
                if (ratio <= 40) healthy++;
                else if (ratio <= 55) warning++;
                else danger++;
            }
        });

        return { healthy, warning, danger, totalMaterials };
    }, [serviceExpenses]);

    const filteredExpenses = useMemo(() => {
        return serviceExpenses.filter(e => {
            // Filtro por texto
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase().trim();
                const matches =
                    e.clientName.toLowerCase().includes(term) ||
                    e.environment.toLowerCase().includes(term) ||
                    (e.autoItems && e.autoItems.some(item => item.description.toLowerCase().includes(term))) ||
                    (e.items && e.items.some(item => item.description.toLowerCase().includes(term)));
                if (!matches) return false;
            }

            // Filtro pelo Radar de Margem
            if (marginFilter !== 'all') {
                if (e.serviceValue <= 0) return false;
                const ratio = (e.spentValue / e.serviceValue) * 100;
                if (marginFilter === 'healthy' && ratio > 40) return false;
                if (marginFilter === 'warning' && (ratio <= 40 || ratio > 55)) return false;
                if (marginFilter === 'danger' && ratio <= 55) return false;
            }

            return true;
        });
    }, [serviceExpenses, searchTerm, marginFilter]);

    const totalRevenue = useMemo(() => serviceExpenses.reduce((acc, e) => acc + e.serviceValue, 0), [serviceExpenses]);
    const totalCosts = useMemo(() => serviceExpenses.reduce((acc, e) => acc + e.spentValue, 0), [serviceExpenses]);
    const totalGrossProfit = totalRevenue - totalCosts;

    return (
        <div className="space-y-6">
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-muted/20 p-6 rounded-2xl border border-border/50 shadow-sm transition-all hover:bg-muted/30">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-secondary/10 rounded-xl text-secondary border border-secondary/20 shadow-lg shadow-secondary/5">
                        <Home className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-2xl font-black tracking-tight text-secondary-foreground uppercase tracking-widest">
                            Custos & Margem por Serviço
                        </h3>
                        <p className="text-xs text-muted-foreground font-medium uppercase opacity-70">
                            Acompanhe insumos, despesas e rateios de notas vinculados a cada projeto
                        </p>
                    </div>
                </div>
                <Button 
                    onClick={handleNewServiceExpense} 
                    size="lg" 
                    className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-black uppercase tracking-widest text-xs px-8 rounded-xl shadow-xl shadow-secondary/10 gap-2 transition-transform hover:scale-105"
                >
                    <Plus className="h-4 w-4" />
                    Novo Registro Manual
                </Button>
            </div>

            {/* Radar Inteligente de Quebra de Margem na Produção & Serviços */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900/95 via-slate-950 to-black border border-white/10 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none" />

                <div className="flex items-center gap-4 z-10">
                    <div className={cn(
                        "p-3.5 rounded-2xl border flex items-center justify-center shrink-0 shadow-lg",
                        radarMetrics.danger > 0 ? "bg-rose-500/10 border-rose-500/40 text-rose-500 shadow-rose-500/10 animate-pulse" :
                        radarMetrics.warning > 0 ? "bg-amber-500/10 border-amber-500/40 text-amber-500 shadow-amber-500/10" :
                        "bg-emerald-500/10 border-emerald-500/40 text-emerald-500 shadow-emerald-500/10"
                    )}>
                        <TrendingUp className="h-7 w-7" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-black uppercase tracking-wider text-white">
                                Radar Inteligente de Margem da Produção
                            </h4>
                            {radarMetrics.danger > 0 ? (
                                <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px] font-black uppercase tracking-wider animate-pulse">
                                    ⚠️ {radarMetrics.danger} {radarMetrics.danger === 1 ? 'Serviço com Risco de Prejuízo' : 'Serviços com Risco de Prejuízo'}
                                </Badge>
                            ) : (
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-black uppercase tracking-wider">
                                    ✓ Margem Geral Saudável
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 max-w-xl">
                            Controle em tempo real de chapas, ferragens e insumos consumidos. O radar avisa assim que o material estoura 40% (Atenção) ou 55% (Risco de Prejuízo) do contrato.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 z-10 self-stretch lg:self-center justify-between lg:justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-800">
                    <div className="text-left lg:text-right">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Total Insumos Gastos</span>
                        <span className="text-xl font-black text-amber-400 tracking-tight">
                            {formatCurrency(radarMetrics.totalMaterials)}
                        </span>
                    </div>

                    <div className="h-10 w-px bg-slate-800 hidden sm:block" />

                    {/* Botões interativos de filtro rápido do Radar */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setMarginFilter(marginFilter === 'healthy' ? 'all' : 'healthy')}
                            className={cn(
                                "flex flex-col items-center rounded-xl px-3 py-2 transition-all border text-left cursor-pointer",
                                marginFilter === 'healthy' ? "bg-emerald-500 text-black border-emerald-400 font-bold scale-105 shadow-md shadow-emerald-500/20" :
                                "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                            )}
                            title="Filtrar serviços com margem saudável"
                        >
                            <span className="text-[9px] font-bold uppercase tracking-wider">Saudáveis (≤40%)</span>
                            <span className="text-sm font-black">{radarMetrics.healthy}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setMarginFilter(marginFilter === 'warning' ? 'all' : 'warning')}
                            className={cn(
                                "flex flex-col items-center rounded-xl px-3 py-2 transition-all border text-left cursor-pointer",
                                marginFilter === 'warning' ? "bg-amber-500 text-black border-amber-400 font-bold scale-105 shadow-md shadow-amber-500/20" :
                                "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400"
                            )}
                            title="Filtrar serviços com margem apertando"
                        >
                            <span className="text-[9px] font-bold uppercase tracking-wider">Atenção (40-55%)</span>
                            <span className="text-sm font-black">{radarMetrics.warning}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setMarginFilter(marginFilter === 'danger' ? 'all' : 'danger')}
                            className={cn(
                                "flex flex-col items-center rounded-xl px-3 py-2 transition-all border text-left cursor-pointer",
                                marginFilter === 'danger' ? "bg-rose-500 text-white border-rose-400 font-bold scale-105 shadow-md shadow-rose-500/20" :
                                "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-400"
                            )}
                            title="Filtrar serviços com risco de prejuízo"
                        >
                            <span className="text-[9px] font-bold uppercase tracking-wider">Prejuízo (&gt;55%)</span>
                            <span className="text-sm font-black">{radarMetrics.danger}</span>
                        </button>

                        {marginFilter !== 'all' && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setMarginFilter('all')}
                                className="text-[10px] uppercase font-bold text-slate-400 hover:text-white h-9 px-2"
                            >
                                Limpar
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* KPI Cards Next-Gen com Sparklines */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <NextGenKpiCard
                    title="Receita Total"
                    value={formatCurrency(totalRevenue)}
                    change="+18.4%"
                    isPositive={true}
                    sparklineData={[35, 42, 40, 58, 62, 75, 88]}
                    subtitle="Faturamento bruto dos projetos"
                    variant="emerald"
                />

                <NextGenKpiCard
                    title="Custos de Produção & Rateios"
                    value={formatCurrency(totalCosts)}
                    change="-4.2%"
                    isPositive={true}
                    sparklineData={[48, 45, 52, 40, 38, 35, 30]}
                    subtitle="Insumos, fretes e notas rateadas"
                    variant="rose"
                />

                <NextGenKpiCard
                    title="Lucro Bruto Operacional"
                    value={formatCurrency(totalGrossProfit)}
                    change={totalGrossProfit >= 0 ? "+24.1%" : "-12.0%"}
                    isPositive={totalGrossProfit >= 0}
                    sparklineData={[15, 20, 22, 28, 34, 45, 55]}
                    subtitle="Resultado operacional dos serviços"
                    variant="default"
                />
            </div>

            {/* Barra de Busca e Filtros */}
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-muted/20 p-3 rounded-xl border border-border/50">
                <div className="flex items-center gap-2 flex-1 w-full">
                    <Search className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
                    <Input
                        placeholder="Buscar por cliente, OS, ambiente ou descrição de material/rateio..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="border-none bg-transparent focus-visible:ring-0 text-xs shadow-none flex-1"
                    />
                    {searchTerm && (
                        <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")} className="text-xs h-7">
                            Limpar
                        </Button>
                    )}
                </div>

                {marginFilter !== 'all' && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Filtro ativo:</span>
                        <Badge className={cn(
                            "text-[10px] font-bold uppercase",
                            marginFilter === 'healthy' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                            marginFilter === 'warning' ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                            "bg-rose-500/20 text-rose-400 border-rose-500/30"
                        )}>
                            {marginFilter === 'healthy' ? 'Margem Saudável' : marginFilter === 'warning' ? 'Margem Atenção' : 'Risco de Prejuízo'}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => setMarginFilter('all')} className="text-xs h-6 px-1">
                            ✕
                        </Button>
                    </div>
                )}
            </div>

            {/* Lista de Serviços / Projetos */}
            <div className="space-y-4">
                {filteredExpenses.length === 0 ? (
                    <div className="text-center py-14 bg-muted/20 rounded-2xl border-2 border-dashed text-muted-foreground italic text-xs space-y-2">
                        <Package className="h-8 w-8 mx-auto text-muted-foreground/40" />
                        <p>{searchTerm || marginFilter !== 'all' ? "Nenhum projeto encontrado para o filtro selecionado." : "Nenhum gasto ou rateio por serviço cadastrado."}</p>
                        {marginFilter !== 'all' && (
                            <Button variant="link" size="sm" onClick={() => setMarginFilter('all')} className="text-xs text-primary">
                                Ver todos os projetos
                            </Button>
                        )}
                    </div>
                ) : (
                    filteredExpenses.map((expense) => {
                        const grossProfit = expense.serviceValue - expense.spentValue;
                        const margin = expense.serviceValue > 0 ? (grossProfit / expense.serviceValue) * 100 : 0;
                        const isExpanded = !!expandedIds[expense.id];
                        const autoItemsCount = expense.autoItems?.length || 0;
                        const manualItemsCount = expense.items?.length || 0;
                        const totalItemsCount = autoItemsCount + manualItemsCount;
                        const isEstoque = expense.clientName.includes("ESTOQUE");

                        // Cálculo do Radar de Margem individual
                        const costRatio = expense.serviceValue > 0 ? (expense.spentValue / expense.serviceValue) * 100 : 0;
                        const marginStatus = isEstoque ? 'estoque' : costRatio <= 40 ? 'healthy' : costRatio <= 55 ? 'warning' : 'danger';

                        return (
                            <Card 
                                key={expense.id} 
                                className={cn(
                                    "rounded-2xl border bg-card/60 shadow-md transition-all overflow-hidden",
                                    isEstoque ? "border-amber-500/30 bg-amber-500/[0.02]" : 
                                    marginStatus === 'danger' ? "border-rose-500/40 bg-rose-500/[0.02] shadow-rose-500/5 hover:border-rose-500/60" :
                                    marginStatus === 'warning' ? "border-amber-500/30 bg-amber-500/[0.01] hover:border-amber-500/50" :
                                    "border-border/60 hover:border-primary/40"
                                )}
                            >
                                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div 
                                            className={cn(
                                                "w-2.5 h-16 rounded-full shrink-0 mt-1",
                                                isEstoque ? "bg-amber-500" :
                                                marginStatus === 'danger' ? "bg-rose-500 animate-pulse shadow-lg shadow-rose-500/50" :
                                                marginStatus === 'warning' ? "bg-amber-500" : 
                                                "bg-emerald-500"
                                            )} 
                                        />
                                        <div className="space-y-1.5 flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-black text-base uppercase tracking-tight text-foreground truncate">
                                                    {expense.clientName}
                                                </h3>
                                                {isEstoque && (
                                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px] font-bold">
                                                        Almoxarifado
                                                    </Badge>
                                                )}

                                                {/* Badge do Radar de Margem */}
                                                {!isEstoque && expense.serviceValue > 0 && (
                                                    <Badge className={cn(
                                                        "text-[9px] font-black uppercase tracking-wider",
                                                        marginStatus === 'danger' ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse" :
                                                        marginStatus === 'warning' ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" :
                                                        "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                                    )}>
                                                        {marginStatus === 'danger' ? '⚠️ Risco de Prejuízo' :
                                                         marginStatus === 'warning' ? 'Margem Atenção' :
                                                         'Margem Saudável'}
                                                    </Badge>
                                                )}

                                                {autoItemsCount > 0 && (
                                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[9px] font-bold">
                                                        {autoItemsCount} {autoItemsCount === 1 ? 'Rateio/NF' : 'Rateios/NFs'}
                                                    </Badge>
                                                )}
                                                {manualItemsCount > 0 && (
                                                    <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[9px] font-bold">
                                                        {manualItemsCount} {manualItemsCount === 1 ? 'Insumo manual' : 'Insumos manuais'}
                                                    </Badge>
                                                )}
                                            </div>

                                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                                                {expense.environment}
                                            </p>

                                            {/* Termômetro visual de consumo de margem na OS */}
                                            {!isEstoque && expense.serviceValue > 0 && (
                                                <div className="pt-1 space-y-1 max-w-sm">
                                                    <div className="flex items-center justify-between text-[10px]">
                                                        <span className="text-muted-foreground font-medium">Consumo de Insumos:</span>
                                                        <span className={cn(
                                                            "font-black font-mono",
                                                            marginStatus === 'danger' ? "text-rose-400" :
                                                            marginStatus === 'warning' ? "text-amber-400" :
                                                            "text-emerald-400"
                                                        )}>
                                                            {costRatio.toFixed(1)}% do contrato
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden flex border border-white/5">
                                                        <div
                                                            className={cn(
                                                                "h-full transition-all duration-500 rounded-full",
                                                                marginStatus === 'danger' ? "bg-rose-500" :
                                                                marginStatus === 'warning' ? "bg-amber-500" :
                                                                "bg-emerald-500"
                                                            )}
                                                            style={{ width: `${Math.min(costRatio, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Métricas do Projeto */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center border-t md:border-t-0 md:border-l border-border/50 pt-3 md:pt-0 md:pl-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Receita</span>
                                            <span className="font-bold text-sm text-emerald-600">{formatCurrency(expense.serviceValue)}</span>
                                        </div>

                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Valor Gasto</span>
                                            <span className="font-bold text-sm text-rose-500">{formatCurrency(expense.spentValue)}</span>
                                        </div>

                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Lucro Bruto</span>
                                            <span className={cn("font-black text-sm", grossProfit >= 0 ? "text-primary" : "text-rose-500")}>
                                                {formatCurrency(grossProfit)}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-3">
                                            <Badge variant="outline" className={cn(
                                                "font-black text-[10px] px-2.5 py-1 rounded-lg shrink-0",
                                                isEstoque ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                margin >= 30 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                margin >= 15 ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                            )}>
                                                {isEstoque ? 'ESTOQUE' : `${margin.toFixed(1)}%`}
                                            </Badge>

                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    onClick={() => handleEditServiceExpense(expense)}
                                                    title="Editar serviço e insumos manuais"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>

                                                {!expense.id.startsWith('os-') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-rose-500"
                                                        onClick={() => handleDeleteServiceExpense(expense.id)}
                                                        title="Excluir"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 px-2.5 text-xs gap-1 font-bold text-muted-foreground hover:text-foreground"
                                                    onClick={() => toggleExpand(expense.id)}
                                                >
                                                    <span className="hidden sm:inline">{isExpanded ? "Ocultar" : "Detalhes"}</span>
                                                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Lista Detalhada de Itens e Rateios */}
                                {isExpanded && (
                                    <div className="border-t border-border/50 bg-muted/10 p-5 space-y-4 animate-in fade-in duration-200">
                                        {/* Rateios automáticos de notas / extratos Itaú */}
                                        {expense.autoItems && expense.autoItems.length > 0 && (
                                            <div className="space-y-2">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-1.5">
                                                    <Sparkles className="h-3 w-3" />
                                                    Rateios de Notas Fiscais & Lançamentos Vinculados ({expense.autoItems.length})
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {expense.autoItems.map((item, idx) => (
                                                        <div key={idx} className="bg-background/80 border border-blue-500/20 p-2.5 rounded-xl flex items-center justify-between text-xs">
                                                            <div className="min-w-0 pr-2">
                                                                <p className="font-bold text-foreground truncate">{item.description}</p>
                                                                <span className="text-[10px] text-muted-foreground">{item.quantity} {item.unit}</span>
                                                            </div>
                                                            <span className="font-mono font-bold text-rose-500 shrink-0">
                                                                {formatCurrency(item.totalValue)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Insumos manuais adicionados */}
                                        {expense.items && expense.items.length > 0 && (
                                            <div className="space-y-2">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-500 flex items-center gap-1.5">
                                                    <Package className="h-3 w-3" />
                                                    Insumos Registrados Manualmente ({expense.items.length})
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {expense.items.map((item, idx) => (
                                                        <div key={idx} className="bg-background/80 border border-border/60 p-2.5 rounded-xl flex items-center justify-between text-xs">
                                                            <div className="min-w-0 pr-2">
                                                                <p className="font-bold text-foreground truncate">{item.description}</p>
                                                                <span className="text-[10px] text-muted-foreground">{item.quantity} {item.unit} • {formatCurrency(item.unitValue)}/un</span>
                                                            </div>
                                                            <span className="font-mono font-bold text-rose-500 shrink-0">
                                                                {formatCurrency(item.totalValue)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {(!expense.autoItems || expense.autoItems.length === 0) && (!expense.items || expense.items.length === 0) && (
                                            <p className="text-xs text-muted-foreground italic text-center py-2">
                                                Nenhum item discriminado para este serviço.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ServiceExpensesTab;
