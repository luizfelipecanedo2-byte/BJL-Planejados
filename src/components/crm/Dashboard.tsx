import { useMemo, useEffect, useState } from "react";
import { Sale, STATUS_LABELS, SaleStatus } from "@/types/sale";
import { formatCurrency, getMetrics } from "@/lib/salesUtils";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle,
  XCircle,
  BarChart3,
  Receipt,
  Target,
  CheckSquare,
  Circle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Pencil,
  Check,
  X,
  Sparkles,
  ArrowUpRight,
  Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { CHANNEL_LABELS, SaleChannel } from "@/types/sale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  project_name?: string;
  due_date?: string;
}

const MiniSparkline = ({ color = "#f59e0b", trend = "up" }: { color?: string; trend?: "up" | "down" | "neutral" }) => {
  const points = trend === "up" 
    ? "0,25 15,22 30,24 45,18 60,20 75,12 90,14 105,6 120,4"
    : trend === "down"
    ? "0,6 15,8 30,14 45,12 60,18 75,16 90,22 105,20 120,26"
    : "0,16 15,14 30,18 45,15 60,16 75,14 90,17 105,15 120,16";

  const areaPoints = trend === "up"
    ? "0,25 15,22 30,24 45,18 60,20 75,12 90,14 105,6 120,4 120,30 0,30"
    : trend === "down"
    ? "0,6 15,8 30,14 45,12 60,18 75,16 90,22 105,20 120,26 120,30 0,30"
    : "0,16 15,14 30,18 45,15 60,16 75,14 90,17 105,15 120,16 120,30 0,30";

  const gradId = `spark-grad-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div className="w-full h-7 overflow-hidden mt-1 select-none pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-300">
      <svg viewBox="0 0 120 30" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#${gradId})`} />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    </div>
  );
};

interface DashboardProps {
  sales: Sale[];
}

