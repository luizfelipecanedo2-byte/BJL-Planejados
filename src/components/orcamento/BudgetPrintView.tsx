import React, { useState } from 'react';
import { Phone, Instagram, MapPin, Printer, X, Plus, Trash2, Save } from 'lucide-react';
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
            ""
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
                .logo-container { filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1)); }
            `}} />

            <div className="budget-print-container bg-white w-full max-w-[850px] shadow-2xl flex flex-col print:shadow-none min-h-screen font-sans">
                
                {/* 1. CABEÇALHO ESTILIZADO (IGUAL IMAGEM) */}
                <div className="relative">
                    <div className="bg-[#0f172a] text-white h-16 flex items-center justify-center px-10 relative">
                        <div className="absolute left-10 top-2 h-32 w-32 rounded-full bg-white p-1 shadow-xl z-20 logo-container flex items-center justify-center overflow-hidden border-2 border-[#f59e0b]">
                            <img src="/logo-bjl.png" alt="BJL" className="w-[85%] h-[85%] object-contain" />
                        </div>
                        <h1 className="text-xl font-black uppercase tracking-[0.2em] ml-28">BJL PLANEJADOS</h1>
                        <div className="absolute right-10 flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1 text-[9px] font-bold bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                                <Phone size={10} className="text-[#f59e0b]" /> (22) 99703-9852
                            </div>
                            <div className="flex items-center gap-1 text-[9px] font-bold bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                                <Instagram size={10} className="text-[#f59e0b]" /> @bjlmoveisplanejados
                            </div>
                        </div>
                    </div>
                    <div className="h-6 bg-[#f59e0b] w-full" />
                    <div className="flex justify-end pr-10 pt-2 items-center gap-2">
                         <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Rua Maria Vitipó Raposo, n°138, Barão de Macaubas</span>
                         <MapPin size={10} className="text-slate-400" />
                    </div>
                </div>

                {/* 2. PROPOSTA PARA (PÍLULA LARANJA) */}
                <div className="px-10 py-8 flex justify-between items-start">
                    <div className="bg-[#f59e0b] rounded-[2rem] px-10 py-6 min-w-[400px] shadow-lg shadow-orange-500/10">
                        <span className="text-[10px] font-black uppercase text-white/80 tracking-widest block mb-2">PROPOSTA PARA</span>
                        <textarea 
                            value={budget.client_name}
                            onChange={(e) => setBudget({...budget, client_name: e.target.value})}
                            rows={1}
                            className="w-full bg-transparent border-none p-0 text-3xl font-black uppercase tracking-tight text-white focus:ring-0 resize-none overflow-hidden"
                            placeholder="NOME DO CLIENTE"
                        />
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">ORÇAMENTO REF.</p>
                        <p className="text-3xl font-black text-slate-900 leading-none">#{budgetNumber || "000"}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">EMITIDO EM</p>
                        <p className="text-xs font-black text-slate-700">{new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>

                {/* 3. LISTA DE ITENS */}
                <div className="px-10 flex-1">
                    <div className="bg-[#1e293b] text-white px-8 py-4 flex justify-between items-center rounded-2xl mb-4">
                        <span className="text-xs font-black uppercase tracking-[0.2em]">DESCRIÇÃO DOS AMBIENTES E SERVIÇOS</span>
                        <button onClick={addAmbiente} className="no-print p-2 bg-[#f59e0b] text-black rounded-lg text-[10px] font-black uppercase flex items-center gap-1 hover:scale-105 transition-all">
                            <Plus size={14} /> NOVO AMBIENTE
                        </button>
                    </div>
                    
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100 h-12">
                                <th className="px-4 text-left text-[9px] font-black uppercase text-slate-400 tracking-widest">AMBIENTE / DETALHAMENTO</th>
                                <th className="px-4 text-right text-[9px] font-black uppercase text-slate-400 tracking-widest">INVESTIMENTO (A VISTA)</th>
                                <th className="w-8 no-print"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {ambientes.map((amb) => (
                                <tr key={amb.id} className="group transition-all">
                                    <td className="py-6 px-4">
                                        <textarea 
                                            value={amb.description}
                                            onChange={(e) => handleAmbienteChange(amb.id, 'description', e.target.value)}
                                            rows={1}
                                            className="w-full bg-transparent border-none p-0 text-sm font-black text-slate-700 uppercase focus:ring-0 resize-y min-h-[24px] leading-relaxed"
                                            placeholder="DESCRIÇÃO DO AMBIENTE..."
                                        />
                                    </td>
                                    <td className="py-6 px-4 text-right align-top">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-[10px] font-black text-slate-200 no-print">R$</span>
                                            <input 
                                                type="number"
                                                value={amb.value}
                                                onChange={(e) => handleAmbienteChange(amb.id, 'value', parseFloat(e.target.value) || 0)}
                                                className="w-24 bg-transparent border-none p-0 text-right text-base font-black text-slate-900 focus:ring-0 no-print"
                                            />
                                            {/* Versão para Impressão */}
                                            <span className="hidden print:inline text-base font-black text-slate-800">
                                                {formatCurrency(amb.value).replace('R$', '').trim()}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-2 no-print">
                                        <button onClick={() => removeAmbiente(amb.id)} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-rose-50 rounded-lg">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 4. TOTAIS E ESPECIFICAÇÕES (IGUAL A IMAGEM) */}
                <div className="px-10 py-10 bg-slate-50/50 mt-10 print:bg-white print:mt-0 force-break-before">
                    <div className="flex flex-col md:flex-row justify-between gap-10">
                        {/* Esquerda: Condições e Specs */}
                        <div className="flex-1 space-y-10">
                            <div>
                                <h3 className="text-[10px] font-black uppercase text-[#f59e0b] tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-[#f59e0b] rounded-full" /> CONDIÇÕES DE PAGAMENTO
                                </h3>
                                <div className="space-y-3 pl-6">
                                    {paymentTerms.map((term, i) => (
                                        <div key={i} className="flex gap-3">
                                            <span className="text-[9px] font-black text-[#f59e0b] opacity-50">0{i+1}.</span>
                                            <input 
                                                value={term}
                                                onChange={(e) => {
                                                    const newTerms = [...paymentTerms];
                                                    newTerms[i] = e.target.value;
                                                    setPaymentTerms(newTerms);
                                                }}
                                                className="flex-1 bg-transparent border-none p-0 text-[10px] font-bold text-slate-600 uppercase focus:ring-0 leading-tight"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black uppercase text-[#f59e0b] tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-[#f59e0b] rounded-full" /> ESPECIFICAÇÕES TÉCNICAS
                                </h3>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-3 pl-6">
                                    {techSpecs.map((spec, i) => (
                                        <div key={i} className="flex items-center gap-2 border-b border-slate-100 pb-1">
                                            <div className="w-2 h-[1px] bg-slate-300" />
                                            <input 
                                                value={spec}
                                                onChange={(e) => {
                                                    const newSpecs = [...techSpecs];
                                                    newSpecs[i] = e.target.value;
                                                    setTechSpecs(newSpecs);
                                                }}
                                                className="flex-1 bg-transparent border-none p-0 text-[9px] font-bold text-slate-500 uppercase focus:ring-0"
                                                placeholder="..."
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Direita: Cartão de Totais (IGUAL A IMAGEM) */}
                        <div className="w-full md:w-[350px]">
                            <div className="bg-[#0f172a] text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                                <div className="relative z-10 flex flex-col gap-8">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">TOTAL À VISTA</p>
                                        <h4 className="text-5xl font-black tabular-nums">{formatCurrency(displayTotal)}</h4>
                                    </div>
                                    
                                    <div className="h-[1px] bg-white/10 w-full" />
                                    
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">TOTAL PARCELADO</p>
                                        <p className="text-[9px] font-bold text-slate-500 mb-2 uppercase">EM ATÉ 10X NO CARTÃO</p>
                                        <h5 className="text-4xl font-black text-[#f59e0b] tabular-nums">{formatCurrency(cardValue)}</h5>
                                        <div className="mt-8 pt-4 border-t border-white/5 flex justify-center">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">VALIDADE: 07 DIAS</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-10 right-10 opacity-5 pointer-events-none transition-transform group-hover:scale-110 duration-700">
                                    <Printer size={120} />
                                </div>
                            </div>
                            <p className="text-center text-[8px] font-black uppercase text-slate-300 mt-6 tracking-[0.3em]">BJL PLANEJADOS • QUALIDADE & PRECISÃO</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTROLES FLUTUANTES NO-PRINT */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex gap-4 no-print z-[999999] bg-[#0f172a]/80 backdrop-blur-xl p-5 rounded-[2rem] border border-white/10 shadow-2xl scale-90 md:scale-100">
                <button onClick={onClose} className="px-8 py-3 bg-white/5 text-white/70 rounded-2xl font-black uppercase text-xs hover:bg-rose-500 hover:text-white transition-all flex items-center gap-3 border border-white/5">
                    <X size={18} /> FECHAR
                </button>
                <div className="w-[1px] h-10 bg-white/10 self-center" />
                <button onClick={handleSave} disabled={isSaving} className="px-10 py-3 bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shadow-lg shadow-emerald-500/20">
                    <Save size={18} /> {isSaving ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
                </button>
                <button onClick={() => window.print()} className="px-12 py-3 bg-[#f59e0b] text-[#0f172a] rounded-2xl font-black uppercase text-xs hover:scale-110 active:scale-95 transition-all flex items-center gap-3 shadow-lg shadow-[#f59e0b]/20">
                    <Printer size={18} /> GERAR PDF / IMPRIMIR
                </button>
            </div>
        </div>
    );
};

export default BudgetPrintView;
