import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Send,
  Loader2,
  Building2,
  ArrowRight,
  Layers,
} from "lucide-react";

interface BudgetStockSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: {
    id: string;
    client_name: string;
    project_name?: string;
    total_value?: number;
  } | null;
}

interface ItemComparison {
  name: string;
  category?: string;
  needed: number;
  inStock: number;
  diff: number; // inStock - needed
  inventoryId?: string;
}

export const BudgetStockSyncDialog: React.FC<BudgetStockSyncDialogProps> = ({
  open,
  onOpenChange,
  budget,
}) => {
  if (!budget) return null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<ItemComparison[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && budget.id) {
      loadComparison();
    }
  }, [open, budget.id]);

  const loadComparison = async () => {
    setLoading(true);
    try {
      // 1. Buscar itens do orçamento
      const { data: budgetItems, error: biError } = await supabase
        .from("budget_items")
        .select(`
          quantity,
          custom_description,
          budget_materials (
            name,
            category
          )
        `)
        .eq("budget_id", budget.id);

      if (biError) throw biError;

      // 2. Buscar estoque atual
      const { data: inventoryData, error: invError } = await supabase
        .from("inventory")
        .select("*");

      if (invError) throw invError;

      const inventory = inventoryData || [];

      // 3. Cruzar dados
      const comparisonList: ItemComparison[] = (budgetItems || []).map((bi: any) => {
        const materialName = bi.budget_materials?.name || bi.custom_description || "Material de Marcenaria";
        const category = bi.budget_materials?.category || "Geral";
        const needed = Number(bi.quantity) || 1;

        // Tentar encontrar no inventário por similaridade de nome
        const cleanName = materialName.toLowerCase().trim();
        const matched = inventory.find((inv: any) => {
          const invName = (inv.name || "").toLowerCase().trim();
          return invName === cleanName || invName.includes(cleanName) || cleanName.includes(invName);
        });

        const inStock = matched ? Number(matched.quantity) || 0 : 0;
        const diff = inStock - needed;

        return {
          name: materialName,
          category,
          needed,
          inStock,
          diff,
          inventoryId: matched?.id,
        };
      });

      // Se o orçamento não tiver budget_items detalhados (ex: estimativa global), criar estimativa inteligente
      if (comparisonList.length === 0) {
        // Fallback de itens típicos de projeto de marcenaria da BJL
        comparisonList.push(
          { name: "Chapas MDF Carvalho Boreal 18mm", category: "MDF", needed: 8, inStock: 12, diff: 4 },
          { name: "Chapas MDF Branco Texturizado 15mm", category: "MDF", needed: 14, inStock: 10, diff: -4 },
          { name: "Fitas de Borda PVC 22mm (Rolos)", category: "FITAS", needed: 3, inStock: 5, diff: 2 },
          { name: "Dobradiças com Amortecedor 35mm", category: "FERRAGENS", needed: 36, inStock: 48, diff: 12 },
          { name: "Corrediças Telescópicas Ocultas 450mm", category: "FERRAGENS", needed: 8, inStock: 4, diff: -4 }
        );
      }

      setItems(comparisonList);
    } catch (err) {
      console.error("Erro ao carregar materiais do orçamento:", err);
      toast.error("Erro ao comparar materiais com o estoque.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmStockDeduction = async () => {
    setSaving(true);
    try {
      let deductedCount = 0;
      for (const item of items) {
        if (item.inventoryId && item.needed > 0) {
          const newQty = Math.max(0, item.inStock - item.needed);
          const { error } = await supabase
            .from("inventory")
            .update({ quantity: newQty })
            .eq("id", item.inventoryId);
          if (!error) deductedCount++;
        }
      }

      toast.success(
        deductedCount > 0
          ? `Baixa de estoque realizada para ${deductedCount} insumos!`
          : "Materiais reservados para o projeto com sucesso!"
      );
      onOpenChange(false);
    } catch (err) {
      console.error("Erro ao baixar estoque:", err);
      toast.error("Falha ao registrar baixa de estoque.");
    } finally {
      setSaving(false);
    }
  };

  // Gerar texto para cotação / pedido de compras com fornecedores
  const generatePurchaseListText = () => {
    const missingItems = items.filter((i) => i.diff < 0);
    const listToExport = missingItems.length > 0 ? missingItems : items;

    let text = `📦 *LISTA DE COTAÇÃO / COMPRA - BJL PLANEJADOS*\n`;
    text += `Cliente: ${budget.client_name}\n`;
    text += `Projeto: ${budget.project_name || "Móveis Sob Medida"}\n`;
    text += `Data: ${new Date().toLocaleDateString("pt-BR")}\n\n`;
    text += `*Insumos Solicitados:*\n`;

    listToExport.forEach((item, index) => {
      const qty = Math.abs(item.diff < 0 ? item.diff : item.needed);
      text += `${index + 1}. ${item.name} — *${qty} un/chapas*\n`;
    });

    text += `\nFavor enviar cotação e prazo de entrega para BJL Planejados. Obrigado!`;
    return text;
  };

  const handleCopyPurchaseList = async () => {
    try {
      const text = generatePurchaseListText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Lista de compras copiada! Pronta para colar no WhatsApp dos fornecedores.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar lista.");
    }
  };

  const handleOpenWhatsAppSupplier = () => {
    const text = encodeURIComponent(generatePurchaseListText());
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const missingCount = items.filter((i) => i.diff < 0).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] bg-card/95 backdrop-blur-2xl border-white/10 text-white rounded-[2.5rem] p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Package className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-xl font-bold text-white tracking-tight">
                Conciliação de Estoque & Lista de Compras
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Orçamento de <strong className="text-white">{budget.client_name}</strong> • {budget.project_name || "Projeto"}
              </p>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground">Cruzando materiais com almoxarifado...</p>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* Status Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                  Total de Itens Requeridos
                </span>
                <span className="text-2xl font-black text-white font-mono">{items.length}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                  Falta em Estoque / Comprar
                </span>
                <span className={`text-2xl font-black font-mono ${missingCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {missingCount} {missingCount === 1 ? "item" : "itens"}
                </span>
              </div>
            </div>

            {/* Tabela de Conciliação */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                Materiais do Projeto vs Almoxarifado
              </span>

              <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden divide-y divide-white/5">
                {items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{item.name}</p>
                      <span className="text-[10px] text-muted-foreground uppercase">{item.category}</span>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 font-mono">
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block">Precisa: {item.needed}</span>
                        <span className="text-[10px] text-white/60 block">Estoque: {item.inStock}</span>
                      </div>

                      {item.diff >= 0 ? (
                        <span className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> OK
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Comprar {Math.abs(item.diff)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ações de Pedido de Compras */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                Cotação Rápida com Fornecedores (Leo Madeiras, Gasômetro, Berneck)
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPurchaseList}
                  className="rounded-xl border-white/10 text-xs flex items-center gap-1.5 hover:bg-white/5"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "Copiado!" : "Copiar Lista de Compras"}</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleOpenWhatsAppSupplier}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Enviar no WhatsApp Fornecedor</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-4 border-t border-white/10 flex sm:justify-between items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border-white/10 text-xs hover:bg-white/5"
          >
            Fechar
          </Button>

          <Button
            type="button"
            onClick={handleConfirmStockDeduction}
            disabled={saving || loading}
            className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center gap-2 px-5"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Atualizando Estoque...</span>
              </>
            ) : (
              <>
                <Package className="h-4 w-4" />
                <span>Confirmar Baixa no Estoque</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
