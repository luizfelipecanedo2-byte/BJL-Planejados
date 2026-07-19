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
 */
export async function estimateProjectMaterials(
  apiKey: string,
  base64DataUrl: string,
  catalog: CatalogMaterial[]
): Promise<GeminiEstimationResult> {
  // Extract base64 and mime type from data URL
  const match = base64DataUrl.match(/^data:(image\/[a-zA-Z0-9.-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Formato de imagem inválido. Certifique-se de que é uma imagem válida.");
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
  apiKey: string,
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

