import React, { useState } from 'react';
import { Phone, Instagram, MapPin, Printer, X, Pencil, RotateCcw } from 'lucide-react';

interface BudgetPrintViewProps {
    budget: any;
    onClose: () => void;
}

const BudgetPrintView = ({ budget: initialBudget, onClose }: BudgetPrintViewProps) => {
    const [budget, setBudget] = useState(initialBudget);
    const [items, setItems] = useState(initialBudget.budget_items || []);
    const [paymentTerms, setPaymentTerms] = useState([
        "Entrada de 50% no fechamento do contrato (TED/PIX).",
        "Saldo restante de 50% na data da entrega técnica.",
        "Prazo de entrega: A definir conforme cronograma de obra."
    ]);
    const [techSpecs, setTechSpecs] = useState([
        "MDF Branco TX (Interno)",
        "Dobradiças Amortecedor",
        "Corrediças Telespópicas",
        "Puxadores Perfil/Embutir"
    ]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleItemChange = (id: string, field: string, value: any) => {
        const newItems = items.map((item: any) => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                if (field === 'quantity' || field === 'unit_price_at_time') {
                    updated.total_price = (parseFloat(updated.quantity) || 0) * (parseFloat(updated.unit_price_at_time) || 0);
                }
                return updated;
            }
            return item;
        });
        setItems(newItems);
    };

    const totalValue = items.reduce((acc: number, curr: any) => acc + (parseFloat(curr.total_price) || 0), 0);
    const cardValue = totalValue * (1 + (parseFloat(budget.card_fee_percent) || 11) / 100);

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-sm overflow-y-auto p-4 md:p-10 print:p-0 print:bg-white print:relative print:z-0">
            <div className="bg-white min-h-[1123px] w-full max-w-[800px] mx-auto shadow-2xl relative print:shadow-none print:m-0 print:max-w-none rounded-[3rem] overflow-hidden print:rounded-none flex flex-col">
                
                {/* Header with Black Bar and Gold Wave */}
                <div className="relative h-64 shrink-0">
                    {/* Black Top Bar */}
                    <div className="bg-slate-950 h-32 w-full flex items-center justify-center px-12 relative z-10">
                         <div className="flex flex-col items-center">
                            <h1 className="text-xl font-black uppercase tracking-[0.3em] text-white leading-none">BJL PLANEJADOS</h1>
                        </div>
                    </div>

                    {/* Golden Wave Shape */}
                    <div className="absolute top-24 left-0 w-full h-40 bg-amber-500 z-0" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 40%, 0 100%)' }} />
                    <div className="absolute top-24 left-0 w-full h-40 bg-amber-400/50 z-0" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 0 85%)' }} />
                    
                    {/* Logo Positioned over Wave */}
                    <div className="absolute top-12 left-12 z-20">
                        <div className="h-44 w-44 rounded-full overflow-hidden bg-black flex items-center justify-center border-8 border-white shadow-2xl">
                            <img src="/logo_bjl.png" alt="BJL Logo" className="w-full h-full object-contain p-2" />
                        </div>
                    </div>

                    {/* Contact Info in Top Right Corner */}
                    <div className="absolute top-8 right-12 z-20 flex flex-col gap-2 items-end">
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 text-white font-black text-[10px] uppercase tracking-widest shadow-lg">
                            <Phone size={12} className="text-amber-400" />
                            <span>(22) 99703-9852</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 text-white font-black text-[10px] uppercase tracking-widest shadow-lg">
                            <Instagram size={12} className="text-amber-400" />
                            <span>@bjlmoveisplanejados</span>
                        </div>
                    </div>

                    <div className="absolute bottom-8 right-12 z-20 flex items-center gap-2 text-slate-800 font-bold text-[9px] uppercase tracking-widest max-w-[250px] text-right">
                        <span>Rua Maria Vitipó Raposo, n°138, Barão de Macaubas</span>
                        <MapPin size={14} className="text-slate-900 shrink-0" />
                    </div>
                </div>

                <div className="px-12 pb-8 flex-1">
                    <div className="flex justify-between items-start mt-8 mb-8">
                        <div className="flex-1">
                             <div className="bg-amber-500 text-white px-8 py-5 rounded-[2rem] shadow-xl shadow-amber-500/20 group relative overflow-hidden">
                                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-80 flex items-center gap-2">
                                    Proposta para
                                    <Pencil size={10} />
                                </h2>
                                <input 
                                    value={budget.client_name}
                                    onChange={(e) => setBudget({...budget, client_name: e.target.value})}
                                    className="bg-transparent text-3xl font-black uppercase tracking-tighter leading-none w-full border-none focus:ring-0 focus:outline-none placeholder:text-white/50"
                                    placeholder="NOME DO CLIENTE"
                                />
                            </div>
                        </div>
                        <div className="text-right pl-8 pt-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Orçamento Ref.</p>
                            <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">#{budget.id.substring(0, 6).toUpperCase()}</p>
                            <div className="mt-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Emitido em</p>
                                <p className="text-sm font-black text-slate-900 tracking-tight opacity-60">{new Date(budget.created_at || new Date()).toLocaleDateString('pt-BR')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Products Table */}
                    <div className="mb-12 min-h-[350px]">
                        <div className="bg-slate-900 text-white rounded-t-[2.5rem] px-8 py-6 flex justify-between items-center group overflow-hidden relative">
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 relative z-10">
                                <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
                                Memorial Descritivo e Detalhamento Técnico
                            </span>
                            <div className="h-1 w-24 bg-amber-500 rounded-full relative z-10" />
                        </div>
                        <table className="w-full text-left border-collapse bg-white">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="pl-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 w-1/2">Ambiente / Material</th>
                                    <th className="py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Qtd</th>
                                    <th className="py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Unitário</th>
                                    <th className="pr-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 border-x border-slate-100">
                                {items.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-amber-50/20 transition-colors group">
                                        <td className="pl-8 py-6">
                                            <input 
                                                value={item.material_name || "Item Personalizado"}
                                                onChange={(e) => handleItemChange(item.id, 'material_name', e.target.value)}
                                                className="w-full bg-transparent border-none focus:ring-0 p-0 font-black text-slate-800 uppercase text-xs tracking-tight placeholder:text-slate-300"
                                            />
                                        </td>
                                        <td className="py-6 text-center">
                                            <input 
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                className="w-16 bg-transparent border-none focus:ring-0 p-0 text-center font-black text-slate-500 text-xs"
                                            />
                                        </td>
                                        <td className="py-6 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <span className="text-[10px] font-bold text-slate-300">R$</span>
                                                <input 
                                                    type="number"
                                                    value={item.unit_price_at_time}
                                                    onChange={(e) => handleItemChange(item.id, 'unit_price_at_time', parseFloat(e.target.value) || 0)}
                                                    className="w-24 bg-transparent border-none focus:ring-0 p-0 text-right font-bold text-slate-600 text-xs"
                                                />
                                            </div>
                                        </td>
                                        <td className="pr-8 py-6 text-right font-black text-slate-900 text-sm tabular-nums">{formatCurrency(item.total_price || 0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer and Totals */}
                    <div className="grid grid-cols-5 gap-12 items-start border-t border-slate-100 pt-12 pb-20 px-12">
                        <div className="col-span-3 space-y-12">
                            <div>
                                <h4 className="flex items-center gap-3 text-[10px] font-black uppercase text-amber-600 tracking-widest mb-6">
                                    <div className="h-2 w-2 bg-amber-500 rounded-full" />
                                    Condições de Pagamento e Prazos
                                </h4>
                                <div className="space-y-4 text-[11px] font-black text-slate-500 leading-relaxed uppercase tracking-tight pl-6 border-l-2 border-slate-100">
                                    {paymentTerms.map((term, i) => (
                                        <div key={`term-${i}`} className="flex items-center gap-2 group">
                                            <span className="text-amber-500/30 font-black shrink-0">0{i+1}.</span>
                                            <input 
                                                value={term}
                                                onChange={(e) => {
                                                    const newTerms = [...paymentTerms];
                                                    newTerms[i] = e.target.value;
                                                    setPaymentTerms(newTerms);
                                                }}
                                                className="w-full bg-transparent border-none focus:ring-0 p-0 text-slate-500 placeholder:text-slate-200"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="flex items-center gap-3 text-[10px] font-black uppercase text-amber-600 tracking-widest mb-6">
                                    <div className="h-2 w-2 bg-amber-500 rounded-full" />
                                    Especificações Técnicas Inclusas
                                </h4>
                                <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-[9px] font-black text-slate-400 leading-relaxed uppercase tracking-widest pl-6 border-l-2 border-slate-100">
                                    {techSpecs.map((spec, i) => (
                                        <div key={`spec-${i}`} className="flex items-center gap-2 group">
                                            <div className="h-1 w-1 bg-slate-100 rounded-full shrink-0" />
                                            <input 
                                                value={spec}
                                                onChange={(e) => {
                                                    const newSpecs = [...techSpecs];
                                                    newSpecs[i] = e.target.value;
                                                    setTechSpecs(newSpecs);
                                                }}
                                                className="w-full bg-transparent border-none focus:ring-0 p-0 text-slate-400 placeholder:text-slate-200"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="col-span-2 space-y-4 pt-4">
                            <div className="bg-slate-900 p-8 rounded-[3rem] text-white space-y-7 shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative overflow-hidden group border border-white/5">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:rotate-12 transition-all duration-500">
                                    <Printer size={100} />
                                </div>
                                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />
                                
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 mb-3 ml-1">Total do Projeto À Vista</p>
                                    <p className="text-4xl font-black text-white tracking-tighter leading-none">{formatCurrency(totalValue)}</p>
                                </div>
                                
                                <div className="pt-7 border-t border-white/10 relative z-10">
                                    <div className="flex justify-between items-center mb-3 px-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Parcelado</p>
                                        <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer border border-white/5 group/fee">
                                            <span className="text-[8px] font-black text-slate-600 group-hover/fee:text-amber-500 transition-colors">+</span>
                                            <input 
                                                type="number"
                                                value={budget.card_fee_percent || 11}
                                                onChange={(e) => setBudget({...budget, card_fee_percent: parseFloat(e.target.value) || 0})}
                                                className="w-8 bg-transparent border-none focus:ring-0 p-0 text-[11px] font-black text-amber-500/90 text-center"
                                            />
                                            <span className="text-[8px] font-black text-slate-600">% Taxa</span>
                                        </div>
                                    </div>
                                    <p className="text-3xl font-black text-amber-500 tracking-tighter leading-none">{formatCurrency(cardValue)}</p>
                                    <p className="text-[8px] font-bold text-slate-500 uppercase mt-5 tracking-[0.3em] text-right opacity-50">Validade da Proposta: 07 Dias</p>
                                </div>
                            </div>
                            <p className="text-[10px] text-center text-slate-400 font-black uppercase tracking-[0.2em] pt-4 opacity-40">BJL PLANEJADOS • QUALIDADE & PRECISÃO</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Float Controls (Hidden on Print) */}
            <div className="fixed bottom-12 left-1/2 -translate-x-1/2 flex gap-4 print:hidden z-[99999] bg-slate-900/40 backdrop-blur-2xl p-3 rounded-[2.5rem] border border-white/10 shadow-2xl">
                <button
                    onClick={onClose}
                    className="px-8 h-12 rounded-2xl bg-white/10 text-white font-black uppercase text-[10px] tracking-widest hover:bg-rose-500 transition-all border border-white/10 flex items-center gap-2"
                >
                    <X size={16} />
                    Cancelar
                </button>
                <div className="w-[1px] h-12 bg-white/10" />
                <button
                    onClick={() => {
                        setBudget(initialBudget);
                        setItems(initialBudget.budget_items || []);
                    }}
                    className="px-6 h-12 rounded-2xl bg-white/5 text-slate-400 hover:text-white font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all border border-white/5 flex items-center gap-2"
                >
                    <RotateCcw size={16} />
                    Limpar Edições
                </button>
                <button
                    onClick={handlePrint}
                    className="px-10 h-12 rounded-2xl bg-amber-500 text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                >
                    <Printer size={18} />
                    Gerar PDF Final
                </button>
            </div>
        </div>
    );
};

export default BudgetPrintView;
