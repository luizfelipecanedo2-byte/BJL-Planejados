import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Home, TrendingUp, DollarSign, ChevronDown, ChevronUp, Search, Layers, FileText, Package } from "lucide-react";
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
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const filteredExpenses = useMemo(() => {
        if (!searchTerm.trim()) return serviceExpenses;
        const term = searchTerm.toLowerCase().trim();
        return serviceExpenses.filter(e => 
            e.clientName.toLowerCase().includes(term) ||
            e.environment.toLowerCase().includes(term) ||
            (e.autoItems && e.autoItems.some(item => item.description.toLowerCase().includes(term))) ||
            (e.items && e.items.some(item => item.description.toLowerCase().includes(term)))
        );
    }, [serviceExpenses, searchTerm]);

    const totalRevenue = useMemo(() => serviceExpenses.reduce((acc, e) => acc + e.serviceValue, 0), [serviceExpenses]);
    const totalCosts = useMemo(() => serviceExpenses.reduce((acc, e) => acc + e.spentValue, 0), [serviceExpenses]);
    const totalGrossProfit = totalRevenue - totalCosts;

    return (
        <div className="space-y-8">
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

            {/* Barra de Busca */}
            <div className="flex items-center gap-3 bg-muted/20 p-3 rounded-xl border border-border/50">
                <Search className="h-4 w-4 text-muted-foreground ml-2" />
                <Input
                    placeholder="Buscar por cliente, OS, ambiente ou descrição de material/rateio..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-none bg-transparent focus-visible:ring-0 text-xs shadow-none"
                />
                {searchTerm && (
                    <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")} className="text-xs h-7">
                        Limpar
                    </Button>
                )}
            </div>

            {/* Lista de Serviços / Projetos */}
            <div className="space-y-4">
                {filteredExpenses.length === 0 ? (
                    <div className="text-center py-14 bg-muted/20 rounded-2xl border-2 border-dashed text-muted-foreground italic text-xs space-y-2">
                        <Package className="h-8 w-8 mx-auto text-muted-foreground/40" />
                        <p>{searchTerm ? "Nenhum projeto encontrado para o filtro pesquisado." : "Nenhum gasto ou rateio por serviço cadastrado."}</p>
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

                        return (
                            <Card 
                                key={expense.id} 
                                className={cn(
                                    "rounded-2xl border bg-card/60 shadow-md transition-all overflow-hidden",
                                    isEstoque ? "border-amber-500/30 bg-amber-500/[0.02]" : "border-border/60 hover:border-primary/40"
                                )}
                            >
                                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div 
                                            className={cn(
                                                "w-2.5 h-12 rounded-full shrink-0 mt-1",
                                                isEstoque ? "bg-amber-500" :
                                                margin >= 30 ? "bg-emerald-500" :
                                                margin >= 15 ? "bg-amber-500" : "bg-rose-500"
                                            )} 
                                        />
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-black text-base uppercase tracking-tight text-foreground truncate">
                                                    {expense.clientName}
                                                </h3>
                                                {isEstoque && (
                                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px] font-bold">
                                                        Almoxarifado
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

                                {/* Seção Expansível com o Detalhamento de Gastos / Rateios */}
                                {isExpanded && (
                                    <div className="border-t border-border/60 bg-muted/10 p-5 space-y-6 animate-in slide-in-from-top-2 duration-200">
                                        {/* Rateios e Despesas Vinculadas */}
                                        {expense.autoItems && expense.autoItems.length > 0 && (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-blue-500" />
                                                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-600">
                                                        Rateios de Notas & Lançamentos Financeiros ({expense.autoItems.length})
                                                    </h4>
                                                </div>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {expense.autoItems.map((item, idx) => (
                                                        <div 
                                                            key={`auto-${idx}`} 
                                                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 gap-2 text-xs"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-foreground/90">{item.description}</span>
                                                            </div>
                                                            <div className="flex items-center gap-4 text-right shrink-0">
                                                                <span className="text-[10px] text-muted-foreground font-mono">Qtd: {item.quantity} {item.unit}</span>
                                                                <span className="font-bold text-rose-500 text-sm">{formatCurrency(item.totalValue)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Insumos Manuais */}
                                        {expense.items && expense.items.length > 0 && (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <Layers className="h-4 w-4 text-purple-500" />
                                                    <h4 className="text-xs font-black uppercase tracking-wider text-purple-600">
                                                        Insumos e Materiais Manuais ({expense.items.length})
                                                    </h4>
                                                </div>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {expense.items.map((item, idx) => (
                                                        <div 
                                                            key={`manual-${idx}`} 
                                                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 gap-2 text-xs"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-foreground">{item.description}</span>
                                                            </div>
                                                            <div className="flex items-center gap-4 text-right shrink-0">
                                                                <span className="text-[10px] text-muted-foreground font-mono">
                                                                    {item.quantity} {item.unit} x {formatCurrency(item.unitValue)}
                                                                </span>
                                                                <span className="font-bold text-purple-600 text-sm">{formatCurrency(item.totalValue)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {totalItemsCount === 0 && (
                                            <div className="text-center py-6 text-muted-foreground italic text-xs">
                                                Nenhum insumo manual ou rateio financeiro vinculado a este serviço até o momento.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Dica de Performance */}
            <div className="p-6 bg-amber-500/5 rounded-2xl border border-amber-500/20 shadow-xl shadow-amber-500/5 flex items-start gap-4">
                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-600 mt-1">
                    <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                    <h4 className="font-black text-amber-700 text-xs uppercase tracking-widest mb-1">Dica de Performance</h4>
                    <p className="text-[11px] text-amber-600/80 font-medium leading-relaxed">
                        Consideramos margens acima de 30% como saudáveis para serviços de marcenaria e design. Ambientes com margens abaixo de 15% devem ser revisados quanto aos custos de material ou tempo de produção.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ServiceExpensesTab;
