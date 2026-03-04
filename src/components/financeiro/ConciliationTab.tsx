import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";

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
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-6 bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                    <div className="flex flex-col gap-1 text-center sm:text-left">
                        <h3 className="text-2xl font-black tracking-tight text-white uppercase tracking-widest">Conciliação Bancária</h3>
                        <div className="flex items-center gap-2 justify-center sm:justify-start">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Monitoramento em Tempo Real</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-8">
                        <div className="flex flex-col items-center sm:items-end">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Saldo Disponível</span>
                            <div className="text-3xl font-black text-emerald-400 tracking-tighter">
                                {formatCurrency(totalAccountBalance)}
                            </div>
                        </div>

                        <div className="h-10 w-px bg-slate-800 hidden sm:block" />

                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Conta:</span>
                            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                                <SelectTrigger className="w-[200px] border-slate-700 bg-slate-800/50 text-white font-black uppercase tracking-tighter hover:bg-slate-800 transition-colors">
                                    <SelectValue placeholder="Selecione a conta" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                    <SelectItem value="banco_itau" className="focus:bg-primary/20 focus:text-white">Banco Itaú</SelectItem>
                                    <SelectItem value="mercado_pago" className="focus:bg-primary/20 focus:text-white">Mercado Pago</SelectItem>
                                    <SelectItem value="dinheiro" className="focus:bg-primary/20 focus:text-white">Dinheiro (Caixa)</SelectItem>
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
                                {formatCurrency(reconciliationDailyData.initialBalance)}
                            </span>
                        </div>
                        <Button className="bg-primary hover:bg-primary/80 text-primary-foreground font-black uppercase tracking-widest text-[10px] px-6 py-5 rounded-xl shadow-lg shadow-primary/20">
                            Ajustar Saldo
                        </Button>
                    </div>
                </div>
            </div>

            <Card className="rounded-2xl border-none shadow-2xl bg-slate-950 overflow-hidden">
                <CardContent className="p-0">
                    <div className="relative w-full overflow-auto">
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
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
                                            <span className={`font-bold ${day.income > 0 ? "text-emerald-400" : "text-slate-700"}`}>
                                                {day.income > 0 ? formatCurrency(day.income) : '—'}
                                            </span>
                                        </td>

                                        <td className="p-4 text-right border-r border-slate-900/50">
                                            <span className={`font-bold ${day.expense > 0 ? "text-rose-400" : "text-slate-700"}`}>
                                                {day.expense > 0 ? formatCurrency(day.expense) : '—'}
                                            </span>
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
