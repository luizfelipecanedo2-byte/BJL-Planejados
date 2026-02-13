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

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('inventory')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;

            const mappedProducts: Product[] = (data || []).map(p => ({
                id: p.id,
                name: p.name,
                unitPrice: Number(p.unit_price),
                quantity: Number(p.quantity),
                minStockLevel: Number(p.min_stock_level)
            }));

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
                <CardHeader>
                    <CardTitle>Controle de Estoque</CardTitle>
                </CardHeader>
                <CardContent>
                    <ProductTable
                        products={products}
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
        </div>
    );
};

export default Estoque;

