import { useState, useEffect } from "react";
import { ServiceOrder, ServiceType, ServiceStatus } from "@/types/serviceOrder";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ServiceOrderFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (order: Omit<ServiceOrder, "id">) => void;
    onUpdate?: (id: string, updates: Partial<ServiceOrder>) => void;
    editingOrder?: ServiceOrder | null;
}

const ServiceOrderFormDialog = ({
    open,
    onOpenChange,
    onSubmit,
    onUpdate,
    editingOrder,
}: ServiceOrderFormDialogProps) => {
    const [form, setForm] = useState({
        ticketNumber: "",
        client: "",
        type: "Fabricação" as ServiceType,
        action: "",
        status: "Em Andamento" as ServiceStatus,
        openDate: new Date().toISOString().split("T")[0],
        forecastDate: "",
        completionDate: "",
    });

    useEffect(() => {
        if (editingOrder) {
            setForm({
                ticketNumber: editingOrder.ticketNumber,
                client: editingOrder.client,
                type: editingOrder.type,
                action: editingOrder.action,
                status: editingOrder.status,
                openDate: new Date(editingOrder.openDate).toISOString().split("T")[0],
                forecastDate: new Date(editingOrder.forecastDate).toISOString().split("T")[0],
                completionDate: editingOrder.completionDate
                    ? new Date(editingOrder.completionDate).toISOString().split("T")[0]
                    : "",
            });
        } else {
            setForm({
                ticketNumber: "", // Idealmente seria gerado
                client: "",
                type: "Fabricação",
                action: "",
                status: "Em Andamento",
                openDate: new Date().toISOString().split("T")[0],
                forecastDate: "",
                completionDate: "",
            });
        }
    }, [editingOrder, open]);

    const handleDateChange = (field: string, value: string) => {
        setForm((prev) => {
            const updates = { ...prev, [field]: value };

            // Regra: Quando digitar a data da conclusão o status já muda para encerrado
            if (field === "completionDate" && value) {
                updates.status = "Encerrado";
            }

            return updates;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Converter strings de data para objetos Date
        const submitData = {
            ...form,
            openDate: new Date(form.openDate),
            forecastDate: new Date(form.forecastDate),
            completionDate: form.completionDate ? new Date(form.completionDate) : undefined,
        };

        if (editingOrder && onUpdate) {
            onUpdate(editingOrder.id, submitData);
        } else {
            onSubmit(submitData);
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
                        {editingOrder ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="ticketNumber">N° Chamado</Label>
                            <Input
                                id="ticketNumber"
                                value={form.ticketNumber}
                                onChange={(e) => update("ticketNumber", e.target.value)}
                                required
                                placeholder="Ex: OS-123"
                            />
                        </div>
                        <div>
                            <Label htmlFor="openDate">Data de Abertura</Label>
                            <Input
                                id="openDate"
                                type="date"
                                value={form.openDate}
                                onChange={(e) => update("openDate", e.target.value)}
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <Label htmlFor="client">Cliente</Label>
                            <Input
                                id="client"
                                value={form.client}
                                onChange={(e) => update("client", e.target.value)}
                                required
                                placeholder="Nome do Cliente"
                            />
                        </div>
                        <div>
                            <Label htmlFor="type">Tipo</Label>
                            <Select
                                value={form.type}
                                onValueChange={(v) => update("type", v as ServiceType)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Fabricação">Fabricação</SelectItem>
                                    <SelectItem value="Assistência">Assistência</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={form.status}
                                onValueChange={(v) => update("status", v as ServiceStatus)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                                    <SelectItem value="Encerrado">Encerrado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-2">
                            <Label htmlFor="action">Ação</Label>
                            <Input
                                id="action"
                                value={form.action}
                                onChange={(e) => update("action", e.target.value)}
                                required
                                placeholder="Descrição do serviço a ser realizado"
                            />
                        </div>
                        <div>
                            <Label htmlFor="forecastDate">Previsão de Finalização</Label>
                            <Input
                                id="forecastDate"
                                type="date"
                                value={form.forecastDate}
                                onChange={(e) => update("forecastDate", e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="completionDate">Data de Conclusão</Label>
                            <Input
                                id="completionDate"
                                type="date"
                                value={form.completionDate}
                                onChange={(e) => handleDateChange("completionDate", e.target.value)}
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
                            {editingOrder ? "Salvar" : "Adicionar"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ServiceOrderFormDialog;
