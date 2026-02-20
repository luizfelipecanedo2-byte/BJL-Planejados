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
import Login from "./pages/Login";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />

            <Route path="/" element={session ? <MainLayout /> : <Navigate to="/login" />}>
              <Route index element={<Index />} />
              <Route path="financeiro" element={<Financeiro />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="ordem-servico" element={<OrdemServico />} />
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
