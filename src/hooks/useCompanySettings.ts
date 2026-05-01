
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { CompanySettings } from "@/types/company";
import { toast } from "sonner";

export const useCompanySettings = () => {
    const [settings, setSettings] = useState<CompanySettings | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('company_settings')
                .select('*')
                .maybeSingle();

            if (error) {
                console.error("Erro ao carregar configurações da empresa:", error);
                toast.error("Não foi possível carregar as informações da empresa");
            } else if (data) {
                setSettings(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const updateSettings = async (newSettings: Partial<CompanySettings>) => {
        try {
            const { data, error } = await supabase
                .from('company_settings')
                .upsert({ 
                    ...settings, 
                    ...newSettings, 
                    updated_at: new Date().toISOString() 
                })
                .select()
                .single();

            if (error) {
                console.error("Erro ao atualizar configurações:", error);
                toast.error("Erro ao salvar alterações");
                return false;
            }

            setSettings(data);
            toast.success("Informações da empresa atualizadas com sucesso!");
            return true;
        } catch (e) {
            console.error(e);
            toast.error("Ocorreu um erro inesperado");
            return false;
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    return { settings, loading, updateSettings, refreshSettings: fetchSettings };
};
