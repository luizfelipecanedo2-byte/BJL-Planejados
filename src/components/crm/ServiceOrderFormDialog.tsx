import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Client } from "@/types/client";
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
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Clipboard } from "lucide-react";

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
        notes: "",
    });

    const [clients, setClients] = useState<Client[]>([]);
    const [openClientSelect, setOpenClientSelect] = useState(false);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const { data } = await supabase.from('clients').select('*').order('name');
                if (data) {
                    const mappedClients: Client[] = data.map((item: any) => ({
                        id: item.id,
                        name: item.name,
                        phone: item.phone || "",
                        email: item.email || "",
                        address: item.address || "",
                        city: item.city || "",
                        state: item.state || "",
                        zipCode: item.zip_code || "",
                        document: item.document || "",
                        notes: item.notes || "",
                        createdAt: new Date(item.created_at)
                    }));
                    setClients(mappedClients);
                }
            } catch (error) {
                console.error("Error fetching clients", error);
            }
        };
        fetchClients();
    }, []);

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
                notes: editingOrder.notes || "",
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
                notes: "",
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
                    <Tabs defaultValue="geral" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="geral" className="gap-2">
                                <Clipboard className="h-4 w-4" />
                                Geral
                            </TabsTrigger>
                            <TabsTrigger value="observacao" className="gap-2">
                                <MessageSquare className="h-4 w-4" />
                                Observações
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="geral" className="space-y-4 pt-4">
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
                                <div className="col-span-2 flex flex-col gap-2">
                                    <Label htmlFor="client">Cliente</Label>
                                    <Popover open={openClientSelect} onOpenChange={setOpenClientSelect}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openClientSelect}
                                                className="w-full justify-between font-normal"
                                            >
                                                {form.client
                                                    ? clients.find((client) => client.name === form.client)?.name || form.client
                                                    : "Selecione..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[400px] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Buscar..." />
                                                <CommandList>
                                                    <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
                                                    <CommandGroup>
                                                        {clients.map((client) => (
                                                            <CommandItem
                                                                key={client.id}
                                                                value={client.name}
                                                                onSelect={() => {
                                                                    update("client", client.name);
                                                                    setOpenClientSelect(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        form.client === client.name ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {client.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
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
                        </TabsContent>

                        <TabsContent value="observacao" className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="notes">Observações para os Marceneiros</Label>
                                <Textarea
                                    id="notes"
                                    value={form.notes}
                                    onChange={(e) => update("notes", e.target.value)}
                                    placeholder="Digite aqui as orientações e observações técnicas..."
                                    className="min-h-[200px] resize-none"
                                />
                                <p className="text-xs text-muted-foreground italic">
                                    Use este espaço para detalhar o projeto, materiais ou qualquer instrução importante para a produção.
                                </p>
                            </div>
                        </TabsContent>
                    </Tabs>

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
