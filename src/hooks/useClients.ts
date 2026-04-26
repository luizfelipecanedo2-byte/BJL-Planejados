import { useState, useEffect } from "react";
import { Client } from "@/types/client";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      const mappedClients: Client[] = (data || []).map(item => ({
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

      setClients(mappedClients);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  return { clients, loading, refreshClients: fetchClients };
}
