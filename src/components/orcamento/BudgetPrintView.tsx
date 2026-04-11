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

const BudgetPrintView = ({ budget: initialBudget, onClose, onSave, budgetNumber }: BudgetPrintViewProps) => {
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
            "Entrada de 50% no fechamento do contrato (TED/PIX).",
            "Saldo restante de 50% na data da entrega técnica.",
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
            "MDF Branco TX (Interno)",
            "Dobradiças Amortecedor",
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
        } catch (error) {
            console.error("Error saving budget:", error);
            toast.error("Erro ao salvar");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="budget-print-overlay fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-sm overflow-y-auto p-4 md:p-10 print:p-0 print:bg-white print:relative print:overflow-visible flex justify-center">
            
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: A4; margin: 0; }
                    body { background: white !important; margin: 0 !important; }
                    .budget-print-overlay { padding: 0 !important; display: block !important; position: static !important; }
                    .budget-print-container { 
                        box-shadow: none !important; 
                        margin: 0 !important; 
                        width: 100% !important; 
                        max-width: none !important;
                        border-radius: 0 !important;
                    }
                    .no-print { display: none !important; }
                    .force-break-before { page-break-before: always !important; }
                    .page-container { padding: 40px !important; }
                }
            `}} />

            <div className="budget-print-container bg-white w-full max-w-[850px] shadow-2xl flex flex-col print:shadow-none min-h-screen">
                
                {/* 1. CABEÇALHO ROBUSTO */}
                <div className="bg-slate-950 text-white p-8 flex justify-between items-center border-b-[8px] border-amber-500">
                    <div className="flex items-center gap-6">
                        <div className="h-32 w-32 rounded-full overflow-hidden bg-white flex items-center justify-center p-1 shadow-lg border-2 border-amber-500">
                            <img src="/logo-bjl.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">BJL Planejados</h1>
                            <p className="text-amber-500 font-bold uppercase tracking-widest text-xs mt-2">Qualidade & Precisão em Marcenaria</p>
                        </div>
                    </div>
                    <div className="text-right space-y-1">
                        <div className="flex items-center justify-end gap-2 text-sm font-bold opacity-90">
                            <Phone size={14} className="text-amber-500" /> (22) 99703-9852
                        </div>
                        <div className="flex items-center justify-end gap-2 text-sm font-bold opacity-90">
                            <Instagram size={14} className="text-amber-500" /> @bjlmoveisplanejados
                        </div>
                        <div className="flex items-center justify-end gap-2 text-xs opacity-70 mt-4 max-w-[200px]">
                            Rua Maria Vitipó Raposo, n°138, Barão de Macaubas <MapPin size={12} />
                        </div>
                    </div>
                </div>

                {/* 2. INFORMAÇÕES DO CLIENTE */}
                <div className="p-10 pb-4">
                    <div className="flex justify-between items-end border-b-2 border-slate-100 pb-6">
                        <div className="flex-1">
                            <h2 className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-2">Proposta para Cliente</h2>
                            <textarea 
                                value={budget.client_name}
                                onChange={(e) => setBudget({...budget, client_name: e.target.value})}
                                rows={1}
                                className="w-full bg-transparent border-none p-0 text-3xl font-black uppercase tracking-tight text-slate-900 focus:ring-0 resize-none overflow-hidden"
                            />
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Orçamento Ref.</p>
                            <p className="text-xl font-black text-slate-900">#{budgetNumber || "0000"}</p>
                            <p className="text-[10px] font-bold text-slate-500 mt-2">{new Date().toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>
                </div>

                {/* 3. LISTA DE ITENS (AMBIEBTES) */}
                <div className="p-10 flex-1">
                    <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
                        <span className="text-[10px] font-bold uppercase tracking-widest">Descrição detalhada dos serviços</span>
                        <button onClick={addAmbiente} className="no-print p-2 bg-amber-500 text-black rounded text-[10px] font-bold uppercase flex items-center gap-1">
                            <Plus size={12} /> Novo Ambiente
                        </button>
                    </div>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 text-left text-[10px] font-black uppercase text-slate-500 w-[75%]">Ambiente / Detalhamento</th>
                                <th className="p-4 text-right text-[10px] font-black uppercase text-slate-500">Valor (À Vista)</th>
                                <th className="w-8 no-print"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {ambientes.map((amb) => (
                                <tr key={amb.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                                    <td className="p-4">
                                        <textarea 
                                            value={amb.description}
                                            onChange={(e) => handleAmbienteChange(amb.id, 'description', e.target.value)}
                                            rows={1}
                                            className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-800 uppercase focus:ring-0 resize-y min-h-[30px]"
                                            placeholder="Descreva o ambiente e o serviço..."
                                        />
                                    </td>
                                    <td className="p-4 text-right align-top">
                                        <div className="flex items-center justify-end gap-1">
                                            <span className="no-print text-xs text-slate-300">R$</span>
                                            <input 
                                                type="number"
                                                value={amb.value}
                                                onChange={(e) => handleAmbienteChange(amb.id, 'value', parseFloat(e.target.value) || 0)}
                                                className="w-24 bg-transparent border-none p-0 text-right text-base font-black text-slate-900 focus:ring-0 print-hidden-input"
                                            />
                                            {/* Versão para Impressão */}
                                            <span className="hidden print:inline text-lg font-black text-slate-900">
                                                {formatCurrency(amb.value)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-2 no-print">
                                        <button onClick={() => removeAmbiente(amb.id)} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 4. RODAPÉ DE TOTAIS E CONDIÇÕES (EM NOVA PÁGINA SE NECESSÁRIO) */}
                <div className="force-break-before p-10 bg-slate-50 border-t border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
                        {/* Termos e Condições */}
                        <div className="md:col-span-3 space-y-10">
                            <div>
                                <h3 className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span> Condições de Pagamento
                                </h3>
                                <div className="space-y-4 pl-4 border-l-2 border-amber-100">
                                    {paymentTerms.map((term, i) => (
                                        <input 
                                            key={`pt-${i}`}
                                            value={term}
                                            onChange={(e) => {
                                                const newTerms = [...paymentTerms];
                                                newTerms[i] = e.target.value;
                                                setPaymentTerms(newTerms);
                                            }}
                                            className="w-full bg-transparent border-none p-0 text-xs font-bold text-slate-700 uppercase focus:ring-0 mb-1"
                                        />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span> Especificações Técnicas
                                </h3>
                                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-amber-100">
                                    {techSpecs.map((spec, i) => (
                                        <input 
                                            key={`ts-${i}`}
                                            value={spec}
                                            onChange={(e) => {
                                                const newSpecs = [...techSpecs];
                                                newSpecs[i] = e.target.value;
                                                setTechSpecs(newSpecs);
                                            }}
                                            className="w-full bg-transparent border-none p-0 text-[10px] font-bold text-slate-500 uppercase focus:ring-0"
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Quadros de Totais */}
                        <div className="md:col-span-2">
                            <div className="bg-slate-950 text-white p-8 rounded-2xl shadow-xl flex flex-col gap-6 relative overflow-hidden">
                                <div className="z-10">
                                    <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest mb-2">Total à Vista</p>
                                    <h4 className="text-4xl font-black tabular-nums">{formatCurrency(displayTotal)}</h4>
                                </div>
                                <div className="border-t border-white/10 pt-6 z-10">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Opção Parcelada</p>
                                        <div className="flex items-center gap-1 no-print">
                                            <input 
                                                type="number"
                                                value={budget.card_fee_percent || 11}
                                                onChange={(e) => setBudget({...budget, card_fee_percent: parseFloat(e.target.value) || 0})}
                                                className="w-8 bg-transparent text-amber-500 font-bold text-right focus:ring-0 border-none p-0"
                                            />
                                            <span className="text-xs text-slate-600">%</span>
                                        </div>
                                    </div>
                                    <h5 className="text-2xl font-black text-amber-500 tabular-nums">{formatCurrency(cardValue)}</h5>
                                    <p className="text-[9px] text-slate-500 uppercase mt-2">Em até 10x s/ juros no cartão</p>
                                </div>
                                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                    <Printer size={80} />
                                </div>
                                <p className="text-[9px] font-bold text-center mt-6 text-slate-500 uppercase tracking-[0.2em]">Validade da Proposta: 07 Dias</p>
                            </div>
                            <p className="text-center text-[8px] font-black uppercase text-slate-300 mt-6 tracking-widest">BJL Planejados • Qualidade & Precisão</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTROLES FLUTUANTES NO-PRINT */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex gap-4 no-print z-[99999] bg-slate-900/60 backdrop-blur-md p-4 rounded-full border border-white/10 shadow-2xl">
                <button onClick={onClose} className="px-6 py-2 bg-white/10 text-white rounded-full font-bold uppercase text-xs hover:bg-rose-500 transition-all flex items-center gap-2">
                    <X size={16} /> Fechar
                </button>
                <div className="w-[1px] h-8 bg-white/20" />
                <button onClick={handleSave} disabled={isSaving} className="px-8 py-2 bg-emerald-500 text-white rounded-full font-bold uppercase text-xs hover:scale-105 transition-all flex items-center gap-2">
                    <Save size={16} /> {isSaving ? "Salvando..." : "Salvar"}
                </button>
                <button onClick={() => window.print()} className="px-10 py-2 bg-amber-500 text-black rounded-full font-bold uppercase text-xs hover:scale-105 transition-all flex items-center gap-2">
                    <Printer size={16} /> Gerar PDF / Imprimir
                </button>
            </div>
        </div>
    );
};

export default BudgetPrintView;
