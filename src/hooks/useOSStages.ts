import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
    DEFAULT_OS_STAGES,
    OS_STAGE_COLORS,
    OSStageColorKey,
    OSStageConfig,
    ServiceOrder,
    ServiceStatus,
} from "@/types/serviceOrder";

const LOCAL_STORAGE_KEY = "bjl_os_per_order_custom_stages_v1";
const API_SETTINGS_KEY = "os_per_order_custom_stages";
const SYNC_EVENT = "bjl_os_per_order_stages_updated";

const defaultNamesLower = new Set(
    DEFAULT_OS_STAGES.map((s) => s.name.trim().toLowerCase())
);

export type CustomStagesByOrderMap = Record<string, OSStageConfig[]>;

function isValidColorKey(color: unknown): color is OSStageColorKey {
    return typeof color === "string" && color in OS_STAGE_COLORS;
}

export function sanitizeStageList(raw: unknown): OSStageConfig[] {
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const cleaned: OSStageConfig[] = [];

    for (const item of raw) {
        if (!item || typeof item !== "object") continue;
        const rawName = (item as any).name;
        if (typeof rawName !== "string") continue;
        const name = rawName.trim();
        if (!name) continue;

        const lower = name.toLowerCase();
        if (defaultNamesLower.has(lower) || seen.has(lower)) continue;
        seen.add(lower);

        const rawColor = (item as any).color;
        const rawInsertAfter = (item as any).insertAfter;

        cleaned.push({
            name,
            color: isValidColorKey(rawColor) ? rawColor : "teal",
            isDefault: false,
            insertAfter:
                typeof rawInsertAfter === "string" && rawInsertAfter.trim()
                    ? rawInsertAfter.trim()
                    : undefined,
        });
    }

    return cleaned;
}

function sanitizePerOrderMap(raw: unknown): CustomStagesByOrderMap {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const result: CustomStagesByOrderMap = {};
    for (const [orderId, stages] of Object.entries(raw as Record<string, unknown>)) {
        if (!orderId || typeof orderId !== "string") continue;
        const cleaned = sanitizeStageList(stages);
        if (cleaned.length > 0) {
            result[orderId] = cleaned;
        }
    }
    return result;
}

function readLocalPerOrderStages(): CustomStagesByOrderMap {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!stored) return {};
        return sanitizePerOrderMap(JSON.parse(stored));
    } catch {
        return {};
    }
}

