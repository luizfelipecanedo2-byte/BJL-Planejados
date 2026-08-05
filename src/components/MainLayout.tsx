
import {
    DollarSign,
    TrendingUp,
    ClipboardList,
    Package,
    Calendar,
    CalendarDays,
    Menu,
    X,
    Users,
    LogOut,
    UserCircle,
    Calculator,
    Armchair,
    Sofa,
    Ruler,
    CheckSquare,
    Settings,
    ChevronLeft,
    ChevronRight,
    Palette,
    Volume2,
    VolumeX,
    AlertTriangle
} from "lucide-react";


import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";

import { CommandMenu } from "./CommandMenu";
import { Search } from "lucide-react";
import { NotificationBell } from "./notifications/NotificationBell";
import { checkAndNotifyOverdueTasks } from "@/lib/notifications";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Magnetic } from "./ui/Magnetic";
import { playClickSound, playHoverSound, playTransitionSound } from "@/lib/audio";


const MainLayout = () => {
    const { settings } = useCompanySettings();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
        return localStorage.getItem("isSidebarCollapsed") === "true";
    });

    const [currentTheme, setCurrentTheme] = useState<string>(() => {
        return localStorage.getItem("appTheme") || "theme-gold";
    });
    const [isThemePanelOpen, setIsThemePanelOpen] = useState(false);
    const [soundsEnabled, setSoundsEnabled] = useState(() => {
        return localStorage.getItem("ui_sounds") !== "false";
    });

    const toggleSounds = () => {
        const newValue = !soundsEnabled;
        setSoundsEnabled(newValue);
        localStorage.setItem("ui_sounds", newValue ? "true" : "false");
        if (newValue) {
            setTimeout(() => {
                playClickSound();
            }, 50);
            toast.success("Efeitos sonoros ativados!");
        } else {
            toast.success("Efeitos sonoros desativados.");
        }
    };


    useEffect(() => {
        const themes = ["theme-gold", "theme-emerald", "theme-sapphire", "theme-amethyst"];
        themes.forEach(t => document.documentElement.classList.remove(t));
        document.documentElement.classList.add(currentTheme);
        
        // Add or remove the 'dark' class to enable Tailwind's dark: variant classes
        if (currentTheme === "theme-emerald") {
            document.documentElement.classList.remove("dark");
        } else {
            document.documentElement.classList.add("dark");
        }
        
        localStorage.setItem("appTheme", currentTheme);
    }, [currentTheme]);

    // High performance spring-chased mouse glow tracking (No React re-renders)
    const mouseX = useMotionValue(-200);
    const mouseY = useMotionValue(-200);

    const glowX = useSpring(mouseX, { damping: 50, stiffness: 200, mass: 0.5 });
    const glowY = useSpring(mouseY, { damping: 50, stiffness: 200, mass: 0.5 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Center the 192px glow card (96px offsets)
            mouseX.set(e.clientX - 96);
            mouseY.set(e.clientY - 96);
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [mouseX, mouseY]);

    const [overdueCount, setOverdueCount] = useState<number>(0);
    const [overdueSum, setOverdueSum] = useState<number>(0);

    const [role, setRole] = useState<string | null>('colaborador');
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const location = useLocation();
    const navigate = useNavigate();

    const [uiSoundsEnabled, setUiSoundsEnabled] = useState<boolean>(() => {
        return localStorage.getItem("ui_sounds") !== "false";
    });

    const toggleUiSounds = () => {
        setUiSoundsEnabled(prev => {
            const next = !prev;
            localStorage.setItem("ui_sounds", String(next));
            toast.success(next ? "Efeitos sonoros ativados" : "Efeitos sonoros desativados", { duration: 1500 });
            if (next) setTimeout(playClickSound, 50);
            return next;
        });
    };

    const toggleSidebarCollapse = () => {
        setIsSidebarCollapsed(prev => {
            const next = !prev;
            localStorage.setItem("isSidebarCollapsed", String(next));
            return next;
        });
    };

    const fetchOverdueTransactions = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('transactions')
                .select('amount, type')
                .eq('status', 'pending')
                .lt('due_date', today);

            if (!error && data) {
                const unpaidExpenses = data.filter(t => t.type === 'expense');
                const count = unpaidExpenses.length;
                const sum = unpaidExpenses.reduce((acc, t) => acc + Number(t.amount), 0);
                
                setOverdueCount(count);
                setOverdueSum(sum);
            }
        } catch (err) {
            console.error("Erro ao buscar transações vencidas:", err);
        }
    };

    useEffect(() => {
        const fetchUserProfile = async () => {
            const isMock = localStorage.getItem("mock_admin_session") === "true";
            if (isMock) {
                setUserEmail("luizfelipe.canedo2@gmail.com");
                setRole('admin');
                return;
            }
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

    useEffect(() => {
        fetchOverdueTransactions();
    }, [location.pathname]);

    const handleLogout = async () => {
        localStorage.removeItem("mock_admin_session");
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
        { icon: CalendarDays, label: "Agenda Geral", path: "/admin/agenda", roles: ['admin'], emoji: "📅" },
        { icon: CheckSquare, label: "Tarefas", path: "/admin/tarefas", roles: ['admin', 'colaborador'], emoji: "✅" },
        { icon: Settings, label: "Configurações", path: "/admin/configuracoes", roles: ['admin', 'colaborador'], emoji: "⚙️" },

    ];


    const menuItems = allMenuItems.filter(item => {
        if (role === 'admin') return true;
        return item.roles.includes('colaborador');
    });

    return (
        <div className="min-h-[100dvh] bg-background/50 flex pb-[72px] lg:pb-0 overflow-hidden">
            <CommandMenu />
            <div className="aurora-bg" />
            
            {/* Global Pointer Glow Effect */}
            <motion.div
                className="fixed w-48 h-48 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.12)_0%,transparent_70%)] pointer-events-none z-30 filter blur-xl select-none hidden lg:block"
                style={{ left: glowX, top: glowY }}
            />

            {/* Mesh Gradient Background (Fundo Dinâmico Animado de Última Geração) */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(circle,hsl(var(--mesh-color-1)/0.08)_0%,transparent_70%)] animate-[float-slow_25s_infinite_alternate]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(circle,hsl(var(--mesh-color-2)/0.06)_0%,transparent_70%)] animate-[float-medium_20s_infinite_alternate]" />
                <div className="absolute top-[30%] right-[20%] w-[40vw] h-[40vw] rounded-full bg-[radial-gradient(circle,hsl(var(--mesh-color-1)/0.05)_0%,transparent_70%)] animate-[float-reverse_30s_infinite_alternate]" />
            </div>

            <aside className={cn(
                "hidden lg:flex fixed lg:static top-6 bottom-6 left-6 z-50 glass-card border border-white/10 shadow-2xl flex-col transition-all duration-500 rounded-3xl m-4 lg:mr-0 lg:my-6 overflow-hidden",
                isSidebarCollapsed ? "w-20" : "w-72"
            )}>
                <div className={cn("h-28 flex items-center justify-between shrink-0 relative overflow-hidden group", isSidebarCollapsed ? "px-2" : "px-6")}>
                    <div className={cn("flex items-center gap-4 w-full justify-center relative z-10 transition-all duration-500", isSidebarCollapsed ? "flex-col gap-1" : "flex-row")}>
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                            <img src={settings?.logo_url || "/logo-bjl.png"} alt={settings?.name || "BJL Planejados"} className={cn("object-contain rounded-full border border-primary/30 shadow-[0_0_30px_rgba(var(--primary),0.2)] bg-black/40 relative z-10 transition-all duration-500", isSidebarCollapsed ? "h-10 w-10 p-0.5" : "h-16 w-16 p-1")} />
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="flex flex-col animate-in fade-in duration-300">
                                <span className="text-2xl font-['Cinzel'] font-bold tracking-widest text-luxury shimmer-gold uppercase">{settings?.name?.split(' ')[0] || "BJL"}</span>
                                <span className="text-[8px] uppercase tracking-[0.3em] font-bold text-primary/60">{settings?.name?.split(' ').slice(1).join(' ') || "Planejados"}</span>
                            </div>
                        )}
                    </div>
                    
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                            playClickSound();
                            toggleSidebarCollapse();
                        }}
                        onMouseEnter={playHoverSound}
                        className={cn(
                            "h-7 w-7 text-muted-foreground hover:text-primary rounded-xl absolute z-20 transition-all bg-black/40 hover:bg-black/80 border border-white/10",
                            isSidebarCollapsed ? "left-1/2 -translate-x-1/2 bottom-2" : "right-2 top-2 opacity-0 group-hover:opacity-100"
                        )}
                        title={isSidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
                    >
                        {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                </div>

                {/* Floating glass profile widget with gradient border spin */}
                <div className={cn(
                    "mx-4 mb-4 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-all duration-500 flex items-center gap-3 relative group overflow-hidden",
                    isSidebarCollapsed ? "justify-center p-2.5 mx-2" : ""
                )}>
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative shrink-0">
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-primary to-transparent opacity-50 blur-[2px] group-hover:opacity-100 group-hover:animate-[spin_4s_linear_infinite] transition-opacity" />
                        <div className="w-10 h-10 rounded-full border border-black/40 p-0.5 overflow-hidden shadow-xl relative z-10 bg-background/80">
                            {role === 'admin' ? (
                                <img src="/luiz-felipe.png" className="w-full h-full object-cover rounded-full transition-transform duration-500 group-hover:scale-110" alt="Luiz Felipe" />
                            ) : (
                                <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
                                    <UserCircle className="w-5 h-5 text-primary" />
                                </div>
                            )}
                        </div>
                    </div>

                    {!isSidebarCollapsed && (
                        <div className="flex flex-col min-w-0 z-10 animate-in fade-in duration-300">
                            <span className="text-xs font-black truncate tracking-tight text-foreground text-luxury group-hover:text-primary transition-colors duration-300">
                                {role === 'admin' ? 'Luiz Felipe' : userEmail?.split('@')[0]}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                                <span className="text-[7px] uppercase font-black text-primary/70 tracking-widest leading-none">{role === 'admin' ? 'Administrador' : 'Colaborador'}</span>
                            </div>
                        </div>
                    )}
                </div>

                <nav className={cn("space-y-1 flex-1 overflow-y-auto min-h-0 bg-transparent scrollbar-none", isSidebarCollapsed ? "p-2" : "p-3")}>
                    {menuItems.map((item) => (
                        <Magnetic key={item.path} range={35} strength={0.15} className="w-full">
                            <Link
                                to={item.path}
                                title={isSidebarCollapsed ? item.label : undefined}
                                onMouseEnter={playHoverSound}
                                onClick={playClickSound}
                                className={cn(
                                    "flex items-center rounded-xl transition-all duration-300 menu-item-premium group relative overflow-hidden w-full",
                                    isSidebarCollapsed ? "justify-center p-2 h-14" : "gap-4 px-4 py-3",
                                    location.pathname === item.path
                                        ? "text-primary font-bold z-10"
                                        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.01]"
                                )}
                            >
                                {location.pathname === item.path && (
                                    <motion.div
                                        layoutId="sidebar-active-indicator"
                                        className="absolute inset-0 bg-primary/10 border-l-2 border-primary rounded-xl z-0"
                                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                                    />
                                )}
                                <div className={cn(
                                    "flex items-center justify-center p-2 rounded-xl transition-all duration-500 w-10 h-10 relative z-10",
                                    location.pathname === item.path 
                                        ? "bg-primary/20 scale-105 shadow-[0_0_15px_rgba(var(--primary),0.2)] text-primary" 
                                        : "bg-white/5 group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-105"
                                )}>
                                    <item.icon className={cn(
                                        "h-5 w-5 transition-all duration-500",
                                        item.label === "Configurações" && "group-hover:rotate-90",
                                        item.label === "CRM" && "group-hover:-translate-y-0.5",
                                        item.label === "Financeiro" && "group-hover:scale-110",
                                        item.label === "Tarefas" && "group-hover:scale-105",
                                        item.label === "Orçamento" && "group-hover:rotate-12",
                                        item.label === "Cliente e Fornecedores" && "group-hover:scale-105"
                                    )} />
                                </div>
                                {!isSidebarCollapsed && (
                                    <span className={cn(
                                        "text-sm tracking-wide transition-all relative z-10 text-luxury animate-in fade-in duration-300",
                                        location.pathname === item.path ? "font-bold" : "font-medium group-hover:translate-x-1"
                                    )}>{item.label}</span>
                                )}
                            </Link>
                        </Magnetic>
                    ))}
                </nav>

                <div className={cn("p-4", isSidebarCollapsed ? "p-2 flex justify-center" : "p-3")}>
                    <Magnetic range={30} strength={0.15} className="w-full">
                        <Button
                            variant="ghost"
                            title={isSidebarCollapsed ? "Encerrar Sessão" : undefined}
                            className={cn(
                                "rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300 border border-transparent hover:border-destructive/20 w-full",
                                isSidebarCollapsed ? "w-12 h-12 p-0 flex items-center justify-center" : "justify-start gap-4 px-4 py-6"
                            )}
                            onClick={() => {
                                playClickSound();
                                handleLogout();
                            }}
                            onMouseEnter={playHoverSound}
                        >
                            <LogOut className="h-5 w-5" />
                            {!isSidebarCollapsed && <span className="text-sm font-bold text-luxury animate-in fade-in duration-300">Encerrar Sessão</span>}
                        </Button>
                    </Magnetic>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0 h-[100dvh] lg:h-screen relative z-10">
                <header className="h-20 glass-card backdrop-blur-2xl flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 border-b border-white/5 shadow-2xl">
                    <div className="flex items-center gap-4 md:gap-8">
                        <div className="lg:hidden flex items-center gap-3">
                            <img src={settings?.logo_url || "/logo-bjl.png"} alt={settings?.name || "BJL"} className="h-10 w-10 object-contain rounded-full border border-primary/30" />
                            <div className="flex flex-col">
                                <h1 className="text-xl font-['Cinzel'] font-bold text-luxury shimmer-gold leading-none uppercase">{settings?.name?.split(' ')[0] || "BJL"}</h1>
                                <span className="text-[7px] uppercase tracking-[0.2em] font-bold text-primary/60">{settings?.name?.split(' ').slice(1).join(' ') || "Planejados"}</span>
                            </div>
                        </div>

                        <div className="hidden lg:flex flex-col">
                             <h2 className="text-sm font-bold text-primary/60 uppercase tracking-[0.3em] text-luxury">Sistema de Gestão Premium</h2>
                             <div className="h-0.5 w-12 bg-primary/40 mt-1 rounded-full" />
                        </div>

                        <Magnetic range={25} strength={0.2}>
                            <button 
                                onClick={() => {
                                    playClickSound();
                                    const e = new KeyboardEvent('keydown', {
                                        key: 'k',
                                        ctrlKey: true,
                                        metaKey: true,
                                        bubbles: true
                                    });
                                    document.dispatchEvent(e);
                                }}
                                onMouseEnter={playHoverSound}
                                className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all group"
                            >
                                <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                <span className="text-xs text-muted-foreground font-bold tracking-wide text-luxury">Pesquisar...</span>
                                <div className="flex items-center gap-1 bg-white/10 px-1.5 py-0.5 rounded-lg border border-white/10">
                                    <span className="text-[10px] font-black text-muted-foreground">⌘</span>
                                    <span className="text-[10px] font-black text-muted-foreground">K</span>
                                </div>
                            </button>
                        </Magnetic>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-6">
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
                        
                        <div className="flex items-center gap-1 sm:gap-2">
                             {/* Botão do Customizador de Temas Premium */}
                             <Magnetic range={25} strength={0.25}>
                                 <Button
                                     variant="ghost"
                                     size="icon"
                                     onClick={() => {
                                         playClickSound();
                                         setIsThemePanelOpen(true);
                                     }}
                                     onMouseEnter={playHoverSound}
                                     className="text-muted-foreground hover:text-primary rounded-xl transition-all mr-1 relative group"
                                     title="Personalizar Tema"
                                 >
                                     <Palette className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                                     <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                         <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                     </span>
                                 </Button>
                             </Magnetic>
                             <Magnetic range={25} strength={0.25}>
                                 <Button
                                     variant="ghost"
                                     size="icon"
                                     onClick={toggleSounds}
                                     onMouseEnter={playHoverSound}
                                     className="text-muted-foreground hover:text-primary rounded-xl transition-all mr-1"
                                     title={soundsEnabled ? "Desativar Sons" : "Ativar Sons"}
                                 >
                                     {soundsEnabled ? <Volume2 className="h-5 w-5 text-primary animate-pulse" /> : <VolumeX className="h-5 w-5" />}
                                 </Button>
                             </Magnetic>
                             <NotificationBell />
                             <Magnetic range={25} strength={0.25}>
                                 <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-primary rounded-xl transition-all"
                                    onClick={() => {
                                        playClickSound();
                                        navigate("/configuracoes");
                                    }}
                                    onMouseEnter={playHoverSound}
                                >
                                    <Settings className="h-5 w-5" />
                                </Button>
                             </Magnetic>
                             <Magnetic range={25} strength={0.25}>
                                 <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                                    onClick={() => {
                                        playClickSound();
                                        handleLogout();
                                    }}
                                    onMouseEnter={playHoverSound}
                                >
                                    <LogOut className="h-5 w-5" />
                                </Button>
                             </Magnetic>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-3 md:p-8 lg:p-10 overflow-y-auto overflow-x-auto touch-pan-x relative max-w-full">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none overflow-hidden">
                        <div className="relative w-full h-full flex items-center justify-center opacity-[0.03]">
                             <div className="absolute rotate-[-15deg] scale-[3] blur-[2px]">
                                 <h1 className="text-9xl font-black text-luxury tracking-tighter whitespace-nowrap">BJL PLANEJADOS</h1>
                             </div>
                        </div>
                    </div>

                    {overdueCount > 0 && (
                        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border-2 border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.15)] flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500 relative z-20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-rose-500/20 rounded-xl text-rose-500">
                                    <AlertTriangle className="h-5 w-5 animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white uppercase tracking-tight">Atenção: Contas Vencidas Detectadas!</p>
                                    <p className="text-xs text-muted-foreground">Existem <span className="text-rose-500 font-bold">{overdueCount} despesas</span> pendentes vencidas que totalizam <span className="text-rose-500 font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(overdueSum)}</span>.</p>
                                </div>
                            </div>
                            <Button 
                                onClick={() => navigate('/admin/financeiro?overdue=true')}
                                className="bg-rose-600 hover:bg-rose-500 text-white font-black uppercase text-[10px] tracking-widest px-6 h-10 rounded-xl shadow-lg shadow-rose-950/20 active:scale-95 transition-all shrink-0"
                            >
                                Ver Pendências
                            </Button>
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, scale: 0.98, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: -12 }}
                            transition={{ type: "spring", damping: 25, stiffness: 190 }}
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

            {/* Painel Lateral de Personalização de Temas */}
            <AnimatePresence>
                {isThemePanelOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsThemePanelOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 cursor-pointer"
                        />
                        {/* Panel */}
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 bottom-0 w-80 bg-background/95 backdrop-blur-2xl border-l border-white/10 z-50 p-6 shadow-2xl flex flex-col justify-between"
                        >
                            <div className="space-y-6">
                                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                    <div className="flex items-center gap-2">
                                        <Palette className="h-5 w-5 text-primary" />
                                        <h3 className="font-black text-sm uppercase tracking-wider text-white">Customizador de Tema</h3>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsThemePanelOpen(false)}
                                        className="h-8 w-8 rounded-full border border-white/5 hover:bg-white/5"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Selecione uma Paleta de Cores</p>
                                    
                                    <div className="grid grid-cols-1 gap-3">
                                        {/* Classic Obsidian Card */}
                                        <button
                                            onClick={() => {
                                                playClickSound();
                                                setCurrentTheme("theme-gold");
                                            }}
                                            onMouseEnter={playHoverSound}
                                            className={cn(
                                                "w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between group",
                                                currentTheme === "theme-gold" 
                                                    ? "bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]" 
                                                    : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10"
                                            )}
                                        >
                                            <div className="space-y-1">
                                                <span className="font-bold text-xs text-white block group-hover:text-primary transition-colors">Classic Obsidian</span>
                                                <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Escuro de Luxo & Ouro</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="w-3.5 h-3.5 rounded-full bg-[#111111] border border-white/10" />
                                                <div className="w-3.5 h-3.5 rounded-full bg-amber-500" />
                                            </div>
                                        </button>

                                        {/* Nordic Frost Card */}
                                        <button
                                            onClick={() => {
                                                playClickSound();
                                                setCurrentTheme("theme-emerald");
                                            }}
                                            onMouseEnter={playHoverSound}
                                            className={cn(
                                                "w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between group",
                                                currentTheme === "theme-emerald" 
                                                    ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
                                                    : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10"
                                            )}
                                        >
                                            <div className="space-y-1">
                                                <span className="font-bold text-xs text-white block group-hover:text-primary transition-colors">Nordic Frost</span>
                                                <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Claro Gelado & Esmeralda</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="w-3.5 h-3.5 rounded-full bg-[#f9fafb] border border-black/10" />
                                                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500" />
                                            </div>
                                        </button>

                                        {/* Midnight Navy Card */}
                                        <button
                                            onClick={() => {
                                                playClickSound();
                                                setCurrentTheme("theme-sapphire");
                                            }}
                                            onMouseEnter={playHoverSound}
                                            className={cn(
                                                "w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between group",
                                                currentTheme === "theme-sapphire" 
                                                    ? "bg-blue-500/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
                                                    : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10"
                                            )}
                                        >
                                            <div className="space-y-1">
                                                <span className="font-bold text-xs text-white block group-hover:text-primary transition-colors">Midnight Navy</span>
                                                <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Azul Escuro & Safira</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="w-3.5 h-3.5 rounded-full bg-[#0a0f1d] border border-white/10" />
                                                <div className="w-3.5 h-3.5 rounded-full bg-blue-500" />
                                            </div>
                                        </button>

                                        {/* Cyberpunk Neo Card */}
                                        <button
                                            onClick={() => {
                                                playClickSound();
                                                setCurrentTheme("theme-amethyst");
                                            }}
                                            onMouseEnter={playHoverSound}
                                            className={cn(
                                                "w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between group",
                                                currentTheme === "theme-amethyst" 
                                                    ? "bg-purple-500/10 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]" 
                                                    : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10"
                                            )}
                                        >
                                            <div className="space-y-1">
                                                <span className="font-bold text-xs text-white block group-hover:text-primary transition-colors">Cyberpunk Neo</span>
                                                <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Púrpura Profundo & Ametista</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="w-3.5 h-3.5 rounded-full bg-[#07020d] border border-white/10" />
                                                <div className="w-3.5 h-3.5 rounded-full bg-purple-500" />
                                            </div>
                                        </button>
                                    </div>

                                    {/* UI Audio Feedback Controller */}
                                    <div className="pt-4 border-t border-white/5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">Efeitos Sonoros</span>
                                                <span className="text-[9px] text-muted-foreground block">Clicks e toques digitais</span>
                                            </div>
                                            <button
                                                onClick={toggleUiSounds}
                                                className={cn(
                                                    "w-12 h-6 rounded-full p-1 transition-all duration-300 relative border border-white/10",
                                                    uiSoundsEnabled ? "bg-primary" : "bg-white/5"
                                                )}
                                            >
                                                <motion.div
                                                    layout
                                                    className="w-3.5 h-3.5 rounded-full bg-white shadow-md"
                                                    style={{ float: uiSoundsEnabled ? "right" : "left" }}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                    </div>
                                </div>

                            <div className="border-t border-white/5 pt-4 text-center">
                                <p className="text-[8px] font-black uppercase text-muted-foreground tracking-[0.2em] leading-normal">
                                    BJL PLANEJADOS • LUXO & TECNOLOGIA<br />DESIGN SISTEMA V1.2
                                </p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MainLayout;
