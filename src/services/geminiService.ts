import { supabase } from "@/lib/supabase";

export interface EstimatedItem {
  id: string;
  qty: number;
}

export interface GeminiEstimationResult {
  items: EstimatedItem[];
  reasoning: string;
  days_estimated: number;
}

export interface CatalogMaterial {
  id: string;
  name: string;
  category: string;
  unit: string;
  unit_price: number;
}

/**
 * Sends the project image and the materials catalog to Gemini 2.5 Flash to estimate materials.
 * Tenta primeiro via Supabase Edge Function (segurança máxima sem expor chave).
 * Caso a Edge Function não esteja implantada, recorre ao fallback local.
 */
export async function estimateProjectMaterials(
  apiKey?: string,
  base64DataUrl?: string,
  catalog: CatalogMaterial[] = []
): Promise<GeminiEstimationResult> {
  // Trata chamada com 2 ou 3 parâmetros
  let resolvedImage = base64DataUrl;
  let resolvedKey = apiKey;

  if (!base64DataUrl && apiKey && apiKey.startsWith("data:image")) {
    resolvedImage = apiKey;
    resolvedKey = localStorage.getItem("bjl_gemini_api_key") || undefined;
  }

  const match = resolvedImage?.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Formato de imagem inválido. Certifique-se de que é uma imagem válida.");
  }

  // 1. Tenta executar via Edge Function no servidor Supabase (Recomendado / Enterprise)
  try {
    const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke("gemini-proxy", {
      body: {
        action: "estimate-materials",
        payload: {
          base64DataUrl: resolvedImage,
          catalog
        }
      }
    });

    if (!edgeErr && edgeRes?.data) {
      return edgeRes.data as GeminiEstimationResult;
    }

    if (edgeErr) {
      console.warn("Edge Function gemini-proxy indisponível ou em configuração:", edgeErr.message);
    }
  } catch (fnErr) {
    console.warn("Falha ao invocar Edge Function gemini-proxy. Tentando fallback local.", fnErr);
  }

  // 2. Fallback: Chamada direta com a chave local se disponível
  const activeKey = resolvedKey || localStorage.getItem("bjl_gemini_api_key");
  if (!activeKey) {
    throw new Error("Configuração de IA necessária: Ative a Edge Function 'gemini-proxy' no Supabase ou informe a chave do Gemini nas Configurações.");
  }
  
  const mimeType = match[1];
  const base64Data = match[2];

  // Format catalog for the prompt to save tokens and guide the AI
  const catalogPromptList = catalog.map(m => ({
    id: m.id,
    name: m.name,
    category: m.category,
    unit: m.unit,
    price: m.unit_price
  }));

  const systemInstruction = `Você é um engenheiro de valor e mestre marceneiro especialista da BJL Planejados.
Seu trabalho é analisar o desenho técnico, render 3D ou croqui de um projeto de marcenaria enviado pelo usuário.
Você deve identificar os módulos de móveis presentes (como balcões de pia, armários aéreos, torres de eletros, nichos, gaveteiros), estimar as dimensões do projeto e calcular os materiais exatos do nosso catálogo necessários para fabricar este projeto.

Aqui está o nosso CATÁLOGO DE MATERIAIS disponíveis (com seus respectivos IDs e unidades de medida):
${JSON.stringify(catalogPromptList, null, 2)}

Regras de estimativa:
1. Para cada chapa de MDF, lembre-se de que uma chapa padrão tem 2,75m x 1,84m (aprox. 5m²). Analise a área de painéis do móvel (laterais, portas, tamponamento de 18mm, divisórias internas de 15mm, fundos de 6mm).
2. Lembre-se de estimar fitas de borda correspondentes (normalmente 22mm para chapas de 15mm/18mm, 35mm ou 45mm para tampos engrossados).
3. Estime ferragens coerentes:
   - Gavetas comuns: 1 par de corrediça telescópica por gaveta.
   - Gavetas de alto padrão: 1 par de trilho invisível por gaveta.
   - Portas de giro comuns: 2 a 3 dobradiças por porta.
   - Portas basculantes: 1 ou 2 pistões a gás por porta.
   - Fixação: Parafusos, VB, cavilhas e cantoneiras de fixação.
   - Suprimentos: Silicone, cola Kleiberit, etc., proporcional ao tamanho do projeto.
4. Dias de Produção: Estime quantos dias úteis (dias de trabalho de 1 marceneiro) este projeto levará para ser fabricado e montado (de 1 a 15 dias normalmente, dependendo da complexidade).

Você DEVE retornar a resposta EXATAMENTE no formato JSON especificado, combinando os itens necessários com os IDs correspondentes do catálogo. Se um item do catálogo não for necessário, não o inclua na lista.`;

  const prompt = `Analise este projeto de marcenaria de alto padrão. Identifique o tipo de ambiente, descreva sucintamente a sua lógica de cálculo de materiais no campo 'reasoning' (justificativa clara em português para o marceneiro), e liste cada material necessário mapeado com seu ID exato do catálogo e a quantidade correspondente. Estime também os dias necessários para produção.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemInstruction}\n\nPergunta: ${prompt}`
              },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              items: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    id: { type: "STRING", description: "ID exato do material no catálogo" },
                    qty: { type: "NUMBER", description: "Quantidade sugerida para o orçamento" }
                  },
                  required: ["id", "qty"]
                }
              },
              reasoning: { 
                type: "STRING", 
                description: "Explicação técnica detalhada (em português) de como as quantidades de MDF, ferragens e acessórios foram calculadas para este projeto" 
              },
              days_estimated: { 
                type: "INTEGER", 
                description: "Quantidade estimada de dias de trabalho para produção deste projeto" 
              }
            },
            required: ["items", "reasoning", "days_estimated"]
          }
        }
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message || `Erro da API Gemini (Status ${response.status})`;
    throw new Error(errorMessage);
  }

  const result = await response.json();
  const textContent = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!textContent) {
    throw new Error("A IA não retornou uma resposta válida.");
  }

  try {
    const parsedResult: GeminiEstimationResult = JSON.parse(textContent);
    return parsedResult;
  } catch (err) {
    console.error("Failed to parse Gemini response as JSON:", textContent, err);
    throw new Error("Erro ao interpretar a resposta da IA. Ela não retornou o formato JSON esperado.");
  }
}

