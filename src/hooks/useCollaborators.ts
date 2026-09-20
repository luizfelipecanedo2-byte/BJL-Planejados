import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface Collaborator {
    id: string;
    name: string;
    role: string;
    phone?: string;
    email?: string;
    hourly_rate?: number;
    active: boolean;
    created_at?: string;
}

const DEFAULT_COLLABORATORS: Collaborator[] = [
    { id: "samuel-default", name: "Samuel", role: "Marceneiro", active: true },
    { id: "felipe-default", name: "Felipe", role: "Marceneiro / Montador", active: true },
    { id: "lucas-default", name: "Lucas", role: "Marceneiro", active: true },
    { id: "ze-luiz-default", name: "Zé Luiz", role: "Marceneiro", active: true },
    { id: "adrian-default", name: "Adrian", role: "Marceneiro / Colaborador", active: true }
];

export function useCollaborators() {
    const [collaborators, setCollaborators] = useState<Collaborator[]>(DEFAULT_COLLABORATORS);
    const [loading, setLoading] = useState(true);

    const fetchCollaborators = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("collaborators")
                .select("*")
                .order("name", { ascending: true });

            if (error) {
                // Tabela pode ainda não existir no Supabase, mantemos fallback
                console.warn("Aviso ao buscar colaboradores (usando padrão):", error.message);
                setCollaborators(DEFAULT_COLLABORATORS);
            } else if (data && data.length > 0) {
                setCollaborators(data);
            } else {
                setCollaborators(DEFAULT_COLLABORATORS);
            }
        } catch (err) {
            console.error("Erro inesperado ao buscar colaboradores:", err);
            setCollaborators(DEFAULT_COLLABORATORS);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCollaborators();
    }, [fetchCollaborators]);

    const addCollaborator = async (newCollab: {
        name: string;
        role?: string;
        phone?: string;
        email?: string;
        hourly_rate?: number;
    }) => {
        try {
            const payload = {
                name: newCollab.name.trim(),
                role: newCollab.role?.trim() || "Marceneiro",
                phone: newCollab.phone?.trim() || null,
                email: newCollab.email?.trim() || null,
                hourly_rate: Number(newCollab.hourly_rate) || 0,
                active: true
            };

            const { data, error } = await supabase
                .from("collaborators")
                .insert([payload])
                .select()
                .single();

            if (error) throw error;

            toast.success(`Colaborador ${payload.name} cadastrado com sucesso!`);
            await fetchCollaborators();
            return { success: true, data };
        } catch (error: any) {
            console.error("Erro ao adicionar colaborador:", error);
            toast.error(error.message || "Erro ao adicionar colaborador");
            return { success: false, error };
        }
    };

    const updateCollaborator = async (id: string, updates: Partial<Collaborator>) => {
        try {
            const { error } = await supabase
                .from("collaborators")
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq("id", id);

            if (error) throw error;

            toast.success("Dados do colaborador atualizados!");
            await fetchCollaborators();
            return { success: true };
        } catch (error: any) {
            console.error("Erro ao atualizar colaborador:", error);
            toast.error(error.message || "Erro ao atualizar colaborador");
            return { success: false, error };
        }
    };

    const toggleStatus = async (id: string, currentActive: boolean) => {
        return updateCollaborator(id, { active: !currentActive });
    };

    const deleteCollaborator = async (id: string, name: string) => {
        try {
            const { error } = await supabase
                .from("collaborators")
                .delete()
                .eq("id", id);

            if (error) throw error;

            toast.success(`Colaborador ${name} removido!`);
            await fetchCollaborators();
            return { success: true };
        } catch (error: any) {
            console.error("Erro ao remover colaborador:", error);
            toast.error(error.message || "Erro ao remover colaborador");
            return { success: false, error };
        }
    };

    // Apenas os ativos para selects e filtros operacionais
    const activeCollaborators = collaborators.filter(c => c.active);

    return {
        collaborators,
        activeCollaborators,
        loading,
        refresh: fetchCollaborators,
        addCollaborator,
        updateCollaborator,
        toggleStatus,
        deleteCollaborator
    };
}
