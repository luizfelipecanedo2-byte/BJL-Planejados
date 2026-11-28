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
    Sparkles,
    Filter,
    ShieldAlert,
    BarChart3,
    Calendar
} from "lucide-react";
import { ServiceExpense } from "@/types/serviceExpense";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { NextGenKpiCard } from "@/components/ui/NextGenKpiCard";
import {
    ResponsiveContainer,
    ComposedChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";

const formatItemDateBR = (dateStr?: string) => {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        const [y, m, d] = dateStr.substring(0, 10).split("-");
        return `${d}/${m}/${y}`;
    }
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString("pt-BR");
    }
    return dateStr;
};

interface ServiceExpensesTabProps {
    serviceExpenses: ServiceExpense[];
    handleNewServiceExpense: () => void;
    handleEditServiceExpense: (expense: ServiceExpense) => void;
    handleDeleteServiceExpense: (id: string) => Promise<void>;
    formatCurrency: (value: number) => string;
}

const getOSNumber = (name?: string): number => {
    if (!name) return -1;
    const m = name.match(/\bOS[-\s#]*(\d+)/i);
    return m ? parseInt(m[1], 10) : -1;
};

const isOS33OrAbove = (expense: ServiceExpense): boolean => {
    return getOSNumber(expense.clientName) >= 33;
};

const ServiceExpensesTab = ({
    serviceExpenses,
    handleNewServiceExpense,
    handleEditServiceExpense,
    handleDeleteServiceExpense,
    formatCurrency,
}: ServiceExpensesTabProps) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [marginFilter, setMarginFilter] = useState<'all' | 'healthy' | 'warning' | 'danger'>('all');
    const [onlyOS33Plus, setOnlyOS33Plus] = useState<boolean>(true);
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
    const [showChart, setShowChart] = useState<boolean>(true);

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Obras contabilizadas: OS 33 para cima
    const os33PlusExpenses = useMemo(
        () => serviceExpenses.filter(isOS33OrAbove),
        [serviceExpenses]
    );

    // Radar Metrics calculados da OS 33 para cima
    const radarMetrics = useMemo(() => {
        let healthy = 0;
        let warning = 0;
        let danger = 0;
        let totalMaterials = 0;

        os33PlusExpenses.forEach(e => {
            totalMaterials += e.spentValue;
            const isEstoque = e.clientName.includes("ESTOQUE");
            if (!isEstoque && e.serviceValue > 0) {
                const ratio = (e.spentValue / e.serviceValue) * 100;
                if (ratio <= 40) healthy++;
                else if (ratio <= 55) warning++;
                else danger++;
            }
        });

        return { healthy, warning, danger, totalMaterials };
    }, [os33PlusExpenses]);

    const filteredExpenses = useMemo(() => {
        return serviceExpenses.filter(e => {
            if (onlyOS33Plus && !isOS33OrAbove(e)) {
                return false;
            }

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
                if (e.serviceValue <= 0 || e.clientName.includes("ESTOQUE")) return false;
                const ratio = (e.spentValue / e.serviceValue) * 100;
                if (marginFilter === 'healthy' && ratio > 40) return false;
                if (marginFilter === 'warning' && (ratio <= 40 || ratio > 55)) return false;
                if (marginFilter === 'danger' && ratio <= 55) return false;
            }

            return true;
        });
    }, [serviceExpenses, onlyOS33Plus, searchTerm, marginFilter]);

    // Somas principais sempre da OS 33 para cima
    const totalRevenue = useMemo(
        () => os33PlusExpenses.reduce((acc, e) => acc + e.serviceValue, 0),
        [os33PlusExpenses]
    );
    const totalCosts = useMemo(
        () => os33PlusExpenses.reduce((acc, e) => acc + e.spentValue, 0),
        [os33PlusExpenses]
    );
    const totalGrossProfit = totalRevenue - totalCosts;
    const avgMarginPct = totalRevenue > 0 ? ((totalGrossProfit / totalRevenue) * 100).toFixed(1) : "0.0";
    const avgCostPct = totalRevenue > 0 ? ((totalCosts / totalRevenue) * 100).toFixed(1) : "0.0";

    // Dados do Novo Gráfico de Marcenaria: Top Obras (Contrato vs Custo Real de Chapas/Insumos vs Lucro Sobrando)
    const topProjectsChartData = useMemo(() => {
        return filteredExpenses
            .filter(e => !e.clientName.includes("ESTOQUE") && (e.serviceValue > 0 || e.spentValue > 0))
            .slice(0, 10)
            .map(e => {
                const shortName = e.clientName.length > 22 ? e.clientName.slice(0, 22) + "…" : e.clientName;
                const lucro = Math.max(0, e.serviceValue - e.spentValue);
                const costPct = e.serviceValue > 0 ? Math.round((e.spentValue / e.serviceValue) * 100) : 100;
                return {
                    name: shortName,
                    fullName: `${e.clientName} (${e.environment})`,
                    "Contrato (R$)": Number(e.serviceValue.toFixed(2)),
                    "Gasto Chapas/Insumos": Number(e.spentValue.toFixed(2)),
                    "Lucro da Obra": Number(lucro.toFixed(2)),
                    costPct,
                };
            });
    }, [filteredExpenses]);

    return (
        <div className="space-y-6">
            {/* Cabeçalho Padronizado Oficina Madeira Nobre & Ouro */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 executive-card border-metallic wood-ruler-top p-6 rounded-3xl shadow-2xl">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/15 rounded-2xl text-primary border border-primary/30 shadow-lg">
                        <Home className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[9px] font-mono font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                🪚 Bancada de Custos por OS
                            </span>
                            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                                Somando da OS 33 para cima
                            </Badge>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-display font-black tracking-tight text-white uppercase">
                            Custos & Margem Real por Serviço
                        </h3>
                        <p className="text-xs text-muted-foreground font-medium">
                            Acompanhe o valor total das obras, chapas de MDF, ferragens e lucro/margem (a partir da OS-033)
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <Button
                        variant="outline"
                        onClick={() => setShowChart(!showChart)}
                        className="border-amber-500/35 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 font-mono font-bold uppercase text-[10px] tracking-wider rounded-xl h-11 px-4 gap-2"
                    >
                        <BarChart3 className="h-4 w-4 text-amber-400" />
                        {showChart ? "Ocultar Gráfico de Obras" : "Ver Gráfico de Obras"}
                    </Button>
                    <Button 
                        onClick={handleNewServiceExpense} 
                        size="lg" 
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-display font-black uppercase tracking-wider text-xs px-6 h-11 rounded-xl shadow-xl shadow-primary/20 gap-2 transition-transform hover:scale-105"
                    >
                        <Plus className="h-4 w-4" />
                        Novo Registro Manual
                    </Button>
                </div>
            </div>

            {/* Radar Inteligente de Quebra de Margem na Produção & Serviços (OS 33+) */}
            <div className="p-5 sm:p-6 rounded-3xl executive-card border-metallic shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none" />

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
                                Radar Inteligente de Margem da Produção (OS 33+)
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
                            Controle em tempo real de chapas, ferragens e insumos consumidos da OS 33 para cima. O radar avisa assim que o material estoura 40% (Atenção) ou 55% (Risco de Prejuízo) do contrato.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 z-10 self-stretch lg:self-center justify-between lg:justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-800">
                    <div className="text-left lg:text-right">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Custos de Produção (OS 33+)</span>
                        <span className="text-xl font-black text-amber-400 tracking-tight">
                            {formatCurrency(radarMetrics.totalMaterials)}
                        </span>
                    </div>

                    <div className="h-10 w-px bg-slate-800 hidden sm:block" />

                    {/* Botões interativos de filtro rápido do Radar */}
                    <div className="flex flex-wrap items-center gap-2">
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

            {/* 3 KPI Cards: Valor Total das Obras | Custos de Produção Total | Lucro para Ver a Margem (OS 33 para cima) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <NextGenKpiCard
                    title="Valor Total das Obras"
                    value={formatCurrency(totalRevenue)}
                    change={`${os33PlusExpenses.length} Obras (OS 33+)`}
                    isPositive={true}
                    sparklineData={[35, 42, 48, 58, 65, 75, 88]}
                    subtitle="Soma das obras da OS 33 para cima"
                    variant="emerald"
                />

                <NextGenKpiCard
                    title="Custos de Produção Total"
                    value={formatCurrency(totalCosts)}
                    change={`${avgCostPct}% das Obras`}
                    isPositive={Number(avgCostPct) <= 45}
                    sparklineData={[48, 45, 52, 40, 38, 35, 30]}
                    subtitle="Insumos, materiais e notas rateadas (OS 33+)"
                    variant="rose"
                />

                <NextGenKpiCard
                    title="Lucro para Ver a Margem"
                    value={formatCurrency(totalGrossProfit)}
                    change={`${avgMarginPct}% de Margem`}
                    isPositive={totalGrossProfit >= 0}
                    sparklineData={[15, 20, 22, 28, 34, 45, 55]}
                    subtitle="Lucro bruto acumulado da OS 33 para cima"
                    variant="emerald"
                />
            </div>

            {/* NOVO GRÁFICO MOVELEIRO: COMPARATIVO DE OBRAS (CONTRATO VS CHAPAS/INSUMOS VS LUCRO) */}
            {showChart && topProjectsChartData.length > 0 && (
                <div className="executive-card border-metallic p-6 rounded-3xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    🪵 Gabarito de Rentabilidade por OS
                                </span>
                                <span className="text-[10px] font-mono text-muted-foreground">
                                    Top {topProjectsChartData.length} Obras Listadas
                                </span>
                            </div>
                            <h4 className="text-base font-display font-black uppercase text-white mt-1">
                                Raio-X das Obras: Valor do Contrato vs. Insumos Consumidos vs. Lucro Sobrando
                            </h4>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono font-bold">
                            <span className="flex items-center gap-1.5 text-amber-400">
                                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Contrato Fechado
                            </span>
                            <span className="flex items-center gap-1.5 text-rose-400">
                                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Gasto Chapas/Insumos
                            </span>
                            <span className="flex items-center gap-1.5 text-emerald-400">
                                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Lucro Bruto Obra
                            </span>
                        </div>
                    </div>

                    <div className="h-[290px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={topProjectsChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(251, 191, 36, 0.08)" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    fontSize={10}
                                    tick={{ fill: "#fef3c7", fontWeight: 700 }}
                                    axisLine={false}
                                    tickLine={false}
                                    interval={0}
                                    angle={-12}
                                    textAnchor="end"
                                />
                                <YAxis
                                    fontSize={10}
                                    tick={{ fill: "#d6c5b3" }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "rgba(32, 19, 10, 0.96)",
                                        border: "1px solid rgba(245, 158, 11, 0.4)",
                                        borderRadius: "14px",
                                        fontSize: 12,
                                    }}
                                    formatter={(val: number, name: string) => [formatCurrency(val), name]}
                                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
                                />
                                <Bar dataKey="Contrato (R$)" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={28} />
                                <Bar dataKey="Gasto Chapas/Insumos" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={28} />
                                <Bar dataKey="Lucro da Obra" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={28} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Barra de Busca e Filtros */}
            <div className="flex flex-col sm:flex-row items-center gap-3 executive-card border-metallic p-3.5 rounded-2xl">
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

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant={onlyOS33Plus ? "default" : "outline"}
                        size="sm"
                        onClick={() => setOnlyOS33Plus(true)}
                        className={cn(
                            "h-8 text-[10px] font-black uppercase tracking-wider rounded-lg gap-1.5",
                            onlyOS33Plus && "bg-emerald-600 hover:bg-emerald-500 text-white"
                        )}
                    >
                        <Filter className="h-3 w-3" />
                        OS 33 para cima ({os33PlusExpenses.length})
                    </Button>
                    <Button
                        type="button"
                        variant={!onlyOS33Plus ? "default" : "outline"}
                        size="sm"
                        onClick={() => setOnlyOS33Plus(false)}
                        className="h-8 text-[10px] font-black uppercase tracking-wider rounded-lg"
                    >
                        Ver Todas ({serviceExpenses.length})
                    </Button>

                    {marginFilter !== 'all' && (
                        <>
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
                        </>
                    )}
                </div>
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
                                <div className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        <div 
                                            className={cn(
                                                "w-2.5 h-20 rounded-full shrink-0 mt-1",
                                                isEstoque ? "bg-amber-500" :
                                                marginStatus === 'danger' ? "bg-rose-500 animate-pulse shadow-lg shadow-rose-500/50" :
                                                marginStatus === 'warning' ? "bg-amber-500" : 
                                                "bg-emerald-500"
                                            )} 
                                        />
                                        <div className="space-y-2 flex-1 min-w-0">
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

                                            {/* Termômetro Visual: Consumo de Insumos */}
                                            {!isEstoque && expense.serviceValue > 0 && (
                                                <div className="pt-1 max-w-md">
                                                    <div className="space-y-1 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.05]">
                                                        <div className="flex items-center justify-between text-[10px]">
                                                            <span className="text-muted-foreground font-semibold">Consumo de Insumos:</span>
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
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Métricas do Projeto */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center border-t xl:border-t-0 xl:border-l border-border/50 pt-3 xl:pt-0 xl:pl-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Valor da Obra</span>
                                            <span className="font-bold text-sm text-emerald-500">{formatCurrency(expense.serviceValue)}</span>
                                        </div>

                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Custo Produção</span>
                                            <span className="font-bold text-sm text-rose-500">{formatCurrency(expense.spentValue)}</span>
                                        </div>

                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Lucro Bruto</span>
                                            <span className={cn("font-black text-sm", grossProfit >= 0 ? "text-primary" : "text-rose-500")}>
                                                {formatCurrency(grossProfit)}
                                            </span>
                                        </div>

                                        <div className="col-span-2 sm:col-span-1 flex items-center justify-between sm:justify-end gap-2">
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

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-rose-500"
                                                    onClick={() => handleDeleteServiceExpense(expense.id)}
                                                    title="Apagar Ordem de Serviço / Registro"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>

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
                                    <div className="border-t border-border/50 bg-muted/10 p-5 space-y-5 animate-in fade-in duration-200">
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
                                                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                                                    <span className="text-[10px] text-muted-foreground">{item.quantity} {item.unit}</span>
                                                                    {formatItemDateBR(item.date) && (
                                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
                                                                            <Calendar className="h-2.5 w-2.5" />
                                                                            {formatItemDateBR(item.date)}
                                                                        </span>
                                                                    )}
                                                                </div>
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
                                                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                                                    <span className="text-[10px] text-muted-foreground">{item.quantity} {item.unit} • {formatCurrency(item.unitValue)}/un</span>
                                                                    {formatItemDateBR(item.date) && (
                                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-semibold">
                                                                            <Calendar className="h-2.5 w-2.5" />
                                                                            {formatItemDateBR(item.date)}
                                                                        </span>
                                                                    )}
                                                                </div>
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
                                                Nenhum insumo ou despesa discriminada para este serviço.
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
