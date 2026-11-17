import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
    TrendingUp, 
    TrendingDown, 
    DollarSign, 
    PieChart as PieChartIcon, 
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
    Pie
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProjectMargin {
    id: string;
    ticketNumber: string;
    client: string;
    action: string;
    name: string;
    shortName: string;
    revenue: number;
    expenses: number;
    profit: number;
    margin: number;
}

const norm = (s?: string) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

export const extractOSNumber = (ticket?: string): number => {
    if (!ticket) return -1;
    const osMatch = ticket.match(/OS[-\s#]*(\d+)/i);
    if (osMatch) return parseInt(osMatch[1], 10);
    const numMatch = ticket.match(/(\d+)/);
    return numMatch ? parseInt(numMatch[1], 10) : -1;
};

export const compareOSDesc = (ticketA?: string, ticketB?: string): number => {
    const numA = extractOSNumber(ticketA);
    const numB = extractOSNumber(ticketB);
    if (numB !== numA) return numB - numA;
    return (ticketB || "").localeCompare(ticketA || "", undefined, { numeric: true });
};

const extractOSTokensFromText = (text?: string | null): string[] => {
    if (!text) return [];
    const matches = Array.from(text.matchAll(/\bos[-\s#]*(\d+(?:-\d+)?)\b/gi));
    return matches.map(m => m[1].replace(/^0+(?=\d)/, ""));
};

const textMatchesOSTicket = (text: string | undefined | null, ticketNumber: string, allowBareNumber = false): boolean => {
    if (!text || !ticketNumber || norm(ticketNumber) === "s/n") return false;
    const targetTokens = extractOSTokensFromText(ticketNumber);
    const targetToken = targetTokens.length > 0
        ? targetTokens[0]
        : (ticketNumber.match(/\d+/)?.[0]?.replace(/^0+(?=\d)/, "") || "");

    const textTokens = extractOSTokensFromText(text);
    if (textTokens.length > 0 && targetToken) {
        return textTokens.includes(targetToken);
    }

    if (allowBareNumber && targetToken && /^\d+$/.test(text.trim())) {
        return text.trim().replace(/^0+(?=\d)/, "") === targetToken;
    }

    const escaped = ticketNumber.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^0-9]|$)`, "i").test(text);
};

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
            // 1. Buscar todas as Ordens de Serviço
            const { data: osData } = await supabase
                .from("service_orders")
                .select("*")
                .order("created_at", { ascending: false });

            // 2. Buscar todas as transações (com paginação completa)
            let allTransactions: any[] = [];
            let from = 0;
            const pageSize = 1000;
            let hasMore = true;

            while (hasMore) {
                const { data: batch, error: batchError } = await supabase
                    .from("transactions")
                    .select("id, description, amount, type, order_service, service, contact, category, subcategory")
                    .range(from, from + pageSize - 1);

                if (batchError) break;
                if (batch && batch.length > 0) {
                    allTransactions = allTransactions.concat(batch);
                    from += pageSize;
                    if (batch.length < pageSize) hasMore = false;
                } else {
                    hasMore = false;
                }
            }

            // 3. Buscar rateios (transaction_allocations) e gastos manuais (service_expenses)
            const [{ data: allocationsData }, { data: manualExpensesData }] = await Promise.all([
                supabase.from("transaction_allocations").select("*"),
                supabase.from("service_expenses").select("*"),
            ]);

            const serviceOrders = [...(osData || [])].sort((a, b) =>
                compareOSDesc(a.ticket_number, b.ticket_number)
            );
            const allocations = allocationsData || [];
            const manualExpenses = manualExpensesData || [];
            const expenses = allTransactions.filter(t => t.type === "expense");

            const allocatedTxIds = new Set<string>();
            allocations.forEach((a: any) => {
                if (a.transaction_id) allocatedTxIds.add(a.transaction_id);
            });

            const claimedAllocationIds = new Set<string>();
            const claimedTxIds = new Set<string>();
            const claimedManualIds = new Set<string>();

            const calculatedMargins: ProjectMargin[] = serviceOrders.map(os => {
                const ticketNumber = (os.ticket_number || "S/N").trim();
                const client = (os.client || "Não informado").trim();
                const action = (os.action || "").trim();
                const clientClean = norm(client);
                const actionClean = norm(action);
                const osFullString = norm(`${ticketNumber} - ${client}${action ? ` (${action})` : ""}`);

                // Rateios vinculados a esta OS
                const osAllocations = allocations.filter((a: any) => {
                    if (!a.client_name || (a.id && claimedAllocationIds.has(a.id))) return false;
                    const aName = norm(a.client_name);

                    // Se o rateio tem número de OS explícito, vincula exclusivamente pelo número da OS
                    const aTokens = extractOSTokensFromText(a.client_name);
                    if (aTokens.length > 0) {
                        return textMatchesOSTicket(a.client_name, ticketNumber);
                    }

                    // Fallback para rateios antigos sem número de OS
                    if (aName === osFullString) return true;
                    if (clientClean && aName.includes(clientClean) && actionClean && aName.includes(actionClean)) return true;
                    if (clientClean && aName === clientClean) return true;
                    return false;
                });

                osAllocations.forEach((a: any) => {
                    if (a.id) claimedAllocationIds.add(a.id);
                });

                const allocCost = osAllocations.reduce((sum: number, a: any) => sum + Number(a.amount || 0), 0);

                // Despesas manuais na tabela service_expenses vinculadas a esta OS
                const osManualExpenses = manualExpenses.filter((e: any) => {
                    if (e.id && claimedManualIds.has(e.id)) return false;
                    const eClient = norm(e.client_name);
                    const eEnv = norm(e.environment);
                    const eTokens = extractOSTokensFromText(e.client_name);
                    if (eTokens.length > 0) {
                        return textMatchesOSTicket(e.client_name, ticketNumber);
                    }
                    if (clientClean && eClient === clientClean && actionClean && eEnv === actionClean) return true;
                    return false;
                });

                osManualExpenses.forEach((e: any) => {
                    if (e.id) claimedManualIds.add(e.id);
                });

                const manualCost = osManualExpenses.reduce((sum: number, e: any) => sum + Number(e.spent_value || 0), 0);

                // Despesas diretas em transactions (sem rateio) vinculadas a esta OS
                const directTransactions = expenses.filter((t: any) => {
                    if (allocatedTxIds.has(t.id) || claimedTxIds.has(t.id)) return false;

                    const matchesOSField = textMatchesOSTicket(t.order_service, ticketNumber, true);
                    const matchesServiceField = textMatchesOSTicket(t.service, ticketNumber, true);
                    const matchesDesc = textMatchesOSTicket(t.description, ticketNumber, false);

                    if (matchesOSField || matchesServiceField || matchesDesc) {
                        return true;
                    }

                    // Se a transação menciona outra OS, não vincula por nome de contato
                    const hasOtherOS =
                        extractOSTokensFromText(t.order_service).length > 0 ||
                        extractOSTokensFromText(t.service).length > 0 ||
                        extractOSTokensFromText(t.description).length > 0;
                    if (hasOtherOS) return false;

                    // Fallback caso o campo service tenha "OS-XXX - Ação" ou nome do cliente em Despesa com Serviço
                    if (t.contact && clientClean && norm(t.contact) === clientClean && t.category === "Despesa com Serviço") {
                        return true;
                    }

                    return false;
                });

                directTransactions.forEach((t: any) => {
                    if (t.id) claimedTxIds.add(t.id);
                });

                const directCost = directTransactions.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

                const totalOSExpenses = allocCost + manualCost + directCost;
                const manualRevenue = osManualExpenses.reduce((sum: number, e: any) => sum + Number(e.service_value || 0), 0);
                const revenue = Number(os.amount) > 0 ? Number(os.amount) : manualRevenue;
                const profit = revenue - totalOSExpenses;
                const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

                const displayName = `${ticketNumber} - ${client}${action ? ` (${action})` : ""}`;
                const shortName = `${ticketNumber} - ${client}`;

                return {
                    id: os.id,
                    ticketNumber,
                    client,
                    action,
                    name: displayName,
                    shortName,
                    revenue,
                    expenses: totalOSExpenses,
                    profit,
                    margin,
                };
            });

            // Ordenar pela numeração da OS do maior para o menor
            calculatedMargins.sort((a, b) => compareOSDesc(a.ticketNumber, b.ticketNumber));

            setMargins(calculatedMargins);
        } catch (error) {
            console.error("Error fetching profitability data:", error);
        } finally {
            setLoading(false);
        }
    };

    const totalRevenue = useMemo(() => margins.reduce((acc, curr) => acc + curr.revenue, 0), [margins]);
    const totalExpenses = useMemo(() => margins.reduce((acc, curr) => acc + curr.expenses, 0), [margins]);
    const totalProfit = totalRevenue - totalExpenses;
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const pieData = useMemo(() => margins.filter(m => m.profit > 0).slice(0, 5), [margins]);

    const COLORS = ['#FFD700', '#F59E0B', '#D4AF37', '#B8860B', '#FCD34D'];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { title: "Receita Total Bruta (OS)", value: totalRevenue, icon: TrendingUp, color: "text-primary", bgColor: "bg-primary/10" },
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
                            <h3 className="text-sm font-black text-luxury uppercase tracking-widest">Análise de Margem por Ordem de Serviço</h3>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={margins.slice(0, 10)}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="shortName" tick={{ fontSize: 10, fill: '#888' }} stroke="transparent" />
                                    <YAxis tick={{ fontSize: 10, fill: '#888' }} stroke="transparent" tickFormatter={(v) => `R$${v/1000}k`} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                                        formatter={(v: any) => formatCurrency(Number(v))}
                                        labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""}
                                    />
                                    <Bar dataKey="revenue" name="Receita" fill="#FFD700" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expenses" name="Custos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
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
                            <h3 className="text-sm font-black text-luxury uppercase tracking-widest">Composição de Lucro por OS</h3>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="profit"
                                        label={({ shortName }) => shortName}
                                    >
                                        {pieData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-3 mt-4">
                            {margins.slice(0, 3).map((p) => (
                                <div key={p.id} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
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
                    <div className="overflow-x-auto webkit-overflow-scrolling-touch">
                        <table className="w-full text-left min-w-[650px]">
                        <thead className="bg-white/5">
                            <tr className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                <th className="p-6">Ordem de Serviço / Cliente</th>
                                <th className="p-6">Receita Contratada</th>
                                <th className="p-6">Custos Operacionais</th>
                                <th className="p-6">Lucro Bruto</th>
                                <th className="p-6">Margem (%)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {margins.map((p) => (
                                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-6">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="font-mono text-[10px] font-black bg-primary/10 text-primary border-primary/30 px-2 py-0.5">
                                                    {p.ticketNumber}
                                                </Badge>
                                                <span className="font-bold text-luxury group-hover:text-primary transition-colors">
                                                    {p.client}
                                                </span>
                                            </div>
                                            {p.action && (
                                                <span className="text-[11px] text-muted-foreground pl-1">
                                                    {p.action}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-6 font-mono text-xs text-white/80">{formatCurrency(p.revenue)}</td>
                                    <td className="p-6 font-mono text-xs text-rose-500/80">{formatCurrency(p.expenses)}</td>
                                    <td className={cn("p-6 font-mono text-xs font-black", p.profit >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                        {formatCurrency(p.profit)}
                                    </td>
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
                            {!loading && margins.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-xs text-muted-foreground italic">
                                        Nenhuma Ordem de Serviço encontrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
