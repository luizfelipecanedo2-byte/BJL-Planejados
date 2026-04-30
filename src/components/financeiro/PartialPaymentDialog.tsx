import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Transaction } from "@/types/finance";
import { Coins, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface PartialPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onSubmit: (paidAmount: number, paymentDate: string) => Promise<void>;
}

export default function PartialPaymentDialog({ open, onOpenChange, transaction, onSubmit }: PartialPaymentDialogProps) {
  const [paidAmount, setPaidAmount] = useState<number | "">("");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && transaction) {
      setPaidAmount(transaction.amount);
      setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    }
  }, [open, transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction || paidAmount === "" || paidAmount <= 0) return;

    // Prevent paying more or exactly the same amount through this specific partial dialog (optional, but good practice for "partial" logic)
    // Actually, if they pay exactly the same, it's just a normal payment, but we can handle it.
    if (paidAmount > transaction.amount) {
        alert("O valor pago não pode ser maior que o valor da transação.");
        return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(Number(paidAmount), paymentDate);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  if (!transaction) return null;

  const remainingAmount = transaction.amount - Number(paidAmount || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-white/10 text-white max-w-md rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <div className="bg-primary p-8 text-primary-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
              <Coins className="h-6 w-6" />
              Baixa Parcial
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80 font-medium mt-1">
              Registre um pagamento parcial e um novo lançamento pendente será criado com o valor restante.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Valor Total Original</p>
              <p className="text-xl font-black">{formatCurrency(transaction.amount)}</p>
            </div>
            {remainingAmount > 0 && remainingAmount < transaction.amount && (
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Valor Restante</p>
                <p className="text-xl font-black text-amber-500">{formatCurrency(remainingAmount)}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Valor Pago (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={transaction.amount}
                required
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value === "" ? "" : Number(e.target.value))}
                className="bg-white/5 border-white/10 rounded-xl h-12 font-bold text-lg"
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data do Pagamento</Label>
              <Input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="bg-white/5 border-white/10 rounded-xl h-12 font-bold text-white [color-scheme:dark]"
              />
            </div>
          </div>

          {Number(paidAmount) === transaction.amount && (
             <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="text-xs font-medium">O valor pago é igual ao total. O lançamento será totalmente baixado e não haverá valor restante.</p>
             </div>
          )}

          <Button 
            type="submit" 
            disabled={isSubmitting || paidAmount === "" || paidAmount <= 0}
            className="w-full bg-primary hover:bg-primary/80 text-white font-black h-14 rounded-2xl mt-4 uppercase tracking-widest text-sm shadow-xl shadow-primary/20"
          >
            {isSubmitting ? "Processando..." : "Confirmar Baixa Parcial"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
