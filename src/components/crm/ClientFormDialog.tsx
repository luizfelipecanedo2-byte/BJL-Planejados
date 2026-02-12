import { useState, useEffect } from "react";
import { Client } from "@/types/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ClientFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (client: Omit<Client, "id" | "createdAt">) => void;
    onUpdate?: (id: string, updates: Partial<Client>) => void;
    editingClient?: Client | null;
}

const ClientFormDialog = ({
    open,
    onOpenChange,
    onSubmit,
    onUpdate,
    editingClient,
}: ClientFormDialogProps) => {
    const [form, setForm] = useState({
        name: "",
        document: "",
        phone: "",
        email: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        notes: "",
    });

    useEffect(() => {
        if (editingClient) {
            setForm({
                name: editingClient.name,
                document: editingClient.document,
                phone: editingClient.phone,
                email: editingClient.email,
                address: editingClient.address,
                city: editingClient.city,
                state: editingClient.state,
                zipCode: editingClient.zipCode,
                notes: editingClient.notes || "",
            });
        } else {
            setForm({
                name: "",
                document: "",
                phone: "",
                email: "",
                address: "",
                city: "",
                state: "",
                zipCode: "",
                notes: "",
            });
        }
    }, [editingClient, open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingClient && onUpdate) {
            onUpdate(editingClient.id, form);
        } else {
            onSubmit(form);
        }
        onOpenChange(false);
    };

    const update = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {editingClient ? "Editar Cliente/Fornecedor" : "Novo Cliente/Fornecedor"}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label htmlFor="name">Nome Completo</Label>
                            <Input
                                id="name"
                                value={form.name}
                                onChange={(e) => update("name", e.target.value)}
                                required
                                placeholder="Ex: João da Silva"
                            />
                        </div>

                        <div>
                            <Label htmlFor="document">CPF/CNPJ</Label>
                            <Input
                                id="document"
                                value={form.document}
                                onChange={(e) => update("document", e.target.value)}
                                placeholder="000.000.000-00"
                            />
                        </div>

                        <div>
                            <Label htmlFor="phone">Telefone</Label>
                            <Input
                                id="phone"
                                value={form.phone}
                                onChange={(e) => update("phone", e.target.value)}
                                required
                                placeholder="(00) 00000-0000"
                            />
                        </div>

                        <div className="col-span-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={form.email}
                                onChange={(e) => update("email", e.target.value)}
                                placeholder="email@contato.com"
                            />
                        </div>

                        <div className="col-span-2">
                            <Label htmlFor="address">Endereço</Label>
                            <Input
                                id="address"
                                value={form.address}
                                onChange={(e) => update("address", e.target.value)}
                                placeholder="Rua, Número, Bairro"
                            />
                        </div>

                        <div>
                            <Label htmlFor="city">Cidade</Label>
                            <Input
                                id="city"
                                value={form.city}
                                onChange={(e) => update("city", e.target.value)}
                            />
                        </div>

                        <div>
                            <Label htmlFor="state">Estado</Label>
                            <Input
                                id="state"
                                value={form.state}
                                onChange={(e) => update("state", e.target.value)}
                                placeholder="UF"
                                maxLength={2}
                            />
                        </div>

                        <div className="col-span-2">
                            <Label htmlFor="notes">Observações</Label>
                            <Textarea
                                id="notes"
                                value={form.notes}
                                onChange={(e) => update("notes", e.target.value)}
                                placeholder="Informações adicionais..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit">
                            {editingClient ? "Salvar" : "Adicionar"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ClientFormDialog;
