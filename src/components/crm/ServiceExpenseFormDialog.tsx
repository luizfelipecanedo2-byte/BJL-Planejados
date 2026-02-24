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
import { ServiceExpense, ExpenseItem } from "@/types/serviceExpense";
import { Plus, Trash2 } from "lucide-react";

interface ServiceExpenseFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (expense: Omit<ServiceExpense, "id" | "createdAt">) => void;
    onUpdate?: (id: string, updates: Partial<ServiceExpense>) => void;
    editingExpense?: ServiceExpense | null;
}

const ServiceExpenseFormDialog = ({
    open,
    onOpenChange,
    onSubmit,
    onUpdate,
    editingExpense,
}: ServiceExpenseFormDialogProps) => {
    const [form, setForm] = useState({
        clientName: "",
        environment: "",
        serviceValue: "",
    });
    const [items, setItems] = useState<ExpenseItem[]>([]);
    const [newItem, setNewItem] = useState({ description: "", value: "" });

    useEffect(() => {
        if (editingExpense) {
            setForm({
                clientName: editingExpense.clientName,
                environment: editingExpense.environment,
                serviceValue: editingExpense.serviceValue.toString(),
            });
            setItems(editingExpense.items || []);
        } else {
            setForm({
                clientName: "",
                environment: "",
                serviceValue: "",
            });
            setItems([]);
        }
    }, [editingExpense, open]);

    const handleAddItem = () => {
        if (!newItem.description || !newItem.value) return;
        setItems([...items, { description: newItem.description, value: parseFloat(newItem.value) || 0 }]);
        setNewItem({ description: "", value: "" });
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const totalSpent = items.reduce((acc, item) => acc + item.value, 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const serviceValue = parseFloat(form.serviceValue) || 0;

        const expenseData = {
            clientName: form.clientName,
            environment: form.environment,
            serviceValue,
            spentValue: totalSpent,
            items: items,
        };

        if (editingExpense && onUpdate) {
            onUpdate(editingExpense.id, expenseData);
        } else {
            onSubmit(expenseData);
        }
        onOpenChange(false);
    };

    const update = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    const grossProfit = (parseFloat(form.serviceValue) || 0) - totalSpent;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingExpense ? "Editar Gasto por Serviço" : "Novo Gasto por Serviço"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="clientName">Nome do Cliente</Label>
                            <Input
                                id="clientName"
                                value={form.clientName}
                                onChange={(e) => update("clientName", e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="environment">Ambiente</Label>
                            <Input
                                id="environment"
                                value={form.environment}
                                onChange={(e) => update("environment", e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="serviceValue">Valor Total do Serviço (Receita)</Label>
                        <Input
                            id="serviceValue"
                            type="number"
                            step="0.01"
                            value={form.serviceValue}
                            onChange={(e) => update("serviceValue", e.target.value)}
                            required
                        />
                    </div>

                    <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                        <Label className="text-base font-bold">Lista de Materiais / Gastos</Label>

                        <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 items-end">
                            <div className="sm:col-span-4 space-y-1">
                                <Label htmlFor="itemDesc" className="text-xs">Descrição do Material</Label>
                                <Input
                                    id="itemDesc"
                                    placeholder="Ex: MDF Branco, Dobradiças..."
                                    value={newItem.description}
                                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                />
                            </div>
                            <div className="sm:col-span-2 space-y-1">
                                <Label htmlFor="itemVal" className="text-xs">Valor</Label>
                                <Input
                                    id="itemVal"
                                    type="number"
                                    step="0.01"
                                    placeholder="0,00"
                                    value={newItem.value}
                                    onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
                                />
                            </div>
                            <Button type="button" onClick={handleAddItem} className="w-full">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                            {items.map((item, index) => (
                                <div key={index} className="flex justify-between items-center bg-background p-2 rounded border group">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{item.description}</span>
                                        <span className="text-xs text-muted-foreground">{formatCurrency(item.value)}</span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveItem(index)}
                                        className="h-8 w-8 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t font-bold">
                            <span>Total Gasto:</span>
                            <span className="text-red-600">{formatCurrency(totalSpent)}</span>
                        </div>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex justify-between items-center">
                        <span className="text-sm font-bold text-blue-900">Lucro Bruto Estimado:</span>
                        <span className={`text-lg font-black ${grossProfit >= 0 ? "text-blue-600" : "text-red-600"}`}>
                            {formatCurrency(grossProfit)}
                        </span>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit">Salvar Registro</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ServiceExpenseFormDialog;
