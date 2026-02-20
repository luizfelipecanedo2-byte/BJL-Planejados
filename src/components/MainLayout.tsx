
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
    UserCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const MainLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [role, setRole] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || null);
                // Fetch role from profiles table
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (data) {
                    setRole(data.role);
                } else {
                    // Default to admin if profiles table isn't ready or user not found
                    setRole('admin');
                }
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
        { icon: TrendingUp, label: "Vendas", path: "/", roles: ['admin'] },
        { icon: Users, label: "Cliente e Fornecedores", path: "/clientes", roles: ['admin'] },
        { icon: DollarSign, label: "Financeiro", path: "/financeiro", roles: ['admin'] },
        { icon: ClipboardList, label: "Ordem de Serviço", path: "/ordem-servico", roles: ['admin', 'employee'] },
        { icon: Package, label: "Estoque", path: "/estoque", roles: ['admin', 'employee'] },
        { icon: Calendar, label: "Pedidos da Semana", path: "/pedidos-semana", roles: ['admin', 'employee'] },
    ];

    const menuItems = allMenuItems.filter(item => !role || item.roles.includes(role));

    return (
        <div className="min-h-screen bg-background flex">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:transform-none flex flex-col",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="h-56 flex items-center px-6 border-b border-border/10 justify-between shrink-0">
                    <div className="flex items-center gap-3 w-full justify-center">
                        <img src="/logo-bjl.png" alt="BJL Planejados" className="h-48 w-auto object-contain" onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                        }} />
                        <span className="hidden text-xl font-bold tracking-tight text-primary">BJL Planejados</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden absolute right-4"
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="p-4 border-b border-border/10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCircle className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold truncate">{userEmail?.split('@')[0]}</span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{role === 'admin' ? 'Administrador' : 'Funcionário'}</span>
                    </div>
                </div>

                <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsSidebarOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                                location.pathname === item.path
                                    ? "bg-primary/20 text-primary border-r-2 border-primary"
                                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-border/10 shrink-0">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 gap-3"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-5 w-5" />
                        <span>Sair do Sistema</span>
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header */}
                <header className="h-16 border-b bg-card/80 backdrop-blur-md flex items-center px-4 lg:hidden sticky top-0 z-30">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu className="h-6 w-6" />
                    </Button>
                    <img src="/logo-bjl.png" alt="BJL Planejados" className="h-10 ml-4 w-auto object-contain" onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                    }} />
                    <h1 className="ml-4 text-lg font-bold text-primary italic">BJL</h1>
                </header>

                <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto bg-slate-50/30">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
