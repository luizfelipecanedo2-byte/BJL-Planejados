
import { Order } from "@/types/order";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Printer, X } from "lucide-react";

interface WeeklyOrderPrintViewProps {
    orders: Order[];
    onClose: () => void;
}

export default function WeeklyOrderPrintView({ orders, onClose }: WeeklyOrderPrintViewProps) {
    const suppliers = ["CHM Morais", "BRUTA"];
    const otherOrders = orders.filter(o => !suppliers.includes(o.supplier));
    
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    const OrderTable = ({ title, items, colorClass }: { title: string, items: Order[], colorClass: string }) => (
        <div className="mb-12 break-after-page">
            <div className={`border-l-8 ${colorClass} pl-4 mb-6`}>
                <h2 className="text-3xl font-black tracking-tighter uppercase">{title}</h2>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Pedido Semanal - BJL Planejados</p>
            </div>
            
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b-2 border-slate-200">
                        <th className="py-3 font-black uppercase text-[10px] tracking-widest text-slate-400">Produto</th>
                        <th className="py-3 font-black uppercase text-[10px] tracking-widest text-slate-400">Cliente</th>
                        <th className="py-3 font-black uppercase text-[10px] tracking-widest text-slate-400 text-center">Qtd</th>
                        <th className="py-3 font-black uppercase text-[10px] tracking-widest text-slate-400 text-right">Valor Unit.</th>
                        <th className="py-3 font-black uppercase text-[10px] tracking-widest text-slate-400 text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {items.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400 italic">Nenhum pedido para este fornecedor esta semana.</td>
                        </tr>
                    ) : (
                        items.map((order) => (
                            <tr key={order.id} className="border-b border-slate-100">
                                <td className="py-4 font-bold text-slate-800">{order.product}</td>
                                <td className="py-4 text-slate-600">{order.client}</td>
                                <td className="py-4 text-center font-mono">{order.quantity}</td>
                                <td className="py-4 text-right font-mono">{formatCurrency(order.unitPrice)}</td>
                                <td className="py-4 text-right font-black text-slate-900">{formatCurrency(order.totalValue)}</td>
                            </tr>
                        ))
                    )}
                </tbody>
                {items.length > 0 && (
                    <tfoot>
                        <tr>
                            <td colSpan={4} className="py-6 text-right font-black uppercase text-xs tracking-widest text-slate-500">Total do Pedido:</td>
                            <td className="py-6 text-right font-black text-xl text-slate-900 tracking-tighter">
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
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-start mb-12 border-b-4 border-slate-900 pb-8">
                    <div>
                        <img src="/logo-bjl.png" alt="BJL" className="h-16 w-auto mb-4" />
                        <h1 className="text-4xl font-black tracking-tighter uppercase">Relatório de Pedidos</h1>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.3em]">
                            Semana: {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Emissão</p>
                        <p className="font-bold">{format(new Date(), "dd/MM/yyyy HH:mm")}</p>
                    </div>
                </div>

                {/* Tables */}
                <OrderTable 
                    title="CHM Morais" 
                    items={orders.filter(o => o.supplier === "CHM Morais")} 
                    colorClass="border-emerald-500" 
                />
                
                <OrderTable 
                    title="BRUTA" 
                    items={orders.filter(o => o.supplier === "BRUTA")} 
                    colorClass="border-orange-500" 
                />

                {otherOrders.length > 0 && (
                    <OrderTable 
                        title="Outros Fornecedores" 
                        items={otherOrders} 
                        colorClass="border-slate-300" 
                    />
                )}

                {/* Footer */}
                <div className="mt-20 pt-12 border-t border-slate-200 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300">BJL Planejados • Sistema de Gestão de Suprimentos</p>
                </div>

                {/* Controls */}
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-4 print:hidden">
                    <button
                        onClick={onClose}
                        className="px-6 h-12 rounded-2xl bg-slate-100 text-slate-900 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2 border border-slate-200"
                    >
                        <X size={16} />
                        Fechar
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="px-8 h-12 rounded-2xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                    >
                        <Printer size={18} />
                        Imprimir Pedidos (PDF)
                    </button>
                </div>
            </div>
        </div>
    );
}
