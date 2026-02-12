import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/types/product";
import ProductTable from "@/components/crm/ProductTable";
import ProductFormDialog from "@/components/crm/ProductFormDialog";

const mockProducts: Product[] = [
    {
        id: "1",
        name: "Cimento CP II",
        unitPrice: 28.50,
        quantity: 150,
        minStockLevel: 50,
    },
    {
        id: "2",
        name: "Tijolo Baiano (Milheiro)",
        unitPrice: 850.00,
        quantity: 0.5,
        minStockLevel: 1,
    },
    {
        id: "3",
        name: "Areia Grossa (m³)",
        unitPrice: 120.00,
        quantity: 2,
        minStockLevel: 5,
    },
    {
        id: "4",
        name: "Tinta Acrílica Branca 18L",
        unitPrice: 350.00,
        quantity: 12,
        minStockLevel: 10,
    },
];

const Estoque = () => {
    const [products, setProducts] = useState<Product[]>(mockProducts);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const handleNewProduct = () => {
        setEditingProduct(null);
        setIsDialogOpen(true);
    };

    const handleEditProduct = (product: Product) => {
        setEditingProduct(product);
        setIsDialogOpen(true);
    };

    const handleSubmit = (productData: Omit<Product, "id">) => {
        const newProduct: Product = {
            ...productData,
            id: Math.random().toString(36).substr(2, 9),
        };
        setProducts([newProduct, ...products]);
        toast.success("Produto adicionado ao estoque!");
    };

    const handleUpdate = (id: string, updates: Partial<Product>) => {
        setProducts(products.map(product =>
            product.id === id ? { ...product, ...updates } : product
        ));
        toast.success("Produto atualizado com sucesso!");
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
                    <ProductTable products={products} onEdit={handleEditProduct} />
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