export interface GeminiFinanceAnalysis {
  recommendations: string[];
  health_status: "Excellent" | "Good" | "Regular" | "Bad";
  analysis_summary: string;
  variable_cost_feedback: string;
  fixed_expense_feedback: string;
}

export async function analyzeFinancialMetrics(
  apiKey: string | undefined,
  year: string,
  dreData: {
    grossRevenue: number;
    taxes: number;
    netRevenue: number;
    variableCosts: number;
    contributionMargin: number;
    fixedExpenses: number;
    netResult: number;
  },
  detailedExpenses: any[]
): Promise<GeminiFinanceAnalysis> {
  // 1. Tenta executar via Edge Function no servidor Supabase
  try {
    const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke("gemini-proxy", {
      body: {
        action: "analyze-finance",
        payload: { year, dreData, detailedExpenses }
      }
    });

    if (!edgeErr && edgeRes?.data) {
      return edgeRes.data as GeminiFinanceAnalysis;
    }

    if (edgeErr) {
      console.warn("Edge Function gemini-proxy indisponível para finanças:", edgeErr.message);
    }
  } catch (fnErr) {
    console.warn("Falha ao invocar Edge Function gemini-proxy no DRE:", fnErr);
  }

  // 2. Fallback: Chamada direta com a chave local se disponível
  const activeKey = apiKey || localStorage.getItem("bjl_gemini_api_key");
  if (!activeKey) {
    throw new Error("Chave de API do Gemini não encontrada. Configure nos Secrets do Supabase (Edge Function) ou na página de Configurações.");
  }

  const financePrompt = `Analise os dados financeiros da BJL Planejados para o ano de ${year}:
Resumo Executivo DRE:
- Receita Bruta: ${dreData.grossRevenue}
- Impostos: ${dreData.taxes}
- Receita Líquida: ${dreData.netRevenue}
- Custos Variáveis (MDF/Insumos): ${dreData.variableCosts}
- Margem de Contribuição: ${dreData.contributionMargin}
- Despesas Fixas (Operacionais/Pessoal): ${dreData.fixedExpenses}
- Resultado Líquido: ${dreData.netResult}

Detalhamento de Gastos por Categoria:
${JSON.stringify(detailedExpenses.map(cat => ({ category: cat.category, type: cat.type, total: cat.total })), null, 2)}
`;

  const systemInstruction = `Você é um Consultor Financeiro e CFO Executivo de alto padrão especializado em marcenarias de luxo e empresas de móveis planejados de alto valor.
Seu trabalho é fornecer análises críticas de saúde de caixa, conselhos estratégicos para melhorar a lucratividade, otimizar a despesa de materiais (Custos Variáveis), avaliar impostos e reavaliar despesas fixas.
Seus conselhos devem ser práticos, profissionais, elegantes e direcionados especificamente a um proprietário de fábrica de móveis sob medida.
Retorne sua resposta estritamente no formato JSON especificado.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemInstruction}\n\nDados financeiros para análise:\n${financePrompt}`
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              health_status: { type: "STRING", enum: ["Excellent", "Good", "Regular", "Bad"], description: "Status geral de saúde financeira" },
              analysis_summary: { type: "STRING", description: "Resumo executivo de análise financeira (2 a 3 parágrafos curtos em português)" },
              variable_cost_feedback: { type: "STRING", description: "Feedback específico sobre custos variáveis e matéria-prima" },
              fixed_expense_feedback: { type: "STRING", description: "Feedback específico sobre despesas fixas e gastos administrativos" },
              recommendations: {
                type: "ARRAY",
                items: { type: "STRING" },
                description: "Recomendações estratégicas e planos de ação práticos (3 a 5 itens curtos)"
              }
            },
            required: ["health_status", "analysis_summary", "variable_cost_feedback", "fixed_expense_feedback", "recommendations"]
          }
        }
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message || `Erro da API Gemini (Status ${response.status})`;
    throw new Error(errorMessage);
  }

  const result = await response.json();
  const textContent = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!textContent) {
    throw new Error("A IA não retornou uma resposta de análise válida.");
  }

  try {
    const parsedResult: GeminiFinanceAnalysis = JSON.parse(textContent);
    return parsedResult;
  } catch (err) {
    console.error("Failed to parse Gemini response as JSON:", textContent, err);
    throw new Error("Erro ao interpretar a análise financeira da IA.");
  }
}

