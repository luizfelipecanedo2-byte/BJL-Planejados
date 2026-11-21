import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
    DEFAULT_OS_STAGES,
    OS_STAGE_COLORS,
    OSStageColorKey,
    OSStageConfig,
    ServiceStatus,
} from "@/types/serviceOrder";

const LOCAL_STORAGE_KEY = "bjl_os_custom_stages_v1";
const API_SETTINGS_KEY = "os_custom_stages";
const SYNC_EVENT = "bjl_os_stages_updated";

const defaultNamesLower = new Set(
    DEFAULT_OS_STAGES.map((s) => s.name.trim().toLowerCase())
);

function isValidColorKey(color: unknown): color is OSStageColorKey {
    return typeof color === "string" && color in OS_STAGE_COLORS;
}

function sanitizeCustomStages(raw: unknown): OSStageConfig[] {
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

function readLocalCustomStages(): OSStageConfig[] {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!stored) return [];
        return sanitizeCustomStages(JSON.parse(stored));
    } catch {
        return [];
    }
}

export function buildOrderedOSStages(
    customStages: OSStageConfig[],
    extraOrderStatuses: string[] = []
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

    // Garante que qualquer etapa encontrada nas OS já salvas no banco também apareça
    for (const rawStatus of extraOrderStatuses) {
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

export function useOSStages(extraOrderStatuses: string[] = []) {
    const [customStages, setCustomStages] = useState<OSStageConfig[]>(() =>
        readLocalCustomStages()
    );
    const [isSaving, setIsSaving] = useState(false);

    // Sincronizar etapas personalizadas salvas no Supabase (api_settings)
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

                const parsed = sanitizeCustomStages(JSON.parse(data.key_value));
                setCustomStages(parsed);
                try {
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
                } catch {
                    // ignore storage quota errors
                }
            } catch (err) {
                console.warn("Não foi possível carregar etapas personalizadas do Supabase:", err);
            }
        };

        loadFromSupabase();

        const handleSyncEvent = (e: Event) => {
            const detail = (e as CustomEvent<OSStageConfig[]>).detail;
            if (Array.isArray(detail)) {
                setCustomStages(sanitizeCustomStages(detail));
            } else {
                setCustomStages(readLocalCustomStages());
            }
        };

        window.addEventListener(SYNC_EVENT, handleSyncEvent);
        return () => {
            isMounted = false;
            window.removeEventListener(SYNC_EVENT, handleSyncEvent);
        };
    }, []);

    const persistCustomStages = useCallback(async (nextCustom: OSStageConfig[]) => {
        const sanitized = sanitizeCustomStages(nextCustom);
        setCustomStages(sanitized);

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
                        description: "Etapas personalizadas da Ordem de Serviço",
                        updated_at: new Date().toISOString(),
                    },
                ],
                { onConflict: "key_name" }
            );
        } catch (err) {
            console.warn("Aviso ao sincronizar etapas no Supabase:", err);
        } finally {
            setIsSaving(false);
        }
    }, []);

    const extraStatusesKey = useMemo(() => {
        const unique = Array.from(
            new Set(
                extraOrderStatuses
                    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
                    .map((s) => s.trim())
            )
        ).sort();
        return unique.join("||");
    }, [extraOrderStatuses]);

    const allStages = useMemo(() => {
        const extras = extraStatusesKey ? extraStatusesKey.split("||") : [];
        return buildOrderedOSStages(customStages, extras);
    }, [customStages, extraStatusesKey]);

    const productionStages = useMemo(
        () => allStages.filter((s) => s.name !== "A Definir"),
        [allStages]
    );

    const addCustomStage = useCallback(
        async (
            name: string,
            color: OSStageColorKey = "teal",
            insertAfter?: string
        ): Promise<string | null> => {
            const trimmed = name.trim();
            if (!trimmed) {
                toast.error("Digite o nome da nova etapa.");
                return null;
            }

            if (trimmed.length > 60) {
                toast.error("Use um nome de etapa com até 60 caracteres.");
                return null;
            }

            const alreadyExists = allStages.some(
                (s) => s.name.toLowerCase() === trimmed.toLowerCase()
            );
            if (alreadyExists) {
                toast.error(`A etapa "${trimmed}" já existe.`);
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

            const nextCustom = [...customStages, newStage];
            await persistCustomStages(nextCustom);
            toast.success(`Nova etapa "${trimmed}" adicionada!`);
            return trimmed;
        },
        [allStages, customStages, persistCustomStages]
    );

    const removeCustomStage = useCallback(
        async (name: string): Promise<boolean> => {
            const lower = name.trim().toLowerCase();
            if (defaultNamesLower.has(lower)) {
                toast.error("As etapas padrão não podem ser removidas.");
                return false;
            }

            const nextCustom = customStages.filter(
                (s) => s.name.trim().toLowerCase() !== lower
            );
            await persistCustomStages(nextCustom);
            toast.success(`Etapa "${name}" removida.`);
            return true;
        },
        [customStages, persistCustomStages]
    );

    const stageMap = useMemo(() => {
        const map = new Map<string, OSStageConfig>();
        for (const s of allStages) {
            map.set(s.name.toLowerCase(), s);
        }
        return map;
    }, [allStages]);

    const getStageBgClass = useCallback(
        (status: ServiceStatus): string => {
            const cfg = stageMap.get((status || "").toLowerCase());
            if (!cfg) return "bg-slate-400";
            return OS_STAGE_COLORS[cfg.color]?.bg || "bg-teal-500";
        },
        [stageMap]
    );

    const getStageBorderClass = useCallback(
        (status: ServiceStatus): string => {
            const cfg = stageMap.get((status || "").toLowerCase());
            if (!cfg) return "border-t-slate-500";
            return OS_STAGE_COLORS[cfg.color]?.borderTop || "border-t-teal-500";
        },
        [stageMap]
    );

    const getStageProgress = useCallback(
        (status: ServiceStatus): number => {
            if (!status || status === "A Definir") return 0;
            if (status === "Entregue e Finalizado") return 100;

            const inFlow = productionStages.filter(
                (s) => s.name !== "Entregue e Finalizado"
            );
            const idx = inFlow.findIndex(
                (s) => s.name.toLowerCase() === status.toLowerCase()
            );
            if (idx === -1) return 0;
            if (inFlow.length <= 1) return 50;

            return Math.round(5 + (idx / (inFlow.length - 1)) * 90);
        },
        [productionStages]
    );

    return {
        allStages,
        productionStages,
        customStages,
        isSaving,
        addCustomStage,
        removeCustomStage,
        getStageBgClass,
        getStageBorderClass,
        getStageProgress,
    };
}
