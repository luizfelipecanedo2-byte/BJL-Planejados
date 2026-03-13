import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
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

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchRole(session.user.id, session.user.email);
      } else {
        setLoading(false);
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

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId: string, email?: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (data) {
      setRole(data.role);
    } else if (email === 'luizfelipe.canedo2@gmail.com') {
      setRole('admin');
    } else {
      setRole('colaborador');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
            <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />

            <Route path="/" element={session ? <MainLayout /> : <Navigate to="/login" />}>
              <Route index element={isAdmin ? <Index /> : <Navigate to="/ordem-servico" />} />
              <Route path="financeiro" element={isAdmin ? <Financeiro /> : <Navigate to="/ordem-servico" />} />
              <Route path="clientes" element={isAdmin ? <Clientes /> : <Navigate to="/ordem-servico" />} />
              <Route path="ordem-servico" element={<OrdemServico />} />
              <Route path="orcamento" element={<Orcamento />} />
              <Route path="estoque" element={<Estoque />} />
              <Route path="pedidos-semana" element={<PedidosSemana />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
