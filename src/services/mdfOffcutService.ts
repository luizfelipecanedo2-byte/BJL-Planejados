import { supabase } from "@/lib/supabase";
import { MdfOffcut } from "@/types/mdfOffcut";

const STORAGE_KEY = "bjl_mdf_offcuts_cache";

const INITIAL_OFFCUTS: MdfOffcut[] = [
    {
        id: "mock-offcut-1",
        code: "RET-001",
        materialName: "Branco TX",
        thicknessMm: 15,
        lengthMm: 1250,
        widthMm: 620,
        quantity: 2,
        grainDirection: "none",
        location: "Rack A - Baia 1",
        status: "disponivel",
        notes: "Sobra de tamponamento cozinha",
        createdAt: new Date().toISOString()
    },
    {
        id: "mock-offcut-2",
        code: "RET-002",
        materialName: "Louro Freijó",
        thicknessMm: 18,
        lengthMm: 980,
        widthMm: 450,
        quantity: 1,
        grainDirection: "longitudinal",
        location: "Rack B - Prateleira 2",
        status: "disponivel",
        notes: "Veio no comprimento (980mm). Perfeito para portas ou frentes.",
        createdAt: new Date().toISOString()
    },
    {
        id: "mock-offcut-3",
        code: "RET-003",
        materialName: "Gianduia Trama",
        thicknessMm: 18,
        lengthMm: 720,
        widthMm: 540,
        quantity: 1,
        grainDirection: "transversal",
        location: "Rack B - Baia 3",
        status: "reservado",
        reservedProject: "OS #104 - Painel Home",
        notes: "Reservado para acabamento lateral",
        createdAt: new Date().toISOString()
    },
    {
        id: "mock-offcut-4",
        code: "RET-004",
        materialName: "Branco TX",
        thicknessMm: 6,
        lengthMm: 1800,
        widthMm: 500,
        quantity: 3,
        grainDirection: "none",
        location: "Rack C - Fundos",
        status: "disponivel",
        notes: "Excelente para fundos de armário ou gavetas",
        createdAt: new Date().toISOString()
    }
];

export let isCloudConnected = true;

export const syncLocalOffcutsToSupabase = async (): Promise<number> => {
    try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (!cached) return 0;

        const list: MdfOffcut[] = JSON.parse(cached);
        const pending = list.filter(item => item.id.startsWith("local-"));
        if (pending.length === 0) return 0;

        let syncedCount = 0;
        for (const item of pending) {
            const payload = {
                code: item.code,
                material_name: item.materialName,
                thickness_mm: item.thicknessMm,
                length_mm: item.lengthMm,
                width_mm: item.widthMm,
                quantity: item.quantity,
                grain_direction: item.grainDirection,
                location: item.location,
                status: item.status,
                reserved_project: item.reservedProject || null,
                notes: item.notes || null
            };

            const { error } = await supabase.from("mdf_offcuts").insert([payload]);
            if (!error) {
                syncedCount++;
            }
        }

        if (syncedCount > 0) {
            // Remove os itens que foram enviados do cache local
            const remaining = list.filter(item => !item.id.startsWith("local-"));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
        }

        return syncedCount;
    } catch (err) {
        console.error("Erro na sincronização manual com o Supabase:", err);
        return 0;
    }
};

export const getOffcuts = async (): Promise<MdfOffcut[]> => {
    try {
        const { data, error } = await supabase
            .from("mdf_offcuts")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            isCloudConnected = false;
            console.warn("mdf_offcuts table not ready in Supabase, using local cache fallback:", error.message);
            const cached = localStorage.getItem(STORAGE_KEY);
            if (cached) {
                return JSON.parse(cached);
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_OFFCUTS));
            return INITIAL_OFFCUTS;
        }

        isCloudConnected = true;

        // Se a tabela existe, verificar se existem retalhos criados em modo offline/fallback para subir agora:
        await syncLocalOffcutsToSupabase();

        // Recarrega lista final do Supabase caso tenha havido sincronização
        const { data: latestData } = await supabase
            .from("mdf_offcuts")
            .select("*")
            .order("created_at", { ascending: false });

        const mapped: MdfOffcut[] = ((latestData || data || []) as any[]).map((row: any) => ({
            id: row.id,
            code: row.code,
            materialName: row.material_name,
            thicknessMm: Number(row.thickness_mm),
            lengthMm: Number(row.length_mm),
            widthMm: Number(row.width_mm),
            quantity: Number(row.quantity),
            grainDirection: row.grain_direction || "none",
            location: row.location || "Galpão",
            status: row.status || "disponivel",
            reservedProject: row.reserved_project,
            notes: row.notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));

        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        return mapped;
    } catch (err) {
        isCloudConnected = false;
        console.error("Error fetching MDF offcuts:", err);
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) return JSON.parse(cached);
        return INITIAL_OFFCUTS;
    }
};

