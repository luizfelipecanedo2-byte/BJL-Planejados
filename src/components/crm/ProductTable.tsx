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
}

const ProductTable = ({ products, onEdit, onDelete }: ProductTableProps) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">Editar</TableHead>
                        <TableHead>Cod.</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Preço</TableHead>
                        <TableHead>Qtd. Estoque</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Nível</TableHead>
                        <TableHead>Pedir</TableHead>
                        <TableHead className="w-[50px] text-right">Ação</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.map((product) => {
                        const totalValue = product.quantity * product.unitPrice;
                        const isLowStock = product.quantity < product.minStockLevel;
                        const orderQuantity = isLowStock ? product.minStockLevel - product.quantity : 0;

                        return (
                            <TableRow key={product.id}>
                                <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => onEdit(product)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                                <TableCell className="font-medium">{product.idEstoque || "-"}</TableCell>
                                <TableCell>{product.name}</TableCell>
                                <TableCell>{formatCurrency(product.unitPrice)}</TableCell>
                                <TableCell>{product.quantity}</TableCell>
                                <TableCell>{formatCurrency(totalValue)}</TableCell>
                                <TableCell>
                                    <Badge variant={isLowStock ? "destructive" : "default"} className={!isLowStock ? "bg-green-600 hover:bg-green-700" : ""}>
                                        {isLowStock ? "Abaixo" : "OK"}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {orderQuantity > 0 ? (
                                        <span className="font-bold text-red-600">{orderQuantity}</span>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => onDelete(product.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
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
    );
};

export default ProductTable;