export interface PartnerChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface BJLPartnerSnapshot {
  generatedAt: string;
  currentMonthLabel: string;
  monthMetrics: {
    paidIncome: number;
    paidExpense: number;
    paidBalance: number;
    pendingIncome: number;
    pendingExpense: number;
    projectedBalance: number;
  };
  yearMetrics: {
    year: number;
    paidIncome: number;
    paidExpense: number;
    paidBalance: number;
  };
  alerts: {
    overdueCount: number;
    overdueTotal: number;
    overdueItems: Array<{ description: string; amount: number; dueDate: string; contact?: string }>;
    dueNext7DaysCount: number;
    dueNext7DaysTotal: number;
    dueNext7DaysItems: Array<{ description: string; amount: number; dueDate: string; contact?: string }>;
  };
  topExpenseCategoriesMonth: Array<{ category: string; total: number }>;
  bankBalances: Array<{ bank: string; balance: number }>;
  budgetsSummary: {
    totalCount: number;
    approvedCount: number;
    pendingCount: number;
    pendingTotalValue: number;
    approvedTotalValue: number;
    recentBudgets: Array<{
      client: string;
      project: string;
      cost: number;
      value: number;
      marginPercent: number;
      status: string;
      days: number;
      createdAt: string;
    }>;
  };
  catalogHighlights: Array<{ name: string; category: string; unitPrice: number; unit: string }>;
  productionSummary: {
    activeOSCount: number;
    completedOSCount: number;
    recentActiveOS: Array<{
      ticket: string;
      client: string;
      action: string;
      status: string;
      value: number;
    }>;
  };
}

let cachedSnapshot: { data: BJLPartnerSnapshot; timestamp: number } | null = null;

const formatBRL = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

