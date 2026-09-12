import { supabase } from "@/lib/supabase";
import { Sale } from "@/types/sale";
import { toast } from "sonner";
import { createNotification } from "@/lib/notifications";

export const COMMISSION_PERCENTAGE = 0.03; // 3%
export const SELLER_NAME = "Felipe";

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export interface CommissionSaleItem {
  sale: Sale;
  saleValue: number;
  commissionValue: number;
  closedDateFormatted: string;
}

export interface CommissionSummary {
  year: number;
  month: number; // 0-11
  monthName: string;
  totalRevenue: number;
  commissionAmount: number;
  percentage: number;
  closedCount: number;
  items: CommissionSaleItem[];
}

/**
 * Converte data string com segurança evitando regressão de fuso horário local/UTC.
 */
export const parseDateOnly = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (str.includes("T")) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  if (str.length === 10 && str[4] === "-" && str[7] === "-") {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Retorna se uma venda foi concluída no ano e mês especificados.
 * Se a venda foi confirmada (fechada), a data de referência é estritamente a data de confirmação (closedDate).
 */
export function isSaleClosedInPeriod(sale: Sale, year: number, month: number): boolean {
  const isClosed = sale.status === "fechado" || sale.status === "pos_venda";
  if (!isClosed) return false;

  const dateStr = sale.closedDate || sale.contactDate || sale.createdAt;
  if (!dateStr) return false;

  const d = parseDateOnly(dateStr);
  if (!d) return false;

  return d.getFullYear() === year && d.getMonth() === month;
}

/**
 * Calcula a comissão de 3% e retorna os itens detalhados para um determinado mês e ano.
 */
export function calculateMonthlyCommission(
  sales: Sale[],
  year: number,
  month: number
): CommissionSummary {
  const matchingSales = (sales || []).filter((s) => isSaleClosedInPeriod(s, year, month));

  let totalRevenue = 0;
  const items: CommissionSaleItem[] = [];

  matchingSales.forEach((sale) => {
    const saleVal = Number(sale.totalValue) || 0;
    const commVal = saleVal * COMMISSION_PERCENTAGE;
    totalRevenue += saleVal;

    const dateStr = sale.closedDate || sale.contactDate || sale.createdAt;
    let closedDateFormatted = "-";
    if (dateStr) {
      const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`);
      if (!isNaN(d.getTime())) {
        closedDateFormatted = d.toLocaleDateString("pt-BR");
      }
    }

    items.push({
      sale,
      saleValue: saleVal,
      commissionValue: commVal,
      closedDateFormatted,
    });
  });

  // Ordena por data de fechamento decrescente
  items.sort((a, b) => {
    const dateA = new Date(a.sale.closedDate || a.sale.createdAt).getTime();
    const dateB = new Date(b.sale.closedDate || b.sale.createdAt).getTime();
    return dateB - dateA;
  });

  const commissionAmount = totalRevenue * COMMISSION_PERCENTAGE;

  return {
    year,
    month,
    monthName: MONTH_NAMES[month],
    totalRevenue,
    commissionAmount,
    percentage: COMMISSION_PERCENTAGE * 100,
    closedCount: items.length,
    items,
  };
}

/**
 * Verifica se já existe um lançamento de comissão registrado para um mês/ano específico.
 */
export async function checkExistingCommissionTransaction(year: number, month: number) {
  try {
    const monthStr = String(month + 1).padStart(2, "0");
    const invoiceCode = `COM-${year}${monthStr}`;
    const descPattern1 = `%Ref: ${MONTH_NAMES[month]}/${year}%`;
    const descPattern2 = `%Ref: ${monthStr}/${year}%`;

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("type", "expense")
      .or(`invoice_number.eq.${invoiceCode},description.ilike.${descPattern1},description.ilike.${descPattern2}`)
      .limit(1);

    if (error) {
      console.warn("Aviso ao verificar transação existente de comissão:", error.message);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (err) {
    console.error("Erro ao verificar lançamento de comissão existente:", err);
    return null;
  }
}

/**
 * Lança a comissão de um determinado mês no contas a pagar com vencimento no dia 10.
 */
export async function launchCommissionTransaction(
  year: number,
  month: number,
  commissionAmount: number,
  totalSalesRevenue: number,
  paymentYear: number,
  paymentMonth: number
) {
  try {
    const monthName = MONTH_NAMES[month];
    const monthStr = String(month + 1).padStart(2, "0");
    const paymentMonthStr = String(paymentMonth + 1).padStart(2, "0");

    // Vencimento sempre dia 10 do mês de pagamento
    const dueDateStr = `${paymentYear}-${paymentMonthStr}-10`;

    // Data de competência: último dia do mês de referência
    const lastDayOfRefMonth = new Date(year, month + 1, 0).getDate();
    const competenceDateStr = `${year}-${monthStr}-${String(lastDayOfRefMonth).padStart(2, "0")}`;

    const invoiceNumber = `COM-${year}${monthStr}`;
    const description = `Comissão Felipe (3%) - Ref: ${monthName}/${year}`;

    const newTransaction = {
      description,
      amount: Math.round(commissionAmount * 100) / 100,
      type: "expense",
      category: "Despesas com vendas",
      subcategory: "Comissão",
      service: `Comissão 3% sobre vendas fechadas (${monthName}/${year})`,
      contact: SELLER_NAME,
      financial_institution: "Nubank",
      payment_method: "Pix",
      competence_date: competenceDateStr,
      due_date: dueDateStr,
      status: "pending",
      invoice_number: invoiceNumber,
      order_service: `Vendas Faturadas: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalSalesRevenue)}`,
    };

    const { data, error } = await supabase
      .from("transactions")
      .insert([newTransaction])
      .select()
      .single();

    if (error) throw error;

    return { success: true, transaction: data };
  } catch (error: any) {
    console.error("Erro ao lançar transação de comissão:", error);
    return { success: false, error: error.message || error };
  }
}

/**
 * Executa a rotina inteligente de auto-lançamento da comissão:
 * Todo dia 1º (ou a partir do primeiro acesso do mês), apura as vendas do mês anterior
 * e lança automaticamente a comissão com vencimento no dia 10 do mês atual.
 */
export async function checkAndAutoLaunchCommission(): Promise<{
  checked: boolean;
  launched: boolean;
  message: string;
  transaction?: any;
}> {
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11

    // O mês a apurar é o mês que acabou de fechar (mês anterior)
    const refMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const refYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Chave de controle de verificação para evitar requisições repetitivas no mesmo dia/sessão
    const auditKey = `bjl_comm_check_${currentYear}_${currentMonth}_${today.getDate()}`;
    const alreadyCheckedToday = sessionStorage.getItem(auditKey);
    if (alreadyCheckedToday) {
      return { checked: true, launched: false, message: "Já verificado nesta sessão." };
    }

    // 1. Verifica se a transação do mês anterior já foi gerada no banco
    const existing = await checkExistingCommissionTransaction(refYear, refMonth);
    if (existing) {
      sessionStorage.setItem(auditKey, "true");
      return {
        checked: true,
        launched: false,
        message: `Comissão de ${MONTH_NAMES[refMonth]}/${refYear} já lançada anteriormente.`,
        transaction: existing,
      };
    }

    // 2. Busca as vendas fechadas do mês anterior no Supabase
    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select("*")
      .in("status", ["fechado", "pos_venda"]);

    if (salesError) {
      console.error("Erro ao buscar vendas para comissão:", salesError);
      return { checked: false, launched: false, message: salesError.message };
    }

    const mappedSales: Sale[] = (salesData || []).map((item: any) => ({
      id: item.id,
      clientName: item.client_name,
      product: item.product,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price) || 0,
      totalValue: Number(item.total_value) || 0,
      status: item.status,
      closedDate: item.closed_date,
      contactDate: item.contact_date,
      createdAt: item.created_at,
    }));

    const summary = calculateMonthlyCommission(mappedSales, refYear, refMonth);

    // Se houver comissão a pagar (> 0), faz o lançamento no financeiro
    if (summary.commissionAmount > 0) {
      const launchResult = await launchCommissionTransaction(
        refYear,
        refMonth,
        summary.commissionAmount,
        summary.totalRevenue,
        currentYear,
        currentMonth
      );

      if (launchResult.success) {
        sessionStorage.setItem(auditKey, "true");

        const formattedComm = new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(summary.commissionAmount);

        toast.success(
          `🎉 Comissão de Felipe (${summary.percentage}%) referente a ${summary.monthName}/${refYear} no valor de ${formattedComm} foi lançada automaticamente com vencimento em 10/${String(currentMonth + 1).padStart(2, "0")}!`,
          { duration: 8000 }
        );

        // Notificação no banco caso haja usuário autenticado
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await createNotification(
              user.id,
              `Comissão Felipe Lançada: ${formattedComm}`,
              `Lançamento automático de comissão referente a ${summary.monthName}/${refYear} (3% sobre ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(summary.totalRevenue)} em vendas fechadas). Vencimento no dia 10/${String(currentMonth + 1).padStart(2, "0")}.`,
              "success",
              "/financeiro"
            );
          }
        } catch (notifErr) {
          console.warn("Aviso ao gerar notificação de comissão:", notifErr);
        }

        return {
          checked: true,
          launched: true,
          message: `Comissão de ${formattedComm} lançada com sucesso!`,
          transaction: launchResult.transaction,
        };
      } else {
        return {
          checked: true,
          launched: false,
          message: `Falha ao lançar comissão: ${launchResult.error}`,
        };
      }
    } else {
      sessionStorage.setItem(auditKey, "true");
      return {
        checked: true,
        launched: false,
        message: `Nenhuma venda fechada no mês ${MONTH_NAMES[refMonth]}/${refYear}. Valor de comissão R$ 0,00.`,
      };
    }
  } catch (error: any) {
    console.error("Erro geral na rotina de auto-lançamento da comissão:", error);
    return { checked: false, launched: false, message: error.message || String(error) };
  }
}

/**
 * Dispara manualmente o lançamento da comissão de um mês específico
 */
export async function launchCommissionManually(
  year: number,
  month: number,
  sales: Sale[]
): Promise<{ success: boolean; message: string; transaction?: any }> {
  try {
    const existing = await checkExistingCommissionTransaction(year, month);
    if (existing) {
      return {
        success: false,
        message: `A comissão de ${MONTH_NAMES[month]}/${year} já possui lançamento registrado no Financeiro (ID: ${existing.id.slice(0, 8)}...).`,
        transaction: existing,
      };
    }

    const summary = calculateMonthlyCommission(sales, year, month);
    if (summary.commissionAmount <= 0) {
      return {
        success: false,
        message: `Não há vendas fechadas registradas em ${MONTH_NAMES[month]}/${year} para apurar comissão.`,
      };
    }

    // O pagamento é no dia 10 do mês seguinte
    const paymentMonth = month === 11 ? 0 : month + 1;
    const paymentYear = month === 11 ? year + 1 : year;

    const res = await launchCommissionTransaction(
      year,
      month,
      summary.commissionAmount,
      summary.totalRevenue,
      paymentYear,
      paymentMonth
    );

    if (res.success) {
      const formattedComm = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(summary.commissionAmount);

      toast.success(
        `Comissão de Felipe no valor de ${formattedComm} lançada com sucesso no Financeiro! Vencimento em 10/${String(paymentMonth + 1).padStart(2, "0")}/${paymentYear}.`
      );
      return { success: true, message: "Lançamento concluído com sucesso!", transaction: res.transaction };
    } else {
      toast.error(`Erro ao lançar comissão: ${res.error}`);
      return { success: false, message: String(res.error) };
    }
  } catch (error: any) {
    toast.error(`Erro ao lançar comissão: ${error.message}`);
    return { success: false, message: error.message };
  }
}
