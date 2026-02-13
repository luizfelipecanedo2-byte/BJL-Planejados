import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
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

        const orderData = {
            product: form.product,
            quantity,
            unitPrice,
            totalValue,
            client: form.client,
            supplier: form.supplier,
            date: editingOrder ? editingOrder.date : new Date(),
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
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="client">Cliente</Label>
                            <Input
                                id="client"
                                value={form.client}
                                onChange={(e) => update("client", e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="supplier">Fornecedor</Label>
                            <Input
                                id="supplier"
                                value={form.supplier}
                                onChange={(e) => update("supplier", e.target.value)}
                                required
                            />
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
