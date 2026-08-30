import React, { useMemo } from 'react';
import { Plus, Trash2, Sparkles, X, Layers } from 'lucide-react';
import { ServiceOrder } from '@/types/serviceOrder';

export interface CostSplitItem {
    client: string;
    amount: string;
    description: string;
    color?: string;
}

interface NextGenCostSplitterProps {
    totalInvoiceAmount: number;
    serviceOrders: ServiceOrder[];
    costSplits: CostSplitItem[];
    onChange: (splits: CostSplitItem[]) => void;
}

const COLOR_TAGS = [
    { label: 'Vermelho', color: '#ef4444', emoji: '🔴' },
    { label: 'Verde', color: '#10b981', emoji: '🟢' },
    { label: 'Azul', color: '#3b82f6', emoji: '🔵' },
    { label: 'Amarelo', color: '#f59e0b', emoji: '🟡' },
    { label: 'Laranja', color: '#f97316', emoji: '🟠' },
    { label: 'Roxo', color: '#8b5cf6', emoji: '🟣' },
    { label: 'Preto', color: '#000000', emoji: '⚫' },
];

export const NextGenCostSplitter: React.FC<NextGenCostSplitterProps> = ({
    totalInvoiceAmount,
    serviceOrders,
    costSplits,
    onChange,
}) => {
    const totalAllocated = useMemo(() => {
        return costSplits.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
    }, [costSplits]);

    const difference = totalInvoiceAmount - totalAllocated;
    const isComplete = Math.abs(difference) < 0.01 && totalInvoiceAmount > 0;
    const progressPercent = totalInvoiceAmount > 0 ? Math.min(100, (totalAllocated / totalInvoiceAmount) * 100) : 0;

    const handleUpdate = (index: number, field: keyof CostSplitItem, value: string) => {
        const newSplits = [...costSplits];
        newSplits[index] = { ...newSplits[index], [field]: value };
        onChange(newSplits);
    };

    const handleSplitEqually = () => {
        if (costSplits.length === 0 || totalInvoiceAmount <= 0) return;
        const count = costSplits.length;
        const equalPart = Number((totalInvoiceAmount / count).toFixed(2));
        const updated = costSplits.map((s, idx) => ({
            ...s,
            amount: idx === count - 1 
                ? (totalInvoiceAmount - equalPart * (count - 1)).toFixed(2)
                : equalPart.toFixed(2),
        }));
        onChange(updated);
    };

    const addRow = () => {
        onChange([...costSplits, { client: '', amount: '', description: '', color: '🟢' }]);
    };

    const removeRow = (index: number) => {
        if (costSplits.length <= 1) return;
        const filtered = costSplits.filter((_, idx) => idx !== index);
        onChange(filtered);
    };

    return (
        <div className="space-y-4 pt-1">
            {/* Action Bar & Quick Tools */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <Layers className="h-4 w-4" />
                    </div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Rateio de Custo por Projeto</h4>
                        <p className="text-[10px] text-muted-foreground">Distribua o valor da nota entre os clientes ou estoque</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleSplitEqually}
                        disabled={totalInvoiceAmount <= 0}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                    >
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        Dividir Igual
                    </button>
                    <button
                        type="button"
                        onClick={addRow}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 transition hover:bg-emerald-500/20"
                    >
                        <Plus className="h-3 w-3" />
                        Adicionar
                    </button>
                </div>
            </div>

            {/* Barra de Progresso do Rateio */}
            <div className="space-y-1.5 bg-muted/20 p-3 rounded-xl border border-border/40">
                <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground text-[11px]">
                        Alocado: <strong className="text-foreground font-bold">R$ {totalAllocated.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </span>
                    <span className={`text-[11px] font-bold ${
                        isComplete ? 'text-emerald-600 dark:text-emerald-400' : 
                        difference < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                    }`}>
                        {isComplete ? '🟢 100% Rateado' : difference > 0 ? `Faltam R$ ${difference.toFixed(2)}` : `Excedeu R$ ${Math.abs(difference).toFixed(2)}`}
                    </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted border border-border/40">
                    <div
                        className={`h-full transition-all duration-500 ${
                            isComplete ? 'bg-emerald-500' : difference < 0 ? 'bg-rose-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Grid de Linhas do Rateio */}
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {costSplits.map((split, index) => {
                    const amountNum = Number(split.amount) || 0;
                    const percentage = totalInvoiceAmount > 0 ? ((amountNum / totalInvoiceAmount) * 100).toFixed(1) : '0.0';
                    return (
                        <div
                            key={index}
                            className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card/60 p-3 transition hover:border-border hover:bg-card/90 shadow-sm"
                        >
                            <div className="flex gap-2 items-center">
                                {/* Seleção do Projeto / OS */}
                                <div className="flex-1 min-w-0">
                                    <select
                                        value={split.client}
                                        onChange={(e) => handleUpdate(index, 'client', e.target.value)}
                                        className="w-full h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                    >
                                        <option value="">Selecione o Projeto / OS...</option>
                                        <option value="ESTOQUE">🏢 ESTOQUE GERAL</option>
                                        {serviceOrders.map((os) => {
                                            const actionText = os.action ? ` (${os.action.trim()})` : '';
                                            const label = `${os.ticketNumber} - ${os.client.trim()}${actionText}`;
                                            return (
                                                <option key={os.id} value={label}>
                                                    {label}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                {/* Cor na Nota */}
                                <div className="w-24 shrink-0">
                                    <select
                                        value={split.color || '🔴'}
                                        onChange={(e) => handleUpdate(index, 'color', e.target.value)}
                                        className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                    >
                                        {COLOR_TAGS.map((tag) => (
                                            <option key={tag.label} value={tag.emoji}>
                                                {tag.emoji} {tag.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Valor */}
                                <div className="w-28 shrink-0 relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0,00"
                                        value={split.amount}
                                        onChange={(e) => handleUpdate(index, 'amount', e.target.value)}
                                        className="w-full h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-mono font-bold text-foreground text-right focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                    />
                                </div>

                                {costSplits.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeRow(index)}
                                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition"
                                        title="Remover rateio"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            {/* Descrição e Porcentagem */}
                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        placeholder="Descrição dos itens (Ex: Chapas, Puxadores, Fita)"
                                        value={split.description}
                                        onChange={(e) => handleUpdate(index, 'description', e.target.value)}
                                        className="w-full h-7 rounded-lg border border-input/60 bg-background/50 px-2.5 text-[11px] text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                    />
                                </div>
                                <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-12 text-right">
                                    {percentage}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
