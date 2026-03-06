import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/types/product";
import ProductTable from "@/components/crm/ProductTable";
import ProductFormDialog from "@/components/crm/ProductFormDialog";
import { supabase } from "@/lib/supabase";

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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Estoque</h2>
                <Button onClick={handleNewProduct} size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    Novo Produto
                </Button>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle>Controle de Estoque</CardTitle>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={showOnlyLowStock ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => setShowOnlyLowStock(!showOnlyLowStock)}
                            className="text-xs"
                        >
                            {showOnlyLowStock ? "Mostrando: Precisa Pedir" : "Filtrar: Precisa Pedir"}
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

