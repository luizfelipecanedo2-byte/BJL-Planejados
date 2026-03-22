
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Client } from "@/types/client";
import ClientTable from "@/components/crm/ClientTable";
import ClientFormDialog from "@/components/crm/ClientFormDialog";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Truck, UserPlus } from "lucide-react";
import { MagicButton } from "@/components/ui/magic-button";

const Clientes = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [activeTab, setActiveTab] = useState("cliente");

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
                type: item.type || "cliente",
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
                notes: clientData.notes,
                type: clientData.type || "cliente"
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
                type: data.type || "cliente",
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
            const updateData = {
                name: updates.name,
                document: updates.document,
                phone: updates.phone,
                email: updates.email,
                address: updates.address,
                city: updates.city,
                state: updates.state,
                zip_code: updates.zipCode,
                notes: updates.notes,
                type: updates.type
            };

            // Remove undefined fields to avoid overwriting with null if unintentional
            Object.keys(updateData).forEach(key =>
                (updateData as any)[key] === undefined && delete (updateData as any)[key]
            );

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                   <h2 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-amber-500 to-amber-700 text-glow">Clientes e Fornecedores</h2>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Gestão de Base High-End</p>
                </div>
                <MagicButton onClick={handleNewClient} className="gap-1.5 h-11 px-6 shadow-xl shadow-primary/20">
                    <UserPlus className="h-4 w-4" />
                    Novo Registro
                </MagicButton>
            </div>

            <Tabs defaultValue="cliente" className="w-full space-y-6" onValueChange={setActiveTab}>
                <TabsList className="bg-white/50 backdrop-blur-xl border border-white/40 p-1.5 rounded-full h-auto shadow-sm inline-flex">
                    <TabsTrigger value="cliente" className="gap-2 rounded-full px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all font-bold">
                        <Users className="h-4 w-4" />
                        Clientes
                    </TabsTrigger>
                    <TabsTrigger value="fornecedor" className="gap-2 rounded-full px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all font-bold">
                        <Truck className="h-4 w-4" />
                        Fornecedores
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="cliente">
                    <Card>
                        <CardHeader>
                            <CardTitle>Base de Clientes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ClientTable
                                clients={clients.filter(c => c.type === 'cliente')}
                                onEdit={handleEditClient}
                                onDelete={handleDeleteClient}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="fornecedor">
                    <Card>
                        <CardHeader>
                            <CardTitle>Base de Fornecedores</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ClientTable
                                clients={clients.filter(c => c.type === 'fornecedor')}
                                onEdit={handleEditClient}
                                onDelete={handleDeleteClient}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

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
