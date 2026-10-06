import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useUserRole() {
    const [role, setRole] = useState<'admin' | 'colaborador' | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const checkRole = async () => {
            try {
                const isMock = localStorage.getItem("mock_admin_session") === "true";
                if (isMock) {
                    if (isMounted) {
                        setUserEmail("luizfelipe.canedo2@gmail.com");
                        setRole('admin');
                        setIsLoading(false);
                    }
                    return;
                }

                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    if (isMounted) {
                        setRole('colaborador');
                        setIsLoading(false);
                    }
                    return;
                }

                if (isMounted) setUserEmail(user.email || null);

                // E-mails administradores oficiais
                if (user.email === 'luizfelipe@bjl.com' || user.email === 'luizfelipe.canedo2@gmail.com') {
                    if (isMounted) {
                        setRole('admin');
                        setIsLoading(false);
                    }
                    return;
                }

                // Consulta tabela profiles no Supabase
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (isMounted) {
                    if (profile && profile.role === 'admin') {
                        setRole('admin');
                    } else {
                        setRole('colaborador');
                    }
                    setIsLoading(false);
                }
            } catch (err) {
                console.warn("Erro ao identificar permissão de usuário:", err);
                if (isMounted) {
                    setRole('colaborador');
                    setIsLoading(false);
                }
            }
        };

        checkRole();

        return () => {
            isMounted = false;
        };
    }, []);

    const isAdmin = role === 'admin';

    return { role, isAdmin, isLoading, userEmail };
}
