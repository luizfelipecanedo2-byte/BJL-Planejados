
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calculator, FileText, Search, TrendingUp, DollarSign, Package, Trash2, Pencil, CheckCircle2, History, Settings2, Save, X, Layers, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBudgets, Material } from "@/hooks/useBudgets";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BudgetPrintView from "@/components/orcamento/BudgetPrintView";

const Orcamento = () => {
    const { materials: allMaterials, budgets, loading, updateMaterial, addMaterial, deleteMaterial, saveBudget, refreshBudgets } = useBudgets();
    
    // Sort materials based on custom order
    const sortedMaterials = useMemo(() => {
        const order = ["MDF", "FITAS", "ACABAMENTO", "ACESSORIOS", "FERRAGENS", "FIXACAO", "SUPRIMENTOS", "OUTROS", "SERVICOS"];
        return [...allMaterials].sort((a, b) => {
            const indexA = order.indexOf(a.category);
            const indexB = order.indexOf(b.category);
            if (indexA === -1 && indexB === -1) return a.category.localeCompare(b.category);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            if (indexA !== indexB) return indexA - indexB;
            return a.name.localeCompare(b.name);
        });
    }, [allMaterials]);

    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("orcamentos");
    const [printingBudget, setPrintingBudget] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState({
        client_name: "",
        project_name: "",
        days_estimated: 1,
        daily_fixed_cost: 420,
        profit_margin: 15,
        commission: 3,
        tax: 4,
        installment_fee: 11,
        notes: ""
    });

    const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);

    // Checklist state: stores quantities for ALL materials
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    // Custom prices state: stores price overrides for this specific budget
    const [customPrices, setCustomPrices] = useState<Record<string, number>>({});

    const [isEditMaterialDialogOpen, setIsEditMaterialDialogOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

    const [isNewMaterialDialogOpen, setIsNewMaterialDialogOpen] = useState(false);
    const [newMaterial, setNewMaterial] = useState({
        name: "",
        category: "OUTROS",
        unit: "UNIDADE",
        unit_price: 0
    });

    const handleAddMaterial = async () => {
        if (!newMaterial.name) {
            toast.error("Informe o nome do item");
            return;
        }
        const success = await addMaterial(newMaterial);
        if (success) {
            setIsNewMaterialDialogOpen(false);
            setNewMaterial({ name: "", category: "OUTROS", unit: "UNIDADE", unit_price: 0 });
        }
    };

    const handleUpdateMaterial = async () => {
        if (!editingMaterial || !editingMaterial.name) return;
        const success = await updateMaterial(editingMaterial.id, {
            name: editingMaterial.name,
            category: editingMaterial.category,
            unit: editingMaterial.unit,
            unit_price: editingMaterial.unit_price
        });
        if (success) {
            setIsEditMaterialDialogOpen(false);
            setEditingMaterial(null);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "em_elaboracao":
                return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-200 font-bold uppercase text-[9px] tracking-widest px-2 py-0.5">Em Elaboração</Badge>;
            case "enviado":
                return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-200 font-bold uppercase text-[9px] tracking-widest px-2 py-0.5">Enviado</Badge>;
            case "aprovado":
                return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 font-bold uppercase text-[9px] tracking-widest px-2 py-0.5">Aprovado</Badge>;
            case "rejeitado":
                return <Badge variant="secondary" className="bg-rose-500/10 text-rose-600 border-rose-200 font-bold uppercase text-[9px] tracking-widest px-2 py-0.5">Rejeitado</Badge>;
            default:
                return <Badge className="uppercase text-[9px] tracking-widest">{status}</Badge>;
        }
    };

    const handleQuantityChange = (materialId: string, value: string) => {
        const num = parseFloat(value) || 0;
        setQuantities(prev => ({
            ...prev,
            [materialId]: num
        }));
    };

    const handlePriceChange = (materialId: string, value: string) => {
        const num = parseFloat(value) || 0;
        setCustomPrices(prev => ({
            ...prev,
            [materialId]: num
        }));
    };

    const groupedMaterials = useMemo(() => {
        const order = [
            "MDF", "FITAS", "ACABAMENTO", "ACESSORIOS", "FERRAGENS", "FIXACAO", "SUPRIMENTOS", "OUTROS", "SERVICOS"
        ];

        const groups: Record<string, Material[]> = {};
        sortedMaterials.forEach(m => {
            if (!groups[m.category]) groups[m.category] = [];
            groups[m.category].push(m);
        });

        const sortedEntries: [string, Material[]][] = [];
        order.forEach(cat => {
            if (groups[cat]) {
                sortedEntries.push([cat, groups[cat]]);
            }
        });

        Object.entries(groups).forEach(([cat, items]) => {
            if (!order.includes(cat)) {
                sortedEntries.push([cat, items]);
            }
        });

        return sortedEntries;
    }, [sortedMaterials]);

    const calculateTotals = useMemo(() => {
        const categoryTotals: Record<string, number> = {};
        let materialCost = 0;
        
        Object.entries(quantities).forEach(([id, qty]) => {
            const material = allMaterials.find(m => m.id === id);
            if (material && qty > 0) {
                const unitPrice = customPrices[id] !== undefined ? customPrices[id] : material.unit_price;
                const itemTotal = unitPrice * qty;
                materialCost += itemTotal;
                categoryTotals[material.category] = (categoryTotals[material.category] || 0) + itemTotal;
            }
        });

        const fixedCost = formData.days_estimated * formData.daily_fixed_cost;
        const totalCostPower = materialCost + fixedCost;
        
        const totalAddonsPercent = formData.profit_margin + formData.commission + formData.tax;
        const baseValue = totalCostPower * (1 + (totalAddonsPercent / 100));
        const cardValue = baseValue * (1 + (formData.installment_fee / 100));

        return { materialCost, fixedCost, totalCostPower, baseValue, cardValue, categoryTotals };
    }, [quantities, allMaterials, customPrices, formData.days_estimated, formData.daily_fixed_cost, formData.profit_margin, formData.commission, formData.tax, formData.installment_fee]);

    const handleSaveBudget = async () => {
        if (!formData.client_name) {
            toast.error("Por favor, informe o nome do cliente");
            return;
        }

        const budgetItems = Object.entries(quantities)
            .filter(([_, qty]) => qty > 0)
            .map(([id, qty]) => {
                const material = allMaterials.find(m => m.id === id);
                const unitPrice = customPrices[id] !== undefined ? customPrices[id] : (material?.unit_price || 0);
                return {
                    material_id: id,
                    quantity: qty,
                    unit_price_at_time: unitPrice,
                    total_price: unitPrice * qty
                };
            });

        if (budgetItems.length === 0) {
            toast.error("Adicione quantidades a pelo menos um item");
            return;
        }

        const budgetData: any = {
            client_name: formData.client_name,
            project_name: formData.project_name,
            days_estimated: formData.days_estimated,
            markup_factor: (formData.profit_margin + formData.commission + formData.tax) / 100 + 1,
            card_fee_percent: formData.installment_fee,
            total_cost: calculateTotals.totalCostPower,
            total_value: calculateTotals.cardValue,
            notes: formData.notes,
            status: 'em_elaboracao'
        };

        if (editingBudgetId) {
            budgetData.id = editingBudgetId;
        }

        const success = await saveBudget(budgetData, budgetItems);

        if (success) {
            setIsDialogOpen(false);
            setEditingBudgetId(null);
            setFormData({ client_name: "", project_name: "", days_estimated: 1, daily_fixed_cost: 350, profit_margin: 15, commission: 3, tax: 4, installment_fee: 11, notes: "" });
            setQuantities({});
            setCustomPrices({});
        }
    };

    const handleEditBudget = (budget: any) => {
        setEditingBudgetId(budget.id);
        setFormData({
            client_name: budget.client_name,
            project_name: budget.project_name,
            days_estimated: budget.days_estimated,
            daily_fixed_cost: 420, // This could be stored in DB if needed, but for now 420
            profit_margin: (budget.markup_factor - 1) * 100 - 7, // Approximate reverse (assuming commission 3% and tax 4%)
            commission: 3,
            tax: 4,
            installment_fee: budget.card_fee_percent,
            notes: budget.notes || ""
        });

        // Load quantities and custom prices from budget_items
        const newQuantities: Record<string, number> = {};
        const newCustomPrices: Record<string, number> = {};
        
        if (budget.budget_items) {
            budget.budget_items.forEach((item: any) => {
                newQuantities[item.material_id] = item.quantity;
                newCustomPrices[item.material_id] = item.unit_price_at_time;
            });
        }

        setQuantities(newQuantities);
        setCustomPrices(newCustomPrices);
        setIsDialogOpen(true);
    };

    const handleSaveFromPrintView = async (updatedBudget: any, updatedItems: any[]) => {
        // Find a fallback material id if necessary (first one found)
        const fallbackMaterial = allMaterials[0]?.id;
        
        const finalItems = updatedItems.map(item => ({
            material_id: item.material_id || fallbackMaterial,
            quantity: item.quantity,
            unit_price_at_time: item.unit_price_at_time,
            total_price: item.total_price
        }));

        const success = await saveBudget(updatedBudget, finalItems);
        if (success) {
            setPrintingBudget(null);
            refreshBudgets();
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter text-primary uppercase">Maré de Orçamentos</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest opacity-60">Checklist Técnico Completo (Estilo Planilha)</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setActiveTab(activeTab === "materiais" ? "orcamentos" : "materiais")} className="rounded-2xl h-14 px-6 font-black uppercase tracking-widest text-[10px] border-primary/20 text-primary hover:bg-primary/5 gap-2">
                        {activeTab === "materiais" ? <History className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
                        {activeTab === "materiais" ? "Histórico" : "Editar Lista de Preços"}
                    </Button>

                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) {
                            setEditingBudgetId(null);
                            setFormData({ client_name: "", project_name: "", days_estimated: 1, daily_fixed_cost: 420, profit_margin: 15, commission: 3, tax: 4, installment_fee: 11, notes: "" });
                            setQuantities({});
                            setCustomPrices({});
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-xs px-8 h-14 rounded-2xl shadow-2xl shadow-primary/20 gap-3 transition-all hover:scale-105 active:scale-95 group">
                                <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                                Novo Orçamento
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[1100px] max-h-[95vh] border-none shadow-2xl rounded-[3rem] overflow-hidden p-0 flex flex-col">
                            <div className="bg-primary p-8 text-primary-foreground relative shrink-0">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Calculator size={140} />
                                </div>
                                <div className="relative z-10 flex justify-between items-end">
                                    <div>
                                        <h3 className="text-3xl font-black uppercase tracking-tighter">
                                            {editingBudgetId ? "Ajustar Orçamento" : "Levantamento de Materiais"}
                                        </h3>
                                        <p className="text-[10px] opacity-80 font-black uppercase tracking-[0.2em] mt-2">
                                            {editingBudgetId ? "Refinando os valores para o fechamento" : "Checklist inteligente para não esquecer nenhum detalhe do projeto"}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Valor Final Sugerido</p>
                                        <p className="text-4xl font-black tracking-tighter">{formatCurrency(calculateTotals.cardValue)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex overflow-hidden">
                                <div className="w-80 border-r border-slate-100 p-8 space-y-8 bg-slate-50/50 backdrop-blur-sm">
                                    <div className="space-y-4">
                                        <h4 className="font-black text-[10px] uppercase tracking-widest text-primary flex items-center gap-2">
                                            <AlertCircle className="h-3 w-3" /> Identificação
                                        </h4>
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Cliente</Label>
                                            <Input value={formData.client_name} onChange={e => setFormData({ ...formData, client_name: e.target.value })} placeholder="Nome completo" className="rounded-xl h-12 bg-white border-slate-200 text-slate-900 font-bold" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Ambiente/Projeto</Label>
                                            <Input value={formData.project_name} onChange={e => setFormData({ ...formData, project_name: e.target.value })} placeholder="Ex: Cozinha Gourmet" className="rounded-xl h-12 bg-white border-slate-200 text-slate-900 font-bold" />
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <h4 className="font-black text-[10px] uppercase tracking-widest text-primary flex items-center gap-2">
                                            <DollarSign className="h-3 w-3" /> Custos de Produção
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Dias</Label>
                                                <Input type="number" value={formData.days_estimated} onChange={e => setFormData({ ...formData, days_estimated: parseInt(e.target.value) || 0 })} className="h-10 rounded-xl bg-white border-slate-200 font-bold text-slate-900" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Valor/Dia</Label>
                                                <Input type="number" value={formData.daily_fixed_cost} onChange={e => setFormData({ ...formData, daily_fixed_cost: parseFloat(e.target.value) || 0 })} className="h-10 rounded-xl bg-white border-slate-200 font-bold text-slate-900" />
                                            </div>
                                        </div>
                                        <h4 className="font-black text-[10px] uppercase tracking-widest text-primary flex items-center gap-2">
                                            <DollarSign className="h-3 w-3" /> Precificação
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Lucro (%)</Label>
                                                <Input type="number" value={formData.profit_margin} onChange={e => setFormData({ ...formData, profit_margin: parseFloat(e.target.value) || 0 })} className="h-10 rounded-xl bg-white border-slate-200 font-bold text-slate-900" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Comissão (%)</Label>
                                                <Input type="number" value={formData.commission} onChange={e => setFormData({ ...formData, commission: parseFloat(e.target.value) || 0 })} className="h-10 rounded-xl bg-white border-slate-200 font-bold text-amber-600" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Imposto (%)</Label>
                                                <Input type="number" value={formData.tax} onChange={e => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })} className="h-10 rounded-xl bg-white border-slate-200 font-bold text-slate-900" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Acrésc. Prazo (%)</Label>
                                                <Input type="number" value={formData.installment_fee} onChange={e => setFormData({ ...formData, installment_fee: parseFloat(e.target.value) || 0 })} className="h-10 rounded-xl bg-white border-slate-200 font-bold text-primary" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-primary/10 rounded-3xl space-y-3 border border-primary/10 mt-auto">
                                        <div className="flex justify-between text-[10px] font-black uppercase opacity-60">
                                            <span>Base (Mat + Operac)</span>
                                            <span>{formatCurrency(calculateTotals.totalCostPower)}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] font-black uppercase opacity-60">
                                            <span>À Vista</span>
                                            <span>{formatCurrency(calculateTotals.baseValue)}</span>
                                        </div>
                                        <div className="pt-2 border-t border-primary/20 flex justify-between items-end">
                                            <span className="text-[10px] font-black uppercase text-primary">Prazo</span>
                                            <span className="text-xl font-black text-primary leading-none">{formatCurrency(calculateTotals.cardValue)}</span>
                                        </div>
                                    </div>
                                </div>

                                <ScrollArea className="flex-1 p-8 bg-card">
                                    <div className="space-y-6">
                                        {Object.values(quantities).some(q => q > 0) && (
                                            <div className="mb-8 p-6 bg-primary/5 border-2 border-primary/20 rounded-[2rem] shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                                                    <h4 className="font-black uppercase text-sm tracking-widest text-primary">Preenchimento (Itens do Projeto)</h4>
                                                </div>
                                                <div className="space-y-3">
                                                    {Object.entries(quantities)
                                                        .filter(([_, qty]) => qty > 0)
                                                        .map(([id, qty]) => {
                                                            const item = allMaterials.find(m => m.id === id);
                                                            if (!item) return null;
                                                            const currentPrice = customPrices[id] !== undefined ? customPrices[id] : item.unit_price;
                                                            return (
                                                                <div key={`selected-${id}`} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-primary/30 transition-all gap-4">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[12px] font-black uppercase tracking-tight text-slate-800">{item.name}</span>
                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.category} • {item.unit}</span>
                                                                    </div>
                                                                    <div className="flex flex-wrap items-center gap-4">
                                                                        <div className="flex flex-col gap-1">
                                                                            <Label className="text-[8px] font-black uppercase text-slate-400 ml-1">Quantidade</Label>
                                                                            <Input
                                                                                type="number"
                                                                                className="w-20 h-10 rounded-xl text-center font-black text-xs border-slate-200 focus:ring-primary/20"
                                                                                value={qty || ""}
                                                                                onChange={(e) => handleQuantityChange(id, e.target.value)}
                                                                            />
                                                                        </div>
                                                                        <div className="flex flex-col gap-1">
                                                                            <Label className="text-[8px] font-black uppercase text-slate-400 ml-1">Preço Unitário (R$)</Label>
                                                                            <Input
                                                                                type="number"
                                                                                className="w-28 h-10 rounded-xl text-center font-black text-xs border-slate-200 focus:ring-primary/20 text-primary"
                                                                                value={currentPrice || ""}
                                                                                onChange={(e) => handlePriceChange(id, e.target.value)}
                                                                            />
                                                                        </div>
                                                                        <div className="flex flex-col gap-1 items-end min-w-[100px]">
                                                                            <Label className="text-[8px] font-black uppercase text-slate-400 mr-1">Subtotal</Label>
                                                                            <span className="text-sm font-black text-slate-800">{formatCurrency(currentPrice * qty)}</span>
                                                                        </div>
                                                                        <Button 
                                                                            variant="ghost" 
                                                                            size="icon" 
                                                                            className="h-10 w-10 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl"
                                                                            onClick={() => handleQuantityChange(id, "0")}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 mb-6">
                                            <div className="h-8 w-1 bg-primary rounded-full" />
                                            <h4 className="font-black uppercase text-sm tracking-widest text-foreground">Catálogo Geral (Explorar)</h4>
                                        </div>

                                        <Accordion type="multiple" defaultValue={groupedMaterials.map(([cat]) => cat)} className="space-y-4">
                                            {groupedMaterials.map(([category, items]) => (
                                                <AccordionItem key={category} value={category} className="border border-slate-100 rounded-3xl px-6 bg-white shadow-sm overflow-hidden border-b-0">
                                                    <AccordionTrigger className="hover:no-underline py-4 border-none">
                                                        <div className="flex items-center gap-3">
                                                            <Badge className="bg-primary/5 text-primary border-none font-black text-[9px] uppercase tracking-widest px-3">
                                                                {items.length} ITENS
                                                            </Badge>
                                                            <span className="font-black uppercase text-xs tracking-tighter text-slate-600">{category}</span>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pb-6 border-none">
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {items.map(item => {
                                                                const currentPrice = customPrices[item.id] !== undefined ? customPrices[item.id] : item.unit_price;
                                                                return (
                                                                    <div key={item.id} className={cn(
                                                                        "flex items-center justify-between p-3 rounded-2xl transition-all group",
                                                                        quantities[item.id] > 0 ? "bg-primary/5 border-primary/20 border shadow-inner" : "bg-slate-50 hover:bg-slate-100 border border-transparent"
                                                                    )}>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[11px] font-black uppercase tracking-tight text-slate-700">{item.name}</span>
                                                                            <span className="text-[9px] font-bold text-slate-400 uppercase">{item.unit} • {formatCurrency(item.unit_price)}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-3">
                                                                            {quantities[item.id] > 0 && (
                                                                                <div className="flex flex-col items-end mr-4">
                                                                                    <span className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Preço Unit.</span>
                                                                                    <Input
                                                                                        type="number"
                                                                                        className="w-24 h-8 rounded-lg text-right font-black text-[10px] border-slate-200 focus:bg-white text-primary bg-white"
                                                                                        value={currentPrice || ""}
                                                                                        onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                            <div className="flex flex-col items-end">
                                                                                {quantities[item.id] > 0 && (
                                                                                    <span className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Qtd.</span>
                                                                                )}
                                                                                <Input
                                                                                    type="number"
                                                                                    placeholder="0"
                                                                                    className="w-20 h-10 rounded-xl text-center font-black text-xs border-slate-200 focus:bg-white text-slate-900"
                                                                                    value={quantities[item.id] || ""}
                                                                                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>

                                        {Object.keys(calculateTotals.categoryTotals).length > 0 && (
                                            <div className="mt-12 p-8 border border-primary/20 bg-slate-50/50 rounded-[2.5rem] shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                                        <Calculator size={18} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black uppercase text-sm tracking-widest text-foreground">Planilha de Fechamento</h4>
                                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Resumo consolidado dos custos e precificação</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="space-y-4">
                                                        <span className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                                            <div className="h-1 w-4 bg-primary rounded-full" /> Custos por Divisão
                                                        </span>
                                                        <div className="space-y-2">
                                                            {Object.entries(calculateTotals.categoryTotals).map(([cat, total]) => (
                                                                <div key={cat} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 group">
                                                                    <span className="text-[10px] font-black uppercase text-slate-500 group-hover:text-primary transition-colors">{cat}</span>
                                                                    <span className="text-xs font-black text-slate-700">{formatCurrency(total)}</span>
                                                                </div>
                                                            ))}
                                                            <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 group">
                                                                    <span className="text-[10px] font-black uppercase text-slate-500 group-hover:text-primary transition-colors">Custo Operacional ({formData.days_estimated} dias)</span>
                                                                    <span className="text-xs font-black text-slate-700">{formatCurrency(calculateTotals.fixedCost)}</span>
                                                                </div>
                                                            <div className="pt-4 flex justify-between items-center text-primary">
                                                                <span className="text-[11px] font-black uppercase tracking-widest">Base de Custo Total</span>
                                                                <span className="text-base font-black tracking-tighter">{formatCurrency(calculateTotals.totalCostPower)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                                        <span className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                                            <div className="h-1 w-4 bg-primary rounded-full" /> Apuração de Preço
                                                        </span>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                                                <span className="text-[10px] uppercase font-black text-slate-400">Lucro ({formData.profit_margin}%)</span>
                                                                <span className="text-xs font-black text-slate-600">{formatCurrency(calculateTotals.totalCostPower * (formData.profit_margin / 100))}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                                                <span className="text-[10px] uppercase font-black text-slate-400">Comissão ({formData.commission}%)</span>
                                                                <span className="text-xs font-black text-amber-600">{formatCurrency(calculateTotals.totalCostPower * (formData.commission / 100))}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                                                <span className="text-[10px] uppercase font-black text-slate-400">Imposto ({formData.tax}%)</span>
                                                                <span className="text-xs font-black text-slate-600">{formatCurrency(calculateTotals.totalCostPower * (formData.tax / 100))}</span>
                                                            </div>

                                                            <div className="flex justify-between items-end pt-2">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[9px] font-black uppercase text-slate-400">Valor Sugerido À Vista</span>
                                                                    <span className="text-xs font-black text-slate-600 font-bold uppercase tracking-tight">Preço de Tabela</span>
                                                                </div>
                                                                <span className="text-sm font-black text-slate-800 underline decoration-primary/30 underline-offset-4">{formatCurrency(calculateTotals.baseValue)}</span>
                                                            </div>
                                                            <div className="pt-4 border-t border-primary/20 flex justify-between items-end">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[9px] font-black uppercase text-primary">Preço com Acréscimo (+{formData.installment_fee}%)</span>
                                                                    <span className="text-base font-black text-primary uppercase tracking-tighter">Total Parcelado</span>
                                                                </div>
                                                                <span className="text-2xl font-black text-primary tracking-tighter">{formatCurrency(calculateTotals.cardValue)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>

                            <div className="p-8 shrink-0 bg-slate-50 border-t border-slate-100 flex gap-4 justify-between items-center">
                                <div className="flex items-center gap-3 text-slate-400">
                                    <Package className="h-5 w-5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                        {Object.values(quantities).filter(q => q > 0).length} itens selecionados para o projeto
                                    </span>
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-14 px-8 font-black uppercase tracking-widest text-[10px] rounded-2xl">Descartar</Button>
                                    <Button onClick={handleSaveBudget} className="h-14 px-10 bg-primary font-black uppercase tracking-widest text-xs rounded-2xl shadow-2xl shadow-primary/20 group">
                                        Finalizar e Salvar Projeto
                                        <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {activeTab === "orcamentos" ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Card className="bg-blue-500/5 border-blue-500/20 border-l-4 border-l-blue-500 p-6 flex flex-col gap-3 shadow-xl shadow-blue-500/5 transition-all hover:translate-y-[-4px] group">
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                    <Calculator size={18} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600/50 group-hover:text-blue-600 transition-colors">Em Aberto</span>
                            </div>
                            <div>
                                <span className="text-3xl font-black text-blue-600 tracking-tighter">{formatCurrency(budgets.filter(b => b.status === "em_elaboracao").reduce((acc, curr) => acc + curr.total_value, 0))}</span>
                                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tight mt-1 opacity-60">Total de propostas pendentes</p>
                            </div>
                        </Card>

                        <Card className="bg-emerald-500/5 border-emerald-500/20 border-l-4 border-l-emerald-500 p-6 flex flex-col gap-3 shadow-xl shadow-emerald-500/5 transition-all hover:translate-y-[-4px] group">
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                                    <TrendingUp size={18} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/50 group-hover:text-emerald-600 transition-colors">Conversão</span>
                            </div>
                            <div>
                                <span className="text-3xl font-black text-emerald-600 tracking-tighter">
                                    {budgets.length > 0 ? ((budgets.filter(b => b.status === 'aprovado').length / budgets.length) * 100).toFixed(0) : 0}%
                                </span>
                                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tight mt-1 opacity-60">Taxa de fechamento global</p>
                            </div>
                        </Card>

                        <Card className="bg-amber-500/5 border-amber-500/20 border-l-4 border-l-amber-500 p-6 flex flex-col gap-3 shadow-xl shadow-amber-500/5 transition-all hover:translate-y-[-4px] group">
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                                    <DollarSign size={18} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600/50 group-hover:text-amber-600 transition-colors">Ticket Médio</span>
                            </div>
                            <div>
                                <span className="text-3xl font-black text-amber-600 tracking-tighter">
                                    {formatCurrency(budgets.length > 0 ? (budgets.reduce((acc, curr) => acc + curr.total_value, 0) / budgets.length) : 0)}
                                </span>
                                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tight mt-1 opacity-60">Valor médio por proposta</p>
                            </div>
                        </Card>

                        <Card className="bg-primary/5 border-primary/20 border-l-4 border-l-primary p-6 flex flex-col gap-3 shadow-xl shadow-primary/5 transition-all hover:translate-y-[-4px] group">
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <Layers size={18} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary/50 group-hover:text-primary transition-colors">Catálogo</span>
                            </div>
                            <div>
                                <span className="text-3xl font-black text-primary tracking-tighter">{allMaterials.length}</span>
                                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tight mt-1 opacity-60">Itens cadastrados na lista</p>
                            </div>
                        </Card>
                    </div>

                    <Card className="border-none shadow-2xl bg-card overflow-hidden rounded-[2.5rem]">
                        <CardHeader className="p-8 border-b border-border/10 flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-2xl text-primary border border-border shadow-sm">
                                    <History className="h-6 w-6" />
                                </div>
                                <div className="space-y-0.5">
                                    <CardTitle className="text-lg font-black uppercase tracking-tighter text-foreground">Histórico de Propostas</CardTitle>
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-60">Acompanhamento de orçamentos emitidos</p>
                                </div>
                            </div>
                            <div className="relative w-full sm:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                                <Input
                                    placeholder="Pesquisar cliente..."
                                    className="pl-12 bg-white border-border/50 h-12 rounded-2xl text-xs font-medium shadow-inner focus:ring-2 focus:ring-primary/20"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 text-muted-foreground/50 h-16 border-b border-border/10">
                                            <th className="px-8 text-left font-black uppercase tracking-[0.1em] text-[10px]">Identificação</th>
                                            <th className="px-8 text-left font-black uppercase tracking-[0.1em] text-[10px]">Projeto</th>
                                            <th className="px-8 text-left font-black uppercase tracking-[0.1em] text-[10px]">Data</th>
                                            <th className="px-8 text-right font-black uppercase tracking-[0.1em] text-[10px]">Status</th>
                                            <th className="px-8 text-right font-black uppercase tracking-[0.1em] text-[10px]">Valor Total</th>
                                            <th className="px-8 text-right font-black uppercase tracking-[0.1em] text-[10px]">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/5">
                                        {budgets.filter(b => b.client_name.toLowerCase().includes(searchTerm.toLowerCase())).map((orc) => (
                                            <tr key={orc.id} className="hover:bg-slate-50/80 transition-all group">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-xl bg-muted/30 flex items-center justify-center font-black text-xs text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                            {orc.client_name.charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-[13px] uppercase text-foreground group-hover:text-primary transition-colors leading-tight">{orc.client_name}</span>
                                                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Ref: #{501 + [...budgets].reverse().findIndex(b => b.id === orc.id)}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="font-bold text-[11px] uppercase text-muted-foreground tracking-tighter bg-muted/20 px-3 py-1.5 rounded-lg border border-border/5">{orc.project_name}</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2 text-muted-foreground/70 font-bold text-[11px]">
                                                        {new Date(orc.created_at).toLocaleDateString('pt-BR')}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    {getStatusBadge(orc.status)}
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-black text-sm text-foreground tabular-nums group-hover:text-primary transition-colors">{formatCurrency(orc.total_value)}</span>
                                                        <span className="text-[9px] font-black text-muted-foreground/50 uppercase">Base: {formatCurrency(orc.total_cost * orc.markup_factor)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex justify-end gap-2 pr-2">
                                                         <Button 
                                                             variant="ghost" 
                                                             size="icon" 
                                                             className="h-10 w-10 rounded-xl hover:bg-primary/10 text-slate-400 hover:text-primary transition-all active:scale-95 border border-border/5"
                                                             onClick={() => handleEditBudget(orc)}
                                                         >
                                                             <Pencil size={16} />
                                                         </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-10 w-10 rounded-xl hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-500 transition-all active:scale-95 border border-border/5"
                                                            onClick={() => setPrintingBudget(orc)}
                                                        >
                                                            <FileText size={16} />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {budgets.length === 0 && !loading && (
                                            <tr>
                                                <td colSpan={6} className="py-20 text-center text-muted-foreground italic uppercase text-[10px] font-black tracking-widest opacity-40">
                                                    Nenhum orçamento encontrado
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <Card className="border-none shadow-2xl bg-card overflow-hidden rounded-[2.5rem]">
                    <CardHeader className="p-8 border-b border-border/10 flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white rounded-2xl text-primary border border-border shadow-sm">
                                <Package className="h-6 w-6" />
                            </div>
                            <div className="space-y-0.5">
                                <CardTitle className="text-lg font-black uppercase tracking-tighter text-foreground">Catálogo de Materiais</CardTitle>
                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-60">Gerencie os preços base para cálculo automático</p>
                            </div>
                        </div>

                        <Dialog open={isNewMaterialDialogOpen} onOpenChange={setIsNewMaterialDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[10px] px-6 h-12 rounded-xl shadow-lg shadow-primary/10 gap-2">
                                    <Plus className="h-4 w-4" />
                                    Novo Item
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-none shadow-2xl">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-primary">Novo Material/Serviço</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-6 py-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nome do Item</Label>
                                        <Input value={newMaterial.name} onChange={e => setNewMaterial({ ...newMaterial, name: e.target.value })} placeholder="Ex: Dobradiça Especial" className="rounded-2xl h-12 border-slate-200 text-slate-900 font-bold" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Categoria</Label>
                                            <Select 
                                                value={newMaterial.category} 
                                                onValueChange={val => setNewMaterial({ ...newMaterial, category: val })}
                                            >
                                                <SelectTrigger className="w-full h-12 rounded-2xl border-slate-200 bg-white px-4 text-xs font-bold uppercase text-slate-900 shadow-sm focus:ring-2 focus:ring-primary/20">
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                    {["MDF", "FITAS", "ACABAMENTO", "ACESSORIOS", "FERRAGENS", "FIXACAO", "SUPRIMENTOS", "OUTROS", "SERVICOS"].map(cat => (
                                                        <SelectItem key={cat} value={cat} className="font-black uppercase text-[10px] py-3">{cat}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unidade</Label>
                                            <Input value={newMaterial.unit} onChange={e => setNewMaterial({ ...newMaterial, unit: e.target.value })} placeholder="Ex: UNIDADE, M2, PAR" className="rounded-2xl h-12 border-slate-200 text-slate-900 font-bold" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Preço Unitário (R$)</Label>
                                        <Input type="number" step="0.01" value={newMaterial.unit_price} onChange={e => setNewMaterial({ ...newMaterial, unit_price: parseFloat(e.target.value) || 0 })} className="rounded-2xl h-12 border-slate-200 font-bold text-slate-900" />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setIsNewMaterialDialogOpen(false)} className="rounded-xl font-black uppercase text-[10px]">Cancelar</Button>
                                    <Button onClick={handleAddMaterial} className="bg-primary rounded-xl font-black uppercase text-[10px] px-8 h-12">Adicionar ao Catálogo</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-slate-50 text-muted-foreground/50 h-16 border-b border-border/10">
                                        <th className="px-8 text-left font-black uppercase tracking-[0.1em] text-[10px]">Categoria</th>
                                        <th className="px-8 text-left font-black uppercase tracking-[0.1em] text-[10px]">Nome do Material</th>
                                        <th className="px-8 text-center font-black uppercase tracking-[0.1em] text-[10px]">Unidade</th>
                                        <th className="px-8 text-right font-black uppercase tracking-[0.1em] text-[10px]">Preço Unitário (R$)</th>
                                        <th className="px-8 text-right font-black uppercase tracking-[0.1em] text-[10px]">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/5">
                                    {allMaterials.map((mat) => (
                                        <tr key={mat.id} className="hover:bg-slate-50/80 transition-all group">
                                            <td className="px-8 py-5">
                                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">{mat.category}</Badge>
                                            </td>
                                            <td className="px-8 py-5 font-black uppercase text-[12px] text-foreground opacity-80">{mat.name}</td>
                                            <td className="px-8 py-5 text-center font-bold text-muted-foreground">{mat.unit}</td>
                                            <td className="px-8 py-5 text-right font-black text-sm text-primary">
                                                <Input
                                                    type="number"
                                                    defaultValue={mat.unit_price}
                                                    onBlur={(e) => updateMaterial(mat.id, { unit_price: parseFloat(e.target.value) })}
                                                    className="w-32 ml-auto h-10 rounded-xl text-right font-black border-transparent bg-transparent hover:border-muted focus:bg-white text-slate-900"
                                                />
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-10 w-10 text-primary hover:bg-primary/10 transition-all shadow-sm border border-primary/10"
                                                        onClick={() => {
                                                            setEditingMaterial(mat);
                                                            setIsEditMaterialDialogOpen(true);
                                                        }}
                                                    >
                                                        <Pencil size={16} />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-10 w-10 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                                        onClick={() => {
                                                            if (confirm(`Tem certeza que deseja excluir "${mat.name}"?`)) {
                                                                deleteMaterial(mat.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Dialog open={isEditMaterialDialogOpen} onOpenChange={setIsEditMaterialDialogOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-primary">Editar Item</DialogTitle>
                    </DialogHeader>
                    {editingMaterial && (
                        <div className="grid gap-6 py-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nome do Item</Label>
                                <Input value={editingMaterial.name} onChange={e => setEditingMaterial({ ...editingMaterial, name: e.target.value })} className="rounded-2xl h-12 border-slate-200 text-slate-900 font-bold" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Categoria</Label>
                                    <Select 
                                        value={editingMaterial.category} 
                                        onValueChange={val => setEditingMaterial({ ...editingMaterial, category: val })}
                                    >
                                        <SelectTrigger className="w-full h-12 rounded-2xl border-slate-200 bg-white px-4 text-xs font-bold uppercase text-slate-900">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                                            {["MDF", "FITAS", "ACABAMENTO", "ACESSORIOS", "FERRAGENS", "FIXACAO", "SUPRIMENTOS", "OUTROS", "SERVICOS"].map(cat => (
                                                <SelectItem key={cat} value={cat} className="font-black uppercase text-[10px] py-3">{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unidade</Label>
                                    <Input value={editingMaterial.unit} onChange={e => setEditingMaterial({ ...editingMaterial, unit: e.target.value })} className="rounded-2xl h-12 border-slate-200 text-slate-900 font-bold" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Preço Unitário (R$)</Label>
                                <Input type="number" step="0.01" value={editingMaterial.unit_price} onChange={e => setEditingMaterial({ ...editingMaterial, unit_price: parseFloat(e.target.value) || 0 })} className="rounded-2xl h-12 border-slate-200 font-bold text-slate-900" />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsEditMaterialDialogOpen(false)} className="rounded-xl font-black uppercase text-[10px]">Cancelar</Button>
                        <Button onClick={handleUpdateMaterial} className="bg-primary rounded-xl font-black uppercase text-[10px] px-8 h-12">Salvar Alterações</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                <Card className="p-8 bg-primary/5 border border-primary/10 rounded-3xl flex items-start gap-4">
                    <div className="p-3 bg-primary/20 rounded-2xl text-primary">
                        <TrendingUp className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-black text-primary text-xs uppercase tracking-[0.2em]">Ponto de Equilíbrio</h4>
                        <p className="text-[11px] text-primary/80 font-bold leading-relaxed">Considerando seus custos fixos atuais, você precisa aprovar pelo menos R$ 45.000,00 em orçamentos este mês para atingir o ponto de equilíbrio.</p>
                    </div>
                </Card>
                <Card className="p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl flex items-start gap-4">
                    <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-600">
                        <Calculator className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-black text-emerald-700 text-xs uppercase tracking-[0.2em]">Dica de Lucratividade</h4>
                        <p className="text-[11px] text-emerald-600/80 font-bold leading-relaxed">Orçamentos com mais de 10 dias em elaboração têm 60% menos chance de conversão. Tente enviar a proposta nas primeiras 48 horas.</p>
                    </div>
                </Card>
            </div>

            {printingBudget && (
                <BudgetPrintView 
                    budget={printingBudget} 
                    budgetNumber={501 + [...budgets].reverse().findIndex(b => b.id === printingBudget.id)}
                    onClose={() => setPrintingBudget(null)} 
                    onSave={handleSaveFromPrintView}
                />
            )}
        </div>
    );
};

export default Orcamento;
