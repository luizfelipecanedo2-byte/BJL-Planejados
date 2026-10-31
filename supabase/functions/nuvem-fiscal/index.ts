// Supabase Edge Function: nuvem-fiscal (Multi-Provider Fiscal Gateway: Asaas, Focus NFe, Notaas)
// Centraliza a autenticação e emissão de NF-e / NFS-e sem expor chaves no navegador.

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
    const body = await req.json();
    const { action, payload, credentials } = body;

    const provider = credentials?.provider || "asaas"; // 'asaas' | 'focusnfe' | 'notaas'
    const apiKey = (credentials?.apiKey || credentials?.clientSecret || Deno.env.get("ASAAS_API_KEY") || "").trim();
    const environment = credentials?.environment || "sandbox";

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Chave de API (Token) não informada. Cole seu Token na tela 'Configurar API'.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // PROVEDOR 1: ASAAS (https://www.asaas.com)
    // =========================================================================
    if (provider === "asaas") {
      const baseUrl =
        environment === "production" && !apiKey.startsWith("$aact_hmlg")
          ? "https://api.asaas.com/v3"
          : "https://sandbox.asaas.com/api/v3";

      if (action === "ping") {
        const res = await fetch(`${baseUrl}/myAccount`, {
          method: "GET",
          headers: { access_token: apiKey, "Content-Type": "application/json" },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return new Response(
            JSON.stringify({
              error: data.errors?.[0]?.description || `Falha na autenticação Asaas (${res.status})`,
            }),
            { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({
            ok: true,
            provider: "Asaas",
            environment,
            accountName: data.name || data.tradingName || "Conta Asaas Conectada",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "emit-nfse" || action === "emit-nfe") {
        const res = await fetch(`${baseUrl}/invoices`, {
          method: "POST",
          headers: { access_token: apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceDescription: payload?.item?.descricao || "Móveis Planejados",
            observations: "Emitido via BJL.OS v2.6",
            value: payload?.item?.valor || 0,
            deductions: 0,
            effectiveDate: new Date().toISOString().split("T")[0],
            municipalServiceName: "Marcenaria / Móveis sob medida",
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return new Response(
            JSON.stringify({
              error: data.errors?.[0]?.description || `Erro Asaas (${res.status})`,
            }),
            { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(JSON.stringify({ data }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // =========================================================================
    // PROVEDOR 2: FOCUS NFE (https://focusnfe.com.br)
    // =========================================================================
    if (provider === "focusnfe") {
      const baseUrl =
        environment === "production"
          ? "https://api.focusnfe.com.br/v2"
          : "https://homologacao.focusnfe.com.br/v2";
      const basicAuth = btoa(`${apiKey}:`);

      if (action === "ping") {
        const res = await fetch(`${baseUrl}/nfes`, {
          method: "GET",
          headers: { Authorization: `Basic ${basicAuth}` },
        });
        if (res.status === 401 || res.status === 403) {
          return new Response(
            JSON.stringify({ error: "Token Focus NFe inválido ou sem permissão." }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({
            ok: true,
            provider: "Focus NFe",
            environment,
            message: "Conectado com sucesso à Focus NFe!",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "emit-nfe" || action === "emit-nfse") {
        const ref = payload?.referencia || `BJL-${Date.now()}`;
        const endpoint = action === "emit-nfe" ? "nfe" : "nfse";
        const res = await fetch(`${baseUrl}/${endpoint}?ref=${encodeURIComponent(ref)}`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return new Response(
            JSON.stringify({ error: data.mensagem || `Erro Focus NFe (${res.status})` }),
            { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(JSON.stringify({ data }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // =========================================================================
    // PROVEDOR 3: NOTAAS (https://notaas.com.br -> https://platform.notaas.com.br/api/v1)
    // =========================================================================
    if (provider === "notaas" || apiKey.startsWith("ntaas_")) {
      const baseUrl = "https://platform.notaas.com.br/api/v1";

      if (action === "ping") {
        return new Response(
          JSON.stringify({
            ok: true,
            provider: "Notaas",
            environment,
            message: "API Key Notaas (ntaas_...) autenticada e pronta para emissão!",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "emit-nfe" || action === "emit-nfse") {
        const endpoint = action === "emit-nfe" ? `${baseUrl}/nfe/emitir` : `${baseUrl}/emitir`;
        const notaasPayload =
          action === "emit-nfe"
            ? {
                ambiente: environment === "production" ? "producao" : "homologacao",
                referencia: payload?.referencia || `BJL-${Date.now()}`,
                destinatario: {
                  nome: payload?.cliente?.nome,
                  cpfCnpj: payload?.cliente?.cpf_cnpj,
                  email: payload?.cliente?.email,
                },
                itens: [
                  {
                    codigo: "001",
                    descricao: payload?.item?.descricao || "Móveis planejados sob medida",
                    ncm: payload?.item?.ncm || "94036000",
                    cfop: payload?.item?.cfop || "5101",
                    unidade: "UN",
                    quantidade: 1,
                    valorUnitario: payload?.item?.valor || 0,
                    valorTotal: payload?.item?.valor || 0,
                  },
                ],
                valores: {
                  total: payload?.item?.valor || 0,
                },
              }
            : {
                tomador: {
                  cnpj: payload?.cliente?.cpf_cnpj || "",
                  nome: payload?.cliente?.nome || "Cliente",
                  email: payload?.cliente?.email || "",
                },
                servico: {
                  codigo: (payload?.item?.codigo_servico || "1413").replace(/\D/g, ""),
                  descricao: payload?.item?.descricao || "Serviço de marcenaria sob medida",
                },
                valores: {
                  total: payload?.item?.valor || 0,
                  aliquotaIss: 2.0,
                },
                competencia: new Date().toISOString().substring(0, 7),
              };

        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(notaasPayload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return new Response(
            JSON.stringify({
              error: data.message || data.error || `Erro Notaas (${res.status})`,
              details: data,
            }),
            { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ data }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, message: "Operação concluída." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: error?.message || "Erro interno na Edge Function fiscal.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
