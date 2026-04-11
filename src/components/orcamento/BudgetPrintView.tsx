import React, { useState } from 'react';
import { Phone, Instagram, MapPin, Printer, X, Pencil, RotateCcw, Plus, Trash2, Save } from 'lucide-react';
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
    
    // We only keep the manual ambientes/serviços view
    const [ambientes, setAmbientes] = useState(() => {
        try {
            if (initialBudget.notes) {
                const parsed = JSON.parse(initialBudget.notes);
                if (parsed.ambientes && Array.isArray(parsed.ambientes)) {
                    return parsed.ambientes;
                }
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

    const handlePrint = () => {
        window.print();
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

    const handleSave = async () => {
        if (!onSave) return;
        
        setIsSaving(true);
        try {
            const totalCostAtVista = displayTotal;
            const cardFeePercent = parseFloat(budget.card_fee_percent) || 0;
            const totalValueWithCardFee = totalCostAtVista * (1 + cardFeePercent / 100);
            
            const budgetMarkupFactor = budget.markup_factor || 1;
            
            const notesObj = {
                ambientes,
                paymentTerms,
                techSpecs
            };

            const updatedBudget = {
                ...budget,
                notes: JSON.stringify(notesObj),
                total_value: totalValueWithCardFee, 
                total_cost: totalCostAtVista / budgetMarkupFactor 
            };

            await onSave(updatedBudget, initialBudget.budget_items || []);
        } catch (error) {
            console.error("Error saving budget from view:", error);
            toast.error("Erro ao salvar as alterações");
        } finally {
            setIsSaving(false);
        }
    };

    const cardValue = displayTotal * (1 + (parseFloat(budget.card_fee_percent) || 11) / 100);

    return (
        <div className="budget-print-overlay fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-sm overflow-y-auto p-4 md:p-10 print:p-0 print:bg-white print:relative print:z-0 print:overflow-visible">
            {/* Custom Print Styles Injection */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }

                    /* General Print Reset */
                    html, body {
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    /* Hide UI elements */
                    .print-hidden, 
                    button, 
                    .print\:hidden,
                    nav,
                    header:not(.budget-print-container header),
                    footer:not(.budget-print-container footer) {
                        display: none !important;
                    }
                    
                    /* Reset everything except our target */
                    body {
                        visibility: hidden !important;
                        background: white !important;
                    }
                    
                    .budget-print-overlay, 
                    .budget-print-overlay * {
                        visibility: visible !important;
                    }

                    .budget-print-overlay {
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 210mm !important;
                        min-height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        display: block !important;
                        overflow: visible !important;
                        z-index: 999999 !important;
                        visibility: visible !important;
                    }

                    .budget-print-container {
                        width: 210mm !important;
                        min-height: 297mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        display: flex !important;
                        flex-direction: column !important;
                        overflow: visible !important;
                    }

                    /* Ensure backgrounds print */
                    .bg-slate-950 { background-color: #020617 !important; }
                    .bg-amber-500 { background-color: #f59e0b !important; }
                    .bg-amber-400\/50 { background-color: rgba(251, 191, 36, 0.5) !important; }
                    .bg-slate-900 { background-color: #0f172a !important; }
                    .bg-black { background-color: #000000 !important; }
                    .bg-white { background-color: #ffffff !important; }
                    .bg-slate-50 { background-color: #f8fafc !important; }
                    .text-white { color: white !important; }
                    .text-amber-500 { color: #f59e0b !important; }

                    /* Header adjustments for print */
                    .px-12 {
                        padding-left: 15mm !important;
                        padding-right: 15mm !important;
                    }

                    .relative.h-48 {
                        height: 180px !important;
                        -webkit-print-color-adjust: exact !important;
                    }
                    
                    .bg-slate-950.h-24 {
                        height: 90px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        -webkit-print-color-adjust: exact !important;
                    }

                    /* Table and content */
                    .budget-print-container table { 
                        display: table !important; 
                        width: 100% !important; 
                        border-collapse: collapse !important;
                    }
                    
                    .budget-print-container thead {
                        display: table-header-group !important;
                    }

                    .budget-print-container tr { 
                        display: table-row !important; 
                        page-break-inside: avoid !important;
                    }

                    .footer-totals {
                        page-break-inside: avoid !important;
                        margin-top: auto !important;
                        padding-top: 20px !important;
                    }

                    /* Fix for absolute elements inside header */
                    .absolute.top-16 { top: 60px !important; }
                    .absolute.top-4 { top: 15px !important; }
                    .absolute.bottom-4 { bottom: 10px !important; }
                }
            `}} />

            <div className="budget-print-container bg-white min-h-[1123px] print:min-h-0 w-full max-w-[800px] mx-auto shadow-2xl relative print:shadow-none print:m-0 print:max-w-none rounded-[3rem] overflow-hidden print:rounded-none flex flex-col">
                
                {/* Header with Black Bar and Gold Wave */}
                <div className="relative h-48 shrink-0">
                    {/* Black Top Bar */}
                    <div className="bg-slate-950 h-24 w-full flex items-center justify-center px-4 md:px-12 relative z-10">
                         <div className="flex flex-col items-center">
                            <h1 className="text-sm md:text-xl font-black uppercase tracking-widest md:tracking-[0.3em] text-white leading-none whitespace-nowrap">BJL PLANEJADOS</h1>
                        </div>
                    </div>

                    {/* Golden Wave Shape */}
                    <div className="absolute top-16 left-0 w-full h-32 bg-amber-500 z-0" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 40%, 0 100%)' }} />
                    <div className="absolute top-16 left-0 w-full h-32 bg-amber-400/50 z-0" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 0 85%)' }} />
                    
                    {/* Logo - Moved up */}
                    <div className="absolute top-4 left-12 z-20 scale-75 origin-top-left">
                        <div className="h-44 w-44 rounded-full overflow-hidden bg-black flex items-center justify-center border-8 border-white shadow-2xl">
                            <img src="/logo-bjl.png" alt="BJL Logo" className="w-full h-full object-contain p-2" />
                        </div>
                    </div>

                    {/* Contact Info - Visible for Print */}
                    <div className="absolute top-4 right-12 z-20 flex flex-col gap-1.5 items-end print:flex !important">
                        <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg border border-slate-200/50 text-slate-800 print:text-white font-black text-[9px] uppercase tracking-widest shadow-sm print:flex !important">
                            <Phone size={10} className="text-amber-500" />
                            <span className="print:inline-block !important">(22) 99703-9852</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg border border-slate-200/50 text-slate-800 print:text-white font-black text-[9px] uppercase tracking-widest shadow-sm print:flex !important">
                            <Instagram size={10} className="text-amber-500" />
                            <span className="print:inline-block !important">@bjlmoveisplanejados</span>
                        </div>
                    </div>

                    <div className="absolute bottom-4 right-12 z-20 flex items-center gap-2 text-slate-800 print:text-slate-900 font-black text-[8px] uppercase tracking-widest max-w-[250px] text-right print:flex !important">
                        <span className="print:inline-block !important">Rua Maria Vitipó Raposo, n°138, Barão de Macaubas</span>
                        <MapPin size={12} className="text-slate-900 shrink-0" />
                    </div>
                </div>

                <div className="px-12 pb-20 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mt-6 mb-6">
                        <div className="flex-1">
                             <div className="bg-amber-500 text-white px-8 py-3.5 rounded-[1.5rem] shadow-xl shadow-amber-500/10 group relative overflow-hidden text-left">
                                <h2 className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 opacity-80 flex items-center gap-2">
                                    Proposta para
                                </h2>
                                <input 
                                    value={budget.client_name}
                                    onChange={(e) => setBudget({...budget, client_name: e.target.value})}
                                    className="bg-transparent text-2xl font-black uppercase tracking-tighter leading-none w-full border-none focus:ring-0 focus:outline-none placeholder:text-white/50"
                                    placeholder="NOME DO CLIENTE"
                                />
                             </div>
                        </div>
                        <div className="text-right pl-8 pt-1">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-1">Orçamento Ref.</p>
                            <p className="text-xl font-black text-slate-900 tracking-tighter leading-none">#{budgetNumber || budget.id.substring(0, 6).toUpperCase()}</p>
                            <div className="mt-3">
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Emitido em</p>
                                <p className="text-xs font-black text-slate-900 tabular-nums">{new Date(budget.created_at || new Date()).toLocaleDateString('pt-BR')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Commercial View (Proposta) is now the only view */}
                    <div className="mb-8 overflow-hidden rounded-[1.5rem] border border-slate-100">
                            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center group relative">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
                                    Descrição dos Ambientes e Serviços
                                </span>
                                <button 
                                    onClick={addAmbiente}
                                    className="p-1 px-3 bg-white/10 hover:bg-amber-500 hover:text-black rounded-md transition-all text-[9px] font-black uppercase print:hidden"
                                >
                                    <Plus size={10} className="inline mr-1" /> Novo Ambiente
                                </button>
                            </div>
                            <table className="w-full text-left border-collapse bg-white">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="pl-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[70%]">Ambiente / Detalhamento</th>
                                        <th className="pr-6 py-3 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">Investimento (À Vista)</th>
                                        <th className="w-8 print:hidden"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {ambientes.map((amb) => (
                                        <tr key={amb.id} className="hover:bg-amber-50/20 group">
                                            <td className="pl-6 py-4">
                                                <textarea 
                                                    value={amb.description}
                                                    rows={1}
                                                    onChange={(e) => handleAmbienteChange(amb.id, 'description', e.target.value)}
                                                    className="w-full bg-transparent border-none focus:ring-0 p-0 font-black text-slate-800 uppercase text-[11px] tracking-tight placeholder:text-slate-200 resize-y min-h-[24px]"
                                                    placeholder="Descreva o ambiente e o que será feito..."
                                                />
                                            </td>
                                            <td className="pr-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <span className="text-[9px] font-bold text-slate-300">R$</span>
                                                    <input 
                                                        type="number"
                                                        value={amb.value}
                                                        onChange={(e) => handleAmbienteChange(amb.id, 'value', parseFloat(e.target.value) || 0)}
                                                        className="w-24 bg-transparent border-none focus:ring-0 p-0 text-right font-black text-slate-600 text-xs"
                                                    />
                                                </div>
                                            </td>
                                            <td className="pr-2 print:hidden">
                                                <button 
                                                    onClick={() => removeAmbiente(amb.id)}
                                                    className="p-1 text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex-1 min-h-[40px]" />

                    {/* Footer and Totals */}
                    <div className="grid grid-cols-5 gap-8 items-start pt-6 border-t border-slate-100 footer-totals">
                        <div className="col-span-3 space-y-6">
                            <div>
                                <h4 className="flex items-center gap-2 text-[9px] font-black uppercase text-amber-600 tracking-widest mb-3">
                                    <div className="h-1.5 w-1.5 bg-amber-500 rounded-full" />
                                    Condições de Pagamento
                                </h4>
                                <div className="space-y-1.5 text-[9px] font-black text-slate-500 uppercase tracking-tight pl-4 border-l-2 border-slate-100">
                                    {paymentTerms.map((term, i) => (
                                        <div key={`term-${i}`} className="flex items-center gap-2 group">
                                            <span className="text-amber-500/30 shrink-0">0{i+1}.</span>
                                            <input 
                                                value={term}
                                                onChange={(e) => {
                                                    const newTerms = [...paymentTerms];
                                                    newTerms[i] = e.target.value;
                                                    setPaymentTerms(newTerms);
                                                }}
                                                className="w-full bg-transparent border-none focus:ring-0 p-0 text-slate-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="flex items-center gap-2 text-[9px] font-black uppercase text-amber-600 tracking-widest mb-3">
                                    <div className="h-1.5 w-1.5 bg-amber-500 rounded-full" />
                                    Especificações Técnicas
                                </h4>
                                <div className="grid grid-cols-2 gap-y-1.5 gap-x-6 text-[8px] font-black text-slate-400 uppercase tracking-widest pl-4 border-l-2 border-slate-100">
                                    {techSpecs.map((spec, i) => (
                                        <div key={`spec-${i}`} className="flex items-center gap-2 group">
                                            <div className="h-0.5 w-2 bg-slate-200 shrink-0" />
                                            <input 
                                                value={spec}
                                                onChange={(e) => {
                                                    const newSpecs = [...techSpecs];
                                                    newSpecs[i] = e.target.value;
                                                    setTechSpecs(newSpecs);
                                                }}
                                                className="w-full bg-transparent border-none focus:ring-0 p-0 text-slate-400"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="col-span-2 space-y-3">
                            <div className="bg-slate-900 p-6 rounded-[2rem] text-white space-y-4 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <Printer size={60} />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-500 mb-1">Total À Vista</p>
                                    <p className="text-3xl font-black text-white tracking-tighter leading-none tabular-nums">{formatCurrency(displayTotal)}</p>
                                </div>
                                <div className="pt-4 border-t border-white/10 relative z-10">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <div className="flex flex-col">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Parcelado</p>
                                            <p className="text-[6.5px] font-black uppercase tracking-[0.1em] text-slate-500 mt-0.5">Em até 10x no cartão</p>
                                        </div>
                                        <div className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded-md print:hidden">
                                            <input 
                                                type="number"
                                                value={budget.card_fee_percent || 11}
                                                onChange={(e) => setBudget({...budget, card_fee_percent: parseFloat(e.target.value) || 0})}
                                                className="w-6 bg-transparent border-none focus:ring-0 p-0 text-[10px] font-black text-amber-500 text-center"
                                            />
                                            <span className="text-[8px] font-black text-slate-600">%</span>
                                        </div>
                                    </div>
                                    <p className="text-2xl font-black text-amber-500 tracking-tighter leading-none tabular-nums">{formatCurrency(cardValue)}</p>
                                    <p className="text-[7px] font-bold text-slate-500 uppercase mt-3 tracking-[0.2em] text-right">Validade: 07 Dias</p>
                                </div>
                            </div>
                            <p className="text-[8px] text-center text-slate-400 font-black uppercase tracking-[0.1em] opacity-40">BJL PLANEJADOS • QUALIDADE & PRECISÃO</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Float Controls */}
            <div className="fixed bottom-12 left-1/2 -translate-x-1/2 flex gap-4 print:hidden z-[99999] bg-slate-900/40 backdrop-blur-2xl p-3 rounded-[2.5rem] border border-white/10 shadow-2xl scale-90">
                <button
                    onClick={onClose}
                    className="px-6 h-10 rounded-xl bg-white/10 text-white font-black uppercase text-[9px] tracking-widest hover:bg-rose-500 transition-all flex items-center gap-2"
                >
                    <X size={14} />
                    Sair
                </button>
                <div className="w-[1px] h-10 bg-white/10" />
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-10 h-10 rounded-xl bg-emerald-500 text-white font-black uppercase text-[9px] tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:scale-100"
                >
                    <Save size={16} />
                    {isSaving ? "Salvando..." : "Salvar Alterações"}
                </button>
                <button
                    onClick={() => window.print()}
                    className="px-10 h-10 rounded-xl bg-amber-500 text-black font-black uppercase text-[9px] tracking-widest shadow-xl shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                >
                    <Printer size={16} />
                    Imprimir/PDF
                </button>
            </div>
        </div>
    );
};

export default BudgetPrintView;
