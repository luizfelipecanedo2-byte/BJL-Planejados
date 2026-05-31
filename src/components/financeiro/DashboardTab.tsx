import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Calendar, Rocket, Users } from "lucide-react";
import {
    ComposedChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    BarChart,
    LabelList
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatedCounter } from "@/components/ui/animated-counter";

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
        entradaHoje: number;
        saidaHoje: number;
        inadimplenciaTotal: number;
        ticketMedio: number;
        expensesByCategory: { name: string; value: number }[];
    };
    previousSummary?: {
        receitaBrutaMes: number;
        gastosMes: number;
        resultadoMes: number;
        entradaMes: number;
        saidaMes: number;
        saldoMes: number;
        ticketMedio: number;
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
    topClients,
    chartData,
    accumulatedData,
    formatCurrency,
    upcomingTransactions = [],
    handleEditTransaction,
}: DashboardTabProps) => {

    // Helper to calculate percentage growth
    const calculateGrowth = (current: number, previous: number) => {
        if (!previous || previous === 0) return null;
        const growth = ((current - previous) / previous) * 100;
        return growth;
    };

    const GrowthIndicator = ({ value }: { value: number | null }) => {
        if (value === null) return null;
        const isPositive = value >= 0;
        return (
            <span className={`text-[10px] font-black ml-2 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                {isPositive ? '↑' : '↓'} {Math.abs(value).toFixed(1)}%
            </span>
        );
    };

    // Preparation for "Evolução Caixa Inicial" (Horizontal Bars)
    const initialCashData = chartData.map(d => ({
        name: d.name,
        value: d.Saldo // Simplification for demo
    }));

    const COLORS = ['#14b8a6', '#f97316', '#06b6d4', '#8b5cf6', '#ec4899', '#eab308'];

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const cards = document.getElementsByClassName("spotlight-card");
        for (const card of cards) {
            const rect = (card as HTMLElement).getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            (card as HTMLElement).style.setProperty("--mouse-x", `${x}px`);
            (card as HTMLElement).style.setProperty("--mouse-y", `${y}px`);
        }
    };

    return (
        <div className="space-y-6 text-foreground bg-[#0a0a0a] p-2 rounded-3xl min-h-screen" onMouseMove={handleMouseMove}>
            {/* TOP HEADER SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mb-2">
                <div className="md:col-span-3 flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-xl">
                        <Rocket className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tighter uppercase text-white">ORGANIZADA</h1>
                        <div className="flex items-center gap-2">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Venda Empresa</p>
                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                                <SelectTrigger className="w-[70px] h-5 text-[9px] bg-white/5 border-white/10 uppercase font-black py-0 px-2 rounded-lg">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#111111] border-white/10">
                                    <SelectItem value="2024">2024</SelectItem>
                                    <SelectItem value="2025">2025</SelectItem>
                                    <SelectItem value="2026">2026</SelectItem>
                                    <SelectItem value="2027">2027</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-9 grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <Card className="glass-card border border-white/5 p-3 h-16 flex flex-col justify-center spotlight-card border-beam-card tilt-card luxury-shadow rounded-2xl">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase">A receber</span>
                        <span className="text-lg font-black text-white">
                            <AnimatedCounter value={currentSummary.accountsReceivable} formatter={formatCurrency} />
                        </span>
                    </Card>
                    <Card className="glass-card border border-white/5 p-3 h-16 flex flex-col justify-center border-t-2 border-primary spotlight-card border-beam-card tilt-card luxury-shadow rounded-2xl">
                        <span className="text-[10px] font-bold text-primary uppercase">Hoje (Entra/Sai)</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-sm font-black text-emerald-500">+{formatCurrency(currentSummary.entradaHoje).replace('R$', '')}</span>
                            <span className="text-sm font-black text-rose-500">-{formatCurrency(currentSummary.saidaHoje).replace('R$', '')}</span>
                        </div>
                    </Card>
                    <Card className="bg-rose-500/10 border border-rose-500/20 p-3 h-16 flex flex-col justify-center border-t-2 border-rose-500 spotlight-card border-beam-card tilt-card luxury-shadow rounded-2xl">
                        <span className="text-[10px] font-bold text-rose-500 uppercase">A pagar</span>
                        <span className="text-lg font-black text-white">{formatCurrency(currentSummary.accountsPayable)}</span>
                    </Card>
                    <Card className="bg-orange-500/10 border border-orange-500/20 p-3 h-16 flex flex-col justify-center border-t-2 border-orange-500 spotlight-card border-beam-card tilt-card luxury-shadow rounded-2xl">
                        <span className="text-[10px] font-bold text-orange-500 uppercase">Vencidos</span>
                        <span className="text-lg font-black text-white">
                            <AnimatedCounter value={currentSummary.inadimplenciaTotal} formatter={formatCurrency} />
                        </span>
                    </Card>
                    <Card className="bg-emerald-500/10 border border-emerald-500/20 p-3 h-16 flex flex-col justify-center border-t-2 border-emerald-500 spotlight-card border-beam-card tilt-card luxury-shadow rounded-2xl">
                        <span className="text-[10px] font-bold text-emerald-500 uppercase">Saldo Projetado</span>
                        <span className="text-lg font-black text-white">
                            <AnimatedCounter value={currentSummary.projectedBalance} formatter={formatCurrency} />
                        </span>
                    </Card>
                </div>
            </div>

            {/* MAIN ROW: Analysis of Month, Evolution, and Initial Cash */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                {/* 1. ANÁLISE DO MÊS */}
                <Card className="lg:col-span-3 bg-[#111111] border-none p-4 rounded-2xl relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-black uppercase text-white border-l-2 border-primary pl-2 tracking-widest">
                            {selectedDashMonth === 'anual' ? 'Análise do Ano' : 'Análise do Mês'}
                        </h3>
                        <Select value={String(selectedDashMonth)} onValueChange={(v) => setSelectedDashMonth(v === 'anual' ? 'anual' : parseInt(v))}>
                            <SelectTrigger className="w-[80px] h-7 text-[10px] bg-black/40 border-white/10 uppercase font-black">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#111111] border-white/10">
                                <SelectItem value="anual">ANUAL</SelectItem>
                                {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map((m, i) => (
                                    <SelectItem key={m} value={String(i)}>{m.toUpperCase()}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="h-40 w-full relative mb-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Used', value: currentSummary.saidaMes },
                                            { name: 'Remaining', value: Math.max(0, currentSummary.receitaBrutaMes - currentSummary.saidaMes) }
                                        ]}
                                        cx="50%" cy="50%"
                                        innerRadius={55} outerRadius={70}
                                        startAngle={180} endAngle={0}
                                        dataKey="value"
                                    >
                                        <Cell fill="#14b8a6" />
                                        <Cell fill="#333" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-x-0 bottom-4 flex flex-col items-center">
                                <span className="text-2xl font-black text-white tracking-tighter">
                                    <AnimatedCounter value={currentSummary.saldoMes} formatter={formatCurrency} />
                                </span>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    {selectedDashMonth === 'anual' ? 'Saldo do ano' : 'Saldo do mês'}
                                </span>
                            </div>
                        </div>

                        <div className="w-full space-y-3">
                            <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase flex justify-between">
                                    Planejado/Receber <span>{formatCurrency(currentSummary.receitaBrutaMes)}</span>
                                </p>
                                <div className="mt-2 text-primary font-black text-xl leading-none">23% <span className="text-[10px] text-muted-foreground font-medium ml-2">Recebido: {formatCurrency(currentSummary.entradaMes)}</span></div>
                            </div>
                            <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase flex justify-between">
                                    Planejado/Gastar <span>{formatCurrency(currentSummary.gastosMes)}</span>
                                </p>
                                <div className="mt-2 text-orange-500 font-black text-xl leading-none">9% <span className="text-[10px] text-muted-foreground font-medium ml-2">Gasto: {formatCurrency(currentSummary.saidaMes)}</span></div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* 2. ANÁLISE EVOLUTIVA */}
                <Card className="lg:col-span-6 bg-[#111111] border-none p-4 rounded-2xl overflow-hidden spotlight-card border-beam-card luxury-shadow">
                    <h3 className="text-xs font-black uppercase text-white border-l-2 border-primary pl-2 tracking-widest mb-4">Análise Evolutiva</h3>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0}/>
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#555' }} />
                                <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#555' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                    formatter={(val: number) => formatCurrency(val)}
                                />
                                <Area type="monotone" dataKey="Receitas" stroke="#14b8a6" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                                <Area type="monotone" dataKey="Despesas" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex gap-4 mt-2 justify-center">
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-primary rounded-full" /> <span className="text-[10px] font-black uppercase text-muted-foreground">Receitas</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-orange-500 rounded-full" /> <span className="text-[10px] font-black uppercase text-muted-foreground">Despesas</span></div>
                    </div>
                </Card>

                {/* 3. EVOLUÇÃO CAIXA INICIAL (Horizontal Bar Chart) */}
                <Card className="lg:col-span-3 bg-[#111111] border-none p-4 rounded-2xl overflow-hidden">
                    <h3 className="text-xs font-black uppercase text-white border-l-2 border-primary pl-2 tracking-widest mb-4">Evolução Caixa Inicial</h3>
                    <div className="h-[320px] w-full overflow-y-auto pr-2">
                        {initialCashData.slice(0, 12).reverse().map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 mb-3 last:mb-0 group">
                                <span className="text-[10px] font-black w-8 text-muted-foreground group-hover:text-primary transition-colors">{item.name}</span>
                                <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-orange-500 rounded-full"
                                        style={{ width: `${Math.min(100, (Math.abs(item.value) / 10000) * 100)}%` }}
                                    />
                                </div>
                                <span className="text-[10px] font-black text-white w-16 text-right font-mono">{formatCurrency(item.value)}</span>
                            </div>
                        ))}
                    </div>
                </Card>

            </div>

            {/* VISÃO ECONÔMICA BAR */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                <div className="md:col-span-3 bg-primary/10 rounded-2xl flex items-center p-4 border border-primary/20">
                    <h2 className="text-xs font-black uppercase text-primary tracking-widest leading-tight">Visão Econômica<br />do Negócio</h2>
                </div>
                <Card className="md:col-span-3 bg-[#111111] border-none p-4 flex flex-col justify-center">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                        Receita Bruta <GrowthIndicator value={calculateGrowth(currentSummary.receitaBrutaMes, previousSummary?.receitaBrutaMes || 0)} />
                    </p>
                    <p className="text-2xl font-black text-white">
                        <AnimatedCounter value={currentSummary.receitaBrutaMes} formatter={formatCurrency} />
                    </p>
                </Card>
                <Card className="md:col-span-3 bg-orange-500/10 border-none p-4 flex flex-col justify-center border-l-4 border-orange-500">
                    <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">
                        Custos e Despesas <GrowthIndicator value={calculateGrowth(currentSummary.gastosMes, previousSummary?.gastosMes || 0)} />
                    </p>
                    <p className="text-2xl font-black text-white">
                        <AnimatedCounter value={currentSummary.gastosMes} formatter={formatCurrency} />
                    </p>
                </Card>
                <Card className="md:col-span-3 bg-[#14b8a6]/20 border-none p-4 flex flex-col justify-center border-l-4 border-[#14b8a6]">
                    <p className="text-[9px] font-black text-[#14b8a6] uppercase tracking-widest mb-1">
                        Lucro Líquido <GrowthIndicator value={calculateGrowth(currentSummary.resultadoMes, previousSummary?.resultadoMes || 0)} />
                    </p>
                    <p className="text-2xl font-black text-white">
                        <AnimatedCounter value={currentSummary.resultadoMes} formatter={formatCurrency} />
                    </p>
                </Card>
            </div>

            {/* RADAR FINANCEIRO - PRÓXIMOS VENCIMENTOS */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                    <h3 className="text-sm font-black uppercase text-white tracking-widest">Radar Financeiro - Próximas Contas</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {upcomingTransactions.slice(0, 5).map((t, idx) => (
                        <Card
                            key={t.id || idx}
                            className="bg-[#111111] border-none p-3 hover:bg-[#1a1a1a] transition-all cursor-pointer group relative overflow-hidden"
                            onClick={() => handleEditTransaction?.(t)}
                        >
                            <div className={`absolute left-0 top-0 h-full w-1 ${t.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-black text-muted-foreground uppercase opacity-70">
                                    {new Date(t.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}
                                </span>
                                <p className="text-[10px] font-bold text-white truncate uppercase" title={t.description}>
                                    {t.description}
                                </p>
                                <span className={`text-sm font-black mt-1 ${t.type === 'income' ? 'text-emerald-500' : 'text-white'}`}>
                                    {formatCurrency(t.amount)}
                                </span>
                            </div>
                        </Card>
                    ))}
                    {upcomingTransactions.length === 0 && (
                        <div className="col-span-1 md:col-span-5 bg-[#111111] border-none p-6 rounded-2xl text-center text-muted-foreground text-[10px] font-bold uppercase tracking-widest border border-dashed border-white/5">
                            Nenhum compromisso pendente para os próximos dias.
                        </div>
                    )}
                </div>
            </div>

            {/* BOTTOM CHARTS AND CATEGORIES */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <Card className="bg-[#111111] border-none p-4 rounded-2xl shadow-xl flex flex-col">
                    <h3 className="text-xs font-black uppercase text-white border-l-2 border-primary pl-2 tracking-widest mb-6">Gastos por Categoria</h3>
                    <div className="h-[250px] w-full flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={currentSummary.expensesByCategory}
                                    cx="50%" cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {currentSummary.expensesByCategory.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                    formatter={(value: number) => formatCurrency(value)}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="bg-[#111111] border-none p-4 rounded-2xl shadow-xl flex flex-col">
                    <h3 className="text-xs font-black uppercase text-white border-l-2 border-primary pl-2 tracking-widest mb-6">Top 5 Clientes</h3>
                    <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                        {topClients?.map((client, idx) => (
                            <div key={idx} className="group cursor-default">
                                <div className="flex justify-between items-center mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary transition-colors">
                                            <Users size={12} className="text-primary group-hover:text-black" />
                                        </div>
                                        <span className="text-[10px] font-black text-white uppercase truncate max-w-[120px]" title={client.name}>
                                            {client.name}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-black text-primary font-mono">{formatCurrency(client.value)}</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-cyan-400 rounded-full transition-all duration-1000"
                                        style={{ width: `${Math.min(100, (client.value / (topClients[0]?.value || 1)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                        {(!topClients || topClients.length === 0) && (
                            <div className="h-full flex flex-col items-center justify-center opacity-30">
                                <Users size={32} className="mb-2" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">Sem dados no período</p>
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="bg-[#111111] border-none p-4 rounded-2xl shadow-xl lg:col-span-2 spotlight-card border-beam-card">
                    <h3 className="text-xs font-black uppercase text-white border-l-2 border-primary pl-2 tracking-widest mb-6">Resultados Mensais (Real x Previsto)</h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                    formatter={(val: number) => formatCurrency(val)}
                                />
                                <Area type="monotone" dataKey="Saldo" stroke="#14b8a6" strokeWidth={3} fillOpacity={1} fill="url(#colorSaldo)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <Card className="bg-[#111111] border-none p-4 rounded-2xl shadow-xl overflow-hidden relative">
                <div className="absolute top-4 right-4 bg-orange-500 text-[10px] font-black px-2 py-0.5 rounded text-white uppercase">Acumulado</div>
                <h3 className="text-xs font-black uppercase text-white border-l-2 border-primary pl-2 tracking-widest mb-6">Evolução Lucro Acumulado</h3>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={accumulatedData}>
                            <defs>
                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                            <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                                formatter={(val: number) => formatCurrency(val)}
                            />
                            <Area type="monotone" dataKey="Acumulado" stroke="#14b8a6" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
    );
};

export default DashboardTab;
