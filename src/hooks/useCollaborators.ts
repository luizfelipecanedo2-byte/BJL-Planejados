import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface CollaboratorExtra {
    id: string;
    collaborator_id: string;
    amount: number;
    description: string;
    date: string;
    created_at?: string;
}

export interface Collaborator {
    id: string;
    name: string;
    role: string;
    phone?: string;
    email?: string;
    salary: number; // Salário Base Mensal
    extras_total: number; // Total de Extras no Mês Atual
    extras?: CollaboratorExtra[];
    active: boolean;
    created_at?: string;
}

const DEFAULT_COLLABORATORS: Collaborator[] = [
    { id: "samuel-default", name: "Samuel", role: "Marceneiro", salary: 2800, extras_total: 0, active: true },
    { id: "felipe-default", name: "Felipe", role: "Marceneiro / Montador", salary: 3200, extras_total: 0, active: true },
    { id: "lucas-default", name: "Lucas", role: "Marceneiro", salary: 2600, extras_total: 0, active: true },
    { id: "ze-luiz-default", name: "Zé Luiz", role: "Marceneiro", salary: 3000, extras_total: 0, active: true },
    { id: "adrian-default", name: "Adrian", role: "Marceneiro / Colaborador", salary: 2500, extras_total: 0, active: true }
];

export function useCollaborators() {
    const [collaborators, setCollaborators] = useState<Collaborator[]>(DEFAULT_COLLABORATORS);
    const [loading, setLoading] = useState(true);

    const fetchCollaborators = useCallback(async () => {
        try {
            setLoading(true);

            // 1. Busca os colaboradores
            const { data: colabsData, error: colabsError } = await supabase
                .from("collaborators")
                .select("*")
                .order("name", { ascending: true });

            if (colabsError) {
                console.warn("Aviso ao buscar colaboradores (usando padrão):", colabsError.message);
                setCollaborators(DEFAULT_COLLABORATORS);
                return;
            }

            if (!colabsData || colabsData.length === 0) {
                setCollaborators(DEFAULT_COLLABORATORS);
                return;
            }

            // 2. Busca os extras cadastrados
            let extrasData: CollaboratorExtra[] = [];
            try {
                const { data: extras, error: extrasError } = await supabase
                    .from("collaborator_extras")
                    .select("*")
                    .order("date", { ascending: false });

                if (!extrasError && extras) {
                    extrasData = extras;
                }
            } catch (err) {
                console.warn("Tabela collaborator_extras ainda não inicializada.");
            }

            // 3. Monta colaboradores com salário e soma dos extras
            const merged: Collaborator[] = colabsData.map((c: any) => {
                const colabExtras = extrasData.filter(e => e.collaborator_id === c.id);
                const extrasTotal = colabExtras.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
                const salary = Number(c.salary) || Number(c.hourly_rate) || 0;

                return {
                    id: c.id,
                    name: c.name,
                    role: c.role || "Marceneiro",
                    phone: c.phone,
                    email: c.email,
                    salary: salary,
                    extras_total: extrasTotal,
                    extras: colabExtras,
                    active: c.active !== false,
                    created_at: c.created_at
                };
            });

            setCollaborators(merged);
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
        salary?: number;
    }) => {
        try {
            const salary = Number(newCollab.salary) || 0;
            const payload = {
                name: newCollab.name.trim(),
                role: newCollab.role?.trim() || "Marceneiro",
                phone: newCollab.phone?.trim() || null,
                email: newCollab.email?.trim() || null,
                salary: salary,
                hourly_rate: salary, // retrocompatibilidade
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
            const payload: any = { ...updates };
            if (updates.salary !== undefined) {
                payload.salary = updates.salary;
                payload.hourly_rate = updates.salary;
            }
            delete payload.extras;
            delete payload.extras_total;

            const { error } = await supabase
                .from("collaborators")
                .update({
                    ...payload,
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

    const addExtra = async (collaboratorId: string, amount: number, description: string, date?: string) => {
        try {
            const payload = {
                collaborator_id: collaboratorId,
                amount: Number(amount),
                description: description.trim(),
                date: date || new Date().toISOString().split("T")[0]
            };

            const { error } = await supabase
                .from("collaborator_extras")
                .insert([payload]);

            if (error) throw error;

            toast.success(`Extra de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)} lançado com sucesso!`);
            await fetchCollaborators();
            return { success: true };
        } catch (error: any) {
            console.error("Erro ao lançar extra:", error);
            toast.error(error.message || "Erro ao lançar extra");
            return { success: false, error };
        }
    };

    const deleteExtra = async (extraId: string) => {
        try {
            const { error } = await supabase
                .from("collaborator_extras")
                .delete()
                .eq("id", extraId);

            if (error) throw error;

            toast.success("Lançamento de extra removido!");
            await fetchCollaborators();
            return { success: true };
        } catch (error: any) {
            console.error("Erro ao remover extra:", error);
            toast.error(error.message || "Erro ao remover extra");
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

    const activeCollaborators = collaborators.filter(c => c.active);

    return {
        collaborators,
        activeCollaborators,
        loading,
        refresh: fetchCollaborators,
        addCollaborator,
        updateCollaborator,
        addExtra,
        deleteExtra,
        toggleStatus,
        deleteCollaborator
    };
}
