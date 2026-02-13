
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Client } from "@/types/client";
import ClientTable from "@/components/crm/ClientTable";
import ClientFormDialog from "@/components/crm/ClientFormDialog";

const mockClients: Client[] = [
    {
        id: "1",
        name: "João Silva",
        document: "123.456.789-00",
        phone: "(11) 99999-1234",
        email: "joao@email.com",
        address: "Rua A, 123",
        city: "São Paulo",
        state: "SP",
        zipCode: "01000-000",
        notes: "Cliente preferencial",
        createdAt: new Date(),
    },
    {
        id: "2",
        name: "Maria Oliveira",
        document: "987.654.321-99",
        phone: "(21) 98888-5678",
        email: "maria@empresa.com",
        address: "Av B, 500",
        city: "Rio de Janeiro",
        state: "RJ",
        zipCode: "20000-000",
        createdAt: new Date(),
    },
];

const Clientes = () => {
    const [clients, setClients] = useState<Client[]>(() => {
        const saved = localStorage.getItem("clients");
        if (saved) {
            return JSON.parse(saved).map((c: any) => ({
                ...c,
                createdAt: new Date(c.createdAt)
            }));
        }
        return mockClients;
    });

    useEffect(() => {
        localStorage.setItem("clients", JSON.stringify(clients));
    }, [clients]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    const handleNewClient = () => {
        setEditingClient(null);
        setIsDialogOpen(true);
    };

    const handleEditClient = (client: Client) => {
        setEditingClient(client);
        setIsDialogOpen(true);
    };

    const handleDeleteClient = (id: string) => {
        setClients(clients.filter(c => c.id !== id));
        toast.success("Cliente removido com sucesso!");
    };

    const handleSubmit = (clientData: Omit<Client, "id" | "createdAt">) => {
        const newClient: Client = {
            ...clientData,
            id: Math.random().toString(36).substr(2, 9),
            createdAt: new Date(),
        };
        setClients([newClient, ...clients]);
        toast.success("Cliente cadastrado com sucesso!");
    };

    const handleUpdate = (id: string, updates: Partial<Client>) => {
        setClients(clients.map(client =>
            client.id === id ? { ...client, ...updates } : client
        ));
        toast.success("Cliente atualizado com sucesso!");
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
