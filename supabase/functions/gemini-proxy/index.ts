// Supabase Edge Function: gemini-proxy
// Executa análises e estimativas via Gemini 2.5 Flash de forma segura no servidor.
// Protege a chave de API (GEMINI_API_KEY) armazenada nos Secrets do Supabase.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: "GEMINI_API_KEY não configurada nos Secrets do Supabase. Adicione a chave no painel do Supabase." 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, payload } = await req.json();

    if (action === "estimate-materials") {
      const { base64DataUrl, catalog } = payload;
      const match = base64DataUrl?.match(/^data:(image\/[a-zA-Z0-9.-]+);base64,(.+)$/);
      if (!match) {
        return new Response(
          JSON.stringify({ error: "Formato de imagem inválido." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const mimeType = match[1];
      const base64Data = match[2];

      const catalogPromptList = (catalog || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        unit: m.unit,
        price: m.unit_price,
      }));

      const systemInstruction = `Você é um engenheiro de valor e mestre marceneiro especialista da BJL Planejados.
Seu trabalho é analisar o desenho técnico, render 3D ou croqui de um projeto de marcenaria enviado pelo usuário.
Você deve identificar os módulos de móveis presentes (como balcões de pia, armários aéreos, torres de eletros, nichos, gaveteiros), estimar as dimensões do projeto e calcular os materiais exatos do nosso catálogo necessários para fabricar este projeto.

Aqui está o nosso CATÁLOGO DE MATERIAIS disponíveis (com seus respectivos IDs e unidades de medida):
${JSON.stringify(catalogPromptList, null, 2)}

Regras de estimativa:
1. Para cada chapa de MDF, lembre-se de que uma chapa padrão tem 2,75m x 1,84m (aprox. 5m²). Analise a área de painéis do móvel (laterais, portas, tamponamento de 18mm, divisórias internas de 15mm, fundos de 6mm).
2. Lembre-se de estimar fitas de borda correspondentes (normalmente 22mm para chapas de 15mm/18mm, 35mm ou 45mm para tampos engrossados).
3. Estime ferragens coerentes (corrediças, dobradiças, pistões, fixação, adesivos).
4. Dias de Produção: Estime quantos dias úteis (dias de trabalho de 1 marceneiro) este projeto levará para ser fabricado e montado.

Você DEVE retornar a resposta EXATAMENTE no formato JSON especificado.`;

      const prompt = `Analise este projeto de marcenaria de alto padrão. Identifique o tipo de ambiente, descreva sucintamente a sua lógica de cálculo de materiais no campo 'reasoning' (justificativa clara em português para o marceneiro), e liste cada material necessário mapeado com seu ID exato do catálogo e a quantidade correspondente. Estime também os dias necessários para produção.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `${systemInstruction}\n\n${prompt}` },
                  { inlineData: { mimeType, data: base64Data } },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  reasoning: { type: "STRING" },
                  days_estimated: { type: "INTEGER" },
                  items: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        id: { type: "STRING" },
                        qty: { type: "NUMBER" },
                      },
                      required: ["id", "qty"],
                    },
                  },
                },
                required: ["items", "reasoning", "days_estimated"],
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return new Response(
          JSON.stringify({ error: errorData?.error?.message || `Erro Gemini HTTP ${response.status}` }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await response.json();
      const textContent = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsedResult = JSON.parse(textContent || "{}");

      return new Response(
        JSON.stringify({ data: parsedResult }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "analyze-finance") {
      const { year, dreData, detailedExpenses } = payload;
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
${JSON.stringify((detailedExpenses || []).map((cat: any) => ({ category: cat.category, type: cat.type, total: cat.total })), null, 2)}
`;

      const systemInstruction = `Você é um Consultor Financeiro e CFO Executivo de alto padrão especializado em marcenarias de luxo e empresas de móveis planejados de alto valor.
Seu trabalho é fornecer análises críticas de saúde de caixa, conselhos estratégicos para melhorar a lucratividade, otimizar a despesa de materiais (Custos Variáveis), avaliar impostos e reavaliar despesas fixas.
Seus conselhos devem ser práticos, profissionais, elegantes e direcionados especificamente a um proprietário de fábrica de móveis sob medida.
Retorne sua resposta estritamente no formato JSON especificado.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: `${systemInstruction}\n\nDados financeiros para análise:\n${financePrompt}` }],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  health_status: { type: "STRING", enum: ["Excellent", "Good", "Regular", "Bad"] },
                  analysis_summary: { type: "STRING" },
                  variable_cost_feedback: { type: "STRING" },
                  fixed_expense_feedback: { type: "STRING" },
                  recommendations: {
                    type: "ARRAY",
                    items: { type: "STRING" },
                  },
                },
                required: ["health_status", "analysis_summary", "variable_cost_feedback", "fixed_expense_feedback", "recommendations"],
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return new Response(
          JSON.stringify({ error: errorData?.error?.message || `Erro Gemini HTTP ${response.status}` }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await response.json();
      const textContent = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsedResult = JSON.parse(textContent || "{}");

      return new Response(
        JSON.stringify({ data: parsedResult }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Ação inválida: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || "Erro interno no servidor da Edge Function." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
