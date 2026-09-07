import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Sale } from "@/types/sale";
import { formatCurrency } from "@/lib/salesUtils";
import {
  Sparkles,
  Hammer,
  DollarSign,
  CheckSquare,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Loader2,
  Building2,
  ArrowRight,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { WhatsAppQuickDialog } from "./WhatsAppQuickDialog";

export interface SaleClosedWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  onWorkflowCompleted?: () => void;
}

export const SaleClosedWorkflowDialog: React.FC<SaleClosedWorkflowDialogProps> = ({
  open,
  onOpenChange,
  sale,
  onWorkflowCompleted,
}) => {
  if (!sale) return null;

  const [loading, setLoading] = useState(false);
  const [createServiceOrder, setCreateServiceOrder] = useState(true);
  const [createFinancials, setCreateFinancials] = useState(true);
  const [createTasks, setCreateTasks] = useState(true);
  const [openWhatsApp, setOpenWhatsApp] = useState(false);

  // Dados da OS
  const defaultForecastDate = format(addDays(new Date(), 35), "yyyy-MM-dd");
  const [forecastDate, setForecastDate] = useState(defaultForecastDate);
  const [osAction, setOsAction] = useState(sale.product || "Projeto Completo de Móveis Planejados");

  // Dados do Financeiro
  const [paymentPlan, setPaymentPlan] = useState<"50_50" | "vista" | "3x" | "4x">("50_50");
  const [entryPaid, setEntryPaid] = useState(true);

  // Tarefas padrão de fábrica
  const [selectedTasks, setSelectedTasks] = useState<Record<string, boolean>>({
    task1: true, // Medição fina
    task2: true, // Plano de corte
    task3: true, // Requisição no estoque
    task4: true, // Usinagem e montagem
    task5: true, // Instalação
  });

  const totalValue = sale.totalValue || 0;

  // Cálculo das parcelas
  const installments = React.useMemo(() => {
    const today = new Date();
    if (paymentPlan === "vista") {
      return [
        {
          desc: `Pagamento Integral - ${sale.clientName}`,
          amount: totalValue,
          due: format(today, "yyyy-MM-dd"),
          paid: entryPaid,
        },
      ];
    }
    if (paymentPlan === "50_50") {
      const half = totalValue / 2;
      return [
        {
          desc: `Entrada (50%) - ${sale.clientName}`,
          amount: half,
          due: format(today, "yyyy-MM-dd"),
          paid: entryPaid,
        },
        {
          desc: `Entrega / Final (50%) - ${sale.clientName}`,
          amount: totalValue - half,
          due: forecastDate,
          paid: false,
        },
      ];
    }
    if (paymentPlan === "3x") {
      const p = Math.round((totalValue / 3) * 100) / 100;
      return [
        {
          desc: `Entrada (1/3) - ${sale.clientName}`,
          amount: p,
          due: format(today, "yyyy-MM-dd"),
          paid: entryPaid,
        },
        {
          desc: `Parcela 2/3 - ${sale.clientName}`,
          amount: p,
          due: format(addDays(today, 30), "yyyy-MM-dd"),
          paid: false,
        },
        {
          desc: `Parcela 3/3 - ${sale.clientName}`,
          amount: totalValue - p * 2,
          due: format(addDays(today, 60), "yyyy-MM-dd"),
          paid: false,
        },
      ];
    }
    // 4x
    const p = Math.round((totalValue / 4) * 100) / 100;
    return [
      {
        desc: `Entrada (1/4) - ${sale.clientName}`,
        amount: p,
        due: format(today, "yyyy-MM-dd"),
        paid: entryPaid,
      },
      {
        desc: `Parcela 2/4 - ${sale.clientName}`,
        amount: p,
        due: format(addDays(today, 30), "yyyy-MM-dd"),
        paid: false,
      },
      {
        desc: `Parcela 3/4 - ${sale.clientName}`,
        amount: p,
        due: format(addDays(today, 60), "yyyy-MM-dd"),
        paid: false,
      },
      {
        desc: `Parcela 4/4 - ${sale.clientName}`,
        amount: totalValue - p * 3,
        due: format(addDays(today, 90), "yyyy-MM-dd"),
        paid: false,
      },
    ];
  }, [totalValue, paymentPlan, entryPaid, forecastDate, sale.clientName]);

  const handleExecuteIntegration = async () => {
    setLoading(true);
    let createdServiceOrderId: string | null = null;
    let createdTicketNumber = "";

    try {
      // 1. CRIAR ORDEM DE SERVIÇO NA FÁBRICA
      if (createServiceOrder) {
        const ticketNum = `OS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        createdTicketNumber = ticketNum;

        const osPayload = {
          ticket_number: ticketNum,
          open_date: new Date().toISOString(),
          client: sale.clientName,
          client_id: sale.id, // Vínculo de referência
          type: "Fabricação",
          action: osAction,
          status: "Pronto para produção",
          forecast_date: new Date(forecastDate).toISOString(),
          amount: totalValue,
          notes: `Contrato oficializado via CRM. Contato: ${sale.clientPhone || "N/A"}. ${sale.notes || ""}`,
          priority_level: "normal",
          production_priority: 1,
        };

        const { data: osData, error: osError } = await supabase
          .from("service_orders")
          .insert([osPayload])
          .select()
          .single();

        if (osError) {
          console.error("Erro ao criar OS:", osError);
          toast.error("Aviso: Falha ao gerar OS automática.");
        } else if (osData) {
          createdServiceOrderId = osData.id;
        }
      }

      // 2. GERAR CONTAS A RECEBER NO FINANCEIRO
      if (createFinancials && installments.length > 0) {
        const txPayloads = installments.map((inst) => ({
          description: inst.desc,
          amount: inst.amount,
          type: "receita",
          category: "Venda de Projetos",
          subcategory: "Móveis Sob Medida",
          contact: sale.clientName,
          competence_date: new Date().toISOString().split("T")[0],
          due_date: inst.due,
          payment_date: inst.paid ? new Date().toISOString().split("T")[0] : null,
          status: inst.paid ? "pago" : "pendente",
          order_service: createdTicketNumber || sale.product || "Contrato CRM",
          payment_method: inst.paid ? "PIX" : "A Definir",
        }));

        const { error: txError } = await supabase.from("transactions").insert(txPayloads);
        if (txError) {
          console.error("Erro ao gerar parcelas financeiras:", txError);
          toast.error("Aviso: Falha ao registrar parcelas no financeiro.");
        }
      }

      // 3. GERAR AS TAREFAS PADRÃO DE PRODUÇÃO
      if (createTasks) {
        const today = new Date();
        const taskList = [];

        if (selectedTasks.task1) {
          taskList.push({
            title: `Medição fina in loco e validação de pontos elétricos`,
            description: `Cliente: ${sale.clientName} | Fone: ${sale.clientPhone || "N/A"} | Projeto: ${osAction}`,
            status: "pending",
            priority: "high",
            project_name: sale.clientName,
            due_date: format(addDays(today, 3), "yyyy-MM-dd"),
            service_order_id: createdServiceOrderId,
            created_by: "Sistema Automático",
          });
        }
        if (selectedTasks.task2) {
          taskList.push({
            title: `Elaboração e conferência do plano de corte no Promob/Corte Certo`,
            description: `Gerar listagem de peças, furação e etiquetas de caixaria.`,
            status: "pending",
            priority: "normal",
            project_name: sale.clientName,
            due_date: format(addDays(today, 7), "yyyy-MM-dd"),
            service_order_id: createdServiceOrderId,
            created_by: "Sistema Automático",
          });
        }
        if (selectedTasks.task3) {
          taskList.push({
            title: `Separação e requisição de chapas MDF e ferragens no estoque`,
            description: `Conferir estoque de MDF, fitas de borda e ferragens do projeto.`,
            status: "pending",
            priority: "normal",
            project_name: sale.clientName,
            due_date: format(addDays(today, 10), "yyyy-MM-dd"),
            service_order_id: createdServiceOrderId,
            created_by: "Sistema Automático",
          });
        }
        if (selectedTasks.task4) {
          taskList.push({
            title: `Corte, fitamento e montagem dos módulos na fábrica`,
            description: `Linha de montagem: caixaria, frentes, gavetas e tamponamentos.`,
            status: "pending",
            priority: "normal",
            project_name: sale.clientName,
            due_date: format(addDays(today, 25), "yyyy-MM-dd"),
            service_order_id: createdServiceOrderId,
            created_by: "Sistema Automático",
          });
        }
        if (selectedTasks.task5) {
          taskList.push({
            title: `Transporte, entrega e início da montagem no cliente`,
            description: `Equipe de montagem in loco com entrega técnica final.`,
            status: "pending",
            priority: "high",
            project_name: sale.clientName,
            due_date: forecastDate,
            service_order_id: createdServiceOrderId,
            created_by: "Sistema Automático",
          });
        }

        if (taskList.length > 0) {
          const { error: tasksError } = await supabase.from("tasks").insert(taskList);
          if (tasksError) {
            console.error("Erro ao gerar tarefas:", tasksError);
          }
        }
      }

      toast.success("🎉 Integração Concluída! OS, Financeiro e Tarefas gerados com sucesso!");
      onOpenChange(false);
      if (onWorkflowCompleted) onWorkflowCompleted();

      // Sugerir abrir WhatsApp de boas-vindas
      setOpenWhatsApp(true);
    } catch (err) {
      console.error("Erro no workflow de fechamento:", err);
      toast.error("Ocorreu um erro ao processar as integrações.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[650px] bg-card/95 backdrop-blur-2xl border-white/10 text-white rounded-[2.5rem] p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="h-5 w-5 text-amber-400" />
              </span>
              <div>
                <DialogTitle className="text-xl font-bold text-white tracking-tight">
                  Contrato Fechado! Integrar Sistema
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Automatize a criação da Ordem de Serviço, parcelas e tarefas de fábrica para{" "}
                  <strong className="text-white">{sale.clientName}</strong>
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {/* CARD 1: ORDEM DE SERVIÇO NA FÁBRICA */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="create-os"
                    checked={createServiceOrder}
                    onCheckedChange={(c) => setCreateServiceOrder(!!c)}
                    className="border-white/20 data-[state=checked]:bg-primary"
                  />
                  <Label htmlFor="create-os" className="text-sm font-bold text-white cursor-pointer flex items-center gap-1.5">
                    <Hammer className="h-4 w-4 text-amber-400" />
                    1. Gerar Ordem de Serviço (Fábrica)
                  </Label>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Automático
                </span>
              </div>

              {createServiceOrder && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Ambientes / Projeto</Label>
                    <Input
                      value={osAction}
                      onChange={(e) => setOsAction(e.target.value)}
                      className="bg-black/40 border-white/10 text-white rounded-xl text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Previsão de Entrega</Label>
                    <Input
                      type="date"
                      value={forecastDate}
                      onChange={(e) => setForecastDate(e.target.value)}
                      className="bg-black/40 border-white/10 text-white rounded-xl text-xs h-9"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* CARD 2: FINANCEIRO (CONTAS A RECEBER) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="create-fin"
                    checked={createFinancials}
                    onCheckedChange={(c) => setCreateFinancials(!!c)}
                    className="border-white/20 data-[state=checked]:bg-primary"
                  />
                  <Label htmlFor="create-fin" className="text-sm font-bold text-white cursor-pointer flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                    2. Lançar Contas a Receber (Financeiro)
                  </Label>
                </div>
                <span className="text-xs font-mono font-black text-primary">
                  {formatCurrency(totalValue)}
                </span>
              </div>

              {createFinancials && (
                <div className="space-y-3 pt-1 text-xs">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentPlan("50_50")}
                      className={`px-3 py-1.5 rounded-xl font-bold text-[11px] border transition-all ${
                        paymentPlan === "50_50"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white/5 border-white/10 text-muted-foreground hover:text-white"
                      }`}
                    >
                      50% Entrada + 50% Entrega
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentPlan("3x")}
                      className={`px-3 py-1.5 rounded-xl font-bold text-[11px] border transition-all ${
                        paymentPlan === "3x"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white/5 border-white/10 text-muted-foreground hover:text-white"
                      }`}
                    >
                      Entrada + 30d + 60d (3x)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentPlan("4x")}
                      className={`px-3 py-1.5 rounded-xl font-bold text-[11px] border transition-all ${
                        paymentPlan === "4x"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white/5 border-white/10 text-muted-foreground hover:text-white"
                      }`}
                    >
                      4x Parcelado
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentPlan("vista")}
                      className={`px-3 py-1.5 rounded-xl font-bold text-[11px] border transition-all ${
                        paymentPlan === "vista"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white/5 border-white/10 text-muted-foreground hover:text-white"
                      }`}
                    >
                      À Vista
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox
                      id="entry-paid"
                      checked={entryPaid}
                      onCheckedChange={(c) => setEntryPaid(!!c)}
                      className="border-white/20 data-[state=checked]:bg-emerald-500"
                    />
                    <Label htmlFor="entry-paid" className="text-xs text-muted-foreground cursor-pointer">
                      Marcar entrada como <strong className="text-emerald-400">já paga</strong> no caixa hoje
                    </Label>
                  </div>

                  {/* Resumo das Parcelas */}
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5 font-mono text-[11px]">
                    {installments.map((inst, i) => (
                      <div key={i} className="flex justify-between items-center text-muted-foreground">
                        <span className="truncate pr-2">{inst.desc}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-white font-bold">{formatCurrency(inst.amount)}</span>
                          <span className="text-[10px] text-muted-foreground">({inst.due})</span>
                          {inst.paid ? (
                            <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">PAGO</span>
                          ) : (
                            <span className="text-[9px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">PENDENTE</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CARD 3: TAREFAS DE MARCADORES/MONTAGEM */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="create-tasks"
                    checked={createTasks}
                    onCheckedChange={(c) => setCreateTasks(!!c)}
                    className="border-white/20 data-[state=checked]:bg-primary"
                  />
                  <Label htmlFor="create-tasks" className="text-sm font-bold text-white cursor-pointer flex items-center gap-1.5">
                    <CheckSquare className="h-4 w-4 text-sky-400" />
                    3. Criar as 5 Tarefas Padrão de Produção
                  </Label>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">Etapas Moveleiras</span>
              </div>

              {createTasks && (
                <div className="space-y-2 pt-1 text-xs">
                  <label className="flex items-center gap-2 text-muted-foreground hover:text-white cursor-pointer">
                    <Checkbox
                      checked={selectedTasks.task1}
                      onCheckedChange={(c) => setSelectedTasks((p) => ({ ...p, task1: !!c }))}
                      className="border-white/20"
                    />
                    <span>1. Medição técnica fina in loco e validação de pontos (3 dias)</span>
                  </label>

                  <label className="flex items-center gap-2 text-muted-foreground hover:text-white cursor-pointer">
                    <Checkbox
                      checked={selectedTasks.task2}
                      onCheckedChange={(c) => setSelectedTasks((p) => ({ ...p, task2: !!c }))}
                      className="border-white/20"
                    />
                    <span>2. Plano de corte e etiquetagem no Promob / Corte Certo (7 dias)</span>
                  </label>

                  <label className="flex items-center gap-2 text-muted-foreground hover:text-white cursor-pointer">
                    <Checkbox
                      checked={selectedTasks.task3}
                      onCheckedChange={(c) => setSelectedTasks((p) => ({ ...p, task3: !!c }))}
                      className="border-white/20"
                    />
                    <span>3. Separação de chapas MDF, fitas e ferragens no estoque (10 dias)</span>
                  </label>

                  <label className="flex items-center gap-2 text-muted-foreground hover:text-white cursor-pointer">
                    <Checkbox
                      checked={selectedTasks.task4}
                      onCheckedChange={(c) => setSelectedTasks((p) => ({ ...p, task4: !!c }))}
                      className="border-white/20"
                    />
                    <span>4. Usinagem, fitamento e pré-montagem na marcenaria (25 dias)</span>
                  </label>

                  <label className="flex items-center gap-2 text-muted-foreground hover:text-white cursor-pointer">
                    <Checkbox
                      checked={selectedTasks.task5}
                      onCheckedChange={(c) => setSelectedTasks((p) => ({ ...p, task5: !!c }))}
                      className="border-white/20"
                    />
                    <span>5. Transporte e equipe de montagem no cliente (Previsão de Entrega)</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-white/10 flex sm:justify-between items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-white/10 text-xs hover:bg-white/5"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={handleExecuteIntegration}
              disabled={loading}
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center gap-2 shadow-lg shadow-primary/20 px-6"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Integrando Sistema...</span>
                </>
              ) : (
                <>
                  <span>Executar Integração Completa</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Modal pós-fechamento */}
      {openWhatsApp && (
        <WhatsAppQuickDialog
          open={openWhatsApp}
          onOpenChange={setOpenWhatsApp}
          clientName={sale.clientName}
          clientPhone={sale.clientPhone}
          projectName={sale.product}
          totalValue={sale.totalValue}
          deliveryDate={forecastDate}
          context="closed"
        />
      )}
    </>
  );
};
