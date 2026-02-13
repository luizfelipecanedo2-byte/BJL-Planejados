import { useState, useEffect } from "react";
import { Sale, SaleStatus, SaleChannel, STATUS_LABELS, CHANNEL_LABELS } from "@/types/sale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SaleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (sale: Omit<Sale, "id" | "createdAt">) => void;
  onUpdate?: (id: string, updates: Partial<Sale>) => void;
  editingSale?: Sale | null;
}

const SaleFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  onUpdate,
  editingSale,
}: SaleFormDialogProps) => {
  const [form, setForm] = useState({
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    product: "",
    quantity: 1,
    unitPrice: 0,
    status: "prospecto" as SaleStatus,
    channel: "" as SaleChannel | "",
    contactDate: new Date().toISOString().split("T")[0],
    expectedCloseDate: "",
    notes: "",
  });

  useEffect(() => {
    if (editingSale) {
      setForm({
        clientName: editingSale.clientName,
        clientPhone: editingSale.clientPhone,
        clientEmail: editingSale.clientEmail,
        product: editingSale.product,
        quantity: editingSale.quantity,
        unitPrice: editingSale.unitPrice,
        status: editingSale.status,
        channel: editingSale.channel || "",
        contactDate: editingSale.contactDate,
        expectedCloseDate: editingSale.expectedCloseDate,
        notes: editingSale.notes || "",
      });
    } else {
      setForm({
        clientName: "",
        clientPhone: "",
        clientEmail: "",
        product: "",
        quantity: 1,
        unitPrice: 0,
        status: "prospecto",
        channel: "",
        contactDate: new Date().toISOString().split("T")[0],
        expectedCloseDate: "",
        notes: "",
      });
    }
  }, [editingSale, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName.trim()) {
      alert("Por favor, digite o nome do cliente.");
      return;
    }
    const totalValue = form.quantity * form.unitPrice;
    const submitData = {
      ...form,
      totalValue,
      channel: form.channel || undefined,
    };

    if (editingSale && onUpdate) {
      onUpdate(editingSale.id, submitData);
    } else {
      onSubmit(submitData as Omit<Sale, "id" | "createdAt">);
    }
    onOpenChange(false);
  };

  const update = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingSale ? "Editar Venda" : "Nova Venda"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="clientName">Nome do Cliente</Label>
              <Input
                id="clientName"
                value={form.clientName}
                onChange={(e) => update("clientName", e.target.value)}
                required
                placeholder="Ex: Maria Silva"
              />
            </div>
            <div>
              <Label htmlFor="clientPhone">Telefone</Label>
              <Input
                id="clientPhone"
                value={form.clientPhone}
                onChange={(e) => update("clientPhone", e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <Label htmlFor="clientEmail">Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={form.clientEmail}
                onChange={(e) => update("clientEmail", e.target.value)}
                placeholder="cliente@email.com"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="product">Produto/Serviço</Label>
              <Input
                id="product"
                value={form.product}
                onChange={(e) => update("product", e.target.value)}
                required
                placeholder="Ex: Consultoria Premium"
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => update("quantity", parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label htmlFor="unitPrice">Preço Unitário (R$)</Label>
              <Input
                id="unitPrice"
                type="number"
                min={0}
                step={0.01}
                value={form.unitPrice}
                onChange={(e) =>
                  update("unitPrice", parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => update("status", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as SaleStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Canal de Venda</Label>
              <Select
                value={form.channel}
                onValueChange={(v) => update("channel", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CHANNEL_LABELS) as SaleChannel[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CHANNEL_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="contactDate">Data do Contato</Label>
              <Input
                id="contactDate"
                type="date"
                value={form.contactDate}
                onChange={(e) => update("contactDate", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="expectedCloseDate">Previsão de Fechamento</Label>
              <Input
                id="expectedCloseDate"
                type="date"
                value={form.expectedCloseDate}
                onChange={(e) => update("expectedCloseDate", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Anotações sobre a venda..."
                rows={2}
              />
            </div>
          </div>

          {form.quantity > 0 && form.unitPrice > 0 && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Valor total:{" "}
                <span className="font-bold text-foreground font-mono">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(form.quantity * form.unitPrice)}
                </span>
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingSale ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SaleFormDialog;
