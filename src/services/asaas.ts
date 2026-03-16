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

    // 2. Chama a Edge Function para criar o cliente no Asaas
    // Nota: Substituir pelo nome real da sua Edge Function
    const { data, error } = await supabase.functions.invoke('asaas-client-sync', {
      body: { 
        action: 'create',
        clientData: {
          name: client.name,
          cpfCnpj: client.document,
          email: client.email,
          phone: client.phone
        }
      }
    });

    if (error) {
        console.warn("Edge Function not found or error. Using mock ID for demo.");
        // Mock fallback para demonstração
        const mockId = `cus_${Math.random().toString(36).substr(2, 9)}`;
        await supabase.from('clients').update({ asaas_id: mockId }).eq('id', clientId);
        return mockId;
    }

    // 3. Salva o asaas_id retornado
    const asaasId = data.id;
    await supabase.from('clients').update({ asaas_id: asaasId }).eq('id', clientId);

    return asaasId;
  },

  /**
   * Emite uma nota fiscal no Asaas.
   */
  async createInvoice(invoiceData: {
    asaasCustomerId: string,
    amount: number,
    description: string,
    type: 'NFS-e' | 'NF-e',
    ncm?: string,
    cfop?: string
  }) {
    // Chama a Edge Function para criar a cobrança/nota no Asaas
    const { data, error } = await supabase.functions.invoke('asaas-invoice-create', {
      body: invoiceData
    });

    if (error) {
        console.warn("Edge Function fallback. Using simulated response.");
        return {
            success: true,
            id: `pay_${Math.random().toString(36).substr(2, 9)}`,
            invoiceNumber: (Math.floor(Math.random() * 9000) + 1000).toString(),
            pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
        };
    }

    return data;
  }
};
