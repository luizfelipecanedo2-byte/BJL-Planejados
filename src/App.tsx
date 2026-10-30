import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster"; // BJL CRM v1.1 - Tasks System Integration
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MainLayout from "./components/MainLayout";
import Financeiro from "./pages/Financeiro";
import OrdemServico from "./pages/OrdemServico";
import Estoque from "./pages/Estoque";
import PedidosSemana from "./pages/PedidosSemana";
import Clientes from "./pages/Clientes";
import Orcamento from "./pages/Orcamento";
import Login from "./pages/Login";
import Tarefas from "./pages/Tarefas";
import LandingPage from "./pages/LandingPage";
import { Session } from "@supabase/supabase-js";
import Configuracoes from "./pages/Configuracoes";
import Agenda from "./pages/Agenda";


const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        // Fallback safety timeout (max 5 seconds loading)
        const safetyTimeout = setTimeout(() => {
            setLoading(false);
        }, 5000);

        const isMock = localStorage.getItem("mock_admin_session") === "true";
        if (isMock) {
            setSession({ user: { id: "mock-admin-id", email: "luizfelipe.canedo2@gmail.com" } } as unknown as Session);
            setRole("admin");
            setLoading(false);
            clearTimeout(safetyTimeout);
        } else {
            supabase.auth.getSession().then(({ data: { session } }) => {
                setSession(session);
                if (session?.user) {
                    fetchRole(session.user.id, session.user.email);
                } else {
                    setLoading(false);
                    clearTimeout(safetyTimeout);
                }
            });
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const isMock = localStorage.getItem("mock_admin_session") === "true";
            if (isMock) {
                setSession({ user: { id: "mock-admin-id", email: "luizfelipe.canedo2@gmail.com" } } as unknown as Session);
                setRole("admin");
                return;
            }
            setSession(session);
            if (session?.user) {
                fetchRole(session.user.id, session.user.email);
            } else {
                setRole(null);
            }
        });

        return () => {
            subscription.unsubscribe();
            clearTimeout(safetyTimeout);
        };
    }, []);

  const fetchRole = async (userId: string, email?: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching role:', error);
      }

      if (email === 'luizfelipe@bjl.com' || email === 'luizfelipe.canedo2@gmail.com') {
        setRole('admin');
      } else if (data) {
        setRole(data.role);
      } else {
        setRole('colaborador');
      }
    } catch (err) {
      console.error('Crash in fetchRole:', err);
      setRole('colaborador');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#060609] relative overflow-hidden">
        <div className="absolute inset-0 aurora-bg opacity-30"></div>
        <div className="absolute inset-0 stardust opacity-40"></div>

        {/* Orbital Laser Boot Scanner */}
        <div className="relative flex items-center justify-center w-36 h-36">
          <div className="absolute inset-0 rounded-full bg-primary/15 blur-3xl animate-pulse" />
          {/* Outer rotating segmented ring */}
          <div className="absolute inset-0 rounded-full border border-dashed border-primary/40 animate-orbit" />
          {/* Inner counter-rotating laser ring */}
          <div className="absolute inset-2.5 rounded-full border-t-2 border-r-2 border-primary/80 border-b-transparent border-l-transparent animate-orbit-reverse shadow-[0_0_25px_hsl(var(--primary)/0.35)]" />
          {/* Core Logo Container */}
          <div className="relative z-10 h-24 w-24 rounded-full bg-black/80 border border-white/10 flex items-center justify-center p-2 shadow-2xl backdrop-blur-xl">
            <img
              src="/logo-bjl.png"
              alt="BJL Planejados"
              className="h-full w-full object-contain rounded-full"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                if (target.nextElementSibling) {
                  target.nextElementSibling.classList.remove('hidden');
                }
              }}
            />
            <span className="hidden text-xl font-display font-bold tracking-tight text-primary">BJL</span>
          </div>
        </div>

        <div className="mt-8 space-y-3 flex flex-col items-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-mono font-bold text-primary uppercase tracking-[0.25em]">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
            SYS.BOOT // BJL.OS v2.6
          </div>
          <h2 className="text-lg font-display font-bold tracking-[0.35em] shimmer-gold uppercase">
            Inicializando Cockpit
          </h2>
          <div className="w-56 h-1 bg-white/5 rounded-full overflow-hidden border border-white/10 p-[1px]">
            <div className="h-full bg-gradient-to-r from-primary/40 via-primary to-amber-300 w-2/3 animate-[shimmer_1.8s_infinite] rounded-full shadow-[0_0_12px_hsl(var(--primary))]" />
          </div>
          <p className="text-[10px] font-mono font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap">
            BJL Planejados • Enterprise Cloud Architecture
          </p>
        </div>
      </div>
    );
  }

  const isAdmin = role === 'admin';

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={!session ? <Login /> : <Navigate to="/admin" />} />
            <Route path="/orcamento" element={<Navigate to="/admin/orcamento" replace />} />
            <Route path="/crm" element={<Navigate to="/admin" replace />} />
            <Route path="/clientes" element={<Navigate to="/admin/clientes" replace />} />
            <Route path="/financeiro" element={<Navigate to="/admin/financeiro" replace />} />

            <Route path="/admin" element={session ? <MainLayout /> : <Navigate to="/login" />}>
              <Route index element={isAdmin ? <Index /> : <Navigate to="estoque" />} />
              <Route path="financeiro" element={isAdmin ? <Financeiro /> : <Navigate to="estoque" />} />
              <Route path="clientes" element={isAdmin ? <Clientes /> : <Navigate to="estoque" />} />
              <Route path="ordem-servico" element={<OrdemServico />} />
              <Route path="orcamento" element={isAdmin ? <Orcamento /> : <Navigate to="estoque" />} />
              <Route path="estoque" element={<Estoque />} />
              <Route path="pedidos-semana" element={<PedidosSemana />} />
              <Route path="tarefas" element={<Tarefas />} />
              <Route path="agenda" element={isAdmin ? <Agenda /> : <Navigate to="estoque" />} />
              <Route path="configuracoes" element={session ? <Configuracoes /> : <Navigate to="/estoque" />} />

              <Route path="*" element={<NotFound />} />

            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
