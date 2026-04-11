import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Building2, Banknote, CreditCard, Coins } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

interface ConciliationTabProps {
    selectedAccount: string;
    setSelectedAccount: (account: string) => void;
    currentDateReconciliation: Date;
    handlePrevMonth: () => void;
    handleNextMonth: () => void;
    totalAccountBalance: number;
    reconciliationDailyData: {
        initialBalance: number;
        previousMonthDate: Date;
        days: {
            date: Date;
            income: number;
            expense: number;
            dailyBalance: number;
            accumulatedBalance: number;
            incomeTransactions?: any[];
            expenseTransactions?: any[];
        }[];
    };
    formatCurrency: (value: number) => string;
}

const ConciliationTab = ({
    selectedAccount,
    setSelectedAccount,
    currentDateReconciliation,
    handlePrevMonth,
    handleNextMonth,
    totalAccountBalance,
    reconciliationDailyData,
    formatCurrency,
}: ConciliationTabProps) => {
    const isNubank = selectedAccount === 'nubank';
    const isDinheiro = selectedAccount === 'dinheiro';

    return (
        <div className="space-y-6 text-foreground">
            <div className={cn(
                "flex flex-col gap-6 p-6 rounded-2xl border shadow-2xl relative overflow-hidden transition-all duration-700",
                isNubank ? "bg-gradient-to-br from-purple-900 via-purple-950 to-black border-purple-500/20" : 
                isDinheiro ? "bg-gradient-to-br from-emerald-900 via-emerald-950 to-black border-emerald-500/20" :
                "bg-gradient-to-br from-slate-900 via-slate-950 to-black border-slate-800"
            )}>
                <div className={cn(
                    "absolute top-0 right-0 w-64 h-64 rounded-full -mr-32 -mt-32 blur-3xl opacity-50 transition-colors duration-700",
                    isNubank ? "bg-purple-500/20" : isDinheiro ? "bg-emerald-500/20" : "bg-primary/5"
                )} />

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                    <div className="flex flex-col gap-1 text-center sm:text-left">
                        <h3 className="text-2xl font-black tracking-tighter text-white uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Conciliação Bancária</h3>
                        <div className="flex items-center gap-2 justify-center sm:justify-start">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none">Monitoramento em Tempo Real</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-8">
                        {/* Account HUD */}
                        <div className="flex flex-col items-center sm:items-end group">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1 flex items-center gap-2">
                                {selectedAccount === 'dinheiro' && <span className="text-[10px]">💰</span>}
                                {selectedAccount === 'nubank' && <img src="https://logodownload.org/wp-content/uploads/2019/08/nubank-logo-3.png" className="h-3 w-3 object-contain" alt="Nubank" />}
                                Saldo Disponível
                            </span>
                            <div className="text-3xl font-black text-emerald-400 tracking-tighter flex items-center gap-3">
                                <div className={cn(
                                    "p-2 rounded-xl border transition-all duration-500 flex items-center justify-center overflow-hidden w-12 h-12 shadow-xl",
                                    isDinheiro ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-emerald-500/10" :
                                    isNubank ? "bg-purple-600 border-purple-400/30 text-white shadow-purple-500/20" :
                                    "bg-white border-white/20"
                                )}>
                                    {selectedAccount === 'dinheiro' && <span className="text-3xl">💰</span>}
                                    {selectedAccount === 'nubank' && <img src="https://logodownload.org/wp-content/uploads/2019/08/nubank-logo-3.png" className="h-8 w-8 object-contain" alt="Nubank" />}
                                </div>
                                <AnimatedCounter value={totalAccountBalance} formatter={formatCurrency} />
                            </div>
                        </div>

                        <div className="h-10 w-px bg-slate-800 hidden sm:block" />

                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Conta:</span>
                            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                                <SelectTrigger className={cn(
                                    "w-[200px] bg-slate-800/50 text-white font-black uppercase tracking-tighter hover:bg-slate-800 transition-all rounded-xl h-11 border",
                                    isNubank ? "border-purple-500/30" : isDinheiro ? "border-emerald-500/30" : "border-slate-700"
                                )}>
                                    <SelectValue placeholder="Selecione a conta" />
                                </SelectTrigger>
                                <SelectContent className={cn(
                                    "text-white rounded-xl border",
                                    isNubank ? "bg-purple-950 border-purple-500/20" : 
                                    isDinheiro ? "bg-emerald-950 border-emerald-500/20" : 
                                    "bg-slate-950 border-slate-800"
                                )}>
                                    <SelectItem value="nubank" className="focus:bg-primary/20 focus:text-white rounded-lg cursor-pointer">
                                        <div className="flex items-center gap-2">
                                            <img src="https://logodownload.org/wp-content/uploads/2019/08/nubank-logo-3.png" className="h-4 w-4 object-contain" alt="Nubank" />
                                            <span className="font-bold">Nubank</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="dinheiro" className="focus:bg-primary/20 focus:text-white rounded-lg cursor-pointer">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">💰</span>
                                            <span className="font-bold">Dinheiro (Caixa)</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-6 border-t border-slate-800 relative z-10">
                    <div className="flex items-center bg-slate-800/80 rounded-xl p-1 border border-slate-700 shadow-inner">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handlePrevMonth}
                            className="text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg h-10 w-10"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                        <span className="font-black text-sm px-6 capitalize text-white min-w-[180px] text-center tracking-widest">
                            {currentDateReconciliation.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleNextMonth}
                            className="text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg h-10 w-10"
                        >
                            <ChevronRight className="h-6 w-6" />
                        </Button>
                    </div>

                    <div className="flex flex-wrap justify-center sm:justify-end items-center gap-6">
                        <div className="flex flex-col items-center sm:items-end">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Saldo Inicial</span>
                            <span className="font-bold text-white text-lg tracking-tighter">
                                <AnimatedCounter value={reconciliationDailyData.initialBalance} formatter={formatCurrency} />
                            </span>
                        </div>
                        <Button className={cn(
                            "font-black uppercase tracking-widest text-[10px] px-6 py-5 rounded-xl shadow-lg transition-all",
                            isNubank ? "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20" : 
                            isDinheiro ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20" :
                            "bg-primary hover:bg-primary/80 text-primary-foreground shadow-primary/20"
                        )}>
                            Ajustar Saldo
                        </Button>
                    </div>
                </div>
            </div>

            <div className="md:hidden space-y-4">
                {reconciliationDailyData.days.map((day, index) => (
                    <div
                        key={index}
                        className={cn(
                            "bg-slate-900/50 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4 relative overflow-hidden",
                            day.dailyBalance !== 0 ? "border-slate-700" : "opacity-70"
                        )}
                    >
                        <div className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                            <span className="font-black text-xs text-slate-400 uppercase tracking-widest bg-slate-800 px-2 py-1 rounded">
                                {day.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                            </span>
                            <div className="flex items-center gap-2">
                                {day.dailyBalance > 0 && <span className="text-[10px] font-black text-emerald-500 uppercase">Superávit</span>}
                                {day.dailyBalance < 0 && <span className="text-[10px] font-black text-rose-500 uppercase">Déficit</span>}
                                <div className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-800 border border-slate-700">
                                    {day.dailyBalance > 0 && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                                    {day.dailyBalance < 0 && <TrendingDown className="h-3 w-3 text-rose-500" />}
                                    {day.dailyBalance === 0 && <div className="h-0.5 w-2 bg-slate-600 rounded-full" />}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Entradas</span>
                                <HoverCard>
                                    <HoverCardTrigger asChild>
                                        <span className={cn("font-bold text-sm cursor-help", day.income > 0 ? "text-emerald-400" : "text-slate-600")}>
                                            {day.income > 0 ? formatCurrency(day.income) : '—'}
                                        </span>
                                    </HoverCardTrigger>
                                    {day.income > 0 && day.incomeTransactions && day.incomeTransactions.length > 0 && (
                                        <HoverCardContent className="w-80 bg-slate-900 border-emerald-500/30">
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-bold text-emerald-400">Detalhes (Entradas)</h4>
                                                {day.incomeTransactions.map((t, i) => (
                                                    <div key={i} className="flex justify-between items-center text-xs">
                                                        <span className="text-slate-300 truncate max-w-[180px]">{t.description}</span>
                                                        <span className="font-bold text-emerald-500">{formatCurrency(t.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </HoverCardContent>
                                    )}
                                </HoverCard>
                            </div>
                            <div className="flex flex-col text-right">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Saídas</span>
                                <HoverCard>
                                    <HoverCardTrigger asChild>
                                        <span className={cn("font-bold text-sm cursor-help", day.expense > 0 ? "text-rose-400" : "text-slate-600")}>
                                            {day.expense > 0 ? formatCurrency(day.expense) : '—'}
                                        </span>
                                    </HoverCardTrigger>
                                    {day.expense > 0 && day.expenseTransactions && day.expenseTransactions.length > 0 && (
                                        <HoverCardContent className="w-80 bg-slate-900 border-rose-500/30">
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-bold text-rose-400">Detalhes (Saídas)</h4>
                                                {day.expenseTransactions.map((t, i) => (
                                                    <div key={i} className="flex justify-between items-center text-xs">
                                                        <span className="text-slate-300 truncate max-w-[180px]">{t.description}</span>
                                                        <span className="font-bold text-rose-500">{formatCurrency(t.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </HoverCardContent>
                                    )}
                                </HoverCard>
                            </div>
                        </div>

                        <div className="flex justify-between items-end pt-2 border-t border-slate-800/50">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Fluxo do Dia</span>
                                <span className={cn(
                                    "font-black text-base tracking-tight",
                                    day.dailyBalance > 0 ? "text-emerald-500" : day.dailyBalance < 0 ? "text-rose-500" : "text-slate-500"
                                )}>
                                    {day.dailyBalance !== 0 ? (day.dailyBalance > 0 ? '+' : '') + formatCurrency(day.dailyBalance) : '—'}
                                </span>
                            </div>
                            <div className="flex flex-col text-right bg-primary/5 px-3 py-2 rounded-lg border border-primary/10">
                                <span className="text-[9px] font-black text-primary uppercase tracking-widest mb-0.5">Saldo Acumulado</span>
                                <span className="font-black text-lg text-white tracking-tighter leading-none">
                                    {formatCurrency(day.accumulatedBalance)}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Card className="hidden md:block rounded-2xl border-none shadow-2xl bg-slate-950 overflow-hidden">
                <CardContent className="p-0">
                    <div className="relative w-full overflow-auto">
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className={cn(
                                    "text-slate-400 border-b",
                                    isNubank ? "bg-purple-900/40 border-purple-500/20" :
                                    isDinheiro ? "bg-emerald-900/40 border-emerald-500/20" :
                                    "bg-slate-900/80 border-slate-800"
                                )}>
                                    <th className="h-14 px-6 text-center font-black uppercase tracking-widest w-[140px]">Data</th>
                                    <th className="h-14 px-6 text-right font-black uppercase tracking-widest">Entradas</th>
                                    <th className="h-14 px-6 text-right font-black uppercase tracking-widest">Saídas</th>
                                    <th className="h-14 px-6 text-right font-black uppercase tracking-widest">Fluxo Diário</th>
                                    <th className="h-14 px-6 text-right font-black uppercase tracking-widest w-[220px] bg-slate-900/40">Saldo Acumulado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reconciliationDailyData.days.map((day, index) => (
                                    <tr
                                        key={index}
                                        className={`border-b border-slate-900 group transition-colors ${index % 2 === 0 ? 'bg-transparent' : 'bg-slate-900/20'} hover:bg-primary/5`}
                                    >
                                        <td className="p-4 text-center font-black text-slate-300 border-r border-slate-900/50 uppercase tracking-tighter">
                                            {day.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                        </td>

                                        <td className="p-4 text-right border-r border-slate-900/50">
                                            <HoverCard>
                                                <HoverCardTrigger asChild>
                                                    <span className={`font-bold cursor-help ${day.income > 0 ? "text-emerald-400" : "text-slate-700"}`}>
                                                        {day.income > 0 ? formatCurrency(day.income) : '—'}
                                                    </span>
                                                </HoverCardTrigger>
                                                {day.income > 0 && day.incomeTransactions && day.incomeTransactions.length > 0 && (
                                                    <HoverCardContent className="w-80 bg-slate-900 border-emerald-500/30 z-[100] relative">
                                                        <div className="space-y-2">
                                                            <h4 className="text-sm font-bold text-emerald-400 text-left">Detalhes (Entradas)</h4>
                                                            {day.incomeTransactions.map((t, i) => (
                                                                <div key={i} className="flex justify-between items-center text-xs">
                                                                    <span className="text-slate-300 truncate max-w-[180px] text-left">{t.description}</span>
                                                                    <span className="font-bold text-emerald-500">{formatCurrency(t.amount)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </HoverCardContent>
                                                )}
                                            </HoverCard>
                                        </td>

                                        <td className="p-4 text-right border-r border-slate-900/50">
                                            <HoverCard>
                                                <HoverCardTrigger asChild>
                                                    <span className={`font-bold cursor-help ${day.expense > 0 ? "text-rose-400" : "text-slate-700"}`}>
                                                        {day.expense > 0 ? formatCurrency(day.expense) : '—'}
                                                    </span>
                                                </HoverCardTrigger>
                                                {day.expense > 0 && day.expenseTransactions && day.expenseTransactions.length > 0 && (
                                                    <HoverCardContent className="w-80 bg-slate-900 border-rose-500/30 z-[100] relative">
                                                        <div className="space-y-2">
                                                            <h4 className="text-sm font-bold text-rose-400 text-left">Detalhes (Saídas)</h4>
                                                            {day.expenseTransactions.map((t, i) => (
                                                                <div key={i} className="flex justify-between items-center text-xs">
                                                                    <span className="text-slate-300 truncate max-w-[180px] text-left">{t.description}</span>
                                                                    <span className="font-bold text-rose-500">{formatCurrency(t.amount)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </HoverCardContent>
                                                )}
                                            </HoverCard>
                                        </td>

                                        <td className="p-4 text-right border-r border-slate-900/50">
                                            <span className={`font-black ${day.dailyBalance !== 0 ? (day.dailyBalance > 0 ? "text-emerald-500/80" : "text-rose-500/80") : "text-slate-700"}`}>
                                                {day.dailyBalance !== 0 ? (day.dailyBalance > 0 ? '+' : '') + formatCurrency(day.dailyBalance) : '—'}
                                            </span>
                                        </td>

                                        <td className="p-4 text-right font-black text-white bg-slate-900/20 group-hover:bg-primary/10 transition-colors">
                                            <div className="flex justify-end items-center gap-3">
                                                <span className="text-sm tracking-tighter">{formatCurrency(day.accumulatedBalance)}</span>
                                                <div className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-800 shadow-inner group-hover:bg-slate-700 transition-colors">
                                                    {day.dailyBalance > 0 && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                                                    {day.dailyBalance < 0 && <TrendingDown className="h-3 w-3 text-rose-500" />}
                                                    {day.dailyBalance === 0 && <div className="h-0.5 w-2 bg-slate-600 rounded-full" />}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {/* Total Row */}
                                <tr className="bg-slate-900 font-black border-t-2 border-primary/20 sticky bottom-0">
                                    <td className="p-6 text-center text-slate-400 uppercase tracking-widest text-[10px]">Total Período</td>
                                    <td className="p-6 text-right text-emerald-400 text-sm tracking-tighter">
                                        {formatCurrency(reconciliationDailyData.days.reduce((acc, d) => acc + d.income, 0))}
                                    </td>
                                    <td className="p-6 text-right text-rose-400 text-sm tracking-tighter">
                                        {formatCurrency(reconciliationDailyData.days.reduce((acc, d) => acc + d.expense, 0))}
                                    </td>
                                    <td className="p-6 text-right text-white/60 text-[10px] uppercase tracking-widest">Saldo Líquido</td>
                                    <td className="p-6 text-right text-emerald-400 text-lg tracking-tighter bg-slate-900/80 border-l border-slate-800">
                                        {formatCurrency(reconciliationDailyData.days[reconciliationDailyData.days.length - 1]?.accumulatedBalance || 0)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ConciliationTab;
