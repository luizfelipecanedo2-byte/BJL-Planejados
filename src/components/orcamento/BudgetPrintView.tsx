import React, { useState } from 'react';
import { Phone, Instagram, MapPin, Printer, X, Plus, Trash2, Save, CheckCircle2, Award } from 'lucide-react';
import { toast } from 'sonner';

interface BudgetPrintViewProps {
    budget: any;
    onClose: () => void;
    onSave?: (updatedBudget: any, updatedItems: any[]) => Promise<void>;
    budgetNumber?: number;
    initialTab?: 'commercial' | 'technical';
}

const BudgetPrintView = ({ budget: initialBudget, onClose, onSave, budgetNumber, initialTab = 'commercial' }: BudgetPrintViewProps) => {
    const [budget, setBudget] = useState({...initialBudget});
    const [isSaving, setIsSaving] = useState(false);
    
    const [ambientes, setAmbientes] = useState(() => {
        try {
            if (initialBudget.notes) {
                const parsed = JSON.parse(initialBudget.notes);
                if (parsed.ambientes && Array.isArray(parsed.ambientes)) return parsed.ambientes;
            }
        } catch (e) {}
        
        return [{
            id: `amb-${Date.now()}`,
            description: initialBudget.project_name || "Ambiente Geral",
            value: initialBudget.total_value / (1 + (parseFloat(initialBudget.card_fee_percent) || 11) / 100)
        }];
    });

    const [paymentTerms, setPaymentTerms] = useState(() => {
        try {
            if (initialBudget.notes) {
                const parsed = JSON.parse(initialBudget.notes);
                if (parsed.paymentTerms && Array.isArray(parsed.paymentTerms)) return parsed.paymentTerms;
            }
        } catch (e) {}
        return [
            "Entrada de 60% no fechamento do contrato.",
            "Saldo restante de 40% na data da entrega técnica.",
            "Prazo de entrega: A definir conforme cronograma."
        ];
    });

    const [techSpecs, setTechSpecs] = useState(() => {
        try {
            if (initialBudget.notes) {
                const parsed = JSON.parse(initialBudget.notes);
                if (parsed.techSpecs && Array.isArray(parsed.techSpecs)) return parsed.techSpecs;
            }
        } catch (e) {}
        return [
            "MDF Branco TX (Internos)",
            "Dobradiças Click Slow",
            "Corrediças Telespópicas",
            "Puxadores Perfil/Embutir"
        ];
    });

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    };

    const handleAmbienteChange = (id: string, field: string, value: any) => {
        setAmbientes(ambientes.map(amb => amb.id === id ? { ...amb, [field]: value } : amb));
    };

    const addAmbiente = () => {
        setAmbientes([...ambientes, { id: `amb-${Date.now()}`, description: "", value: 0 }]);
    };

    const removeAmbiente = (id: string) => {
        setAmbientes(ambientes.filter(amb => amb.id !== id));
    };

    const displayTotal = ambientes.reduce((acc: number, curr: any) => acc + (parseFloat(curr.value) || 0), 0);
    const cardValue = displayTotal * (1 + (parseFloat(budget.card_fee_percent) || 11) / 100);

    const handleSave = async () => {
        if (!onSave) return;
        setIsSaving(true);
        try {
            const notesObj = { ambientes, paymentTerms, techSpecs };
            const updatedBudget = {
                ...budget,
                notes: JSON.stringify(notesObj),
                total_value: cardValue, 
                total_cost: displayTotal
            };
            await onSave(updatedBudget, initialBudget.budget_items || []);
            toast.success("Orçamento salvo!");
        } catch (error) {
            console.error("Error saving budget:", error);
            toast.error("Erro ao salvar");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="budget-print-overlay fixed inset-0 z-[99999] bg-slate-900/90 backdrop-blur-sm overflow-y-auto p-4 md:p-10 print:p-0 print:bg-white print:relative print:overflow-visible flex justify-center">
            
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;900&display=swap');
                
                @media print {
                    @page { size: A4; margin: 0; }
                    body > * { display: none !important; }
                    body > .budget-print-overlay { display: block !important; visibility: visible !important; }
                    body { background: white !important; margin: 0 !important; padding: 0 !important; }
                    .budget-print-overlay { 
                        position: absolute !important;
                        left: 0 !important; top: 0 !important;
                        width: 100% !important; height: auto !important;
                        padding: 0 !important; margin: 0 !important;
                        display: block !important; background: white !important;
                        z-index: 99999 !important;
                    }
                    .no-print { display: none !important; }
                    .force-break-before { page-break-before: always !important; }
                    .budget-print-container { 
                        box-shadow: none !important; margin: 0 !important; width: 100% !important; 
                        max-width: none !important; border-radius: 0 !important;
                    }
                    input, textarea { border: none !important; background: transparent !important; }
                }

                .budget-print-container { font-family: 'Outfit', sans-serif; }
                .watermark-bg {
                    background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3z' fill='%23f59e0b' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E");
                }
            `}} />

            <div className="budget-print-container bg-white w-full max-w-[850px] shadow-2xl flex flex-col print:shadow-none min-h-screen watermark-bg relative">
                
                {/* 1. CABEÇALHO PREMIUM */}
                <div className="relative">
                    <div className="bg-[#0f172a] text-white h-20 flex items-center justify-center px-10 relative">
                        <div className="absolute left-10 top-2 h-36 w-36 rounded-full bg-black shadow-2xl z-20 flex items-center justify-center overflow-hidden border-2 border-[#f59e0b]">
                            <img src="/logo-bjl.png" alt="BJL" className="w-full h-full object-cover" />
                        </div>
                        <div className="ml-24 flex flex-col items-center">
                            <h1 className="text-2xl font-black uppercase tracking-[0.4em] leading-none mb-1">BJL PLANEJADOS</h1>
                            <p className="text-[9px] font-black text-[#f59e0b] tracking-[0.6em] uppercase opacity-80">Design & Sofisticação</p>
                        </div>
                        <div className="absolute right-10 flex flex-col items-end gap-1 font-semibold text-[10px]">
                            <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                                <Phone size={11} className="text-[#f59e0b]" /> (22) 99703-9852
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                                <Instagram size={11} className="text-[#f59e0b]" /> @bjlmoveisplanejados
                            </div>
                        </div>
                    </div>
                    <div className="h-8 bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-[#f59e0b] w-full" />
                    <div className="flex justify-end pr-10 pt-2 items-center gap-2">
                         <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">BJL Moveis Planejados e Marcenaria • Barão de Macaubas</span>
                         <MapPin size={11} className="text-slate-400" />
                    </div>
                </div>

                {/* 2. PROPOSTA COM DESIGN ARREDONDADO */}
                <div className="px-12 py-12 flex justify-between items-start">
                    <div className="bg-gradient-to-br from-[#f59e0b] to-[#d97706] rounded-[3rem] px-12 py-10 min-w-[480px] shadow-2xl shadow-orange-500/20 relative">
                        <div className="flex items-center gap-2 mb-3">
                             <Award size={14} className="text-white/60" />
                             <span className="text-[10px] font-black uppercase text-white/70 tracking-[0.2em] block">PROPOSTA CUSTOMIZADA</span>
                        </div>
                        <textarea 
                            value={budget.client_name}
                            onChange={(e) => setBudget({...budget, client_name: e.target.value})}
                            rows={1}
                            className="w-full bg-transparent border-none p-0 text-4xl font-black uppercase tracking-tight text-white focus:ring-0 resize-none overflow-hidden placeholder:text-white/30"
                            placeholder="NOME DO CLIENTE"
                        />
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 underline decoration-[#f59e0b] decoration-2 underline-offset-4">REF. DO PROJETO</p>
                        <p className="text-4xl font-black text-slate-900 leading-none">#{budgetNumber || "000"}</p>
                        <div className="mt-8">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">DATA DE VALIDADE</p>
                            <p className="text-sm font-black text-slate-700">{new Date().toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>
                </div>

                {/* 3. LISTA DE ITENS - DESIGN PREMIUM */}
                <div className="px-12 flex-1">
                    <div className="bg-[#0f172a] text-white px-10 py-6 flex justify-between items-center rounded-3xl mb-6 shadow-xl shadow-slate-900/10">
                        <div className="flex items-center gap-3">
                             <div className="w-2 h-8 bg-[#f59e0b] rounded-full" />
                             <span className="text-xs font-black uppercase tracking-[0.3em]">DETALHAMENTO TÉCNICO DOS AMBIENTES</span>
                        </div>
                        <button onClick={addAmbiente} className="no-print px-4 py-2 bg-[#f59e0b] text-[#0f172a] rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-amber-500/30">
                            <Plus size={16} /> ADICIONAR ITEM
                        </button>
                    </div>
                    
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-slate-100 h-14">
                                <th className="px-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">DESCRIÇÃO DO SERVIÇO</th>
                                <th className="px-6 text-right text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">VALOR UNITÁRIO</th>
                                <th className="w-8 no-print"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {ambientes.map((amb, index) => (
                                <tr key={amb.id} className="group hover:bg-slate-50/50 transition-all">
                                    <td className="py-8 px-6">
                                        <div className="flex gap-4">
                                            <span className="text-[10px] font-black text-[#f59e0b] opacity-40">0{index+1}.</span>
                                            <textarea 
                                                value={amb.description}
                                                onChange={(e) => handleAmbienteChange(amb.id, 'description', e.target.value)}
                                                rows={1}
                                                className="w-full bg-transparent border-none p-0 text-[15px] font-black text-slate-800 uppercase focus:ring-0 resize-y min-h-[24px] leading-relaxed"
                                                placeholder="DESCREVA O AMBIENTE..."
                                            />
                                        </div>
                                    </td>
                                    <td className="py-8 px-6 text-right align-top">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-[10px] font-black text-slate-300 no-print">R$</span>
                                            <input 
                                                type="number"
                                                value={amb.value}
                                                onChange={(e) => handleAmbienteChange(amb.id, 'value', parseFloat(e.target.value) || 0)}
                                                className="w-28 bg-transparent border-none p-0 text-right text-lg font-black text-slate-900 focus:ring-0 no-print"
                                            />
                                            <span className="hidden print:inline text-lg font-black text-slate-900">
                                                {formatCurrency(amb.value).replace('R$', '').trim()}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-2 no-print">
                                        <button onClick={() => removeAmbiente(amb.id)} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-3 hover:bg-rose-50 rounded-2xl">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 4. TOTAIS E CONDIÇÕES - NÍVEL LUXO */}
                <div className="px-12 py-14 mt-10 print:mt-10 force-break-before bg-slate-50/30">
                    <div className="flex flex-row justify-between gap-12">
                        {/* Esquerda: Condições e Specs */}
                        <div className="flex-1 space-y-12">
                            <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
                                <h3 className="text-[11px] font-black uppercase text-[#f59e0b] tracking-[0.3em] mb-8 flex items-center gap-3">
                                    <CheckCircle2 size={16} /> CONDIÇÕES DE PAGAMENTO
                                </h3>
                                <div className="space-y-4 pl-6">
                                    {paymentTerms.map((term, i) => (
                                        <div key={i} className="flex gap-4 items-center">
                                            <div className="w-1.5 h-1.5 bg-[#f59e0b]/30 rounded-full" />
                                            <input 
                                                value={term}
                                                onChange={(e) => {
                                                    const newTerms = [...paymentTerms];
                                                    newTerms[i] = e.target.value;
                                                    setPaymentTerms(newTerms);
                                                }}
                                                className="flex-1 bg-transparent border-none p-0 text-xs font-bold text-slate-600 uppercase focus:ring-0 leading-tight"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
                                <h3 className="text-[11px] font-black uppercase text-[#f59e0b] tracking-[0.3em] mb-8 flex items-center gap-3">
                                    <Award size={16} /> ESPECIFICAÇÕES TÉCNICAS
                                </h3>
                                <div className="grid grid-cols-2 gap-x-10 gap-y-4 pl-6">
                                    {techSpecs.map((spec, i) => (
                                        <div key={i} className="flex items-center gap-3 border-b border-slate-50 pb-2">
                                            <div className="w-3 h-[2px] bg-[#f59e0b]/50 rounded-full" />
                                            <input 
                                                value={spec}
                                                onChange={(e) => {
                                                    const newSpecs = [...techSpecs];
                                                    newSpecs[i] = e.target.value;
                                                    setTechSpecs(newSpecs);
                                                }}
                                                className="flex-1 bg-transparent border-none p-0 text-[10px] font-bold text-slate-500 uppercase focus:ring-0 placeholder:text-slate-200"
                                                placeholder="ADICIONE ESPECIFICAÇÃO..."
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* CAMPO DE ASSINATURA */}
                            <div className="pt-10 flex gap-10">
                                <div className="flex-1 text-center">
                                    <div className="h-[1px] bg-slate-200 w-full mb-3" />
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ASSINATURA DO CLIENTE</p>
                                </div>
                                <div className="flex-1 text-center">
                                    <div className="h-[1px] bg-slate-200 w-full mb-3" />
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">BJL PLANEJADOS</p>
                                </div>
                            </div>
                        </div>

                        {/* Direita: Cartão de Totais Glamour */}
                        <div className="w-[380px]">
                            <div className="bg-[#0f172a] text-white p-12 rounded-[3.5rem] shadow-[0_25px_50px_-12px_rgba(15,23,42,0.3)] relative overflow-hidden group border border-white/5">
                                <div className="relative z-10 flex flex-col gap-10">
                                    <div>
                                        <p className="text-[11px] font-black uppercase text-amber-500/50 tracking-[0.3em] mb-3">VALOR TOTAL À VISTA</p>
                                        <h4 className="text-5xl font-black tabular-nums tracking-tighter">{formatCurrency(displayTotal)}</h4>
                                    </div>
                                    
                                    <div className="h-[2px] bg-gradient-to-r from-[#f59e0b]/0 via-[#f59e0b]/20 to-[#f59e0b]/0 w-full" />
                                    
                                    <div>
                                        <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em] mb-4">OPÇÃO DE PARCELAMENTO</p>
                                        <div className="flex items-center gap-2 mb-3">
                                             <CheckCircle2 size={12} className="text-amber-500" />
                                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ATÉ 10X S/ JUROS NO CARTÃO</p>
                                        </div>
                                        <h5 className="text-4xl font-black text-[#f59e0b] tabular-nums tracking-tighter">{formatCurrency(cardValue)}</h5>
                                        <div className="mt-12 flex flex-col items-center gap-2">
                                            <div className="w-16 h-1 bg-white/5 rounded-full" />
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] text-center">PROPOSTA EXCLUSIVA</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute -top-10 -right-10 opacity-[0.03] pointer-events-none transition-transform group-hover:scale-110 duration-700">
                                    <Printer size={250} />
                                </div>
                            </div>
                            <p className="text-center text-[9px] font-black uppercase text-slate-400 mt-10 tracking-[0.5em] opacity-50">BJL PLANEJADOS • MARMORARIA & MARCENARIA</p>
                        </div>
                    </div>
                </div>
                
                {/* RODAPÉ ELEGANTE */}
                <div className="mt-auto px-12 py-10 border-t border-slate-100 flex justify-between items-center opacity-70">
                    <div className="text-[10px] font-bold text-slate-400">
                        Obrigado por escolher a BJL Planejados. <br />Qualidade e precisão em cada detalhe.
                    </div>
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                            <Phone size={14} className="text-slate-300" />
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                            <Instagram size={14} className="text-slate-300" />
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTROLES FLUTUANTES NO-PRINT */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex gap-4 no-print z-[999999] bg-[#0f172a]/90 backdrop-blur-2xl p-6 rounded-[3rem] border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] scale-90 md:scale-100">
                <button onClick={onClose} className="px-8 py-4 bg-white/5 text-white/50 rounded-2xl font-black uppercase text-xs hover:bg-rose-500/20 hover:text-rose-500 transition-all flex items-center gap-3 border border-white/5">
                    <X size={20} /> FECHAR
                </button>
                <div className="w-[1px] h-12 bg-white/10 self-center" />
                <button onClick={handleSave} disabled={isSaving} className="px-10 py-4 bg-emerald-500/20 text-emerald-400 rounded-2xl font-black uppercase text-xs hover:bg-emerald-500 hover:text-white active:scale-95 transition-all flex items-center gap-3 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                    <Save size={20} /> {isSaving ? "SALVANDO..." : "SALVAR PROPOSTA"}
                </button>
                <button onClick={() => window.print()} className="px-14 py-4 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-[#0f172a] rounded-2xl font-black uppercase text-xs hover:scale-110 active:scale-95 transition-all flex items-center gap-3 shadow-[0_15px_30px_-5px_rgba(245,158,11,0.4)]">
                    <Printer size={20} /> GERAR PDF / IMPRIMIR
                </button>
            </div>
        </div>
    );
};

export default BudgetPrintView;
