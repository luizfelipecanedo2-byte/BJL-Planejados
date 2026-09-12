import React, { useState, useEffect, useMemo } from "react";
import { Sale } from "@/types/sale";
import { formatCurrency } from "@/lib/salesUtils";
import {
  calculateMonthlyCommission,
  checkExistingCommissionTransaction,
  launchCommissionManually,
  MONTH_NAMES,
  COMMISSION_PERCENTAGE,
  SELLER_NAME,
} from "@/services/commissionService";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Button } from "@/components/ui/button";
import {
  Coins,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  FileCheck2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FelipeCommissionCardProps {
  sales: Sale[];
  targetYear: string;
  targetMonth?: number; // 0-11
  isDailyView?: boolean;
}

export const FelipeCommissionCard: React.FC<FelipeCommissionCardProps> = ({
  sales,
  targetYear,
  targetMonth,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [existingTransaction, setExistingTransaction] = useState<any>(null);
  const [checkingTx, setCheckingTx] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  const today = new Date();
  const currentYearNum = today.getFullYear();
  const currentMonthNum = today.getMonth();

  // Se targetMonth estiver definido, usa ele; senão usa o mês corrente
  const evalMonth = targetMonth !== undefined ? targetMonth : currentMonthNum;
  const evalYear = parseInt(targetYear, 10) || currentYearNum;

  const isCurrentCalendarMonth = evalMonth === currentMonthNum && evalYear === currentYearNum;

  // Calcula os dados da comissão do mês
  const commissionSummary = useMemo(() => {
    return calculateMonthlyCommission(sales, evalYear, evalMonth);
  }, [sales, evalYear, evalMonth]);

  // Próximo mês para vencimento (dia 10)
  const nextMonthIndex = evalMonth === 11 ? 0 : evalMonth + 1;
  const nextMonthYear = evalMonth === 11 ? evalYear + 1 : evalYear;
  const paymentDateFormatted = `10/${String(nextMonthIndex + 1).padStart(2, "0")}/${nextMonthYear}`;

  // Verifica status no financeiro quando abre o diálogo
  useEffect(() => {
    if (isDialogOpen) {
      checkStatus();
    }
  }, [isDialogOpen, evalYear, evalMonth]);

  const checkStatus = async () => {
    setCheckingTx(true);
    try {
      const tx = await checkExistingCommissionTransaction(evalYear, evalMonth);
      setExistingTransaction(tx);
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingTx(false);
    }
  };

  const handleManualLaunch = async () => {
    setIsLaunching(true);
    try {
      const res = await launchCommissionManually(evalYear, evalMonth, sales);
      if (res.success) {
        setExistingTransaction(res.transaction);
      }
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <>
      <div className="executive-card p-6 sm:p-7 rounded-[2.5rem] border-metallic flex flex-col justify-between relative overflow-hidden group shadow-2xl">
        {/* Glow de fundo dourado */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
          {/* Top Row: Ícone + Título + Badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                <Coins className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black uppercase tracking-wider text-white font-['Cinzel']">
                    Comissão {SELLER_NAME}
                  </h3>
                  <span className="text-[10px] font-black font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    3%
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <span>Vendedor Exclusivo</span>
                  <span>•</span>
                  <span className="text-amber-300/90 font-medium">
                    {commissionSummary.monthName}/{evalYear}
                  </span>
                </p>
              </div>
            </div>

            {/* Badge de Tempo Real ou Referência */}
            {isCurrentCalendarMonth ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-mono font-bold shrink-0">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Tempo Real</span>
              </div>
            ) : (
              <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground text-[10px] font-mono font-bold shrink-0">
                <span>{commissionSummary.monthName}</span>
              </div>
            )}
          </div>

          {/* Valor Principal em Destaque */}
          <div className="space-y-2 my-1">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl sm:text-5xl font-black metric-value tracking-tight text-amber-400 font-mono drop-shadow-[0_2px_10px_rgba(245,158,11,0.3)]">
                <AnimatedCounter
                  value={commissionSummary.commissionAmount}
                  formatter={formatCurrency}
                />
              </div>
            </div>

            {/* Métricas Auxiliares */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-mono">
              <span className="flex items-center gap-1 text-slate-300">
                Base Vendas:{" "}
                <strong className="text-white font-bold">
                  {formatCurrency(commissionSummary.totalRevenue)}
                </strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-300">
                <FileCheck2 className="h-3.5 w-3.5 text-emerald-400 inline" />
                <strong className="text-emerald-400 font-bold">
                  {commissionSummary.closedCount}{" "}
                  {commissionSummary.closedCount === 1 ? "venda" : "vendas"}
                </strong>
              </span>
            </div>
          </div>

          {/* Rodapé Informativo: Regra de Virada e Vencimento */}
          <div className="pt-3 border-t border-white/5 space-y-2 text-[10px] font-mono">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-amber-400" />
                Vencimento do Pagamento:
              </span>
              <strong className="text-amber-300 font-bold">{paymentDateFormatted}</strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-muted-foreground/80">
                <RotateCcw className="h-3 w-3 text-slate-400" />
                Virada de mês: zera e computa o novo
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDialogOpen(true)}
                className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 rounded-lg gap-1 transition-all"
              >
                <span>Extrato</span>
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Detalhado de Extrato da Comissão */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl bg-slate-950 border-white/10 text-white rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-2 border-b border-white/10 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold font-['Cinzel'] tracking-wide">
                    Extrato de Comissão Comercial
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Vendedor: <strong className="text-white">{SELLER_NAME}</strong> • Referência:{" "}
                    <strong className="text-amber-400">
                      {commissionSummary.monthName} de {evalYear}
                    </strong>
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Resumo do Período */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                Faturamento Fechado
              </span>
              <div className="text-lg font-black text-white font-mono">
                {formatCurrency(commissionSummary.totalRevenue)}
              </div>
              <span className="text-[9px] text-muted-foreground">
                {commissionSummary.closedCount} contratos fechados
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                Comissão a Receber (3%)
              </span>
              <div className="text-lg font-black text-amber-400 font-mono">
                {formatCurrency(commissionSummary.commissionAmount)}
              </div>
              <span className="text-[9px] text-amber-300/80">3% fixo sobre cada venda</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                Previsão de Pagamento
              </span>
              <div className="text-lg font-black text-white font-mono">{paymentDateFormatted}</div>
              <span className="text-[9px] text-muted-foreground">Dia 10 do mês subsequente</span>
            </div>
          </div>

          {/* Status do Lançamento no Financeiro */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Receipt className="h-4 w-4 text-amber-400" />
                <span>Status da Automação Financeira:</span>
              </div>

              {existingTransaction ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>
                    {existingTransaction.status === "paid" ? "Pago no Financeiro" : "Lançado no Contas a Pagar"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold">
                  <Clock className="h-3 w-3" />
                  <span>
                    {isCurrentCalendarMonth
                      ? "Programado para dia 01"
                      : "Aguardando Lançamento"}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {existingTransaction ? (
                <span>
                  O lançamento de comissão já está cadastrado em Contas a Pagar no Financeiro com vencimento em{" "}
                  <strong className="text-white">
                    {new Date(existingTransaction.due_date + "T12:00:00").toLocaleDateString("pt-BR")}
                  </strong>
                  .
                </span>
              ) : (
                <span>
                  Todo dia primeiro o sistema apura o mês que fechou e cria automaticamente a despesa no contas a pagar
                  para ser quitada no dia 10. Ao virar o mês, o card do CRM zera automaticamente para o novo ciclo.
                </span>
              )}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
              <Link
                to="/financeiro?category=Despesas+com+vendas"
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold hover:underline"
              >
                <span>Acessar Módulo Financeiro</span>
                <ExternalLink className="h-3 w-3" />
              </Link>

              {!existingTransaction && commissionSummary.commissionAmount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleManualLaunch}
                  disabled={isLaunching}
                  className="h-8 text-xs gap-1.5 border-amber-500/30 hover:bg-amber-500/10 text-amber-400 rounded-xl"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isLaunching ? "Lançando..." : "Lançar no Financeiro Agora"}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Relação de Vendas Fechadas no Mês */}
          <div className="space-y-3 mt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-emerald-400" />
              <span>Vendas Fechadas que compõem este valor ({commissionSummary.items.length})</span>
            </h4>

            {commissionSummary.items.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-white/10 rounded-2xl text-xs text-muted-foreground">
                Nenhum contrato fechado registrado para este mês ({commissionSummary.monthName}/{evalYear}).
              </div>
            ) : (
              <div className="border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5 bg-white/[0.02]">
                {commissionSummary.items.map((item, idx) => (
                  <div
                    key={item.sale.id || idx}
                    className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-white font-semibold">
                          {item.sale.clientName}
                        </strong>
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                          Fechado
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 font-mono">
                        <span>{item.sale.product || "Projeto Geral"}</span>
                        <span>•</span>
                        <span>Fechamento: {item.closedDateFormatted}</span>
                      </div>
                    </div>

                    <div className="text-right sm:shrink-0 font-mono space-y-0.5">
                      <div className="text-xs text-muted-foreground">
                        Valor Venda: <span className="text-white font-medium">{formatCurrency(item.saleValue)}</span>
                      </div>
                      <div className="text-sm font-black text-amber-400">
                        Comissão (3%): {formatCurrency(item.commissionValue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
