// Supabase Edge Function: asaas-proxy
// Centraliza e protege as chamadas bancárias da API do Asaas no lado do servidor.
// Elimina o uso perigoso de proxies públicos (como corsproxy.io) e protege a ASAAS_API_KEY.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

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
    // 1. Tenta obter a chave Asaas primeiro dos Secrets de ambiente do Supabase
    let apiKey = Deno.env.get("ASAAS_API_KEY");

    // 2. Se não estiver no Deno.env, tenta buscar na tabela api_settings do Supabase
    if (!apiKey) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data } = await supabase
          .from("api_settings")
          .select("key_value")
          .eq("key_name", "asaas_api_key")
          .single();
        if (data?.key_value && data.key_value !== "SUA_CHAVE_AQUI") {
          apiKey = data.key_value;
        }
      }
    }

    if (!apiKey || apiKey === "SUA_CHAVE_AQUI") {
      return new Response(
        JSON.stringify({ 
          error: "Chave do Asaas não configurada. Defina ASAAS_API_KEY nos Secrets do Supabase ou na tabela api_settings." 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isSandbox = apiKey.startsWith("$");
    const baseUrl = isSandbox ? "https://sandbox.asaas.com/api/v3" : "https://www.asaas.com/api/v3";

    const { action, payload } = await req.json();

    // AÇÃO 1: Consulta de boletos DDA (Boleto bancário a pagar / recebidos)
    if (action === "bills-dda") {
      const asaasRes = await fetch(`${baseUrl}/bills/dda`, {
        method: "GET",
        headers: {
          access_token: apiKey,
          "Content-Type": "application/json",
        },
      });

      const data = await asaasRes.json().catch(() => ({}));
      if (!asaasRes.ok) {
        const msg = data.errors?.[0]?.description || data.message || `Erro Asaas HTTP ${asaasRes.status}`;
        return new Response(
          JSON.stringify({ error: msg }),
          { status: asaasRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ data: data.data || [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // AÇÃO 2: Criação ou sincronização de cliente no Asaas
    if (action === "client-sync" || action === "create-customer") {
      const clientData = payload?.clientData || payload;
      const asaasRes = await fetch(`${baseUrl}/customers`, {
        method: "POST",
        headers: {
          access_token: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clientData),
      });

      const data = await asaasRes.json().catch(() => ({}));
      if (!asaasRes.ok) {
        const msg = data.errors?.[0]?.description || data.message || `Erro Asaas HTTP ${asaasRes.status}`;
        return new Response(
          JSON.stringify({ error: msg }),
          { status: asaasRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // AÇÃO 3: Criação de Nota Fiscal / Cobrança no Asaas
    if (action === "create-invoice") {
      const invoiceData = payload;
      const asaasRes = await fetch(`${baseUrl}/invoices`, {
        method: "POST",
        headers: {
          access_token: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoiceData),
      });

      const data = await asaasRes.json().catch(() => ({}));
      if (!asaasRes.ok) {
        const msg = data.errors?.[0]?.description || data.message || `Erro Asaas HTTP ${asaasRes.status}`;
        return new Response(
          JSON.stringify({ error: msg }),
          { status: asaasRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Ação inválida: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || "Erro interno no servidor da Edge Function asaas-proxy." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
