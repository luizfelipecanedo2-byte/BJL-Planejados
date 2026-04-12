import React from 'react';
import { formatCurrency } from '@/lib/salesUtils';
import { Award, Trash2 } from 'lucide-react';

interface Ambiente {
    id: string;
    description: string;
    value: number;
}

interface BudgetPrintViewProps {
    budget: any;
    ambientes?: Ambiente[];
    setBudget?: (budget: any) => void;
    handleAmbienteChange?: (id: string, field: string, value: any) => void;
    removeAmbiente?: (id: string) => void;
    budgetNumber?: string | number;
    initialTab?: 'commercial' | 'technical';
    onClose?: () => void;
    onSave?: (budget: any, items: any[]) => void;
}

const BudgetPrintView: React.FC<BudgetPrintViewProps> = ({
    budget: initialBudget,
    ambientes: initialAmbientes,
    setBudget: externalSetBudget,
    handleAmbienteChange: externalHandleAmbienteChange,
    removeAmbiente: externalRemoveAmbiente,
    budgetNumber,
    onClose,
    onSave
}) => {
    const [budget, setLocalBudget] = React.useState(initialBudget);
    const [ambientes, setLocalAmbientes] = React.useState<Ambiente[]>(initialAmbientes || [
        { id: '1', description: 'MARCENARIA SOB MEDIDA', value: initialBudget.total_value || 0 }
    ]);

    const handleBudgetChange = (newBudget: any) => {
        setLocalBudget(newBudget);
        if (externalSetBudget) externalSetBudget(newBudget);
    };

    const handleLocalAmbienteChange = (id: string, field: string, value: any) => {
        const newAmbientes = ambientes.map(amb => 
            amb.id === id ? { ...amb, [field]: value } : amb
        );
        setLocalAmbientes(newAmbientes);
        if (externalHandleAmbienteChange) externalHandleAmbienteChange(id, field, value);
    };

    const handleLocalRemoveAmbiente = (id: string) => {
        const newAmbientes = ambientes.filter(amb => amb.id !== id);
        setLocalAmbientes(newAmbientes);
        if (externalRemoveAmbiente) externalRemoveAmbiente(id);
    };

    const addAmbiente = () => {
        const newAmbiente = {
            id: Math.random().toString(36).substr(2, 9),
            description: '',
            value: 0
        };
        setLocalAmbientes([...ambientes, newAmbiente]);
    };

    const totalValue = ambientes.reduce((acc, curr) => acc + curr.value, 0);
    const installmentValue = totalValue * 1.11; // 11% fee for installments

    const paymentTerms = [
        "01. ENTRADA DE 60% NO FECHAMENTO DO CONTRATO.",
        "02. SALDO RESTANTE DE 40% NA DATA DA ENTREGA TÉCNICA.",
        "03. PRAZO DE ENTREGA: A DEFINIR CONFORME CRONOGRAMA."
    ];

    const techSpecs = [
        "MDF BRANCO TX (INTERNOS)",
        "DOBRADIÇAS CLICK SLOW",
        "CORREDIÇAS TELESCÓPICAS"
    ];

    return (
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-100/95 backdrop-blur-sm py-12 px-4 no-print flex justify-center animate-in fade-in duration-300">
            {/* DOCUMENT CONTAINER */}
            <div className="bg-white shadow-[0_0_50px_rgba(0,0,0,0.1)] w-full max-w-[210mm] min-h-[297mm] text-slate-900 relative print:shadow-none print:m-0 print:w-full font-['Outfit'] overflow-hidden">
                
                {/* 1. CABEÇALHO PREMIUM */}
                <div className="relative">
                    <div className="bg-[#0f172a] text-white h-20 flex items-center justify-center px-10 relative">
                        <div className="absolute left-10 top-2 h-36 w-36 rounded-full bg-black shadow-2xl z-20 flex items-center justify-center overflow-hidden border-2 border-[#f59e0b]">
                            <img src="/logo-bjl.png" alt="BJL" className="w-full h-full object-cover" />
                        </div>
                        <div className="ml-24 flex flex-col items-center">
                            <h1 className="text-2xl font-black uppercase tracking-[0.4em] leading-none mb-1">BJL PLANEJADOS</h1>
                            <p className="text-[10px] font-black text-[#f59e0b] tracking-[0.6em] uppercase opacity-80">Marcenaria de Alto Padrão</p>
                        </div>
                        <div className="absolute right-10 flex flex-col items-end gap-1 font-semibold text-[10px]">
                            <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                                <span>(22) 99703-9852</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                                <span>@bjlmoveisplanejados</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-8 bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-[#f59e0b] w-full"></div>
                    <div className="flex justify-end pr-12 pt-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        BJL Moveis Planejados e Marcenaria • Barão de Macaubas
                    </div>
                </div>

                {/* 2. PROPOSTA COM DESIGN ARREDONDADO */}
                <div className="px-12 py-10 flex justify-between items-start">
                    <div className="bg-gradient-to-br from-[#f59e0b] to-[#d97706] rounded-[2.5rem] px-12 py-8 min-w-[480px] shadow-2xl shadow-orange-500/20 relative">
                        <div className="flex items-center gap-2 mb-3">
                             <Award size={14} className="text-white/60" />
                             <span className="text-[10px] font-black uppercase text-white/70 tracking-[0.2em] block">PROPOSTA COMERCIAL PARA</span>
                        </div>
                        <textarea 
                            value={budget.client_name}
                            onChange={(e) => handleBudgetChange({...budget, client_name: e.target.value})}
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

                {/* 3. LISTA DE AMBIENTES - TABELA CLEAN */}
                <div className="px-16 mt-4">
                    <div className="bg-[#0f172a] text-white px-10 py-5 rounded-2xl mb-8 flex justify-between shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-[#f59e0b] rounded-full"></div>
                            <span className="text-[11px] font-black uppercase tracking-[0.3em]">DETALHAMENTO DOS AMBIENTES</span>
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-[0.3em]">VALOR À VISTA</span>
                    </div>

                    <table className="w-full border-separate border-spacing-0">
                        <tbody className="space-y-4">
                            {ambientes.map((amb, index) => (
                                <tr key={amb.id} className="group transition-all bg-slate-50/80 rounded-2xl overflow-hidden block mb-4 border border-slate-100">
                                    <td className="py-6 px-8 block md:table-cell">
                                        <div className="flex gap-4">
                                            <span className="text-[10px] font-black text-[#f59e0b] opacity-40">0{index+1}.</span>
                                            <textarea 
                                                value={amb.description}
                                                onChange={(e) => handleLocalAmbienteChange(amb.id, 'description', e.target.value)}
                                                rows={1}
                                                className="w-full bg-transparent border-none p-0 text-[15px] font-black text-slate-800 uppercase focus:ring-0 resize-y min-h-[24px] leading-relaxed"
                                                placeholder="DESCREVA O AMBIENTE..."
                                            />
                                        </div>
                                    </td>
                                    <td className="py-6 px-8 text-right align-top block md:table-cell border-t md:border-t-0 border-slate-100 bg-slate-100/20 md:bg-transparent min-w-[160px]">
                                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                                            <span className="text-[10px] font-black text-slate-300 no-print">R$</span>
                                            <input 
                                                type="number"
                                                value={amb.value}
                                                onChange={(e) => handleLocalAmbienteChange(amb.id, 'value', parseFloat(e.target.value) || 0)}
                                                className="w-28 bg-transparent border-none p-0 text-right text-base font-black text-slate-900 focus:ring-0 no-print"
                                            />
                                            <span className="hidden print:inline text-base font-black text-slate-900">
                                                {formatCurrency(amb.value)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-2 no-print absolute right-2 top-2">
                                        <button onClick={() => handleLocalRemoveAmbiente(amb.id)} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-rose-50 rounded-xl">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="mt-4 no-print flex justify-center">
                        <button 
                            onClick={addAmbiente}
                            className="text-[10px] font-black uppercase text-primary hover:bg-primary/5 px-6 py-2 rounded-full border border-primary/20 transition-all"
                        >
                            + Adicionar Ambiente
                        </button>
                    </div>
                </div>

                {/* 4. TOTAIS E CONDIÇÕES - DESIGN IMPACTANTE */}
                <div className="px-16 py-8 mt-4 bg-slate-50/50 break-inside-avoid">
                    <div className="flex flex-row justify-between gap-12">
                        {/* CONDIÇÕES LADO ESQUERDO */}
                        <div className="flex-1 space-y-8">
                            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
                                <h3 className="text-[11px] font-black uppercase text-[#f59e0b] tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <div className="w-4 h-[2px] bg-[#f59e0b]"></div> CONDIÇÕES DE PAGAMENTO
                                </h3>
                                <div className="space-y-3 pl-6 border-l-2 border-slate-100 italic font-bold text-[10px] text-slate-600 uppercase">
                                    {paymentTerms.map((term, i) => (
                                        <div key={i}>{term}</div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
                                <h3 className="text-[11px] font-black uppercase text-[#f59e0b] tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <div className="w-4 h-[2px] bg-[#f59e0b]"></div> ESPECIFICAÇÕES TÉCNICAS
                                </h3>
                                <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-slate-100 font-bold text-[9px] text-slate-400 uppercase">
                                    {techSpecs.map((spec, i) => (
                                        <div key={i}>• {spec}</div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* CARTÃO DE TOTAIS LADO DIREITO */}
                        <div className="w-[300px] shrink-0">
                            <div className="bg-[#0f172a] text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden h-full flex flex-col justify-center border-2 border-white/5">
                                {/* Watermark subtle background */}
                                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#f59e0b] opacity-[0.03] rounded-full blur-3xl"></div>
                                
                                <div className="relative z-10 flex flex-col gap-6">
                                    <div className="border-l-2 border-[#f59e0b] pl-4">
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">TOTAL À VISTA</p>
                                        <h4 className="text-2xl font-black whitespace-nowrap">{formatCurrency(totalValue)}</h4>
                                    </div>

                                    <div className="h-[1px] bg-white/10 w-full"></div>

                                    <div className="border-l-2 border-slate-600 pl-4">
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">PARCELADO (10X)</p>
                                        <h5 className="text-xl font-black text-[#f59e0b] whitespace-nowrap">{formatCurrency(installmentValue)}</h5>
                                    </div>
                                </div>
                                <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest text-center mt-8">VALIDADE DA PROPOSTA: 07 DIAS</p>
                            </div>
                            <p className="text-[7px] font-black uppercase text-slate-300 mt-4 tracking-[0.4em] text-center italic">BJL PLANEJADOS • QUALIDADE QUE PERMANECE</p>
                        </div>
                    </div>
                </div>

                {/* WATERMARK BACKGROUND DECORATION */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none -rotate-12 select-none z-0">
                    <h1 className="text-[200px] font-black">BJL</h1>
                </div>

                <div className="text-center py-12 no-print flex flex-col items-center gap-6">
                    <div className="flex gap-4">
                        {onClose && (
                            <button 
                                onClick={onClose}
                                className="bg-slate-200 text-slate-600 px-12 py-5 rounded-full font-black uppercase tracking-[0.3em] hover:bg-slate-300 transition-all active:scale-95"
                            >
                                Voltar
                            </button>
                        )}
                        <button 
                            onClick={() => window.print()}
                            className="bg-[#0f172a] text-white px-12 py-5 rounded-full font-black uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-2xl shadow-slate-900/20 active:scale-95"
                        >
                            IMPRIMIR PROPOSTA
                        </button>
                    </div>
                    
                    {onSave && (
                        <button 
                            onClick={() => onSave(budget, ambientes.map(a => ({ 
                                material_name: a.description, 
                                quantity: 1, 
                                unit_price_at_time: a.value, 
                                total_price: a.value 
                            })))}
                            className="bg-emerald-600 text-white px-12 py-4 rounded-full font-black uppercase tracking-[0.3em] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/20 active:scale-95 text-xs"
                        >
                            Salvar Alterações no Orçamento
                        </button>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;900&display=swap');
                @media print {
                    @page { size: A4; margin: 0; }
                    body * { visibility: hidden; }
                    .print\\:m-0, .print\\:m-0 * { visibility: visible; }
                    .print\\:m-0 { position: absolute; left: 0; top: 0; width: 100%; margin: 0 !important; padding: 0 !important; }
                    .no-print { display: none !important; }
                    textarea { border: none !important; resize: none !important; }
                    .break-inside-avoid { break-inside: avoid; }
                }
            `}} />
        </div>
    );
};

export default BudgetPrintView;
