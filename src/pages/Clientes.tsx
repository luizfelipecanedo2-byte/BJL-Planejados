
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Client } from "@/types/client";
import ClientTable from "@/components/crm/ClientTable";
import ClientFormDialog from "@/components/crm/ClientFormDialog";
import { supabase } from "@/lib/supabase";

const Clientes = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('created_at', { ascending: false });

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
                createdAt: new Date(item.created_at)
            }));

            setClients(mappedClients);
        } catch (error) {
            console.error('Error fetching clients:', error);
            toast.error("Erro ao carregar clientes.");
        }
    };

    const handleNewClient = () => {
        setEditingClient(null);
        setIsDialogOpen(true);
    };

    const handleEditClient = (client: Client) => {
        setEditingClient(client);
        setIsDialogOpen(true);
    };

    const handleDeleteClient = async (id: string) => {
        if (!window.confirm("Tem certeza que deseja remover este cliente?")) return;
        try {
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setClients(clients.filter(c => c.id !== id));
            toast.success("Cliente removido com sucesso!");
        } catch (error) {
            console.error('Error deleting client:', error);
            toast.error("Erro ao remover cliente.");
        }
    };

    const handleSubmit = async (clientData: Omit<Client, "id" | "createdAt">) => {
        try {
            const newClient = {
                name: clientData.name,
                document: clientData.document,
                phone: clientData.phone,
                email: clientData.email,
                address: clientData.address,
                city: clientData.city,
                state: clientData.state,
                zip_code: clientData.zipCode,
                notes: clientData.notes
            };

            const { data, error } = await supabase
                .from('clients')
                .insert([newClient])
                .select()
                .single();

            if (error) throw error;

            const createdClient: Client = {
                id: data.id,
                name: data.name,
                document: data.document || "",
                phone: data.phone || "",
                email: data.email || "",
                address: data.address || "",
                city: data.city || "",
                state: data.state || "",
                zipCode: data.zip_code || "",
                notes: data.notes || "",
                createdAt: new Date(data.created_at)
            };

            setClients([createdClient, ...clients]);
            toast.success("Cliente cadastrado com sucesso!");
        } catch (error) {
            console.error('Error adding client:', error);
            toast.error("Erro ao cadastrar cliente.");
        }
    };

    const handleUpdate = async (id: string, updates: Partial<Client>) => {
        try {
            const updateData: any = {};
            if (updates.name) updateData.name = updates.name;
            if (updates.document) updateData.document = updates.document;
            if (updates.phone) updateData.phone = updates.phone;
            if (updates.email) updateData.email = updates.email;
            if (updates.address) updateData.address = updates.address;
            if (updates.city) updateData.city = updates.city;
            if (updates.state) updateData.state = updates.state;
            if (updates.zipCode) updateData.zip_code = updates.zipCode;
            if (updates.notes) updateData.notes = updates.notes;

            const { error } = await supabase
                .from('clients')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            setClients(clients.map(client =>
                client.id === id ? { ...client, ...updates } : client
            ));
            toast.success("Cliente atualizado com sucesso!");
        } catch (error) {
            console.error('Error updating client:', error);
            toast.error("Erro ao atualizar cliente.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Cliente e Fornecedores</h2>
                <Button onClick={handleNewClient} size="sm" className="gap-1.5">
                    <UserPlus className="h-4 w-4" />
                    Novo Cliente/Fornecedor
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Base de Clientes e Fornecedores</CardTitle>
                </CardHeader>
                <CardContent>
                    <ClientTable
                        clients={clients}
                        onEdit={handleEditClient}
                        onDelete={handleDeleteClient}
                    />
                </CardContent>
            </Card>

            <ClientFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSubmit={handleSubmit}
                onUpdate={handleUpdate}
                editingClient={editingClient}
            />
        </div>
    );
};

export default Clientes;
