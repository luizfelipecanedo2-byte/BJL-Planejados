import React from 'react';
import { createPortal } from 'react-dom';
import { Award, Trash2, X, Phone, Mail, MapPin, Globe, ShieldCheck, Clock, Percent, Wrench, ArrowRight, Check } from 'lucide-react';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { cn } from '@/lib/utils';

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
    initialTab?: 'commercial' | 'technical' | 'contract';
    onClose?: () => void;
    onSave?: (
        budget: any, 
        items: any[], 
        adjustmentMode?: 'days' | 'commission' | 'service_item' | 'none',
        extraData?: any
    ) => void;
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
    initialTab,
    onClose,
    onSave
}) => {
    const { settings } = useCompanySettings();
    const [budget, setLocalBudget] = React.useState(initialBudget || {});
    const [viewMode, setViewMode] = React.useState<'commercial' | 'technical' | 'contract'>(initialTab || 'commercial');

    const cardFeePercent = Number(initialBudget?.card_fee_percent) || 11;
    const cardFactor = 1 + (cardFeePercent / 100);

    // Calcula o valor à vista base do orçamento (corrigindo orçamentos legados se necessário)
    const initialBaseValue = React.useMemo(() => {
        const rawTotal = Number(initialBudget?.total_value) || 0;
        const totalCost = Number(initialBudget?.total_cost) || 0;
        const markupFactor = Number(initialBudget?.markup_factor) || 0;

        if (totalCost > 0 && markupFactor > 0) {
            const calculatedBase = totalCost * markupFactor;
            const calculatedCard = calculatedBase * cardFactor;
            // Se o total_value salvo coincidir com o valor parcelado com cartão, usa a base calculada
            if (Math.abs(rawTotal - calculatedCard) < 1) {
                return calculatedBase;
            }
            return calculatedBase;
        }
        return rawTotal;
    }, [initialBudget, cardFactor]);

    // Analisa se o orçamento contém materiais técnicos específicos do catálogo
    const isTechnicalBudget = React.useMemo(() => {
        const items = initialBudget?.budget_items || [];
        return items.some((item: any) => {
            const cat = item.budget_materials?.category;
            return cat && cat !== 'OUTROS' && cat !== 'SERVICOS';
        });
    }, [initialBudget]);

    // Inicializa a lista de ambientes com o valor à vista base (preservando salvos se existirem)
    const [ambientes, setLocalAmbientes] = React.useState<Ambiente[]>(() => {
        if (initialAmbientes && initialAmbientes.length > 0) {
            return initialAmbientes;
        }

        if (initialBudget?.notes && typeof initialBudget.notes === 'string' && initialBudget.notes.includes('<!--BJL_AMBIENTES:')) {
            try {
                const match = initialBudget.notes.match(/<!--BJL_AMBIENTES:([\s\S]*?)-->/);
                if (match && match[1]) {
                    const parsed = JSON.parse(match[1]);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return parsed;
                    }
                }
            } catch (e) {
                console.error("Erro ao carregar ambientes salvos:", e);
            }
        }
        
        return [{
            id: 'default',
            description: (initialBudget?.project_name || "MARCENARIA SOB MEDIDA").toUpperCase(),
            value: initialBaseValue || 0
        }];
    });

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

    // O valor total exibido (À VISTA) depende do modo de visualização
    const totalValue = viewMode === 'commercial'
        ? (ambientes || []).reduce((acc, curr) => acc + (Number(curr?.value) || 0), 0)
        : initialBaseValue;

    // O valor parcelado aplica a taxa de acréscimo sobre o valor à vista
    const installmentValue = totalValue * cardFactor;

    const defaultPaymentTerms = "01. ENTRADA DE 60% NO FECHAMENTO DO CONTRATO.\n02. SALDO RESTANTE DE 40% NA DATA DA ENTREGA TÉCNICA.\n03. PRAZO DE ENTREGA: A DEFINIR CONFORME CRONOGRAMA.";
    
    const cleanInitialNotes = React.useMemo(() => {
        if (!initialBudget?.notes) return defaultPaymentTerms;
        const cleaned = initialBudget.notes.replace(/<!--BJL_AMBIENTES:[\s\S]*?-->/g, '').trim();
        return cleaned || defaultPaymentTerms;
    }, [initialBudget?.notes]);

    const [paymentTerms, setLocalPaymentTerms] = React.useState<string>(cleanInitialNotes);

    const [isAdjustModalOpen, setIsAdjustModalOpen] = React.useState(false);
    const [adjustmentMode, setAdjustmentMode] = React.useState<'days' | 'commission' | 'service_item'>('days');

    // Cálculos de ajuste
    const priceDiff = totalValue - initialBaseValue;

    const materialCost = React.useMemo(() => {
        return (initialBudget?.budget_items || [])
            .filter((item: any) => {
                const cat = item.budget_materials?.category;
                return cat !== 'SERVICOS';
            })
            .reduce((acc: number, item: any) => acc + (Number(item.total_price) || 0), 0);
    }, [initialBudget]);

    const dailyCost = 470;
    const currentDays = Number(initialBudget?.days_estimated) || 1;
    const currentMarkup = Number(initialBudget?.markup_factor) || 1.22;

    // Cálculo prévio para Opção 1: Dias de Serviço
    const calculatedDays = React.useMemo(() => {
        const targetTotalCost = totalValue / currentMarkup;
        const targetFixedCost = Math.max(0, targetTotalCost - materialCost);
        return Math.max(1, Math.round(targetFixedCost / dailyCost));
    }, [totalValue, currentMarkup, materialCost]);

    const calculatedFixedCost = calculatedDays * dailyCost;

    // Cálculo prévio para Opção 2: Comissão / Margem
    const calculatedMarkup = React.useMemo(() => {
        const fixedCost = currentDays * dailyCost;
        const totalCost = materialCost + fixedCost;
        return totalCost > 0 ? (totalValue / totalCost) : currentMarkup;
    }, [totalValue, currentDays, materialCost, currentMarkup]);

    const calculatedMargin = React.useMemo(() => {
        return Math.max(0, (calculatedMarkup - 1) * 100 - 7);
    }, [calculatedMarkup]);

    const handleSaveClick = () => {
        if (Math.abs(priceDiff) < 1) {
            handleConfirmSave('none');
        } else {
            setIsAdjustModalOpen(true);
        }
    };

    const handleConfirmSave = (mode: 'days' | 'commission' | 'service_item' | 'none') => {
        if (onSave) {
            onSave(
                budget, 
                initialBudget?.budget_items || [], 
                mode, 
                {
                    newTargetValue: totalValue,
                    ambientes,
                    paymentTerms,
                    priceDiff,
                    calculatedDays,
                    calculatedMarkup
                }
            );
        }
        setIsAdjustModalOpen(false);
    };

    // Sync budget.notes com estado local
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

                {/* 2. PROPOSTA / CONTRATO */}
                <div className="px-12 py-10 flex justify-between items-start">
                    <div className="bg-[#f59e0b] rounded-3xl px-12 py-8 min-w-[480px] shadow-xl text-white">
                        <div className="flex items-center gap-2 mb-3">
                             <Award size={14} className="text-white/60" />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                 {viewMode === 'contract' ? 'INSTRUMENTO CONTRATUAL PARA' : 'PROPOSTA COMERCIAL PARA'}
                             </span>
                        </div>
                        <input 
                            value={budget.client_name || ''}
                            onChange={(e) => setLocalBudget({...budget, client_name: e.target.value})}
                            className="w-full bg-transparent border-none p-0 text-3xl font-black uppercase text-white focus:ring-0"
                            placeholder="NOME DO CLIENTE"
                        />
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 underline decoration-[#f59e0b] decoration-2 underline-offset-4">
                            {viewMode === 'contract' ? 'CONTRATO Nº' : 'REF. DO PROJETO'}
                        </p>
                        <p className="text-4xl font-black text-slate-900 leading-none">#{budgetNumber || "000"}</p>
                        <div className="mt-8">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                {viewMode === 'contract' ? 'DATA DE EMISSÃO' : 'DATA DE VALIDADE'}
                            </p>
                            <p className="text-sm font-black text-slate-700">{new Date().toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>
                </div>

                {/* 3. CONTEÚDO IMPRESSO (AMBIENTES, MATERIAIS OU CONTRATO) */}
                <div className="px-16 mt-4">
                    {viewMode !== 'contract' && (
                        <div className="bg-[#0f172a] text-white px-10 py-5 rounded-2xl mb-8 flex justify-between shadow-xl">
                            {viewMode === 'commercial' ? (
                                <>
                                    <span className="text-[11px] font-black uppercase tracking-[0.3em]">DETALHAMENTO DOS AMBIENTES</span>
                                    <span className="text-[11px] font-black uppercase tracking-[0.3em]">VALOR À VISTA</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-[11px] font-black uppercase tracking-[0.3em]">RELAÇÃO TÉCNICA DE MATERIAIS</span>
                                    <span className="text-[11px] font-black uppercase tracking-[0.3em]">VALOR TOTAL</span>
                                </>
                            )}
                        </div>
                    )}

                    {viewMode === 'contract' ? (
                        /* VISUALIZAÇÃO DO CONTRATO DE PRESTAÇÃO DE SERVIÇOS */
                        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 text-slate-800 space-y-6 text-justify text-xs leading-relaxed print:p-0 print:border-none shadow-sm">
                            <div className="text-center pb-4 border-b border-slate-200">
                                <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900">
                                    CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MARCENARIA E FABRICAÇÃO SOB MEDIDA
                                </h2>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                                    Ref. Proposta #{budgetNumber || "000"} • Emissão: {new Date().toLocaleDateString('pt-BR')}
                                </p>
                            </div>

                            {/* 1. DAS PARTES */}
                            <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <h4 className="font-black text-[11px] uppercase tracking-wider text-amber-700">1. QUALIFICAÇÃO DAS PARTES</h4>
                                <p>
                                    <strong>CONTRATADA:</strong> <strong>{settings?.name || "BJL PLANEJADOS"}</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <strong>{settings?.cnpj || "Conforme cadastro da fábrica"}</strong>, com sede em <strong>{settings?.address || "Endereço comercial da fábrica"}</strong>, telefone <strong>{settings?.phone || ""}</strong>, e-mail <strong>{settings?.email || ""}</strong>.
                                </p>
                                <p>
                                    <strong>CONTRATANTE:</strong> <strong>{budget.client_name || "NOME DO CLIENTE"}</strong>.
                                </p>
                            </div>

                            {/* 2. DO OBJETO */}
                            <div className="space-y-2">
                                <h4 className="font-black text-[11px] uppercase tracking-wider text-amber-700">2. DO OBJETO DO CONTRATO</h4>
                                <p>
                                    O presente instrumento tem por objeto a fabricação, fornecimento e instalação especializada de mobiliário sob medida pela <strong>CONTRATADA</strong> em favor do <strong>CONTRATANTE</strong>, conforme especificações técnicas, padrões de acabamento e ambientes aprovados a seguir:
                                </p>
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Relação de Ambientes Contratados:</span>
                                    <ul className="list-disc list-inside space-y-1 font-bold text-[11px] text-slate-800">
                                        {(ambientes || []).map((amb, idx) => (
                                            <li key={amb.id || idx}>
                                                <strong>{amb.description || `Ambiente 0${idx+1}`}:</strong> {formatCurrency(amb.value || 0)}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* 3. DO VALOR E FORMA DE PAGAMENTO */}
                            <div className="space-y-2">
                                <h4 className="font-black text-[11px] uppercase tracking-wider text-amber-700">3. DO VALOR E FORMA DE PAGAMENTO</h4>
                                <p>
                                    Pelos serviços e materiais contratados, o <strong>CONTRATANTE</strong> pagará à <strong>CONTRATADA</strong> a quantia total ajustada de:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-2">
                                    <div className="bg-slate-900 text-white p-3.5 rounded-xl">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Valor Total à Vista</span>
                                        <p className="text-lg font-black text-white">{formatCurrency(totalValue)}</p>
                                    </div>
                                    <div className="bg-slate-100 text-slate-900 p-3.5 rounded-xl border border-slate-200">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Opção Parcelada (Cartão)</span>
                                        <p className="text-lg font-black text-amber-600">{formatCurrency(installmentValue)}</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-[10px] font-bold whitespace-pre-wrap leading-relaxed">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Condições Específicas Acordadas:</span>
                                    {paymentTerms}
                                </div>
                            </div>

                            {/* 4. DO PRAZO DE FABRICAÇÃO E INSTALAÇÃO */}
                            <div className="space-y-2">
                                <h4 className="font-black text-[11px] uppercase tracking-wider text-amber-700">4. DO PRAZO E DA MEDIÇÃO TÉCNICA</h4>
                                <p>
                                    O prazo estimado para fabricação e montagem é de <strong>30 a 45 dias úteis</strong>, com início de contagem a partir da:
                                </p>
                                <p className="pl-4 border-l-2 border-amber-400 text-slate-700 font-medium">
                                    a) Realização da medição técnica fina in loco no imóvel pelo técnico da CONTRATADA;<br />
                                    b) Aprovação final do projeto 3D executivo e escolha de cores/padrões;<br />
                                    c) Quitação da entrada acordada ou compensação das garantias financeiras.
                                </p>
                            </div>

                            {/* 5. DAS OBRIGAÇÕES DO CLIENTE */}
                            <div className="space-y-2">
                                <h4 className="font-black text-[11px] uppercase tracking-wider text-amber-700">5. DAS OBRIGAÇÕES DO CONTRATANTE</h4>
                                <p>
                                    O <strong>CONTRATANTE</strong> compromete-se a entregar o local da montagem limpo, com pisos e revestimentos assentados, pontos de água, esgoto, gás e tomadas elétricas devidamente posicionados e testados antes do início da instalação.
                                </p>
                            </div>

                            {/* 6. DA GARANTIA */}
                            <div className="space-y-2">
                                <h4 className="font-black text-[11px] uppercase tracking-wider text-amber-700">6. DO TERMO DE GARANTIA</h4>
                                <p>
                                    A <strong>CONTRATADA</strong> assegura garantia de <strong>05 (cinco) anos</strong> sobre a integridade estrutural e colagem dos móveis de fabricação própria contra vícios ou defeitos de fabricação, e garantia de <strong>01 (um) ano</strong> para dobradiças, corrediças e ferragens conforme especificação dos fabricantes. A garantia não cobre danos decorrentes de umidade externa, infiltrações ou mau uso.
                                </p>
                            </div>

                            {/* 7. DO FORO */}
                            <div className="space-y-2">
                                <h4 className="font-black text-[11px] uppercase tracking-wider text-amber-700">7. DO FORO</h4>
                                <p>
                                    Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem o foro da Comarca local, renunciando a qualquer outro por mais privilegiado que seja.
                                </p>
                            </div>

                            {/* LOCAL E DATA */}
                            <div className="pt-4 text-center text-xs font-bold text-slate-600">
                                {settings?.address ? settings.address.split('-').pop()?.trim() : "Brasil"}, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.
                            </div>

                            {/* ASSINATURAS */}
                            <div className="pt-8 grid grid-cols-2 gap-8 text-center text-[10px] uppercase font-bold">
                                <div className="space-y-2">
                                    <div className="border-t border-slate-900 w-4/5 mx-auto pt-2"></div>
                                    <p className="font-black text-slate-900">{budget.client_name || "CONTRATANTE"}</p>
                                    <p className="text-slate-400 font-normal">CONTRATANTE</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="border-t border-slate-900 w-4/5 mx-auto pt-2"></div>
                                    <p className="font-black text-slate-900">{settings?.name || "BJL PLANEJADOS"}</p>
                                    <p className="text-slate-400 font-normal">CONTRATADA (CNPJ: {settings?.cnpj || "BJL"})</p>
                                </div>
                            </div>
                        </div>
                    ) : viewMode === 'commercial' ? (
                        <div className="space-y-4">
                            {(ambientes || []).map((amb, index) => (
                                <div key={amb.id} className="group transition-all bg-slate-50 rounded-2xl p-6 border border-slate-100 flex justify-between items-start relative">
                                    <div className="flex gap-4 flex-1">
                                        <span className="text-[10px] font-black text-[#f59e0b] opacity-40">0{index+1}.</span>
                                        <textarea 
                                            value={amb.description || ''}
                                            onChange={(e) => handleLocalAmbienteChange(amb.id, 'description', e.target.value)}
                                            rows={1}
                                            className="w-full bg-transparent border-none p-0 text-[15px] font-black text-slate-800 uppercase focus:ring-0 resize-y no-print"
                                            placeholder="DESCREVA O AMBIENTE..."
                                        />
                                        <span className="hidden print:block text-[15px] font-black text-slate-800 uppercase whitespace-pre-wrap">
                                            {amb.description || "AMBIENTE NÃO DESCRITO"}
                                        </span>
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

                            <div className="mt-4 no-print flex justify-center">
                                <button 
                                    onClick={addAmbiente}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest transition-all"
                                >
                                    + Adicionar Ambiente
                                </button>
                            </div>
                        </div>
                    ) : (
                        // MODO TÉCNICO: RELAÇÃO DETALHADA DE MATERIAIS
                        <div className="border border-slate-100 rounded-3xl overflow-hidden bg-slate-50/30">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#0f172a] text-[9px] font-black uppercase text-white/70 tracking-wider">
                                        <th className="py-4 px-6">Material / Serviço</th>
                                        <th className="py-4 px-4 text-center">Qtd</th>
                                        <th className="py-4 px-4">Unidade</th>
                                        <th className="py-4 px-4 text-right">Preço Unit.</th>
                                        <th className="py-4 px-6 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(initialBudget.budget_items || []).map((item: any, idx: number) => {
                                        const material = item.budget_materials || item.material;
                                        const name = item.custom_description || material?.name || "Item não identificado";
                                        return (
                                            <tr key={item.id || idx} className="text-[11px] text-slate-700 font-bold hover:bg-slate-50/50">
                                                <td className="py-4 px-6 uppercase">{name}</td>
                                                <td className="py-4 px-4 text-center">{item.quantity}</td>
                                                <td className="py-4 px-4 uppercase text-slate-400 text-[10px]">{material?.unit || 'UN'}</td>
                                                <td className="py-4 px-4 text-right">{formatCurrency(item.unit_price_at_time)}</td>
                                                <td className="py-4 px-6 text-right font-black text-slate-900">{formatCurrency(item.total_price)}</td>
                                            </tr>
                                        );
                                    })}
                                    {(!initialBudget.budget_items || initialBudget.budget_items.length === 0) && (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                                                Nenhum item cadastrado neste orçamento.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* 4. TOTAIS (Apenas para Proposta e Relatório Técnico) */}
                {viewMode !== 'contract' && (
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
                                        className="w-full bg-transparent border-none p-0 text-[10px] text-slate-600 font-bold focus:ring-0 resize-y uppercase font-sans leading-relaxed no-print"
                                        placeholder="INSIRA AS CONDIÇÕES DE PAGAMENTO..."
                                    />
                                    <span className="hidden print:block text-[10px] text-slate-600 font-bold whitespace-pre-wrap uppercase font-sans leading-relaxed">
                                        {paymentTerms}
                                    </span>
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
                )}

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
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-6 no-print flex flex-col md:flex-row justify-between items-center px-12 z-[10000] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] gap-4">
                
                {/* Seletor de Modo (no-print) */}
                <div className="flex gap-2 bg-slate-100 p-1 rounded-full border border-slate-200 shadow-inner">
                    <button
                        onClick={() => setViewMode('commercial')}
                        className={cn(
                            "px-6 py-2.5 rounded-full font-black uppercase text-[10px] tracking-widest transition-all",
                            viewMode === 'commercial' 
                                ? "bg-[#f59e0b] text-white shadow-md" 
                                : "text-slate-600 hover:text-slate-950 hover:bg-slate-200/50"
                        )}
                    >
                        Proposta Comercial
                    </button>
                    <button
                        onClick={() => setViewMode('technical')}
                        className={cn(
                            "px-6 py-2.5 rounded-full font-black uppercase text-[10px] tracking-widest transition-all",
                            viewMode === 'technical' 
                                ? "bg-[#0f172a] text-white shadow-md" 
                                : "text-slate-600 hover:text-slate-950 hover:bg-slate-200/50"
                        )}
                    >
                        Relatório Técnico
                    </button>
                    <button
                        onClick={() => setViewMode('contract')}
                        className={cn(
                            "px-6 py-2.5 rounded-full font-black uppercase text-[10px] tracking-widest transition-all",
                            viewMode === 'contract' 
                                ? "bg-amber-600 text-white shadow-md" 
                                : "text-slate-600 hover:text-slate-950 hover:bg-slate-200/50"
                        )}
                    >
                        Contrato de Venda
                    </button>
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                    <button 
                        onClick={onClose}
                        className="bg-slate-200 text-slate-700 px-8 py-4 rounded-full font-black uppercase tracking-[0.2em] hover:bg-slate-300 transition-all text-xs"
                    >
                        Voltar
                    </button>
                    
                    {onSave && (
                        <button 
                            onClick={handleSaveClick}
                            className="bg-emerald-500 text-white px-8 py-4 rounded-full font-black uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 text-xs flex items-center gap-2"
                        >
                            <Check size={16} />
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

            {/* MODAL DE AJUSTE AUTOMÁTICO DE VALOR DO ORÇAMENTO */}
            {isAdjustModalOpen && (
                <div className="fixed inset-0 z-[10002] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 no-print animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-amber-500/30 text-white rounded-[2rem] p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
                        {/* Cabeçalho */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                                        <Wrench size={20} />
                                    </div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-white">
                                        Ajustar Orçamento no Sistema
                                    </h3>
                                </div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                    O valor da proposta comercial foi alterado no PDF
                                </p>
                            </div>
                            <button 
                                onClick={() => setIsAdjustModalOpen(false)}
                                className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Card Comparativo de Valores */}
                        <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Valor Original</span>
                                <p className="text-sm font-bold text-slate-300">{formatCurrency(initialBaseValue)}</p>
                            </div>
                            <ArrowRight className="text-amber-400 shrink-0" size={18} />
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Novo Valor no PDF</span>
                                <p className="text-lg font-black text-amber-400">{formatCurrency(totalValue)}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Diferença</span>
                                <p className={cn("text-xs font-black", priceDiff >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                    {priceDiff >= 0 ? "+" : ""}{formatCurrency(priceDiff)}
                                </p>
                            </div>
                        </div>

                        {/* Selo de Garantia dos Materiais */}
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 flex items-center gap-3 text-emerald-300">
                            <ShieldCheck size={26} className="shrink-0 text-emerald-400" />
                            <p className="text-[11px] font-bold leading-relaxed">
                                <strong className="text-emerald-400 uppercase">Garantia BJL:</strong> Todas as chapas de MDF, ferragens, fitas e fixação da sua lista continuarão 100% intactas!
                            </p>
                        </div>

                        {/* Opções de Ajuste */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Onde você deseja aplicar essa diferença para fechar a conta?
                            </label>

                            {/* Opção 1: Dias de Serviço */}
                            <div 
                                onClick={() => setAdjustmentMode('days')}
                                className={cn(
                                    "p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5",
                                    adjustmentMode === 'days' 
                                        ? "bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/10" 
                                        : "bg-slate-950/40 border-white/5 text-slate-300 hover:border-white/20"
                                )}
                            >
                                <div className={cn("p-2 rounded-xl mt-0.5", adjustmentMode === 'days' ? "bg-amber-500 text-slate-950" : "bg-white/5 text-slate-400")}>
                                    <Clock size={16} />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-tight">1. Aumentar nos Dias de Serviço</span>
                                        {adjustmentMode === 'days' && <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">Selecionado</span>}
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-snug">
                                        Recalcula para <strong className="text-amber-400">{calculatedDays} {calculatedDays === 1 ? 'dia' : 'dias'} de produção</strong> na diária de R$ 470 (Custo operacional: {formatCurrency(calculatedFixedCost)}). Não altera nenhum material.
                                    </p>
                                </div>
                            </div>

                            {/* Opção 2: Comissão / Margem */}
                            <div 
                                onClick={() => setAdjustmentMode('commission')}
                                className={cn(
                                    "p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5",
                                    adjustmentMode === 'commission' 
                                        ? "bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/10" 
                                        : "bg-slate-950/40 border-white/5 text-slate-300 hover:border-white/20"
                                )}
                            >
                                <div className={cn("p-2 rounded-xl mt-0.5", adjustmentMode === 'commission' ? "bg-amber-500 text-slate-950" : "bg-white/5 text-slate-400")}>
                                    <Percent size={16} />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-tight">2. Aumentar na Comissão / Margem</span>
                                        {adjustmentMode === 'commission' && <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">Selecionado</span>}
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-snug">
                                        Mantém os <strong className="text-white">{currentDays} dias</strong> e ajusta a comissão comercial para cobrir a diferença (Markup <strong className="text-amber-400">{calculatedMarkup.toFixed(2)}x</strong>).
                                    </p>
                                </div>
                            </div>

                            {/* Opção 3: Valor do Serviço na Lista */}
                            <div 
                                onClick={() => setAdjustmentMode('service_item')}
                                className={cn(
                                    "p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5",
                                    adjustmentMode === 'service_item' 
                                        ? "bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/10" 
                                        : "bg-slate-950/40 border-white/5 text-slate-300 hover:border-white/20"
                                )}
                            >
                                <div className={cn("p-2 rounded-xl mt-0.5", adjustmentMode === 'service_item' ? "bg-amber-500 text-slate-950" : "bg-white/5 text-slate-400")}>
                                    <Wrench size={16} />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-tight">3. Mudar o Valor do Serviço na Lista</span>
                                        {adjustmentMode === 'service_item' && <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">Selecionado</span>}
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-snug">
                                        Adiciona/atualiza o item de <strong className="text-amber-400">Mão de Obra e Serviços</strong> na lista com a diferença necessária, sem tocar em nenhum MDF ou ferragem.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Ações do Modal */}
                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => setIsAdjustModalOpen(false)}
                                className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-black text-xs uppercase tracking-widest transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={() => handleConfirmSave(adjustmentMode)}
                                className="flex-[2] py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Check size={16} />
                                Salvar e Aplicar no Orçamento
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
