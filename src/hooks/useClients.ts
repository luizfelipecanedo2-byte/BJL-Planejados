import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Client } from "@/types/client";
import { supabase } from "@/lib/supabase";

export function useClients() {
  const { data: clients = [], isLoading: loading, refetch } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        document: item.document || "",
        phone: item.phone || "",
        email: item.email || "",
        address: item.address || "",
        city: item.city || "",
        state: item.state || "",
        zipCode: item.zip_code || "",
        notes: item.notes || "",
        type: item.type || "cliente",
        createdAt: new Date(item.created_at)
      }));
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return { clients, loading, refreshClients: refetch };
}
