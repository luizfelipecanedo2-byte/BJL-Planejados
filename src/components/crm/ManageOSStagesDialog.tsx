import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
    CUSTOM_STAGE_COLOR_OPTIONS,
    OS_STAGE_COLORS,
    OSStageColorKey,
    OSStageConfig,
    ServiceOrder,
    ServiceStatus,
} from "@/types/serviceOrder";
import { Layers, Lock, Plus, Sparkles, Trash2 } from "lucide-react";

const SUGGESTED_CUSTOM_STAGES = [
    "Vidraçaria",
    "Pintura / Laca",
    "Serralheria",
    "Marmoraria / Pedra",
    "Aguardando Material",
    "Conferência / Revisão",
    "Pós-Venda / Ajuste",
];

interface ManageOSStagesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    allStages: OSStageConfig[];
    customStages: OSStageConfig[];
    orders: ServiceOrder[];
    targetOrder?: ServiceOrder | null;
    onAddStage: (
        name: string,
        color: OSStageColorKey,
        insertAfter?: string
    ) => Promise<string | null>;
    onRemoveStage: (name: string) => Promise<boolean>;
    onApplyStageToOrder?: (orderId: string, stageName: ServiceStatus) => void;
}

const ManageOSStagesDialog: React.FC<ManageOSStagesDialogProps> = ({
    open,
    onOpenChange,
    allStages,
    customStages,
    orders,
    targetOrder,
    onAddStage,
    onRemoveStage,
    onApplyStageToOrder,
}) => {
    const [newStageName, setNewStageName] = useState("");
    const [newStageColor, setNewStageColor] = useState<OSStageColorKey>("teal");
    const [insertAfter, setInsertAfter] = useState<string>("Pronto para entrega");
    const [applyToTarget, setApplyToTarget] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setNewStageName("");
            setNewStageColor("teal");
            setApplyToTarget(Boolean(targetOrder));
            if (targetOrder && targetOrder.status !== "Entregue e Finalizado") {
                setInsertAfter(targetOrder.status);
            } else {
                setInsertAfter("Pronto para entrega");
            }
        }
    }, [open, targetOrder]);

    const positionOptions = allStages.filter(
        (s) => s.name !== "Entregue e Finalizado"
    );

    const existingLowerNames = new Set(
        allStages.map((s) => s.name.trim().toLowerCase())
    );

    const availableSuggestions = SUGGESTED_CUSTOM_STAGES.filter(
        (s) => !existingLowerNames.has(s.toLowerCase())
    );

    const countOrdersInStage = (stageName: string) =>
        orders.filter(
            (o) => (o.status || "").toLowerCase() === stageName.toLowerCase()
        ).length;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStageName.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const createdName = await onAddStage(
                newStageName,
                newStageColor,
                insertAfter
            );
            if (createdName) {
                if (targetOrder && applyToTarget && onApplyStageToOrder) {
                    onApplyStageToOrder(targetOrder.id, createdName);
                }
                setNewStageName("");
                if (targetOrder && applyToTarget) {
                    onOpenChange(false);
                }
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteStage = async (stageName: string) => {
        const count = countOrdersInStage(stageName);
        const msg =
            count > 0
                ? `Existem ${count} OS(s) atualmente na etapa "${stageName}". Remover esta etapa personalizada da lista? (As OS existentes continuarão visíveis até você movê-las para outra etapa.)`
                : `Remover a etapa personalizada "${stageName}"?`;

        if (!window.confirm(msg)) return;
        await onRemoveStage(stageName);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-slate-950 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-tight">
                        <div className="p-2 rounded-xl bg-primary/15 border border-primary/30 text-primary">
                            <Layers className="h-4 w-4" />
                        </div>
                        Etapas da Ordem de Serviço
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        As 12 etapas padrão continuam sempre ativas. Adicione novas etapas personalizadas quando precisar — elas aparecem automaticamente na Fila de Produção, Kanban, Nova OS e Cronograma.
                    </DialogDescription>
                </DialogHeader>

                {/* Formulário para Adicionar Nova Etapa */}
                <form
                    onSubmit={handleSubmit}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                            <Plus className="h-3.5 w-3.5" />
                            Adicionar Nova Etapa
                        </span>
                        {customStages.length > 0 && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                {customStages.length} personalizada{customStages.length === 1 ? "" : "s"}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="new-stage-name"
                                className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                            >
                                Nome da Etapa
                            </Label>
                            <Input
                                id="new-stage-name"
                                value={newStageName}
                                onChange={(e) => setNewStageName(e.target.value)}
                                placeholder="Ex: Pintura / Laca, Vidraçaria..."
                                maxLength={60}
                                className="bg-slate-900/80 border-white/10 text-sm h-9"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="new-stage-position"
                                className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                            >
                                Inserir depois de
                            </Label>
                            <Select value={insertAfter} onValueChange={setInsertAfter}>
                                <SelectTrigger
                                    id="new-stage-position"
                                    className="bg-slate-900/80 border-white/10 text-xs h-9"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-xs">
                                    {positionOptions.map((st) => (
                                        <SelectItem key={st.name} value={st.name}>
                                            Após: {st.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Sugestões Rápidas */}
                    {availableSuggestions.length > 0 && (
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-amber-400" />
                                Sugestões rápidas (clique para preencher)
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {availableSuggestions.map((sug) => (
                                    <button
                                        key={sug}
                                        type="button"
                                        onClick={() => setNewStageName(sug)}
                                        className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/5 hover:bg-primary/20 hover:text-primary border border-white/10 hover:border-primary/40 transition-all"
                                    >
                                        + {sug}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Cor da Etapa */}
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Cor da Etapa ({OS_STAGE_COLORS[newStageColor]?.label})
                        </Label>
                        <div className="flex flex-wrap items-center gap-2">
                            {CUSTOM_STAGE_COLOR_OPTIONS.map((colorKey) => {
                                const spec = OS_STAGE_COLORS[colorKey];
                                const isSelected = newStageColor === colorKey;
                                return (
                                    <button
                                        key={colorKey}
                                        type="button"
                                        title={spec.label}
                                        onClick={() => setNewStageColor(colorKey)}
                                        className={cn(
                                            "w-6 h-6 rounded-full transition-all border-2",
                                            spec.bg,
                                            isSelected
                                                ? "border-white scale-110 ring-2 ring-primary/60"
                                                : "border-transparent opacity-75 hover:opacity-100 hover:scale-105"
                                        )}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {targetOrder && onApplyStageToOrder && (
                        <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-primary/10 border border-primary/25">
                            <Checkbox
                                id="apply-stage-to-target"
                                checked={applyToTarget}
                                onCheckedChange={(checked) =>
                                    setApplyToTarget(checked === true)
                                }
                            />
                            <Label
                                htmlFor="apply-stage-to-target"
                                className="text-xs font-semibold text-white cursor-pointer"
                            >
                                Já mover{" "}
                                <span className="text-primary font-black">
                                    {targetOrder.ticketNumber} ({targetOrder.client})
                                </span>{" "}
                                para esta nova etapa
                            </Label>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={!newStageName.trim() || isSubmitting}
                            className="gap-1.5 font-black uppercase tracking-wider text-[11px] rounded-xl h-9"
                        >
                            <Plus className="h-4 w-4" />
                            Adicionar Etapa
                        </Button>
                    </div>
                </form>

                {/* Lista Ordenada de Todas as Etapas */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                            Sequência Atual ({allStages.length} etapas)
                        </Label>
                        <span className="text-[10px] text-muted-foreground">
                            Etapas padrão ficam sempre protegidas
                        </span>
                    </div>

                    <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                        {allStages.map((stage, idx) => {
                            const spec = OS_STAGE_COLORS[stage.color] || OS_STAGE_COLORS.teal;
                            const count = countOrdersInStage(stage.name);
                            const isPersistedCustom =
                                !stage.isDefault &&
                                customStages.some(
                                    (c) =>
                                        c.name.toLowerCase() ===
                                        stage.name.toLowerCase()
                                );

                            return (
                                <div
                                    key={stage.name}
                                    className={cn(
                                        "flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-colors",
                                        stage.isDefault
                                            ? "bg-white/[0.02] border-white/5"
                                            : "bg-primary/[0.06] border-primary/25"
                                    )}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="text-[10px] font-mono font-bold text-muted-foreground w-5 text-right shrink-0">
                                            {idx + 1}.
                                        </span>
                                        <span
                                            className={cn(
                                                "w-2.5 h-2.5 rounded-full shrink-0",
                                                spec.bg
                                            )}
                                        />
                                        <span className="text-xs font-bold text-white truncate">
                                            {stage.name}
                                        </span>
                                        {count > 0 && (
                                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-white/10 text-white/70 shrink-0">
                                                {count} OS
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {stage.isDefault ? (
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-white/5 border border-white/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <Lock className="h-2.5 w-2.5 opacity-60" />
                                                Padrão
                                            </span>
                                        ) : (
                                            <>
                                                <span className="text-[9px] font-black uppercase tracking-wider text-primary bg-primary/15 border border-primary/30 px-2 py-0.5 rounded-full">
                                                    Extra
                                                </span>
                                                {isPersistedCustom && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            handleDeleteStage(stage.name)
                                                        }
                                                        className="h-7 w-7 text-rose-400 hover:text-white hover:bg-rose-600 rounded-lg"
                                                        title={`Remover etapa "${stage.name}"`}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ManageOSStagesDialog;
