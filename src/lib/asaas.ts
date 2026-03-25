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

    try {
        const response = await fetch(`${baseUrl}/bills/dda`, {
            method: 'GET',
            headers: {
                'access_token': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.errors?.[0]?.description || "Erro ao buscar boletos no Asaas.");
        }

        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.error("Fetch DDA error:", error);
        throw error;
    }
}
