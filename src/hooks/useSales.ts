import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sale } from "@/types/sale";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function useSales() {
  const queryClient = useQueryClient();

  const { data: sales = [], isLoading: loading, refetch } = useQuery<Sale[]>({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sales:', error);
        throw error;
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        clientName: item.client_name,
        clientPhone: item.client_phone || "",
        clientEmail: item.client_email || "",
        clientProfession: item.client_profession || "",
        product: item.product,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        totalValue: Number(item.total_value),
        status: item.status,
        channel: item.channel,
        contactDate: item.contact_date,
        expectedCloseDate: item.expected_close_date,
        closedDate: item.closed_date,
        notes: item.notes,
        createdAt: item.created_at,
        budget_id: item.budget_id,
        temperature: item.temperature || 'morno',
      }));
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const addSaleMutation = useMutation({
    mutationFn: async (sale: Omit<Sale, "id" | "createdAt">) => {
      const isClosed = sale.status === "fechado" || sale.status === "pos_venda";
      const closedDate = isClosed ? (sale.closedDate || new Date().toISOString().split("T")[0]) : null;

      const newSale = {
        client_name: sale.clientName,
        client_phone: sale.clientPhone,
        client_email: sale.clientEmail,
        client_profession: sale.clientProfession || null,
        product: sale.product,
        quantity: sale.quantity,
        unit_price: sale.unitPrice,
        total_value: sale.totalValue,
        status: sale.status,
        channel: sale.channel || null,
        contact_date: sale.contactDate || null,
        expected_close_date: sale.expectedCloseDate || null,
        closed_date: closedDate,
        notes: sale.notes,
        temperature: sale.temperature || 'morno'
      };

      const { data, error } = await supabase
        .from('sales')
        .insert([newSale])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Venda adicionada com sucesso!");
    },
    onError: (error: any) => {
      console.error('Error adding sale:', error);
      toast.error(`Erro ao adicionar venda: ${error.message || 'Erro inesperado'}`);
    }
  });

  const updateSaleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Sale> }) => {
      const updateData: any = {};
      if (updates.clientName !== undefined) updateData.client_name = updates.clientName;
      if (updates.clientPhone !== undefined) updateData.client_phone = updates.clientPhone;
      if (updates.clientEmail !== undefined) updateData.client_email = updates.clientEmail;
      if (updates.clientProfession !== undefined) updateData.client_profession = updates.clientProfession;
      if (updates.product !== undefined) updateData.product = updates.product;
      if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
      if (updates.unitPrice !== undefined) updateData.unit_price = updates.unitPrice;
      if (updates.totalValue !== undefined) updateData.total_value = updates.totalValue;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.channel !== undefined) updateData.channel = updates.channel;
      if (updates.contactDate !== undefined) updateData.contact_date = updates.contactDate;
      if (updates.expectedCloseDate !== undefined) updateData.expected_close_date = updates.expectedCloseDate;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.temperature !== undefined) updateData.temperature = updates.temperature;

      // Handle closedDate based on status
      const currentSale = sales.find(s => s.id === id);
      const newStatus = updates.status || currentSale?.status;
      const isClosed = newStatus === "fechado" || newStatus === "pos_venda";

      if (isClosed) {
        updateData.closed_date = updates.closedDate || currentSale?.closedDate || new Date().toISOString().split("T")[0];
      } else {
        updateData.closed_date = null;
      }

      const { error } = await supabase
        .from('sales')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      return { id, updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Venda atualizada!");
    },
    onError: (error: any) => {
      console.error('Error updating sale:', error);
      toast.error("Erro ao atualizar venda.");
    }
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Venda removida.");
    },
    onError: (error: any) => {
      console.error('Error deleting sale:', error);
      toast.error("Erro ao remover venda.");
    }
  });

  const addSale = async (sale: Omit<Sale, "id" | "createdAt">) => {
    return addSaleMutation.mutateAsync(sale);
  };

  const updateSale = async (id: string, updates: Partial<Sale>) => {
    return updateSaleMutation.mutateAsync({ id, updates });
  };

  const deleteSale = async (id: string) => {
    return deleteSaleMutation.mutateAsync(id);
  };

  const updateStatus = async (id: string, status: Sale["status"]) => {
    return updateSaleMutation.mutateAsync({ id, updates: { status } });
  };

  return { 
    sales, 
    loading, 
    addSale, 
    updateSale, 
    deleteSale, 
    updateStatus, 
    refreshSales: refetch 
  };
}