export function buildOrderedOSStages(
    customStages: OSStageConfig[],
    extraStatuses: string[] = []
): OSStageConfig[] {
    const result: OSStageConfig[] = [...DEFAULT_OS_STAGES];
    const anchorLastIdx = new Map<string, number>();

    for (const custom of customStages) {
        const trimmed = custom.name.trim();
        if (!trimmed) continue;

        const alreadyExists = result.some(
            (s) => s.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (alreadyExists) continue;

        const stageObj: OSStageConfig = {
            name: trimmed,
            color: isValidColorKey(custom.color) ? custom.color : "teal",
            isDefault: false,
            insertAfter: custom.insertAfter,
        };

        const anchorKey = (custom.insertAfter || "").trim().toLowerCase();
        let insertPos = -1;

        if (anchorKey && anchorKey !== "entregue e finalizado") {
            if (anchorLastIdx.has(anchorKey)) {
                insertPos = (anchorLastIdx.get(anchorKey) as number) + 1;
            } else {
                const foundIdx = result.findIndex(
                    (s) => s.name.toLowerCase() === anchorKey
                );
                if (foundIdx !== -1) {
                    insertPos = foundIdx + 1;
                }
            }
        }

        if (insertPos === -1) {
            const finishedIdx = result.findIndex(
                (s) => s.name === "Entregue e Finalizado"
            );
            insertPos = finishedIdx !== -1 ? finishedIdx : result.length;
        }

        result.splice(insertPos, 0, stageObj);

        anchorLastIdx.forEach((idx, k) => {
            if (idx >= insertPos) {
                anchorLastIdx.set(k, idx + 1);
            }
        });
        if (anchorKey) {
            anchorLastIdx.set(anchorKey, insertPos);
        }
    }

    // Garante que o status atual daquela OS nunca desapareça caso já esteja salvo no banco
    for (const rawStatus of extraStatuses) {
        if (typeof rawStatus !== "string") continue;
        const trimmed = rawStatus.trim();
        if (!trimmed) continue;
        const alreadyExists = result.some(
            (s) => s.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (alreadyExists) continue;

        const finishedIdx = result.findIndex(
            (s) => s.name === "Entregue e Finalizado"
        );
        const insertPos = finishedIdx !== -1 ? finishedIdx : result.length;
        result.splice(insertPos, 0, {
            name: trimmed,
            color: "violet",
            isDefault: false,
        });
    }

    return result;
}

export function useOSStages() {
    const [customStagesByOrder, setCustomStagesByOrder] =
        useState<CustomStagesByOrderMap>(() => readLocalPerOrderStages());
    const [isSaving, setIsSaving] = useState(false);

    // Carregar etapas individuais salvas no Supabase (api_settings)
    useEffect(() => {
        let isMounted = true;

        const loadFromSupabase = async () => {
            try {
                const { data, error } = await supabase
                    .from("api_settings")
                    .select("key_value")
                    .eq("key_name", API_SETTINGS_KEY)
                    .maybeSingle();

                if (!isMounted || error || !data?.key_value) return;

                const parsed = sanitizePerOrderMap(JSON.parse(data.key_value));
                setCustomStagesByOrder(parsed);
                try {
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
                } catch {
                    // ignore storage quota errors
                }
            } catch (err) {
                console.warn(
                    "Não foi possível carregar etapas individuais do Supabase:",
                    err
                );
            }
        };

        loadFromSupabase();

        const handleSyncEvent = (e: Event) => {
            const detail = (e as CustomEvent<CustomStagesByOrderMap>).detail;
            if (detail && typeof detail === "object") {
                setCustomStagesByOrder(sanitizePerOrderMap(detail));
            } else {
                setCustomStagesByOrder(readLocalPerOrderStages());
            }
        };

        window.addEventListener(SYNC_EVENT, handleSyncEvent);
        return () => {
            isMounted = false;
            window.removeEventListener(SYNC_EVENT, handleSyncEvent);
        };
    }, []);

    const persistMap = useCallback(async (nextMap: CustomStagesByOrderMap) => {
        const sanitized = sanitizePerOrderMap(nextMap);
        setCustomStagesByOrder(sanitized);

        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitized));
        } catch {
            // ignore storage errors
        }

        window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: sanitized }));

        setIsSaving(true);
        try {
            await supabase.from("api_settings").upsert(
                [
                    {
                        key_name: API_SETTINGS_KEY,
                        key_value: JSON.stringify(sanitized),
                        description:
                            "Etapas personalizadas individuais por Ordem de Serviço",
                        updated_at: new Date().toISOString(),
                    },
                ],
                { onConflict: "key_name" }
            );
        } catch (err) {
            console.warn(
                "Aviso ao sincronizar etapas individuais no Supabase:",
                err
            );
        } finally {
            setIsSaving(false);
        }
    }, []);

    const getCustomStagesForOrder = useCallback(
        (orderId?: string | null): OSStageConfig[] => {
            if (!orderId) return [];
            return customStagesByOrder[orderId] || [];
        },
        [customStagesByOrder]
    );

    const getStagesForOrder = useCallback(
        (
            orderId?: string | null,
            currentStatus?: ServiceStatus,
            draftCustomStages?: OSStageConfig[]
        ): OSStageConfig[] => {
            const custom =
                draftCustomStages !== undefined
                    ? draftCustomStages
                    : orderId
                    ? customStagesByOrder[orderId] || []
                    : [];
            const extras = currentStatus ? [currentStatus] : [];
            return buildOrderedOSStages(custom, extras);
        },
        [customStagesByOrder]
    );

    const getProductionStagesForOrder = useCallback(
        (
            orderId?: string | null,
            currentStatus?: ServiceStatus,
            draftCustomStages?: OSStageConfig[]
        ): OSStageConfig[] => {
            return getStagesForOrder(
                orderId,
                currentStatus,
                draftCustomStages
            ).filter((s) => s.name !== "A Definir");
        },
        [getStagesForOrder]
    );

    const addCustomStageForOrder = useCallback(
        async (
            orderId: string,
            name: string,
            color: OSStageColorKey = "teal",
            insertAfter?: string,
            currentStatus?: ServiceStatus
        ): Promise<string | null> => {
            if (!orderId) {
                toast.error("Selecione uma Ordem de Serviço.");
                return null;
            }

            const trimmed = name.trim();
            if (!trimmed) {
                toast.error("Digite o nome da nova etapa.");
                return null;
            }

            if (trimmed.length > 60) {
                toast.error("Use um nome de etapa com até 60 caracteres.");
                return null;
            }

            const existingForOrder = getStagesForOrder(orderId, currentStatus);
            const alreadyExists = existingForOrder.some(
                (s) => s.name.toLowerCase() === trimmed.toLowerCase()
            );
            if (alreadyExists) {
                toast.error(`A etapa "${trimmed}" já existe nesta OS.`);
                return null;
            }

            const newStage: OSStageConfig = {
                name: trimmed,
                color: isValidColorKey(color) ? color : "teal",
                isDefault: false,
                insertAfter:
                    insertAfter && insertAfter !== "Entregue e Finalizado"
                        ? insertAfter
                        : undefined,
            };

            const currentOrderStages = customStagesByOrder[orderId] || [];
            const nextMap: CustomStagesByOrderMap = {
                ...customStagesByOrder,
                [orderId]: [...currentOrderStages, newStage],
            };

            await persistMap(nextMap);
            toast.success(`Etapa "${trimmed}" adicionada somente nesta OS!`);
            return trimmed;
        },
        [customStagesByOrder, getStagesForOrder, persistMap]
    );

    const removeCustomStageForOrder = useCallback(
        async (orderId: string, name: string): Promise<boolean> => {
            const lower = name.trim().toLowerCase();
            if (defaultNamesLower.has(lower)) {
                toast.error("As etapas padrão não podem ser removidas.");
                return false;
            }

            const currentOrderStages = customStagesByOrder[orderId] || [];
            const filtered = currentOrderStages.filter(
                (s) => s.name.trim().toLowerCase() !== lower
            );

            const nextMap: CustomStagesByOrderMap = { ...customStagesByOrder };
            if (filtered.length > 0) {
                nextMap[orderId] = filtered;
            } else {
                delete nextMap[orderId];
            }

            await persistMap(nextMap);
            toast.success(`Etapa "${name}" removida desta OS.`);
            return true;
        },
        [customStagesByOrder, persistMap]
    );

    const setCustomStagesForOrder = useCallback(
        async (orderId: string, stages: OSStageConfig[]): Promise<void> => {
            if (!orderId) return;
            const cleaned = sanitizeStageList(stages);
            const nextMap: CustomStagesByOrderMap = { ...customStagesByOrder };
            if (cleaned.length > 0) {
                nextMap[orderId] = cleaned;
            } else {
                delete nextMap[orderId];
            }
            await persistMap(nextMap);
        },
        [customStagesByOrder, persistMap]
    );

    const clearCustomStagesForOrder = useCallback(
        async (orderId: string): Promise<void> => {
            if (!orderId || !customStagesByOrder[orderId]) return;
            const nextMap: CustomStagesByOrderMap = { ...customStagesByOrder };
            delete nextMap[orderId];
            await persistMap(nextMap);
        },
        [customStagesByOrder, persistMap]
    );

    const findStageConfig = useCallback(
        (
            status: ServiceStatus,
            orderId?: string | null,
            draftCustomStages?: OSStageConfig[]
        ): OSStageConfig | undefined => {
            const lower = (status || "").trim().toLowerCase();
            if (!lower) return undefined;

            const def = DEFAULT_OS_STAGES.find(
                (s) => s.name.toLowerCase() === lower
            );
            if (def) return def;

            if (draftCustomStages) {
                const foundDraft = draftCustomStages.find(
                    (s) => s.name.toLowerCase() === lower
                );
                if (foundDraft) return foundDraft;
            }

            if (orderId && customStagesByOrder[orderId]) {
                const foundOrder = customStagesByOrder[orderId].find(
                    (s) => s.name.toLowerCase() === lower
                );
                if (foundOrder) return foundOrder;
            }

            // Fallback: busca cor em qualquer OS que tenha configurado esse nome
            for (const list of Object.values(customStagesByOrder)) {
                const found = list.find((s) => s.name.toLowerCase() === lower);
                if (found) return found;
            }

            return undefined;
        },
        [customStagesByOrder]
    );

    const getStageBgClass = useCallback(
        (
            status: ServiceStatus,
            orderId?: string | null,
            draftCustomStages?: OSStageConfig[]
        ): string => {
            const cfg = findStageConfig(status, orderId, draftCustomStages);
            if (!cfg) {
                return status && !defaultNamesLower.has(status.toLowerCase())
                    ? "bg-teal-500"
                    : "bg-slate-400";
            }
            return OS_STAGE_COLORS[cfg.color]?.bg || "bg-teal-500";
        },
        [findStageConfig]
    );

    const getStageBorderClass = useCallback(
        (
            status: ServiceStatus,
            orderId?: string | null,
            draftCustomStages?: OSStageConfig[]
        ): string => {
            const cfg = findStageConfig(status, orderId, draftCustomStages);
            if (!cfg) {
                return status && !defaultNamesLower.has(status.toLowerCase())
                    ? "border-t-teal-500"
                    : "border-t-slate-500";
            }
            return OS_STAGE_COLORS[cfg.color]?.borderTop || "border-t-teal-500";
        },
        [findStageConfig]
    );

    const getStageProgress = useCallback(
        (
            status: ServiceStatus,
            orderId?: string | null,
            draftCustomStages?: OSStageConfig[]
        ): number => {
            if (!status || status === "A Definir") return 0;
            if (status === "Entregue e Finalizado") return 100;

            const inFlow = getProductionStagesForOrder(
                orderId,
                status,
                draftCustomStages
            ).filter((s) => s.name !== "Entregue e Finalizado");

            const idx = inFlow.findIndex(
                (s) => s.name.toLowerCase() === status.toLowerCase()
            );
            if (idx === -1) return 0;
            if (inFlow.length <= 1) return 50;

            return Math.round(5 + (idx / (inFlow.length - 1)) * 90);
        },
        [getProductionStagesForOrder]
    );

    // Colunas do Kanban: 12 etapas padrão + APENAS etapas personalizadas que tenham OS atualmente nela
    const buildKanbanStages = useCallback(
        (orders: ServiceOrder[]): OSStageConfig[] => {
            const activeCustomSpecs: OSStageConfig[] = [];
            const seenLower = new Set<string>(defaultNamesLower);

            for (const order of orders) {
                const st = (order.status || "").trim();
                if (!st) continue;
                const lower = st.toLowerCase();
                if (seenLower.has(lower)) continue;
                seenLower.add(lower);

                const cfg = findStageConfig(st, order.id);
                activeCustomSpecs.push({
                    name: st,
                    color: cfg?.color || "teal",
                    isDefault: false,
                    insertAfter: cfg?.insertAfter,
                });
            }

            return buildOrderedOSStages(activeCustomSpecs);
        },
        [findStageConfig]
    );

    const totalCustomStagesCount = Object.values(customStagesByOrder).reduce(
        (sum, list) => sum + list.length,
        0
    );

    return {
        customStagesByOrder,
        totalCustomStagesCount,
        isSaving,
        getCustomStagesForOrder,
        getStagesForOrder,
        getProductionStagesForOrder,
        addCustomStageForOrder,
        removeCustomStageForOrder,
        setCustomStagesForOrder,
        clearCustomStagesForOrder,
        getStageBgClass,
        getStageBorderClass,
        getStageProgress,
        buildKanbanStages,
    };
}
