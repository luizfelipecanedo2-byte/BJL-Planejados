
import {
    DollarSign,
    TrendingUp,
    ClipboardList,
    Package,
    Calendar,
    Menu,
    X,
    Users,
    LogOut,
    UserCircle,
    Calculator,
    Armchair,
    Sofa,
    Ruler,
    CheckSquare
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { CommandMenu } from "./CommandMenu";
import { Search } from "lucide-react";
import { NotificationBell } from "./notifications/NotificationBell";
import { checkAndNotifyOverdueTasks } from "@/lib/notifications";

const MainLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [role, setRole] = useState<string | null>('colaborador');
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUserEmail(user.email || null);

                    if (user.email === 'luizfelipe.canedo2@gmail.com') {
                        setRole('admin');
                        return;
                    }

                    const { data, error } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();

                    if (data) {
                        setRole(data.role);
                    } else {
                        setRole('colaborador');
                    }
                }
            } catch (e) {
                console.error("Erro ao carregar perfil:", e);
                setRole('colaborador');
            }
        };
        fetchUserProfile();
        checkAndNotifyOverdueTasks();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/login");
        toast.success("Logoff realizado com sucesso");
    };

    const allMenuItems = [
        { icon: TrendingUp, label: "CRM", path: "/admin", roles: ['admin'], emoji: "📊" },
        { icon: Calculator, label: "Orçamento", path: "/admin/orcamento", roles: ['admin'], emoji: "💰" },
        { icon: Users, label: "Cliente e Fornecedores", path: "/admin/clientes", roles: ['admin'], emoji: "👥" },
        { icon: DollarSign, label: "Financeiro", path: "/admin/financeiro", roles: ['admin'], emoji: "🏦" },
        { icon: ClipboardList, label: "Ordem de Serviço", path: "/admin/ordem-servico", roles: ['admin'], emoji: "📋" },
        { icon: Package, label: "Estoque", path: "/admin/estoque", roles: ['admin', 'colaborador'], emoji: "📦" },
        { icon: Calendar, label: "Pedidos da Semana", path: "/admin/pedidos-semana", roles: ['admin', 'colaborador'], emoji: "🗓️" },
        { icon: CheckSquare, label: "Tarefas", path: "/admin/tarefas", roles: ['admin', 'colaborador'], emoji: "✅" },
    ];

    const menuItems = allMenuItems.filter(item => {
        if (role === 'admin') return true;
        return item.roles.includes('colaborador');
    });

    return (
        <div className="min-h-[100dvh] bg-background/50 flex pb-[72px] lg:pb-0 overflow-hidden">
            <CommandMenu />
            <div className="aurora-bg" />

            <aside className="hidden lg:flex fixed lg:static inset-y-0 left-0 z-50 w-72 glass-card border-r border-white/5 shadow-2xl flex-col transition-all duration-500">
                <div className="h-28 flex items-center px-8 border-b border-white/5 justify-between shrink-0 relative overflow-hidden group">
                    <div className="flex items-center gap-4 w-full justify-center relative z-10 transition-transform duration-500 group-hover:scale-105">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                            <img src="/logo-bjl.png" alt="BJL Planejados" className="h-16 w-16 object-contain rounded-full border border-primary/30 shadow-[0_0_30px_rgba(var(--primary),0.2)] animate-pinball p-1 bg-black/40 relative z-10" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-2xl font-black tracking-tighter text-luxury shimmer-gold">BJL</span>
                            <span className="text-[8px] uppercase tracking-[0.3em] font-bold text-primary/60">Planejados</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-b border-white/5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors duration-300">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-primary/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="w-12 h-12 rounded-full border border-primary/30 p-0.5 overflow-hidden shadow-xl relative z-10">
                            {role === 'admin' ? (
                                <img src="/luiz-felipe.png" className="w-full h-full object-cover rounded-full transition-transform duration-500 group-hover:scale-110" alt="Luiz Felipe" />
                            ) : (
                                <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
                                    <UserCircle className="w-6 h-6 text-primary" />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold truncate tracking-tight text-foreground text-luxury">
                            {role === 'admin' ? 'Luiz Felipe Canedo' : userEmail?.split('@')[0]}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] uppercase font-black text-primary/70 tracking-widest leading-none">{role === 'admin' ? 'Administrador' : 'Colaborador'}</span>
                        </div>
                    </div>
                </div>

                <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto min-h-0 bg-transparent scrollbar-none">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-500 menu-item-premium group relative overflow-hidden",
                                location.pathname === item.path
                                    ? "active text-primary font-bold bg-primary/5 shadow-lg"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <div className={cn(
                                "flex items-center justify-center p-2 rounded-xl transition-all duration-500 w-10 h-10 relative z-10",
                                location.pathname === item.path 
                                    ? "bg-primary/20 scale-110 shadow-[0_0_20px_rgba(var(--primary),0.3)]" 
                                    : "bg-white/5 group-hover:bg-primary/10 group-hover:scale-105"
                            )}>
                                <span className="emoji-3d text-xl">{item.emoji}</span>
                            </div>
                            <span className={cn(
                                "text-sm tracking-wide transition-all relative z-10 text-luxury",
                                location.pathname === item.path ? "font-bold" : "font-medium group-hover:translate-x-1"
                            )}>{item.label}</span>
                            
                            {location.pathname === item.path && (
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50" />
                            )}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 mt-auto border-t border-white/5">
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-4 px-4 py-6 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300 border border-transparent hover:border-destructive/20"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-5 w-5" />
                        <span className="text-sm font-bold text-luxury">Encerrar Sessão</span>
                    </Button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0 h-[100dvh] lg:h-screen relative z-10">
                <header className="h-20 glass-card backdrop-blur-2xl flex items-center justify-between px-8 sticky top-0 z-30 border-b border-white/5 shadow-2xl">
                    <div className="flex items-center gap-8">
                        <div className="lg:hidden flex items-center gap-3">
                            <img src="/logo-bjl.png" alt="BJL" className="h-10 w-10 object-contain rounded-full border border-primary/30" />
                            <div className="flex flex-col">
                                <h1 className="text-xl font-black text-luxury shimmer-gold leading-none">BJL</h1>
                                <span className="text-[7px] uppercase tracking-[0.2em] font-bold text-primary/60">Planejados</span>
                            </div>
                        </div>
                        <div className="hidden lg:flex flex-col">
                             <h2 className="text-sm font-bold text-primary/60 uppercase tracking-[0.3em] text-luxury">Sistema de Gestão Premium</h2>
                             <div className="h-0.5 w-12 bg-primary/40 mt-1 rounded-full" />
                        </div>

                        <button 
                            onClick={() => {
                                const e = new KeyboardEvent('keydown', {
                                    key: 'k',
                                    ctrlKey: true,
                                    metaKey: true,
                                    bubbles: true
                                });
                                document.dispatchEvent(e);
                            }}
                            className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all group"
                        >
                            <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            <span className="text-xs text-muted-foreground font-bold tracking-wide text-luxury">Pesquisar...</span>
                            <div className="flex items-center gap-1 bg-white/10 px-1.5 py-0.5 rounded-lg border border-white/10">
                                <span className="text-[10px] font-black text-muted-foreground">⌘</span>
                                <span className="text-[10px] font-black text-muted-foreground">K</span>
                            </div>
                        </button>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden sm:flex items-center gap-4 bg-white/5 px-4 py-2 rounded-2xl border border-white/5 shadow-inner">
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-bold truncate max-w-[150px] text-luxury">
                                    {role === 'admin' ? 'Luiz Felipe Canedo' : userEmail?.split('@')[0]}
                                </span>
                                <span className="text-[9px] uppercase font-black text-primary/60 tracking-widest leading-none">
                                    {role === 'admin' ? 'Administrador' : 'Colaborador'}
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                             <NotificationBell />
                             <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                                onClick={handleLogout}
                            >
                                <LogOut className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-8 lg:p-10 overflow-y-auto overflow-x-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none overflow-hidden">
                        <div className="relative w-full h-full flex items-center justify-center opacity-[0.03]">
                             <div className="absolute rotate-[-15deg] scale-[3] blur-[2px]">
                                <h1 className="text-9xl font-black text-luxury tracking-tighter whitespace-nowrap">BJL PLANEJADOS</h1>
                             </div>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="relative z-10 w-full h-full"
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-white/5 flex flex-row items-center justify-between h-[76px] px-3 shadow-2xl overflow-x-auto hide-scrollbar safe-area-bottom">
                {menuItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                            "flex flex-col items-center justify-center min-w-[68px] flex-shrink-0 h-14 space-y-1.5 transition-all duration-500 rounded-2xl relative",
                            location.pathname === item.path
                                ? "text-primary font-bold bg-primary/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] scale-105"
                                : "text-muted-foreground hover:text-foreground active:scale-95"
                        )}
                    >
                        <item.icon className={cn("h-5 w-5", location.pathname === item.path ? "scale-110 drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" : "")} />
                        <span className="text-[9px] text-center font-bold tracking-tight text-luxury truncate px-1 w-full">{item.label}</span>
                    </Link>
                ))}
            </nav>
        </div>
    );
};

export default MainLayout;
