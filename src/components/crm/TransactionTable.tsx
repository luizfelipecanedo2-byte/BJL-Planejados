import { useState, useEffect, useMemo } from "react";
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
import {
    Pencil,
    Trash2,
    ArrowUpRight,
    ArrowDownRight,
    FileImage,
    Split,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Clock,
    Landmark,
    Zap,
    Receipt,
    CreditCard,
    Banknote,
} from "lucide-react";
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

const PAGE_SIZE = 50;

const TransactionTable = ({
    transactions,
    selectedIds,
    onSelect,
    onSelectAll,
    onEdit,
    onDelete,
    onPartialPayment,
}: TransactionTableProps) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [showAllOnScreen, setShowAllOnScreen] = useState(false);

    useEffect(() => {
        setCurrentPage(1);
    }, [transactions.length]);

    const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);

    const visibleTransactions = useMemo(() => {
        if (showAllOnScreen || transactions.length <= PAGE_SIZE) {
            return transactions;
        }
        const start = (safePage - 1) * PAGE_SIZE;
        return transactions.slice(start, start + PAGE_SIZE);
    }, [transactions, safePage, showAllOnScreen]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    const getBankBadge = (inst?: string) => {
        if (!inst) return <span className="text-muted-foreground/40 text-[11px]">—</span>;
        const lower = inst.toLowerCase();
        if (lower.includes("itau") || lower.includes("itaú")) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EC7000]/15 text-[#FF9436] border border-[#EC7000]/30 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF8C24]" />
                    Itaú
                </span>
            );
        }
        if (lower.includes("nubank")) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    Nubank
                </span>
            );
        }
        if (lower.includes("dinheiro") || lower.includes("caixa")) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Dinheiro
                </span>
            );
        }
        if (lower.includes("recarga")) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    RecargaPay
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/[0.04] text-muted-foreground border border-white/10 whitespace-nowrap">
                <Landmark className="h-2.5 w-2.5 opacity-70" />
                {inst}
            </span>
        );
    };

    const getMethodBadge = (method?: string) => {
        if (!method) return <span className="text-muted-foreground/40 text-[11px]">—</span>;
        const lower = method.toLowerCase();
        if (lower.includes("pix")) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                    <Zap className="h-2.5 w-2.5" />
                    PIX
                </span>
            );
        }
        if (lower.includes("boleto")) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                    <Receipt className="h-2.5 w-2.5" />
                    Boleto
                </span>
            );
        }
        if (lower.includes("cart")) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 whitespace-nowrap">
                    <CreditCard className="h-2.5 w-2.5" />
                    {method}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-white/[0.03] text-muted-foreground border border-white/[0.07] whitespace-nowrap">
                <Banknote className="h-2.5 w-2.5 opacity-70" />
                {method}
            </span>
        );
    };

    const startIdx =
        transactions.length === 0 ? 0 : showAllOnScreen ? 1 : (safePage - 1) * PAGE_SIZE + 1;
    const endIdx = showAllOnScreen
        ? transactions.length
        : Math.min(safePage * PAGE_SIZE, transactions.length);

    return (
        <div className="space-y-3">
            {/* Barra de Paginação Rápida no Topo (se houver mais de 50 lançamentos) */}
            {transactions.length > PAGE_SIZE && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06] text-xs">
                    <div className="text-muted-foreground font-medium flex items-center gap-2 flex-wrap">
                        <span>
                            Exibindo{" "}
                            <strong className="text-foreground font-mono">
                                {startIdx}–{endIdx}
                            </strong>{" "}
                            de{" "}
                            <strong className="text-primary font-mono">{transactions.length}</strong>{" "}
                            lançamentos
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-mono font-semibold">
                            ✓ Impressão inclui todos os {transactions.length} registros
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {!showAllOnScreen && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={safePage <= 1}
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    className="h-7 px-2.5 rounded-lg text-[11px] font-bold gap-1 border-white/10 bg-white/[0.02]"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                    Anterior
                                </Button>
                                <span className="font-mono text-[11px] font-bold px-2 text-white/80">
                                    Pág. {safePage} / {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={safePage >= totalPages}
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    className="h-7 px-2.5 rounded-lg text-[11px] font-bold gap-1 border-white/10 bg-white/[0.02]"
                                >
                                    Próxima
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            </>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAllOnScreen((prev) => !prev)}
                            className="h-7 px-2.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider text-primary hover:bg-primary/10"
                        >
                            {showAllOnScreen
                                ? "Paginar (50/pág)"
                                : `Ver todos (${transactions.length})`}
                        </Button>
                    </div>
                </div>
            )}

            {/* Mobile View: Next-Gen Card Layout */}
            <div className="grid grid-cols-1 gap-3 md:hidden p-2">
                {visibleTransactions.map((transaction) => {
                    const isIncome = transaction.type === "income";
                    const isPaid = transaction.status === "paid";
                    const isSelected = selectedIds.includes(transaction.id);

                    return (
                        <div
                            key={transaction.id}
                            className={cn(
                                "executive-card rounded-2xl p-4 space-y-3 transition-colors",
                                isSelected
                                    ? "border-primary ring-1 ring-primary/30 bg-primary/[0.04]"
                                    : ""
                            )}
                        >
                            <div className="flex justify-between items-start gap-2">
                                <div className="flex gap-3 items-start min-w-0">
                                    <div className="mt-1">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => onSelect(transaction.id)}
                                            className="h-4 w-4 rounded border-white/20"
                                        />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="font-mono font-bold text-xs text-primary">
                                                {format(new Date(transaction.dueDate), "dd/MM/yyyy", {
                                                    locale: ptBR,
                                                })}
                                            </span>
                                            {transaction.orderService && (
                                                <span className="px-1.5 py-0.5 rounded bg-primary/15 border border-primary/30 text-primary text-[9px] font-mono font-bold">
                                                    OS: {transaction.orderService}
                                                </span>
                                            )}
                                            {transaction.invoiceNumber && (
                                                <span className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-white/80 text-[9px] font-mono font-bold">
                                                    NF #{transaction.invoiceNumber}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-display font-bold text-sm text-white leading-snug mt-1 break-words">
                                            {transaction.description}
                                        </h3>
                                        <div className="flex flex-col gap-0.5 mt-0.5">
                                            {transaction.contact && (
                                                <span className="text-[11px] font-medium text-muted-foreground">
                                                    {transaction.contact}
                                                </span>
                                            )}
                                            {transaction.costSplits &&
                                                transaction.costSplits.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                        {transaction.costSplits.map((split, sIdx) => (
                                                            <span
                                                                key={sIdx}
                                                                className="inline-flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 rounded-md py-0.5 px-1.5 font-mono font-semibold"
                                                            >
                                                                {split.client}:{" "}
                                                                {formatCurrency(split.amount)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    {transaction.boletoUrl && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg text-sky-400 bg-sky-500/10 border border-sky-500/20"
                                            onClick={() =>
                                                window.open(transaction.boletoUrl, "_blank")
                                            }
                                        >
                                            <FileImage className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                    {!isPaid && onPartialPayment && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg text-amber-400 bg-amber-500/10 border border-amber-500/20"
                                            onClick={() => onPartialPayment(transaction)}
                                            title="Baixa Parcial"
                                        >
                                            <Split className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/10"
                                        onClick={() => onEdit(transaction)}
                                    >
                                        <Pencil className="h-3.5 w-3.5 text-primary" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg text-rose-400 bg-rose-500/10 border border-rose-500/20"
                                        onClick={() => onDelete(transaction.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 py-2.5 border-y border-white/[0.06]">
                                <div className="flex flex-col">
                                    <span className="text-[9px] uppercase font-mono font-bold text-muted-foreground tracking-wider">
                                        Valor
                                    </span>
                                    <span
                                        className={cn(
                                            "font-tech text-base font-black tabular-nums flex items-center gap-1 mt-0.5",
                                            isIncome ? "text-emerald-400" : "text-rose-400"
                                        )}
                                    >
                                        {isIncome ? "+" : "-"} {formatCurrency(transaction.amount)}
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] uppercase font-mono font-bold text-muted-foreground tracking-wider">
                                        Classificação
                                    </span>
                                    <span className="text-xs font-semibold text-white/90 truncate mt-0.5">
                                        {transaction.category}
                                    </span>
                                    {transaction.subcategory && (
                                        <span className="text-[10px] text-muted-foreground truncate">
                                            {transaction.subcategory}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-0.5">
                                <span
                                    className={cn(
                                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border",
                                        isPaid
                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                                            : "bg-amber-500/10 text-amber-400 border-amber-500/25"
                                    )}
                                >
                                    {isPaid ? (
                                        <CheckCircle2 className="h-3 w-3" />
                                    ) : (
                                        <Clock className="h-3 w-3" />
                                    )}
                                    {isPaid ? "Pago" : "Pendente"}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    {getMethodBadge(transaction.paymentMethod)}
                                    {getBankBadge(transaction.financialInstitution)}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {transactions.length === 0 && (
                    <div className="text-center py-12 bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
                        <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
                            Nenhum lançamento encontrado para este filtro.
                        </p>
                    </div>
                )}
            </div>

            {/* Desktop View: Next-Gen Linear / Fintech Data-Grid */}
            <div className="hidden md:block overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-white/[0.02] border-b border-white/[0.07] hover:bg-white/[0.02]">
                            <TableHead className="w-[38px] pl-4">
                                <Checkbox
                                    checked={
                                        transactions.length > 0 &&
                                        selectedIds.length === transactions.length
                                    }
                                    onCheckedChange={() =>
                                        onSelectAll(transactions.map((t) => t.id))
                                    }
                                    className="border-white/20"
                                />
                            </TableHead>
                            <TableHead className="w-[105px] text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                                Vencimento
                            </TableHead>
                            <TableHead className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                                Descrição & Rateios
                            </TableHead>
                            <TableHead className="w-[100px] text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                                OS / NF
                            </TableHead>
                            <TableHead className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                                Plano de Contas
                            </TableHead>
                            <TableHead className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                                Favorecido / Cliente
                            </TableHead>
                            <TableHead className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                                Conta / Forma
                            </TableHead>
                            <TableHead className="w-[110px] text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                                Status
                            </TableHead>
                            <TableHead className="w-[135px] text-right text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                                Valor (R$)
                            </TableHead>
                            <TableHead className="w-[110px] text-right pr-4 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                                Ações
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visibleTransactions.map((transaction) => {
                            const isIncome = transaction.type === "income";
                            const isPaid = transaction.status === "paid";
                            const isSelected = selectedIds.includes(transaction.id);

                            return (
                                <TableRow
                                    key={transaction.id}
                                    className={cn(
                                        "border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group",
                                        isSelected ? "bg-primary/[0.06]" : ""
                                    )}
                                >
                                    <TableCell className="pl-4 py-2.5">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => onSelect(transaction.id)}
                                            className="border-white/20"
                                        />
                                    </TableCell>

                                    <TableCell className="py-2.5">
                                        <div className="flex flex-col">
                                            <span className="font-mono font-bold text-xs text-white group-hover:text-primary transition-colors tabular-nums">
                                                {format(new Date(transaction.dueDate), "dd/MM/yyyy", {
                                                    locale: ptBR,
                                                })}
                                            </span>
                                            {transaction.competenceDate && (
                                                <span className="text-[10px] font-mono text-muted-foreground/70 tabular-nums">
                                                    Comp:{" "}
                                                    {format(
                                                        new Date(transaction.competenceDate),
                                                        "dd/MM",
                                                        { locale: ptBR }
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell className="py-2.5 max-w-[320px]">
                                        <div className="flex flex-col">
                                            <span className="font-display font-semibold text-xs text-white/95 leading-snug">
                                                {transaction.description}
                                            </span>
                                            {transaction.service && (
                                                <span className="text-[10px] text-muted-foreground">
                                                    {transaction.service}
                                                </span>
                                            )}
                                            {transaction.costSplits &&
                                                transaction.costSplits.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {transaction.costSplits.map((split, sIdx) => (
                                                            <span
                                                                key={sIdx}
                                                                className="inline-flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 rounded-md py-0.5 px-1.5 font-mono font-semibold"
                                                            >
                                                                {split.client}:{" "}
                                                                {formatCurrency(split.amount)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                        </div>
                                    </TableCell>

                                    <TableCell className="py-2.5">
                                        <div className="flex flex-col gap-1 items-start">
                                            {transaction.orderService ? (
                                                <span className="px-2 py-0.5 rounded-md bg-primary/15 border border-primary/30 text-primary font-mono text-[10px] font-bold">
                                                    {transaction.orderService}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground/30 text-xs font-mono">
                                                    —
                                                </span>
                                            )}
                                            {transaction.invoiceNumber && (
                                                <span className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 text-white/75 font-mono text-[9px] font-semibold">
                                                    NF #{transaction.invoiceNumber}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell className="py-2.5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-semibold text-white/85">
                                                {transaction.category}
                                            </span>
                                            {transaction.subcategory && (
                                                <span className="text-[10px] text-muted-foreground">
                                                    {transaction.subcategory}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell className="py-2.5">
                                        <span className="text-xs font-medium text-white/80">
                                            {transaction.contact || "—"}
                                        </span>
                                    </TableCell>

                                    <TableCell className="py-2.5">
                                        <div className="flex flex-col gap-1 items-start">
                                            {getBankBadge(transaction.financialInstitution)}
                                            {getMethodBadge(transaction.paymentMethod)}
                                        </div>
                                    </TableCell>

                                    <TableCell className="py-2.5">
                                        <div className="flex flex-col gap-0.5 items-start">
                                            <span
                                                className={cn(
                                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border",
                                                    isPaid
                                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                                                        : "bg-amber-500/10 text-amber-400 border-amber-500/25"
                                                )}
                                            >
                                                {isPaid ? (
                                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                                ) : (
                                                    <Clock className="h-2.5 w-2.5" />
                                                )}
                                                {isPaid ? "Pago" : "Pendente"}
                                            </span>
                                            {transaction.paymentDate && (
                                                <span className="text-[9px] font-mono text-muted-foreground/70 pl-1">
                                                    Baixa:{" "}
                                                    {format(
                                                        new Date(transaction.paymentDate),
                                                        "dd/MM",
                                                        { locale: ptBR }
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell className="py-2.5 text-right">
                                        <div
                                            className={cn(
                                                "inline-flex items-center justify-end gap-1 font-tech font-bold text-xs tabular-nums px-2 py-1 rounded-lg",
                                                isIncome
                                                    ? "text-emerald-400 bg-emerald-500/[0.06]"
                                                    : "text-rose-400 bg-rose-500/[0.06]"
                                            )}
                                        >
                                            {isIncome ? (
                                                <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                                            ) : (
                                                <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />
                                            )}
                                            <span>{formatCurrency(transaction.amount)}</span>
                                        </div>
                                    </TableCell>

                                    <TableCell className="py-2.5 text-right pr-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                onClick={() => onEdit(transaction)}
                                                title="Editar Lançamento"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            {transaction.boletoUrl && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 rounded-lg text-sky-400 hover:bg-sky-500/15"
                                                    onClick={() =>
                                                        window.open(transaction.boletoUrl, "_blank")
                                                    }
                                                    title="Ver Comprovante / Boleto"
                                                >
                                                    <FileImage className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            {!isPaid && onPartialPayment && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 rounded-lg text-amber-400 hover:bg-amber-500/15"
                                                    onClick={() => onPartialPayment(transaction)}
                                                    title="Baixa Parcial"
                                                >
                                                    <Split className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 rounded-lg text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/15"
                                                onClick={() => onDelete(transaction.id)}
                                                title="Excluir Lançamento"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {transactions.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={10}
                                    className="text-center py-12 text-muted-foreground font-mono text-xs uppercase tracking-widest"
                                >
                                    Nenhum lançamento encontrado para os filtros selecionados.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Barra de Paginação Rápida no Rodapé */}
            {transactions.length > PAGE_SIZE && !showAllOnScreen && (
                <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-t border-white/[0.06] text-xs">
                    <span className="text-muted-foreground font-mono">
                        Mostrando {startIdx}–{endIdx} de {transactions.length}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={safePage <= 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className="h-7 px-3 rounded-lg text-xs font-bold gap-1 border-white/10 bg-white/[0.02]"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            Anterior
                        </Button>
                        <span className="font-mono text-xs font-bold px-2">
                            Página {safePage} de {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={safePage >= totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className="h-7 px-3 rounded-lg text-xs font-bold gap-1 border-white/10 bg-white/[0.02]"
                        >
                            Próxima
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransactionTable;
