import { Product } from "@/types/product";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

interface ProductTableProps {
    products: Product[];
    onEdit: (product: Product) => void;
    onDelete: (id: string) => void;
    onOrder?: (product: Product) => void;
}

const ProductTable = ({ products, onEdit, onDelete, onOrder }: ProductTableProps) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    return (
        <div className="space-y-4">
            {/* Mobile View: Card-based layout */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
                {products.map((product) => {
                    const totalValue = product.quantity * product.unitPrice;
                    const isLowStock = product.quantity < product.minStockLevel;
                    const orderQuantity = isLowStock ? product.minStockLevel - product.quantity : 0;

                    return (
                        <div key={product.id} className="bg-card border rounded-xl p-4 shadow-sm space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                                            #{product.idEstoque || "-"}
                                        </span>
                                        <h3 className="font-bold text-lg leading-tight">{product.name}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {formatCurrency(product.unitPrice)} / un
                                    </p>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => onEdit(product)}>
                                        <Pencil className="h-4 w-4 text-primary" />
                                    </Button>
                                    {onOrder && (
                                        <Button 
                                            variant="outline" 
                                            size="icon" 
                                            className="h-9 w-9 text-emerald-500 border-emerald-200 hover:bg-emerald-50" 
                                            onClick={() => onOrder(product)}
                                            title="Pedir mais"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button variant="outline" size="icon" className="h-9 w-9 text-red-500 border-red-200 hover:bg-red-50" onClick={() => onDelete(product.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-2 border-y border-border/50">
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Estoque</span>
                                    <span className="font-mono text-lg">{product.quantity}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total</span>
                                    <span className="font-mono text-lg">{formatCurrency(totalValue)}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                <Badge variant={isLowStock ? "destructive" : "default"} className={!isLowStock ? "bg-green-600/90 text-[10px]" : "text-[10px]"}>
                                    {isLowStock ? "Abaixo do Mínimo" : "Estoque OK"}
                                </Badge>

                                {orderQuantity > 0 && (
                                    <div className="text-right">
                                        <span className="text-[10px] text-muted-foreground block">Pedir:</span>
                                        <span className="font-bold text-red-600">+{orderQuantity} un</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {products.length === 0 && (
                    <div className="text-center py-10 bg-muted/20 rounded-xl border-2 border-dashed">
                        <p className="text-muted-foreground">Nenhum produto no estoque.</p>
                    </div>
                )}
            </div>

            {/* Desktop View: Table layout */}
            <div className="hidden md:block rounded-md border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead className="w-[80px]">Editar</TableHead>
                            <TableHead>Cod.</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Preço</TableHead>
                            <TableHead>Qtd.</TableHead>
                            <TableHead>Valor Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Pedir</TableHead>
                            <TableHead className="w-[50px] text-right">Excluir</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map((product) => {
                            const totalValue = product.quantity * product.unitPrice;
                            const isLowStock = product.quantity < product.minStockLevel;
                            const orderQuantity = isLowStock ? product.minStockLevel - product.quantity : 0;

                            return (
                                <TableRow key={product.id} className="hover:bg-muted/10 transition-colors">
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="hover:scale-110 active:scale-95 transition-all" onClick={() => onEdit(product)}>
                                            <Pencil className="h-4 w-4 text-primary" />
                                        </Button>
                                    </TableCell>
                                    <TableCell className="font-medium font-mono text-xs">{product.idEstoque || "-"}</TableCell>
                                    <TableCell className="font-semibold">{product.name}</TableCell>
                                    <TableCell>{formatCurrency(product.unitPrice)}</TableCell>
                                    <TableCell className="font-mono">{product.quantity}</TableCell>
                                    <TableCell className="font-mono">{formatCurrency(totalValue)}</TableCell>
                                    <TableCell>
                                        <Badge variant={isLowStock ? "destructive" : "default"} className={!isLowStock ? "bg-green-600 hover:bg-green-700" : ""}>
                                            {isLowStock ? "Baixo" : "OK"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {orderQuantity > 0 ? (
                                            <span className="font-bold text-red-600">+{orderQuantity}</span>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            {onOrder && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" 
                                                    onClick={() => onOrder(product)}
                                                    title="Pedir mais"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" onClick={() => onDelete(product.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {products.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                    Nenhum produto encontrado no estoque.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default ProductTable;
