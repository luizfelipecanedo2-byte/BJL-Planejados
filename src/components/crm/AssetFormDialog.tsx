import { useState, useEffect } from "react";
import { Asset } from "@/types/asset";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AssetFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (asset: Omit<Asset, "id">) => void;
    onUpdate?: (id: string, updates: Partial<Asset>) => void;
    editingAsset?: Asset | null;
}

const AssetFormDialog = ({
    open,
    onOpenChange,
    onSubmit,
    onUpdate,
    editingAsset,
}: AssetFormDialogProps) => {
    const [form, setForm] = useState({
        name: "",
        acquisitionDate: new Date().toISOString().split('T')[0],
        value: "",
        usefulLife: "",
    });

    useEffect(() => {
        if (editingAsset) {
            setForm({
                name: editingAsset.name,
                acquisitionDate: new Date(editingAsset.acquisitionDate).toISOString().split('T')[0],
                value: editingAsset.value.toString(),
                usefulLife: editingAsset.usefulLife.toString(),
            });
        } else {
            setForm({
                name: "",
                acquisitionDate: new Date().toISOString().split('T')[0],
                value: "",
                usefulLife: "",
            });
        }
    }, [editingAsset, open]);

    const handleUpdateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const assetData = {
            name: form.name,
            acquisitionDate: new Date(form.acquisitionDate),
            value: Number(form.value),
            usefulLife: Number(form.usefulLife),
        };

        if (editingAsset && onUpdate) {
            onUpdate(editingAsset.id, assetData);
        } else {
            onSubmit(assetData);
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {editingAsset ? "Editar Patrimônio" : "Adicionar Patrimônio"}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="acquisitionDate">Data de Aquisição</Label>
                        <Input
                            id="acquisitionDate"
                            type="date"
                            value={form.acquisitionDate}
                            onChange={(e) => handleUpdateField("acquisitionDate", e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome do Bem</Label>
                        <Input
                            id="name"
                            value={form.name}
                            onChange={(e) => handleUpdateField("name", e.target.value)}
                            required
                            placeholder="Ex: Notebook Dell"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="value">Valor de Aquisição</Label>
                            <Input
                                id="value"
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.value}
                                onChange={(e) => handleUpdateField("value", e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="usefulLife">Vida Útil (anos)</Label>
                            <Input
                                id="usefulLife"
                                type="number"
                                min="1"
                                value={form.usefulLife}
                                onChange={(e) => handleUpdateField("usefulLife", e.target.value)}
                                required
                            />
                        </div>
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
                            {editingAsset ? "Salvar" : "Adicionar"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AssetFormDialog;
