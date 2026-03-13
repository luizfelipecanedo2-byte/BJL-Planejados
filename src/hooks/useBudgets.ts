
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

    const updateMaterialPrice = async (id: string, newPrice: number) => {
        const { error } = await supabase
            .from('budget_materials')
            .update({ unit_price: newPrice })
            .eq('id', id);

        if (error) {
            toast.error("Erro ao atualizar preço");
        } else {
            setMaterials(prev => prev.map(m => m.id === id ? { ...m, unit_price: newPrice } : m));
            toast.success("Preço atualizado");
        }
    };

    const saveBudget = async (budget: Omit<Budget, "id" | "created_at">, items: BudgetItem[]) => {
        try {
            const { data: budgetData, error: budgetError } = await supabase
                .from('budgets')
                .insert([budget])
                .select()
                .single();

            if (budgetError) throw budgetError;

            const itemsWithId = items.map(item => ({
                ...item,
                budget_id: budgetData.id
            }));

            const { error: itemsError } = await supabase
                .from('budget_items')
                .insert(itemsWithId);

            if (itemsError) throw itemsError;

            toast.success("Orçamento salvo com sucesso!");
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
        updateMaterialPrice,
        saveBudget,
        refreshMaterials: fetchMaterials,
        refreshBudgets: fetchBudgets
    };
}
