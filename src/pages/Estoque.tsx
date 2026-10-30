import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Truck, AlertTriangle, Package, Layers, Search, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Product } from "@/types/product";
import ProductTable from "@/components/crm/ProductTable";
import ProductFormDialog from "@/components/crm/ProductFormDialog";
import { supabase } from "@/lib/supabase";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { MagicButton } from "@/components/ui/magic-button";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MdfOffcutsManager } from "@/components/estoque/MdfOffcutsManager";
import { useUserRole } from "@/hooks/useUserRole";

const Estoque = () => {
    const { isAdmin } = useUserRole();
    const [activeTab, setActiveTab] = useState<string>("insumos");
    const [products, setProducts] = useState<Product[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [showOnlyLowStock, setShowOnlyLowStock] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('inventory')
                .select('*');

            if (error) throw error;

            const mappedProducts: Product[] = (data || []).map(p => ({
                id: p.id,
                idEstoque: p.id_estoque,
                name: p.name,
                unitPrice: Number(p.unit_price),
                quantity: Number(p.quantity),
                minStockLevel: Number(p.min_stock_level)
            }));

            // Sort by idEstoque (numeric sort)
            mappedProducts.sort((a, b) => {
                const idA = parseInt(a.idEstoque || "999");
                const idB = parseInt(b.idEstoque || "999");
                return idA - idB;
            });

            setProducts(mappedProducts);
        } catch (error) {
            console.error('Error fetching products:', error);
            toast.error("Erro ao carregar estoque.");
        }
    };

    const handleNewProduct = () => {
        setEditingProduct(null);
        setIsDialogOpen(true);
    };

    const handleEditProduct = (product: Product) => {
        setEditingProduct(product);
        setIsDialogOpen(true);
    };

    const handleDeleteProduct = async (id: string) => {
        if (!window.confirm("Tem certeza que deseja remover este produto do estoque?")) return;
        try {
            const { error } = await supabase
                .from('inventory')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setProducts(products.filter(p => p.id !== id));
            toast.success("Produto removido do estoque!");
        } catch (error) {
            console.error('Error deleting product:', error);
            toast.error("Erro ao remover produto.");
        }
    };

    const handleSubmit = async (productData: Omit<Product, "id">) => {
        try {
            const newProduct = {
                id_estoque: productData.idEstoque,
                name: productData.name,
                unit_price: productData.unitPrice,
                quantity: productData.quantity,
                min_stock_level: productData.minStockLevel
            };

            const { data, error } = await supabase
                .from('inventory')
                .insert([newProduct])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                const createdProduct: Product = {
                    id: data.id,
                    idEstoque: data.id_estoque,
                    name: data.name,
                    unitPrice: Number(data.unit_price),
                    quantity: Number(data.quantity),
                    minStockLevel: Number(data.min_stock_level)
                };
                setProducts([createdProduct, ...products].sort((a, b) => a.name.localeCompare(b.name)));
            }
            toast.success("Produto adicionado!");
        } catch (error) {
            console.error('Error adding product:', error);
            toast.error("Erro ao adicionar produto.");
        }
    };

    const handleUpdate = async (id: string, updates: Partial<Product>) => {
        try {
            const updateData: any = {};
            if (updates.idEstoque !== undefined) updateData.id_estoque = updates.idEstoque;
            if (updates.name) updateData.name = updates.name;
            if (updates.unitPrice !== undefined) updateData.unit_price = updates.unitPrice;
            if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
            if (updates.minStockLevel !== undefined) updateData.min_stock_level = updates.minStockLevel;

            const { error } = await supabase
                .from('inventory')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            setProducts(products.map(p =>
                p.id === id ? { ...p, ...updates } : p
            ));
            toast.success("Produto atualizado!");
        } catch (error) {
            console.error('Error updating product:', error);
            toast.error("Erro ao atualizar produto.");
        }
    };

    const handleOrderProduct = async (product: Product) => {
        try {
            // Pergunta a quantidade desejada
            const quantityStr = window.prompt(`Quantas unidades de "${product.name}" deseja pedir?`, "1");
            if (quantityStr === null) return; // Cancelou
            
            const quantity = parseInt(quantityStr);
            if (isNaN(quantity) || quantity <= 0) {
                toast.error("Quantidade inválida.");
                return;
            }

            const newOrder = {
                product: product.name,
                quantity: quantity,
                unit_price: product.unitPrice,
                total_value: product.unitPrice * quantity,
                client: 'REPOSIÇÃO MANUAL',
                supplier: 'A DEFINIR',
                order_date: new Date().toISOString().split('T')[0],
                status: 'pendente'
            };

            const { error } = await supabase
                .from('weekly_orders')
                .insert([newOrder]);

            if (error) throw error;

            toast.success(`Pedido de ${quantity}x "${product.name}" enviado para a lista da semana!`);
        } catch (error) {
            console.error('Error ordering product:', error);
            toast.error("Erro ao registrar pedido.");
        }
    };

    const filteredProducts = products.filter(p => {
        const matchesLowStock = showOnlyLowStock ? p.quantity < p.minStockLevel : true;
        if (!matchesLowStock) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            p.name.toLowerCase().includes(q) ||
            (p.idEstoque || "").toLowerCase().includes(q)
        );
    });

    const totalInventoryValue = products.reduce((acc, p) => acc + (p.quantity * p.unitPrice), 0);
    const lowStockCount = products.filter(p => p.quantity < p.minStockLevel).length;
    const totalItems = products.length;
    const stockHealthPercent = totalItems > 0 ? Math.round(((totalItems - lowStockCount) / totalItems) * 100) : 100;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    return (
        <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                       <div className="flex items-center gap-2">
                           <span className="tech-hud-pill text-primary border-primary/25 bg-primary/10">
                               <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                               STOCK.ENGINE // v2.6
                           </span>
                           <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/70">
                               Almoxarifado & Insumos
                           </span>
                       </div>
                       <h2 className="text-3xl md:text-4xl font-display font-extrabold tracking-tight text-foreground">
                           Controle de <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-amber-400 to-amber-600 text-glow">Estoque</span>
                       </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <TabsList className="bg-white/[0.03] border border-white/10 p-1 rounded-2xl h-11 backdrop-blur-xl">
                            <TabsTrigger 
                                value="insumos" 
                                className="rounded-xl px-4 font-bold text-xs gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                            >
                                <Package className="h-4 w-4" />
                                Insumos & Ferragens
                            </TabsTrigger>
                            <TabsTrigger 
                                value="retalhos" 
                                className="rounded-xl px-4 font-bold text-xs gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-black transition-all"
                            >
                                <Layers className="h-4 w-4" />
                                Sobras & Retalhos MDF
                            </TabsTrigger>
                        </TabsList>

                        {activeTab === "insumos" && (
                            <MagicButton onClick={handleNewProduct} className="gap-1.5 h-11 px-6 shadow-xl shadow-primary/20">
                                <Plus className="h-4 w-4" />
                                Novo Insumo
                            </MagicButton>
                        )}
                    </div>
                </div>

                {/* ABA 1: INSUMOS & FERRAGENS */}
                <TabsContent value="insumos" className="space-y-6 mt-0">
                    {/* STOCK HUD BENTO */}
                    <div className={cn("grid gap-4", isAdmin ? "grid-cols-1 md:grid-cols-4" : "grid-cols-1 md:grid-cols-3")}>
                        {isAdmin && (
                            <div className="executive-card border-metallic p-5 rounded-2xl relative overflow-hidden group">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Patrimônio Imobilizado</span>
                                    <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                                        <Truck className="h-4 w-4" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-display font-black text-primary tracking-tight font-tech tabular-nums">
                                    <AnimatedCounter value={totalInventoryValue} formatter={formatCurrency} />
                                </h3>
                                <p className="text-[10px] text-muted-foreground/70 mt-1">Valor total dos insumos estocados</p>
                            </div>
                        )}

                        <div className="executive-card border-metallic p-5 rounded-2xl relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Alertas de Reposição</span>
                                <div className={cn("p-2 rounded-xl border", lowStockCount > 0 ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20")}>
                                    <AlertTriangle className="h-4 w-4" />
                                </div>
                            </div>
                            <h3 className={cn("text-2xl font-display font-black tracking-tight font-tech tabular-nums", lowStockCount > 0 ? "text-rose-400" : "text-emerald-400")}>
                                <AnimatedCounter value={lowStockCount} />
                                <span className="text-xs font-bold uppercase ml-2 text-muted-foreground">SKUs críticos</span>
                            </h3>
                            <p className="text-[10px] text-muted-foreground/70 mt-1">Abaixo do estoque mínimo</p>
                        </div>

                        <div className="executive-card border-metallic p-5 rounded-2xl relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Catálogo Ativo</span>
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    <Package className="h-4 w-4" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-display font-black text-foreground tracking-tight font-tech tabular-nums">
                                <AnimatedCounter value={totalItems} />
                                <span className="text-xs font-bold uppercase ml-2 text-muted-foreground">Produtos</span>
                            </h3>
                            <p className="text-[10px] text-muted-foreground/70 mt-1">Ferragens, chapas e acessórios</p>
                        </div>

                        <div className="executive-card border-metallic p-5 rounded-2xl relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Saúde Operacional</span>
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <ShieldCheck className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-2xl font-display font-black text-emerald-400 tracking-tight font-tech tabular-nums">
                                    {stockHealthPercent}%
                                </h3>
                                <span className="text-[10px] font-bold uppercase text-muted-foreground">Abastecido</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/[0.05] rounded-full overflow-hidden mt-2">
                                <div
                                    className={cn("h-full rounded-full transition-all duration-700", stockHealthPercent >= 80 ? "bg-emerald-500" : stockHealthPercent >= 50 ? "bg-amber-500" : "bg-rose-500")}
                                    style={{ width: `${stockHealthPercent}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="executive-card border-metallic rounded-3xl overflow-hidden">
                        <div className="p-5 border-b border-white/[0.06] bg-white/[0.01] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-base font-display font-bold tracking-tight uppercase text-foreground">Itens em Catálogo</h3>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    Exibindo <span className="font-tech text-primary">{filteredProducts.length}</span> de <span className="font-tech">{totalItems}</span> insumos
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Buscar por nome ou #código..."
                                        className="pl-9 h-9 rounded-xl bg-white/[0.03] border-white/10 text-xs focus-visible:ring-primary/30"
                                    />
                                </div>
                                <Button
                                    variant={showOnlyLowStock ? "destructive" : "outline"}
                                    size="sm"
                                    onClick={() => setShowOnlyLowStock(!showOnlyLowStock)}
                                    className={cn(
                                        "text-[10px] font-black uppercase tracking-widest h-9 rounded-xl px-3.5 transition-all",
                                        !showOnlyLowStock && "border-white/10 bg-white/[0.02] hover:bg-white/[0.06]"
                                    )}
                                >
                                    <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                                    {showOnlyLowStock ? `Reposição (${lowStockCount})` : "Filtrar Críticos"}
                                </Button>
                            </div>
                        </div>
                        <div className="p-5">
                            <ProductTable
                                products={filteredProducts}
                                onEdit={handleEditProduct}
                                onDelete={handleDeleteProduct}
                                onOrder={handleOrderProduct}
                                isAdmin={isAdmin}
                            />
                        </div>
                    </div>

                    <ProductFormDialog
                        open={isDialogOpen}
                        onOpenChange={setIsDialogOpen}
                        onSubmit={handleSubmit}
                        onUpdate={handleUpdate}
                        editingProduct={editingProduct}
                        isAdmin={isAdmin}
                    />

                    {/* Floating Action Button for Mobile */}
                    <Button
                        onClick={handleNewProduct}
                        className="lg:hidden fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-2xl z-40 gap-0 p-0 flex items-center justify-center animate-in fade-in zoom-in duration-300"
                        size="icon"
                    >
                        <Plus className="h-7 w-7" />
                    </Button>
                </TabsContent>

                {/* ABA 2: SOBRAS & RETALHOS DE MDF */}
                <TabsContent value="retalhos" className="mt-0">
                    <MdfOffcutsManager />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Estoque;

