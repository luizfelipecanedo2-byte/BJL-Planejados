
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
    Hammer
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const MainLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [role, setRole] = useState<string | null>('colaborador'); // Default para colaborador para garantir que o menu não suma
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUserEmail(user.email || null);

                    // Verificação manual imediata pelo e-mail (mais rápido que o banco)
                    if (user.email === 'luizfelipe.canedo2@gmail.com') {
                        setRole('admin');
                        return; // Se é o admin, já para aqui
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
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/login");
        toast.success("Logoff realizado com sucesso");
    };

    const allMenuItems = [
        { icon: TrendingUp, label: "CRM", path: "/", roles: ['admin'], emoji: "📊" },
        { icon: Calculator, label: "Orçamento", path: "/orcamento", roles: ['admin'], emoji: "💰" },
        { icon: Users, label: "Cliente e Fornecedores", path: "/clientes", roles: ['admin'], emoji: "👥" },
        { icon: DollarSign, label: "Financeiro", path: "/financeiro", roles: ['admin'], emoji: "🏦" },
        { icon: ClipboardList, label: "Ordem de Serviço", path: "/ordem-servico", roles: ['admin'], emoji: "📋" },
        { icon: Package, label: "Estoque", path: "/estoque", roles: ['admin', 'colaborador'], emoji: "📦" },
        { icon: Calendar, label: "Pedidos da Semana", path: "/pedidos-semana", roles: ['admin', 'colaborador'], emoji: "🗓️" },
        { icon: Hammer, label: "Fábrica", path: "/producao-fabrica", roles: ['admin', 'colaborador'], emoji: "🔨" },
    ];

    // Lógica simplificada e robusta para o menu
    const menuItems = allMenuItems.filter(item => {
        if (role === 'admin') return true; // Admin vê TUDO
        return item.roles.includes('colaborador'); // Colaborador vê apenas o que ele tem permissão
    });

    return (
        <div className="min-h-[100dvh] bg-background/50 flex pb-[72px] lg:pb-0">
            {/* Ambient Aurora Glow */}
            <div className="aurora-bg" />

            <aside className="hidden lg:flex fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card/70 backdrop-blur-2xl border-r border-white/10 shadow-lg flex-col">
                <div className="h-32 flex items-center px-6 border-b border-border/10 justify-between shrink-0 bg-primary/5 relative overflow-hidden">
                    <div className="flex items-center gap-3 w-full justify-center relative z-10">
                        <img src="/logo-bjl.png" alt="BJL Planejados" className="h-24 w-24 object-contain rounded-full border-2 border-primary/30 shadow-[0_0_20px_rgba(251,191,36,0.2)] animate-pinball p-1 bg-black/20" onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const next = target.nextElementSibling as HTMLElement;
                            if (next) {
                                next.classList.remove('hidden');
                            }
                        }} />
                        <span className="hidden text-xl font-bold tracking-tight text-primary">BJL</span>
                    </div>
                </div>

                <div className="p-4 border-b border-border/10 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 border-primary/30 p-0.5 overflow-hidden shadow-lg shadow-primary/10">
                        {role === 'admin' ? (
                            <img src="/luiz-felipe.png" className="w-full h-full object-cover rounded-full" alt="Luiz Felipe Canedo" />
                        ) : (
                            <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
                                <UserCircle className="w-6 h-6 text-primary" />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold truncate tracking-tight text-foreground">
                            {role === 'admin' ? 'Luiz Felipe Canedo' : userEmail?.split('@')[0]}
                        </span>
                        <span className="text-[10px] uppercase font-black text-primary/80 tracking-widest">{role === 'admin' ? 'Administrador' : 'Colaborador'}</span>
                    </div>
                </div>

                <nav className="p-4 space-y-3 flex-1 overflow-y-auto min-h-0 bg-transparent">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 menu-item-premium group",
                                location.pathname === item.path
                                    ? "active text-primary font-black scale-[1.02]"
                                    : "text-muted-foreground hover:text-primary hover:translate-x-1"
                            )}
                        >
                            <div className={cn(
                                "flex items-center justify-center p-2 rounded-lg transition-all duration-300 w-10 h-10",
                                location.pathname === item.path 
                                    ? "bg-primary/20 scale-110 shadow-[0_0_15px_rgba(251,191,36,0.3)]" 
                                    : "bg-transparent group-hover:bg-primary/10"
                            )}>
                                <span className="emoji-3d text-xl">{item.emoji}</span>
                            </div>
                            <span className={cn(
                                "text-sm tracking-wide transition-all",
                                location.pathname === item.path ? "font-black" : "font-medium"
                            )}>{item.label}</span>
                        </Link>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 h-[100dvh] lg:h-screen">
                {/* Header */}
                <header className="h-16 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-30 border-white/10 shadow-xl">
                    <div className="flex items-center">
                        <div className="lg:hidden flex items-center">
                            <img src="/logo-bjl.png" alt="BJL" className="h-10 w-10 object-contain rounded-full border border-primary/30 animate-pinball p-0.5 bg-black/20" onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                            }} />
                            <h1 className="ml-3 text-lg font-bold text-primary italic">BJL</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-sm font-bold truncate max-w-[170px]">
                                {role === 'admin' ? 'Luiz Felipe Canedo' : userEmail?.split('@')[0]}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-primary/70 tracking-widest">
                                {role === 'admin' ? 'Administrador' : 'Colaborador'}
                            </span>
                        </div>
                        {role === 'admin' && (
                            <img src="/luiz-felipe.png" alt="Luiz Felipe" className="h-9 w-9 rounded-full border border-primary/20 object-cover" />
                        )}
                    </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 border border-destructive/20"
                            onClick={handleLogout}
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="hidden sm:inline">Sair do Sistema</span>
                        </Button>
                    </div>
                </header>

                <main className="flex-1 p-3 md:p-6 lg:p-8 overflow-y-auto overflow-x-hidden bg-black/40 relative">
                    {/* Premium Luxury Serif Watermark */}
                    <div className="absolute inset-x-0 top-0 flex justify-center pointer-events-none z-0 mt-16 overflow-hidden select-none animate-float">
                        <div className="absolute -left-20 top-20 opacity-5 animate-pulse delay-700">
                             <Armchair size={120} />
                        </div>
                        <div className="absolute -right-20 top-40 opacity-5 animate-bounce delay-1000 duration-[10s]">
                             <Sofa size={150} />
                        </div>
                        <div className="absolute left-1/4 -top-10 opacity-5 rotate-12">
                             <Ruler size={80} />
                        </div>
                        <div className="text-border-beam px-10 py-4 relative group">
                            {/* Stardust particles around logo */}
                            <div className="stardust left-0 top-0" />
                            <div className="stardust right-10 top-5 delay-300" />
                            <div className="stardust left-20 bottom-0 delay-700" />
                            <div className="stardust right-0 bottom-10 delay-1000" />
                            
                            <h1 className="text-2xl md:text-8xl lg:text-9xl font-normal text-primary/40 font-['Lobster',cursive] drop-shadow-[8px_8px_0px_rgba(0,0,0,0.5)] rotate-[-3deg] shimmer-gold whitespace-nowrap">
                                BJL Planejados
                            </h1>
                        </div>
                    </div>
                    <div className="relative z-10 w-full h-full">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border/20 flex flex-row items-center justify-between h-[72px] px-2 shadow-lg overflow-x-auto hide-scrollbar sm:justify-around safe-area-bottom">
                {menuItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                            "flex flex-col items-center justify-center min-w-[72px] flex-shrink-0 h-full space-y-1 transition-all rounded-xl",
                            location.pathname === item.path
                                ? "text-primary font-bold bg-primary/10"
                                : "text-muted-foreground hover:text-foreground active:scale-95"
                        )}
                    >
                        <item.icon className={cn("h-[22px] w-[22px]", location.pathname === item.path ? "scale-110 drop-shadow-sm" : "")} />
                        <span className="text-[10px] text-center leading-tight truncate px-1 w-full">{item.label}</span>
                    </Link>
                ))}
            </nav>
        </div>
    );
};

export default MainLayout;
