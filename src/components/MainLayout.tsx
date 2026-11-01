
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
    AlertTriangle,
    Clock,
    ShieldCheck,
    Zap,
    Sparkles,
    Plus
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { checkAndNotifyOverdueTasks } from "@/lib/notifications";
import { checkAndAutoLaunchCommission } from "@/services/commissionService";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Magnetic } from "./ui/Magnetic";
import { playClickSound, playHoverSound, playTransitionSound } from "@/lib/audio";
import { PWAInstallButton } from "./shared/PWAInstallButton";


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

    const [overdueCount, setOverdueCount] = useState<number>(0);
    const [overdueSum, setOverdueSum] = useState<number>(0);
    const [todayDueCount, setTodayDueCount] = useState<number>(0);
    const [todayDueSum, setTodayDueSum] = useState<number>(0);

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

    const fetchFinancialAlerts = async () => {
        try {
            // Apenas administradores devem ver alertas de contas a pagar
            if (role !== 'admin') {
                setOverdueCount(0);
                setOverdueSum(0);
                setTodayDueCount(0);
                setTodayDueSum(0);
                return;
            }

            const todayStr = new Date().toISOString().split('T')[0];
            
            // 1. Contas VENCIDAS (due_date < hoje)
            const { data: overdueData, error: overdueErr } = await supabase
                .from('transactions')
                .select('amount, type')
                .eq('status', 'pending')
                .lt('due_date', todayStr);

            if (!overdueErr && overdueData) {
                const unpaidOverdueExpenses = overdueData.filter(t => t.type === 'expense');
                setOverdueCount(unpaidOverdueExpenses.length);
                setOverdueSum(unpaidOverdueExpenses.reduce((acc, t) => acc + Number(t.amount), 0));
            }

            // 2. Contas que VENCEM HOJE (due_date = hoje)
            const { data: todayData, error: todayErr } = await supabase
                .from('transactions')
                .select('amount, type')
                .eq('status', 'pending')
                .eq('due_date', todayStr);

            if (!todayErr && todayData) {
                const unpaidTodayExpenses = todayData.filter(t => t.type === 'expense');
                setTodayDueCount(unpaidTodayExpenses.length);
                setTodayDueSum(unpaidTodayExpenses.reduce((acc, t) => acc + Number(t.amount), 0));
            }
        } catch (err) {
            console.error("Erro ao buscar alertas financeiros:", err);
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
                    if (user.email === 'luizfelipe@bjl.com' || user.email === 'luizfelipe.canedo2@gmail.com') {
                        setRole('admin');
                    } else {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('role')
                            .eq('id', user.id)
                            .single();

                        if (profile) setRole(profile.role);
                    }
                }
            } catch (e) {
                console.error("Erro ao carregar perfil:", e);
                setRole('colaborador');
            }
        };
        fetchUserProfile();
        const bgTimer = setTimeout(() => {
            checkAndNotifyOverdueTasks();
            checkAndAutoLaunchCommission();
        }, 3500);
        return () => clearTimeout(bgTimer);
    }, []);

    useEffect(() => {
        if (role === 'admin') {
            fetchFinancialAlerts();
        }
    }, [role]);

    const handleLogout = async () => {
        localStorage.removeItem("mock_admin_session");
        await supabase.auth.signOut();
        navigate("/login");
        toast.success("Logoff realizado com sucesso");
    };

    const allMenuItems = [
        { icon: TrendingUp, label: "CRM Comercial", path: "/admin", roles: ['admin'], emoji: "📊", group: "COMERCIAL & IA" },
        { icon: Calculator, label: "Orçamentos IA", path: "/admin/orcamento", roles: ['admin'], emoji: "💰", group: "COMERCIAL & IA" },
        { icon: Users, label: "Clientes & Equipe", path: "/admin/clientes", roles: ['admin'], emoji: "👥", group: "COMERCIAL & IA" },
        { icon: ClipboardList, label: "Ordens de Serviço", path: "/admin/ordem-servico", roles: ['admin', 'colaborador'], emoji: "📋", group: "OPERAÇÃO FABRIL" },
        { icon: CheckSquare, label: "Tarefas & Fábrica", path: "/admin/tarefas", roles: ['admin', 'colaborador'], emoji: "✅", group: "OPERAÇÃO FABRIL" },
        { icon: Package, label: "Estoque & Chapas", path: "/admin/estoque", roles: ['admin', 'colaborador'], emoji: "📦", group: "OPERAÇÃO FABRIL" },
        { icon: Calendar, label: "Pedidos da Semana", path: "/admin/pedidos-semana", roles: ['admin', 'colaborador'], emoji: "🗓️", group: "OPERAÇÃO FABRIL" },
        { icon: DollarSign, label: "Financeiro & DRE", path: "/admin/financeiro", roles: ['admin'], emoji: "🏦", group: "CORPORATIVO & ERP", badgeCount: overdueCount + todayDueCount },
        { icon: CalendarDays, label: "Agenda Executiva", path: "/admin/agenda", roles: ['admin'], emoji: "📅", group: "CORPORATIVO & ERP" },
        { icon: Settings, label: "Configurações", path: "/admin/configuracoes", roles: ['admin', 'colaborador'], emoji: "⚙️", group: "CORPORATIVO & ERP" },
    ];


    const menuItems = allMenuItems.filter(item => {
        if (role === 'admin') return true;
        return item.roles.includes('colaborador');
    });

    const groupedMenuItems = menuItems.reduce<Record<string, typeof menuItems>>((acc, item) => {
        const grp = item.group || "GERAL";
        if (!acc[grp]) acc[grp] = [];
        acc[grp].push(item);
        return acc;
    }, {});

    const currentSectionName = allMenuItems.find(item => item.path === location.pathname)?.label || "Visão Geral";

    return (
        <div className="h-[100dvh] h-dvh bg-background flex flex-col lg:flex-row overflow-hidden w-full relative">
            <CommandMenu />
            <div className="aurora-bg" />

            <aside className={cn(
                "hidden lg:flex fixed lg:static top-6 bottom-6 left-6 z-50 executive-card border-metallic shadow-2xl flex-col transition-all duration-500 rounded-3xl m-4 lg:mr-0 lg:my-6 overflow-hidden",
                isSidebarCollapsed ? "w-20" : "w-72"
            )}>
                <div className={cn("h-24 flex items-center justify-between shrink-0 relative overflow-hidden group border-b border-white/[0.06]", isSidebarCollapsed ? "px-2" : "px-5")}>
                    <div className={cn("flex items-center gap-3.5 w-full relative z-10 transition-all duration-500", isSidebarCollapsed ? "flex-col gap-1 justify-center" : "flex-row justify-start")}>
                        <div className="relative shrink-0">
                            <div className="absolute inset-0 bg-primary/25 blur-xl rounded-full animate-pulse" />
                            <img src={settings?.logo_url || "/logo-bjl.png"} alt={settings?.name || "BJL Planejados"} className={cn("object-contain rounded-2xl border border-primary/30 shadow-[0_0_25px_rgba(var(--primary),0.2)] bg-black/60 relative z-10 transition-all duration-500", isSidebarCollapsed ? "h-10 w-10 p-0.5" : "h-12 w-12 p-1")} />
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="flex flex-col min-w-0 animate-in fade-in duration-300">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-display font-black tracking-tight shimmer-gold uppercase truncate">
                                        {settings?.name?.split(' ')[0] || "BJL"}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded-md bg-primary/15 border border-primary/30 text-[8px] font-mono font-bold text-primary uppercase tracking-wider">
                                        OS 2.6
                                    </span>
                                </div>
                                <span className="text-[9px] font-mono uppercase tracking-[0.22em] font-semibold text-muted-foreground truncate">
                                    {settings?.name?.split(' ').slice(1).join(' ') || "Planejados"} • Enterprise
                                </span>
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
                            "h-7 w-7 text-muted-foreground hover:text-primary rounded-xl absolute z-20 transition-all bg-white/5 hover:bg-white/10 border border-white/10",
                            isSidebarCollapsed ? "left-1/2 -translate-x-1/2 bottom-1.5 h-6 w-6" : "right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                        )}
                        title={isSidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
                    >
                        {isSidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                    </Button>
                </div>

                {/* Floating glass profile widget with gradient border spin */}
                <div className={cn(
                    "mx-3 my-3 p-3 rounded-2xl bg-white/[0.025] border border-white/[0.07] hover:border-primary/25 transition-all duration-500 flex items-center gap-3 relative group overflow-hidden shrink-0",
                    isSidebarCollapsed ? "justify-center p-2 mx-2" : ""
                )}>
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative shrink-0">
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-primary to-transparent opacity-50 blur-[2px] group-hover:opacity-100 group-hover:animate-[spin_4s_linear_infinite] transition-opacity" />
                        <div className="w-9 h-9 rounded-full border border-black/40 p-0.5 overflow-hidden shadow-xl relative z-10 bg-background/80">
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
                            <span className="text-xs font-display font-bold truncate tracking-tight text-foreground group-hover:text-primary transition-colors duration-300">
                                {role === 'admin' ? 'Luiz Felipe Canedo' : userEmail?.split('@')[0]}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                                <span className="text-[9px] font-mono uppercase font-bold text-primary/80 tracking-wider leading-none truncate">
                                    {role === 'admin' ? 'CEO • Executive Mode' : 'Operador Fabril'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <nav className={cn("flex-1 overflow-y-auto min-h-0 bg-transparent hide-scrollbar space-y-4", isSidebarCollapsed ? "p-2" : "px-3 py-2")}>
                    {Object.entries(groupedMenuItems).map(([groupName, groupItems]) => (
                        <div key={groupName} className="space-y-1">
                            {!isSidebarCollapsed && (
                                <div className="px-3 py-1 flex items-center justify-between">
                                    <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                                        {groupName}
                                    </span>
                                    <div className="h-px flex-1 bg-white/[0.05] ml-2" />
                                </div>
                            )}
                            {groupItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <Magnetic key={item.path} range={30} strength={0.12} className="w-full">
                                        <Link
                                            to={item.path}
                                            title={isSidebarCollapsed ? item.label : undefined}
                                            onMouseEnter={playHoverSound}
                                            onClick={playClickSound}
                                            className={cn(
                                                "flex items-center rounded-xl transition-all duration-300 menu-item-premium group relative overflow-hidden w-full",
                                                isSidebarCollapsed ? "justify-center p-2 h-12" : "gap-3 px-3 py-2.5",
                                                isActive
                                                    ? "text-white font-semibold z-10"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.02]"
                                            )}
                                        >
                                            {isActive && (
                                                <motion.div
                                                    layoutId="sidebar-active-indicator"
                                                    className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-l-2 border-primary rounded-xl z-0"
                                                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                                                />
                                            )}
                                            <div className={cn(
                                                "flex items-center justify-center rounded-xl transition-all duration-300 w-8 h-8 relative z-10 shrink-0",
                                                isActive 
                                                    ? "bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.4)]" 
                                                    : "bg-white/[0.04] border border-white/[0.06] group-hover:bg-primary/15 group-hover:text-primary group-hover:border-primary/30"
                                            )}>
                                                <item.icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                                            </div>
                                            {!isSidebarCollapsed && (
                                                <span className={cn(
                                                    "text-xs tracking-tight transition-all relative z-10 font-display flex-1 truncate",
                                                    isActive ? "font-bold text-white" : "font-medium group-hover:translate-x-0.5"
                                                )}>
                                                    {item.label}
                                                </span>
                                            )}
                                            {!isSidebarCollapsed && item.badgeCount && item.badgeCount > 0 ? (
                                                <span className="relative z-10 px-1.5 py-0.5 text-[9px] font-mono font-black rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                                                    {item.badgeCount}
                                                </span>
                                            ) : null}
                                        </Link>
                                    </Magnetic>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <div className={cn("border-t border-white/[0.06]", isSidebarCollapsed ? "p-2 flex justify-center" : "p-3")}>
                    <Magnetic range={30} strength={0.15} className="w-full">
                        <Button
                            variant="ghost"
                            title={isSidebarCollapsed ? "Encerrar Sessão" : undefined}
                            className={cn(
                                "rounded-xl text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-300 border border-transparent hover:border-rose-500/20 w-full",
                                isSidebarCollapsed ? "w-11 h-11 p-0 flex items-center justify-center" : "justify-start gap-3 px-3 py-5"
                            )}
                            onClick={() => {
                                playClickSound();
                                handleLogout();
                            }}
                            onMouseEnter={playHoverSound}
                        >
                            <LogOut className="h-4 w-4" />
                            {!isSidebarCollapsed && <span className="text-xs font-display font-bold uppercase tracking-wider">Encerrar Sessão</span>}
                        </Button>
                    </Magnetic>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-10">
                <header className="h-16 md:h-[72px] shrink-0 glass-panel-pro backdrop-blur-2xl flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 border-b border-white/[0.08] shadow-2xl">
                    <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
                        <div className="lg:hidden flex items-center gap-2.5">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground hover:text-primary transition-colors flex items-center justify-center shrink-0"
                                title="Abrir Menu Completo"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                            <img src={settings?.logo_url || "/logo-bjl.png"} alt={settings?.name || "BJL"} className="h-9 w-9 object-contain rounded-xl border border-primary/30" />
                            <div className="flex flex-col">
                                <h1 className="text-base font-display font-black shimmer-gold leading-none uppercase">{settings?.name?.split(' ')[0] || "BJL"}</h1>
                                <span className="text-[7px] font-mono uppercase tracking-[0.2em] font-bold text-primary/70">{settings?.name?.split(' ').slice(1).join(' ') || "Planejados"}</span>
                            </div>
                        </div>

                        <div className="hidden lg:flex items-center gap-3">
                            <div className="flex items-center gap-2 text-xs font-semibold">
                                <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-white/60 font-mono text-[10px]">
                                    BJL.OS
                                </span>
                                <span className="text-white/20">/</span>
                                <span className="text-white font-display font-bold tracking-tight text-sm">{currentSectionName}</span>
                            </div>

                            <div className="h-4 w-px bg-white/10 mx-1" />

                            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-semibold">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                                <span>SYNC ONLINE • 14ms</span>
                            </div>
                        </div>

                        {/* Raycast / Linear Style Global Command Input */}
                        <Magnetic range={20} strength={0.15}>
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
                                className="hidden md:flex items-center justify-between gap-6 px-3.5 py-2 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-primary/30 rounded-xl transition-all group min-w-[240px] lg:min-w-[300px]"
                            >
                                <div className="flex items-center gap-2.5">
                                    <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                                    <span className="text-xs text-muted-foreground group-hover:text-white/90 font-medium tracking-tight transition-colors">
                                        Buscar clientes, OS, comandos...
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded-md border border-white/10">
                                    <span className="text-[10px] font-mono font-bold text-primary">⌘K</span>
                                </div>
                            </button>
                        </Magnetic>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Global Quick Create Launcher (+ Criar) */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    onClick={playClickSound}
                                    className="h-9 px-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold text-xs gap-1.5 shadow-[0_0_20px_hsl(var(--primary)/0.25)] transition-all hover:scale-105"
                                >
                                    <Plus className="h-4 w-4 stroke-[2.5]" />
                                    <span className="hidden sm:inline">Ação Rápida</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-60 p-2 bg-[#0d0d12]/95 backdrop-blur-2xl border border-white/10 text-white rounded-2xl shadow-2xl z-50">
                                <DropdownMenuLabel className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest px-2.5 py-1.5">
                                    Acesso Instantâneo
                                </DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => navigate("/admin")} className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer hover:bg-primary/15 hover:text-primary text-xs font-semibold">
                                    <TrendingUp className="h-4 w-4 text-primary" />
                                    <span>Funil Comercial & Leads</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate("/admin/orcamento")} className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer hover:bg-amber-500/15 hover:text-amber-400 text-xs font-semibold">
                                    <Calculator className="h-4 w-4 text-amber-400" />
                                    <span>Novo Orçamento com IA</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate("/admin/ordem-servico")} className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer hover:bg-cyan-500/15 hover:text-cyan-400 text-xs font-semibold">
                                    <ClipboardList className="h-4 w-4 text-cyan-400" />
                                    <span>Nova Ordem de Serviço</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate("/admin/tarefas")} className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer hover:bg-emerald-500/15 hover:text-emerald-400 text-xs font-semibold">
                                    <CheckSquare className="h-4 w-4 text-emerald-400" />
                                    <span>Nova Tarefa na Fábrica</span>
                                </DropdownMenuItem>
                                {role === 'admin' && (
                                    <>
                                        <DropdownMenuSeparator className="bg-white/10 my-1" />
                                        <DropdownMenuItem onClick={() => navigate("/admin/financeiro")} className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer hover:bg-purple-500/15 hover:text-purple-400 text-xs font-semibold">
                                            <DollarSign className="h-4 w-4 text-purple-400" />
                                            <span>Lançamento Financeiro</span>
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="h-5 w-px bg-white/10 hidden sm:block" />
                        
                        <div className="flex items-center gap-1">
                             <PWAInstallButton variant="minimal" className="mr-0.5" />
                             <Magnetic range={25} strength={0.25}>
                                 <Button
                                     variant="ghost"
                                     size="icon"
                                     onClick={() => {
                                         playClickSound();
                                         setIsThemePanelOpen(true);
                                     }}
                                     onMouseEnter={playHoverSound}
                                     className="h-9 w-9 text-muted-foreground hover:text-primary rounded-xl transition-all relative group"
                                     title="Personalizar Tema"
                                 >
                                     <Palette className="h-4 w-4 group-hover:rotate-12 transition-transform duration-300" />
                                     <span className="absolute top-1.5 right-1.5 flex h-1.5 w-1.5">
                                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                         <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                                     </span>
                                 </Button>
                             </Magnetic>
                             <Magnetic range={25} strength={0.25}>
                                 <Button
                                     variant="ghost"
                                     size="icon"
                                     onClick={toggleSounds}
                                     onMouseEnter={playHoverSound}
                                     className="h-9 w-9 text-muted-foreground hover:text-primary rounded-xl transition-all"
                                     title={soundsEnabled ? "Desativar Sons" : "Ativar Sons"}
                                 >
                                     {soundsEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4" />}
                                 </Button>
                             </Magnetic>
                             <NotificationBell />
                             <Magnetic range={25} strength={0.25}>
                                 <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-muted-foreground hover:text-primary rounded-xl transition-all"
                                    onClick={() => {
                                        playClickSound();
                                        navigate("/admin/configuracoes");
                                    }}
                                    onMouseEnter={playHoverSound}
                                    title="Configurações"
                                >
                                    <Settings className="h-4 w-4" />
                                </Button>
                             </Magnetic>
                        </div>
                    </div>
                </header>

                <main className="flex-1 min-h-0 p-3 md:p-6 lg:p-8 pb-28 lg:pb-10 overflow-y-auto overflow-x-hidden relative max-w-full overscroll-y-contain webkit-overflow-scrolling-touch">
                    {/* Compact High-Tech Financial Telemetry HUD Bar */}
                    {role === 'admin' && (todayDueCount > 0 || overdueCount > 0) && (
                        <div className="mb-6 grid grid-cols-1 xl:grid-cols-2 gap-3 relative z-20 animate-in fade-in slide-in-from-top-3 duration-500">
                            {todayDueCount > 0 && (
                                <div className="px-4 py-3 rounded-2xl bg-amber-500/[0.07] border border-amber-500/25 backdrop-blur-xl flex items-center justify-between gap-3 shadow-[0_10px_30px_-10px_rgba(245,158,11,0.15)]">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
                                            <Clock className="h-4 w-4 animate-pulse" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono font-black text-amber-400 uppercase tracking-wider">
                                                    VENCIMENTO HOJE
                                                </span>
                                                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                                                    {todayDueCount} {todayDueCount === 1 ? 'conta' : 'contas'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-white/80 truncate mt-0.5">
                                                Total programado para hoje:{" "}
                                                <strong className="font-mono text-amber-400">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(todayDueSum)}
                                                </strong>
                                            </p>
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={() => navigate('/admin/financeiro?today=true')}
                                        size="sm"
                                        className="bg-amber-500 hover:bg-amber-400 text-black font-display font-bold uppercase text-[10px] tracking-wider px-4 h-8 rounded-xl shrink-0"
                                    >
                                        Ver Hoje
                                    </Button>
                                </div>
                            )}

                            {overdueCount > 0 && (
                                <div className="px-4 py-3 rounded-2xl bg-rose-500/[0.07] border border-rose-500/25 backdrop-blur-xl flex items-center justify-between gap-3 shadow-[0_10px_30px_-10px_rgba(244,63,94,0.15)]">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400 shrink-0">
                                            <AlertTriangle className="h-4 w-4 animate-pulse" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono font-black text-rose-400 uppercase tracking-wider">
                                                    PENDÊNCIAS VENCIDAS
                                                </span>
                                                <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold">
                                                    {overdueCount} em atraso
                                                </span>
                                            </div>
                                            <p className="text-xs text-white/80 truncate mt-0.5">
                                                Volume pendente acumulado:{" "}
                                                <strong className="font-mono text-rose-400">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(overdueSum)}
                                                </strong>
                                            </p>
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={() => navigate('/admin/financeiro?overdue=true')}
                                        size="sm"
                                        className="bg-rose-600 hover:bg-rose-500 text-white font-display font-bold uppercase text-[10px] tracking-wider px-4 h-8 rounded-xl shrink-0"
                                    >
                                        Regularizar
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="relative z-10 w-full min-h-full">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Mobile Bottom Navigation - 5 botões táteis e espaçados */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-white/10 grid grid-cols-5 h-[72px] px-1 shadow-2xl safe-area-bottom backdrop-blur-xl bg-background/90">
                <Link
                    to="/admin"
                    onClick={playClickSound}
                    className={cn(
                        "flex flex-col items-center justify-center h-full space-y-1 transition-all",
                        location.pathname === "/admin"
                            ? "text-primary font-bold"
                            : "text-muted-foreground hover:text-foreground active:scale-95"
                    )}
                >
                    <TrendingUp className={cn("h-5 w-5", location.pathname === "/admin" ? "scale-110 drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" : "")} />
                    <span className="text-[10px] text-center font-bold tracking-tight truncate w-full">CRM</span>
                </Link>

                <Link
                    to="/admin/orcamento"
                    onClick={playClickSound}
                    className={cn(
                        "flex flex-col items-center justify-center h-full space-y-1 transition-all",
                        location.pathname === "/admin/orcamento"
                            ? "text-primary font-bold"
                            : "text-muted-foreground hover:text-foreground active:scale-95"
                    )}
                >
                    <Calculator className={cn("h-5 w-5", location.pathname === "/admin/orcamento" ? "scale-110 drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" : "")} />
                    <span className="text-[10px] text-center font-bold tracking-tight truncate w-full">Orçamento</span>
                </Link>

                <Link
                    to="/admin/tarefas"
                    onClick={playClickSound}
                    className={cn(
                        "flex flex-col items-center justify-center h-full space-y-1 transition-all",
                        location.pathname === "/admin/tarefas"
                            ? "text-primary font-bold"
                            : "text-muted-foreground hover:text-foreground active:scale-95"
                    )}
                >
                    <CheckSquare className={cn("h-5 w-5", location.pathname === "/admin/tarefas" ? "scale-110 drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" : "")} />
                    <span className="text-[10px] text-center font-bold tracking-tight truncate w-full">Tarefas</span>
                </Link>

                <Link
                    to="/admin/financeiro"
                    onClick={playClickSound}
                    className={cn(
                        "flex flex-col items-center justify-center h-full space-y-1 transition-all",
                        location.pathname === "/admin/financeiro"
                            ? "text-primary font-bold"
                            : "text-muted-foreground hover:text-foreground active:scale-95"
                    )}
                >
                    <DollarSign className={cn("h-5 w-5", location.pathname === "/admin/financeiro" ? "scale-110 drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" : "")} />
                    <span className="text-[10px] text-center font-bold tracking-tight truncate w-full">Financeiro</span>
                </Link>

                <button
                    type="button"
                    onClick={() => {
                        playClickSound();
                        setIsSidebarOpen(true);
                    }}
                    className={cn(
                        "flex flex-col items-center justify-center h-full space-y-1 transition-all text-muted-foreground hover:text-primary active:scale-95",
                        isSidebarOpen ? "text-primary font-bold" : ""
                    )}
                >
                    <Menu className="h-5 w-5" />
                    <span className="text-[10px] text-center font-bold tracking-tight truncate w-full">Mais</span>
                </button>
            </nav>

            {/* Gaveta de Navegação Mobile Completa (Drawer) */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSidebarOpen(false)}
                            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 cursor-pointer lg:hidden"
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 26, stiffness: 220 }}
                            className="fixed left-0 top-0 bottom-0 w-[85vw] max-w-[340px] bg-background/95 backdrop-blur-2xl border-r border-white/10 z-50 p-5 shadow-2xl flex flex-col justify-between lg:hidden"
                        >
                            <div className="flex flex-col min-h-0 flex-1">
                                {/* Header da Gaveta */}
                                <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <img src={settings?.logo_url || "/logo-bjl.png"} alt={settings?.name || "BJL"} className="h-10 w-10 object-contain rounded-full border border-primary/40 bg-black/40 p-0.5" />
                                        <div className="flex flex-col">
                                            <span className="text-base font-display font-black uppercase tracking-tight">{settings?.name?.split(' ')[0] || "BJL"}</span>
                                            <span className="text-[8px] font-mono uppercase tracking-[0.25em] font-black text-primary/70">{settings?.name?.split(' ').slice(1).join(' ') || "Planejados"}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsSidebarOpen(false)}
                                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* Perfil no topo do menu */}
                                <div className="my-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                                            <UserCircle className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-bold text-luxury truncate">
                                                {role === 'admin' ? 'Luiz Felipe Canedo' : userEmail?.split('@')[0]}
                                            </span>
                                            <span className="text-[9px] uppercase font-black text-primary/60 tracking-wider">
                                                {role === 'admin' ? 'Administrador' : 'Colaborador'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Lista dos 10 Módulos com Rolagem Suave */}
                                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 py-1 hide-scrollbar">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-2 py-1">Todos os Módulos</p>
                                    {menuItems.map((item) => {
                                        const isActive = location.pathname === item.path;
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                onClick={() => {
                                                    playClickSound();
                                                    setIsSidebarOpen(false);
                                                }}
                                                className={cn(
                                                    "flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all duration-300 relative font-medium group text-sm",
                                                    isActive 
                                                        ? "bg-primary/20 text-white border border-primary/40 font-bold shadow-[0_0_20px_rgba(var(--primary),0.15)]" 
                                                        : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
                                                )}
                                            >
                                                <div className={cn(
                                                    "p-2 rounded-xl transition-all shrink-0",
                                                    isActive ? "bg-primary text-primary-foreground shadow-md" : "bg-white/5 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
                                                )}>
                                                    <item.icon className="h-4 w-4" />
                                                </div>
                                                <span className="font-bold tracking-tight text-luxury flex-1">{item.label}</span>
                                                {item.emoji && <span className="text-xs">{item.emoji}</span>}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Ações Rápidas no Rodapé da Gaveta */}
                            <div className="pt-3 border-t border-white/10 space-y-2 shrink-0">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            playClickSound();
                                            setIsSidebarOpen(false);
                                            setIsThemePanelOpen(true);
                                        }}
                                        className="h-10 text-[10px] font-black uppercase tracking-wider rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1.5"
                                    >
                                        <Palette className="h-3.5 w-3.5 text-primary" /> Temas
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={toggleSounds}
                                        className="h-10 text-[10px] font-black uppercase tracking-wider rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1.5"
                                    >
                                        {soundsEnabled ? <Volume2 className="h-3.5 w-3.5 text-primary" /> : <VolumeX className="h-3.5 w-3.5" />}
                                        {soundsEnabled ? "Som On" : "Som Off"}
                                    </Button>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        playClickSound();
                                        setIsSidebarOpen(false);
                                        handleLogout();
                                    }}
                                    className="w-full h-10 text-[10px] font-black uppercase tracking-wider rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-2"
                                >
                                    <LogOut className="h-3.5 w-3.5" /> Sair da Conta
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

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

            {/* High-Tech Floating Quick Actions Dock */}
            <div className="fixed bottom-6 right-6 z-40 hidden sm:flex items-center gap-2 p-1.5 glass-panel-pro rounded-2xl shadow-2xl border border-white/10">
                <Link
                    to="/admin/orcamento"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold transition-all hover:scale-105"
                >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Orçamento</span>
                </Link>
                <Link
                    to="/admin/tarefas"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-foreground border border-white/5 text-xs font-semibold transition-all hover:scale-105"
                >
                    <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Tarefa</span>
                </Link>
                <button
                    onClick={() => {
                        const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, metaKey: true, bubbles: true });
                        document.dispatchEvent(e);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground text-xs font-medium transition-all"
                    title="Buscar (Ctrl+K)"
                >
                    <Search className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-mono opacity-70">⌘K</span>
                </button>
            </div>
        </div>
    );
};

export default MainLayout;
