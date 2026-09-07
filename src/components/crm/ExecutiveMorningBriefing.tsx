import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/salesUtils";
import { Link } from "react-router-dom";
import {
  Sun,
  Calendar,
  DollarSign,
  AlertTriangle,
  Hammer,
  Clock,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  PhoneCall,
  Sparkles,
} from "lucide-react";
import { format, addDays } from "date-fns";

export const ExecutiveMorningBriefing: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [todayReceivables, setTodayReceivables] = useState<number>(0);
  const [todayPayables, setTodayPayables] = useState<number>(0);
  const [urgentOrders, setUrgentOrders] = useState<any[]>([]);
  const [staleLeadsCount, setStaleLeadsCount] = useState(0);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const in7DaysStr = format(addDays(new Date(), 7), "yyyy-MM-dd");

  useEffect(() => {
    loadMorningBriefing();
  }, []);

  const loadMorningBriefing = async () => {
    setLoading(true);
    try {
      // 1. Tarefas e compromissos do dia
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("due_date", todayStr)
        .eq("status", "pending")
        .limit(4);

      setTodayTasks(tasks || []);

      // 2. Financeiro do dia (a receber e a pagar)
      const { data: txs } = await supabase
        .from("transactions")
        .select("amount, type, status")
        .eq("due_date", todayStr)
        .eq("status", "pendente");

      let rec = 0;
      let pay = 0;
      (txs || []).forEach((t: any) => {
        if (t.type === "receita") rec += Number(t.amount) || 0;
        if (t.type === "despesa") pay += Number(t.amount) || 0;
      });
      setTodayReceivables(rec);
      setTodayPayables(pay);

      // 3. Ordens de Serviço com entrega para os próximos 7 dias
      const { data: orders } = await supabase
        .from("service_orders")
        .select("*")
        .neq("status", "Entregue e Finalizado")
        .lte("forecast_date", new Date(in7DaysStr).toISOString())
        .order("forecast_date", { ascending: true })
        .limit(3);

      setUrgentOrders(orders || []);

      // 4. Leads parados há mais de 20 dias
      const twentyDaysAgo = format(addDays(new Date(), -20), "yyyy-MM-dd");
      const { count } = await supabase
        .from("sales")
        .select("*", { count: "exact", head: true })
        .not("status", "in", '("fechado","nao_fechou","congelado","pos_venda")')
        .lte("created_at", twentyDaysAgo);

      setStaleLeadsCount(count || 0);
    } catch (e) {
      console.error("Erro ao carregar briefing matinal:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="executive-card p-6 sm:p-7 rounded-[2.5rem] border-metallic relative overflow-hidden space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
            <Sun className="h-5 w-5 animate-[spin_12s_linear_infinite]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase font-bold text-amber-400 tracking-wider">
                Centro de Comando Matinal
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">• Hoje, {format(new Date(), "dd/MM/yyyy")}</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              O que você precisa priorizar hoje na BJL
            </h3>
          </div>
        </div>

        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 self-start sm:self-auto flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
          Operação em Tempo Real
        </span>
      </div>

      {/* Grid com os 4 Pilares do Dia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
        {/* Pilar 1: Financeiro Hoje */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 hover:border-emerald-500/30 transition-all group">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase font-bold tracking-wider">Caixa Previsto Hoje</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="space-y-0.5">
            <span className="text-xl font-black text-emerald-400 font-mono block">
              +{formatCurrency(todayReceivables)}
            </span>
            <span className="text-[10px] text-muted-foreground block font-mono">
              A Pagar: <strong className="text-rose-400">-{formatCurrency(todayPayables)}</strong>
            </span>
          </div>
          <Link
            to="/admin/financeiro"
            className="text-[10px] font-bold text-primary hover:text-primary/80 flex items-center gap-1 pt-1"
          >
            <span>Ver Fluxo de Caixa</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Pilar 2: Tarefas e Medições de Hoje */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 hover:border-primary/30 transition-all group">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase font-bold tracking-wider">Compromissos de Hoje</span>
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-0.5">
            <span className="text-xl font-black text-white font-mono block">
              {todayTasks.length} {todayTasks.length === 1 ? "tarefa" : "tarefas"}
            </span>
            <span className="text-[10px] text-muted-foreground block truncate">
              {todayTasks[0]?.title || "Nenhuma pendência crítica"}
            </span>
          </div>
          <Link
            to="/admin/tarefas"
            className="text-[10px] font-bold text-primary hover:text-primary/80 flex items-center gap-1 pt-1"
          >
            <span>Abrir Agenda de Tarefas</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Pilar 3: Entregas da Fábrica (Próximos 7 dias) */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 hover:border-blue-500/30 transition-all group">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase font-bold tracking-wider">Entregas Desta Semana</span>
            <Hammer className="h-4 w-4 text-blue-400" />
          </div>
          <div className="space-y-0.5">
            <span className="text-xl font-black text-blue-400 font-mono block">
              {urgentOrders.length} {urgentOrders.length === 1 ? "projeto" : "projetos"}
            </span>
            <span className="text-[10px] text-muted-foreground block truncate">
              {urgentOrders[0]?.client ? `${urgentOrders[0].client} (${urgentOrders[0].action})` : "Sem entregas imediatas"}
            </span>
          </div>
          <Link
            to="/admin/ordem-servico"
            className="text-[10px] font-bold text-primary hover:text-primary/80 flex items-center gap-1 pt-1"
          >
            <span>Ver Fábrica & Montagem</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Pilar 4: Leads em Risco de Esfriar */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 hover:border-amber-500/30 transition-all group">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase font-bold tracking-wider">Leads sem Avanço (+20d)</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="space-y-0.5">
            <span className="text-xl font-black text-amber-400 font-mono block">
              {staleLeadsCount} orçamentos
            </span>
            <span className="text-[10px] text-muted-foreground block">
              Exigem contato para não esfriar
            </span>
          </div>
          <Link
            to="/admin"
            className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 pt-1"
          >
            <span>Reativar no CRM</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};
