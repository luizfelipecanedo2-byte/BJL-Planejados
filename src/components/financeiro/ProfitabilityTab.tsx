import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
    TrendingUp, 
    TrendingDown, 
    DollarSign, 
    PieChart as PieChartIcon, 
    ArrowUpCircle, 
    ArrowDownCircle,
    Target,
    Activity
} from "lucide-react";
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    Cell,
    PieChart,
    Pie,
    Legend
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProjectMargin {
    name: string;
    revenue: number;
    expenses: number;
    profit: number;
    margin: number;
}

export default function ProfitabilityTab() {
    const [margins, setMargins] = useState<ProjectMargin[]>([]);
    const [loading, setLoading] = useState(true);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch sales (revenue)
            const { data: sales } = await supabase
                .from('sales')
                .select('*')
                .in('status', ['fechado', 'pos_venda']);

            // Fetch expenses
            const { data: expenses } = await supabase
                .from('transactions')
                .select('*')
                .eq('type', 'expense');

            const projectsMap = new Map<string, { revenue: number, expenses: number }>();

            (sales || []).forEach(s => {
                const key = s.client_name;
                const current = projectsMap.get(key) || { revenue: 0, expenses: 0 };
                projectsMap.set(key, { ...current, revenue: current.revenue + Number(s.total_value) });
            });

            (expenses || []).forEach(e => {
                const key = e.contact || e.order_service || "Outros";
                const current = projectsMap.get(key) || { revenue: 0, expenses: 0 };
                projectsMap.set(key, { ...current, expenses: current.expenses + Number(e.amount) });
            });

            const calculatedMargins: ProjectMargin[] = Array.from(projectsMap.entries())
                .map(([name, data]) => {
                    const profit = data.revenue - data.expenses;
                    const margin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;
                    return {
                        name,
                        revenue: data.revenue,
                        expenses: data.expenses,
                        profit,
                        margin
                    };
                })
                .filter(p => p.revenue > 0) // Only show projects with revenue
                .sort((a, b) => b.profit - a.profit);

            setMargins(calculatedMargins);
        } catch (error) {
            console.error('Error fetching profitability data:', error);
        } finally {
            setLoading(false);
        }
    };

    const totalRevenue = useMemo(() => margins.reduce((acc, curr) => acc + curr.revenue, 0), [margins]);
    const totalExpenses = useMemo(() => margins.reduce((acc, curr) => acc + curr.expenses, 0), [margins]);
    const totalProfit = totalRevenue - totalExpenses;
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const COLORS = ['#FFD700', '#F59E0B', '#D4AF37', '#B8860B', '#FCD34D'];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { title: "Receita Total Bruta", value: totalRevenue, icon: TrendingUp, color: "text-primary", bgColor: "bg-primary/10" },
                    { title: "Custos Totais OS", value: totalExpenses, icon: TrendingDown, color: "text-rose-500", bgColor: "bg-rose-500/10" },
                    { title: "Lucro Líquido Projetado", value: totalProfit, icon: DollarSign, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
                    { title: "Margem Média", value: avgMargin, isPercent: true, icon: Target, color: "text-amber-500", bgColor: "bg-amber-500/10" },
                ].map((stat, idx) => (
                    <Card key={idx} className="glass-card rounded-[2rem] luxury-shadow overflow-hidden group border-white/5">
                        <CardContent className="p-6 relative">
                            <div className={`absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-125 transition-transform duration-700 ${stat.color}`}>
                                <stat.icon size={80} />
                            </div>
                            <div className="flex flex-col gap-4">
                                <div className={cn("p-2.5 rounded-xl w-fit shadow-lg", stat.bgColor)}>
                                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{stat.title}</p>
                                    <p className={cn("text-2xl font-black tracking-tighter text-luxury", stat.color)}>
                                        {stat.isPercent ? `${stat.value.toFixed(1)}%` : formatCurrency(stat.value)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 glass-card rounded-[2.5rem] luxury-shadow border-white/5">
                    <CardHeader className="p-8 pb-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Activity className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="text-sm font-black text-luxury uppercase tracking-widest">Análise de Margem por Projeto</h3>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={margins.slice(0, 10)}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} stroke="transparent" />
                                    <YAxis tick={{ fontSize: 10, fill: '#888' }} stroke="transparent" tickFormatter={(v) => `R$${v/1000}k`} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                                        formatter={(v: any) => formatCurrency(v)}
                                    />
                                    <Bar dataKey="revenue" name="Receita" fill="#FFD700" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="profit" name="Lucro" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card rounded-[2.5rem] luxury-shadow border-white/5">
                    <CardHeader className="p-8 pb-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <PieChartIcon className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="text-sm font-black text-luxury uppercase tracking-widest">Composição de Lucro</h3>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={margins.slice(0, 5)}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="profit"
                                        label={({ name }) => name}
                                    >
                                        {margins.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-3 mt-4">
                            {margins.slice(0, 3).map((p, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                                    <span className="text-xs font-bold text-luxury truncate pr-4">{p.name}</span>
                                    <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/20">{p.margin.toFixed(0)}%</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="glass-card rounded-[2.5rem] luxury-shadow border-white/5 overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto touch-pan-x webkit-overflow-scrolling-touch">
                        <table className="w-full text-left min-w-[650px]">
                        <thead className="bg-white/5">
                            <tr className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                <th className="p-6">Projeto/Cliente</th>
                                <th className="p-6">Receita Contratada</th>
                                <th className="p-6">Custos Operacionais</th>
                                <th className="p-6">Lucro Bruto</th>
                                <th className="p-6">Margem (%)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {margins.map((p, idx) => (
                                <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-6 font-bold text-luxury group-hover:text-primary transition-colors">{p.name}</td>
                                    <td className="p-6 font-mono text-xs text-white/80">{formatCurrency(p.revenue)}</td>
                                    <td className="p-6 font-mono text-xs text-rose-500/80">{formatCurrency(p.expenses)}</td>
                                    <td className="p-6 font-mono text-xs text-emerald-500 font-black">{formatCurrency(p.profit)}</td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 bg-white/5 h-1.5 rounded-full overflow-hidden">
                                                <div 
                                                    className={cn("h-full rounded-full transition-all duration-1000", p.margin > 30 ? "bg-emerald-500" : p.margin > 15 ? "bg-amber-500" : "bg-rose-500")} 
                                                    style={{ width: `${Math.min(100, Math.max(0, p.margin))}%` }} 
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-luxury w-8">{p.margin.toFixed(0)}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
