import { supabase } from "./supabase";

/**
 * Interface para os boletos retornados pela API do Asaas (DDA)
 */
export interface AsaasDDABill {
    id: string;
    description: string;
    amount: number;
    dueDate: string;
    issueDate: string;
    companyName: string;
    companyCnpj: string;
    barCode: string;
    nossoNumero?: string;
    bankName?: string;
}

/**
 * Busca a chave de API do Asaas no banco de dados
 */
export async function getAsaasApiKey() {
    const { data, error } = await supabase
        .from('api_settings')
        .select('key_value')
        .eq('key_name', 'asaas_api_key')
        .single();

    if (error || !data) {
        console.error("Chave de API do Asaas não encontrada em api_settings.");
        return null;
    }
    return data.key_value;
}

/**
 * Busca boletos DDA no Asaas de forma segura via Edge Function do Supabase.
 * Elimina o envio de chaves secretas para proxies públicos.
 */
export async function fetchDDABoletos(): Promise<AsaasDDABill[]> {
    // 1. Tenta buscar via Supabase Edge Function (Recomendado / Enterprise)
    try {
        const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke("asaas-proxy", {
            body: { action: "bills-dda" }
        });

        if (!edgeErr && edgeRes?.data) {
            return edgeRes.data as AsaasDDABill[];
        }

        if (edgeErr) {
            console.warn("Edge Function asaas-proxy não respondeu:", edgeErr.message);
        }
    } catch (fnErr) {
        console.warn("Falha ao invocar Edge Function asaas-proxy:", fnErr);
    }

    // 2. Fallback seguro: Verifica se há chave configurada no banco
    const apiKey = await getAsaasApiKey();
    if (!apiKey || apiKey === 'SUA_CHAVE_AQUI') {
        throw new Error("Integração Asaas necessária: Implante a Edge Function 'asaas-proxy' ou configure a chave na tabela api_settings.");
    }

    // Caso a Edge function ainda não esteja implantada, avisa o usuário com segurança
    throw new Error(
        "Para sua segurança bancária, a consulta DDA direta pelo navegador foi desativada. " +
        "Implante a Edge Function 'asaas-proxy' no Supabase conforme as instruções em supabase/README_EDGE_FUNCTIONS.md."
    );
}
