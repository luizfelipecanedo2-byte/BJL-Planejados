import { useState, useEffect } from "react";
import { Sale } from "@/types/sale";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner"; // Assuming sonner is used for toasts

export function useSales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sales:', error);
        return;
      }

      if (data) {
        const mappedSales: Sale[] = data.map((item: any) => ({
          id: item.id,
          clientName: item.client_name,
          clientPhone: item.client_phone || "",
          clientEmail: item.client_email || "",
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
        }));
        setSales(mappedSales);
      }
    } catch (error) {
      console.error('Error in fetchSales:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSale = async (sale: Omit<Sale, "id" | "createdAt">) => {
    try {
      const isClosed = sale.status === "fechado" || sale.status === "pos_venda";
      const closedDate = isClosed ? (sale.closedDate || new Date().toISOString().split("T")[0]) : null;

      const newSale = {
        client_name: sale.clientName,
        client_phone: sale.clientPhone,
        client_email: sale.clientEmail,
        product: sale.product,
        quantity: sale.quantity,
        unit_price: sale.unitPrice,
        total_value: sale.totalValue,
        status: sale.status,
        channel: sale.channel || null,
        contact_date: sale.contactDate || null,
        expected_close_date: sale.expectedCloseDate || null,
        closed_date: closedDate,
        notes: sale.notes
      };

      const { data, error } = await supabase
        .from('sales')
        .insert([newSale])
        .select()
        .single();

      if (error) {
        console.error('Error adding sale details:', error);
        toast.error(`Erro ao adicionar venda: ${error.message || 'Verifique o console'}`);
        return;
      }

      if (data) {
        const createdSale: Sale = {
          id: data.id,
          clientName: data.client_name,
          clientPhone: data.client_phone || "",
          clientEmail: data.client_email || "",
          product: data.product,
          quantity: data.quantity,
          unitPrice: Number(data.unit_price),
          totalValue: Number(data.total_value),
          status: data.status,
          channel: data.channel,
          contactDate: data.contact_date,
          expectedCloseDate: data.expected_close_date,
          closedDate: data.closed_date,
          notes: data.notes,
          createdAt: data.created_at,
          budget_id: data.budget_id,
        };
        setSales((prev) => [createdSale, ...prev]);
        toast.success("Venda adicionada com sucesso!");
      }
    } catch (error) {
      console.error('Error adding sale:', error);
      toast.error("Erro ao adicionar venda.");
    }
  };

  const updateSale = async (id: string, updates: Partial<Sale>) => {
    try {
      const updateData: any = {};
      if (updates.clientName !== undefined) updateData.client_name = updates.clientName;
      if (updates.clientPhone !== undefined) updateData.client_phone = updates.clientPhone;
      if (updates.clientEmail !== undefined) updateData.client_email = updates.clientEmail;
      if (updates.product !== undefined) updateData.product = updates.product;
      if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
      if (updates.unitPrice !== undefined) updateData.unit_price = updates.unitPrice;
      if (updates.totalValue !== undefined) updateData.total_value = updates.totalValue;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.channel !== undefined) updateData.channel = updates.channel;
      if (updates.contactDate !== undefined) updateData.contact_date = updates.contactDate;
      if (updates.expectedCloseDate !== undefined) updateData.expected_close_date = updates.expectedCloseDate;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

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

      if (error) {
        console.error('Error updating sale:', error);
        toast.error("Erro ao atualizar venda.");
        return;
      }

      setSales((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates, closedDate: updateData.closed_date } : s))
      );
      toast.success("Venda atualizada!");
    } catch (error) {
      console.error('Error updating sale:', error);
      toast.error("Erro ao atualizar venda.");
    }
  };

  const deleteSale = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting sale:', error);
        toast.error("Erro ao remover venda.");
        return;
      }

      setSales((prev) => prev.filter((s) => s.id !== id));
      toast.success("Venda removida.");
    } catch (error) {
      console.error('Error deleting sale:', error);
      toast.error("Erro ao remover venda.");
    }
  };

  const updateStatus = async (id: string, status: Sale["status"]) => {
    await updateSale(id, { status });
  };

  return { sales, loading, addSale, updateSale, deleteSale, updateStatus };
}