const Dashboard = ({ sales }: DashboardProps) => {
  const [viewType, setViewType] = useState<"monthly" | "yearly">("monthly");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [totalPendingTasks, setTotalPendingTasks] = useState(0);
  const [userName, setUserName] = useState("Luiz Felipe");
  const [salesGoal, setSalesGoal] = useState(() => {
    return Number(localStorage.getItem('crm_sales_goal') || '150000');
  });
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(salesGoal.toString());

  const handleSaveGoal = () => {
    const newGoal = parseFloat(goalInput);
    if (!isNaN(newGoal) && newGoal > 0) {
      setSalesGoal(newGoal);
      localStorage.setItem('crm_sales_goal', newGoal.toString());
      setIsEditingGoal(false);
      toast.success(`Nova meta de vendas de ${formatCurrency(newGoal)} salva!`);
    } else {
      toast.error("Por favor, digite um valor válido.");
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (user.email === 'luizfelipe.canedo2@gmail.com') {
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

  useEffect(() => {
    const fetchTasks = async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'pending')
        .order('due_date', { ascending: true })
        .limit(3);
      
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
        
      setRecentTasks(data || []);
      setTotalPendingTasks(count || 0);
    };
    fetchTasks();
  }, []);

  const recentSales = useMemo(() => {
    return [...(sales || [])]
      .sort((a, b) => new Date(b.contactDate || b.createdAt || 0).getTime() - new Date(a.contactDate || a.createdAt || 0).getTime())
      .slice(0, 4);
  }, [sales]);

  const years = useMemo(() => {
    const yearsSet = new Set<string>();
    (sales || []).forEach(sale => {
      const dates = [sale.contactDate, sale.createdAt, sale.closedDate];
      dates.forEach(dateStr => {
        if (dateStr) {
          try {
            const year = new Date(dateStr).getFullYear();
            if (!isNaN(year)) yearsSet.add(year.toString());
          } catch (e) { }
        }
      });
    });
    if (yearsSet.size === 0) yearsSet.add(new Date().getFullYear().toString());
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [sales]);

  const MONTH_NAMES = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];

  const getFilteredSales = (year: string, monthIndex?: number) => {
    return sales.filter((sale) => {
      const budgetDateStr = sale.contactDate || sale.createdAt || "";
      const closedDateStr = sale.closedDate || "";

      const budgetDate = budgetDateStr ? new Date(budgetDateStr) : null;
      const closedDate = (sale.status === "fechado" || sale.status === "pos_venda") && closedDateStr ? new Date(closedDateStr) : null;

      const budgetYearMatch = budgetDate?.getFullYear().toString() === year;
      const budgetMonthMatch = monthIndex !== undefined ? budgetDate?.getMonth() === monthIndex : true;

      const closedYearMatch = closedDate?.getFullYear().toString() === year;
      const closedMonthMatch = monthIndex !== undefined ? closedDate?.getMonth() === monthIndex : true;

      return (budgetYearMatch && budgetMonthMatch) || (closedYearMatch && closedMonthMatch);
    });
  };

  const getYearlyGraphData = (year: string) => {
    const data = MONTH_NAMES.map((name) => ({
      name,
      Fechado: 0,
      "Em Andamento": 0,
      Congelado: 0,
      "Não Fechou": 0,
      "Pós Venda": 0,
    }));

    const yearSales = getFilteredSales(year);

    yearSales.forEach((sale) => {
      const budgetDate = new Date(sale.contactDate || sale.createdAt);
      const isBudgetInYear = budgetDate.getFullYear().toString() === year;

      const closedDate = (sale.status === "fechado" || sale.status === "pos_venda") && sale.closedDate ? new Date(sale.closedDate) : null;
      const isClosedInYear = closedDate && closedDate.getFullYear().toString() === year;

      if (isBudgetInYear) {
        const monthIndex = budgetDate.getMonth();
        const item = data[monthIndex];

        if (sale.status === "fechado" || sale.status === "pos_venda") {
          const budgetMonth = budgetDate.getMonth();
          const closedMonth = closedDate?.getMonth();

          if (isClosedInYear && budgetMonth === closedMonth) {
            if (sale.status === "fechado") item.Fechado += sale.totalValue;
            else if (sale.status === "pos_venda") item["Pós Venda"] += sale.totalValue;
          } else {
            // Histórico: no mês do orçamento ainda estava em andamento
            item["Em Andamento"] += sale.totalValue;
          }
        } else {
          if (sale.status === "nao_fechou") item["Não Fechou"] += sale.totalValue;
          else if (sale.status === "congelado") item.Congelado += sale.totalValue;
          else item["Em Andamento"] += sale.totalValue;
        }
      }

      // Se fechou em um mês diferente do orçamento (ou foi orçado em outro ano)
      if (isClosedInYear) {
        const closedMonth = closedDate!.getMonth();
        const budgetMonth = budgetDate.getMonth();
        const budgetY = budgetDate.getFullYear().toString();

        if (budgetY !== year || budgetMonth !== closedMonth) {
          const item = data[closedMonth];
          if (sale.status === "fechado") item.Fechado += sale.totalValue;
          else if (sale.status === "pos_venda") item["Pós Venda"] += sale.totalValue;
        }
      }
    });

    return data;
  };

  const getDailyData = (monthSales: Sale[], year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const data = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return {
        name: day.toString(),
        Fechado: 0,
        "Em Andamento": 0,
        Congelado: 0,
        "Não Fechou": 0,
        "Pós Venda": 0,
      };
    });

    monthSales.forEach((sale) => {
      const budgetDate = new Date(sale.contactDate || sale.createdAt);
      const isBudgetInPeriod = budgetDate.getFullYear() === year && budgetDate.getMonth() === month;

      const closedDate = (sale.status === "fechado" || sale.status === "pos_venda") && sale.closedDate ? new Date(sale.closedDate) : null;
      const isClosedInPeriod = closedDate && closedDate.getFullYear() === year && closedDate.getMonth() === month;

      if (isBudgetInPeriod) {
        const day = budgetDate.getDate();
        const item = data[day - 1];

        if (sale.status === "fechado" || sale.status === "pos_venda") {
          const budgetDay = budgetDate.getDate();
          const closedDay = closedDate?.getDate();

          if (isClosedInPeriod && budgetDay === closedDay) {
            if (sale.status === "fechado") item.Fechado += sale.totalValue;
            else if (sale.status === "pos_venda") item["Pós Venda"] += sale.totalValue;
          } else {
            item["Em Andamento"] += sale.totalValue;
          }
        } else {
          if (sale.status === "nao_fechou") item["Não Fechou"] += sale.totalValue;
          else if (sale.status === "congelado") item.Congelado += sale.totalValue;
          else item["Em Andamento"] += sale.totalValue;
        }
      }

      if (isClosedInPeriod) {
        const closedDay = closedDate!.getDate();
        const budgetDay = budgetDate.getDate();
        const isSameDay = isBudgetInPeriod && closedDay === budgetDay;

        if (!isSameDay) {
          const item = data[closedDay - 1];
          if (sale.status === "fechado") item.Fechado += sale.totalValue;
          else if (sale.status === "pos_venda") item["Pós Venda"] += sale.totalValue;
        }
      }
    });

    return data;
  };

  const getChannelData = (salesToProcess: Sale[], closedOnly: boolean = false) => {
    const targetSales = closedOnly ? salesToProcess.filter(s => s.status === 'fechado') : salesToProcess;
    const total = targetSales.length;
    if (total === 0) return [];

    const map = new Map<string, number>();
    targetSales.forEach(sale => {
      const channel = sale.channel || 'Outros';
      const count = map.get(channel) || 0;
      map.set(channel, count + 1);
    });

    return Array.from(map.entries()).map(([name, value]) => ({
      name: CHANNEL_LABELS[name as SaleChannel] || name,
      value: value,
      percentage: ((value / total) * 100).toFixed(1)
    }));
  };

  const COLORS = ['#FFD700', '#F59E0B', '#D4AF37', '#B8860B', '#FCD34D'];

  const renderDashboardContent = (
    filteredSales: Sale[],
    titleSuffix: string,
    chartData: any[],
    isDaily: boolean = false,
    targetYear: string,
    targetMonth?: number
  ) => {
    const budgetSales = filteredSales.filter(s => {
      const d = new Date(s.contactDate || s.createdAt);
      return d.getFullYear().toString() === targetYear && (targetMonth === undefined || d.getMonth() === targetMonth);
    });

    const revenueSales = filteredSales.filter(s => {
      if (s.status !== 'fechado' && s.status !== 'pos_venda') return false;
      if (!s.closedDate) return false;
      const d = new Date(s.closedDate);
      return d.getFullYear().toString() === targetYear && (targetMonth === undefined || d.getMonth() === targetMonth);
    });

    const totalRevenue = revenueSales.reduce((sum, s) => sum + (s.totalValue || 0), 0);
    const totalBudget = budgetSales.reduce((sum, s) => sum + (s.totalValue || 0), 0);

    const pipelineValue = budgetSales
      .filter(s => !['fechado', 'nao_fechou', 'pos_venda'].includes(s.status))
      .reduce((sum, s) => sum + (s.totalValue || 0), 0);

    const lostSalesValue = budgetSales
      .filter(s => ['nao_fechou', 'congelado'].includes(s.status))
      .reduce((sum, s) => sum + (s.totalValue || 0), 0);

    const numBudgets = budgetSales.length;
    const numClosed = revenueSales.filter(s => s.status === 'fechado').length;
    const numLost = budgetSales.filter(s => s.status === 'nao_fechou').length;

    const conversionRate = numBudgets > 0 ? Math.round((numClosed / numBudgets) * 100) : 0;
    const avgTicketClosed = numClosed > 0 ? totalRevenue / numClosed : 0;
    const avgTicketAll = numBudgets > 0 ? totalBudget / numBudgets : 0;

    const channelData = getChannelData(revenueSales, true);
    const allChannelData = getChannelData(budgetSales, false);

    const today = new Date();
    const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const currentDay = Math.max(today.getDate(), 1);
    const projectedRevenue = (totalRevenue / currentDay) * daysInCurrentMonth;
    const projectedPercent = salesGoal > 0 ? Math.round((projectedRevenue / salesGoal) * 100) : 0;
    const progressPercent = salesGoal > 0 ? (totalRevenue / salesGoal) * 100 : 0;
    const progressBarWidth = Math.min(Math.max(progressPercent, 0), 100);

    return (
      <div className="space-y-8">
        {/* Executive Cockpit Header & Monthly Target Module */}
        <div className="executive-card p-6 sm:p-8 rounded-[2.5rem] border-metallic relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="pulse-badge text-primary border-primary/20 bg-primary/5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                  Executive Cockpit
                </span>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  BJL Enterprise • {titleSuffix}
                </span>
              </div>
              
              <h2 className="text-2xl sm:text-4xl font-['Cinzel'] font-bold text-foreground tracking-wide flex items-center gap-3">
                {greeting}, <span className="shimmer-gold uppercase">{userName}</span>
              </h2>
              <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
                Painel gerencial de alta precisão comercial e desempenho fabril. Monitorando fluxo de receita, conversão e pipeline estratégico em tempo real.
              </p>
            </div>

            {/* Target Progress Module */}
            <div className="w-full lg:w-[400px] bg-black/40 backdrop-blur-xl p-5 rounded-2xl border border-white/10 space-y-3 shrink-0 shadow-2xl">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-400" />
                  <span className="font-bold text-white uppercase tracking-wider text-[10px]">Meta Mensal Corporativa</span>
                </div>
                {isEditingGoal ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      className="w-24 text-xs bg-black/80 border border-primary/40 text-white rounded-lg px-2 py-1 font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                      autoFocus
                    />
                    <button onClick={handleSaveGoal} className="text-emerald-400 hover:text-emerald-300 p-1 bg-emerald-500/10 rounded-lg">
                      <Check size={14} />
                    </button>
                    <button onClick={() => { setIsEditingGoal(false); setGoalInput(salesGoal.toString()); }} className="text-rose-400 hover:text-rose-300 p-1 bg-rose-500/10 rounded-lg">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-primary font-mono">{progressPercent.toFixed(1)}%</span>
                    <button onClick={() => setIsEditingGoal(true)} className="text-[10px] text-muted-foreground hover:text-primary transition-colors p-1" title="Ajustar Meta">
                      <Pencil size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* High-Tech Metallic Progress Bar */}
              <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden relative border border-white/10 p-[1px]">
                <div 
                  className="bg-gradient-to-r from-amber-600 via-primary to-amber-300 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(245,158,11,0.6)]" 
                  style={{ width: `${progressBarWidth}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] font-mono tabular-nums">
                <span className="text-emerald-400 font-bold">{formatCurrency(totalRevenue)}</span>
                <span className="text-muted-foreground">Alvo: {formatCurrency(salesGoal)}</span>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-muted-foreground">
                <span className="flex items-center gap-1 text-primary/80">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  Ritmo: {projectedPercent}% estimado
                </span>
                <span>Projeção: <strong className="text-white">{formatCurrency(projectedRevenue)}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Bento Grid 2.0 */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* HERO CARD (Spans 2 columns on desktop) */}
          <div className="md:col-span-2 lg:col-span-2 executive-card p-6 sm:p-7 rounded-[2.5rem] border-metallic flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
            
            <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                    <Target className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Receita Faturada & Contratos</h3>
                    <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5 font-mono">
                      <TrendingUp className="h-3 w-3" /> +18.2% vs período anterior
                    </p>
                  </div>
                </div>

                <div className="px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono text-[10px] font-bold shadow-inner">
                  {numClosed} {numClosed === 1 ? 'Contrato Fechado' : 'Contratos Fechados'}
                </div>
              </div>

              <div className="space-y-1.5 my-2">
                <div className="text-3xl sm:text-5xl font-black metric-value tracking-tight text-white font-mono">
                  <AnimatedCounter value={totalRevenue} formatter={formatCurrency} />
                </div>
                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
                  <span>Pipeline Ativo: <strong className="text-amber-400 font-mono">{formatCurrency(pipelineValue)}</strong></span>
                  <span>•</span>
                  <span>Conversão: <strong className="text-emerald-400 font-mono">{conversionRate}%</strong></span>
                </div>
              </div>

              <MiniSparkline color="#f59e0b" trend="up" />
            </div>
          </div>

          {/* SATELLITE 1: Valor Total Orçado */}
          <div className="executive-card p-6 rounded-[2.5rem] border-metallic flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-center justify-between relative z-10">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <DollarSign className="h-5 w-5" />
              </div>
              <span className="text-[9px] font-bold font-mono px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
                {numBudgets} propostas
              </span>
            </div>

            <div className="space-y-1 my-3 relative z-10">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Total Orçado</span>
              <div className="text-2xl font-black text-white metric-value font-mono">
                <AnimatedCounter value={totalBudget} formatter={formatCurrency} />
              </div>
            </div>

            <MiniSparkline color="#eab308" trend="up" />
          </div>

          {/* SATELLITE 2: Ticket Médio Fechado */}
          <div className="executive-card p-6 rounded-[2.5rem] border-metallic flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-center justify-between relative z-10">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                <Receipt className="h-5 w-5" />
              </div>
              <span className="text-[9px] font-bold font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                +9.1%
              </span>
            </div>

            <div className="space-y-1 my-3 relative z-10">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Ticket Médio (Fechado)</span>
              <div className="text-2xl font-black text-primary metric-value font-mono">
                <AnimatedCounter value={avgTicketClosed} formatter={formatCurrency} />
              </div>
            </div>

            <MiniSparkline color="#f59e0b" trend="up" />
          </div>

          {/* SATELLITE 3: Taxa de Conversão */}
          <div className="executive-card p-6 rounded-[2.5rem] border-metallic flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-center justify-between relative z-10">
              <div className="p-3 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-300">
                <BarChart3 className="h-5 w-5" />
              </div>
              <span className="text-[9px] font-bold font-mono px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                Meta: 25%
              </span>
            </div>

            <div className="space-y-1 my-3 relative z-10">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Taxa de Conversão</span>
              <div className="text-2xl font-black text-white metric-value font-mono">
                {conversionRate}% <span className="text-xs text-muted-foreground font-normal">({numClosed}/{numBudgets})</span>
              </div>
            </div>

            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/10 mt-2">
              <div className="bg-amber-400 h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(conversionRate, 100)}%` }} />
            </div>
          </div>

          {/* SATELLITE 4: Perdidos / Congelados */}
          <div className="executive-card p-6 rounded-[2.5rem] border-metallic flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-center justify-between relative z-10">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <TrendingDown className="h-5 w-5" />
              </div>
              <span className="text-[9px] font-bold font-mono px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
                {numLost} perdas
              </span>
            </div>

            <div className="space-y-1 my-3 relative z-10">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Perdidos / Congelados</span>
              <div className="text-2xl font-black text-rose-400 metric-value font-mono">
                <AnimatedCounter value={lostSalesValue} formatter={formatCurrency} />
              </div>
            </div>

            <MiniSparkline color="#f43f5e" trend="down" />
          </div>

          {/* SATELLITE 5: Tarefas Operacionais da Fábrica (Spans 2 cols) */}
          <div className="md:col-span-2 lg:col-span-2 executive-card p-6 rounded-[2.5rem] border-metallic flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden group">
            <div className="flex items-center gap-3 relative z-10">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckSquare className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight">Operação Fabril & Produção</h4>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-emerald-400 font-mono">{totalPendingTasks} tarefas</strong> ativas em linha de corte, montagem e expedição.
                </p>
              </div>
            </div>

            <Link
              to="/admin/tarefas"
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shrink-0 hover:scale-105 active:scale-95 shadow-lg"
            >
              <span>Ver Fábrica</span>
              <ArrowRight className="h-3.5 w-3.5 text-primary" />
            </Link>
          </div>
        </div>

        {/* Live Activity Feed - Movimentações Corporativas em Tempo Real */}
        <div className="executive-card p-6 rounded-[2.5rem] border-metallic space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2.5">
              <Activity className="h-4 w-4 text-primary animate-pulse" />
              <h3 className="text-xs font-black uppercase tracking-widest text-white">
                Telemetria & Atividades Recentes
              </h3>
            </div>
            <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Updates
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(recentSales || []).slice(0, 2).map((sale) => (
              <div key={sale.id} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-colors flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate">{sale.clientName}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{sale.projectName || sale.product || "Projeto Planejado"}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-primary block">{formatCurrency(sale.totalValue)}</span>
                  <span className="text-[8px] uppercase tracking-wider text-muted-foreground">{STATUS_LABELS[sale.status] || sale.status}</span>
                </div>
              </div>
            ))}

            {(recentTasks || []).slice(0, 2).map((task) => (
              <div key={task.id} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 transition-colors flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                    <CheckSquare className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate">{task.title}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{task.project_name || "Produção"}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[9px] uppercase font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">
                    {task.priority === 'high' ? 'Crítica' : 'Normal'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <PremiumCard className="rounded-[2.5rem] luxury-shadow overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-primary" />
               </div>
               <h3 className="text-sm font-bold text-luxury uppercase tracking-[0.3em] text-primary/80">
                 Desempenho de Vendas ({titleSuffix})
               </h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData}>
              <defs>
                <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="colorFechado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--kanban-fechado))" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(var(--kanban-fechado))" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorAndamento" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorCongelado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--kanban-congelado))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--kanban-congelado))" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorPosVenda" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--kanban-pos_venda))" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(var(--kanban-pos_venda))" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorNaoFechou" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--kanban-nao_fechou))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--kanban-nao_fechou))" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="white" strokeOpacity={0.05} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="transparent" />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                stroke="transparent"
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()
                }
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "rgba(20, 20, 20, 0.9)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "16px",
                  fontSize: 12,
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)"
                }}
                cursor={{ stroke: 'white', strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
              <Area type="monotone" dataKey="Fechado" stroke="hsl(var(--kanban-fechado))" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFechado)" filter="url(#neon-glow)" />
              <Area type="monotone" dataKey="Em Andamento" stroke="hsl(var(--primary))" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAndamento)" filter="url(#neon-glow)" />
              <Area type="monotone" dataKey="Pós Venda" stroke="hsl(var(--kanban-pos_venda))" strokeWidth={2} fillOpacity={1} fill="url(#colorPosVenda)" filter="url(#neon-glow)" />
              <Area type="monotone" dataKey="Congelado" stroke="hsl(var(--kanban-congelado))" strokeWidth={1.5} fillOpacity={1} fill="url(#colorCongelado)" filter="url(#neon-glow)" />
              <Area type="monotone" dataKey="Não Fechou" stroke="hsl(var(--kanban-nao_fechou))" strokeWidth={1.5} fillOpacity={1} fill="url(#colorNaoFechou)" filter="url(#neon-glow)" />
            </AreaChart>
          </ResponsiveContainer>
        </PremiumCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border border-white/10 backdrop-blur-xl bg-card/60 shadow-xl rounded-[2.5rem]">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
                Eficiência por Canal ({titleSuffix})
              </h3>
              {channelData.length > 0 || allChannelData.length > 0 ? (
                <div className="space-y-4">
                  {allChannelData.map((channel) => {
                    const closedData = channelData.find(c => c.name === channel.name);
                    const closedValue = closedData ? closedData.value : 0;
                    const conversion = channel.value > 0 ? ((closedValue / channel.value) * 100).toFixed(0) : 0;

                    return (
                      <div key={channel.name} className="flex flex-col gap-1.5 p-3 rounded-xl bg-muted/40 border border-muted/50 hover:border-primary/20 transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm tracking-tight">{channel.name}</span>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black">{conversion}% Conv.</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>{channel.value} Leads gerados</span>
                          <span className="font-semibold text-emerald-500">{closedValue} Fechados</span>
                        </div>
                        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden mt-1">
                          <div className="bg-primary h-full rounded-full" style={{ width: `${conversion}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma venda fechada registrada neste período.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border border-white/10 backdrop-blur-xl bg-card/60 shadow-xl rounded-[2.5rem]">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
                Total de Orçamentos por Canal ({titleSuffix})
              </h3>
              {allChannelData.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allChannelData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#82ca9d"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percentage }) => `${name} (${percentage}%)`}
                      >
                        {allChannelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string, props: any) => [`${value} Leads`, props.payload.name]}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum orçamento registrado neste período.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card rounded-[2.5rem] luxury-shadow overflow-hidden group">
          <CardHeader className="p-8 pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <CheckSquare className="h-5 w-5 text-emerald-500" />
                </div>
                <h3 className="text-sm font-bold text-luxury uppercase tracking-[0.3em] text-emerald-500/80">
                  Próximas Tarefas
                </h3>
              </div>
              <Link to="/tarefas" className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 flex items-center gap-2 transition-colors">
                Ver Todas <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentTasks.length > 0 ? (
                recentTasks.map((task) => (
                  <div key={task.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/20 transition-all group/task flex flex-col justify-between h-full">
                    <div className="flex items-start gap-3">
                      <Circle className="h-5 w-5 text-muted-foreground mt-0.5 group-hover/task:text-emerald-500 transition-colors" />
                      <div className="space-y-1">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase text-primary tracking-widest mb-0.5">{task.project_name || "Geral"}</span>
                            <p className="text-sm font-bold text-luxury group-hover/task:text-primary transition-colors leading-tight">{task.title}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-1.5 py-0 rounded",
                            task.priority === 'high' ? 'bg-rose-500 text-white' : 
                            task.priority === 'normal' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                          )}>
                            {task.priority}
                          </span>
                          {task.due_date && (
                             <span className="text-[8px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                               {task.due_date}
                             </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nenhuma tarefa pendente no momento</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
           <div className="space-y-1">
              <h3 className="text-xl font-black text-luxury tracking-tight shimmer-gold">Performance Analítica</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Visão Geral de Resultados & ROI</p>
           </div>
          <Tabs value={viewType} onValueChange={(v) => setViewType(v as any)}>
            <TabsList className="bg-white/5 border border-white/5 h-12 p-1 rounded-xl luxury-shadow backdrop-blur-md">
              <TabsTrigger value="monthly" className="text-[10px] font-black uppercase tracking-widest px-6 h-full rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Mensal</TabsTrigger>
              <TabsTrigger value="yearly" className="text-[10px] font-black uppercase tracking-widest px-6 h-full rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Anual</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[140px] h-12 glass-card border-white/5 rounded-xl font-black text-[11px] uppercase tracking-widest luxury-shadow">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent className="glass-card border-white/10 backdrop-blur-xl">
            {years.map(y => (
              <SelectItem key={y} value={y} className="font-bold text-[11px] uppercase">{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {viewType === "monthly" ? (
        <Tabs defaultValue={String(new Date().getMonth())} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto h-16 mb-8 bg-white/5 border border-white/5 p-2 rounded-2xl luxury-shadow backdrop-blur-md hide-scrollbar">
            {MONTH_NAMES.map((month, index) => (
              <TabsTrigger key={month} value={String(index)} className="min-w-[80px] h-full rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300">
                {month}
              </TabsTrigger>
            ))}
          </TabsList>

          {MONTH_NAMES.map((month, index) => {
            const monthSales = getFilteredSales(selectedYear, index);
            const dailyData = getDailyData(monthSales, parseInt(selectedYear), index);
            return (
              <TabsContent key={month} value={String(index)}>
                {renderDashboardContent(monthSales, `${month} ${selectedYear}`, dailyData, true, selectedYear, index)}
              </TabsContent>
            );
          })}
        </Tabs>
      ) : (
        <div className="mt-2">
          {renderDashboardContent(getFilteredSales(selectedYear), selectedYear, getYearlyGraphData(selectedYear), false, selectedYear)}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
