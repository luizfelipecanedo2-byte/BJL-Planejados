
import { Order } from "@/types/order";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Printer, X } from "lucide-react";

interface WeeklyOrderPrintViewProps {
    orders: Order[];
    onClose: () => void;
}

export default function WeeklyOrderPrintView({ orders, onClose }: WeeklyOrderPrintViewProps) {
    const isCHM = (sup: string) => {
        const up = sup.toUpperCase();
        return up.includes("CHM") || up.includes("C HM") || up.includes("MORAIS") || up.includes("CED");
    };

    const isBRUTA = (sup: string) => {
        const up = sup.toUpperCase();
        return up.includes("BRUTA");
    };

    const chmOrders = orders.filter(o => isCHM(o.supplier));
    const brutaOrders = orders.filter(o => isBRUTA(o.supplier));
    const otherOrders = orders.filter(o => !isCHM(o.supplier) && !isBRUTA(o.supplier));
    
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    const OrderTable = ({ title, items, colorClass, textColorClass }: { title: string, items: Order[], colorClass: string, textColorClass: string }) => (
        <div className="mb-16 break-inside-avoid">
            <div className={`border-l-8 ${colorClass} pl-6 mb-8`}>
                <h2 className={`text-4xl font-black tracking-tighter uppercase ${textColorClass}`}>{title}</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">Pedido de Compra Semanal</p>
                <div className="h-px w-full bg-slate-100 mt-4" />
            </div>
            
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b-2 border-slate-900/10 bg-slate-50">
                        <th className="px-4 py-3 font-black uppercase text-[10px] tracking-widest text-slate-500">Produto</th>
                        <th className="px-4 py-3 font-black uppercase text-[10px] tracking-widest text-slate-500">Cliente</th>
                        <th className="px-4 py-3 font-black uppercase text-[10px] tracking-widest text-slate-500 text-center">Qtd</th>
                        <th className="px-4 py-3 font-black uppercase text-[10px] tracking-widest text-slate-500 text-right">Valor Unit.</th>
                        <th className="px-4 py-3 font-black uppercase text-[10px] tracking-widest text-slate-500 text-right">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {items.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400 uppercase text-[10px] font-black tracking-widest opacity-40 italic">Nenhum pedido registrado esta semana.</td>
                        </tr>
                    ) : (
                        items.map((order) => (
                            <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-4 font-black text-slate-800 text-sm uppercase tracking-tight">{order.product}</td>
                                <td className="px-4 py-4 text-slate-500 font-bold text-xs uppercase tracking-tighter truncate max-w-[200px]">{order.client}</td>
                                <td className="px-4 py-4 text-center font-black text-slate-900">{order.quantity}</td>
                                <td className="px-4 py-4 text-right font-bold text-slate-500 text-xs">{formatCurrency(order.unitPrice)}</td>
                                <td className={`px-4 py-4 text-right font-black text-[15px] ${textColorClass} tracking-tighter`}>{formatCurrency(order.totalValue)}</td>
                            </tr>
                        ))
                    )}
                </tbody>
                {items.length > 0 && (
                    <tfoot>
                        <tr className="bg-slate-900/5">
                            <td colSpan={4} className="px-6 py-6 text-right font-black uppercase text-[10px] tracking-[0.3em] text-slate-400">Total Consolidado do Fornecedor:</td>
                            <td className={`px-6 py-6 text-right font-black text-2xl ${textColorClass} tracking-tighter`}>
                                {formatCurrency(items.reduce((acc, curr) => acc + curr.totalValue, 0))}
                            </td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-white z-[99999] overflow-y-auto p-8 sm:p-12 print:p-0">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-end mb-16 border-b-8 border-slate-900 pb-10">
                    <div>
                        <div className="h-12 w-24 bg-slate-900 flex items-center justify-center text-white font-black text-2xl tracking-tighter mb-6">BJL</div>
                        <h1 className="text-5xl font-black tracking-tighter uppercase leading-none mb-2">Pedidos <span className="text-slate-400">Semanais</span></h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.6em] ml-1">Relatório Oficial de Compras • Procurements List</p>
                    </div>
                    <div className="text-right space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Emissão de Documento</p>
                        <p className="font-black text-xl tracking-tighter">{format(new Date(), "dd/MM/yyyy")}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-50">Localidade: Brusque - SC</p>
                    </div>
                </div>

                {/* Tables */}
                <OrderTable 
                    title="CHM Morais / CED" 
                    items={chmOrders} 
                    colorClass="border-emerald-500" 
                    textColorClass="text-emerald-600"
                />
                
                <OrderTable 
                    title="BRUTA" 
                    items={brutaOrders} 
                    colorClass="border-orange-500" 
                    textColorClass="text-orange-600"
                />

                {otherOrders.length > 0 && (
                    <OrderTable 
                        title="Outros Fornecedores" 
                        items={otherOrders} 
                        colorClass="border-slate-300" 
                        textColorClass="text-slate-400"
                    />
                )}

                {/* Footer */}
                <div className="mt-32 pt-16 border-t-2 border-slate-100 flex justify-between items-center opacity-40">
                    <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-400">BJL Planejados • Suporte Operacional</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Página 1 de 1</p>
                </div>

                {/* Controls */}
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex gap-4 print:hidden z-[100000]">
                    <button
                        onClick={onClose}
                        className="px-8 h-14 rounded-3xl bg-white text-slate-900 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all flex items-center gap-3 border-2 border-slate-100 shadow-xl"
                    >
                        <X size={18} />
                        Fechar Visualização
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="px-10 h-14 rounded-3xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-slate-900/20 hover:bg-black hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                    >
                        <Printer size={20} />
                        Gerar e Imprimir PDF
                    </button>
                </div>
            </div>
        </div>
    );
}
