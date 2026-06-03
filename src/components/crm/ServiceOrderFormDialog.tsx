import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, File, Upload, X, ExternalLink, Loader2, Clipboard, MessageSquare, Clock, Trash2, Plus } from "lucide-react";
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
        clientId: "",
        type: "Fabricação" as ServiceType,
        action: "",
        status: "Plano de corte" as ServiceStatus,
        openDate: new Date().toISOString().split("T")[0],
        forecastDate: "",
        completionDate: "",
        notes: "",
        attachments: [] as string[],
        amount: 0,
        daysEstimated: 1,
        laborLogs: [] as any[],
    });
    const [isUploading, setIsUploading] = useState(false);

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
                        type: item.type || "cliente",
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
        const initializeForm = async () => {
            if (editingOrder) {
                setForm({
                    ticketNumber: editingOrder.ticketNumber,
                    client: editingOrder.client,
                    clientId: editingOrder.clientId || "",
                    type: editingOrder.type,
                    action: editingOrder.action,
                    status: editingOrder.status,
                    openDate: new Date(editingOrder.openDate).toISOString().split("T")[0],
                    forecastDate: new Date(editingOrder.forecastDate).toISOString().split("T")[0],
                    completionDate: editingOrder.completionDate
                        ? new Date(editingOrder.completionDate).toISOString().split("T")[0]
                        : "",
                    notes: editingOrder.notes || "",
                    attachments: editingOrder.attachments || [],
                    amount: editingOrder.amount || 0,
                    daysEstimated: editingOrder.daysEstimated || 1,
                    laborLogs: editingOrder.laborLogs || [],
                });
            } else if (open) {
                let nextNum = 16;
                try {
                    const { data, error } = await supabase
                        .from('service_orders')
                        .select('ticket_number')
                        .order('created_at', { ascending: false });

                    if (!error && data && data.length > 0) {
                        const numbers = data
                            .map(o => {
                                const match = (o.ticket_number || "").match(/OS-(\d+)/);
                                return match ? parseInt(match[1], 10) : 0;
                            })
                            .filter(n => n > 0);
                        
                        if (numbers.length > 0) {
                            const maxNum = Math.max(...numbers);
                            nextNum = Math.max(16, maxNum + 1);
                        } else {
                            nextNum = Math.max(16, data.length + 1);
                        }
                    }
                } catch (err) {
                    console.error("Error determining next OS number:", err);
                }

                setForm({
                    ticketNumber: `OS-${nextNum.toString().padStart(3, '0')}`,
                    client: "",
                    clientId: "",
                    type: "Fabricação",
                    action: "",
                    status: "Plano de corte",
                    openDate: new Date().toISOString().split("T")[0],
                    forecastDate: "",
                    completionDate: "",
                    notes: "",
                    attachments: [],
                    amount: 0,
                    daysEstimated: 1,
                    laborLogs: [],
                });
            }
        };

        if (open) {
            initializeForm();
        }
    }, [editingOrder, open]);

    const handleDateChange = (field: string, value: string) => {
        setForm((prev) => {
            const updates = { ...prev, [field]: value };
            if (field === "completionDate" && value) {
                updates.status = "Entregue e Finalizado";
            }
            if (field === "status" && value === "Entregue e Finalizado") {
                updates.completionDate = new Date().toISOString().split("T")[0];
            }
            return updates;
        });
    };

    const update = (field: string, value: any) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const addLaborLog = () => {
        const newLog = {
            date: new Date().toISOString().split("T")[0],
            hours: 0,
            description: ""
        };
        update("laborLogs", [...form.laborLogs, newLog]);
    };

    const removeLaborLog = (index: number) => {
        const newLogs = [...form.laborLogs];
        newLogs.splice(index, 1);
        update("laborLogs", newLogs);
    };

    const updateLaborLog = (index: number, field: string, value: any) => {
        const newLogs = [...form.laborLogs];
        let processedValue = value;
        if (field === "hours") {
            processedValue = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
        }
        newLogs[index] = { ...newLogs[index], [field]: processedValue };
        update("laborLogs", newLogs);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = `service_orders/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('attachments')
                .getPublicUrl(filePath);

            update("attachments", [...form.attachments, publicUrl]);
        } catch (error) {
            console.error('Error uploading file:', error);
            alert("Erro ao fazer upload do arquivo.");
        } finally {
            setIsUploading(false);
        }
    };

    const removeAttachment = (url: string) => {
        update("attachments", form.attachments.filter(a => a !== url));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const submitData = {
            ...form,
            openDate: new Date(form.openDate),
            forecastDate: new Date(form.forecastDate),
            completionDate: form.completionDate ? new Date(form.completionDate) : undefined,
            attachments: form.attachments,
            clientId: form.clientId,
            amount: form.amount,
            daysEstimated: form.daysEstimated || 1,
            laborLogs: form.laborLogs.map(l => {
                const dateObj = l.date ? new Date(l.date) : new Date();
                return {
                    ...l,
                    date: isNaN(dateObj.getTime()) ? new Date() : dateObj,
                    hours: isNaN(Number(l.hours)) ? 0 : Number(l.hours)
                };
            })
        };

        if (editingOrder && onUpdate) {
            onUpdate(editingOrder.id, submitData);
        } else {
            onSubmit(submitData);
        }
        onOpenChange(false);
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
                        <TabsList className="grid w-full grid-cols-4 mb-4">
                            <TabsTrigger value="geral" className="gap-2">
                                <Clipboard className="h-4 w-4" />
                                Geral
                            </TabsTrigger>
                            <TabsTrigger value="observacao" className="gap-2">
                                <MessageSquare className="h-4 w-4" />
                                Obs
                            </TabsTrigger>
                            <TabsTrigger value="arquivos" className="gap-2">
                                <File className="h-4 w-4" />
                                Arquivos
                            </TabsTrigger>
                            <TabsTrigger value="horas" className="gap-2">
                                <Clock className="h-4 w-4" />
                                Horas
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="geral" className="space-y-4">
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
                                                                    update("clientId", client.id);
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
                                        onValueChange={(v) => handleDateChange("status", v as ServiceStatus)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Plano de corte">Plano de corte</SelectItem>
                                            <SelectItem value="Pronto para produção">Pronto para produção</SelectItem>
                                            <SelectItem value="Corte da caixa">Corte da caixa</SelectItem>
                                            <SelectItem value="Fita">Fita</SelectItem>
                                            <SelectItem value="Montagem das caixas">Montagem das caixas</SelectItem>
                                            <SelectItem value="Corte das portas + Tamponados">Corte das portas + Tamponados</SelectItem>
                                            <SelectItem value="Colocação dos tamponados">Colocação dos tamponados</SelectItem>
                                            <SelectItem value="Embalagem">Embalagem</SelectItem>
                                            <SelectItem value="Pronto para entrega">Pronto para entrega</SelectItem>
                                            <SelectItem value="Instalação">Instalação</SelectItem>
                                            <SelectItem value="Entregue e Finalizado">Entregue e Finalizado</SelectItem>
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
                                        placeholder="Descrição do serviço"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="forecastDate">Previsão</Label>
                                    <Input
                                        id="forecastDate"
                                        type="date"
                                        value={form.forecastDate}
                                        onChange={(e) => update("forecastDate", e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="completionDate">Conclusão</Label>
                                    <Input
                                        id="completionDate"
                                        type="date"
                                        value={form.completionDate}
                                        onChange={(e) => handleDateChange("completionDate", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="daysEstimated">Dias Estimados</Label>
                                    <Input
                                        id="daysEstimated"
                                        type="number"
                                        min="1"
                                        value={form.daysEstimated}
                                        onChange={(e) => update("daysEstimated", parseInt(e.target.value) || 1)}
                                        placeholder="1"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="amount">Valor do Serviço (R$)</Label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        step="0.01"
                                        value={form.amount}
                                        onChange={(e) => update("amount", parseFloat(e.target.value) || 0)}
                                        placeholder="0,00"
                                        className="font-bold text-green-700"
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="observacao" className="space-y-4">
                            <Label htmlFor="notes">Observações Técnicas</Label>
                            <Textarea
                                id="notes"
                                value={form.notes}
                                onChange={(e) => update("notes", e.target.value)}
                                placeholder="Instruções para a produção..."
                                className="min-h-[200px]"
                            />
                        </TabsContent>

                        <TabsContent value="horas" className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label>Lançamentos de Horas</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addLaborLog} className="gap-1">
                                    <Plus className="h-4 w-4" />
                                    Adicionar
                                </Button>
                            </div>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                {form.laborLogs.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic text-center py-6 border rounded-lg">
                                        Nenhuma hora lançada.
                                    </p>
                                ) : (
                                    form.laborLogs.map((log, index) => (
                                        <div key={index} className="p-3 border rounded-lg bg-card/50 space-y-3 relative group">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute top-2 right-2 text-red-500 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => removeLaborLog(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Input
                                                    type="date"
                                                    value={typeof log.date === 'string' ? log.date : new Date(log.date).toISOString().split('T')[0]}
                                                    onChange={(e) => updateLaborLog(index, "date", e.target.value)}
                                                    className="h-8 text-xs"
                                                />
                                                 <Input
                                                     type="number"
                                                     step="0.5"
                                                     value={log.hours}
                                                     onChange={(e) => updateLaborLog(index, "hours", e.target.value)}
                                                     className="h-8 text-xs"
                                                     placeholder="Horas"
                                                 />
                                            </div>
                                            <Input
                                                value={log.description}
                                                onChange={(e) => updateLaborLog(index, "description", e.target.value)}
                                                placeholder="Descrição do trabalho..."
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="arquivos" className="space-y-4">
                            <Label htmlFor="file-upload" className="cursor-pointer">
                                <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-primary/20 rounded-lg hover:bg-primary/5 transition-colors">
                                    {isUploading ? (
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    ) : (
                                        <>
                                            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                            <span className="text-sm font-medium">Anexar arquivos</span>
                                        </>
                                    )}
                                </div>
                                <Input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                            </Label>
                            <div className="space-y-2">
                                {form.attachments.map((url, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-xs">
                                        <span className="truncate flex-1 mr-2">{url.split('/').pop()}</span>
                                        <div className="flex gap-1">
                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => window.open(url, '_blank')}>
                                                <ExternalLink className="h-3 w-3" />
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => removeAttachment(url)}>
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit">
                            {editingOrder ? "Salvar Alterações" : "Criar Ordem de Serviço"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ServiceOrderFormDialog;
