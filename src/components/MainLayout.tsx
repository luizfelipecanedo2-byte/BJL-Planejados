
import {
    DollarSign,
    TrendingUp,
    ClipboardList,
    Package,
    Calendar,
    Menu,
    X,
    Users
} from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const MainLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    const menuItems = [
        { icon: TrendingUp, label: "Vendas", path: "/" },
        { icon: Users, label: "Cliente e Fornecedores", path: "/clientes" },
        { icon: DollarSign, label: "Financeiro", path: "/financeiro" },
        { icon: ClipboardList, label: "Ordem de Serviço", path: "/ordem-servico" },
        { icon: Package, label: "Estoque", path: "/estoque" },
        { icon: Calendar, label: "Pedidos da Semana", path: "/pedidos-semana" },
    ];

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
                    "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:transform-none",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="h-56 flex items-center px-6 border-b border-border/10 justify-between">
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

                <nav className="p-4 space-y-2">
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
                    <h1 className="ml-4 text-lg font-bold text-primary">BJL Planejados</h1>
                </header>

                <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
