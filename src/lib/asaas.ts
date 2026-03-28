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
 * Realiza fetch direto na API do Asaas.
 * Nota: Pode haver problemas de CORS dependendo da configuração do Asaas.
 * Em produção, geralmente é recomendado usar um proxy ou Edge Function.
 */
export async function fetchDDABoletos(): Promise<AsaasDDABill[]> {
    const apiKey = await getAsaasApiKey();
    if (!apiKey) throw new Error("Chave de API do Asaas não configurada.");

    // Detecta se é sandbox ou produção com base na chave (geralmente chaves de sandbox começam com $) 
    // ou apenas tenta produção por padrão
    const isSandbox = apiKey.startsWith('$');
    const baseUrl = isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://www.asaas.com/api/v3';

    // Proxy to avoid CORS issues in the browser
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(baseUrl + '/bills/dda')}`;

    try {
        const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
                'access_token': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            let errorMsg = "Erro ao buscar boletos no Asaas.";
            try {
                const errorData = await response.json();
                errorMsg = errorData.errors?.[0]?.description || errorData.message || response.statusText;
            } catch(e) {
                errorMsg = response.statusText || "Erro desconhecido HTTP " + response.status;
            }
            console.error("Erro Asaas DDA:", errorMsg);
            throw new Error(errorMsg);
        }

        const result = await response.json();
        return result.data || [];
    } catch (error: any) {
        console.error("Fetch DDA error completo:", error);
        throw error;
    }
}
