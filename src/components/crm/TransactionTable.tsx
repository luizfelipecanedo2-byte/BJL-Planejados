import { Transaction } from "@/types/finance";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, FileImage, Split } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TransactionTableProps {
    transactions: Transaction[];
    selectedIds: string[];
    onSelect: (id: string) => void;
    onSelectAll: (ids: string[]) => void;
    onEdit: (transaction: Transaction) => void;
    onDelete: (id: string) => void;
    onPartialPayment?: (transaction: Transaction) => void;
}

const TransactionTable = ({
    transactions,
    selectedIds,
    onSelect,
    onSelectAll,
    onEdit,
    onDelete,
    onPartialPayment
}: TransactionTableProps) => {
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
                {transactions.map((transaction) => {
                    const isIncome = transaction.type === 'income';
                    const isPaid = transaction.status === 'paid';
                    const isSelected = selectedIds.includes(transaction.id);

                    return (
                        <div key={transaction.id} className={cn(
                            "bg-card border rounded-xl p-4 shadow-sm space-y-3 transition-all",
                            isSelected ? "border-primary ring-1 ring-primary/20 bg-primary/5" : ""
                        )}>
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3 items-start">
                                    <div className="mt-1">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => onSelect(transaction.id)}
                                            className="h-5 w-5"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold text-sm text-primary">
                                                {format(new Date(transaction.dueDate), "dd/MM/yy", { locale: ptBR })}
                                            </span>
                                            {transaction.orderService && (
                                                <Badge variant="outline" className="text-[10px] h-4 py-0 font-mono">
                                                    OS: {transaction.orderService}
                                                </Badge>
                                            )}
                                            {transaction.invoiceNumber && (
                                                <Badge variant="secondary" className="text-[10px] h-4 py-0 font-mono">
                                                    NF: {transaction.invoiceNumber}
                                                </Badge>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-base leading-tight mt-0.5">{transaction.description}</h3>
                                        <div className="flex flex-col gap-0.5 mt-0.5">
                                            {transaction.service && <span className="text-xs font-semibold text-muted-foreground">{transaction.service}</span>}
                                            <span className="text-[11px] text-muted-foreground/80">{transaction.contact}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    {transaction.boletoUrl && (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-9 w-9 text-blue-600 border-blue-100"
                                            onClick={() => window.open(transaction.boletoUrl, '_blank')}
                                        >
                                            <FileImage className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {!isPaid && onPartialPayment && (
                                        <Button 
                                            variant="outline" 
                                            size="icon" 
                                            className="h-9 w-9 text-amber-500 border-amber-100" 
                                            onClick={() => onPartialPayment(transaction)}
                                            title="Baixa Parcial"
                                        >
                                            <Split className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => onEdit(transaction)}>
                                        <Pencil className="h-4 w-4 text-primary" />
                                    </Button>
                                    <Button variant="outline" size="icon" className="h-9 w-9 text-red-500 border-red-100" onClick={() => onDelete(transaction.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-2 border-y border-border/50">
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Valor</span>
                                    <span className={cn(
                                        "font-mono text-lg font-bold flex items-center gap-1",
                                        isIncome ? "text-green-600" : "text-red-600"
                                    )}>
                                        {isIncome ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                                        {formatCurrency(transaction.amount)}
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Categoria</span>
                                    <span className="text-sm truncate">{transaction.category}</span>
                                    <span className="text-[10px] text-muted-foreground truncate">{transaction.subcategory}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-2">
                                    <Badge variant={isPaid ? "default" : "outline"} className={isPaid ? "bg-green-600/90 text-[10px]" : "text-yellow-600 border-yellow-600 text-[10px]"}>
                                        {isPaid ? "Concluído" : "Pendente"}
                                    </Badge>
                                    <div className="flex flex-col">
                                        {transaction.paymentDate && (
                                            <span className="text-[9px] text-muted-foreground">
                                                Pago: {format(new Date(transaction.paymentDate), "dd/MM", { locale: ptBR })}
                                            </span>
                                        )}
                                        {transaction.competenceDate && (
                                            <span className="text-[9px] text-muted-foreground">
                                                Compra: {format(new Date(transaction.competenceDate), "dd/MM", { locale: ptBR })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                                        {transaction.paymentMethod}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground mt-0.5">{transaction.financialInstitution}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {transactions.length === 0 && (
                    <div className="text-center py-10 bg-muted/20 rounded-xl border-2 border-dashed">
                        <p className="text-muted-foreground">Nenhum lançamento encontrado.</p>
                    </div>
                )}
            </div>

            {/* Desktop View: Table layout */}
            <div className="hidden md:block rounded-md border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead className="w-[40px]">
                                <Checkbox
                                    checked={transactions.length > 0 && selectedIds.length === transactions.length}
                                    onCheckedChange={() => onSelectAll(transactions.map(t => t.id))}
                                />
                            </TableHead>
                            <TableHead className="w-[80px]">Editar</TableHead>
                            <TableHead>Pagamento / Compra</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>OS</TableHead>
                            <TableHead>Classificação</TableHead>
                            <TableHead>Contato</TableHead>
                            <TableHead>Banco</TableHead>
                            <TableHead>Forma Pagto</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead className="w-[50px] text-right">Ação</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((transaction) => {
                            const isIncome = transaction.type === 'income';
                            const isPaid = transaction.status === 'paid';
                            const isSelected = selectedIds.includes(transaction.id);

                            return (
                                <TableRow key={transaction.id} className={cn("hover:bg-muted/10 transition-colors", isSelected ? "bg-muted/50" : "")}>
                                    <TableCell>
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => onSelect(transaction.id)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="hover:scale-110 active:scale-95 transition-all" onClick={() => onEdit(transaction)}>
                                            <Pencil className="h-4 w-4 text-primary" />
                                        </Button>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-primary font-mono text-xs">{format(new Date(transaction.dueDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                                            <span className="text-[10px] text-muted-foreground">{transaction.competenceDate ? `Compra: ${format(new Date(transaction.competenceDate), "dd/MM", { locale: ptBR })}` : '-'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-semibold">{transaction.description}</span>
                                            <span className="text-[10px] text-muted-foreground">{transaction.service}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs font-bold">
                                        <div className="flex flex-col gap-1">
                                            <span>{transaction.orderService || "-"}</span>
                                            {transaction.invoiceNumber && (
                                                <Badge variant="secondary" className="text-[9px] px-1 py-0 w-fit">NF: {transaction.invoiceNumber}</Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{transaction.category}</span>
                                            <span className="text-[10px] text-muted-foreground">{transaction.subcategory}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs">{transaction.contact}</TableCell>
                                    <TableCell className="text-xs">{transaction.financialInstitution}</TableCell>
                                    <TableCell className="text-xs">{transaction.paymentMethod}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <Badge variant={isPaid ? "default" : "outline"} className={cn("text-[10px] py-0 px-2", isPaid ? "bg-green-600 hover:bg-green-700" : "text-yellow-600 border-yellow-600")}>
                                                {isPaid ? "Concluído" : "Pendente"}
                                            </Badge>
                                            {transaction.paymentDate && (
                                                <span className="text-[9px] text-muted-foreground text-center">
                                                    P: {format(new Date(transaction.paymentDate), "dd/MM", { locale: ptBR })}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className={cn("font-bold text-sm", isIncome ? "text-green-600" : "text-red-600")}>
                                        <div className="flex items-center gap-1 font-mono">
                                            {isIncome ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
                                            {formatCurrency(transaction.amount)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {transaction.boletoUrl && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    onClick={() => window.open(transaction.boletoUrl, '_blank')}
                                                    title="Ver Boleto"
                                                >
                                                    <FileImage className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {!isPaid && onPartialPayment && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                                                    onClick={() => onPartialPayment(transaction)}
                                                    title="Baixa Parcial"
                                                >
                                                    <Split className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                onClick={() => onDelete(transaction.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                        {transactions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                                    Nenhum lançamento encontrado.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default TransactionTable;
