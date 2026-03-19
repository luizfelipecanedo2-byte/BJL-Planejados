import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface Material {
    id: string;
    name: string;
    category: string;
    unit: string;
    unit_price: number;
}

export interface BudgetItem {
    id?: string;
    material_id: string;
    quantity: number;
    unit_price_at_time: number;
    total_price: number;
    material?: Material;
}

export interface Budget {
    id: string;
    client_name: string;
    project_name: string;
    status: string;
    days_estimated: number;
    markup_factor: number;
    card_fee_percent: number;
    total_cost: number;
    total_value: number;
    notes: string;
    created_at: string;
    items?: BudgetItem[];
}

export function useBudgets() {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMaterials();
        fetchBudgets();
    }, []);

    const fetchMaterials = async () => {
        const { data, error } = await supabase
            .from('budget_materials')
            .select('*')
            .order('category', { ascending: true });

        if (error) {
            console.error("Error fetching materials:", error);
        } else {
            setMaterials(data || []);
        }
    };

    const fetchBudgets = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('budgets')
            .select('*, budget_items(*, budget_materials(*))')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching budgets:", error);
        } else {
            setBudgets(data || []);
        }
        setLoading(false);
    };

    const updateMaterial = async (id: string, updates: Partial<Material>) => {
        const { error } = await supabase
            .from('budget_materials')
            .update(updates)
            .eq('id', id);

        if (error) {
            toast.error("Erro ao atualizar item");
            return false;
        } else {
            setMaterials(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
            toast.success("Item atualizado");
            return true;
        }
    };

    const addMaterial = async (material: Omit<Material, "id">) => {
        const { data, error } = await supabase
            .from('budget_materials')
            .insert([material])
            .select()
            .single();

        if (error) {
            toast.error("Erro ao adicionar material: " + error.message);
            return null;
        } else {
            setMaterials(prev => [...prev, data]);
            toast.success("Material adicionado com sucesso");
            return data;
        }
    };

    const deleteMaterial = async (id: string) => {
        const { error } = await supabase
            .from('budget_materials')
            .delete()
            .eq('id', id);

        if (error) {
            if (error.code === '23503') {
                toast.error("Este item não pode ser excluído pois está sendo usado em orçamentos.");
            } else {
                toast.error("Erro ao excluir material: " + error.message);
            }
            return false;
        } else {
            setMaterials(prev => prev.filter(m => m.id !== id));
            toast.success("Material excluído com sucesso");
            return true;
        }
    };

    const deleteBudget = async (id: string) => {
        const { error: itemsError } = await supabase
            .from('budget_items')
            .delete()
            .eq('budget_id', id);

        if (itemsError) {
            toast.error("Erro ao excluir itens do orçamento");
            return false;
        }

        const { error: budgetError } = await supabase
            .from('budgets')
            .delete()
            .eq('id', id);

        if (budgetError) {
            toast.error("Erro ao excluir orçamento");
            return false;
        }

        setBudgets(prev => prev.filter(b => b.id !== id));
        toast.success("Orçamento excluído com sucesso");
        return true;
    };

    const saveBudget = async (budget: Partial<Budget>, items: BudgetItem[]) => {
        try {
            let budgetData, budgetError;

            const budgetFields = {
                client_name: budget.client_name,
                project_name: budget.project_name,
                days_estimated: budget.days_estimated || 1,
                markup_factor: budget.markup_factor || 1,
                card_fee_percent: budget.card_fee_percent || 0,
                total_cost: budget.total_cost || 0,
                total_value: budget.total_value || 0,
                notes: budget.notes || "",
                status: budget.status || 'em_elaboracao'
            };

            if (budget.id) {
                const { data, error } = await supabase
                    .from('budgets')
                    .update(budgetFields)
                    .eq('id', budget.id)
                    .select()
                    .single();
                budgetData = data;
                budgetError = error;

                if (!budgetError) {
                    await supabase.from('budget_items').delete().eq('budget_id', budget.id);
                }
            } else {
                const { data, error } = await supabase
                    .from('budgets')
                    .insert([budgetFields])
                    .select()
                    .single();
                budgetData = data;
                budgetError = error;
            }

            if (budgetError) throw budgetError;
            if (!budgetData) throw new Error("Não foi possível obter os dados do orçamento salvo");

            const itemsWithId = items.map(item => ({
                material_id: item.material_id,
                quantity: item.quantity,
                unit_price_at_time: item.unit_price_at_time,
                total_price: item.total_price,
                budget_id: budgetData.id
            }));

            const { error: itemsError } = await supabase
                .from('budget_items')
                .insert(itemsWithId);

            if (itemsError) throw itemsError;

            toast.success(budget.id ? "Orçamento atualizado!" : "Orçamento salvo com sucesso!");
            fetchBudgets();
            return budgetData;
        } catch (error: any) {
            toast.error("Erro ao salvar orçamento: " + error.message);
            return null;
        }
    };

    return {
        materials,
        budgets,
        loading,
        updateMaterial,
        addMaterial,
        deleteMaterial,
        deleteBudget,
        saveBudget,
        refreshMaterials: fetchMaterials,
        refreshBudgets: fetchBudgets
    };
}
