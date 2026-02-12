import { useState, useEffect } from "react";
import { Product } from "@/types/product";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProductFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (product: Omit<Product, "id">) => void;
    onUpdate?: (id: string, updates: Partial<Product>) => void;
    editingProduct?: Product | null;
}

const ProductFormDialog = ({
    open,
    onOpenChange,
    onSubmit,
    onUpdate,
    editingProduct,
}: ProductFormDialogProps) => {
    const [form, setForm] = useState({
        name: "",
        unitPrice: 0,
        quantity: 0,
        minStockLevel: 0,
    });

    useEffect(() => {
        if (editingProduct) {
            setForm({
                name: editingProduct.name,
                unitPrice: editingProduct.unitPrice,
                quantity: editingProduct.quantity,
                minStockLevel: editingProduct.minStockLevel,
            });
        } else {
            setForm({
                name: "",
                unitPrice: 0,
                quantity: 0,
                minStockLevel: 0,
            });
        }
    }, [editingProduct, open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const submitData = {
            ...form,
            unitPrice: Number(form.unitPrice),
            quantity: Number(form.quantity),
            minStockLevel: Number(form.minStockLevel),
        };

        if (editingProduct && onUpdate) {
            onUpdate(editingProduct.id, submitData);
        } else {
            onSubmit(submitData);
        }
        onOpenChange(false);
    };

    const update = (field: string, value: string | number) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {editingProduct ? "Editar Produto" : "Novo Produto"}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="name">Nome do Produto</Label>
                        <Input
                            id="name"
                            value={form.name}
                            onChange={(e) => update("name", e.target.value)}
                            required
                            placeholder="Ex: Parafuso 10mm"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="unitPrice">Preço Unitário (R$)</Label>
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
                        <div>
                            <Label htmlFor="quantity">Quantidade Atual</Label>
                            <Input
                                id="quantity"
                                type="number"
                                min="0"
                                value={form.quantity}
                                onChange={(e) => update("quantity", e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="minStockLevel">Nível Mínimo de Estoque</Label>
                        <Input
                            id="minStockLevel"
                            type="number"
                            min="0"
                            value={form.minStockLevel}
                            onChange={(e) => update("minStockLevel", e.target.value)}
                            required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Quantidade mínima antes de alertar para reposição.
                        </p>
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
                            {editingProduct ? "Salvar" : "Adicionar"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ProductFormDialog;
