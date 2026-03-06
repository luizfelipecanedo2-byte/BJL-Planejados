import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Home, TrendingUp, DollarSign, Briefcase } from "lucide-react";
import { ServiceExpense } from "@/types/serviceExpense";
import { Transaction } from "@/types/finance";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";

interface ServiceExpensesTabProps {
    transactions: Transaction[];
    serviceExpenses: ServiceExpense[];
    handleNewServiceExpense: () => void;
    handleEditServiceExpense: (expense: ServiceExpense) => void;
    handleDeleteServiceExpense: (id: string) => Promise<void>;
    formatCurrency: (value: number) => string;
}

const ServiceExpensesTab = ({
    transactions,
    serviceExpenses,
    handleNewServiceExpense,
    handleEditServiceExpense,
    handleDeleteServiceExpense,
    formatCurrency,
}: ServiceExpensesTabProps) => {



    return (
        <div className="space-y-10">
            {/* Seção de Gastos Manuais */}
            <div className="space-y-6 opacity-80 hover:opacity-100 transition-opacity">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-muted/20 p-6 rounded-2xl border border-border/50 shadow-sm transition-all hover:bg-muted/30">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-secondary/10 rounded-xl text-secondary border border-secondary/20 shadow-lg shadow-secondary/5">
                            <Home className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black tracking-tight text-secondary-foreground uppercase tracking-widest">Análise de Margem <span className="text-[10px] font-normal text-muted-foreground ml-2 tracking-normal lowercase italic">(Detalhamento Manual)</span></h3>
                            <p className="text-xs text-muted-foreground font-medium uppercase opacity-70">Cálculo granular de insumos e mão de obra por ambiente</p>
                        </div>
                    </div>
                    <Button onClick={handleNewServiceExpense} size="lg" className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-black uppercase tracking-widest text-xs px-8 rounded-xl shadow-xl shadow-secondary/10 gap-2 transition-transform hover:scale-105">
                        <Plus className="h-4 w-4" />
                        Novo Registro
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-emerald-500/5 border-emerald-500/20 border-l-4 border-l-emerald-500 p-6 flex flex-col gap-2 shadow-xl shadow-emerald-500/5 transition-all hover:translate-y-[-4px]">
                        <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/70">Receita Total de Projetos</span>
                            <TrendingUp size={16} className="text-emerald-500" />
                        </div>
                        <span className="text-2xl font-black text-emerald-600">
                            {formatCurrency(serviceExpenses.reduce((acc, e) => acc + e.serviceValue, 0))}
                        </span>
                        <p className="text-[9px] text-muted-foreground uppercase font-medium tracking-tight mt-1 truncate">Faturamento total bruto manual</p>
                    </Card>

                    <Card className="bg-rose-500/5 border-rose-500/20 border-l-4 border-l-rose-500 p-6 flex flex-col gap-2 shadow-xl shadow-rose-500/5 transition-all hover:translate-y-[-4px]">
                        <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-600/70">Custos Integrados</span>
                            <TrendingUp size={16} className="text-rose-500 rotate-180" />
                        </div>
                        <span className="text-2xl font-black text-rose-600">
                            {formatCurrency(serviceExpenses.reduce((acc, e) => acc + e.spentValue, 0))}
                        </span>
                        <p className="text-[9px] text-muted-foreground uppercase font-medium tracking-tight mt-1 truncate">Investimento e gastos fixos</p>
                    </Card>

                    <Card className="bg-primary/5 border-primary/20 border-l-4 border-l-primary p-6 flex flex-col gap-2 shadow-xl shadow-primary/5 transition-all hover:translate-y-[-4px]">
                        <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">Lucro Bruto Manual</span>
                            <DollarSign size={16} className="text-primary" />
                        </div>
                        <span className="text-2xl font-black text-primary">
                            {formatCurrency(serviceExpenses.reduce((acc, e) => acc + (e.serviceValue - e.spentValue), 0))}
                        </span>
                        <p className="text-[9px] text-muted-foreground uppercase font-medium tracking-tight mt-1 truncate">Resultado operacional consolidado</p>
                    </Card>
                </div>

                <div className="md:hidden space-y-4">
                    {serviceExpenses.length === 0 ? (
                        <div className="text-center py-10 bg-muted/20 rounded-xl border-2 border-dashed text-muted-foreground italic text-xs">
                            Nenhum gasto por serviço cadastrado para análise.
                        </div>
                    ) : (
                        serviceExpenses.map((expense) => {
                            const grossProfit = expense.serviceValue - expense.spentValue;
                            const margin = expense.serviceValue > 0 ? (grossProfit / expense.serviceValue) * 100 : 0;
                            return (
                                <div key={expense.id} className="bg-card border rounded-xl p-5 shadow-sm space-y-4 relative overflow-hidden group">
                                    <div className={cn(
                                        "absolute top-0 left-0 w-1 h-full",
                                        margin >= 30 ? "bg-emerald-500" : margin >= 15 ? "bg-amber-500" : "bg-rose-500"
                                    )} />

                                    <div className="flex justify-between items-start pl-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black text-base uppercase tracking-tight truncate leading-tight">{expense.clientName}</h3>
                                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{expense.environment}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9 border-primary/20"
                                                onClick={() => handleEditServiceExpense(expense)}
                                            >
                                                <Pencil className="h-4 w-4 text-primary" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9 border-rose-100"
                                                onClick={() => handleDeleteServiceExpense(expense.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-rose-500" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-border/50 pl-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Receita</span>
                                            <span className="font-bold text-sm text-emerald-600">{formatCurrency(expense.serviceValue)}</span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Custos</span>
                                            <span className="font-bold text-sm text-rose-500">{formatCurrency(expense.spentValue)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-1 pl-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Lucro Bruto</span>
                                            <span className="font-black text-base text-primary">{formatCurrency(grossProfit)}</span>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="outline" className={cn(
                                                "font-black text-[11px] px-3 py-1 rounded-lg",
                                                margin >= 30 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                    margin >= 15 ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                        "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                            )}>
                                                MARGEM: {margin.toFixed(1)}%
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <Card className="hidden md:block rounded-2xl border-none shadow-2xl bg-card overflow-hidden">
                    <CardContent className="p-0">
                        <div className="relative w-full overflow-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="bg-muted/50 text-muted-foreground border-b border-border/50 h-14">
                                        <th className="px-6 text-left font-black uppercase tracking-widest text-[10px]">Cliente</th>
                                        <th className="px-6 text-left font-black uppercase tracking-widest text-[10px]">Ambiente</th>
                                        <th className="px-6 text-right font-black uppercase tracking-widest text-[10px]">Valor Serviço</th>
                                        <th className="px-6 text-right font-black uppercase tracking-widest text-[10px]">Valor Gasto</th>
                                        <th className="px-6 text-right font-black uppercase tracking-widest text-[10px] bg-primary/5 text-primary">Lucro Bruto</th>
                                        <th className="px-6 text-center font-black uppercase tracking-widest text-[10px]">Margem (%)</th>
                                        <th className="px-6 text-center font-black uppercase tracking-widest text-[10px] w-[140px]">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {serviceExpenses.length === 0 ? (
                                        <tr className="border-b border-border/30 h-32 text-center text-muted-foreground italic">
                                            <td colSpan={7}>Nenhum gasto por serviço cadastrado para análise.</td>
                                        </tr>
                                    ) : (
                                        serviceExpenses.map((expense) => {
                                            const grossProfit = expense.serviceValue - expense.spentValue;
                                            const margin = expense.serviceValue > 0 ? (grossProfit / expense.serviceValue) * 100 : 0;
                                            return (
                                                <tr key={expense.id} className="border-b border-border/30 hover:bg-muted/30 transition-all group">
                                                    <td className="px-6 py-5 font-black text-sm uppercase text-foreground group-hover:text-primary transition-colors">{expense.clientName}</td>
                                                    <td className="px-6 py-5 font-bold text-xs uppercase text-muted-foreground">{expense.environment}</td>
                                                    <td className="px-6 py-5 text-right font-semibold text-emerald-500">{formatCurrency(expense.serviceValue)}</td>
                                                    <td className="px-6 py-5 text-right font-semibold text-rose-500">{formatCurrency(expense.spentValue)}</td>
                                                    <td className="px-6 py-5 text-right font-black text-sm bg-primary/[0.03] group-hover:bg-primary/[0.08] transition-colors">{formatCurrency(grossProfit)}</td>
                                                    <td className="px-6 py-5 text-center">
                                                        <span className={cn(
                                                            "px-3 py-1 rounded-full font-black text-[9px] border",
                                                            margin >= 30 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                                margin >= 15 ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                                    "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                                        )}>
                                                            {margin.toFixed(1)}%
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex justify-center gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleEditServiceExpense(expense)}
                                                                className="h-9 w-9 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDeleteServiceExpense(expense.id)}
                                                                className="h-9 w-9 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="p-6 bg-amber-500/5 rounded-2xl border border-amber-500/20 shadow-xl shadow-amber-500/5 flex items-start gap-4">
                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-600 mt-1">
                    <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                    <h4 className="font-black text-amber-700 text-xs uppercase tracking-widest mb-1">Dica de Performance</h4>
                    <p className="text-[11px] text-amber-600/80 font-medium leading-relaxed">Consideramos margens acima de 30% como saudáveis para serviços de marcenaria e design. Ambientes com margens abaixo de 15% devem ser revisados quanto aos custos de material ou tempo de produção.</p>
                </div>
            </div>

            {/* Seção de Gastos Automáticos (da Tabela de Transações) */}
            <div className="space-y-6 pt-10 border-t border-border/40">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20 shadow-lg shadow-primary/5">
                        <Briefcase className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-2xl font-black tracking-tight text-primary uppercase tracking-widest">Análise Integrada <span className="text-[10px] font-normal text-muted-foreground ml-2 tracking-normal lowercase italic">(Gastos Automáticos via OS)</span></h3>
                        <p className="text-xs text-muted-foreground font-medium uppercase opacity-70">Lançamentos financeiros automaticamente vinculados a Ordens de Serviço</p>
                    </div>
                </div>

                <div className="md:hidden space-y-4">
                    {transactions.filter(t => t.orderService && t.orderService !== "all" && t.orderService !== "").length === 0 ? (
                        <div className="text-center py-10 bg-muted/20 rounded-xl border-2 border-dashed text-muted-foreground italic text-xs">
                            Nenhum lançamento financeiro vinculado a OS encontrado.
                        </div>
                    ) : (
                        transactions
                            .filter(t => t.orderService && t.orderService !== "all" && t.orderService !== "")
                            .map((t) => (
                                <div key={t.id} className="bg-card border rounded-xl p-4 shadow-sm space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className="min-w-0 flex-1">
                                            <span className="font-black text-primary text-[10px] uppercase tracking-tighter block mb-0.5">OS: {t.orderService}</span>
                                            <h4 className="font-bold text-sm text-foreground truncate">{t.description}</h4>
                                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-bold uppercase mt-1 inline-block">{t.category}</span>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <span className={cn(
                                                "font-black text-sm",
                                                t.type === 'income' ? "text-emerald-500" : "text-rose-500"
                                            )}>
                                                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                            </span>
                                            <span className={cn(
                                                "px-1.5 py-0.5 rounded-full font-black text-[8px] uppercase border mt-1",
                                                t.status === 'paid' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                            )}>
                                                {t.status === 'paid' ? 'Pago' : 'Pendente'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-border/50">
                                        <span className="text-[10px] text-muted-foreground font-medium uppercase">{t.contact}</span>
                                        <span className="font-mono text-[10px] text-muted-foreground">{new Date(t.dueDate).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                </div>
                            ))
                    )}
                </div>

                <Card className="hidden md:block rounded-2xl border-none shadow-2xl bg-card overflow-hidden">
                    <CardContent className="p-0">
                        <div className="relative w-full overflow-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="bg-muted/50 text-muted-foreground border-b border-border/50 h-14">
                                        <th className="px-6 text-left font-black uppercase tracking-widest text-[10px]">OS / Descrição</th>
                                        <th className="px-6 text-left font-black uppercase tracking-widest text-[10px]">Categoria</th>
                                        <th className="px-6 text-left font-black uppercase tracking-widest text-[10px]">Contato</th>
                                        <th className="px-6 text-right font-black uppercase tracking-widest text-[10px]">Data do Pagamento</th>
                                        <th className="px-6 text-right font-black uppercase tracking-widest text-[10px]">Status</th>
                                        <th className="px-6 text-right font-black uppercase tracking-widest text-[10px]">Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.filter(t => t.orderService && t.orderService !== "all" && t.orderService !== "").length === 0 ? (
                                        <tr className="border-b border-border/30 h-32 text-center text-muted-foreground italic">
                                            <td colSpan={6}>Nenhum lançamento financeiro vinculado a OS encontrado.</td>
                                        </tr>
                                    ) : (
                                        transactions
                                            .filter(t => t.orderService && t.orderService !== "all" && t.orderService !== "")
                                            .map((t) => (
                                                <tr key={t.id} className="border-b border-border/30 hover:bg-muted/30 transition-all group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-primary text-[10px] uppercase tracking-tighter">OS: {t.orderService}</span>
                                                            <span className="font-bold text-foreground text-sm truncate max-w-[200px]">{t.description}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2 py-0.5 rounded bg-muted text-[9px] font-bold uppercase">{t.category}</span>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-muted-foreground">{t.contact}</td>
                                                    <td className="px-6 py-4 text-right font-mono text-[10px]">
                                                        {new Date(t.dueDate).toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full font-black text-[8px] uppercase border",
                                                            t.status === 'paid' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                                        )}>
                                                            {t.status === 'paid' ? 'Pago' : 'Pendente'}
                                                        </span>
                                                    </td>
                                                    <td className={cn(
                                                        "px-6 py-4 text-right font-black text-sm",
                                                        t.type === 'income' ? "text-emerald-500" : "text-rose-500"
                                                    )}>
                                                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                                    </td>
                                                </tr>
                                            ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ServiceExpensesTab;
