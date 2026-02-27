import { useMemo } from "react";
import { Sale, STATUS_LABELS, SaleStatus } from "@/types/sale";
import { formatCurrency, getMetrics } from "@/lib/salesUtils";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
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
import { useState } from "react";

interface DashboardProps {
  sales: Sale[];
}

const Dashboard = ({ sales }: DashboardProps) => {
  const [viewType, setViewType] = useState<"monthly" | "yearly">("monthly");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  const years = useMemo(() => {
    const yearsSet = new Set<string>();
    sales.forEach(sale => {
      const dateStr = sale.contactDate || sale.createdAt;
      if (dateStr) {
        try {
          const year = new Date(dateStr).getFullYear();
          if (!isNaN(year)) yearsSet.add(year.toString());
        } catch (e) { }
      }
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
      const dateStr = sale.contactDate || sale.createdAt || "";
      if (!dateStr) return false;
      const date = new Date(dateStr);
      const yearMatch = date.getFullYear().toString() === year;
      if (monthIndex !== undefined) {
        return yearMatch && date.getMonth() === monthIndex;
      }
      return yearMatch;
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
      const dateStr = sale.contactDate || sale.createdAt;
      if (!dateStr) return;
      const d = new Date(dateStr);
      const monthIndex = d.getMonth();
      const item = data[monthIndex];

      if (sale.status === "fechado") item.Fechado += sale.totalValue;
      else if (sale.status === "nao_fechou") item["Não Fechou"] += sale.totalValue;
      else if (sale.status === "congelado") item.Congelado += sale.totalValue;
      else if (sale.status === "pos_venda") item["Pós Venda"] += sale.totalValue;
      else item["Em Andamento"] += sale.totalValue;
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
      const dateStr = sale.contactDate || sale.createdAt;
      if (!dateStr) return;
      const d = new Date(dateStr);
      const day = d.getDate();
      const item = data[day - 1];

      if (sale.status === "fechado") item.Fechado += sale.totalValue;
      else if (sale.status === "nao_fechou") item["Não Fechou"] += sale.totalValue;
      else if (sale.status === "congelado") item.Congelado += sale.totalValue;
      else if (sale.status === "pos_venda") item["Pós Venda"] += sale.totalValue;
      else item["Em Andamento"] += sale.totalValue;
    });

    return data;
  };

  const getChannelData = (filteredSales: Sale[], closedOnly: boolean = false) => {
    const targetSales = closedOnly ? filteredSales.filter(s => s.status === 'fechado') : filteredSales;
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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const renderDashboardContent = (filteredSales: Sale[], titleSuffix: string, chartData: any[], isDaily: boolean = false) => {
    const metrics = getMetrics(filteredSales);
    const channelData = getChannelData(filteredSales, true);
    const allChannelData = getChannelData(filteredSales, false);

    const avgTicketAll = metrics.totalSales > 0
      ? filteredSales.reduce((sum, s) => sum + s.totalValue, 0) / metrics.totalSales
      : 0;

    const avgTicketClosed = metrics.closedSales > 0
      ? metrics.totalRevenue / metrics.closedSales
      : 0;

    const totalLostValue = filteredSales
      .filter(s => ['nao_fechou', 'congelado'].includes(s.status))
      .reduce((sum, s) => sum + s.totalValue, 0);

    const cards = [
      {
        title: "Valor Total de Orçamentos",
        value: formatCurrency(totalBudget),
        icon: DollarSign,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
      },
      {
        title: "Receita (Fechado + Pós-Venda)",
        value: formatCurrency(metrics.totalRevenue),
        icon: Target,
        color: "text-emerald-500",
        bgColor: "bg-emerald-500/10",
      },
      {
        title: "Dinheiro na Mesa (Perdidos)",
        value: formatCurrency(totalLostValue),
        icon: TrendingDown,
        color: "text-rose-500",
        bgColor: "bg-rose-500/10",
      },
      {
        title: "Pipeline Atual (Andamento)",
        value: formatCurrency(metrics.pipelineValue),
        icon: TrendingUp,
        color: "text-primary",
        bgColor: "bg-primary/10",
      },
      {
        title: "Ticket Médio (Fechadas)",
        value: formatCurrency(avgTicketClosed),
        icon: Receipt,
        color: "text-emerald-500",
        bgColor: "bg-emerald-500/10",
      },
      {
        title: "Ticket Médio (Geral)",
        value: formatCurrency(avgTicketAll),
        icon: Receipt,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
      },
      {
        title: "Conversão Geral",
        value: `${metrics.closedSales}/${metrics.totalSales} (${metrics.conversionRate}%)`,
        icon: BarChart3,
        color: "text-indigo-500",
        bgColor: "bg-indigo-500/10",
      },
      {
        title: "Leads Perdidos",
        value: metrics.lostSales.toString(),
        icon: XCircle,
        color: "text-rose-500",
        bgColor: "bg-rose-500/10",
      }
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <Card
              key={card.title}
              className="border-none shadow-sm hover:shadow-md transition-all group overflow-hidden"
            >
              <CardContent className="p-4 relative">
                <div className={`absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 ${card.color}`}>
                  <card.icon size={80} />
                </div>
                <div className="flex items-center gap-3 relative z-10">
                  <div className={`p-2.5 rounded-xl ${card.bgColor} shadow-sm`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-muted-foreground uppercase font-black tracking-tighter truncate opacity-80 mb-0.5">
                      {card.title}
                    </p>
                    <p className={`text-xl font-black tracking-tighter ${card.color}`}>
                      {card.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
              {isDaily ? "Vendas por Dia" : "Vendas por Mês"} ({titleSuffix})
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()
                  }
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    fontSize: 12,
                  }}
                />
                <Legend />
                <Bar dataKey="Fechado" fill="hsl(var(--kanban-fechado))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Em Andamento" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Congelado" fill="hsl(var(--kanban-congelado))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pós Venda" fill="hsl(var(--kanban-pos_venda))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Não Fechou" fill="hsl(var(--kanban-nao_fechou))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
                Eficiência por Canal ({titleSuffix})
              </h3>
              {channelData.length > 0 ? (
                <div className="space-y-4">
                  {allChannelData.map((channel, i) => {
                    // Try to find how many we closed vs total leads from this channel
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

          <Card className="border-none shadow-sm">
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
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-medium">Dashboard de Vendas</h3>
          <Tabs value={viewType} onValueChange={(v) => setViewType(v as any)}>
            <TabsList className="bg-muted/50 h-9">
              <TabsTrigger value="monthly" className="text-xs h-7">Mensal</TabsTrigger>
              <TabsTrigger value="yearly" className="text-xs h-7">Anual</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {viewType === "monthly" ? (
        <Tabs defaultValue={String(new Date().getMonth())} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto h-12 mb-6 bg-muted/50">
            {MONTH_NAMES.map((month, index) => (
              <TabsTrigger key={month} value={String(index)} className="min-w-[60px]">
                {month}
              </TabsTrigger>
            ))}
          </TabsList>

          {MONTH_NAMES.map((month, index) => {
            const monthSales = getFilteredSales(selectedYear, index);
            const dailyData = getDailyData(monthSales, parseInt(selectedYear), index);
            return (
              <TabsContent key={month} value={String(index)}>
                {renderDashboardContent(monthSales, `${month} ${selectedYear}`, dailyData, true)}
              </TabsContent>
            );
          })}
        </Tabs>
      ) : (
        <div className="mt-2">
          {renderDashboardContent(getFilteredSales(selectedYear), selectedYear, getYearlyGraphData(selectedYear), false)}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
