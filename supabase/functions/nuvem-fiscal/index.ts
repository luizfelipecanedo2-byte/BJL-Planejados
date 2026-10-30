// Supabase Edge Function: nuvem-fiscal
// Integração oficial com a API da Nuvem Fiscal (Plano Gratuito / Sandbox & Produção)
// Suporta autenticação OAuth2, cadastro de Certificado A1 (.pfx) e emissão de NF-e / NFS-e em 1 clique.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function getNuvemFiscalToken(clientId: string, clientSecret: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "empresa nfe nfse cep cnpj",
  });

  const res = await fetch("https://auth.nuvemfiscal.com.br/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || `Falha na autenticação Nuvem Fiscal (HTTP ${res.status})`
    );
  }

  return data.access_token;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, payload, credentials } = body;

    // 1. Busca credenciais dos Secrets do Supabase, do payload de configuração ou da tabela api_settings
    let clientId = credentials?.clientId || Deno.env.get("NUVEM_FISCAL_CLIENT_ID") || "";
    let clientSecret = credentials?.clientSecret || Deno.env.get("NUVEM_FISCAL_CLIENT_SECRET") || "";
    const environment = credentials?.environment || Deno.env.get("NUVEM_FISCAL_ENV") || "sandbox";

    if (!clientId || !clientSecret) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data } = await supabase
          .from("api_settings")
          .select("key_name, key_value")
          .in("key_name", ["nuvem_fiscal_client_id", "nuvem_fiscal_client_secret"]);

        if (data) {
          for (const row of data) {
            if (row.key_name === "nuvem_fiscal_client_id" && !clientId) clientId = row.key_value;
            if (row.key_name === "nuvem_fiscal_client_secret" && !clientSecret) clientSecret = row.key_value;
          }
        }
      }
    }

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({
          error:
            "Credenciais da Nuvem Fiscal não configuradas. Informe o Client ID e Client Secret no botão 'Configurar API Fiscal' ou nos Secrets do Supabase.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = await getNuvemFiscalToken(clientId, clientSecret);
    const baseUrl =
      environment === "production"
        ? "https://api.nuvemfiscal.com.br"
        : "https://api.sandbox.nuvemfiscal.com.br";

    // AÇÃO 1: Testar Conexão / Verificar Status da Conta
    if (action === "ping") {
      return new Response(
        JSON.stringify({
          ok: true,
          environment,
          message: "Autenticado com sucesso na Nuvem Fiscal OAuth2!",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // AÇÃO 2: Enviar Certificado Digital A1 (.pfx em base64 + senha)
    if (action === "upload-certificate") {
      const cnpjClean = (payload.cnpj || "").replace(/\D/g, "");
      const res = await fetch(`${baseUrl}/empresas/${cnpjClean}/certificado`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          certificado: payload.certificateBase64,
          password: payload.password,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return new Response(
          JSON.stringify({ error: data.error?.message || data.message || `Erro HTTP ${res.status}` }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AÇÃO 3: Emitir NFS-e (Nota Fiscal de Serviço - Montagem / Marcenaria)
    if (action === "emit-nfse") {
      const res = await fetch(`${baseUrl}/nfse/dps`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return new Response(
          JSON.stringify({
            error: data.error?.message || data.message || `Erro Nuvem Fiscal NFS-e (${res.status})`,
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

    // AÇÃO 4: Emitir NF-e (Nota Fiscal de Produto Modelo 55 - Móveis Planejados)
    if (action === "emit-nfe") {
      const res = await fetch(`${baseUrl}/nfe`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return new Response(
          JSON.stringify({
            error: data.error?.message || data.message || `Erro Nuvem Fiscal NF-e (${res.status})`,
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

    // AÇÃO 5: Consultar Status de Nota Fiscal
    if (action === "consult-invoice") {
      const endpoint = payload.type === "NF-e" ? "nfe" : "nfse";
      const res = await fetch(`${baseUrl}/${endpoint}/${payload.nuvemFiscalId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));
      return new Response(JSON.stringify({ data }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: `Ação desconhecida: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: error?.message || "Erro interno na Edge Function nuvem-fiscal.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
