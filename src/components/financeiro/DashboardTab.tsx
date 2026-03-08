import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Calendar, Rocket } from "lucide-react";
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
    chartData,
    accumulatedData,
    formatCurrency,
}: DashboardTabProps) => {

    // Preparation for "Evolução Caixa Inicial" (Horizontal Bars)
    const initialCashData = chartData.map(d => ({
        name: d.name,
        value: d.Saldo // Simplification for demo
    }));

    return (
        <div className="space-y-6 text-foreground bg-[#0a0a0a] p-2 rounded-3xl min-h-screen">
            {/* TOP HEADER SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mb-2">
                <div className="md:col-span-3 flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-xl">
                        <Rocket className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tighter uppercase text-white">ORGANIZADA</h1>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Venda Empresa</p>
                    </div>
                </div>

                <div className="md:col-span-9 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="bg-[#1a1a1a] border-none shadow-none p-3 h-16 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase">A receber</span>
                        <span className="text-lg font-black text-white">{formatCurrency(currentSummary.accountsReceivable)}</span>
                    </Card>
                    <Card className="bg-[#1a1a1a] border-none shadow-none p-3 h-16 flex flex-col justify-center border-t-2 border-primary">
                        <span className="text-[10px] font-bold text-primary uppercase">Hoje</span>
                        <span className="text-lg font-black text-white">R$ 0</span>
                    </Card>
                    <Card className="bg-rose-500/10 border-none shadow-none p-3 h-16 flex flex-col justify-center border-t-2 border-rose-500">
                        <span className="text-[10px] font-bold text-rose-500 uppercase">A pagar</span>
                        <span className="text-lg font-black text-white">{formatCurrency(currentSummary.accountsPayable)}</span>
                    </Card>
                    <Card className="bg-orange-500/10 border-none shadow-none p-3 h-16 flex flex-col justify-center border-t-2 border-orange-500">
                        <span className="text-[10px] font-bold text-orange-500 uppercase">Vencidos</span>
                        <span className="text-lg font-black text-white">{formatCurrency(currentSummary.inadimplenciaTotal)}</span>
                    </Card>
                </div>
            </div>

            {/* MAIN ROW: Analysis of Month, Evolution, and Initial Cash */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                {/* 1. ANÁLISE DO MÊS */}
                <Card className="lg:col-span-3 bg-[#111111] border-none p-4 rounded-2xl relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-black uppercase text-white border-l-2 border-primary pl-2 tracking-widest">Análise do Mês</h3>
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
                                <span className="text-2xl font-black text-white tracking-tighter">{formatCurrency(currentSummary.saldoMes)}</span>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Saldo do mês</span>
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
                <Card className="lg:col-span-6 bg-[#111111] border-none p-4 rounded-2xl overflow-hidden">
                    <h3 className="text-xs font-black uppercase text-white border-l-2 border-primary pl-2 tracking-widest mb-4">Análise Evolutiva</h3>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#555' }} />
                                <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#555' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                    formatter={(val: number) => formatCurrency(val)}
                                />
                                <Bar dataKey="Despesas" fill="#f97316" radius={[4, 4, 0, 0]} barSize={20} />
                                <Line type="monotone" dataKey="Receitas" stroke="#14b8a6" strokeWidth={3} dot={{ r: 4, fill: '#14b8a6', strokeWidth: 2, stroke: '#111' }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex gap-4 mt-2 justify-center">
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-orange-500 rounded-full" /> <span className="text-[10px] font-black uppercase text-muted-foreground">Despesas</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-primary rounded-full" /> <span className="text-[10px] font-black uppercase text-muted-foreground">Receitas</span></div>
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
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Receita Bruta</p>
                    <p className="text-2xl font-black text-white">{formatCurrency(currentSummary.receitaBrutaMes)}</p>
                </Card>
                <Card className="md:col-span-3 bg-orange-500/10 border-none p-4 flex flex-col justify-center border-l-4 border-orange-500">
                    <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">Custos e Despesas</p>
                    <p className="text-2xl font-black text-white">{formatCurrency(currentSummary.gastosMes)}</p>
                </Card>
                <Card className="md:col-span-3 bg-[#14b8a6]/20 border-none p-4 flex flex-col justify-center border-l-4 border-[#14b8a6]">
                    <p className="text-[9px] font-black text-[#14b8a6] uppercase tracking-widest mb-1">Lucro Líquido</p>
                    <p className="text-2xl font-black text-white">{formatCurrency(currentSummary.resultadoMes)}</p>
                </Card>
            </div>

            {/* BOTTOM CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-[#111111] border-none p-4 rounded-2xl shadow-xl">
                    <h3 className="text-xs font-black uppercase text-white border-l-2 border-primary pl-2 tracking-widest mb-6">Resultados Mensais (Real x Previsto)</h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                                    formatter={(val: number) => formatCurrency(val)}
                                />
                                <Bar dataKey="Saldo" fill="#14b8a6" radius={[2, 2, 0, 0]}>
                                    <LabelList
                                        dataKey="Saldo"
                                        position="top"
                                        formatter={(val: number) => Math.floor(val)}
                                        style={{ fill: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

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
        </div>
    );
};

export default DashboardTab;
