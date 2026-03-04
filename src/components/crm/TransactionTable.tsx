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
import { Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, FileImage } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TransactionTableProps {
    transactions: Transaction[];
    selectedIds: string[];
    onSelect: (id: string) => void;
    onSelectAll: (ids: string[]) => void;
    onEdit: (transaction: Transaction) => void;
    onDelete: (id: string) => void;
}

const TransactionTable = ({
    transactions,
    selectedIds,
    onSelect,
    onSelectAll,
    onEdit,
    onDelete
}: TransactionTableProps) => {
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
                        <TableHead className="w-[40px]">
                            <Checkbox
                                checked={transactions.length > 0 && selectedIds.length === transactions.length}
                                onCheckedChange={() => onSelectAll(transactions.map(t => t.id))}
                            />
                        </TableHead>
                        <TableHead>Pagamento / Compra</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>OS</TableHead>
                        <TableHead>Classificação</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Banco</TableHead>
                        <TableHead>Forma Pagto</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.map((transaction) => {
                        const isIncome = transaction.type === 'income';
                        const isPaid = transaction.status === 'paid';
                        const isSelected = selectedIds.includes(transaction.id);

                        return (
                            <TableRow key={transaction.id} className={isSelected ? "bg-muted/50" : ""}>
                                <TableCell>
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => onSelect(transaction.id)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-primary">{format(new Date(transaction.dueDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                                        <span className="text-xs text-muted-foreground">{transaction.competenceDate ? `Compra: ${format(new Date(transaction.competenceDate), "dd/MM", { locale: ptBR })}` : '-'}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{transaction.description}</span>
                                        <span className="text-xs text-muted-foreground">{transaction.service}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{transaction.orderService || "-"}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span>{transaction.category}</span>
                                        <span className="text-xs text-muted-foreground">{transaction.subcategory}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{transaction.contact}</TableCell>
                                <TableCell>{transaction.financialInstitution}</TableCell>
                                <TableCell>{transaction.paymentMethod}</TableCell>
                                <TableCell>
                                    <Badge variant={isPaid ? "default" : "outline"} className={isPaid ? "bg-green-600 hover:bg-green-700" : "text-yellow-600 border-yellow-600"}>
                                        {isPaid ? "Concluído" : "Pendente"}
                                    </Badge>
                                    {transaction.paymentDate && (
                                        <div className="text-[10px] text-muted-foreground mt-1">
                                            Efetuado: {format(new Date(transaction.paymentDate), "dd/MM", { locale: ptBR })}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className={`font-semibold ${isIncome ? "text-green-600" : "text-red-600"}`}>
                                    <div className="flex items-center gap-1">
                                        {isIncome ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
                                        {formatCurrency(transaction.amount)}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
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
                                        <Button variant="ghost" size="icon" onClick={() => onEdit(transaction)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
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
                            <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                Nenhum lançamento encontrado.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
};

export default TransactionTable;
