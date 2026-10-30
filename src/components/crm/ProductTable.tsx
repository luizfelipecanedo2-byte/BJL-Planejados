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
import { Pencil, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductTableProps {
    products: Product[];
    onEdit: (product: Product) => void;
    onDelete: (id: string) => void;
    onOrder?: (product: Product) => void;
    isAdmin?: boolean;
}

const ProductTable = ({ products, onEdit, onDelete, onOrder, isAdmin = true }: ProductTableProps) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    return (
        <div className="space-y-4">
            {/* Mobile View: Card-based layout */}
            <div className="grid grid-cols-1 gap-3.5 md:hidden">
                {products.map((product) => {
                    const totalValue = product.quantity * product.unitPrice;
                    const isLowStock = product.quantity < product.minStockLevel;
                    const orderQuantity = isLowStock ? product.minStockLevel - product.quantity : 0;
                    const levelPct = product.minStockLevel > 0 ? Math.min(100, Math.round((product.quantity / (product.minStockLevel * 1.5)) * 100)) : 100;

                    return (
                        <div key={product.id} className="executive-card border-metallic rounded-2xl p-4 space-y-3">
                            <div className="flex justify-between items-start gap-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-tech font-bold px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-md text-primary">
                                            #{product.idEstoque || "-"}
                                        </span>
                                        <h3 className="font-display font-bold text-base leading-tight text-foreground">{product.name}</h3>
                                    </div>
                                    {isAdmin && (
                                        <p className="text-xs font-tech text-muted-foreground mt-1">
                                            {formatCurrency(product.unitPrice)} / un
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white/[0.03] border border-white/[0.06]" onClick={() => onEdit(product)}>
                                        <Pencil className="h-3.5 w-3.5 text-primary" />
                                    </Button>
                                    {onOrder && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" 
                                            onClick={() => onOrder(product)}
                                            title="Pedir mais"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20" onClick={() => onDelete(product.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>

                            <div className={cn("grid gap-4 py-2.5 border-y border-white/[0.06]", isAdmin ? "grid-cols-2" : "grid-cols-1")}>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Saldo / Mín. ({product.minStockLevel})</span>
                                    <span className="font-tech font-bold text-base tabular-nums">{product.quantity} un</span>
                                    <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full", isLowStock ? "bg-rose-500" : "bg-emerald-500")}
                                            style={{ width: `${levelPct}%` }}
                                        />
                                    </div>
                                </div>
                                {isAdmin && (
                                    <div className="flex flex-col justify-center">
                                        <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Total Estocado</span>
                                        <span className="font-tech font-bold text-base text-primary tabular-nums">{formatCurrency(totalValue)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-0.5">
                                <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest rounded-lg", isLowStock ? "border-rose-500/30 bg-rose-500/10 text-rose-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400")}>
                                    {isLowStock ? "Abaixo do Mínimo" : "Estoque OK"}
                                </Badge>

                                {orderQuantity > 0 && (
                                    <div className="text-right flex items-center gap-1.5">
                                        <span className="text-[9px] uppercase font-bold text-muted-foreground">Repor:</span>
                                        <span className="font-tech font-bold text-xs text-rose-400 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">+{orderQuantity} un</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {products.length === 0 && (
                    <div className="text-center py-10 bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nenhum produto encontrado no estoque.</p>
                    </div>
                )}
            </div>

            {/* Desktop View: Table layout */}
            <div className="hidden md:block rounded-2xl border border-white/[0.06] bg-black/20 overflow-hidden">
                <Table className="min-w-[700px]">
                    <TableHeader>
                        <TableRow className="bg-white/[0.02] border-b border-white/[0.06] hover:bg-white/[0.02]">
                            <TableHead className="w-[70px] text-[10px] font-black uppercase tracking-widest text-muted-foreground">Editar</TableHead>
                            <TableHead className="w-[90px] text-[10px] font-black uppercase tracking-widest text-muted-foreground">SKU</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Insumo / Produto</TableHead>
                            {isAdmin && <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Custo Unit.</TableHead>}
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Saldo & Nível</TableHead>
                            {isAdmin && <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Imobilizado</TableHead>}
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sugestão Compra</TableHead>
                            <TableHead className="w-[90px] text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map((product) => {
                            const totalValue = product.quantity * product.unitPrice;
                            const isLowStock = product.quantity < product.minStockLevel;
                            const orderQuantity = isLowStock ? product.minStockLevel - product.quantity : 0;
                            const levelPct = product.minStockLevel > 0 ? Math.min(100, Math.round((product.quantity / (product.minStockLevel * 1.5)) * 100)) : 100;

                            return (
                                <TableRow key={product.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-primary/10 transition-all" onClick={() => onEdit(product)}>
                                            <Pencil className="h-3.5 w-3.5 text-primary" />
                                        </Button>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-tech font-bold text-[11px] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-muted-foreground">
                                            #{product.idEstoque || "-"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-semibold text-sm text-foreground">{product.name}</TableCell>
                                    {isAdmin && <TableCell className="font-tech text-xs text-muted-foreground tabular-nums">{formatCurrency(product.unitPrice)}</TableCell>}
                                    <TableCell>
                                        <div className="flex flex-col gap-1 w-28">
                                            <div className="flex items-baseline justify-between">
                                                <span className="font-tech font-bold text-xs text-foreground tabular-nums">{product.quantity} un</span>
                                                <span className="font-tech text-[9px] text-muted-foreground">mín {product.minStockLevel}</span>
                                            </div>
                                            <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full rounded-full transition-all duration-500", isLowStock ? "bg-rose-500" : "bg-emerald-500")}
                                                    style={{ width: `${levelPct}%` }}
                                                />
                                            </div>
                                        </div>
                                    </TableCell>
                                    {isAdmin && <TableCell className="font-tech font-bold text-xs text-primary tabular-nums">{formatCurrency(totalValue)}</TableCell>}
                                    <TableCell>
                                        <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest rounded-lg", isLowStock ? "border-rose-500/30 bg-rose-500/10 text-rose-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400")}>
                                            {isLowStock ? "Crítico" : "Normal"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {orderQuantity > 0 ? (
                                            <span className="font-tech font-bold text-xs text-rose-400 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20">
                                                +{orderQuantity} un
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground/40 font-tech text-xs">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            {onOrder && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 rounded-xl text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/15 transition-colors" 
                                                    onClick={() => onOrder(product)}
                                                    title="Enviar para Pedido da Semana"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 transition-colors" onClick={() => onDelete(product.id)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {products.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={isAdmin ? 9 : 7} className="text-center py-10 text-xs font-bold uppercase tracking-widest text-muted-foreground">
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
