import React, { useState, useEffect, useMemo } from "react";
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
import {
    ArrowRight,
    Check,
    Layers,
    Lock,
    Plus,
    Sparkles,
    Trash2,
    User,
} from "lucide-react";

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
    orders: ServiceOrder[];
    targetOrder?: ServiceOrder | null;
    getStagesForOrder: (
        orderId?: string | null,
        currentStatus?: ServiceStatus
    ) => OSStageConfig[];
    getCustomStagesForOrder: (orderId?: string | null) => OSStageConfig[];
    onAddStageForOrder: (
        orderId: string,
        name: string,
        color: OSStageColorKey,
        insertAfter?: string,
        currentStatus?: ServiceStatus
    ) => Promise<string | null>;
    onRemoveStageForOrder: (orderId: string, name: string) => Promise<boolean>;
    onApplyStageToOrder: (orderId: string, stageName: ServiceStatus) => void;
}

const ManageOSStagesDialog: React.FC<ManageOSStagesDialogProps> = ({
    open,
    onOpenChange,
    orders,
    targetOrder,
    getStagesForOrder,
    getCustomStagesForOrder,
    onAddStageForOrder,
    onRemoveStageForOrder,
    onApplyStageToOrder,
}) => {
    const [selectedOrderId, setSelectedOrderId] = useState<string>("");
    const [newStageName, setNewStageName] = useState("");
    const [newStageColor, setNewStageColor] = useState<OSStageColorKey>("teal");
    const [insertAfter, setInsertAfter] = useState<string>("Pronto para entrega");
    const [applyToTarget, setApplyToTarget] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Ordena OS com ativas primeiro para facilitar a escolha
    const sortedOrders = useMemo(() => {
        return [...orders].sort((a, b) => {
            const aFin = a.status === "Entregue e Finalizado";
            const bFin = b.status === "Entregue e Finalizado";
            if (aFin && !bFin) return 1;
            if (!aFin && bFin) return -1;
            return 0;
        });
    }, [orders]);

    useEffect(() => {
        if (open) {
            const initialOrder =
                targetOrder || sortedOrders[0] || null;
            setSelectedOrderId(initialOrder?.id || "");
            setNewStageName("");
            setNewStageColor("teal");
            setApplyToTarget(true);
            if (
                initialOrder &&
                initialOrder.status &&
                initialOrder.status !== "Entregue e Finalizado"
            ) {
                setInsertAfter(initialOrder.status);
            } else {
                setInsertAfter("Pronto para entrega");
            }
        }
    }, [open, targetOrder, sortedOrders]);

    const selectedOrder = useMemo(() => {
        if (selectedOrderId) {
            const found = orders.find((o) => o.id === selectedOrderId);
            if (found) return found;
        }
        return targetOrder || null;
    }, [orders, selectedOrderId, targetOrder]);

    const orderStages = useMemo(() => {
        if (!selectedOrder) return [];
        return getStagesForOrder(selectedOrder.id, selectedOrder.status);
    }, [selectedOrder, getStagesForOrder]);

    const orderCustomStages = useMemo(() => {
        if (!selectedOrder) return [];
        return getCustomStagesForOrder(selectedOrder.id);
    }, [selectedOrder, getCustomStagesForOrder]);

    const positionOptions = orderStages.filter(
        (s) => s.name !== "Entregue e Finalizado"
    );

    // Garante que insertAfter sempre aponte para uma opção válida da OS selecionada
    useEffect(() => {
        if (
            positionOptions.length > 0 &&
            !positionOptions.some((p) => p.name === insertAfter)
        ) {
            setInsertAfter(
                selectedOrder &&
                    selectedOrder.status !== "Entregue e Finalizado" &&
                    positionOptions.some((p) => p.name === selectedOrder.status)
                    ? selectedOrder.status
                    : "Pronto para entrega"
            );
        }
    }, [positionOptions, insertAfter, selectedOrder]);

    const existingLowerNames = new Set(
        orderStages.map((s) => s.name.trim().toLowerCase())
    );

    const availableSuggestions = SUGGESTED_CUSTOM_STAGES.filter(
        (s) => !existingLowerNames.has(s.toLowerCase())
    );

    const clientFirstName = selectedOrder?.client?.trim().split(" ")[0] || "esta OS";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrder || !newStageName.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const createdName = await onAddStageForOrder(
                selectedOrder.id,
                newStageName,
                newStageColor,
                insertAfter,
                selectedOrder.status
            );
            if (createdName) {
                if (applyToTarget) {
                    onApplyStageToOrder(selectedOrder.id, createdName);
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
        if (!selectedOrder) return;
        const isCurrent =
            (selectedOrder.status || "").toLowerCase() ===
            stageName.toLowerCase();
        const msg = isCurrent
            ? `A OS ${selectedOrder.ticketNumber} (${selectedOrder.client}) está atualmente nesta etapa "${stageName}". Remover esta etapa extra e voltar a OS para "Plano de corte"?`
            : `Remover a etapa extra "${stageName}" da OS ${selectedOrder.ticketNumber} (${selectedOrder.client})?`;

        if (!window.confirm(msg)) return;

        const removed = await onRemoveStageForOrder(selectedOrder.id, stageName);
        if (removed && isCurrent) {
            onApplyStageToOrder(selectedOrder.id, "Plano de corte");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-slate-950 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-tight">
                        <div className="p-2 rounded-xl bg-primary/15 border border-primary/30 text-primary">
                            <Layers className="h-4 w-4" />
                        </div>
                        Etapas Individuais da OS
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        As 12 etapas padrão continuam em todas as OS. Qualquer etapa que você adicionar aqui será{" "}
                        <strong className="text-white">exclusiva desta Ordem de Serviço</strong> — não aparece nas outras.
                    </DialogDescription>
                </DialogHeader>

                {/* Seletor / Identificação da OS */}
                {sortedOrders.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed border-white/10 text-xs text-muted-foreground">
                        Nenhuma Ordem de Serviço cadastrada ainda. Crie uma OS primeiro para adicionar etapas extras nela.
                    </div>
                ) : (
                    <>
                        <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/30 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                    <User className="h-3.5 w-3.5" />
                                    {targetOrder
                                        ? "Ordem de Serviço Selecionada"
                                        : "Escolha para qual OS deseja adicionar etapa"}
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                                    Individual
                                </span>
                            </div>

                            {targetOrder ? (
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div>
                                        <p className="text-sm font-black uppercase text-white">
                                            {selectedOrder?.client}
                                        </p>
                                        <p className="text-[11px] font-bold text-white/60">
                                            {selectedOrder?.ticketNumber}
                                            {selectedOrder?.action
                                                ? ` • ${selectedOrder.action}`
                                                : ""}
                                        </p>
                                    </div>
                                    {selectedOrder && (
                                        <span
                                            className={cn(
                                                "text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-white",
                                                OS_STAGE_COLORS[
                                                    orderStages.find(
                                                        (s) =>
                                                            s.name.toLowerCase() ===
                                                            selectedOrder.status.toLowerCase()
                                                    )?.color || "teal"
                                                ]?.bg || "bg-teal-500"
                                            )}
                                        >
                                            Atual: {selectedOrder.status}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <Select
                                    value={selectedOrderId}
                                    onValueChange={(val) => {
                                        setSelectedOrderId(val);
                                        const found = orders.find((o) => o.id === val);
                                        if (
                                            found &&
                                            found.status !== "Entregue e Finalizado"
                                        ) {
                                            setInsertAfter(found.status);
                                        } else {
                                            setInsertAfter("Pronto para entrega");
                                        }
                                    }}
                                >
                                    <SelectTrigger className="bg-slate-900 border-white/15 text-xs font-bold h-10">
                                        <SelectValue placeholder="Selecione uma OS..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-xs max-h-64">
                                        {sortedOrders.map((o) => {
                                            const extrasCount =
                                                getCustomStagesForOrder(o.id).length;
                                            return (
                                                <SelectItem key={o.id} value={o.id}>
                                                    {o.ticketNumber} — {o.client}
                                                    {o.action ? ` (${o.action})` : ""}
                                                    {extrasCount > 0
                                                        ? ` [+${extrasCount} extra${extrasCount > 1 ? "s" : ""}]`
                                                        : ""}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {selectedOrder && (
                            <>
                                {/* Formulário para Adicionar Nova Etapa EXCLUSIVA desta OS */}
                                <form
                                    onSubmit={handleSubmit}
                                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                            <Plus className="h-3.5 w-3.5" />
                                            Nova Etapa só para {clientFirstName}
                                        </span>
                                        {orderCustomStages.length > 0 && (
                                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                                {orderCustomStages.length} extra
                                                {orderCustomStages.length === 1 ? "" : "s"} nesta OS
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
                                                onChange={(e) =>
                                                    setNewStageName(e.target.value)
                                                }
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
                                            <Select
                                                value={insertAfter}
                                                onValueChange={setInsertAfter}
                                            >
                                                <SelectTrigger
                                                    id="new-stage-position"
                                                    className="bg-slate-900/80 border-white/10 text-xs h-9"
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-white/10 text-xs">
                                                    {positionOptions.map((st) => (
                                                        <SelectItem
                                                            key={st.name}
                                                            value={st.name}
                                                        >
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
                                                        onClick={() =>
                                                            setNewStageName(sug)
                                                        }
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
                                            Cor da Etapa (
                                            {OS_STAGE_COLORS[newStageColor]?.label})
                                        </Label>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {CUSTOM_STAGE_COLOR_OPTIONS.map(
                                                (colorKey) => {
                                                    const spec =
                                                        OS_STAGE_COLORS[colorKey];
                                                    const isSelected =
                                                        newStageColor === colorKey;
                                                    return (
                                                        <button
                                                            key={colorKey}
                                                            type="button"
                                                            title={spec.label}
                                                            onClick={() =>
                                                                setNewStageColor(
                                                                    colorKey
                                                                )
                                                            }
                                                            className={cn(
                                                                "w-6 h-6 rounded-full transition-all border-2",
                                                                spec.bg,
                                                                isSelected
                                                                    ? "border-white scale-110 ring-2 ring-primary/60"
                                                                    : "border-transparent opacity-75 hover:opacity-100 hover:scale-105"
                                                            )}
                                                        />
                                                    );
                                                }
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
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
                                                {selectedOrder.ticketNumber} (
                                                {selectedOrder.client})
                                            </span>{" "}
                                            para esta nova etapa
                                        </Label>
                                    </div>

                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            disabled={
                                                !newStageName.trim() || isSubmitting
                                            }
                                            className="gap-1.5 font-black uppercase tracking-wider text-[11px] rounded-xl h-9"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Adicionar só nesta OS
                                        </Button>
                                    </div>
                                </form>

                                {/* Lista Ordenada de Etapas DESTA OS */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                                            Etapas de {clientFirstName} (
                                            {orderStages.length})
                                        </Label>
                                        <span className="text-[10px] text-muted-foreground">
                                            Etapas padrão ficam sempre protegidas
                                        </span>
                                    </div>

                                    <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                                        {orderStages.map((stage, idx) => {
                                            const spec =
                                                OS_STAGE_COLORS[stage.color] ||
                                                OS_STAGE_COLORS.teal;
                                            const isCurrent =
                                                (
                                                    selectedOrder.status || ""
                                                ).toLowerCase() ===
                                                stage.name.toLowerCase();
                                            const isPersistedCustom =
                                                !stage.isDefault &&
                                                orderCustomStages.some(
                                                    (c) =>
                                                        c.name.toLowerCase() ===
                                                        stage.name.toLowerCase()
                                                );

                                            return (
                                                <div
                                                    key={stage.name}
                                                    className={cn(
                                                        "flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-colors",
                                                        isCurrent
                                                            ? "bg-emerald-500/10 border-emerald-500/40"
                                                            : stage.isDefault
                                                            ? "bg-white/[0.02] border-white/5"
                                                            : "bg-primary/[0.07] border-primary/30"
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
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {stage.isDefault ? (
                                                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-white/5 border border-white/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                <Lock className="h-2.5 w-2.5 opacity-60" />
                                                                Padrão
                                                            </span>
                                                        ) : (
                                                            <span className="text-[9px] font-black uppercase tracking-wider text-primary bg-primary/15 border border-primary/30 px-2 py-0.5 rounded-full">
                                                                Só desta OS
                                                            </span>
                                                        )}

                                                        {isCurrent ? (
                                                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                <Check className="h-2.5 w-2.5" />
                                                                Atual
                                                            </span>
                                                        ) : (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    onApplyStageToOrder(
                                                                        selectedOrder.id,
                                                                        stage.name
                                                                    )
                                                                }
                                                                className="h-6 px-2 text-[9px] font-black uppercase tracking-wider text-white/70 hover:text-white hover:bg-white/10 rounded-lg gap-0.5"
                                                                title={`Mover ${selectedOrder.ticketNumber} para "${stage.name}"`}
                                                            >
                                                                Mover
                                                                <ArrowRight className="h-2.5 w-2.5" />
                                                            </Button>
                                                        )}

                                                        {isPersistedCustom && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() =>
                                                                    handleDeleteStage(
                                                                        stage.name
                                                                    )
                                                                }
                                                                className="h-6 w-6 text-rose-400 hover:text-white hover:bg-rose-600 rounded-lg"
                                                                title={`Remover etapa extra "${stage.name}" desta OS`}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default ManageOSStagesDialog;
