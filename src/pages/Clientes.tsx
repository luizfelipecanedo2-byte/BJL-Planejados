
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Truck, UserPlus, Plus, Hammer, Search, MapPin, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Client } from "@/types/client";
import ClientTable from "@/components/crm/ClientTable";
import ClientFormDialog from "@/components/crm/ClientFormDialog";
import { supabase } from "@/lib/supabase";
import { MagicButton } from "@/components/ui/magic-button";
import ClientTimeline from "@/components/crm/ClientTimeline";
import ClientFilesDialog from "@/components/crm/ClientFilesDialog";
import { EquipeTab } from "@/components/configuracoes/EquipeTab";

const Clientes = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [activeTab, setActiveTab] = useState("cliente");
    const [isTimelineOpen, setIsTimelineOpen] = useState(false);
    const [selectedTimelineClient, setSelectedTimelineClient] = useState<Client | null>(null);
    const [isFilesOpen, setIsFilesOpen] = useState(false);
    const [selectedFilesClient, setSelectedFilesClient] = useState<Client | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

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

    const handleViewTimeline = (client: Client) => {
        setSelectedTimelineClient(client);
        setIsTimelineOpen(true);
    };

    const handleViewFiles = (client: Client) => {
        setSelectedFilesClient(client);
        setIsFilesOpen(true);
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
                type: clientData.type || activeTab // Use active tab as fallback
            };

            const { data, error } = await supabase
                .from('clients')
                .insert([newClient])
                .select()
                .single();

            if (error) {
                console.error('Error adding client:', error);
                if (error.code === '42703') {
                    toast.error("Erro no Banco de Dados: A coluna 'type' está faltando na tabela de clientes. Por favor, execute o script SQL de correção.");
                } else {
                    toast.error(`Erro ao cadastrar cliente: ${error.message || "Tente novamente."}`);
                }
                return;
            }

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
        } catch (error: any) {
            console.error('Error adding client:', error);
            toast.error("Erro inesperado ao cadastrar cliente.");
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

    const totalClientsCount = clients.filter(c => c.type === 'cliente').length;
    const totalSuppliersCount = clients.filter(c => c.type === 'fornecedor').length;
    const mappedAddressesCount = clients.filter(c => Boolean(c.address || c.city)).length;
    const activePhonesCount = clients.filter(c => Boolean(c.phone)).length;

    const filterList = (list: Client[]) => {
        if (!searchQuery.trim()) return list;
        const q = searchQuery.toLowerCase();
        return list.filter(c =>
            c.name?.toLowerCase().includes(q) ||
            c.document?.toLowerCase().includes(q) ||
            c.phone?.toLowerCase().includes(q) ||
            c.city?.toLowerCase().includes(q) ||
            c.address?.toLowerCase().includes(q)
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <span className="tech-hud-pill text-primary border-primary/25 bg-primary/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                            PEOPLE.HUB // v2.6
                        </span>
                        <span className="text-[10px] font-mono font-semibold text-emerald-400 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            {clients.length} Registros Ativos
                        </span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight text-white">
                        Clientes, Fornecedores & <span className="shimmer-gold">Equipe</span>
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        Base unificada de relacionamento, obras mapeadas por GPS, parceiros homologados e colaboradores da fábrica.
                    </p>
                </div>
                {activeTab !== "colaborador" && (
                    <MagicButton onClick={handleNewClient} className="gap-2 h-11 px-6 rounded-2xl shadow-xl shadow-primary/20 font-display font-bold text-xs">
                        <UserPlus className="h-4 w-4" />
                        Novo Registro
                    </MagicButton>
                )}
            </div>

            {/* Bento KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="executive-card border-metallic p-5 rounded-3xl flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                            Carteira de Clientes
                        </span>
                        <span className="text-2xl sm:text-3xl font-mono font-black text-white tabular-nums">
                            {totalClientsCount}
                        </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                        <Users className="h-5 w-5" />
                    </div>
                </div>

                <div className="executive-card border-metallic p-5 rounded-3xl flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                            Fornecedores
                        </span>
                        <span className="text-2xl sm:text-3xl font-mono font-black text-cyan-400 tabular-nums">
                            {totalSuppliersCount}
                        </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                        <Truck className="h-5 w-5" />
                    </div>
                </div>

                <div className="executive-card border-metallic p-5 rounded-3xl flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                            Obras c/ Rota GPS
                        </span>
                        <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-400 tabular-nums">
                            {mappedAddressesCount}
                        </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <MapPin className="h-5 w-5" />
                    </div>
                </div>

                <div className="executive-card border-metallic p-5 rounded-3xl flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                            Canais WhatsApp
                        </span>
                        <span className="text-2xl sm:text-3xl font-mono font-black text-amber-400 tabular-nums">
                            {activePhonesCount}
                        </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                </div>
            </div>

            <Tabs defaultValue="cliente" className="w-full space-y-6" onValueChange={setActiveTab}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <TabsList className="glass-panel-pro p-1.5 rounded-2xl h-auto shadow-xl inline-flex flex-wrap gap-1 w-fit">
                        <TabsTrigger value="cliente" className="gap-2 rounded-xl px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all font-display font-bold text-xs">
                            <Users className="h-4 w-4" />
                            <span>Clientes</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-black/20 font-mono text-[10px]">{totalClientsCount}</span>
                        </TabsTrigger>
                        <TabsTrigger value="fornecedor" className="gap-2 rounded-xl px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all font-display font-bold text-xs">
                            <Truck className="h-4 w-4" />
                            <span>Fornecedores</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-black/20 font-mono text-[10px]">{totalSuppliersCount}</span>
                        </TabsTrigger>
                        <TabsTrigger value="colaborador" className="gap-2 rounded-xl px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all font-display font-bold text-xs">
                            <Hammer className="h-4 w-4" />
                            <span>Colaboradores (Equipe)</span>
                        </TabsTrigger>
                    </TabsList>

                    {activeTab !== "colaborador" && (
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar por nome, CPF/CNPJ, telefone ou cidade..."
                                className="pl-10 h-10 rounded-xl bg-white/[0.03] border-white/10 text-xs focus-visible:ring-primary/40"
                            />
                        </div>
                    )}
                </div>

                <TabsContent value="cliente">
                    <div className="executive-card border-metallic rounded-[2rem] p-5 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-display font-bold uppercase tracking-wider text-white">Base de Clientes</h3>
                                <p className="text-[10px] font-mono text-muted-foreground">Acesso rápido a Central 360º, arquivos da obra e rotas GPS</p>
                            </div>
                        </div>
                        <ClientTable
                            clients={filterList(clients.filter(c => c.type === 'cliente'))}
                            onEdit={handleEditClient}
                            onDelete={handleDeleteClient}
                            onViewTimeline={handleViewTimeline}
                            onViewFiles={handleViewFiles}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="fornecedor">
                    <div className="executive-card border-metallic rounded-[2rem] p-5 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-display font-bold uppercase tracking-wider text-white">Base de Fornecedores Homologados</h3>
                                <p className="text-[10px] font-mono text-muted-foreground">Parceiros de chapas MDF, ferragens, insumos e serviços terceirizados</p>
                            </div>
                        </div>
                        <ClientTable
                            clients={filterList(clients.filter(c => c.type === 'fornecedor'))}
                            onEdit={handleEditClient}
                            onDelete={handleDeleteClient}
                            onViewTimeline={handleViewTimeline}
                            onViewFiles={handleViewFiles}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="colaborador">
                    <EquipeTab />
                </TabsContent>
            </Tabs>

            <ClientFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSubmit={handleSubmit}
                onUpdate={handleUpdate}
                editingClient={editingClient}
                initialType={activeTab as "cliente" | "fornecedor"}
            />

            <ClientTimeline
                client={selectedTimelineClient}
                open={isTimelineOpen}
                onOpenChange={setIsTimelineOpen}
            />

            <ClientFilesDialog
                client={selectedFilesClient}
                open={isFilesOpen}
                onOpenChange={setIsFilesOpen}
            />
        </div>
    );
};

export default Clientes;
