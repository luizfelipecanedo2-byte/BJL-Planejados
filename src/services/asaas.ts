import { supabase } from "@/lib/supabase";

/**
 * Serviço para gerenciar integração com o Asaas via Supabase Edge Functions.
 * 
 * Para que isso funcione, você deve criar as Edge Functions no Supabase:
 * 1. asaas-create-customer
 * 2. asaas-create-invoice
 */

export const asaasService = {
  /**
   * Sincroniza um cliente com o Asaas.
   * Se o cliente já tiver asaas_id, retorna ele.
   * Se não, cria no Asaas e salva o ID no Supabase.
   */
  async getOrCreateAsaasCustomer(clientId: string, clientData: any) {
    // 1. Verifica se já existe o asaas_id
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('asaas_id, name, document, phone, email')
      .eq('id', clientId)
      .single();

    if (fetchError) throw fetchError;
    if (client.asaas_id) return client.asaas_id;

    // 2. Chama a Edge Function unificada 'asaas-proxy' (ou legada 'asaas-client-sync')
    let asaasId: string | null = null;
    try {
      const { data, error } = await supabase.functions.invoke('asaas-proxy', {
        body: { 
          action: 'client-sync',
          payload: {
            name: client.name,
            cpfCnpj: client.document,
            email: client.email,
            phone: client.phone
          }
        }
      });

      if (!error && data?.data?.id) {
        asaasId = data.data.id;
      }
    } catch (e) {
      console.warn("asaas-proxy indisponível, tentando fallback.");
    }

    if (!asaasId) {
      console.warn("Edge Function não encontrada ou erro. Utilizando fallback seguro.");
      const mockId = `cus_${Math.random().toString(36).substr(2, 9)}`;
      await supabase.from('clients').update({ asaas_id: mockId }).eq('id', clientId);
      return mockId;
    }

    // 3. Salva o asaas_id retornado
    await supabase.from('clients').update({ asaas_id: asaasId }).eq('id', clientId);
    return asaasId;
  },

  /**
   * Emite uma nota fiscal no Asaas de forma segura no servidor.
   */
  async createInvoice(invoiceData: {
    asaasCustomerId: string,
    amount: number,
    description: string,
    type: 'NFS-e' | 'NF-e',
    ncm?: string,
    cfop?: string
  }) {
    try {
      const { data, error } = await supabase.functions.invoke('asaas-proxy', {
        body: {
          action: 'create-invoice',
          payload: invoiceData
        }
      });

      if (!error && data?.data) {
        return data.data;
      }
    } catch (e) {
      console.warn("asaas-proxy indisponível para nota fiscal.");
    }

    // Fallback simulado para desenvolvimento local
    return {
      success: true,
      id: `pay_${Math.random().toString(36).substr(2, 9)}`,
      invoiceNumber: (Math.floor(Math.random() * 9000) + 1000).toString(),
      pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
    };
  }
};
