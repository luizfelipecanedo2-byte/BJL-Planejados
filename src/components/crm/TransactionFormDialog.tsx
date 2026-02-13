import { useState, useEffect } from "react";
import { addMonths } from "date-fns";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Transaction, CATEGORIES, PAYMENT_METHODS, TransactionType, TransactionStatus, SUBCATEGORIES } from "@/types/finance";
import { Client } from "@/types/client";
import { supabase } from "@/lib/supabase";
import { mockOrders } from "@/data/mockData";
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
}

const TransactionFormDialog = ({
    open,
    onOpenChange,
    onSubmit,
    onUpdate,
    editingTransaction,
}: TransactionFormDialogProps) => {
    const [type, setType] = useState<TransactionType>("expense");
    const [category, setCategory] = useState("");
    const [status, setStatus] = useState<TransactionStatus>("pending");
    const [isInstallment, setIsInstallment] = useState(false);
    const [installmentsCount, setInstallmentsCount] = useState("2");

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
            });
        } else {
            // Reset Default state
            setType("expense");
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
            });
            setIsInstallment(false);
            setInstallmentsCount("2");
        }
    }, [editingTransaction, open]);

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
                const selectedOS = mockOrders.find(os => `${os.ticketNumber} - ${os.action} ` === value);
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = Number(form.amount);

        const baseSubmitData = {
            ...form,
            amount: amount,
            type,
            category,
            status,
            competenceDate: new Date(form.competenceDate),
            dueDate: new Date(form.dueDate),
            paymentDate: form.paymentDate ? new Date(form.paymentDate) : undefined,
            // Ensure recurring fields are consistent if we add them later
        };

        if (editingTransaction && onUpdate) {
            onUpdate(editingTransaction.id, baseSubmitData);
        } else {
            if (isInstallment && Number(installmentsCount) > 1) {
                const count = Number(installmentsCount);
                const installmentValue = amount / count;
                const transactions = [];

                for (let i = 0; i < count; i++) {
                    const dueDate = new Date(form.dueDate);
                    // Add i months to the due date
                    const newDueDate = addMonths(dueDate, i);

                    transactions.push({
                        ...baseSubmitData,
                        amount: installmentValue,
                        description: `${form.description} (${i + 1}/${count})`,
                        dueDate: newDueDate,
                        status: i === 0 ? status : 'pending', // Only first one takes the form status (e.g. paid), others pending
                        paymentDate: i === 0 ? baseSubmitData.paymentDate : undefined,
                    });
                }
                onSubmit(transactions);
            } else {
                onSubmit(baseSubmitData);
            }
        }
        onOpenChange(false);
    };

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
                            onValueChange={(v) => { setType(v as TransactionType); setCategory(""); }}
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
                                {mockOrders.map((os) => (
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
                                <Label htmlFor="competenceDate">Data Competência</Label>
                                <Input
                                    id="competenceDate"
                                    type="date"
                                    value={form.competenceDate}
                                    onChange={(e) => handleUpdateField("competenceDate", e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="dueDate">Data Vencimento</Label>
                                <Input
                                    id="dueDate"
                                    type="date"
                                    value={form.dueDate}
                                    onChange={(e) => handleUpdateField("dueDate", e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Seção Nova: Parcelamento */}
                    {!editingTransaction && (
                        <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Parcelamento</Label>
                                    <p className="text-sm text-muted-foreground">Dividir o valor em parcelas mensais</p>
                                </div>
                                <Switch
                                    checked={isInstallment}
                                    onCheckedChange={setIsInstallment}
                                />
                            </div>

                            {isInstallment && (
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div>
                                        <Label htmlFor="installments">Número de Parcelas</Label>
                                        <Input
                                            id="installments"
                                            type="number"
                                            min="2"
                                            max="60"
                                            value={installmentsCount}
                                            onChange={(e) => setInstallmentsCount(e.target.value)}
                                            className="font-semibold"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Valor por Parcela</Label>
                                        <div className="h-10 px-3 py-2 border rounded-md bg-background text-sm font-medium flex items-center text-muted-foreground">
                                            {form.amount && Number(installmentsCount) > 0
                                                ? (Number(form.amount) / Number(installmentsCount)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                                : 'R$ 0,00'}
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
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">Preencher para concluir</p>
                        </div>
                        <div>
                            <Label>Status</Label>
                            <Select value={status} onValueChange={(v) => setStatus(v as TransactionStatus)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="paid">Concluído</SelectItem>
                                    <SelectItem value="pending">Pendente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Seção 4: Classificação */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Categoria</Label>
                            <Select value={category} onValueChange={setCategory} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES[type].map((cat) => (
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
                        <div>
                            <Label htmlFor="financialInstitution">Instituição Financeira</Label>
                            <Select
                                value={form.financialInstitution}
                                onValueChange={(v) => handleUpdateField("financialInstitution", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                    <SelectItem value="Banco Itaú">Banco Itaú</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Forma de Pagamento</Label>
                            <Select value={form.paymentMethod} onValueChange={(v) => handleUpdateField("paymentMethod", v)} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
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
