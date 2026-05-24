import { useState, useEffect } from "react";
import { addMonths } from "date-fns";
import { Check, ChevronsUpDown, FileImage, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Transaction, CATEGORIES, PAYMENT_METHODS, TransactionType, TransactionStatus, SUBCATEGORIES } from "@/types/finance";
import { Client } from "@/types/client";
import { ServiceOrder } from "@/types/serviceOrder";
import { supabase } from "@/lib/supabase";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
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

interface TransactionFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (transaction: Omit<Transaction, "id"> | Omit<Transaction, "id">[]) => void;
    onUpdate?: (id: string, updates: Partial<Transaction>) => void;
    editingTransaction?: Transaction | null;
    initialType?: TransactionType | "transfer";
}

const TransactionFormDialog = ({
    open,
    onOpenChange,
    onSubmit,
    onUpdate,
    editingTransaction,
    initialType = "expense",
}: TransactionFormDialogProps) => {
    const [type, setType] = useState<TransactionType | "transfer">(initialType);
    const [category, setCategory] = useState("");
    const [status, setStatus] = useState<TransactionStatus>("pending");
    const [isInstallment, setIsInstallment] = useState(false);
    const [installmentsCount, setInstallmentsCount] = useState("2");
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringCount, setRecurringCount] = useState("12");
    const [isUploading, setIsUploading] = useState(false);
    const [destinationInstitution, setDestinationInstitution] = useState("");
    const [isSplitPayment, setIsSplitPayment] = useState(false);
    const [splits, setSplits] = useState([
        { method: "Dinheiro", amount: "", institution: "Dinheiro" },
        { method: "Pix", amount: "", institution: "Nubank" }
    ]);
    const [isCostSplit, setIsCostSplit] = useState(false);
    const [costSplits, setCostSplits] = useState([
        { client: "", amount: "", description: "" }
    ]);

    const [clients, setClients] = useState<Client[]>([]);
    const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
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

        const fetchOrders = async () => {
            try {
                const { data } = await supabase.from('service_orders').select('*').order('created_at', { ascending: false });
                if (data) {
                    const mappedOrders: ServiceOrder[] = data.map((o: any) => ({
                        id: o.id,
                        ticketNumber: o.ticket_number,
                        openDate: new Date(o.open_date + 'T12:00:00'),
                        client: o.client,
                        type: o.type,
                        action: o.action,
                        status: o.status,
                        forecastDate: new Date(o.forecast_date + 'T12:00:00'),
                        completionDate: o.completion_date ? new Date(o.completion_date + 'T12:00:00') : undefined
                    }));
                    setServiceOrders(mappedOrders);
                }
            } catch (error) {
                console.error("Error fetching service orders", error);
            }
        };

        fetchClients();
        fetchOrders();
    }, []);

    const [form, setForm] = useState({
        description: "",
        amount: "",
        contact: "",
        service: "",
        financialInstitution: "",
        subcategory: "",
        invoiceNumber: "",
        paymentMethod: "",
        competenceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        paymentDate: "",
        orderService: "",
        boletoUrl: "",
    });

    useEffect(() => {
        if (editingTransaction) {
            setType(editingTransaction.type);
            setCategory(editingTransaction.category);
            setStatus(editingTransaction.status);
            setForm({
                description: editingTransaction.description,
                amount: editingTransaction.amount.toString(),
                contact: editingTransaction.contact,
                service: editingTransaction.service,
                financialInstitution: editingTransaction.financialInstitution,
                subcategory: editingTransaction.subcategory,
                invoiceNumber: editingTransaction.invoiceNumber,
                paymentMethod: editingTransaction.paymentMethod,
                competenceDate: new Date(editingTransaction.competenceDate).toISOString().split('T')[0],
                dueDate: new Date(editingTransaction.dueDate).toISOString().split('T')[0],
                paymentDate: editingTransaction.paymentDate ? new Date(editingTransaction.paymentDate).toISOString().split('T')[0] : "",
                orderService: editingTransaction.orderService || "",
                boletoUrl: editingTransaction.boletoUrl || "",
            });
        } else {
            // Reset Default state
            setType(initialType);
            setCategory("");
            setStatus("pending");
            setForm({
                description: "",
                amount: "",
                contact: "",
                service: "",
                financialInstitution: "",
                subcategory: "",
                invoiceNumber: "",
                paymentMethod: "",
                competenceDate: new Date().toISOString().split('T')[0],
                dueDate: new Date().toISOString().split('T')[0],
                paymentDate: "",
                orderService: "",
                boletoUrl: "",
            });
            setInstallmentsCount("2");
            setIsRecurring(false);
            setRecurringCount("12");
            setDestinationInstitution("");
            setIsSplitPayment(false);
            setSplits([
                { method: "Dinheiro", amount: "", institution: "Dinheiro" },
                { method: "Pix", amount: "", institution: "Nubank" }
            ]);
            setIsCostSplit(false);
            setCostSplits([{ client: "", amount: "", description: "" }]);
        }
    }, [editingTransaction, open, initialType]);

    const handleUpdateField = (field: string, value: string) => {
        setForm((prev) => {
            const newState = { ...prev, [field]: value };

            // Regra: Se preencher data de efetivação, status vira concluído (paid)
            if (field === 'paymentDate') {
                if (value) {
                    setStatus('paid');
                } else {
                    setStatus('pending');
                }
            }

            // Regra: Se selecionar uma OS no campo serviço, preencher cliente automaticamente
            if (field === 'service') {
                const selectedOS = serviceOrders.find(os => `${os.ticketNumber} - ${os.action} ` === value);
                if (selectedOS) {
                    if (!prev.contact) {
                        newState.contact = selectedOS.client;
                    }
                    newState.orderService = selectedOS.ticketNumber;
                }
            }
            return newState;
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = `boletos/${fileName}`;

            const { data, error } = await supabase.storage
                .from('attachments')
                .upload(filePath, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('attachments')
                .getPublicUrl(filePath);

            handleUpdateField("boletoUrl", publicUrl);
        } catch (error) {
            console.error('Error uploading file:', error);
            alert("Erro ao fazer upload do arquivo. Verifique se o bucket 'attachments' existe no Supabase.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = Number(form.amount);

        const baseSubmitData = {
            ...form,
            amount: amount,
            type: type === 'transfer' ? 'expense' : type,
            category: type === 'transfer' ? 'Transferência' : category,
            status,
            competenceDate: new Date(form.competenceDate),
            dueDate: new Date(form.dueDate),
            paymentDate: form.paymentDate ? new Date(form.paymentDate) : undefined,
            // Ensure recurring fields are consistent if we add them later
        };

        if (editingTransaction && onUpdate) {
            onUpdate(editingTransaction.id, baseSubmitData);
        } else if (type === 'transfer') {
            const transferOut = {
                ...baseSubmitData,
                type: 'expense' as TransactionType,
                subcategory: 'Transferência entre Contas',
                description: form.description || `Transferência para ${destinationInstitution}`,
            };
            const transferIn = {
                ...baseSubmitData,
                type: 'income' as TransactionType,
                financialInstitution: destinationInstitution,
                subcategory: 'Transferência entre Contas',
                description: form.description || `Transferência de ${form.financialInstitution}`,
            };
            onSubmit([transferOut, transferIn]);
        } else {
            let formattedSplits: any[] | undefined = undefined;
            if (isCostSplit && type === 'expense') {
                const totalSplitAmount = costSplits.reduce((acc, split) => acc + Number(split.amount), 0);
                if (Math.abs(totalSplitAmount - amount) > 0.01) {
                    alert(`A soma dos rateios (${totalSplitAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) deve ser igual ao valor total (${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).`);
                    return;
                }
                formattedSplits = costSplits.map(s => ({
                    client: s.client,
                    amount: Number(s.amount),
                    description: s.description
                }));
            }

            if (isInstallment && Number(installmentsCount) > 1) {
                const count = Number(installmentsCount);
                const installmentValue = amount / count;
                const transactions = [];

                for (let i = 0; i < count; i++) {
                    const dueDate = new Date(form.dueDate);
                    // Add i months to the due date
                    const newDueDate = addMonths(dueDate, i);
                    const instSplits = formattedSplits ? formattedSplits.map(s => ({ ...s, amount: s.amount / count })) : undefined;

                    transactions.push({
                        ...baseSubmitData,
                        amount: installmentValue,
                        description: `${form.description} (${i + 1}/${count})`,
                        dueDate: newDueDate,
                        status: i === 0 ? status : 'pending', // Only first one takes the form status (e.g. paid), others pending
                        paymentDate: i === 0 ? baseSubmitData.paymentDate : undefined,
                        boletoUrl: i === 0 ? baseSubmitData.boletoUrl : undefined,
                        costSplits: instSplits
                    });
                }
                onSubmit(transactions);
            } else if (isRecurring && Number(recurringCount) > 1) {
                const count = Number(recurringCount);
                const transactions = [];

                for (let i = 0; i < count; i++) {
                    const dueDate = new Date(form.dueDate);
                    const newDueDate = addMonths(dueDate, i);

                    const competenceDate = new Date(form.competenceDate);
                    const newCompetenceDate = addMonths(competenceDate, i);

                    transactions.push({
                        ...baseSubmitData,
                        description: `${form.description} - Mês ${i + 1}`,
                        dueDate: newDueDate,
                        competenceDate: newCompetenceDate,
                        status: i === 0 ? status : 'pending', // Apenas o primeiro pode já ser pago, os próximos são contas a pagar
                        paymentDate: i === 0 ? baseSubmitData.paymentDate : undefined,
                        boletoUrl: i === 0 ? baseSubmitData.boletoUrl : undefined,
                        costSplits: formattedSplits
                    });
                }
                onSubmit(transactions);
            } else if (isSplitPayment) {
                const totalSplitAmount = splits.reduce((acc, split) => acc + Number(split.amount), 0);
                if (Math.abs(totalSplitAmount - amount) > 0.01) {
                    alert(`A soma das partes (${totalSplitAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) deve ser igual ao valor total (${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).`);
                    return;
                }

                const transactions = splits.map((split) => {
                    const ratio = Number(split.amount) / amount;
                    const instSplits = formattedSplits ? formattedSplits.map(s => ({ ...s, amount: s.amount * ratio })) : undefined;
                    return {
                        ...baseSubmitData,
                        amount: Number(split.amount),
                        paymentMethod: split.method,
                        financialInstitution: split.institution,
                        description: `${form.description} (${split.method})`,
                        costSplits: instSplits
                    };
                });
                onSubmit(transactions);
            } else {
                onSubmit({ ...baseSubmitData, costSplits: formattedSplits });
            }
        }
        onOpenChange(false);
    };

    // Validações visuais
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isOverdue = !form.paymentDate && form.dueDate && new Date(`${form.dueDate}T00:00:00`) < today;
    const isFuturePayment = form.paymentDate && new Date(`${form.paymentDate}T00:00:00`) > today;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {editingTransaction ? "Editar Lançamento" : "Novo Lançamento"}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">

                    <div className="flex gap-4 justify-center py-2 bg-muted/30 rounded-lg">
                        <RadioGroup
                            value={type}
                            onValueChange={(v) => { setType(v as TransactionType | "transfer"); setCategory(""); }}
                            className="flex gap-8"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="income" id="income" className="text-green-600 border-green-600 data-[state=checked]:bg-green-600 data-[state=checked]:text-white" />
                                <Label htmlFor="income" className="text-green-600 font-semibold cursor-pointer text-lg">Receita</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="expense" id="expense" className="text-red-600 border-red-600 data-[state=checked]:bg-red-600 data-[state=checked]:text-white" />
                                <Label htmlFor="expense" className="text-red-600 font-semibold cursor-pointer text-lg">Despesa</Label>
                            </div>
                            {!editingTransaction && (
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="transfer" id="transfer" className="text-blue-600 border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white" />
                                    <Label htmlFor="transfer" className="text-blue-600 font-semibold cursor-pointer text-lg">Transferência</Label>
                                </div>
                            )}
                        </RadioGroup>
                    </div>

                    {/* Seção 1: Dados Principais */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label htmlFor="description">Descrição do Lançamento</Label>
                            <Input
                                id="description"
                                value={form.description}
                                onChange={(e) => handleUpdateField("description", e.target.value)}
                                required
                                placeholder={type === 'income' ? "Ex: Venda Cozinha João" : "Ex: Compra MDF Arauco"}
                            />
                        </div>

                        <div className="col-span-2">
                            <Label htmlFor="service">Referente à Ordem de Serviço (Opcional)</Label>
                            <Input
                                id="service"
                                list="os-suggestions"
                                value={form.service}
                                onChange={(e) => handleUpdateField("service", e.target.value)}
                                placeholder="Digite ou selecione uma OS..."
                            />
                            <datalist id="os-suggestions">
                                {serviceOrders.map((os) => (
                                    <option key={os.id} value={`${os.ticketNumber} - ${os.action} `}>
                                        {os.client} - {os.status}
                                    </option>
                                ))}
                            </datalist>
                        </div>

                        <div className="col-span-2 flex flex-col gap-2">
                            <Label htmlFor="contact">{type === 'income' ? 'Cliente' : 'Fornecedor'}</Label>
                            <Popover open={openClientSelect} onOpenChange={setOpenClientSelect}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openClientSelect}
                                        className="w-full justify-between font-normal"
                                    >
                                        {form.contact
                                            ? clients.find((client) => client.name === form.contact)?.name || form.contact
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
                                                            handleUpdateField("contact", client.name);
                                                            setOpenClientSelect(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                form.contact === client.name ? "opacity-100" : "opacity-0"
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
                    </div>

                    {/* Seção 2: Valores e Datas */}
                    <div className="p-4 border rounded-lg bg-card space-y-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Financeiro</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="amount">Valor (R$)</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.amount}
                                    onChange={(e) => handleUpdateField("amount", e.target.value)}
                                    required
                                    className="font-bold text-lg"
                                />
                            </div>
                            <div>
                                <Label htmlFor="competenceDate">Data da Compra</Label>
                                <Input
                                    id="competenceDate"
                                    type="date"
                                    value={form.competenceDate}
                                    onChange={(e) => handleUpdateField("competenceDate", e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="dueDate" className="text-primary font-bold">Data do Pagamento</Label>
                                <Input
                                    id="dueDate"
                                    type="date"
                                    value={form.dueDate}
                                    onChange={(e) => handleUpdateField("dueDate", e.target.value)}
                                    required
                                    className={`border-primary/50 ${isOverdue ? "border-red-500 text-red-600 focus-visible:ring-red-500 shadow-[0_0_10px_rgba(244,63,94,0.1)]" : "shadow-[0_0_10px_rgba(99,102,241,0.1)]"}`}
                                />
                                {isOverdue && <span className="text-[10px] text-red-500 font-bold block mt-1">⚠️ Atrasado</span>}
                            </div>
                        </div>
                    </div>

                    {/* Seção Nova: Parcelamento / Recorrência */}
                    {!editingTransaction && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className={`p-4 border rounded-lg space-y-4 ${isInstallment ? 'bg-primary/5 border-primary/30' : 'bg-muted/20'} ${isRecurring && 'opacity-50 pointer-events-none'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold">Parcelar (Cartão)</Label>
                                        <p className="text-[10px] text-muted-foreground mr-2">Dividir valor</p>
                                    </div>
                                    <Switch
                                        checked={isInstallment}
                                        onCheckedChange={setIsInstallment}
                                        disabled={isRecurring}
                                    />
                                </div>
                                {isInstallment && (
                                    <div className="space-y-2 pt-2 border-t">
                                        <Label htmlFor="installments">Parcelas</Label>
                                        <Input
                                            id="installments"
                                            type="number"
                                            min="2"
                                            max="60"
                                            value={installmentsCount}
                                            onChange={(e) => setInstallmentsCount(e.target.value)}
                                            className="font-semibold"
                                        />
                                        <div className="text-[11px] font-bold text-primary mt-1">
                                            {form.amount && Number(installmentsCount) > 0
                                                ? `${installmentsCount}x de ${(Number(form.amount) / Number(installmentsCount)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                                                : 'R$ 0,00'}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className={`p-4 border rounded-lg space-y-4 ${isRecurring ? 'bg-orange-500/10 border-orange-500/30' : 'bg-muted/20'} ${isInstallment && 'opacity-50 pointer-events-none'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold text-orange-600">Recorrência Mensal</Label>
                                        <p className="text-[10px] text-muted-foreground">Ex: Aluguel, Salário</p>
                                    </div>
                                    <Switch
                                        checked={isRecurring}
                                        onCheckedChange={setIsRecurring}
                                        disabled={isInstallment}
                                        className="data-[state=checked]:bg-orange-500"
                                    />
                                </div>

                                {isRecurring && (
                                    <div className="space-y-2 pt-2 border-t">
                                        <Label htmlFor="recurringCount">Meses a Repetir</Label>
                                        <Input
                                            id="recurringCount"
                                            type="number"
                                            min="2"
                                            max="120"
                                            value={recurringCount}
                                            onChange={(e) => setRecurringCount(e.target.value)}
                                            className="font-semibold"
                                        />
                                        <div className="text-[11px] font-bold text-orange-600 mt-1">
                                            Irá gerar {recurringCount} lançamentos de {form.amount ? Number(form.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}.
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Seção Split Payment */}
                    {!editingTransaction && (
                        <div className={`p-4 border rounded-lg space-y-4 ${isSplitPayment ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-muted/20'} ${(isInstallment || isRecurring) && 'opacity-50 pointer-events-none'}`}>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold text-indigo-600">Pagamento Dividido</Label>
                                    <p className="text-[10px] text-muted-foreground">Ex: Parte no Dinheiro, parte no Pix</p>
                                </div>
                                <Switch
                                    checked={isSplitPayment}
                                    onCheckedChange={(checked) => {
                                        setIsSplitPayment(checked);
                                        if (checked) {
                                            // Pre-fill first split with total amount
                                            setSplits([
                                                { method: form.paymentMethod || "Dinheiro", amount: form.amount, institution: form.financialInstitution || "Dinheiro" },
                                                { method: "Pix", amount: "", institution: "Nubank" }
                                            ]);
                                        }
                                    }}
                                    disabled={isInstallment || isRecurring}
                                    className="data-[state=checked]:bg-indigo-500"
                                />
                            </div>

                            {isSplitPayment && (
                                <div className="space-y-3 pt-2 border-t">
                                    {splits.map((split, index) => (
                                        <div key={index} className="flex gap-2 items-end bg-white/50 p-2 rounded border border-indigo-100">
                                            <div className="flex-1">
                                                <Label className="text-[10px]">Forma</Label>
                                                <Select
                                                    value={split.method}
                                                    onValueChange={(v) => {
                                                        const newSplits = [...splits];
                                                        newSplits[index].method = v;
                                                        setSplits(newSplits);
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {PAYMENT_METHODS.map((method) => (
                                                            <SelectItem key={method} value={method}>{method}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex-1">
                                                <Label className="text-[10px]">Instituição</Label>
                                                <Select
                                                    value={split.institution}
                                                    onValueChange={(v) => {
                                                        const newSplits = [...splits];
                                                        newSplits[index].institution = v;
                                                        setSplits(newSplits);
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Nubank">Nubank</SelectItem>
                                                        <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                                        <SelectItem value="Mercado Pago">Mercado Pago</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="w-24">
                                                <Label className="text-[10px]">Valor (R$)</Label>
                                                <Input
                                                    type="number"
                                                    value={split.amount}
                                                    onChange={(e) => {
                                                        const newSplits = [...splits];
                                                        newSplits[index].amount = e.target.value;
                                                        setSplits(newSplits);
                                                    }}
                                                    className="h-8 text-xs font-bold"
                                                    placeholder="0,00"
                                                />
                                            </div>
                                            {splits.length > 2 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500"
                                                    onClick={() => {
                                                        setSplits(splits.filter((_, i) => i !== index));
                                                    }}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center pt-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-[10px] border-indigo-200 text-indigo-600"
                                            onClick={() => setSplits([...splits, { method: "Pix", amount: "", institution: "Nubank" }])}
                                        >
                                            + Adicionar Forma
                                        </Button>
                                        <div className={`text-[11px] font-bold ${Math.abs(splits.reduce((acc, s) => acc + Number(s.amount), 0) - Number(form.amount)) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                                            Total: {splits.reduce((acc, s) => acc + Number(s.amount), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / {Number(form.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Seção Cost Split (Rateio por Cliente) */}
                    {!editingTransaction && type === 'expense' && (
                        <div className={`p-4 border rounded-lg space-y-4 ${isCostSplit ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-muted/20'}`}>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold text-emerald-600">Dividir Custo entre Clientes</Label>
                                    <p className="text-[10px] text-muted-foreground">Ratear o valor dessa nota para múltiplos projetos</p>
                                </div>
                                <Switch
                                    checked={isCostSplit}
                                    onCheckedChange={(checked) => {
                                        setIsCostSplit(checked);
                                        if (checked) {
                                            setCostSplits([
                                                { client: "", amount: form.amount, description: "Rateio 1" },
                                                { client: "", amount: "", description: "Rateio 2" }
                                            ]);
                                        }
                                    }}
                                    className="data-[state=checked]:bg-emerald-500"
                                />
                            </div>

                            {isCostSplit && (
                                <div className="space-y-3 pt-2 border-t">
                                    {costSplits.map((split, index) => (
                                        <div key={index} className="flex flex-col gap-2 bg-white/50 p-2 rounded border border-emerald-100">
                                            <div className="flex gap-2 items-end">
                                                <div className="flex-1">
                                                    <Label className="text-[10px]">Cliente / Projeto</Label>
                                                    <Select
                                                        value={split.client}
                                                        onValueChange={(v) => {
                                                            const newSplits = [...costSplits];
                                                            newSplits[index].client = v;
                                                            setCostSplits(newSplits);
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue placeholder="Selecione o projeto (OS)" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {serviceOrders.map(os => (
                                                                <SelectItem key={os.id} value={`${os.ticketNumber} - ${os.client} (${os.action})`}>
                                                                    {os.ticketNumber} - {os.client} ({os.action})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="w-32">
                                                    <Label className="text-[10px]">Valor (R$)</Label>
                                                    <Input
                                                        type="number"
                                                        value={split.amount}
                                                        onChange={(e) => {
                                                            const newSplits = [...costSplits];
                                                            newSplits[index].amount = e.target.value;
                                                            setCostSplits(newSplits);
                                                        }}
                                                        className="h-8 text-xs font-bold"
                                                        placeholder="0,00"
                                                    />
                                                </div>
                                                {costSplits.length > 2 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 shrink-0"
                                                        onClick={() => {
                                                            setCostSplits(costSplits.filter((_, i) => i !== index));
                                                        }}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                            <div>
                                                <Label className="text-[10px]">Descrição / Item</Label>
                                                <Input
                                                    value={split.description}
                                                    onChange={(e) => {
                                                        const newSplits = [...costSplits];
                                                        newSplits[index].description = e.target.value;
                                                        setCostSplits(newSplits);
                                                    }}
                                                    className="h-8 text-xs"
                                                    placeholder="Ex: 2 Chapas de MDF Branco"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center pt-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-[10px] border-emerald-200 text-emerald-600"
                                            onClick={() => setCostSplits([...costSplits, { client: "", amount: "", description: "" }])}
                                        >
                                            + Adicionar Cliente
                                        </Button>
                                        <div className={`text-[11px] font-bold ${Math.abs(costSplits.reduce((acc, s) => acc + Number(s.amount), 0) - Number(form.amount)) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                                            Total: {costSplits.reduce((acc, s) => acc + Number(s.amount), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / {Number(form.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Seção 3: Detalhes de Pagamento */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="paymentDate">Data de Efetivação</Label>
                            <Input
                                id="paymentDate"
                                type="date"
                                value={form.paymentDate}
                                onChange={(e) => handleUpdateField("paymentDate", e.target.value)}
                                className={isFuturePayment ? "border-amber-500 text-amber-600 focus-visible:ring-amber-500" : ""}
                            />
                            {isFuturePayment ? (
                                <span className="text-[10px] text-amber-500 font-bold block mt-1">⚠️ Data no futuro</span>
                            ) : (
                                <p className="text-[10px] text-muted-foreground mt-1">Preencher para alterar para concluído</p>
                            )}
                        </div>
                        <div>
                            <Label>Status</Label>
                            <Select value={status} onValueChange={(v) => setStatus(v as TransactionStatus)} disabled={!!form.paymentDate}>
                                <SelectTrigger className={status === 'paid' ? 'bg-green-50 text-green-700 border-green-200 font-semibold' : ''}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="paid">Concluído</SelectItem>
                                    <SelectItem value="pending">Pendente</SelectItem>
                                </SelectContent>
                            </Select>
                            {form.paymentDate && <span className="text-[10px] text-green-600 mt-1 block font-medium">Status automático via Efetivação</span>}
                        </div>
                    </div>

                    {/* Seção 4: Classificação */}
                    <div className="grid grid-cols-2 gap-4">
                        {type !== 'transfer' && (
                            <>
                                <div>
                                    <Label>Categoria</Label>
                                    <Select value={category} onValueChange={setCategory} required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES[type as keyof typeof CATEGORIES].map((cat) => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="subcategory">Subcategoria</Label>
                                    {SUBCATEGORIES[category] ? (
                                        <Select
                                            value={form.subcategory}
                                            onValueChange={(v) => handleUpdateField("subcategory", v)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {SUBCATEGORIES[category].map((sub) => (
                                                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input
                                            id="subcategory"
                                            value={form.subcategory}
                                            onChange={(e) => handleUpdateField("subcategory", e.target.value)}
                                            placeholder="Especifique melhor"
                                        />
                                    )}
                                </div>
                            </>
                        )}
                        <div>
                            <Label htmlFor="financialInstitution">{type === 'transfer' ? 'Instituição de Origem' : 'Instituição Financeira'}</Label>
                            <Select
                                value={form.financialInstitution}
                                onValueChange={(v) => handleUpdateField("financialInstitution", v)}
                                disabled={isSplitPayment}
                                required={!isSplitPayment}
                            >
                                <SelectTrigger className={isSplitPayment ? "bg-muted text-muted-foreground" : ""}>
                                    <SelectValue placeholder={isSplitPayment ? "Definido no Split" : "Selecione"} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Nubank">Nubank</SelectItem>
                                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                    <SelectItem value="Mercado Pago">Mercado Pago</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {type === 'transfer' && (
                            <div>
                                <Label htmlFor="destinationInstitution">Instituição de Destino</Label>
                                <Select
                                    value={destinationInstitution}
                                    onValueChange={setDestinationInstitution}
                                    required={type === 'transfer'}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Nubank">Nubank</SelectItem>
                                        <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                        <SelectItem value="Mercado Pago">Mercado Pago</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div>
                            <Label>Forma de Pagamento</Label>
                            <Select 
                                value={form.paymentMethod} 
                                onValueChange={(v) => handleUpdateField("paymentMethod", v)} 
                                required={!isSplitPayment}
                                disabled={isSplitPayment}
                            >
                                <SelectTrigger className={isSplitPayment ? "bg-muted text-muted-foreground" : ""}>
                                    <SelectValue placeholder={isSplitPayment ? "Definido no Split" : "Selecione"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_METHODS.map((method) => (
                                        <SelectItem key={method} value={method}>{method}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="invoiceNumber">Nota Fiscal / Documento</Label>
                        <Input
                            id="invoiceNumber"
                            value={form.invoiceNumber}
                            onChange={(e) => handleUpdateField("invoiceNumber", e.target.value)}
                            placeholder="Nº da Nota ou Recibo"
                        />
                    </div>

                    <div className="p-4 border rounded-lg bg-blue-50/50 space-y-4">
                        <div className="flex items-center gap-2 text-blue-700">
                            <FileImage className="h-5 w-5" />
                            <h4 className="font-semibold">Imagem do Boleto</h4>
                        </div>

                        {form.boletoUrl ? (
                            <div className="flex items-center justify-between p-2 bg-white rounded border border-blue-200">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FileImage className="h-4 w-4 text-blue-500 shrink-0" />
                                    <span className="text-xs text-blue-600 truncate max-w-[200px]">Boleto anexado</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                        onClick={() => window.open(form.boletoUrl, '_blank')}
                                    >
                                        Ver
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleUpdateField("boletoUrl", "")}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="boleto-upload" className="cursor-pointer">
                                    <div className="flex flex-col items-center justify-center py-4 border-2 border-dashed border-blue-200 rounded-lg hover:bg-blue-100/50 transition-colors">
                                        {isUploading ? (
                                            <div className="flex items-center gap-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                <span className="text-sm text-blue-600">Enviando...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="h-6 w-6 text-blue-400 mb-1" />
                                                <span className="text-sm text-blue-600">Clique para anexar imagem o boleto</span>
                                                <span className="text-[10px] text-blue-400">PDF, JPG, PNG</span>
                                            </>
                                        )}
                                    </div>
                                    <Input
                                        id="boleto-upload"
                                        type="file"
                                        className="hidden"
                                        accept="image/*,.pdf"
                                        onChange={handleFileUpload}
                                        disabled={isUploading}
                                    />
                                </Label>
                                <div className="flex gap-2 items-center">
                                    <span className="text-[10px] text-muted-foreground">Ou cole o link:</span>
                                    <Input
                                        className="h-7 text-xs"
                                        placeholder="https://..."
                                        value={form.boletoUrl}
                                        onChange={(e) => handleUpdateField("boletoUrl", e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit">
                            {editingTransaction ? "Salvar" : "Adicionar"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default TransactionFormDialog;
