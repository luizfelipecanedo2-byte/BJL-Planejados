import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Client } from "@/types/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Order } from "@/types/order";

interface OrderFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (order: Omit<Order, "id">) => void;
    onUpdate?: (id: string, updates: Partial<Order>) => void;
    editingOrder?: Order | null;
}

const OrderFormDialog = ({
    open,
    onOpenChange,
    onSubmit,
    onUpdate,
    editingOrder,
}: OrderFormDialogProps) => {
    const [form, setForm] = useState({
        product: "",
        quantity: "",
        unitPrice: "",
        client: "",
        supplier: "",
    });

    const [clients, setClients] = useState<Client[]>([]);
    const [openClientSelect, setOpenClientSelect] = useState(false);
    const [openSupplierSelect, setOpenSupplierSelect] = useState(false);

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
                product: editingOrder.product,
                quantity: editingOrder.quantity.toString(),
                unitPrice: editingOrder.unitPrice.toString(),
                client: editingOrder.client,
                supplier: editingOrder.supplier,
            });
        } else {
            setForm({
                product: "",
                quantity: "",
                unitPrice: "",
                client: "",
                supplier: "",
            });
        }
    }, [editingOrder, open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const quantity = parseFloat(form.quantity) || 0;
        const unitPrice = parseFloat(form.unitPrice) || 0;
        const totalValue = quantity * unitPrice;

        const orderData: Omit<Order, "id"> = {
            product: form.product,
            quantity,
            unitPrice,
            totalValue,
            client: form.client,
            supplier: form.supplier,
            date: editingOrder ? editingOrder.date : new Date(),
            status: editingOrder ? editingOrder.status : 'pendente',
        };

        if (editingOrder && onUpdate) {
            onUpdate(editingOrder.id, orderData);
        } else {
            onSubmit(orderData);
        }
        onOpenChange(false);
    };

    const update = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const totalValue = (parseFloat(form.quantity) || 0) * (parseFloat(form.unitPrice) || 0);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{editingOrder ? "Editar Pedido" : "Novo Pedido"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="product">Produto</Label>
                            <Input
                                id="product"
                                value={form.product}
                                onChange={(e) => update("product", e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quantity">Quantidade</Label>
                            <Input
                                id="quantity"
                                type="number"
                                min="1"
                                value={form.quantity}
                                onChange={(e) => update("quantity", e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="unitPrice">Valor Unitário</Label>
                            <Input
                                id="unitPrice"
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.unitPrice}
                                onChange={(e) => update("unitPrice", e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label>Valor Total</Label>
                            <div className="p-2 bg-muted rounded-md font-medium text-lg">
                                {formatCurrency(totalValue)}
                            </div>
                        </div>
                        <div className="space-y-2 col-span-2 flex flex-col gap-2">
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
                        <div className="space-y-2 col-span-2 flex flex-col gap-2">
                            <Label htmlFor="supplier">Fornecedor</Label>
                            <Popover open={openSupplierSelect} onOpenChange={setOpenSupplierSelect}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openSupplierSelect}
                                        className="w-full justify-between font-normal"
                                    >
                                        {form.supplier
                                            ? clients.find((client) => client.name === form.supplier)?.name || form.supplier
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
                                                            update("supplier", client.name);
                                                            setOpenSupplierSelect(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                form.supplier === client.name ? "opacity-100" : "opacity-0"
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
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit">Salvar</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default OrderFormDialog;
