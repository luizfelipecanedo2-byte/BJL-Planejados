import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Users, Calendar, AlertTriangle, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    ComposedChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DashboardTabProps {
    selectedYear: string;
    setSelectedYear: (year: string) => void;
    selectedDashMonth: number | 'anual';
    setSelectedDashMonth: (month: number | 'anual') => void;
    currentSummary: {
        entradaMes: number;
        saidaMes: number;
        saldoMes: number;
        saldoAtual: number;
        receitaBrutaMes: number;
        gastosMes: number;
        resultadoMes: number;
        accountsPayable: number;
        accountsReceivable: number;
        projectedBalance: number;
        inadimplenciaTotal: number;
        ticketMedio: number;
        expensesByCategory: { name: string; value: number }[];
    };
    previousSummary?: {
        receitaBrutaMes: number;
        gastosMes: number;
    };
    topClients?: { name: string; value: number }[];
    overdueTransactions?: any[];
    upcomingTransactions: any[];
    chartData: any[];
    dashboardChartData: any[];
    accumulatedData: any[];
    formatCurrency: (value: number) => string;
    handleEditTransaction: (t: any) => void;
}

const DashboardTab = ({
    selectedYear,
    setSelectedYear,
    selectedDashMonth,
    setSelectedDashMonth,
    currentSummary,
    previousSummary,
    topClients = [],
    overdueTransactions = [],
    upcomingTransactions,
    chartData,
    dashboardChartData,
    accumulatedData,
    formatCurrency,
    handleEditTransaction,
}: DashboardTabProps) => {

    // Calcula crescimento % 
    const calcGrowth = (current: number, previous: number) => {
        if (!previous || previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    const RevenueGrowth = previousSummary ? calcGrowth(currentSummary.receitaBrutaMes, previousSummary.receitaBrutaMes) : 0;
    const ExpenseGrowth = previousSummary ? calcGrowth(currentSummary.gastosMes, previousSummary.gastosMes) : 0;

    const profitMargin = currentSummary.receitaBrutaMes > 0
        ? ((currentSummary.receitaBrutaMes - currentSummary.gastosMes) / currentSummary.receitaBrutaMes * 100).toFixed(1)
        : 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-6 bg-gradient-to-br from-muted/30 to-background p-6 rounded-2xl border border-border/40 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h3 className="text-3xl font-black tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Visão Geral</h3>
                        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-70">Inteligência Financeira</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="w-[140px] bg-background/50 backdrop-blur-sm border-primary/20 hover:border-primary/50 transition-all font-bold">
                                <SelectValue placeholder="Ano" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2024">2024</SelectItem>
                                <SelectItem value="2025">2025</SelectItem>
                                <SelectItem value="2026">2026</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Tabs
                    value={String(selectedDashMonth)}
                    onValueChange={(v) => setSelectedDashMonth(v === 'anual' ? 'anual' : parseInt(v))}
                    className="w-full"
                >
                    <TabsList className="w-full justify-start overflow-x-auto h-12 bg-muted/20 p-1.5 backdrop-blur-md rounded-xl border border-border/30">
                        <TabsTrigger value="anual" className="flex-1 sm:flex-none min-w-[80px] rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all font-black text-xs uppercase tracking-widest mr-2 border border-primary/20 bg-primary/5 text-primary">Anual</TabsTrigger>
                        {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map((month, index) => (
                            <TabsTrigger
                                key={month}
                                value={String(index)}
                                className="flex-1 sm:flex-none min-w-[70px] rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all font-semibold text-xs"
                            >
                                {month}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>

            {/* OVERDUE ALERTS (Inadimplência Real e Contas Atrasadas) */}
            {overdueTransactions.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-500/20 p-2 rounded-full animate-pulse">
                            <AlertTriangle className="h-6 w-6 text-red-500" />
                        </div>
                        <div>
                            <h4 className="text-red-500 font-bold uppercase tracking-widest text-sm">Atenção: Existem Lançamentos Atrasados!</h4>
                            <p className="text-red-500/70 text-xs font-medium mt-0.5">Visite a aba "Lançamentos" e filtre por status pendente e data do pagamento no passado.</p>
                        </div>
                    </div>
                    <div className="bg-red-500 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                        {overdueTransactions.length} Pendências
                    </div>
                </div>
            )}

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {/* Main KPI Card: Projected Finish */}
                <Card className="col-span-1 md:col-span-2 lg:col-span-2 overflow-hidden border-none bg-gradient-to-br from-emerald-600/95 to-emerald-900 shadow-2xl relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-500">
                        <DollarSign className="h-32 w-32 text-white" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-white/80 text-sm font-bold uppercase tracking-widest">
                            Resultado Projetado Final do {selectedDashMonth === 'anual' ? 'Ano' : 'Mês'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-1">
                            <span className="text-5xl font-black text-white tracking-tighter">
                                {formatCurrency(currentSummary.projectedBalance)}
                            </span>

                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-tighter backdrop-blur-md border border-white/10">
                                    Fluxo de Caixa Final
                                </span>
                                <span className="px-3 py-1 rounded-full bg-emerald-500/80 text-white text-[10px] font-black uppercase tracking-tighter backdrop-blur-md border border-white/10 flex items-center gap-1">
                                    LUCRO: {profitMargin}%
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Secondary KPIs */}
                <Card className="bg-card/40 border-l-4 border-l-orange-500 shadow-xl backdrop-blur-md transition-all hover:scale-[1.02] border group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest group-hover:text-orange-500 transition-colors">Inadimplência</CardTitle>
                            <p className="text-2xl font-black text-orange-500 group-hover:scale-110 transition-transform origin-left">{formatCurrency(currentSummary.inadimplenciaTotal)}</p>
                        </div>
                        <Users className="h-5 w-5 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-[9px] text-orange-500/70 mb-2 font-bold uppercase tracking-widest bg-orange-500/10 w-fit px-2 py-0.5 rounded border border-orange-500/20">Atrasos Críticos</div>
                        <p className="text-[10px] text-muted-foreground leading-tight italic">Total histórico que deveria ter sido recebido até hoje</p>
                    </CardContent>
                </Card>
            </div>

            {/* Bento Grid Analytics Section */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-6 lg:grid-cols-12">
                {/* Income Detail (Vertical Card) */}
                <Card className="md:col-span-3 lg:col-span-3 bg-card/40 border-l-4 border-l-primary shadow-xl backdrop-blur-md border hover:border-primary/40 transition-all">
                    <CardHeader className="pb-2 relative">
                        <span className="text-[10px] font-black text-secondary-foreground/60 uppercase tracking-[0.2em] mb-1">Data do Pagamento</span>
                        <CardTitle className="text-xl font-black text-primary uppercase tracking-tight">Faturamento</CardTitle>
                        <div className="text-3xl font-black tracking-tighter text-primary/80 mt-1">{formatCurrency(currentSummary.receitaBrutaMes)}</div>

                        {/* Indicador Crescimento */}
                        {previousSummary && (
                            <div className={cn(
                                "absolute top-4 right-4 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border flex items-center gap-1",
                                RevenueGrowth >= 0 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                            )}>
                                {RevenueGrowth >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                {Math.abs(RevenueGrowth).toFixed(1)}% vs anterior
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center group/item hover:bg-primary/5 p-2 rounded-lg transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Já Recebido</span>
                                    <span className="text-lg font-black text-emerald-500">{formatCurrency(currentSummary.entradaMes)}</span>
                                </div>
                                <TrendingUp className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div className="flex justify-between items-center group/item hover:bg-primary/5 p-2 rounded-lg transition-colors border-t border-primary/5 pt-4">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">A Receber</span>
                                    <span className="text-lg font-black text-primary">{formatCurrency(currentSummary.accountsReceivable)}</span>
                                </div>
                                <Calendar className="h-5 w-5 text-primary" />
                            </div>
                        </div>
                        <div className="pt-4 border-t border-primary/10 bg-primary/5 -mx-4 px-4 pb-2">
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black text-primary/70 uppercase tracking-widest">Ticket Médio</span>
                                <span className="text-sm font-black text-primary">{formatCurrency(currentSummary.ticketMedio)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Expenses Detail (Vertical Card) */}
                <Card className="md:col-span-3 lg:col-span-3 bg-card/40 border-l-4 border-l-rose-500 shadow-xl backdrop-blur-md border hover:border-rose-500/40 transition-all">
                    <CardHeader className="pb-2 relative">
                        <span className="text-[10px] font-black text-secondary-foreground/60 uppercase tracking-[0.2em] mb-1">Data do Pagamento</span>
                        <CardTitle className="text-xl font-black text-rose-500 uppercase tracking-tight">Custos Totais</CardTitle>
                        <div className="text-3xl font-black tracking-tighter text-rose-500/80 mt-1">{formatCurrency(currentSummary.gastosMes)}</div>

                        {/* Indicador Crescimento/Queda de despesas */}
                        {previousSummary && (
                            <div className={cn(
                                "absolute top-4 right-4 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border flex items-center gap-1",
                                ExpenseGrowth <= 0 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                            )}>
                                {ExpenseGrowth <= 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                                {Math.abs(ExpenseGrowth).toFixed(1)}% vs anterior
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center group/item hover:bg-rose-500/5 p-2 rounded-lg transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Já Pago</span>
                                    <span className="text-lg font-black text-rose-400">{formatCurrency(currentSummary.saidaMes)}</span>
                                </div>
                                <TrendingDown className="h-5 w-5 text-rose-400" />
                            </div>
                            <div className="flex justify-between items-center group/item hover:bg-rose-500/5 p-2 rounded-lg transition-colors border-t border-rose-500/5 pt-4">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">A Pagar</span>
                                    <span className="text-lg font-black text-rose-600 font-black">{formatCurrency(currentSummary.accountsPayable)}</span>
                                </div>
                                <TrendingDown className="h-5 w-5 text-rose-600" />
                            </div>
                        </div>
                        <div className="pt-4 border-t border-rose-500/10 bg-rose-500/5 -mx-4 px-4 pb-2">
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black text-rose-500/70 uppercase tracking-widest">Margem Resultante</span>
                                <span className="text-sm font-black text-rose-500">
                                    {currentSummary.receitaBrutaMes > 0 ? ((currentSummary.receitaBrutaMes - currentSummary.gastosMes) / currentSummary.receitaBrutaMes * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Expenses Chart (Large Card) */}
                <Card className="md:col-span-6 lg:col-span-6 shadow-xl bg-card/40 backdrop-blur-md border border-border/40 overflow-hidden relative group">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/20 border-b border-border/50">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-6 bg-rose-500 rounded-full" />
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Distribuição de Gastos</CardTitle>
                        </div>
                        <TrendingDown className="h-4 w-4 text-rose-500 group-hover:animate-bounce" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="h-[320px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={currentSummary.expensesByCategory}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={120}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {currentSummary.expensesByCategory.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={[
                                                '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899'
                                            ][index % 7]} className="stroke-background hover:opacity-80 transition-opacity" strokeWidth={2} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number) => formatCurrency(value)}
                                        contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '12px' }}
                                        itemStyle={{ color: 'white' }}
                                        labelStyle={{ color: 'white' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* CURVA ABC E RADAR DE AÇÕES */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-2">

                {/* Ranking de Melhores Clientes (Curva ABC) */}
                <Card className="shadow-2xl border-border/40 bg-card/40 backdrop-blur-md overflow-hidden border">
                    <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                        <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-primary">
                            <div className="w-1.5 h-6 bg-primary rounded-full" />
                            <Trophy className="h-5 w-5" />
                            Top Clientes (Curva ABC)
                        </CardTitle>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1 ml-[34px]">Os {topClients.length} Maiores Geradores de Faturamento no Período</p>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {topClients.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground text-sm font-medium">Nenhum dado de receita no período selecionado.</div>
                        ) : (
                            <div className="space-y-4">
                                {topClients.map((client, index) => {
                                    const percentage = currentSummary.receitaBrutaMes > 0 ? (client.value / currentSummary.receitaBrutaMes) * 100 : 0;
                                    return (
                                        <div key={index} className="flex items-center justify-between group p-3 hover:bg-primary/5 rounded-xl border border-transparent hover:border-primary/10 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0",
                                                    index === 0 ? "bg-yellow-500 text-yellow-950 shadow-[0_0_15px_rgba(234,179,8,0.4)]" :
                                                        index === 1 ? "bg-slate-300 text-slate-800" :
                                                            index === 2 ? "bg-amber-700 text-orange-100" : "bg-muted text-muted-foreground"
                                                )}>
                                                    {index + 1}º
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-foreground capitalize">{client.name || 'Cliente Não Informado'}</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary" style={{ width: `${percentage}%` }} />
                                                        </div>
                                                        <span className="text-[10px] font-black text-muted-foreground">{percentage.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="font-black text-base text-primary tracking-tighter">{formatCurrency(client.value)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Cash Schedule (Agenda de Caixa) Moved next to ABC Curve */}
                <div className="flex flex-col">
                    <div className="flex items-center gap-3 mb-4 bg-primary/5 w-fit px-4 py-2 rounded-xl border border-primary/10">
                        <Calendar className="h-5 w-5 text-primary" />
                        <h3 className="text-xl font-black text-primary tracking-tight uppercase tracking-widest">Radar Financeiro <span className="text-[10px] font-normal text-muted-foreground ml-2">(Próximos 7 Dias)</span></h3>
                    </div>
                    {upcomingTransactions.length === 0 ? (
                        <Card className="bg-card/40 border-dashed border-2 border-primary/20 backdrop-blur-md rounded-2xl overflow-hidden h-full flex items-center justify-center">
                            <CardContent className="py-12 text-center group cursor-default">
                                <div className="mb-4 flex justify-center">
                                    <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-500 group-hover:scale-110 transition-transform duration-500 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                                        <DollarSign className="h-10 w-10" />
                                    </div>
                                </div>
                                <p className="text-lg font-black text-muted-foreground tracking-tight">Tudo em conformidade!</p>
                                <p className="text-xs text-muted-foreground font-medium uppercase mt-1 opacity-60">Nenhum compromisso pendente para a semana.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                            {upcomingTransactions.slice(0, 4).map((t) => (
                                <Card
                                    key={t.id}
                                    className={cn(
                                        "bg-card/40 backdrop-blur-md border shadow-lg transition-all hover:scale-[1.02] cursor-pointer hover:shadow-2xl hover:border-primary/40 relative overflow-hidden group",
                                        t.type === 'income' ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-rose-500"
                                    )}
                                    onClick={() => handleEditTransaction(t)}
                                >
                                    <div className={cn(
                                        "absolute top-0 right-0 w-16 h-16 opacity-[0.03] -mr-4 -mt-4 transition-transform group-hover:scale-150 duration-500",
                                        t.type === 'income' ? "text-emerald-500" : "text-rose-500"
                                    )}>
                                        {t.type === 'income' ? <TrendingUp size={64} /> : <TrendingDown size={64} />}
                                    </div>
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md">
                                                {new Date(t.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-xs truncate mb-1 text-foreground/90 uppercase tracking-tight" title={t.description}>{t.description}</h4>
                                        <div className="flex justify-between items-end mt-2">
                                            <span className="text-xs text-muted-foreground font-medium truncate max-w-[100px]">{t.contact}</span>
                                            <span className="text-lg font-black text-foreground tracking-tighter">{formatCurrency(t.amount)}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Charts Area */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-8">
                <Card className="shadow-2xl border-border/40 bg-card/20 backdrop-blur-sm overflow-hidden border">
                    <CardHeader className="bg-muted/30 border-b border-border/40">
                        <CardTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-widest text-primary">
                            <div className="w-1 h-6 bg-primary rounded-full" />
                            Balanço Anual Histórico
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-8">
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted opacity-30" vertical={false} />
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} fontWeight="bold" dy={10} />
                                    <YAxis
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        fontWeight="bold"
                                        tickFormatter={(value) => `R$${value >= 1000 ? (value / 1000) + 'k' : value}`}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => formatCurrency(value)}
                                        contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)', backgroundColor: '#020617' }}
                                        itemStyle={{ color: 'white' }}
                                        labelStyle={{ color: 'white' }}
                                    />
                                    <Legend verticalAlign="top" height={40} iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
                                    <Bar dataKey="Receitas" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={25} />
                                    <Bar dataKey="Despesas" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={25} />
                                    <Line type="monotone" dataKey="Saldo" stroke="#34d399" strokeWidth={4} dot={{ r: 5, fill: "#34d399", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 8, stroke: "#fff", strokeWidth: 3 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-2xl border-border/40 bg-card/20 backdrop-blur-sm overflow-hidden border">
                    <CardHeader className="bg-muted/30 border-b border-border/40">
                        <CardTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-widest text-orange-500">
                            <div className="w-1 h-6 bg-orange-500 rounded-full" />
                            Previsão Provedora de Caixa
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-8">
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={dashboardChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted opacity-30" vertical={false} />
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} fontWeight="bold" dy={10} />
                                    <YAxis
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        fontWeight="bold"
                                        tickFormatter={(value) => `R$${value >= 1000 ? (value / 1000) + 'k' : value}`}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => formatCurrency(value)}
                                        contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)', backgroundColor: '#020617' }}
                                        itemStyle={{ color: 'white' }}
                                        labelStyle={{ color: 'white' }}
                                    />
                                    <Legend verticalAlign="top" height={40} iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
                                    <Bar dataKey="A Receber" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={25} />
                                    <Bar dataKey="A Pagar" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={25} />
                                    <Line type="monotone" dataKey="Saldo" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2 shadow-2xl border-border/40 bg-card/20 backdrop-blur-sm overflow-hidden border mt-2">
                    <CardHeader className="bg-muted/30 border-b border-border/40">
                        <CardTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-widest text-blue-500 text-center mx-auto">
                            <div className="w-6 h-1 bg-blue-500 rounded-full" />
                            Acumulado Evolutivo Financeiro
                            <div className="w-6 h-1 bg-blue-500 rounded-full" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-8 px-0">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={accumulatedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} fontWeight="bold" />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        fontWeight="bold"
                                        tickFormatter={(value) => `R$${value >= 1000 ? (value / 1000) + 'k' : value}`}
                                    />
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted opacity-20" vertical={false} />
                                    <Tooltip
                                        formatter={(value: number) => formatCurrency(value)}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#020617' }}
                                        itemStyle={{ color: 'white' }}
                                        labelStyle={{ color: 'white' }}
                                    />
                                    <Area type="monotone" dataKey="Acumulado" stroke="#3b82f6" strokeWidth={5} fillOpacity={1} fill="url(#colorAcumulado)" activeDot={{ r: 8, strokeWidth: 3, stroke: '#fff' }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DashboardTab;
