import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ServiceOrder } from "@/types/serviceOrder";
import { CompanySettings } from "@/types/company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { 
  Users, 
  Clock, 
  Percent, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  Hammer
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from "recharts";

interface CapacityTabProps {
  orders: ServiceOrder[];
  settings: CompanySettings | null;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Helper function to calculate working days (Mon-Fri) in a month
const getWorkingDaysInMonth = (year: number, monthIndex: number): number => {
  try {
    if (isNaN(year) || isNaN(monthIndex)) return 22;
    let count = 0;
    const date = new Date(year, monthIndex, 1);
    while (date.getMonth() === monthIndex) {
      const day = date.getDay();
      if (day !== 0 && day !== 6) { // Not Sunday (0) and not Saturday (6)
        count++;
      }
      date.setDate(date.getDate() + 1);
    }
    return count > 0 ? count : 22;
  } catch (e) {
    console.error("Error in getWorkingDaysInMonth:", e);
    return 22;
  }
};

const CapacityTab = ({ orders = [], settings }: CapacityTabProps) => {
  const currentYear = new Date().getFullYear();
  const currentMonthIndex = new Date().getMonth();
  
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthIndex.toString());
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());

  // Extracted config settings safely coerced to numbers
  const staffCount = useMemo(() => {
    return Number(settings?.capacity_production_staff) || 3;
  }, [settings?.capacity_production_staff]);

  const dailyHours = useMemo(() => {
    return Number(settings?.capacity_daily_hours) || 8;
  }, [settings?.capacity_daily_hours]);

  const efficiencyPercent = useMemo(() => {
    return Number(settings?.capacity_efficiency) || 80;
  }, [settings?.capacity_efficiency]);

  // Calculate working days and total capacity for selected period
  const workingDays = useMemo(() => {
    try {
      const year = parseInt(selectedYear);
      const month = parseInt(selectedMonth);
      if (isNaN(year) || isNaN(month)) return 22;
      return getWorkingDaysInMonth(year, month);
    } catch (e) {
      console.error("Error in workingDays useMemo:", e);
      return 22;
    }
  }, [selectedMonth, selectedYear]);

  // Nominal Capacity = Staff * Daily Hours * Working Days
  const nominalCapacityHours = useMemo(() => {
    try {
      const val = staffCount * dailyHours * workingDays;
      return isNaN(val) ? 0 : val;
    } catch (e) {
      console.error("Error in nominalCapacityHours useMemo:", e);
      return 0;
    }
  }, [staffCount, dailyHours, workingDays]);

  // Real Capacity = Nominal Capacity * (Efficiency / 100)
  const realCapacityHours = useMemo(() => {
    try {
      const val = Math.round(nominalCapacityHours * (efficiencyPercent / 100));
      return isNaN(val) ? 0 : val;
    } catch (e) {
      console.error("Error in realCapacityHours useMemo:", e);
      return 0;
    }
  }, [nominalCapacityHours, efficiencyPercent]);

  // Filter orders for the selected month and year
  const activeOrdersInPeriod = useMemo(() => {
    try {
      const month = parseInt(selectedMonth);
      const year = parseInt(selectedYear);
      if (isNaN(month) || isNaN(year)) return [];
      
      const safeOrders = Array.isArray(orders) ? orders : [];
      
      return safeOrders.filter(order => {
        if (!order) return false;
        
        // Parse date safely
        const forecastDate = order.forecastDate ? new Date(order.forecastDate) : null;
        if (!forecastDate || isNaN(forecastDate.getTime())) return false;
        
        const isSameMonth = forecastDate.getMonth() === month && forecastDate.getFullYear() === year;
        const isFinished = order.status === "Entregue e Finalizado";
        
        if (isFinished) {
          if (order.completionDate) {
            const compDate = new Date(order.completionDate);
            if (!isNaN(compDate.getTime())) {
              return compDate.getMonth() === month && compDate.getFullYear() === year;
            }
          }
          return false;
        }
        
        return isSameMonth;
      });
    } catch (e) {
      console.error("Error in activeOrdersInPeriod useMemo:", e);
      return [];
    }
  }, [orders, selectedMonth, selectedYear]);

  // Calculate workload and logged hours
  const workloadStats = useMemo(() => {
    try {
      let totalEstimatedHours = 0;
      let totalLoggedHours = 0;
      
      activeOrdersInPeriod.forEach(order => {
        if (!order) return;
        const estimatedDays = Number(order.daysEstimated) || 1;
        totalEstimatedHours += estimatedDays * 8;
        
        if (order.laborLogs && Array.isArray(order.laborLogs)) {
          order.laborLogs.forEach(log => {
            if (log && log.hours) {
              totalLoggedHours += Number(log.hours) || 0;
            }
          });
        }
      });

      const netPendingHours = Math.max(0, totalEstimatedHours - totalLoggedHours);
      
      return {
        estimated: totalEstimatedHours,
        logged: totalLoggedHours,
        pending: netPendingHours
      };
    } catch (e) {
      console.error("Error in workloadStats useMemo:", e);
      return { estimated: 0, logged: 0, pending: 0 };
    }
  }, [activeOrdersInPeriod]);

  // Occupancy rate = Net Pending Hours / Real Capacity Hours
  const occupancyRate = useMemo(() => {
    try {
      const capacity = Number(realCapacityHours);
      if (!capacity || isNaN(capacity)) return 0;
      const rate = Math.round((Number(workloadStats.pending) / capacity) * 100);
      return isNaN(rate) ? 0 : rate;
    } catch (e) {
      console.error("Error in occupancyRate useMemo:", e);
      return 0;
    }
  }, [workloadStats.pending, realCapacityHours]);

  // Status classification based on occupancy rate
  const capacityStatus = useMemo(() => {
    try {
      const rate = isNaN(occupancyRate) ? 0 : occupancyRate;
      if (rate > 95) {
        return {
          label: "OVERLOAD RISK",
          color: "text-rose-500",
          barColor: "bg-rose-500",
          bgColor: "bg-rose-500/10",
          borderColor: "border-rose-500/20",
          desc: "Factory is overloaded. Delay new scheduling or authorize overtime.",
          icon: AlertTriangle
        };
      }
      if (rate > 75) {
        return {
          label: "HIGH DEMAND",
          color: "text-amber-500",
          barColor: "bg-amber-500",
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/20",
          desc: "Approaching capacity threshold. Review active timelines.",
          icon: Activity
        };
      }
      return {
        label: "OPTIMAL CAPACITY",
        color: "text-emerald-500",
        barColor: "bg-emerald-500",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
        desc: "Factory operates at safe levels. Ready to receive new orders.",
        icon: CheckCircle2
      };
    } catch (e) {
      console.error("Error in capacityStatus useMemo:", e);
      return {
        label: "OPTIMAL CAPACITY",
        color: "text-emerald-500",
        barColor: "bg-emerald-500",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
        desc: "Factory operates at safe levels.",
        icon: CheckCircle2
      };
    }
  }, [occupancyRate]);

  // Group active projects by status to detect the Bottleneck (Teoria dos Gargalos)
  const statusGroupData = useMemo(() => {
    try {
      const groups: Record<string, { count: number; hours: number }> = {};
      
      activeOrdersInPeriod.forEach(order => {
        if (!order || order.status === "Entregue e Finalizado" || order.status === "A Definir") return;
        
        const statusStr = order.status || "Plano de corte";
        const hours = (Number(order.daysEstimated) || 1) * 8;
        
        if (!groups[statusStr]) {
          groups[statusStr] = { count: 0, hours: 0 };
        }
        groups[statusStr].count += 1;
        groups[statusStr].hours += hours;
      });

      return Object.entries(groups).map(([name, data]) => ({
        name,
        Projects: data.count,
        Hours: data.hours
      })).sort((a, b) => b.Hours - a.Hours);
    } catch (e) {
      console.error("Error in statusGroupData useMemo:", e);
      return [];
    }
  }, [activeOrdersInPeriod]);

  // Find the current bottleneck (stage with most hours)
  const currentBottleneck = useMemo(() => {
    try {
      if (statusGroupData.length === 0) return null;
      return statusGroupData[0];
    } catch (e) {
      console.error("Error in currentBottleneck useMemo:", e);
      return null;
    }
  }, [statusGroupData]);

  // Recharts Gauge data
  const pieData = useMemo(() => {
    try {
      const rate = isNaN(occupancyRate) ? 0 : Math.min(occupancyRate, 100);
      return [
        { name: "Ocupado", value: rate },
        { name: "Livre", value: Math.max(0, 100 - rate) }
      ];
    } catch (e) {
      console.error("Error in pieData useMemo:", e);
      return [
        { name: "Ocupado", value: 0 },
        { name: "Livre", value: 100 }
      ];
    }
  }, [occupancyRate]);

  const GAUGE_COLORS = useMemo(() => {
    try {
      const rate = isNaN(occupancyRate) ? 0 : occupancyRate;
      return [
        rate > 95 ? "#f43f5e" : rate > 75 ? "#f59e0b" : "#10b981", 
        "rgba(255,255,255,0.05)"
      ];
    } catch (e) {
      return ["#10b981", "rgba(255,255,255,0.05)"];
    }
  }, [occupancyRate]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Month/Year selector & General Summary */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h3 className="text-xl font-black text-luxury tracking-tight shimmer-gold">Production Capacity Analysis</h3>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Factory Resource Allocation & Workload Monitor</p>
        </div>
        
        <div className="flex gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px] h-11 glass-card border-white/5 rounded-xl font-bold text-xs uppercase tracking-wider luxury-shadow">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-card border-white/10 backdrop-blur-xl">
              {MONTH_NAMES.map((name, index) => (
                <SelectItem key={index} value={index.toString()} className="font-bold text-xs uppercase">
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] h-11 glass-card border-white/5 rounded-xl font-bold text-xs uppercase tracking-wider luxury-shadow">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-card border-white/10 backdrop-blur-xl">
              {[`${currentYear}`, `${currentYear + 1}`].map(year => (
                <SelectItem key={year} value={year} className="font-bold text-xs">
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Operational HUD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <PremiumCard className="hover:border-primary/20 rounded-[2rem] luxury-shadow relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:scale-150 transition-all duration-700 text-primary">
            <Users size={100} />
          </div>
          <div className="flex flex-col gap-4 relative z-10">
            <div className="p-3 rounded-2xl bg-primary/10 shadow-xl w-fit">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest text-luxury">Active Labor</p>
              <h3 className="text-3xl font-black tracking-tight text-white">
                <AnimatedCounter value={staffCount} />
                <span className="text-xs font-bold text-muted-foreground ml-2">Marceneiros</span>
              </h3>
              <p className="text-[8px] text-muted-foreground/60 font-bold uppercase mt-1">Working {dailyHours}h/day • {workingDays} workdays</p>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="hover:border-primary/20 rounded-[2rem] luxury-shadow relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:scale-150 transition-all duration-700 text-amber-500">
            <Clock size={100} />
          </div>
          <div className="flex flex-col gap-4 relative z-10">
            <div className="p-3 rounded-2xl bg-amber-500/10 shadow-xl w-fit">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
            <div className="space-y-1">
              <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest text-luxury">Real Capacity</p>
              <h3 className="text-3xl font-black tracking-tight text-amber-500">
                <AnimatedCounter value={realCapacityHours} />
                <span className="text-xs font-bold text-muted-foreground ml-2">Hours</span>
              </h3>
              <p className="text-[8px] text-muted-foreground/60 font-bold uppercase mt-1">Based on {efficiencyPercent}% Factory Efficiency</p>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="hover:border-primary/20 rounded-[2rem] luxury-shadow relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:scale-150 transition-all duration-700 text-blue-500">
            <Hammer size={100} />
          </div>
          <div className="flex flex-col gap-4 relative z-10">
            <div className="p-3 rounded-2xl bg-blue-500/10 shadow-xl w-fit">
              <Hammer className="h-6 w-6 text-blue-500" />
            </div>
            <div className="space-y-1">
              <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest text-luxury">Booked Workload</p>
              <h3 className="text-3xl font-black tracking-tight text-blue-500">
                <AnimatedCounter value={workloadStats.estimated} />
                <span className="text-xs font-bold text-muted-foreground ml-2">Hours</span>
              </h3>
              <p className="text-[8px] text-muted-foreground/60 font-bold uppercase mt-1">Across {activeOrdersInPeriod.length} active projects</p>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="hover:border-primary/20 rounded-[2rem] luxury-shadow relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:scale-150 transition-all duration-700 text-emerald-500">
            <CheckCircle2 size={100} />
          </div>
          <div className="flex flex-col gap-4 relative z-10">
            <div className="p-3 rounded-2xl bg-emerald-500/10 shadow-xl w-fit">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest text-luxury">Labor Delivered</p>
              <h3 className="text-3xl font-black tracking-tight text-emerald-500">
                <AnimatedCounter value={workloadStats.logged} />
                <span className="text-xs font-bold text-muted-foreground ml-2">Hours</span>
              </h3>
              <p className="text-[8px] text-muted-foreground/60 font-bold uppercase mt-1">Time logged by workers this month</p>
            </div>
          </div>
        </PremiumCard>
      </div>

      {/* Main Analysis Panel (Gauge & Bottleneck Analyzer) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gauge Occupancy Chart */}
        <Card className="border border-white/10 backdrop-blur-xl bg-card/60 shadow-xl rounded-[2.5rem] p-6 lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest text-luxury mb-4">Capacity Load Factor</h3>
            
            <div className="flex items-center justify-center h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={80}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={0}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={GAUGE_COLORS[index]} stroke="transparent" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-black tracking-tighter text-white shimmer-gold">{occupancyRate}%</span>
                <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mt-1">Ocupado</span>
              </div>
            </div>
          </div>

          <div className={cn("p-4 rounded-2xl border flex items-start gap-3 mt-4", capacityStatus.bgColor, capacityStatus.borderColor)}>
            <capacityStatus.icon className={cn("h-5 w-5 shrink-0 mt-0.5", capacityStatus.color)} />
            <div className="space-y-0.5">
              <span className={cn("text-[9px] font-black uppercase tracking-widest", capacityStatus.color)}>
                {capacityStatus.label}
              </span>
              <p className="text-xs text-muted-foreground leading-tight font-medium">
                {capacityStatus.desc}
              </p>
            </div>
          </div>
        </Card>

        {/* Bottleneck Analyzer (Teoria dos Gargalos) */}
        <Card className="border border-white/10 backdrop-blur-xl bg-card/60 shadow-xl rounded-[2.5rem] p-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest text-luxury">Process Bottleneck Analyzer</h3>
              <span className="text-[8px] font-bold text-muted-foreground/60 uppercase">Active Stages Only</span>
            </div>

            {statusGroupData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full items-center">
                
                {/* Horizontal Bar Chart */}
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statusGroupData.slice(0, 5)}
                      layout="vertical"
                      margin={{ top: 0, right: 10, left: 10, bottom: 0 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', fontWeight: 'bold' }}
                        width={110}
                        stroke="transparent"
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.02)" }}
                        contentStyle={{
                          backgroundColor: "rgba(20,20,20,0.9)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          fontSize: 10
                        }}
                      />
                      <Bar dataKey="Hours" fill="#D4AF37" radius={[0, 8, 8, 0]} barSize={12}>
                        {statusGroupData.slice(0, 5).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={index === 0 ? "hsl(var(--primary))" : "rgba(255,255,255,0.15)"} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Bottleneck Executive Summary Card */}
                <div className="space-y-4">
                  {currentBottleneck && (
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-primary animate-pulse" />
                        <span className="text-[10px] font-black uppercase text-primary tracking-wider">Critical Bottleneck Stage</span>
                      </div>
                      <div>
                        <h4 className="text-md font-black text-white uppercase">{currentBottleneck.name}</h4>
                        <p className="text-xs text-muted-foreground leading-tight mt-1">
                          This stage currently holds **{currentBottleneck.Hours} hours** of workload across **{currentBottleneck.Projects} projects**. Monitor closely to avoid shipping delays.
                        </p>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground/60 font-black uppercase">
                        <span>Workload: {currentBottleneck.Hours}h</span>
                        <span>Projects: {currentBottleneck.Projects}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-[180px] flex items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02] text-center p-6">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No active fabrication queue for this period.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Production Queue Details */}
      <Card className="border border-white/10 backdrop-blur-xl bg-card/60 shadow-xl rounded-[2.5rem] overflow-hidden">
        <div className="p-6 bg-muted/20 border-b border-white/5 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-white">Capacity Allocation Queue</h4>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Individual Project Workload Contributions</p>
          </div>
          <span className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase">
            {activeOrdersInPeriod.length} Projects in {MONTH_NAMES[parseInt(selectedMonth)]}
          </span>
        </div>
        
        <div className="overflow-x-auto touch-pan-x webkit-overflow-scrolling-touch">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="p-4 pl-6 text-[10px] font-black uppercase text-muted-foreground tracking-widest">OS Number</th>
                <th className="p-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Client / Project</th>
                <th className="p-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Stage</th>
                <th className="p-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Forecast Date</th>
                <th className="p-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Days Est.</th>
                <th className="p-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right">Workload (Hours)</th>
              </tr>
            </thead>
            <tbody>
              {activeOrdersInPeriod.length > 0 ? (
                activeOrdersInPeriod.map((order, idx) => {
                  const days = Number(order.daysEstimated) || 1;
                  const hours = days * 8;
                  const workloadPercent = realCapacityHours > 0 ? ((hours / realCapacityHours) * 100).toFixed(1) : 0;
                  
                  return (
                    <tr key={order.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                      <td className="p-4 pl-6">
                        <span className="text-xs font-black text-primary uppercase tracking-wider">{order.ticketNumber}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white group-hover:text-primary transition-colors">{order.client}</span>
                          <span className="text-[9px] text-muted-foreground uppercase">{order.action}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-white/5 border border-white/10 rounded-md">
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-medium text-slate-300">
                          {order.forecastDate ? new Date(order.forecastDate).toLocaleDateString("pt-BR") : "S/P"}
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold text-xs text-white">
                        {days}d
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-black text-white">{hours}h</span>
                          <span className="text-[8px] font-bold text-muted-foreground/60 uppercase">({workloadPercent}% Load)</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground/60 font-bold uppercase text-[10px] tracking-widest">
                    No projects found for the selected month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default CapacityTab;
