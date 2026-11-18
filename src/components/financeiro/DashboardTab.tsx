import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Calendar, Rocket, Users, Pencil, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { PremiumCard } from "@/components/ui/PremiumCard";
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
import { toast } from "sonner";
import { classifyTransactionForDRE, standardizeDRESubcategory } from "@/types/finance";

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
    transactions?: any[];
    sales?: any[];
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
    transactions = [],
    sales = [],
}: DashboardTabProps) => {
    const [userName, setUserName] = useState("Luiz Felipe");

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    if (user.email === 'luizfelipe@bjl.com' || user.email === 'luizfelipe.canedo2@gmail.com') {
                        setUserName("Luiz Felipe");
                    } else {
                        setUserName(user.email?.split('@')[0] || "Usuário");
                    }
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchUser();
    }, []);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return "Bom dia";
        if (hour < 18) return "Boa tarde";
        return "Boa noite";
    }, []);

    const [forecastDays, setForecastDays] = useState<15 | 30>(30);
    const [abcMode, setAbcMode] = useState<'suppliers' | 'subcategories'>('suppliers');

    // 1. Projeção de Liquidez e Fôlego de Caixa (15 ou 30 dias com Linha de Saldo Projetado)
    const { dailyFlowData, minProjectedBalance, minBalanceDate, finalProjectedBalance } = useMemo(() => {
        const data = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let runningBalance = currentSummary.saldoAtual || 0;
        let minBal = runningBalance;
        let minDateStr = today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        for (let i = 0; i < forecastDays; i++) {
            const currentDate = new Date(today);
            currentDate.setDate(today.getDate() + i);
            const displayDate = currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

            const dayTrans = transactions.filter(t => {
                if (!t.dueDate || t.category === 'Transferência') return false;
                // Para projeção de fôlego de caixa futuro, considera títulos pendentes (ou pagos no próprio dia de hoje)
                if (i > 0 && t.status === 'paid') return false;
                const tDate = new Date(t.dueDate);
                tDate.setHours(0, 0, 0, 0);
                return tDate.getTime() === currentDate.getTime();
            });

            const income = dayTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
            const expense = dayTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
            runningBalance += (income - expense);

            if (runningBalance < minBal) {
                minBal = runningBalance;
                minDateStr = displayDate;
            }

            data.push({
                name: displayDate,
                Entradas: income,
                Saídas: expense,
                "Saldo Projetado": Number(runningBalance.toFixed(2)),
            });
        }

        return {
            dailyFlowData: data,
            minProjectedBalance: minBal,
            minBalanceDate: minDateStr,
            finalProjectedBalance: runningBalance,
        };
    }, [transactions, forecastDays, currentSummary.saldoAtual]);

    // 2. Evolução do Ticket Médio (pega as vendas fechadas do CRM ou faturamento por contrato)
    const ticketMedioData = useMemo(() => {
        const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const year = parseInt(selectedYear);
        return months.map((month, index) => {
            const monthlySales = sales.filter(s => {
                const dateStr = s.closedDate || s.createdAt;
                if (!dateStr) return false;
                const match = dateStr.match(/^(\d{4})-(\d{2})/);
                if (match) {
                    const y = parseInt(match[1]);
                    const m = parseInt(match[2]) - 1;
                    return y === year && m === index;
                }
                const date = new Date(dateStr);
                return date.getFullYear() === year && date.getMonth() === index;
            });

            const closedSales = monthlySales.filter(s => s.status === "fechado" || s.status === "pos_venda");
            if (closedSales.length > 0) {
                const total = closedSales.reduce((sum, s) => sum + (s.totalValue || 0), 0);
                return {
                    name: month,
                    "Ticket Médio": Number((total / closedSales.length).toFixed(2)),
                };
            }

            // Fallback real pelas receitas lançadas no mês caso a venda tenha sido lançada direto no financeiro
            const monthlyIncomeTx = transactions.filter(t => {
                if (t.type !== 'income' || t.category === 'Transferência' || t.category === 'Empréstimos e Financiamentos') return false;
                const d = new Date(t.dueDate);
                return d.getFullYear() === year && d.getMonth() === index;
            });
            const txTotal = monthlyIncomeTx.reduce((sum, t) => sum + Number(t.amount || 0), 0);
            const ticket = monthlyIncomeTx.length > 0 ? txTotal / monthlyIncomeTx.length : 0;

            return {
                name: month,
                "Ticket Médio": Number(ticket.toFixed(2)),
            };
        });
    }, [sales, transactions, selectedYear]);

    // 3. Margem de Lucro % Mensal REAL (Bruta e Líquida baseadas na classificação oficial da DRE)
    const marginChartData = useMemo(() => {
        const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const year = parseInt(selectedYear);

        return months.map((month, idx) => {
            const monthTx = transactions.filter(t => {
                const d = new Date(t.dueDate);
                return d.getFullYear() === year && d.getMonth() === idx;
            });

            let receitaBruta = 0;
            let impostos = 0;
            let cpv = 0;
            let outrasDespesas = 0;
            let receitasFin = 0;

            monthTx.forEach(t => {
                const grp = classifyTransactionForDRE(t);
                const amt = Number(t.amount || 0);
                if (grp === 'transferencias') return;
                if (grp === 'receita_bruta') receitaBruta += amt;
                else if (grp === 'receitas_financeiras') receitasFin += amt;
                else if (grp === 'deducoes_impostos') impostos += amt;
                else if (grp === 'custos_producao') cpv += amt;
                else outrasDespesas += amt;
            });

            const receitaLiquida = Math.max(0, receitaBruta - impostos);
            const lucroBruto = receitaLiquida - cpv;
            const lucroLiquido = lucroBruto - outrasDespesas + receitasFin;

            const margemBruta = receitaLiquida > 0
                ? Math.max(-100, Math.min(100, (lucroBruto / receitaLiquida) * 100))
                : 0;
            const margemLiquida = receitaBruta > 0
                ? Math.max(-100, Math.min(100, (lucroLiquido / receitaBruta) * 100))
                : 0;

            return {
                name: month,
                "Margem Bruta (%)": parseFloat(margemBruta.toFixed(1)),
                "Margem Líquida (%)": parseFloat(margemLiquida.toFixed(1)),
                "Meta Margem": 35
            };
        });
    }, [transactions, selectedYear]);

    // 4. Custos Fixos vs Custos Variáveis REAIS (baseados nas categorias oficiais da marcenaria)
    const { fixedVsVariableData, totalFixosYear, totalVariaveisYear } = useMemo(() => {
        const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const year = parseInt(selectedYear);
        let sumFixos = 0;
        let sumVariaveis = 0;

        const data = months.map((month, idx) => {
            const monthTx = transactions.filter(t => {
                const d = new Date(t.dueDate);
                return t.type === 'expense' && d.getFullYear() === year && d.getMonth() === idx;
            });

            let fixos = 0;
            let variaveis = 0;

            monthTx.forEach(t => {
                const grp = classifyTransactionForDRE(t);
                if (grp === 'transferencias') return;
                const amt = Number(t.amount || 0);
                // Custos Variáveis: Materiais/Obras (CPV), Comissões/RT/Vendas e Impostos sobre Vendas
                if (grp === 'custos_producao' || grp === 'despesas_vendas' || grp === 'deducoes_impostos') {
                    variaveis += amt;
                } else {
                    // Custos Fixos / Estrutura: Galpão/Operacional, Pessoal Fixo, Maquinário e Despesas Financeiras
                    fixos += amt;
                }
            });

            sumFixos += fixos;
            sumVariaveis += variaveis;

            return {
                name: month,
                "Custos Fixos": parseFloat(fixos.toFixed(2)),
                "Custos Variáveis": parseFloat(variaveis.toFixed(2)),
            };
        });

        return {
            fixedVsVariableData: data,
            totalFixosYear: sumFixos,
            totalVariaveisYear: sumVariaveis,
        };
    }, [transactions, selectedYear]);

    // 5. Distribuição REAL por Meio de Pagamento no período selecionado
    const paymentMethodData = useMemo(() => {
        const isAnual = selectedDashMonth === 'anual';
        const currentMonth = !isAnual ? Number(selectedDashMonth) : -1;
        const year = parseInt(selectedYear);

        const methodMap: Record<string, number> = {
            "PIX": 0,
            "Boleto": 0,
            "Cartão": 0,
            "Dinheiro": 0,
            "Transferência / Outros": 0,
        };

        transactions.forEach((t: any) => {
            if (t.type !== 'income' || t.category === 'Transferência' || t.category === 'Empréstimos e Financiamentos') return;
            const d = new Date(t.dueDate);
            if (d.getFullYear() !== year || (!isAnual && d.getMonth() !== currentMonth)) return;

            const cat = (t.paymentMethod || t.financialInstitution || '').toLowerCase();
            const amt = Number(t.amount || 0);
            if (cat.includes('pix')) methodMap["PIX"] += amt;
            else if (cat.includes('boleto') || cat.includes('asaas')) methodMap["Boleto"] += amt;
            else if (cat.includes('cart') || cat.includes('crédito') || cat.includes('credito')) methodMap["Cartão"] += amt;
            else if (cat.includes('dinheiro')) methodMap["Dinheiro"] += amt;
            else methodMap["Transferência / Outros"] += amt;
        });

        return Object.entries(methodMap)
            .map(([name, value]) => ({ name, value }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [transactions, selectedYear, selectedDashMonth]);

    // 6. Curva ABC de Fornecedores & Insumos (Para onde está indo o dinheiro no período)
    const abcAnalysisData = useMemo(() => {
        const isAnual = selectedDashMonth === 'anual';
        const currentMonth = !isAnual ? Number(selectedDashMonth) : -1;
        const year = parseInt(selectedYear);

        const periodExpenses = transactions.filter((t: any) => {
            if (t.type !== 'expense' || t.category === 'Transferência') return false;
            const d = new Date(t.dueDate);
            return d.getFullYear() === year && (isAnual || d.getMonth() === currentMonth);
        });

        const totalExpense = periodExpenses.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        const grouped: Record<string, number> = {};

        periodExpenses.forEach((t: any) => {
            let key = "";
            if (abcMode === 'suppliers') {
                key = (t.contact || "").trim() || (t.subcategory || "").trim() || t.category || "Diversos";
            } else {
                key = (t.subcategory || "").trim() || t.category || "Outros Insumos";
            }
            grouped[key] = (grouped[key] || 0) + Number(t.amount || 0);
        });

        let cumulativePct = 0;
        return Object.entries(grouped)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6)
            .map((item) => {
                const pct = totalExpense > 0 ? (item.value / totalExpense) * 100 : 0;
                cumulativePct += pct;
                const abcClass = cumulativePct <= 70 ? 'A' : cumulativePct <= 90 ? 'B' : 'C';
                return {
                    ...item,
                    pct,
                    abcClass,
                };
            });
    }, [transactions, selectedYear, selectedDashMonth, abcMode]);

    // 7. Cascata de Resultado (Waterfall DRE do Período Selecionado)
    const waterfallPeriodData = useMemo(() => {
        const isAnual = selectedDashMonth === 'anual';
        const currentMonth = !isAnual ? Number(selectedDashMonth) : -1;
        const year = parseInt(selectedYear);

        const periodTx = transactions.filter((t: any) => {
            const d = new Date(t.dueDate);
            return d.getFullYear() === year && (isAnual || d.getMonth() === currentMonth);
        });

        let receitaBruta = 0;
        let impostos = 0;
        let cpv = 0;
        let pessoal = 0;
        let operacional = 0;
        let outrosCustos = 0; // vendas + maquinário + financeiro

        periodTx.forEach((t: any) => {
            const grp = classifyTransactionForDRE(t);
            const amt = Number(t.amount || 0);
            if (grp === 'transferencias') return;
            if (grp === 'receita_bruta' || grp === 'receitas_financeiras') receitaBruta += amt;
            else if (grp === 'deducoes_impostos') impostos += amt;
            else if (grp === 'custos_producao') cpv += amt;
            else if (grp === 'despesas_pessoal') pessoal += amt;
            else if (grp === 'despesas_operacionais') operacional += amt;
            else outrosCustos += amt;
        });

        const lucroBruto = receitaBruta - impostos - cpv;
        const lucroLiquido = lucroBruto - pessoal - operacional - outrosCustos;
        const baseRef = Math.max(receitaBruta, cpv + pessoal + operacional + outrosCustos, 1);

        return [
            { label: "(+) Receita Bruta", value: receitaBruta, pct: 100, type: "income" as const },
            { label: "(-) Materiais & Obras (CPV)", value: cpv, pct: (cpv / baseRef) * 100, type: "expense" as const },
            { label: "(=) Margem Bruta Obra", value: lucroBruto, pct: (lucroBruto / baseRef) * 100, type: "subtotal" as const },
            { label: "(-) Equipe & Pró-Labore", value: pessoal, pct: (pessoal / baseRef) * 100, type: "expense" as const },
            { label: "(-) Galpão & Operacional", value: operacional, pct: (operacional / baseRef) * 100, type: "expense" as const },
            { label: "(-) Vendas, Máquinas & Impostos", value: outrosCustos + impostos, pct: ((outrosCustos + impostos) / baseRef) * 100, type: "expense" as const },
            { label: "(=) Lucro Líquido no Bolso", value: lucroLiquido, pct: (lucroLiquido / baseRef) * 100, type: "result" as const },
        ];
    }, [transactions, selectedYear, selectedDashMonth]);

    // Suggestion 5: Termômetro de Meta
    const [goal, setGoal] = useState(() => {
        return Number(localStorage.getItem('finance_monthly_goal') || '50000');
    });
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [goalInput, setGoalInput] = useState(goal.toString());

    const handleSaveGoal = () => {
        const newGoal = parseFloat(goalInput);
        if (!isNaN(newGoal) && newGoal > 0) {
            setGoal(newGoal);
            localStorage.setItem('finance_monthly_goal', newGoal.toString());
            setIsEditingGoal(false);
            toast.success(`Nova meta mensal de ${formatCurrency(newGoal)} salva!`);
        } else {
            toast.error("Por favor, digite um valor válido.");
        }
    };

    const actualGoal = selectedDashMonth === 'anual' ? goal * 12 : goal;
    const actualRevenue = currentSummary.receitaBrutaMes;
    const percentage = actualGoal > 0 ? Math.min(100, (actualRevenue / actualGoal) * 100) : 0;
    const remaining = Math.max(0, actualGoal - actualRevenue);

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

    // Preparation for "Evolução Caixa Mensal" (Horizontal Bars com escala real)
    const initialCashData = chartData.map(d => ({
        name: d.name,
        value: d.Saldo
    }));
    const maxAbsInitialCash = useMemo(() => {
        return Math.max(...initialCashData.map(d => Math.abs(d.value || 0)), 1);
    }, [initialCashData]);

    const COLORS = ['#14b8a6', '#f97316', '#06b6d4', '#8b5cf6', '#ec4899', '#eab308'];

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (typeof window !== "undefined" && window.innerWidth < 1024) return;
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
        <div className="space-y-6 text-foreground min-h-screen" onMouseMove={handleMouseMove}>
            {/* EXECUTIVE FINANCIAL COCKPIT HERO & TELEMETRY */}
            <div className="executive-card border-metallic p-6 sm:p-8 rounded-[2.5rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10 mb-6 pb-6 border-b border-white/[0.06]">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="pulse-badge text-primary border-primary/20 bg-primary/5">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                                Financial Telemetry
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                                BJL Enterprise • Exercício
                            </span>
                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                                <SelectTrigger className="w-[82px] h-6 text-[10px] font-mono bg-white/[0.05] border-white/10 uppercase font-bold py-0 px-2.5 rounded-lg text-primary">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-white/10">
                                    <SelectItem value="2024">2024</SelectItem>
                                    <SelectItem value="2025">2025</SelectItem>
                                    <SelectItem value="2026">2026</SelectItem>
                                    <SelectItem value="2027">2027</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <h2 className="text-2xl sm:text-4xl font-display font-black text-foreground tracking-tight">
                            {greeting}, <span className="shimmer-gold">{userName}</span>
                        </h2>
                        <p className="text-xs text-muted-foreground max-w-lg">
                            Monitoramento em tempo real de liquidez, fluxo de caixa e execução orçamentária para{" "}
                            <span className="font-mono font-bold text-primary">
                                {selectedDashMonth === 'anual' ? `Ano ${selectedYear}` : `${["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][selectedDashMonth as number]} / ${selectedYear}`}
                            </span>.
                        </p>
                    </div>

                    <div className="w-full lg:w-[380px] bg-black/40 backdrop-blur-xl p-5 rounded-2xl border border-white/10 space-y-3 shrink-0 shadow-2xl">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-mono font-bold text-white uppercase tracking-wider text-[10px]">Meta de Caixa do Período</span>
                            <span className="font-mono font-black text-sm text-primary">{percentage.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden relative border border-white/10 p-[1px]">
                            <div 
                                className="bg-gradient-to-r from-amber-600 via-primary to-amber-300 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(245,158,11,0.5)]" 
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono tabular-nums">
                            <span className="text-emerald-400 font-bold">{formatCurrency(actualRevenue)}</span>
                            <span className="text-muted-foreground">Alvo: {formatCurrency(actualGoal)}</span>
                        </div>
                    </div>
                </div>

                {/* BENTO TELEMETRY STRIP (5 KPI PILLS) */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 relative z-10">
                    <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/[0.07] hover:border-cyan-400/30 transition-all flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-wider">A Receber</span>
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        </div>
                        <span className="text-lg sm:text-xl font-mono font-black text-white tabular-nums">
                            <AnimatedCounter value={currentSummary.accountsReceivable} formatter={formatCurrency} />
                        </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/[0.07] hover:border-primary/30 transition-all flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-mono font-bold text-primary uppercase tracking-wider">Fluxo Hoje</span>
                            <Calendar className="h-3 w-3 text-primary/70" />
                        </div>
                        <div className="flex items-baseline gap-2 font-mono tabular-nums">
                            <span className="text-xs sm:text-sm font-black text-emerald-400">+{formatCurrency(currentSummary.entradaHoje).replace('R$', '')}</span>
                            <span className="text-white/20">/</span>
                            <span className="text-xs sm:text-sm font-black text-rose-400">-{formatCurrency(currentSummary.saidaHoje).replace('R$', '')}</span>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-rose-500/[0.04] border border-rose-500/20 hover:border-rose-500/40 transition-all flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-mono font-bold text-rose-400 uppercase tracking-wider">A Pagar</span>
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                        </div>
                        <span className="text-lg sm:text-xl font-mono font-black text-white tabular-nums">
                            {formatCurrency(currentSummary.accountsPayable)}
                        </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 hover:border-amber-500/40 transition-all flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-wider">Vencidos</span>
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                        </div>
                        <span className="text-lg sm:text-xl font-mono font-black text-amber-400 tabular-nums">
                            <AnimatedCounter value={currentSummary.inadimplenciaTotal} formatter={formatCurrency} />
                        </span>
                    </div>

                    <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-emerald-500/[0.05] border border-emerald-500/25 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-wider">Saldo Projetado</span>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        </div>
                        <span className="text-lg sm:text-xl font-mono font-black text-emerald-400 tabular-nums">
                            <AnimatedCounter value={currentSummary.projectedBalance} formatter={formatCurrency} />
                        </span>
                    </div>
                </div>
            </div>

            {/* MAIN ROW: Analysis of Month, Evolution, and Initial Cash */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                {/* 1. ANÁLISE DO MÊS */}
                <Card className="lg:col-span-3 executive-card border-metallic p-5 rounded-3xl relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-display font-bold uppercase text-white border-l-2 border-primary pl-2.5 tracking-wider">
                            {selectedDashMonth === 'anual' ? 'Análise do Ano' : 'Análise do Mês'}
                        </h3>
                        <Select value={String(selectedDashMonth)} onValueChange={(v) => setSelectedDashMonth(v === 'anual' ? 'anual' : parseInt(v))}>
                            <SelectTrigger className="w-[84px] h-7 text-[10px] font-mono bg-white/[0.04] border-white/10 uppercase font-bold rounded-lg">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-white/10">
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
                                        <Cell fill="rgba(255,255,255,0.06)" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-x-0 bottom-4 flex flex-col items-center">
                                <span className="text-2xl font-mono font-black text-white tracking-tight tabular-nums">
                                    <AnimatedCounter value={currentSummary.saldoMes} formatter={formatCurrency} />
                                </span>
                                <span className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-widest">
                                    {selectedDashMonth === 'anual' ? 'Saldo do ano' : 'Saldo do mês'}
                                </span>
                            </div>
                        </div>

                        <div className="w-full space-y-2.5">
                            <div className="bg-white/[0.025] p-3 rounded-2xl border border-white/[0.06]">
                                <p className="text-[9px] font-mono font-bold text-muted-foreground uppercase flex justify-between">
                                    Planejado/Receber <span className="text-white">{formatCurrency(currentSummary.receitaBrutaMes)}</span>
                                </p>
                                <div className="mt-1.5 text-primary font-mono font-black text-lg leading-none">
                                    {currentSummary.receitaBrutaMes > 0 ? Math.round((currentSummary.entradaMes / currentSummary.receitaBrutaMes) * 100) : 0}%{" "}
                                    <span className="text-[10px] text-muted-foreground font-medium ml-1.5">Recebido: {formatCurrency(currentSummary.entradaMes)}</span>
                                </div>
                            </div>
                            <div className="bg-white/[0.025] p-3 rounded-2xl border border-white/[0.06]">
                                <p className="text-[9px] font-mono font-bold text-muted-foreground uppercase flex justify-between">
                                    Planejado/Gastar <span className="text-white">{formatCurrency(currentSummary.gastosMes)}</span>
                                </p>
                                <div className="mt-1.5 text-orange-400 font-mono font-black text-lg leading-none">
                                    {currentSummary.gastosMes > 0 ? Math.round((currentSummary.saidaMes / currentSummary.gastosMes) * 100) : 0}%{" "}
                                    <span className="text-[10px] text-muted-foreground font-medium ml-1.5">Pago: {formatCurrency(currentSummary.saidaMes)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* 2. ANÁLISE EVOLUTIVA */}
                <PremiumCard className="lg:col-span-6 executive-card border-metallic p-5 rounded-3xl overflow-hidden" animate={false}>
                    <h3 className="text-xs font-display font-bold uppercase text-white border-l-2 border-primary pl-2.5 tracking-wider mb-4">Análise Evolutiva de Fluxo</h3>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <filter id="neon-glow-finance" x="-20%" y="-20%" width="140%" height="140%">
                                        <feGaussianBlur stdDeviation="6" result="blur" />
                                        <feMerge>
                                            <feMergeNode in="blur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0}/>
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#888' }} />
                                <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#888' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(12,12,16,0.92)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px' }}
                                    formatter={(val: number) => formatCurrency(val)}
                                />
                                <Area type="monotone" dataKey="Receitas" stroke="#14b8a6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" filter="url(#neon-glow-finance)" />
                                <Area type="monotone" dataKey="Despesas" stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpense)" filter="url(#neon-glow-finance)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex gap-5 mt-2 justify-center">
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-teal-400 rounded-full" /> <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Receitas</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-orange-500 rounded-full" /> <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Despesas</span></div>
                    </div>
                </PremiumCard>

                {/* 3. EVOLUÇÃO CAIXA INICIAL (Horizontal Bar Chart) */}
                <Card className="lg:col-span-3 executive-card border-metallic p-5 rounded-3xl overflow-hidden">
                    <h3 className="text-xs font-display font-bold uppercase text-white border-l-2 border-primary pl-2.5 tracking-wider mb-4">Evolução Caixa Mensal</h3>
                    <div className="h-[320px] w-full overflow-y-auto pr-2 hide-scrollbar">
                        {initialCashData.slice(0, 12).reverse().map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 mb-3 last:mb-0 group">
                                <span className="text-[10px] font-mono font-bold w-8 text-muted-foreground group-hover:text-primary transition-colors">{item.name}</span>
                                <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                                    <div
                                        className={cn("h-full rounded-full", item.value >= 0 ? "bg-emerald-400" : "bg-rose-500")}
                                        style={{ width: `${Math.min(100, (Math.abs(item.value) / maxAbsInitialCash) * 100)}%` }}
                                    />
                                </div>
                                <span className="text-[10px] font-mono font-bold text-white w-20 text-right tabular-nums">{formatCurrency(item.value)}</span>
                            </div>
                        ))}
                    </div>
                </Card>

            </div>

            {/* VISÃO ECONÔMICA BAR */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                <div className="md:col-span-3 executive-card border-metallic rounded-3xl flex items-center p-5 bg-primary/[0.06] border-primary/25">
                    <div>
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-primary/70 block mb-1">DRE • SÍNTESE</span>
                        <h2 className="text-sm font-display font-black uppercase text-primary tracking-wider leading-tight">Visão Econômica<br />do Negócio</h2>
                    </div>
                </div>
                <Card className="md:col-span-3 executive-card border-metallic rounded-3xl p-5 flex flex-col justify-center">
                    <p className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1">
                        Receita Bruta <GrowthIndicator value={calculateGrowth(currentSummary.receitaBrutaMes, previousSummary?.receitaBrutaMes || 0)} />
                    </p>
                    <p className="text-2xl font-mono font-black text-white tabular-nums">
                        <AnimatedCounter value={currentSummary.receitaBrutaMes} formatter={formatCurrency} />
                    </p>
                </Card>
                <Card className="md:col-span-3 executive-card border-metallic rounded-3xl p-5 flex flex-col justify-center border-l-2 border-l-orange-500">
                    <p className="text-[9px] font-mono font-bold text-orange-400 uppercase tracking-widest mb-1">
                        Custos e Despesas <GrowthIndicator value={calculateGrowth(currentSummary.gastosMes, previousSummary?.gastosMes || 0)} />
                    </p>
                    <p className="text-2xl font-mono font-black text-white tabular-nums">
                        <AnimatedCounter value={currentSummary.gastosMes} formatter={formatCurrency} />
                    </p>
                </Card>
                <Card className="md:col-span-3 executive-card border-metallic rounded-3xl p-5 flex flex-col justify-center border-l-2 border-l-teal-400">
                    <p className="text-[9px] font-mono font-bold text-teal-400 uppercase tracking-widest mb-1">
                        Lucro Líquido <GrowthIndicator value={calculateGrowth(currentSummary.resultadoMes, previousSummary?.resultadoMes || 0)} />
                    </p>
                    <p className="text-2xl font-mono font-black text-white tabular-nums">
                        <AnimatedCounter value={currentSummary.resultadoMes} formatter={formatCurrency} />
                    </p>
                </Card>
            </div>

            {/* RADAR FINANCEIRO - PRÓXIMOS VENCIMENTOS */}
            <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-5 bg-primary rounded-full" />
                    <h3 className="text-xs font-display font-bold uppercase text-white tracking-wider">Radar de Liquidez • Próximos Vencimentos</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {upcomingTransactions.slice(0, 5).map((t, idx) => (
                        <Card
                            key={t.id || idx}
                            className="executive-card border-metallic rounded-2xl p-3.5 hover:bg-white/[0.04] transition-all cursor-pointer group relative overflow-hidden"
                            onClick={() => handleEditTransaction?.(t)}
                        >
                            <div className={`absolute left-0 top-0 h-full w-1 ${t.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <div className="flex flex-col gap-1 pl-1">
                                <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase">
                                    {new Date(t.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}
                                </span>
                                <p className="text-xs font-display font-bold text-white truncate uppercase" title={t.description}>
                                    {t.description}
                                </p>
                                <span className={`text-sm font-mono font-black mt-1 tabular-nums ${t.type === 'income' ? 'text-emerald-400' : 'text-white'}`}>
                                    {formatCurrency(t.amount)}
                                </span>
                            </div>
                        </Card>
                    ))}
                    {upcomingTransactions.length === 0 && (
                        <div className="col-span-1 md:col-span-5 executive-card p-6 rounded-2xl text-center text-muted-foreground text-[10px] font-mono font-bold uppercase tracking-widest border border-dashed border-white/10">
                            Nenhum compromisso pendente para os próximos dias.
                        </div>
                    )}
                </div>
            </div>

            {/* PROJEÇÃO DE SALDO 30 DIAS (FÔLEGO DE CAIXA), TICKET MÉDIO E TERMÔMETRO DE META */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* 1. PROJEÇÃO DE SALDO E FÔLEGO DE CAIXA (15 OU 30 DIAS) */}
                <Card className="lg:col-span-6 glass-card p-4 rounded-2xl overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div>
                                <h3 className="text-xs font-black uppercase text-white border-l-2 border-primary pl-2 tracking-widest">
                                    Projeção de Saldo & Fôlego de Caixa ({forecastDays} dias)
                                </h3>
                                <p className="text-[10px] text-muted-foreground pl-2.5 mt-0.5">
                                    Partindo do caixa atual ({formatCurrency(currentSummary.saldoAtual)}) + vencimentos futuros
                                </p>
                            </div>
                            <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setForecastDays(15)}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all",
                                        forecastDays === 15 ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-white"
                                    )}
                                >
                                    15 Dias
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForecastDays(30)}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all",
                                        forecastDays === 30 ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-white"
                                    )}
                                >
                                    30 Dias
                                </button>
                            </div>
                        </div>

                        {/* Pílulas de Alerta de Fôlego de Caixa */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className={cn(
                                "p-2.5 rounded-xl border text-[10px] flex items-center justify-between",
                                minProjectedBalance < 0
                                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                            )}>
                                <span className="font-bold uppercase tracking-wider">
                                    {minProjectedBalance < 0 ? `⚠️ Vale de Caixa (${minBalanceDate}):` : `Menor Saldo (${minBalanceDate}):`}
                                </span>
                                <span className="font-mono font-black">{formatCurrency(minProjectedBalance)}</span>
                            </div>
                            <div className="p-2.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 text-[10px] flex items-center justify-between">
                                <span className="font-bold uppercase tracking-wider">Final ({forecastDays}d):</span>
                                <span className="font-mono font-black">{formatCurrency(finalProjectedBalance)}</span>
                            </div>
                        </div>

                        <div className="h-[220px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={dailyFlowData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#666' }} />
                                    <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#666' }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                        formatter={(val: number) => formatCurrency(val)}
                                    />
                                    <Bar dataKey="Entradas" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={18} />
                                    <Bar dataKey="Saídas" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={18} />
                                    <Line type="monotone" dataKey="Saldo Projetado" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 justify-center">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 bg-teal-400 rounded-full" /> 
                            <span className="text-[10px] font-black uppercase text-muted-foreground">Entradas</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" /> 
                            <span className="text-[10px] font-black uppercase text-muted-foreground">Saídas</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-1 bg-sky-400 rounded-full" /> 
                            <span className="text-[10px] font-black uppercase text-sky-400">Linha de Saldo Projetado</span>
                        </div>
                    </div>
                </Card>

                {/* 2. EVOLUÇÃO DO TICKET MÉDIO */}
                <Card className="lg:col-span-3 glass-card p-4 rounded-2xl overflow-hidden flex flex-col justify-between">
                    <div>
                        <h3 className="text-xs font-black uppercase text-white border-l-2 border-primary pl-2 tracking-widest mb-4">
                            Ticket Médio ({selectedYear})
                        </h3>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={ticketMedioData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTicket" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                                    <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#555' }} />
                                    <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#555' }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                        formatter={(val: number) => formatCurrency(val)}
                                    />
                                    <Area type="monotone" dataKey="Ticket Médio" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorTicket)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="text-center text-[10px] font-black uppercase text-muted-foreground mt-2">
                        Média de Valor por Venda / Recebimento
                    </div>
                </Card>

                {/* 3. TERMÔMETRO DE META */}
                <Card className="lg:col-span-3 glass-card p-4 rounded-2xl overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-black uppercase text-white border-l-2 border-primary pl-2 tracking-widest">
                                Meta de Faturamento
                            </h3>
                            {isEditingGoal ? (
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        value={goalInput}
                                        onChange={(e) => setGoalInput(e.target.value)}
                                        className="w-16 text-[10px] bg-black border border-white/20 text-white rounded px-1.5 py-0.5 font-bold"
                                    />
                                    <button onClick={handleSaveGoal} className="text-emerald-500 hover:text-emerald-400 p-0.5">
                                        <Check size={12} />
                                    </button>
                                    <button onClick={() => { setIsEditingGoal(false); setGoalInput(goal.toString()); }} className="text-rose-500 hover:text-rose-400 p-0.5">
                                        <X size={12} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsEditingGoal(true)}
                                    className="text-[10px] font-black uppercase text-primary hover:underline flex items-center gap-1"
                                >
                                    <Pencil size={10} /> Editar
                                </button>
                            )}
                        </div>

                        <div className="relative flex items-center justify-center h-32 my-4">
                            <svg className="w-32 h-32 transform -rotate-90">
                                <defs>
                                    <linearGradient id="goalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#14b8a6" />
                                        <stop offset="100%" stopColor="#06b6d4" />
                                    </linearGradient>
                                </defs>
                                <circle
                                    cx="64"
                                    cy="64"
                                    r="48"
                                    stroke="#222"
                                    strokeWidth="10"
                                    fill="transparent"
                                />
                                <circle
                                    cx="64"
                                    cy="64"
                                    r="48"
                                    stroke="url(#goalGradient)"
                                    strokeWidth="10"
                                    fill="transparent"
                                    strokeDasharray={301.6}
                                    strokeDashoffset={301.6 - (301.6 * percentage) / 100}
                                    strokeLinecap="round"
                                    style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                                />
                            </svg>
                            <div className="absolute flex flex-col items-center justify-center">
                                <span className="text-xl font-black text-white">{percentage.toFixed(0)}%</span>
                                <span className="text-[8px] font-bold text-muted-foreground uppercase">Alcançado</span>
                            </div>
                        </div>

                        <div className="space-y-2 mt-2">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-muted-foreground uppercase">Realizado:</span>
                                <span className="text-white">{formatCurrency(actualRevenue)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-muted-foreground uppercase">Meta:</span>
                                <span className="text-primary">{formatCurrency(actualGoal)}</span>
                            </div>
                            {remaining > 0 ? (
                                <div className="flex justify-between items-center text-[10px] font-bold">
                                    <span className="text-muted-foreground uppercase">Falta:</span>
                                    <span className="text-orange-500">{formatCurrency(remaining)}</span>
                                </div>
                            ) : (
                                <div className="text-center text-[10px] font-black text-emerald-500 uppercase py-1 bg-emerald-500/10 rounded-lg">
                                    Meta Superada! 🎉
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            {/* NOVOS GRÁFICOS ESTRATÉGICOS: CASCATA DRE DO PERÍODO & CURVA ABC DE FORNECEDORES/INSUMOS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Cascata DRE (Para onde vai cada real faturado) */}
                <Card className="lg:col-span-6 glass-card p-5 rounded-2xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-xs font-black uppercase text-white border-l-2 border-emerald-400 pl-2 tracking-widest">
                                    Cascata de Resultado (Raio-X do Período)
                                </h3>
                                <p className="text-[10px] text-muted-foreground pl-2.5 mt-0.5">
                                    De onde vem o faturamento e quanto cada estrutura consome até o lucro líquido
                                </p>
                            </div>
                            <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 uppercase">
                                Waterfall DRE
                            </span>
                        </div>

                        <div className="space-y-2.5 mt-3">
                            {waterfallPeriodData.map((row, idx) => {
                                const isPositive = row.value >= 0;
                                const barColor =
                                    row.type === 'income' ? "bg-emerald-500" :
                                    row.type === 'subtotal' ? "bg-cyan-500" :
                                    row.type === 'result' ? (isPositive ? "bg-emerald-400" : "bg-rose-500") :
                                    "bg-rose-500/80";

                                return (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "p-2.5 rounded-xl border transition-all",
                                            row.type === 'result'
                                                ? (isPositive ? "bg-emerald-500/10 border-emerald-500/30" : "bg-rose-500/10 border-rose-500/30")
                                                : row.type === 'subtotal'
                                                    ? "bg-cyan-500/5 border-cyan-500/20"
                                                    : "bg-white/[0.02] border-white/[0.05]"
                                        )}
                                    >
                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                            <span className={cn(
                                                "font-bold uppercase tracking-tight text-[11px]",
                                                row.type === 'result' || row.type === 'subtotal' ? "text-white font-black" : "text-muted-foreground"
                                            )}>
                                                {row.label}
                                            </span>
                                            <div className="flex items-center gap-2 font-mono">
                                                <span className={cn(
                                                    "font-black text-xs",
                                                    row.type === 'income' ? "text-emerald-400" :
                                                    row.type === 'subtotal' ? "text-cyan-400" :
                                                    row.type === 'result' ? (isPositive ? "text-emerald-400" : "text-rose-400") :
                                                    "text-rose-400"
                                                )}>
                                                    {formatCurrency(row.value)}
                                                </span>
                                                <span className="text-[9px] text-muted-foreground w-11 text-right">
                                                    ({Math.abs(row.pct).toFixed(0)}%)
                                                </span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full transition-all duration-700", barColor)}
                                                style={{ width: `${Math.min(100, Math.max(2, Math.abs(row.pct)))}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Card>

                {/* Curva ABC de Fornecedores e Insumos */}
                <Card className="lg:col-span-6 glass-card p-5 rounded-2xl flex flex-col justify-between">
                    <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                            <div>
                                <h3 className="text-xs font-black uppercase text-white border-l-2 border-amber-500 pl-2 tracking-widest">
                                    Curva ABC • Maiores Gastos do Período
                                </h3>
                                <p className="text-[10px] text-muted-foreground pl-2.5 mt-0.5">
                                    Identifique quem mais consome caixa para negociar prazos e descontos
                                </p>
                            </div>
                            <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setAbcMode('suppliers')}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all",
                                        abcMode === 'suppliers' ? "bg-amber-500 text-black shadow" : "text-muted-foreground hover:text-white"
                                    )}
                                >
                                    Fornecedores
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAbcMode('subcategories')}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all",
                                        abcMode === 'subcategories' ? "bg-amber-500 text-black shadow" : "text-muted-foreground hover:text-white"
                                    )}
                                >
                                    Insumos / Contas
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 mt-3">
                            {abcAnalysisData.map((item, idx) => (
                                <div key={idx} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-amber-500/30 transition-all">
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={cn(
                                                "px-1.5 py-0.5 rounded text-[9px] font-mono font-black shrink-0",
                                                item.abcClass === 'A' ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                                                item.abcClass === 'B' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                                                "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                            )}>
                                                Curva {item.abcClass}
                                            </span>
                                            <span className="text-xs font-bold text-white truncate uppercase" title={item.name}>
                                                {item.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 font-mono shrink-0">
                                            <span className="text-xs font-black text-amber-400">{formatCurrency(item.value)}</span>
                                            <span className="text-[10px] text-muted-foreground w-11 text-right">({item.pct.toFixed(1)}%)</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all duration-700",
                                                item.abcClass === 'A' ? "bg-gradient-to-r from-rose-500 to-amber-500" :
                                                item.abcClass === 'B' ? "bg-amber-500" : "bg-teal-500"
                                            )}
                                            style={{ width: `${Math.min(100, (item.value / (abcAnalysisData[0]?.value || 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {abcAnalysisData.length === 0 && (
                                <div className="py-12 text-center text-xs text-muted-foreground uppercase font-mono tracking-widest opacity-50">
                                    Nenhuma despesa registrada neste período.
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            {/* BOTTOM CHARTS AND CATEGORIES */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <Card className="glass-card p-4 rounded-2xl flex flex-col">
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

                <Card className="glass-card p-4 rounded-2xl flex flex-col">
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

                <PremiumCard className="border-none p-4 rounded-2xl shadow-xl lg:col-span-2" animate={false}>
                    <h3 className="text-xs font-black uppercase text-white border-l-2 border-primary pl-2 tracking-widest mb-6">Resultados Mensais (Real x Previsto)</h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <filter id="neon-glow-saldo" x="-20%" y="-20%" width="140%" height="140%">
                                        <feGaussianBlur stdDeviation="6" result="blur" />
                                        <feMerge>
                                            <feMergeNode in="blur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
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
                                <Area type="monotone" dataKey="Saldo" stroke="#14b8a6" strokeWidth={3} fillOpacity={1} fill="url(#colorSaldo)" filter="url(#neon-glow-saldo)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </PremiumCard>
            </div>

            {/* STRATEGIC BI CHARTS SECTION (100% DADOS REAIS DA MARCENARIA) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* 1. Margem de Lucro Bruta vs Líquida (%) REAL */}
                <PremiumCard className="border-none p-4 rounded-2xl shadow-xl lg:col-span-2" animate={false}>
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
                        <div>
                            <h3 className="text-xs font-black uppercase text-white border-l-2 border-amber-500 pl-2 tracking-widest">
                                Evolução Real de Margem Bruta vs. Líquida (%)
                            </h3>
                            <p className="text-[10px] text-muted-foreground pl-2.5 mt-0.5">
                                Calculado diretamente das receitas, custos de MDF/insumos (CPV) e despesas fixas
                            </p>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold">
                            <span className="flex items-center gap-1 text-amber-400"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"/> Margem Bruta</span>
                            <span className="flex items-center gap-1 text-emerald-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"/> Margem Líquida</span>
                        </div>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={marginChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                <YAxis fontSize={10} axisLine={false} tickLine={false} unit="%" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                    formatter={(val: number) => `${val}%`}
                                />
                                <Bar dataKey="Margem Bruta (%)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Margem Líquida (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </PremiumCard>

                {/* 2. Meios de Pagamento (Donut + Legenda com valores reais) */}
                <Card className="glass-card p-4 rounded-2xl flex flex-col justify-between">
                    <h3 className="text-xs font-black uppercase text-white border-l-2 border-cyan-400 pl-2 tracking-widest mb-2">
                        Recebimentos por Meio de Pagamento
                    </h3>
                    {paymentMethodData.length > 0 ? (
                        <>
                            <div className="h-[175px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={paymentMethodData}
                                            cx="50%" cy="50%"
                                            innerRadius={45}
                                            outerRadius={68}
                                            paddingAngle={4}
                                            dataKey="value"
                                        >
                                            {paymentMethodData.map((entry, index) => (
                                                <Cell key={`pay-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                            formatter={(value: number) => formatCurrency(value)}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-1.5 mt-2 pt-2 border-t border-white/10">
                                {paymentMethodData.map((pm, idx) => {
                                    const totalPm = paymentMethodData.reduce((acc, i) => acc + i.value, 0) || 1;
                                    const pct = ((pm.value / totalPm) * 100).toFixed(0);
                                    return (
                                        <div key={pm.name} className="flex items-center justify-between text-[10px]">
                                            <span className="flex items-center gap-1.5 text-muted-foreground font-bold">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                                {pm.name}
                                            </span>
                                            <span className="font-mono font-black text-white">
                                                {formatCurrency(pm.value)} <span className="text-muted-foreground font-normal">({pct}%)</span>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-[10px] font-mono uppercase text-muted-foreground opacity-40">
                            Sem recebimentos no período
                        </div>
                    )}
                </Card>
            </div>

            {/* 3. Custos Fixos vs Custos Variáveis REAIS */}
            <PremiumCard className="border-none p-4 rounded-2xl shadow-xl" animate={false}>
                <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
                    <div>
                        <h3 className="text-xs font-black uppercase text-white border-l-2 border-purple-500 pl-2 tracking-widest">
                            Composição Real de Custos (Fixos vs Variáveis • {selectedYear})
                        </h3>
                        <p className="text-[10px] text-muted-foreground pl-2.5 mt-0.5">
                            Fixos (Aluguel, Pessoal, Galpão, Máquinas) vs. Variáveis (MDF, Ferragens, Terceiros, Impostos e Comissões)
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold">
                        <span className="flex items-center gap-1.5 text-purple-400">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"/>
                            Fixos: {formatCurrency(totalFixosYear)} ({((totalFixosYear / Math.max(totalFixosYear + totalVariaveisYear, 1)) * 100).toFixed(0)}%)
                        </span>
                        <span className="flex items-center gap-1.5 text-cyan-400">
                            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"/>
                            Variáveis: {formatCurrency(totalVariaveisYear)} ({((totalVariaveisYear / Math.max(totalFixosYear + totalVariaveisYear, 1)) * 100).toFixed(0)}%)
                        </span>
                    </div>
                </div>
                <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={fixedVsVariableData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                            <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                formatter={(val: number) => formatCurrency(val)}
                            />
                            <Bar dataKey="Custos Fixos" stackId="a" fill="#8b5cf6" radius={[0, 0, 4, 4]} />
                            <Bar dataKey="Custos Variáveis" stackId="a" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </PremiumCard>

            <PremiumCard className="border-none p-4 rounded-2xl shadow-xl overflow-hidden relative" animate={false}>
                <div className="absolute top-4 right-4 bg-orange-500 text-[10px] font-black px-2 py-0.5 rounded text-white uppercase">Acumulado</div>
                <h3 className="text-xs font-black uppercase text-white border-l-2 border-primary pl-2 tracking-widest mb-6">Evolução Lucro Acumulado</h3>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={accumulatedData}>
                            <defs>
                                <filter id="neon-glow-profit" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="6" result="blur" />
                                    <feMerge>
                                        <feMergeNode in="blur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
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
                            <Area type="monotone" dataKey="Acumulado" stroke="#14b8a6" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" filter="url(#neon-glow-profit)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </PremiumCard>
        </div>
    );
};

export default DashboardTab;
