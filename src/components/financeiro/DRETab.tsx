import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Fragment } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DRETabProps {
    selectedDREYear: string;
    setSelectedDREYear: (year: string) => void;
    dreData: {
        grossRevenue: number;
        taxes: number;
        netRevenue: number;
        variableCosts: number;
        contributionMargin: number;
        fixedExpenses: number;
        netResult: number;
    };
    detailedExpenses: any[];
    formatCurrency: (value: number) => string;
}

const DRETab = ({
    selectedDREYear,
    setSelectedDREYear,
    dreData,
    detailedExpenses,
    formatCurrency,
}: DRETabProps) => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                <div className="space-y-1">
                    <h3 className="text-2xl font-black tracking-tight text-primary uppercase tracking-widest">DRE Gerencial</h3>
                    <p className="text-xs text-muted-foreground font-medium uppercase opacity-70">Demonstrativo do Resultado do Exercício</p>
                </div>
                <Select value={selectedDREYear} onValueChange={setSelectedDREYear}>
                    <SelectTrigger className="w-[140px] bg-background font-bold border-primary/20">
                        <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
                <Card className="lg:col-span-4 shadow-2xl border-none bg-gradient-to-b from-card to-muted/30">
                    <CardHeader className="border-b border-border/10">
                        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Resumo Executivo - {selectedDREYear}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-6">
                            {/* Gross Revenue */}
                            <div className="flex justify-between items-center group cursor-default">
                                <span className="font-bold text-sm text-emerald-500 uppercase tracking-tight">(+) Receita Bruta</span>
                                <span className="font-black text-lg transition-transform group-hover:scale-110">{formatCurrency(dreData.grossRevenue)}</span>
                            </div>

                            {/* Taxes */}
                            <div className="flex justify-between items-center pl-4 text-xs text-muted-foreground italic border-l border-emerald-500/20 py-1">
                                <span>(-) Impostos s/ Vendas</span>
                                <span className="font-bold">{formatCurrency(dreData.taxes)}</span>
                            </div>

                            {/* Net Revenue */}
                            <div className="flex justify-between items-center py-3 border-t border-b border-border/50 bg-primary/5 px-2 rounded-lg">
                                <span className="font-black text-xs uppercase tracking-widest text-primary">(=) Receita Líquida</span>
                                <span className="font-black text-primary">{formatCurrency(dreData.netRevenue)}</span>
                            </div>

                            {/* Variable Costs */}
                            <div className="flex justify-between items-center pl-4 text-xs text-rose-500/60 italic border-l border-rose-500/20 py-1">
                                <span>(-) Custos Variáveis</span>
                                <span className="font-bold">{formatCurrency(dreData.variableCosts)}</span>
                            </div>

                            {/* Contribution Margin */}
                            <div className="flex justify-between items-center py-3 border-t border-b border-border/50 bg-blue-500/5 px-2 rounded-lg">
                                <span className="font-black text-xs uppercase tracking-widest text-blue-500">(=) Margem de Contribuição</span>
                                <span className={`font-black ${dreData.contributionMargin >= 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                                    {formatCurrency(dreData.contributionMargin)}
                                </span>
                            </div>

                            {/* Fixed Expenses */}
                            <div className="flex justify-between items-center pl-4 text-xs text-rose-500/60 italic border-l border-rose-500/20 py-1">
                                <span>(-) Despesas Fixas</span>
                                <span className="font-bold">{formatCurrency(dreData.fixedExpenses)}</span>
                            </div>

                            {/* Net Result */}
                            <div className={cn(
                                "flex flex-col gap-2 items-center justify-center py-8 rounded-2xl shadow-xl mt-4 transition-all hover:scale-105",
                                dreData.netResult >= 0 ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'
                            )}>
                                <span className="font-black text-[10px] text-white/80 uppercase tracking-[0.3em]">Resultado Líquido</span>
                                <span className="font-black text-3xl text-white tracking-tighter">{formatCurrency(dreData.netResult)}</span>
                                <div className="px-3 py-1 bg-white/20 rounded-full text-[8px] font-black text-white uppercase tracking-widest mt-2 border border-white/10">
                                    {dreData.netResult >= 0 ? 'Lucro do Exercício' : 'Prejuízo do Exercício'}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-8 shadow-2xl border-border/40 bg-card/40 backdrop-blur-md border">
                    <CardHeader className="bg-muted/30 border-b border-border/40">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between w-full">
                            <span>Detalhamento por Categorias</span>
                            <span className="bg-primary/10 text-primary text-[10px] px-2 py-1 rounded border border-primary/20">Visão Mensal</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto min-h-[500px]">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 border-b-2 border-primary/10">
                                        <TableHead className="w-[200px] font-black uppercase text-[10px] tracking-widest text-primary px-6 h-14">Categoria</TableHead>
                                        {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map(m => (
                                            <TableHead key={m} className="text-right font-black uppercase text-[9px] tracking-tight text-muted-foreground min-w-[80px]">{m}</TableHead>
                                        ))}
                                        <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-primary min-w-[100px] border-l border-primary/5 pr-6 h-14">Total Anual</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {detailedExpenses.map((cat) => {
                                        const isIncome = cat.type === 'income';
                                        return (
                                            <Fragment key={cat.category}>
                                                <TableRow className={cn(
                                                    "transition-colors border-l-2",
                                                    isIncome ? "bg-emerald-500/5 hover:bg-emerald-500/10 border-l-emerald-500" : "bg-muted/20 hover:bg-muted/40 border-l-primary/30"
                                                )}>
                                                    <TableCell className={cn(
                                                        "font-black text-xs px-6 h-12 uppercase tracking-tighter",
                                                        isIncome ? "text-emerald-600" : "text-primary"
                                                    )}>{cat.category}</TableCell>
                                                    {cat.monthly.map((amount: number, idx: number) => (
                                                        <TableCell key={idx} className="text-right text-[10px] font-bold text-foreground">
                                                            {amount > 0 ? amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}
                                                        </TableCell>
                                                    ))}
                                                    <TableCell className={cn(
                                                        "text-right font-black text-xs border-l border-primary/5 pr-6",
                                                        isIncome ? "text-emerald-600 bg-emerald-500/5" : "text-primary bg-primary/5"
                                                    )}>{formatCurrency(cat.total)}</TableCell>
                                                </TableRow>
                                                {cat.subcategories.map((sub: any) => (
                                                    <TableRow key={`${cat.category}-${sub.name}`} className="hover:bg-primary/[0.02] border-b border-border/30 group">
                                                        <TableCell className="pl-12 py-3 text-[11px] font-medium text-muted-foreground flex items-center gap-2 group-hover:text-foreground transition-colors">
                                                            <span className={cn(
                                                                "w-1 h-1 rounded-full transition-all group-hover:scale-150",
                                                                isIncome ? "bg-emerald-500/40 group-hover:bg-emerald-500" : "bg-primary/20 group-hover:bg-primary"
                                                            )} />
                                                            {sub.name}
                                                        </TableCell>
                                                        {sub.monthly.map((amount: number, idx: number) => (
                                                            <TableCell key={idx} className="text-right text-[10px] text-muted-foreground/70 group-hover:text-foreground/90 transition-colors">
                                                                {amount > 0 ? amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}
                                                            </TableCell>
                                                        ))}
                                                        <TableCell className={cn(
                                                            "text-right font-bold text-xs transition-colors border-l border-primary/5 pr-6",
                                                            isIncome ? "text-emerald-500/70 group-hover:text-emerald-600" : "text-muted-foreground group-hover:text-primary"
                                                        )}>
                                                            {formatCurrency(sub.total)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DRETab;
