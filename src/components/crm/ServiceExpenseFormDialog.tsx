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
import { ServiceExpense } from "@/types/serviceExpense";

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
        spentValue: "",
    });

    useEffect(() => {
        if (editingExpense) {
            setForm({
                clientName: editingExpense.clientName,
                environment: editingExpense.environment,
                serviceValue: editingExpense.serviceValue.toString(),
                spentValue: editingExpense.spentValue.toString(),
            });
        } else {
            setForm({
                clientName: "",
                environment: "",
                serviceValue: "",
                spentValue: "",
            });
        }
    }, [editingExpense, open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const serviceValue = parseFloat(form.serviceValue) || 0;
        const spentValue = parseFloat(form.spentValue) || 0;

        const expenseData = {
            clientName: form.clientName,
            environment: form.environment,
            serviceValue,
            spentValue,
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

    const grossProfit = (parseFloat(form.serviceValue) || 0) - (parseFloat(form.spentValue) || 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{editingExpense ? "Editar Gasto por Serviço" : "Novo Gasto por Serviço"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="serviceValue">Valor do Serviço</Label>
                            <Input
                                id="serviceValue"
                                type="number"
                                step="0.01"
                                value={form.serviceValue}
                                onChange={(e) => update("serviceValue", e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="spentValue">Valor Gasto</Label>
                            <Input
                                id="spentValue"
                                type="number"
                                step="0.01"
                                value={form.spentValue}
                                onChange={(e) => update("spentValue", e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg flex justify-between items-center">
                        <span className="text-sm font-medium">Lucro Bruto Estimado:</span>
                        <span className={`font-bold ${grossProfit >= 0 ? "text-blue-600" : "text-red-600"}`}>
                            {formatCurrency(grossProfit)}
                        </span>
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

export default ServiceExpenseFormDialog;
