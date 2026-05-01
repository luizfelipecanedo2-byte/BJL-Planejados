import React from 'react';
import { createPortal } from 'react-dom';
import { Award, Trash2, X, Phone, Mail, MapPin, Globe } from 'lucide-react';
import { useCompanySettings } from '@/hooks/useCompanySettings';


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

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
};

const BudgetPrintView: React.FC<BudgetPrintViewProps> = ({
    budget: initialBudget,
    ambientes: initialAmbientes,
    budgetNumber,
    onClose,
    onSave
}) => {
    const { settings } = useCompanySettings();
    // Estado interno para garantir que o componente funcione mesmo sem props externas
    const [budget, setLocalBudget] = React.useState(initialBudget || {});

    const [ambientes, setLocalAmbientes] = React.useState<Ambiente[]>(
        (initialAmbientes && initialAmbientes.length > 0) ? initialAmbientes : [
            { id: '1', description: 'MARCENARIA SOB MEDIDA', value: initialBudget?.total_value || 0 }
        ]
    );

    if (!initialBudget) {
        return null;
    }

    const handleLocalAmbienteChange = (id: string, field: string, value: any) => {
        setLocalAmbientes(prev => prev.map(amb => 
            amb.id === id ? { ...amb, [field]: value } : amb
        ));
    };

    const handleLocalRemoveAmbiente = (id: string) => {
        setLocalAmbientes(prev => prev.filter(amb => amb.id !== id));
    };

    const addAmbiente = () => {
        const newAmbiente = {
            id: Math.random().toString(36).substring(2, 9),
            description: '',
            value: 0
        };
        setLocalAmbientes(prev => [...prev, newAmbiente]);
    };

    const totalValue = (ambientes || []).reduce((acc, curr) => acc + (Number(curr?.value) || 0), 0);
    const installmentValue = totalValue * 1.11;

    const defaultPaymentTerms = "01. ENTRADA DE 60% NO FECHAMENTO DO CONTRATO.\n02. SALDO RESTANTE DE 40% NA DATA DA ENTREGA TÉCNICA.\n03. PRAZO DE ENTREGA: A DEFINIR CONFORME CRONOGRAMA.";
    
    const [paymentTerms, setLocalPaymentTerms] = React.useState<string>(budget.notes || defaultPaymentTerms);

    // Sync budget.notes with local state
    React.useEffect(() => {
        if (paymentTerms !== budget.notes) {
            setLocalBudget((prev: any) => ({ ...prev, notes: paymentTerms }));
        }
    }, [paymentTerms]);

    const content = (
        <div className="print-container fixed inset-0 z-[9999] overflow-y-auto bg-slate-100 py-12 px-4 flex justify-center pb-40 print:absolute print:top-0 print:left-0 print:block print:w-full print:h-auto print:overflow-visible print:p-0 print:bg-transparent print:pb-0">
            {/* Botão flutuante de fechar para garantir que o usuário consiga sair */}
            <button 
                onClick={onClose}
                className="fixed top-6 right-6 p-4 bg-white rounded-full shadow-2xl text-slate-400 hover:text-rose-500 transition-all z-[10000] no-print border border-slate-100"
                title="Fechar (Voltar)"
            >
                <X size={24} />
            </button>

            <div className="bg-white shadow-2xl w-full max-w-[210mm] min-h-[297mm] text-slate-900 relative print:shadow-none print-area print:w-full font-sans overflow-visible mb-10 print:mb-0">
                
                {/* 1. CABEÇALHO */}
                <div className="relative">
                    <div className="bg-[#0f172a] text-white h-20 flex items-center justify-center px-10 relative">
                        <div className="absolute left-10 top-2 h-36 w-36 rounded-full bg-black shadow-2xl z-20 flex items-center justify-center overflow-hidden border-2 border-[#f59e0b]">
                            <img src="/logo-bjl.png" alt="BJL" className="w-full h-full object-cover" />
                        </div>
                        <div className="ml-24 flex flex-col items-center">
                            <h1 className="text-2xl font-black uppercase tracking-[0.4em] leading-none">{settings?.name || "BJL PLANEJADOS"}</h1>
                            {settings?.cnpj && (
                                <p className="text-[8px] font-bold text-white/50 tracking-widest mt-1">CNPJ: {settings.cnpj}</p>
                            )}
                        </div>

                    </div>
                    <div className="h-8 bg-[#f59e0b] w-full"></div>
                </div>

                {/* 2. PROPOSTA */}
                <div className="px-12 py-10 flex justify-between items-start">
                    <div className="bg-[#f59e0b] rounded-3xl px-12 py-8 min-w-[480px] shadow-xl text-white">
                        <div className="flex items-center gap-2 mb-3">
                             <Award size={14} className="text-white/60" />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em]">PROPOSTA COMERCIAL PARA</span>
                        </div>
                        <input 
                            value={budget.client_name || ''}
                            onChange={(e) => setLocalBudget({...budget, client_name: e.target.value})}
                            className="w-full bg-transparent border-none p-0 text-3xl font-black uppercase text-white focus:ring-0"
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

                {/* 3. LISTA DE AMBIENTES */}
                <div className="px-16 mt-4">
                    <div className="bg-[#0f172a] text-white px-10 py-5 rounded-2xl mb-8 flex justify-between shadow-xl">
                        <span className="text-[11px] font-black uppercase tracking-[0.3em]">DETALHAMENTO DOS AMBIENTES</span>
                        <span className="text-[11px] font-black uppercase tracking-[0.3em]">VALOR À VISTA</span>
                    </div>

                    <div className="space-y-4">
                        {(ambientes || []).map((amb, index) => (
                            <div key={amb.id} className="group transition-all bg-slate-50 rounded-2xl p-6 border border-slate-100 flex justify-between items-start relative">
                                <div className="flex gap-4 flex-1">
                                    <span className="text-[10px] font-black text-[#f59e0b] opacity-40">0{index+1}.</span>
                                    <textarea 
                                        value={amb.description || ''}
                                        onChange={(e) => handleLocalAmbienteChange(amb.id, 'description', e.target.value)}
                                        rows={1}
                                        className="w-full bg-transparent border-none p-0 text-[15px] font-black text-slate-800 uppercase focus:ring-0 resize-y"
                                        placeholder="DESCREVA O AMBIENTE..."
                                    />
                                </div>
                                <div className="flex items-center gap-2 min-w-[150px] justify-end">
                                    <span className="text-[10px] font-black text-slate-300 no-print">R$</span>
                                    <input 
                                        type="number"
                                        value={amb.value || 0}
                                        onChange={(e) => handleLocalAmbienteChange(amb.id, 'value', parseFloat(e.target.value) || 0)}
                                        className="w-24 bg-transparent border-none p-0 text-right text-base font-black text-slate-900 focus:ring-0 no-print"
                                    />
                                    <span className="hidden print:inline text-base font-black">
                                        {formatCurrency(amb.value || 0)}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => handleLocalRemoveAmbiente(amb.id)} 
                                    className="no-print absolute -right-2 -top-2 bg-white shadow-md text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-2 rounded-full border border-slate-100"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 no-print flex justify-center">
                        <button 
                            onClick={addAmbiente}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest transition-all"
                        >
                            + Adicionar Ambiente
                        </button>
                    </div>
                </div>

                {/* 4. TOTAIS */}
                <div className="px-16 py-8 mt-12 bg-slate-50/50">
                    <div className="flex justify-between gap-12">
                        <div className="flex-1 space-y-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <h3 className="text-[10px] font-black uppercase text-[#f59e0b] tracking-[0.2em] mb-4">CONDIÇÕES DE PAGAMENTO</h3>
                                <div className="text-[10px] text-slate-600 font-bold">
                                    <textarea 
                                        value={paymentTerms}
                                        onChange={(e) => setLocalPaymentTerms(e.target.value)}
                                        rows={4}
                                        className="w-full bg-transparent border-none p-0 text-[10px] text-slate-600 font-bold focus:ring-0 resize-y uppercase font-sans leading-relaxed"
                                        placeholder="INSIRA AS CONDIÇÕES DE PAGAMENTO..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="w-[280px]">
                            <div className="bg-[#0f172a] text-white p-8 rounded-3xl shadow-xl flex flex-col gap-4">
                                <div>
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">TOTAL À VISTA</p>
                                    <h4 className="text-2xl font-black">{formatCurrency(totalValue)}</h4>
                                </div>
                                <div className="h-[1px] bg-white/10"></div>
                                <div>
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">PARCELADO (10X)</p>
                                    <h5 className="text-xl font-black text-[#f59e0b]">{formatCurrency(installmentValue)}</h5>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. RODAPÉ / CONTATOS */}
                <div className="px-16 py-8 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="space-y-2">
                        {settings?.address && (
                            <div className="flex items-center gap-2 text-slate-500">
                                <MapPin size={10} className="text-[#f59e0b]" />
                                <span className="text-[9px] font-bold uppercase tracking-tight">{settings.address}</span>
                            </div>
                        )}
                        <div className="flex gap-4">
                            {settings?.phone && (
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Phone size={10} className="text-[#f59e0b]" />
                                    <span className="text-[9px] font-bold uppercase tracking-tight">{settings.phone}</span>
                                </div>
                            )}
                            {settings?.email && (
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Mail size={10} className="text-[#f59e0b]" />
                                    <span className="text-[9px] font-bold uppercase tracking-tight">{settings.email}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-4">
                        {settings?.instagram && (
                             <div className="flex items-center gap-2 text-slate-500">
                                <span className="text-[9px] font-black uppercase tracking-widest text-[#f59e0b]">Instagram</span>
                                <span className="text-[9px] font-bold lowercase tracking-tight">{settings.instagram}</span>
                            </div>
                        )}
                        {settings?.website && (
                             <div className="flex items-center gap-2 text-slate-500">
                                <Globe size={10} className="text-[#f59e0b]" />
                                <span className="text-[9px] font-bold lowercase tracking-tight">{settings.website}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {/* BARRA DE AÇÕES FIXA NO RODAPÉ DA TELA */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-6 no-print flex justify-center items-center gap-6 z-[10000] shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
                <div className="flex flex-wrap justify-center gap-4">
                    <button 
                        onClick={onClose}
                        className="bg-slate-200 text-slate-700 px-8 py-4 rounded-full font-black uppercase tracking-[0.2em] hover:bg-slate-300 transition-all text-xs"
                    >
                        Voltar
                    </button>
                    
                    {onSave && (
                        <button 
                            onClick={() => onSave(budget, ambientes.map(a => ({ 
                                material_name: a.description, 
                                quantity: 1, 
                                unit_price_at_time: a.value, 
                                total_price: a.value 
                            })))}
                            className="bg-emerald-500 text-white px-8 py-4 rounded-full font-black uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 text-xs"
                        >
                            Salvar Alterações
                        </button>
                    )}

                    <button 
                        onClick={() => window.print()}
                        className="bg-[#0f172a] text-white px-8 py-4 rounded-full font-black uppercase tracking-[0.2em] shadow-xl hover:bg-[#1e293b] transition-all text-xs flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Imprimir / PDF
                    </button>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: A4; margin: 5mm; }
                    html, body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        background: white !important;
                    }
                    body > *:not(.print-container) { display: none !important; }
                    .print-area { width: 100% !important; margin: 0 !important; padding: 0 !important; position: relative !important; }
                    .no-print { display: none !important; }
                }
            `}} />
        </div>
    );

    return createPortal(content, document.body);
};

export default BudgetPrintView;
