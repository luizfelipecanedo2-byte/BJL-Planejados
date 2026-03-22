import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Truck, AlertTriangle, Package } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/types/product";
import ProductTable from "@/components/crm/ProductTable";
import ProductFormDialog from "@/components/crm/ProductFormDialog";
import { supabase } from "@/lib/supabase";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { MagicButton } from "@/components/ui/magic-button";
import { cn } from "@/lib/utils";

const Estoque = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [showOnlyLowStock, setShowOnlyLowStock] = useState(false);

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

    const filteredProducts = showOnlyLowStock
        ? products.filter(p => p.quantity < p.minStockLevel)
        : products;

    const totalInventoryValue = products.reduce((acc, p) => acc + (p.quantity * p.unitPrice), 0);
    const lowStockCount = products.filter(p => p.quantity < p.minStockLevel).length;
    const totalItems = products.length;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                   <h2 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-amber-500 to-amber-700 text-glow">Controle de Estoque</h2>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Gestão de Patrimônio e Insumos High-End</p>
                </div>
                <MagicButton onClick={handleNewProduct} className="gap-1.5 h-11 px-6 shadow-xl shadow-primary/20">
                    <Plus className="h-4 w-4" />
                    Novo Produto
                </MagicButton>
            </div>

            {/* STOCK HUD */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card tilt-card border-beam-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-primary">
                            <Truck className="h-32 w-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Valor Total em Estoque</p>
                            <h3 className="text-3xl font-black text-primary tracking-tighter">
                                <AnimatedCounter value={totalInventoryValue} formatter={formatCurrency} />
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card tilt-card border-beam-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-rose-500">
                            <AlertTriangle className="h-32 w-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Alertas de Reposição</p>
                            <h3 className={cn("text-3xl font-black tracking-tighter", lowStockCount > 0 ? "text-rose-500" : "text-emerald-500")}>
                                <AnimatedCounter value={lowStockCount} /> 
                                <span className="text-sm font-bold uppercase ml-2 text-muted-foreground">Itens Baixos</span>
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card tilt-card border-beam-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-blue-500">
                            <Package className="h-32 w-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total de Itens Cadastrados</p>
                            <h3 className="text-3xl font-black text-white tracking-tighter">
                                <AnimatedCounter value={totalItems} />
                                <span className="text-sm font-bold uppercase ml-2 text-muted-foreground text-glow text-primary/50">Produtos</span>
                            </h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl rounded-3xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-muted/20">
                    <div>
                        <CardTitle className="text-xl font-black tracking-tighter uppercase">Itens em Catálogo</CardTitle>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Base de Dados de Insumos</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={showOnlyLowStock ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => setShowOnlyLowStock(!showOnlyLowStock)}
                            className="text-[10px] font-black uppercase tracking-widest h-8 rounded-full"
                        >
                            {showOnlyLowStock ? "Filtro Ativo: Reposição" : "Filtrar Reposição"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <ProductTable
                        products={filteredProducts}
                        onEdit={handleEditProduct}
                        onDelete={handleDeleteProduct}
                    />
                </CardContent>
            </Card>

            <ProductFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSubmit={handleSubmit}
                onUpdate={handleUpdate}
                editingProduct={editingProduct}
            />

            {/* Floating Action Button for Mobile */}
            <Button
                onClick={handleNewProduct}
                className="lg:hidden fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-2xl z-40 gap-0 p-0 flex items-center justify-center animate-in fade-in zoom-in duration-300"
                size="icon"
            >
                <Plus className="h-7 w-7" />
            </Button>
        </div>
    );
};

export default Estoque;