export const createOffcut = async (offcut: Omit<MdfOffcut, "id" | "createdAt" | "updatedAt">): Promise<MdfOffcut> => {
    const payload = {
        code: offcut.code,
        material_name: offcut.materialName,
        thickness_mm: offcut.thicknessMm,
        length_mm: offcut.lengthMm,
        width_mm: offcut.widthMm,
        quantity: offcut.quantity,
        grain_direction: offcut.grainDirection,
        location: offcut.location,
        status: offcut.status,
        reserved_project: offcut.reservedProject || null,
        notes: offcut.notes || null
    };

    try {
        const { data, error } = await supabase
            .from("mdf_offcuts")
            .insert([payload])
            .select()
            .single();

        if (error) throw error;

        const newOffcut: MdfOffcut = {
            id: data.id,
            code: data.code,
            materialName: data.material_name,
            thicknessMm: Number(data.thickness_mm),
            lengthMm: Number(data.length_mm),
            widthMm: Number(data.width_mm),
            quantity: Number(data.quantity),
            grainDirection: data.grain_direction,
            location: data.location,
            status: data.status,
            reservedProject: data.reserved_project,
            notes: data.notes,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };

        const cached = localStorage.getItem(STORAGE_KEY);
        const list = cached ? JSON.parse(cached) : [];
        localStorage.setItem(STORAGE_KEY, JSON.stringify([newOffcut, ...list]));
        return newOffcut;
    } catch (err) {
        console.warn("Fallback to local storage for createOffcut:", err);
        const localItem: MdfOffcut = {
            ...offcut,
            id: "local-" + Date.now(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const cached = localStorage.getItem(STORAGE_KEY);
        const list: MdfOffcut[] = cached ? JSON.parse(cached) : [];
        const updated = [localItem, ...list];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return localItem;
    }
};

export const updateOffcut = async (id: string, updates: Partial<MdfOffcut>): Promise<void> => {
    const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString()
    };

    if (updates.code !== undefined) updatePayload.code = updates.code;
    if (updates.materialName !== undefined) updatePayload.material_name = updates.materialName;
    if (updates.thicknessMm !== undefined) updatePayload.thickness_mm = updates.thicknessMm;
    if (updates.lengthMm !== undefined) updatePayload.length_mm = updates.lengthMm;
    if (updates.widthMm !== undefined) updatePayload.width_mm = updates.widthMm;
    if (updates.quantity !== undefined) updatePayload.quantity = updates.quantity;
    if (updates.grainDirection !== undefined) updatePayload.grain_direction = updates.grainDirection;
    if (updates.location !== undefined) updatePayload.location = updates.location;
    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.reservedProject !== undefined) updatePayload.reserved_project = updates.reservedProject;
    if (updates.notes !== undefined) updatePayload.notes = updates.notes;

    try {
        if (!id.startsWith("local-") && !id.startsWith("mock-")) {
            const { error } = await supabase
                .from("mdf_offcuts")
                .update(updatePayload)
                .eq("id", id);
            if (error) throw error;
        }
    } catch (err) {
        console.warn("Supabase update error, applying locally:", err);
    }

    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
        const list: MdfOffcut[] = JSON.parse(cached);
        const updated = list.map(item => item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
};

export const deleteOffcut = async (id: string): Promise<void> => {
    try {
        if (!id.startsWith("local-") && !id.startsWith("mock-")) {
            const { error } = await supabase
                .from("mdf_offcuts")
                .delete()
                .eq("id", id);
            if (error) throw error;
        }
    } catch (err) {
        console.warn("Supabase delete error, removing locally:", err);
    }

    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
        const list: MdfOffcut[] = JSON.parse(cached);
        const updated = list.filter(item => item.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
};