export async function buildBJLBusinessSnapshot(forceRefresh = false): Promise<BJLPartnerSnapshot> {
  if (!forceRefresh && cachedSnapshot && Date.now() - cachedSnapshot.timestamp < 45000) {
    return cachedSnapshot.data;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayStr = now.toISOString().split("T")[0];
  const next7Date = new Date(now);
  next7Date.setDate(now.getDate() + 7);
  const next7Str = next7Date.toISOString().split("T")[0];

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const [transRes, budgetsRes, materialsRes, osRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("description, amount, type, category, subcategory, contact, financial_institution, payment_method, competence_date, due_date, payment_date, status, order_service")
      .order("due_date", { ascending: false })
      .limit(1500),
    supabase
      .from("budgets")
      .select("id, client_name, project_name, status, days_estimated, markup_factor, total_cost, total_value, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("budget_materials")
      .select("name, category, unit, unit_price")
      .order("category", { ascending: true })
      .limit(120),
    supabase
      .from("service_orders")
      .select("ticket_number, client, action, status, value, prediction_date")
      .order("open_date", { ascending: false })
      .limit(80),
  ]);

  const transactions = transRes.data || [];
  const budgets = budgetsRes.data || [];
  const materials = materialsRes.data || [];
  const serviceOrders = osRes.data || [];

  let monthPaidIncome = 0;
  let monthPaidExpense = 0;
  let monthPendingIncome = 0;
  let monthPendingExpense = 0;

  let yearPaidIncome = 0;
  let yearPaidExpense = 0;

  const overdueItems: Array<{ description: string; amount: number; dueDate: string; contact?: string }> = [];
  let overdueTotal = 0;

  const dueNext7DaysItems: Array<{ description: string; amount: number; dueDate: string; contact?: string }> = [];
  let dueNext7DaysTotal = 0;

  const monthCatMap = new Map<string, number>();
  const bankMap = new Map<string, number>([
    ["Itaú", 0],
    ["Nubank", 0],
    ["Dinheiro", 0],
    ["RecargaPay", 0],
  ]);

  for (const t of transactions) {
    const amt = Number(t.amount) || 0;
    const isIncome = t.type === "income";
    const isPaid = t.status === "paid";
    const dueStr = t.due_date || t.competence_date || "";
    const refDateStr = (isPaid && t.payment_date) ? t.payment_date : dueStr;

    if (refDateStr) {
      const [yStr, mStr] = refDateStr.split("-");
      const y = Number(yStr);
      const m = Number(mStr) - 1;

      if (y === currentYear) {
        if (isPaid) {
          if (isIncome) yearPaidIncome += amt;
          else yearPaidExpense += amt;
        }
        if (m === currentMonth) {
          if (isPaid) {
            if (isIncome) monthPaidIncome += amt;
            else {
              monthPaidExpense += amt;
              const cat = t.category || "Sem Categoria";
              monthCatMap.set(cat, (monthCatMap.get(cat) || 0) + amt);
            }
          } else {
            if (isIncome) monthPendingIncome += amt;
            else monthPendingExpense += amt;
          }
        }
      }
    }

    // Bank balances (paid transactions)
    if (isPaid && t.financial_institution) {
      const inst = String(t.financial_institution).toLowerCase();
      const signed = isIncome ? amt : -amt;
      if (inst.includes("itau") || inst.includes("itaú")) {
        bankMap.set("Itaú", (bankMap.get("Itaú") || 0) + signed);
      } else if (inst.includes("nubank")) {
        bankMap.set("Nubank", (bankMap.get("Nubank") || 0) + signed);
      } else if (inst.includes("dinheiro")) {
        bankMap.set("Dinheiro", (bankMap.get("Dinheiro") || 0) + signed);
      } else if (inst.includes("recarga")) {
        bankMap.set("RecargaPay", (bankMap.get("RecargaPay") || 0) + signed);
      }
    }

    // Overdue & Next 7 Days (pending expenses)
    if (!isPaid && !isIncome && dueStr) {
      if (dueStr < todayStr) {
        overdueTotal += amt;
        if (overdueItems.length < 15) {
          overdueItems.push({
            description: t.description,
            amount: amt,
            dueDate: dueStr.split("-").reverse().join("/"),
            contact: t.contact || undefined,
          });
        }
      } else if (dueStr >= todayStr && dueStr <= next7Str) {
        dueNext7DaysTotal += amt;
        if (dueNext7DaysItems.length < 15) {
          dueNext7DaysItems.push({
            description: t.description,
            amount: amt,
            dueDate: dueStr.split("-").reverse().join("/"),
            contact: t.contact || undefined,
          });
        }
      }
    }
  }

  const topExpenseCategoriesMonth = Array.from(monthCatMap.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const bankBalances = Array.from(bankMap.entries()).map(([bank, balance]) => ({ bank, balance }));

  // Budgets summary
  const approvedBudgets = budgets.filter(
    (b) => b.status?.toLowerCase() === "aprovado" || b.status?.toLowerCase() === "fechado"
  );
  const pendingBudgets = budgets.filter(
    (b) => !b.status || b.status?.toLowerCase() === "pendente" || b.status?.toLowerCase() === "em análise"
  );

  const recentBudgets = budgets.slice(0, 15).map((b) => {
    const cost = Number(b.total_cost) || 0;
    const value = Number(b.total_value) || 0;
    const marginPercent = value > 0 ? Math.round(((value - cost) / value) * 100) : 0;
    return {
      client: b.client_name || "Cliente",
      project: b.project_name || "Projeto",
      cost,
      value,
      marginPercent,
      status: b.status || "pendente",
      days: Number(b.days_estimated) || 0,
      createdAt: b.created_at ? new Date(b.created_at).toLocaleDateString("pt-BR") : "",
    };
  });

  // Active OS
  const activeOS = serviceOrders.filter((o) => o.status !== "Entregue e Finalizado");
  const completedOS = serviceOrders.filter((o) => o.status === "Entregue e Finalizado");

  const snapshot: BJLPartnerSnapshot = {
    generatedAt: now.toLocaleString("pt-BR"),
    currentMonthLabel: `${monthNames[currentMonth]}/${currentYear}`,
    monthMetrics: {
      paidIncome: monthPaidIncome,
      paidExpense: monthPaidExpense,
      paidBalance: monthPaidIncome - monthPaidExpense,
      pendingIncome: monthPendingIncome,
      pendingExpense: monthPendingExpense,
      projectedBalance: (monthPaidIncome + monthPendingIncome) - (monthPaidExpense + monthPendingExpense),
    },
    yearMetrics: {
      year: currentYear,
      paidIncome: yearPaidIncome,
      paidExpense: yearPaidExpense,
      paidBalance: yearPaidIncome - yearPaidExpense,
    },
    alerts: {
      overdueCount: overdueItems.length,
      overdueTotal,
      overdueItems,
      dueNext7DaysCount: dueNext7DaysItems.length,
      dueNext7DaysTotal,
      dueNext7DaysItems,
    },
    topExpenseCategoriesMonth,
    bankBalances,
    budgetsSummary: {
      totalCount: budgets.length,
      approvedCount: approvedBudgets.length,
      pendingCount: pendingBudgets.length,
      pendingTotalValue: pendingBudgets.reduce((acc, b) => acc + (Number(b.total_value) || 0), 0),
      approvedTotalValue: approvedBudgets.reduce((acc, b) => acc + (Number(b.total_value) || 0), 0),
      recentBudgets,
    },
    catalogHighlights: materials.slice(0, 40).map((m) => ({
      name: m.name,
      category: m.category,
      unitPrice: Number(m.unit_price) || 0,
      unit: m.unit,
    })),
    productionSummary: {
      activeOSCount: activeOS.length,
      completedOSCount: completedOS.length,
      recentActiveOS: activeOS.slice(0, 12).map((o) => ({
        ticket: o.ticket_number || "OS",
        client: o.client || "Cliente",
        action: o.action || "Projeto",
        status: o.status || "Em Produção",
        value: Number(o.value) || 0,
      })),
    },
  };

  cachedSnapshot = { data: snapshot, timestamp: Date.now() };
  return snapshot;
}

function generateLocalPartnerFallback(question: string, snap: BJLPartnerSnapshot): string {
  const q = question.toLowerCase();

  if (q.includes("venc") || q.includes("atrasad") || q.includes("pagar") || q.includes("semana") || q.includes("hoje")) {
    const overdueList = snap.alerts.overdueItems.length > 0
      ? snap.alerts.overdueItems.slice(0, 6).map(i => `• **${i.description}** (${i.dueDate}): **${formatBRL(i.amount)}**`).join("\n")
      : "• Nenhuma conta atrasada no momento! 👏";

    const next7List = snap.alerts.dueNext7DaysItems.length > 0
      ? snap.alerts.dueNext7DaysItems.slice(0, 6).map(i => `• **${i.description}** (${i.dueDate}): **${formatBRL(i.amount)}**`).join("\n")
      : "• Nenhuma conta pendente para os próximos 7 dias.";

    return `### 🚨 Radar de Contas a Pagar & Vencimentos (${snap.currentMonthLabel})

Analisei nosso fluxo de caixa agora mesmo, sócio. Aqui está a situação:

* **Total em Atraso:** **${formatBRL(snap.alerts.overdueTotal)}** (${snap.alerts.overdueCount} lançamentos listados)
* **Vencendo nos Próximos 7 Dias:** **${formatBRL(snap.alerts.dueNext7DaysTotal)}** (${snap.alerts.dueNext7DaysCount} lançamentos)

#### 📌 Principais Contas em Atraso:
${overdueList}

#### 📅 Vencendo nos Próximos 7 Dias:
${next7List}

💡 **Conselho de Sócio:** Nosso saldo realizado em **${snap.currentMonthLabel}** está em **${formatBRL(snap.monthMetrics.paidBalance)}**. Priorize quitar as pendências de fornecedores críticos de matéria-prima (MDF/ferragens) para não travar a produção.`;
  }

  if (q.includes("orçamento") || q.includes("orcamento") || q.includes("margem") || q.includes("preço") || q.includes("precificar")) {
    const recentList = snap.budgetsSummary.recentBudgets.slice(0, 6).map(
      b => `• **${b.client}** (${b.project}): Venda **${formatBRL(b.value)}** | Custo **${formatBRL(b.cost)}** | Margem Bruta: **${b.marginPercent}%** (${b.status.toUpperCase()})`
    ).join("\n");

    return `### 📐 Análise de Orçamentos & Margens da BJL

Aqui está o retrato atual da nossa carteira comercial:

* **Orçamentos Pendentes (Em Negociação):** **${snap.budgetsSummary.pendingCount}** projetos somando **${formatBRL(snap.budgetsSummary.pendingTotalValue)}** na mesa!
* **Orçamentos Aprovados:** **${snap.budgetsSummary.approvedCount}** projetos somando **${formatBRL(snap.budgetsSummary.approvedTotalValue)}**

#### 🔍 Últimos Orçamentos Calculados:
${recentList || "• Nenhum orçamento recente encontrado."}

💡 **Regra de Ouro da Marcenaria:** Para manter a BJL altamente lucrativa, busque um **Markup entre 2.3x e 2.8x** sobre o custo direto de materiais + mão de obra fabril, garantindo uma margem bruta saudável mesmo após descontar taxas de maquininha e impostos.`;
  }

  if (q.includes("produção") || q.includes("producao") || q.includes("fábrica") || q.includes("fabrica") || q.includes("os") || q.includes("ordem")) {
    const osList = snap.productionSummary.recentActiveOS.slice(0, 6).map(
      o => `• **${o.ticket} - ${o.client}** (${o.action}): Status **[${o.status}]** | Valor: **${formatBRL(o.value)}**`
    ).join("\n");

    return `### 🏭 Cockpit da Fábrica (Ordens de Serviço)

Temos atualmente **${snap.productionSummary.activeOSCount} Ordens de Serviço ativas** na fábrica e **${snap.productionSummary.completedOSCount} finalizadas**.

#### 🔨 Projetos em Andamento:
${osList || "• Nenhuma OS ativa no momento."}

💡 **Dica Operacional:** Acompanhe o consumo de chapas de MDF e ferragens por OS na aba *Financeiro → Serviços* para garantir que nenhum projeto ultrapasse 45% de custo de matéria-prima.`;
  }

  const topCats = snap.topExpenseCategoriesMonth.slice(0, 5).map(
    c => `• **${c.category}:** ${formatBRL(c.total)}`
  ).join("\n");

  return `### 🤝 Raio-X Executivo BJL Planejados (${snap.currentMonthLabel})

Sócio, puxei os números atualizados do nosso sistema agora mesmo:

#### 💰 Resultado de ${snap.currentMonthLabel}:
* **Receitas Recebidas (Pagas):** **${formatBRL(snap.monthMetrics.paidIncome)}** *(+ ${formatBRL(snap.monthMetrics.pendingIncome)} a receber)*
* **Despesas Pagas:** **${formatBRL(snap.monthMetrics.paidExpense)}** *(+ ${formatBRL(snap.monthMetrics.pendingExpense)} pendentes)*
* **Saldo Líquido Realizado no Mês:** **${formatBRL(snap.monthMetrics.paidBalance)}**
* **Saldo Acumulado no Ano (${snap.yearMetrics.year}):** **${formatBRL(snap.yearMetrics.paidBalance)}**

#### 📊 Maiores Gastos do Mês por Categoria:
${topCats || "• Sem despesas pagas registradas neste mês."}

#### ⚠️ Alertas Imediatos:
* **Contas em Atraso:** ${formatBRL(snap.alerts.overdueTotal)} (${snap.alerts.overdueCount} itens)
* **Vencendo em 7 Dias:** ${formatBRL(snap.alerts.dueNext7DaysTotal)} (${snap.alerts.dueNext7DaysCount} itens)
* **Orçamentos em Negociação:** ${formatBRL(snap.budgetsSummary.pendingTotalValue)} (${snap.budgetsSummary.pendingCount} projetos)

*(💡 Dica: Para respostas abertas com Inteligência Artificial Generativa Gemini 2.5 Pro/Flash, clique no ícone de **Chave API** no topo deste chat e cole sua chave gratuita do Google AI Studio).*`;
}

export async function askBJLPartnerAI(
  messages: PartnerChatMessage[],
  customApiKey?: string,
  forceRefreshSnapshot = false,
  preferredModel: "gemini-2.5-pro" | "gemini-2.5-flash" = "gemini-2.5-pro"
): Promise<{ reply: string; snapshot: BJLPartnerSnapshot; mode: "gemini-pro" | "gemini-flash" | "local-cfo"; executedAction?: string }> {
  const snapshot = await buildBJLBusinessSnapshot(forceRefreshSnapshot);
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";

  const activeKey = (
    customApiKey ||
    localStorage.getItem("bjl_gemini_api_key") ||
    import.meta.env.VITE_GEMINI_API_KEY ||
    ""
  ).trim();

  if (!activeKey) {
    const fallbackReply = generateLocalPartnerFallback(lastUserMessage, snapshot);
    return {
      reply: `⚠️ **Atenção Sócio: Motor Gemini 2.5 Pro ainda não ativado com Chave de API.**\n*(No momento estou respondendo apenas com o Resumo Automático Local, que não possui inteligência livre para conversar ou executar ordens complexas).* \n\n👉 **Para ativar a inteligência máxima (Gemini 2.5 Pro):** Clique no botão amarelo **"Ativar Gemini 2.5 Pro"** logo acima (ou no ícone de chave 🔑 no topo) e cole sua chave gratuita do Google AI Studio (\`AIzaSy...\`), ou envie a chave para o assistente configurar para você!\n\n---\n\n${fallbackReply}`,
      snapshot,
      mode: "local-cfo",
    };
  }

  const todayISO = new Date().toISOString().split("T")[0];

  const systemPrompt = `Você é o "Sócio IA da BJL Planejados" (rodando no motor Google Gemini 2.5 de última geração) — você atua como Sócio Estrategista, Diretor Financeiro (CFO) e Engenheiro Mestre de Marcenaria de Alto Padrão ao lado de Luiz Felipe Canedo, proprietário da BJL Móveis Planejados (CNPJ 60.528.620/0001-20).

DIRETRIZES DE INTELIGÊNCIA E EXECUÇÃO:
1. Fale como um SÓCIO HUMANO EXTREMAMENTE INTELIGENTE, direto, analítico, proativo e leal. NUNCA dê respostas genéricas ou robóticas.
2. Faça TODAS as contas matemáticas passo a passo quando o sócio pedir simulações de preços, descontos, ponto de equilíbrio, comissões, impostos, taxas de maquininha, rateio de fábrica ou fluxo de caixa.
3. Você tem ferramentas reais (Function Calling) conectadas ao banco de dados Supabase da BJL:
   - Se o sócio pedir para BUSCAR ou FILTRAR gastos de um fornecedor específico (ex: "Quanto pagamos para a CED?", "Quais compras fizemos de MDF?", "O que pagamos para fulano?"), chame a ferramenta \`buscar_lancamentos_financeiros\`.
   - Se o sócio pedir para LANÇAR / CADASTRAR uma despesa ou receita no financeiro (ex: "Lança uma despesa de R$ 250 de gasolina hoje no PIX Itaú"), chame a ferramenta \`criar_lancamento_financeiro\`.
4. Use SEMPRE os números reais do Raio-X abaixo para embasar seus cálculos. Data de hoje: ${todayISO}.

=== RAIO-X EM TEMPO REAL DA BJL PLANEJADOS (${snapshot.generatedAt}) ===
Mês Atual: ${snapshot.currentMonthLabel}
1. FINANCEIRO DO MÊS (${snapshot.currentMonthLabel}):
- Receitas Pagas (Caixa Realizado): ${formatBRL(snapshot.monthMetrics.paidIncome)}
- Despesas Pagas (Saídas Realizadas): ${formatBRL(snapshot.monthMetrics.paidExpense)}
- Saldo Líquido Realizado no Mês: ${formatBRL(snapshot.monthMetrics.paidBalance)}
- Receitas Pendentes no Mês: ${formatBRL(snapshot.monthMetrics.pendingIncome)}
- Despesas Pendentes no Mês: ${formatBRL(snapshot.monthMetrics.pendingExpense)}
- Saldo Projetado do Mês: ${formatBRL(snapshot.monthMetrics.projectedBalance)}

2. ACUMULADO DO ANO (${snapshot.yearMetrics.year}):
- Receitas Pagas no Ano: ${formatBRL(snapshot.yearMetrics.paidIncome)}
- Despesas Pagas no Ano: ${formatBRL(snapshot.yearMetrics.paidExpense)}
- Saldo Realizado no Ano: ${formatBRL(snapshot.yearMetrics.paidBalance)}

3. ALERTAS DE CAIXA (CONTAS A PAGAR):
- Total Atrasado: ${formatBRL(snapshot.alerts.overdueTotal)} (${snapshot.alerts.overdueCount} contas)
  Itens atrasados: ${JSON.stringify(snapshot.alerts.overdueItems)}
- Vencendo nos Próximos 7 Dias: ${formatBRL(snapshot.alerts.dueNext7DaysTotal)} (${snapshot.alerts.dueNext7DaysCount} contas)
  Itens próximos 7 dias: ${JSON.stringify(snapshot.alerts.dueNext7DaysItems)}

4. MAIORES GASTOS DO MÊS POR CATEGORIA:
${JSON.stringify(snapshot.topExpenseCategoriesMonth)}

5. SALDO HISTÓRICO POR BANCO (LANÇAMENTOS PAGOS):
${JSON.stringify(snapshot.bankBalances)}

6. CARTEIRA DE ORÇAMENTOS:
- Total de Orçamentos Recentes: ${snapshot.budgetsSummary.totalCount}
- Aprovados: ${snapshot.budgetsSummary.approvedCount} (${formatBRL(snapshot.budgetsSummary.approvedTotalValue)})
- Pendentes em Negociação: ${snapshot.budgetsSummary.pendingCount} (${formatBRL(snapshot.budgetsSummary.pendingTotalValue)})
- Lista dos últimos 15 Orçamentos (Cliente, Projeto, Custo, Valor de Venda, Margem %, Status):
${JSON.stringify(snapshot.budgetsSummary.recentBudgets)}

7. PREÇOS DE REFERÊNCIA DO CATÁLOGO BJL (MDF, FERRAGENS, INSUMOS):
${JSON.stringify(snapshot.catalogHighlights)}

8. FÁBRICA E ORDENS DE SERVIÇO (OS):
- OS em Produção: ${snapshot.productionSummary.activeOSCount} | OS Finalizadas: ${snapshot.productionSummary.completedOSCount}
- OS Ativas Recentes: ${JSON.stringify(snapshot.productionSummary.recentActiveOS)}
=======================================================================`;

  const tools = [
    {
      functionDeclarations: [
        {
          name: "buscar_lancamentos_financeiros",
          description:
            "Busca lançamentos financeiros reais no banco de dados da BJL por termo (fornecedor, cliente, descrição, categoria) ou status.",
          parameters: {
            type: "OBJECT",
            properties: {
              termo: {
                type: "STRING",
                description: "Termo de busca (ex: nome do fornecedor, cliente, MDF, CED, Bruta, energia, etc.)",
              },
              tipo: {
                type: "STRING",
                enum: ["all", "income", "expense"],
                description: "Filtrar por receita (income), despesa (expense) ou todos (all)",
              },
            },
            required: ["termo"],
          },
        },
        {
          name: "criar_lancamento_financeiro",
          description:
            "Cria e salva um novo lançamento financeiro (despesa ou receita) diretamente no banco de dados da BJL Planejados quando o sócio pedir para lançar ou registrar um valor.",
          parameters: {
            type: "OBJECT",
            properties: {
              description: { type: "STRING", description: "Descrição clara do lançamento" },
              amount: { type: "NUMBER", description: "Valor em Reais (ex: 350.50)" },
              type: { type: "STRING", enum: ["income", "expense"], description: "income para Receita, expense para Despesa" },
              category: { type: "STRING", description: "Categoria (ex: Custos Variáveis, Despesas Operacionais, Receita de Vendas)" },
              subcategory: { type: "STRING", description: "Subcategoria (ex: Matéria-Prima (MDF/Insumos), Combustível / Pedágio, Ferragens)" },
              contact: { type: "STRING", description: "Nome do Cliente ou Fornecedor" },
              financial_institution: { type: "STRING", description: "Banco/Conta (Itaú, Nubank, Dinheiro, RecargaPay)" },
              payment_method: { type: "STRING", description: "Forma de pagamento (PIX, Boleto, Cartão de Crédito, Dinheiro)" },
              due_date: { type: "STRING", description: "Data de vencimento no formato YYYY-MM-DD" },
              status: { type: "STRING", enum: ["paid", "pending"], description: "paid se já foi pago, pending se está a pagar" },
            },
            required: ["description", "amount", "type", "due_date", "status"],
          },
        },
      ],
    },
  ];

  const modelsToTry =
    preferredModel === "gemini-2.5-pro"
      ? ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"]
      : ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"];

  const baseContents: any[] = messages.slice(-14).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  let lastErrorMsg = "";
  let executedAction: string | undefined;

  for (const modelName of modelsToTry) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${activeKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: baseContents,
            tools,
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 8192,
            },
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        lastErrorMsg = errData?.error?.message || `HTTP ${response.status}`;
        continue;
      }

      const result = await response.json();
      const candidatePart = result?.candidates?.[0]?.content?.parts?.[0];

      // Verifica se o Gemini solicitou executar uma ferramenta (Function Call)
      const fnCall = result?.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;

      if (fnCall) {
        let toolOutput: any = {};

        if (fnCall.name === "buscar_lancamentos_financeiros") {
          const termo = String(fnCall.args?.termo || "").toLowerCase();
          const tipo = fnCall.args?.tipo || "all";
          const { data: rows } = await supabase
            .from("transactions")
            .select("description, amount, type, category, subcategory, contact, financial_institution, payment_method, due_date, payment_date, status, order_service")
            .order("due_date", { ascending: false })
            .limit(800);

          const matched = (rows || []).filter((r: any) => {
            if (tipo !== "all" && r.type !== tipo) return false;
            const hay = `${r.description || ""} ${r.contact || ""} ${r.category || ""} ${r.subcategory || ""} ${r.order_service || ""}`.toLowerCase();
            return hay.includes(termo);
          });

          const totalMatched = matched.reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);
          toolOutput = {
            termo_buscado: termo,
            quantidade_encontrada: matched.length,
            valor_total_soma: totalMatched,
            lancamentos: matched.slice(0, 35),
          };
          executedAction = `Busca realizada: "${termo}" (${matched.length} itens encontrados)`;
        } else if (fnCall.name === "criar_lancamento_financeiro") {
          const args = fnCall.args || {};
          const newTx = {
            description: args.description || "Lançamento via Sócio IA",
            amount: Number(args.amount) || 0,
            type: args.type || "expense",
            category: args.category || (args.type === "income" ? "Receita de Vendas" : "Despesas Operacionais"),
            subcategory: args.subcategory || "Geral",
            contact: args.contact || "",
            financial_institution: args.financial_institution || "Itaú",
            payment_method: args.payment_method || "PIX",
            competence_date: args.due_date || todayISO,
            due_date: args.due_date || todayISO,
            payment_date: args.status === "paid" ? (args.due_date || todayISO) : null,
            status: args.status || "pending",
          };

          const { data: inserted, error: insErr } = await supabase
            .from("transactions")
            .insert([newTx])
            .select()
            .single();

          if (insErr) {
            toolOutput = { success: false, error: insErr.message };
          } else {
            cachedSnapshot = null; // invalida cache para atualizar os saldos
            toolOutput = { success: true, lancamento_criado: inserted };
            executedAction = `Lançamento registrado: ${newTx.description} (${formatBRL(newTx.amount)})`;
          }
        }

        // Segunda chamada enviando o resultado da ferramenta de volta para o Gemini formular a resposta final
        const followUpContents = [
          ...baseContents,
          result.candidates[0].content,
          {
            role: "function",
            parts: [
              {
                functionResponse: {
                  name: fnCall.name,
                  response: toolOutput,
                },
              },
            ],
          },
        ];

        const secondRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${activeKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: followUpContents,
              generationConfig: { temperature: 0.35, maxOutputTokens: 8192 },
            }),
          }
        );

        if (secondRes.ok) {
          const secondData = await secondRes.json();
          const finalReply = secondData?.candidates?.[0]?.content?.parts
            ?.map((p: any) => p.text || "")
            .join("")
            .trim();
          const refreshedSnap = await buildBJLBusinessSnapshot(true);
          if (finalReply) {
            return {
              reply: finalReply,
              snapshot: refreshedSnap,
              mode: modelName.includes("pro") ? "gemini-pro" : "gemini-flash",
              executedAction,
            };
          }
        }
      }

      const textParts = result?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text || "")
        .join("")
        .trim();

      if (textParts) {
        return {
          reply: textParts,
          snapshot,
          mode: modelName.includes("pro") ? "gemini-pro" : "gemini-flash",
        };
      }
    } catch (err: any) {
      lastErrorMsg = err?.message || "Falha de conexão";
      console.warn(`Tentativa com modelo ${modelName} falhou:`, err);
    }
  }

  throw new Error(
    `Não foi possível conectar ao Gemini com a chave atual (${lastErrorMsg}). Verifique se sua chave API do Google AI Studio está correta no ícone de chave 🔑 no topo do chat.`
  );
}


