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
import Configuracoes from "./pages/Configuracoes";
import Agenda from "./pages/Agenda";


const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        // Fallback safety timeout (max 5 seconds loading)
        const safetyTimeout = setTimeout(() => {
            setLoading(false);
        }, 5000);

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                fetchRole(session.user.id, session.user.email);
            } else {
                setLoading(false);
                clearTimeout(safetyTimeout);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

      if (data) {
        setRole(data.role);
      } else if (email === 'luizfelipe.canedo2@gmail.com') {
        setRole('admin');
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-black relative overflow-hidden">
        <div className="absolute inset-0 aurora-bg opacity-20"></div>
        <div className="absolute inset-0 stardust opacity-30"></div>
        
        <div className="relative group">
            <div className="absolute -inset-8 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            <img src="/logo-bjl.png" alt="BJL Planejados" className="h-24 w-24 object-contain rounded-full border-2 border-primary/30 shadow-[0_0_20px_rgba(251,191,36,0.2)] animate-pinball p-1 bg-black/20" onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            if (target.nextElementSibling) {
                                target.nextElementSibling.classList.remove('hidden');
                            }
                        }} />
                        <span className="hidden text-xl font-bold tracking-tight text-primary">BJL</span>
        </div>
        
        <div className="mt-8 space-y-4 flex flex-col items-center relative z-10">
            <h2 className="text-xl font-black tracking-[0.5em] shimmer-gold uppercase">Iniciando Sistema</h2>
            <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div className="h-full bg-gradient-to-r from-primary via-amber-400 to-primary w-2/3 animate-[shimmer_2s_infinite] rounded-full" />
            </div>
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest whitespace-nowrap">BJL Planejados • Luxo & Tecnologia</p>
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

            <Route path="/admin" element={session ? <MainLayout /> : <Navigate to="/login" />}>
              <Route index element={isAdmin ? <Index /> : <Navigate to="estoque" />} />
              <Route path="financeiro" element={isAdmin ? <Financeiro /> : <Navigate to="estoque" />} />
              <Route path="clientes" element={isAdmin ? <Clientes /> : <Navigate to="estoque" />} />
              <Route path="ordem-servico" element={isAdmin ? <OrdemServico /> : <Navigate to="estoque" />} />
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
