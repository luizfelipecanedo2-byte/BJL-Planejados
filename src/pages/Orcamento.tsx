
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MagicButton } from "@/components/ui/magic-button";
import { Plus, Calculator, FileText, Search, TrendingUp, DollarSign, Package, Trash2, Pencil, CheckCircle2, History as HistoryIcon, Settings2, Save, X, Layers, ChevronDown, ChevronRight, AlertCircle, XCircle, Printer, Filter, LayoutGrid, List, RotateCcw } from "lucide-react";
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
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { estimateProjectMaterials, GeminiEstimationResult } from "@/services/geminiService";
import { Sparkles, Key, UploadCloud, FileImage, Brain, Hammer, Hourglass, Check } from "lucide-react";

const analysisSteps = [
    "Analisando o desenho do projeto...",
    "Modelando módulos e estimando volumes de MDF...",
    "Calculando cortes e fitas de borda...",
    "Calculando dobradiças, corrediças e ferragens...",
    "Ajustando suprimentos e estimando dias de produção..."
];

const Orcamento = () => {
    const { materials: allMaterials, budgets, loading, updateMaterial, addMaterial, deleteMaterial, deleteBudget, saveBudget, refreshBudgets, convertToWeeklyOrders, cancelBudgetApproval } = useBudgets();
    
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
    const [materialSearchTerm, setMaterialSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("orcamentos");
    const [printingBudget, setPrintingBudget] = useState<any>(null);
    const [printingTab, setPrintingTab] = useState<'commercial' | 'technical'>('commercial');
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

    // Spotlight effect tracker with cached rect to avoid layout thrashing
    const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const card = e.currentTarget;
        let rect = (card as any)._cachedRect;
        if (!rect) {
            rect = card.getBoundingClientRect();
            (card as any)._cachedRect = rect;
        }
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        card.style.setProperty("--mouse-x", `${x}px`);
        card.style.setProperty("--mouse-y", `${y}px`);
    };

    const handleCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
        delete (e.currentTarget as any)._cachedRect;
    };

    const availableYears = useMemo(() => {
        const years = new Set<string>();
        budgets.forEach(b => {
            if (b.created_at) {
                const year = new Date(b.created_at).getFullYear().toString();
                if (!isNaN(parseInt(year))) years.add(year);
            }
        });
        
        // Add current year and the next 5 years
        const currentYear = new Date().getFullYear();
        for (let i = 0; i <= 5; i++) {
            years.add((currentYear + i).toString());
        }
        
        return Array.from(years).sort();
    }, [budgets]);

    const filteredBudgetsByYear = useMemo(() => {
        return budgets.filter(b => {
            if (!b.created_at) return selectedYear === "2026"; // Fallback for old data
            return new Date(b.created_at).getFullYear().toString() === selectedYear;
        });
    }, [budgets, selectedYear]);

    const filteredBudgets = useMemo(() => {
        return filteredBudgetsByYear.filter(b => 
            b.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.project_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [filteredBudgetsByYear, searchTerm]);

    // Form State
    const [formData, setFormData] = useState({
        client_name: "",
        project_name: "",
        days_estimated: 1,
        daily_fixed_cost: 470,
        profit_margin: 15,
        commission: 3,
        tax: 4,
        installment_fee: 11,
        notes: ""
    });

    const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);

    // AI Vision Estimator States
    const [activeRightTab, setActiveRightTab] = useState("manual");
    const [geminiKey, setGeminiKey] = useState("");
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedImageName, setSelectedImageName] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStep, setAnalysisStep] = useState(0);
    const [aiResult, setAiResult] = useState<GeminiEstimationResult | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);

    useEffect(() => {
        const storedKey = localStorage.getItem("bjl_gemini_api_key") || "";
        setGeminiKey(storedKey);
    }, []);

    // Checklist state: stores numeric quantities for ALL materials
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    // Raw quantities state: keeps exact user input strings (e.g. "" while backspacing, or "10.5")
    const [rawQuantities, setRawQuantities] = useState<Record<string, string>>({});

    // Custom prices state: stores price overrides for this specific budget
    const [customPrices, setCustomPrices] = useState<Record<string, number>>({});
    // Raw prices state: keeps exact user input strings for prices
    const [rawPrices, setRawPrices] = useState<Record<string, string>>({});

    // Selected material IDs: list of materials added to this budget
    const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);

    const [isEditMaterialDialogOpen, setIsEditMaterialDialogOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

    const [isNewMaterialDialogOpen, setIsNewMaterialDialogOpen] = useState(false);
    const [newMaterial, setNewMaterial] = useState({
        name: "",
        category: "OUTROS",
        supplier: "CHM Morais",
        unit: "UNIDADE",
        unit_price: 0
    });

    // Cycle loading steps
    useEffect(() => {
        let interval: any;
        if (isAnalyzing) {
            interval = setInterval(() => {
                setAnalysisStep(prev => (prev + 1) % analysisSteps.length);
            }, 2500);
        } else {
            setAnalysisStep(0);
        }
        return () => clearInterval(interval);
    }, [isAnalyzing]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedImageName(file.name);
        setAiError(null);

        const reader = new FileReader();
        reader.onloadend = () => {
            setSelectedImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleAnalyzeProject = async () => {
        if (!geminiKey) {
            toast.error("Por favor, informe a Chave API do Gemini.");
            return;
        }
        if (!selectedImage) {
            toast.error("Por favor, selecione uma imagem do projeto.");
            return;
        }

        setIsAnalyzing(true);
        setAiError(null);
        setAiResult(null);

        try {
            // Map Materials to the catalog type expected by the Gemini service
            const catalog = allMaterials.map(m => ({
                id: m.id,
                name: m.name,
                category: m.category,
                unit: m.unit,
                unit_price: m.unit_price
            }));

            const result = await estimateProjectMaterials(geminiKey, selectedImage, catalog);
            setAiResult(result);
            toast.success("Análise concluída com sucesso!");
        } catch (err: any) {
            console.error("Gemini Analysis Error:", err);
            setAiError(err.message || "Ocorreu um erro ao analisar o projeto.");
            toast.error("Erro na análise da IA.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveGeminiKeyLocally = () => {
        if (!geminiKey) {
            toast.error("Chave inválida.");
            return;
        }
        localStorage.setItem("bjl_gemini_api_key", geminiKey);
        toast.success("Chave salva localmente no navegador!");
    };

    const handleApplyAiEstimation = () => {
        if (!aiResult) return;

        // Reset quantities to reflect the AI recommendation
        const resetQuantities: Record<string, number> = {};

        aiResult.items.forEach(item => {
            const material = allMaterials.find(m => m.id === item.id);
            if (material) {
                resetQuantities[item.id] = item.qty;
            }
        });

        setQuantities(resetQuantities);

        // Also suggest production days
        if (aiResult.days_estimated > 0) {
            setFormData(prev => ({
                ...prev,
                days_estimated: aiResult.days_estimated
            }));
        }

        toast.success("Itens sugeridos pela IA aplicados ao orçamento!");
        
        // Reset analysis state and switch back to manual tab for review
        setSelectedImage(null);
        setSelectedImageName("");
        setAiResult(null);
        setActiveRightTab("manual");
    };

    const handleAddMaterial = async () => {
        if (!newMaterial.name) {
            toast.error("Informe o nome do item");
            return;
        }
        const success = await addMaterial(newMaterial);
        if (success) {
            setIsNewMaterialDialogOpen(false);
            setNewMaterial({ name: "", category: "OUTROS", supplier: "CHM Morais", unit: "UNIDADE", unit_price: 0 });
        }
    };

    const handleUpdateMaterial = async () => {
        if (!editingMaterial || !editingMaterial.name) return;
        const success = await updateMaterial(editingMaterial.id, {
            name: editingMaterial.name,
            category: editingMaterial.category,
            supplier: editingMaterial.supplier || "CHM Morais",
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
        setRawQuantities(prev => ({ ...prev, [materialId]: value }));
        const normalized = value.replace(',', '.');
        const num = parseFloat(normalized) || 0;
        
        setQuantities(prev => ({
            ...prev,
            [materialId]: num
        }));

        if (value.trim() !== "" && num > 0) {
            setSelectedMaterialIds(prev => prev.includes(materialId) ? prev : [...prev, materialId]);
        }
    };

    const handleRemoveMaterial = (materialId: string) => {
        setSelectedMaterialIds(prev => prev.filter(id => id !== materialId));
        setQuantities(prev => {
            const copy = { ...prev };
            delete copy[materialId];
            return copy;
        });
        setRawQuantities(prev => {
            const copy = { ...prev };
            delete copy[materialId];
            return copy;
        });
        setCustomPrices(prev => {
            const copy = { ...prev };
            delete copy[materialId];
            return copy;
        });
        setRawPrices(prev => {
            const copy = { ...prev };
            delete copy[materialId];
            return copy;
        });
    };

    const handlePriceChange = (materialId: string, value: string) => {
        setRawPrices(prev => ({ ...prev, [materialId]: value }));
        const normalized = value.replace(',', '.');
        const num = parseFloat(normalized) || 0;
        
        setCustomPrices(prev => ({
            ...prev,
            [materialId]: num
        }));
    };

    const isCHM = (sup?: string) => {
        if (!sup) return false;
        const up = sup.toUpperCase();
        return up.includes("CHM") || up.includes("MORAIS") || up.includes("C HM") || up.includes("CED");
    };

    const isBRUTA = (sup?: string) => {
        if (!sup) return false;
        const up = sup.toUpperCase();
        return up.includes("BRUTA");
    };

    const [activeSupplierFilter, setActiveSupplierFilter] = useState<"TODOS" | "CHM" | "BRUTA" | "OUTROS">("TODOS");

    const filteredMaterialsForCatalog = useMemo(() => {
        if (!materialSearchTerm) return sortedMaterials;
        const search = materialSearchTerm.toLowerCase();
        return sortedMaterials.filter(m => 
            m.name.toLowerCase().includes(search) || 
            m.category.toLowerCase().includes(search) ||
            (m.supplier && m.supplier.toLowerCase().includes(search))
        );
    }, [sortedMaterials, materialSearchTerm]);

    const groupedBySupplier = useMemo(() => {
        const data: Record<string, Record<string, Material[]>> = {};

        filteredMaterialsForCatalog.forEach(m => {
            let supplierGroup = "Outros";
            if (isCHM(m.supplier)) supplierGroup = "CHM Morais / CED";
            else if (isBRUTA(m.supplier)) supplierGroup = "BRUTA";

            if (!data[supplierGroup]) data[supplierGroup] = {};
            if (!data[supplierGroup][m.category]) data[supplierGroup][m.category] = [];
            data[supplierGroup][m.category].push(m);
        });

        // Preferred order of suppliers & categories
        const SUPPLIER_ORDER = ["CHM Morais / CED", "BRUTA", "Outros"];
        const CATEGORY_ORDER = ["MDF", "FITAS", "ACABAMENTO", "ACESSORIOS", "FERRAGENS", "FIXACAO", "SUPRIMENTOS", "OUTROS", "SERVICOS"];

        const sortedData: Record<string, Record<string, Material[]>> = {};

        const supplierKeys = Object.keys(data).sort((a, b) => {
            const idxA = SUPPLIER_ORDER.indexOf(a);
            const idxB = SUPPLIER_ORDER.indexOf(b);
            if (idxA === -1 && idxB === -1) return a.localeCompare(b);
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
        });

        supplierKeys.forEach(supplier => {
            sortedData[supplier] = {};
            const catKeys = Object.keys(data[supplier]).sort((a, b) => {
                const idxA = CATEGORY_ORDER.indexOf(a);
                const idxB = CATEGORY_ORDER.indexOf(b);
                if (idxA === -1 && idxB === -1) return a.localeCompare(b);
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
            });
            catKeys.forEach(cat => {
                sortedData[supplier][cat] = data[supplier][cat];
            });
        });

        return sortedData; 
    }, [filteredMaterialsForCatalog]);

    const calculateTotals = useMemo(() => {
        const categoryTotals: Record<string, number> = {};
        let materialCost = 0;
        
        selectedMaterialIds.forEach(id => {
            const qty = quantities[id] || 0;
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
    }, [selectedMaterialIds, quantities, allMaterials, customPrices, formData.days_estimated, formData.daily_fixed_cost, formData.profit_margin, formData.commission, formData.tax, formData.installment_fee]);

    const handleSaveBudget = async () => {
        if (!formData.client_name) {
            toast.error("Por favor, informe o nome do cliente");
            return;
        }

        const budgetItems = selectedMaterialIds
            .map(id => {
                const qty = quantities[id] || 0;
                const material = allMaterials.find(m => m.id === id);
                const unitPrice = customPrices[id] !== undefined ? customPrices[id] : (material?.unit_price || 0);
                return {
                    material_id: id,
                    quantity: qty,
                    unit_price_at_time: unitPrice,
                    total_price: unitPrice * qty
                };
            })
            .filter(item => item.quantity > 0);

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
            total_value: calculateTotals.baseValue,
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
            setFormData({ client_name: "", project_name: "", days_estimated: 1, daily_fixed_cost: 470, profit_margin: 15, commission: 3, tax: 4, installment_fee: 11, notes: "" });
            setQuantities({});
            setRawQuantities({});
            setCustomPrices({});
            setRawPrices({});
            setSelectedMaterialIds([]);
            localStorage.removeItem('orcamento_new_draft');
        }
    };

    const handleEditBudget = (budget: any) => {
        setEditingBudgetId(budget.id);
        setFormData({
            client_name: budget.client_name,
            project_name: budget.project_name,
            days_estimated: budget.days_estimated,
            daily_fixed_cost: 470,
            profit_margin: (budget.markup_factor - 1) * 100 - 7,
            commission: 3,
            tax: 4,
            installment_fee: budget.card_fee_percent,
            notes: budget.notes || ""
        });

        // Load quantities, raw quantities, custom prices, and selectedMaterialIds from budget_items
        const newQuantities: Record<string, number> = {};
        const newRawQuantities: Record<string, string> = {};
        const newCustomPrices: Record<string, number> = {};
        const newRawPrices: Record<string, string> = {};
        const newSelectedIds: string[] = [];
        
        if (budget.budget_items) {
            budget.budget_items.forEach((item: any) => {
                if (item.quantity > 0) {
                    newSelectedIds.push(item.material_id);
                    newQuantities[item.material_id] = item.quantity;
                    newRawQuantities[item.material_id] = String(item.quantity);
                    newCustomPrices[item.material_id] = item.unit_price_at_time;
                    newRawPrices[item.material_id] = String(item.unit_price_at_time);
                }
            });
        }

        setQuantities(newQuantities);
        setRawQuantities(newRawQuantities);
        setCustomPrices(newCustomPrices);
        setRawPrices(newRawPrices);
        setSelectedMaterialIds(newSelectedIds);
        setIsDialogOpen(true);
    };

    // Auto-save & restore unsubmitted draft for new budgets
    useEffect(() => {
        if (isDialogOpen && !editingBudgetId) {
            const draft = localStorage.getItem('orcamento_new_draft');
            if (draft) {
                try {
                    const parsed = JSON.parse(draft);
                    if (parsed && (parsed.formData?.client_name || (parsed.selectedMaterialIds && parsed.selectedMaterialIds.length > 0))) {
                        setFormData(parsed.formData || formData);
                        setQuantities(parsed.quantities || {});
                        setRawQuantities(parsed.rawQuantities || {});
                        setCustomPrices(parsed.customPrices || {});
                        setRawPrices(parsed.rawPrices || {});
                        setSelectedMaterialIds(parsed.selectedMaterialIds || []);
                    }
                } catch (e) {
                    console.error("Error restoring budget draft", e);
                }
            }
        }
    }, [isDialogOpen, editingBudgetId]);

    useEffect(() => {
        if (isDialogOpen && !editingBudgetId) {
            const draftData = {
                formData,
                quantities,
                rawQuantities,
                customPrices,
                rawPrices,
                selectedMaterialIds
            };
            localStorage.setItem('orcamento_new_draft', JSON.stringify(draftData));
        }
    }, [isDialogOpen, editingBudgetId, formData, quantities, rawQuantities, customPrices, rawPrices, selectedMaterialIds]);

    const handleDiscardDraft = () => {
        localStorage.removeItem('orcamento_new_draft');
        setFormData({ client_name: "", project_name: "", days_estimated: 1, daily_fixed_cost: 470, profit_margin: 15, commission: 3, tax: 4, installment_fee: 11, notes: "" });
        setQuantities({});
        setRawQuantities({});
        setCustomPrices({});
        setRawPrices({});
        setSelectedMaterialIds([]);
        setIsDialogOpen(false);
    };

    const handleSaveFromPrintView = async (updatedBudget: any, updatedItems: any[]) => {
        if (!allMaterials || allMaterials.length === 0) {
            toast.error("Capacidade técnica não detectada (Catálogo vazio)");
            return;
        }

        // Tenta encontrar um material genérico para itens avulsos da visualização de impressão
        const othersMaterial = allMaterials.find(m => 
            m.name.toUpperCase().includes('OUTRO') || 
            m.category === 'OUTROS' ||
            m.category === 'SERVICOS'
        );
        
        const fallbackMaterial = othersMaterial?.id || allMaterials[0].id;
        
        const finalItems = updatedItems
            .filter(item => {
                if (item.material_id) return true;
                return item && item.material_name && typeof item.material_name === 'string' && item.material_name.trim() !== "";
            })
            .map(item => ({
                material_id: item.material_id || fallbackMaterial,
                quantity: parseFloat(item.quantity) || 0,
                unit_price_at_time: parseFloat(item.unit_price_at_time) || 0,
                total_price: parseFloat(item.total_price) || 0,
                custom_description: item.material_name
            }));

        if (finalItems.length === 0) {
            toast.error("O orçamento não possui nenhum item válido.");
            return;
        }

        // Recalcular os totais para garantir que a capa do orçamento (tabela budgets) fique correta
        const newTotalValue = finalItems.reduce((acc, item) => acc + item.total_price, 0);
        
        // Estimar o custo total (total_cost) baseado no markup_factor se existir, ou apenas usar o total_value
        const markup = updatedBudget.markup_factor || 1.25;
        const newTotalCost = newTotalValue / markup;

        const budgetToSave = {
            ...updatedBudget,
            total_value: newTotalValue,
            total_cost: newTotalCost
        };

        const result = await saveBudget(budgetToSave, finalItems);
        if (result) {
            setPrintingBudget(null);
            refreshBudgets();
        }
    };

    return (
        <div className="flex flex-col gap-10 min-h-screen animate-in fade-in duration-1000 pb-20">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-2">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-3 mb-1">
                         <div className="h-8 w-1 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                         <h1 className="text-4xl font-['Cinzel'] font-bold text-luxury tracking-wider shimmer-gold uppercase">Orçamentos</h1>
                    </div>
                    <p className="text-muted-foreground font-bold uppercase tracking-[0.2em] text-[10px] opacity-60">Maré de Orçamentos & Engenharia de Valor</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button 
                        variant="ghost" 
                        onClick={() => setActiveTab(activeTab === "materiais" ? "orcamentos" : "materiais")} 
                        className="h-14 px-8 rounded-2xl glass-card border-white/5 luxury-shadow hover:bg-primary/5 hover:text-primary transition-all group overflow-hidden relative"
                    >
                        {activeTab === "materiais" ? <HistoryIcon className="mr-3 h-5 w-5 group-hover:rotate-180 transition-transform duration-500" /> : <Settings2 className="mr-3 h-5 w-5 group-hover:rotate-90 transition-transform duration-500" />}
                        <span className="font-black text-[11px] uppercase tracking-widest text-luxury">
                            {activeTab === "materiais" ? "Histórico de Propostas" : "Gerenciar Tabela de Preços"}
                        </span>
                    </Button>

                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) {
                            setEditingBudgetId(null);
                            setFormData({ client_name: "", project_name: "", days_estimated: 1, daily_fixed_cost: 470, profit_margin: 15, commission: 3, tax: 4, installment_fee: 11, notes: "" });
                            setQuantities({});
                            setCustomPrices({});
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button 
                                className="h-14 px-10 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs shadow-[0_0_30px_rgba(var(--primary),0.3)] hover:shadow-[0_0_50px_rgba(var(--primary),0.5)] transition-all group hover:scale-105 active:scale-95"
                            >
                                <Plus className="mr-3 h-5 w-5 group-hover:rotate-90 transition-transform duration-500" />
                                Novo Levantamento
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[95vw] sm:max-w-[1350px] max-w-[1350px] h-[92vh] max-h-[92vh] border-none shadow-2xl rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden p-0 flex flex-col">
                            <div className="bg-primary p-8 text-primary-foreground relative shrink-0">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Calculator size={140} />
                                </div>
                                <div className="relative z-10 flex justify-between items-end">
                                    <div>
                                        <h3 className="text-xl sm:text-3xl font-black uppercase tracking-tighter">
                                            {editingBudgetId ? "Ajustar Orçamento" : "Levantamento de Materiais"}
                                        </h3>
                                        <p className="text-[10px] opacity-80 font-black uppercase tracking-[0.2em] mt-2">
                                            {editingBudgetId ? "Refinando os valores para o fechamento" : "Checklist inteligente para não esquecer nenhum detalhe do projeto"}
                                        </p>
                                    </div>
                                    <div className="text-right mt-4 sm:mt-0">
                                        <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Valor Final Sugerido</p>
                                        <p className="text-2xl sm:text-4xl font-black tracking-tighter">{formatCurrency(calculateTotals.cardValue)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
                                <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-100 p-6 sm:p-8 space-y-6 sm:space-y-8 bg-slate-50/50 backdrop-blur-sm overflow-y-auto max-h-[40vh] md:max-h-full">
                                    <div className="space-y-4">
                                        <h4 className="font-black text-[10px] uppercase tracking-widest text-primary flex items-center gap-2">
                                            <AlertCircle className="h-3 w-3" /> Identificação
                                        </h4>
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cliente</Label>
                                            <Input value={formData.client_name} onChange={e => setFormData({ ...formData, client_name: e.target.value })} placeholder="Nome completo" className="rounded-xl h-12 bg-white/5 border-white/10 text-white font-bold focus:bg-white/10 transition-all" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ambiente/Projeto</Label>
                                            <Input value={formData.project_name} onChange={e => setFormData({ ...formData, project_name: e.target.value })} placeholder="Ex: Cozinha Gourmet" className="rounded-xl h-12 bg-white/5 border-white/10 text-white font-bold focus:bg-white/10 transition-all" />
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <h4 className="font-black text-[10px] uppercase tracking-widest text-primary flex items-center gap-2">
                                            <DollarSign className="h-3 w-3" /> Custos de Produção
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Dias</Label>
                                                <Input type="number" value={formData.days_estimated} onChange={e => setFormData({ ...formData, days_estimated: parseInt(e.target.value) || 0 })} className="h-10 rounded-xl bg-white/5 border-white/10 font-bold text-white focus:bg-white/10 transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Valor/Dia</Label>
                                                <Input type="number" value={formData.daily_fixed_cost} onChange={e => setFormData({ ...formData, daily_fixed_cost: parseFloat(e.target.value) || 0 })} className="h-10 rounded-xl bg-white/5 border-white/10 font-bold text-white focus:bg-white/10 transition-all" />
                                            </div>
                                        </div>
                                        <h4 className="font-black text-[10px] uppercase tracking-widest text-primary flex items-center gap-2">
                                            <DollarSign className="h-3 w-3" /> Precificação
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Lucro (%)</Label>
                                                <Input type="number" value={formData.profit_margin} onChange={e => setFormData({ ...formData, profit_margin: parseFloat(e.target.value) || 0 })} className="h-10 rounded-xl bg-white/5 border-white/10 font-bold text-emerald-400 focus:bg-white/10 transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Comissão (%)</Label>
                                                <Input type="number" value={formData.commission} onChange={e => setFormData({ ...formData, commission: parseFloat(e.target.value) || 0 })} className="h-10 rounded-xl bg-white/5 border-white/10 font-bold text-amber-400 focus:bg-white/10 transition-all" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Imposto (%)</Label>
                                                <Input type="number" value={formData.tax} onChange={e => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })} className="h-10 rounded-xl bg-white/5 border-white/10 font-bold text-white focus:bg-white/10 transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Acrésc. Prazo (%)</Label>
                                                <Input type="number" value={formData.installment_fee} onChange={e => setFormData({ ...formData, installment_fee: parseFloat(e.target.value) || 0 })} className="h-10 rounded-xl bg-white/5 border-white/10 font-bold text-primary focus:bg-white/10 transition-all" />
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
                                </div>
                            </div>

                            <Tabs value={activeRightTab} onValueChange={setActiveRightTab} className="flex-1 flex flex-col overflow-hidden min-h-0">
                                <div className="px-8 pt-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-card">
                                    <TabsList className="bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                                        <TabsTrigger value="manual" className="px-6 py-2 rounded-lg font-black text-[10px] tracking-widest uppercase data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm">
                                            Checklist Manual
                                        </TabsTrigger>
                                        <TabsTrigger value="ai" className="px-6 py-2 rounded-lg font-black text-[10px] tracking-widest uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm flex items-center gap-1.5">
                                            <Sparkles className="h-3.5 w-3.5 animate-pulse text-amber-400" /> Assistente de IA ✨
                                        </TabsTrigger>
                                    </TabsList>
                                </div>
                                
                                <TabsContent value="manual" className="flex-1 overflow-hidden m-0 flex flex-col min-h-0">
                                    <ScrollArea className="flex-1 p-8 bg-card">
                                    <div className="space-y-6">
                                        {selectedMaterialIds.length > 0 && (
                                            <div className="mb-8 p-6 bg-primary/5 border-2 border-primary/20 rounded-[2rem] shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                                                    <h4 className="font-black uppercase text-sm tracking-widest text-primary">Preenchimento (Itens do Projeto)</h4>
                                                </div>
                                                <div className="space-y-3">
                                                    {selectedMaterialIds.map((id) => {
                                                        const item = allMaterials.find(m => m.id === id);
                                                        if (!item) return null;
                                                        const qtyNum = quantities[id] || 0;
                                                        const qtyStr = rawQuantities[id] !== undefined ? rawQuantities[id] : (qtyNum ? String(qtyNum) : "");
                                                        const currentPrice = customPrices[id] !== undefined ? customPrices[id] : item.unit_price;
                                                        const priceStr = rawPrices[id] !== undefined ? rawPrices[id] : String(currentPrice);

                                                        return (
                                                            <div key={`selected-${id}`} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:border-primary/30 transition-all gap-4">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[12px] font-black uppercase tracking-tight text-slate-900 dark:text-white">{item.name}</span>
                                                                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{item.category} • {item.unit}</span>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-4">
                                                                    <div className="flex flex-col gap-1">
                                                                        <Label className="text-[8px] font-black uppercase text-slate-400 ml-1">Quantidade</Label>
                                                                        <Input
                                                                            type="number"
                                                                            className="w-20 h-10 rounded-xl text-center font-black text-xs border-slate-200 focus:ring-primary/20"
                                                                            value={qtyStr}
                                                                            onChange={(e) => handleQuantityChange(id, e.target.value)}
                                                                        />
                                                                    </div>
                                                                    <div className="flex flex-col gap-1">
                                                                        <Label className="text-[8px] font-black uppercase text-slate-400 ml-1">Preço Unitário (R$)</Label>
                                                                        <Input
                                                                            type="number"
                                                                            className="w-28 h-10 rounded-xl text-center font-black text-xs border-slate-200 focus:ring-primary/20 text-primary"
                                                                            value={priceStr}
                                                                            onChange={(e) => handlePriceChange(id, e.target.value)}
                                                                        />
                                                                    </div>
                                                                    <div className="flex flex-col gap-1 items-end min-w-[100px]">
                                                                        <Label className="text-[8px] font-black uppercase text-slate-500 mr-1">Subtotal</Label>
                                                                        <span className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(currentPrice * qtyNum)}</span>
                                                                    </div>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-10 w-10 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl"
                                                                        onClick={() => handleRemoveMaterial(id)}
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

                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-1 bg-primary rounded-full" />
                                                <h4 className="font-black uppercase text-sm tracking-widest text-foreground">Catálogo Geral (Explorar)</h4>
                                            </div>

                                            <div className="flex flex-1 sm:max-w-xs relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input
                                                    value={materialSearchTerm}
                                                    onChange={e => setMaterialSearchTerm(e.target.value)}
                                                    placeholder="Buscar material..."
                                                    className="pl-9 h-10 rounded-xl bg-white/5 border-white/10 text-white font-bold placeholder:text-slate-500 focus:bg-white/10 transition-all text-xs"
                                                />
                                            </div>

                                            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 gap-1">
                                                {["TODOS", "CHM", "BRUTA", "OUTROS"].map(filter => (
                                                    <button
                                                        key={filter}
                                                        onClick={() => setActiveSupplierFilter(filter as any)}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-lg font-black text-[10px] tracking-widest transition-all",
                                                            activeSupplierFilter === filter 
                                                                ? "bg-primary text-primary-foreground shadow-lg" 
                                                                : "text-slate-400 hover:bg-white/5"
                                                        )}
                                                    >
                                                        {filter}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            {Object.entries(groupedBySupplier)
                                                .filter(([supplier]) => {
                                                    if (activeSupplierFilter === "TODOS") return true;
                                                    if (activeSupplierFilter === "CHM") return isCHM(supplier);
                                                    if (activeSupplierFilter === "BRUTA") return isBRUTA(supplier);
                                                    if (activeSupplierFilter === "OUTROS") return !isCHM(supplier) && !isBRUTA(supplier);
                                                    return true;
                                                })
                                                .map(([supplier, categories]) => {
                                                    const supplierSelectedCount = Object.values(categories).flat().filter(m => quantities[m.id] > 0).length;
                                                    const supplierTotalCount = Object.values(categories).flat().length;

                                                    return (
                                                        <div key={supplier} className="space-y-3">
                                                            <div className={cn(
                                                                "flex items-center justify-between px-5 py-3 rounded-2xl border shadow-sm",
                                                                isCHM(supplier) ? "bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]" :
                                                                isBRUTA(supplier) ? "bg-orange-500/5 border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.05)]" :
                                                                "bg-white/5 border-white/5"
                                                            )}>
                                                                <div className="flex items-center gap-3">
                                                                    <div className={cn(
                                                                        "w-2 h-7 rounded-full",
                                                                        isCHM(supplier) ? "bg-emerald-500" :
                                                                        isBRUTA(supplier) ? "bg-orange-500" :
                                                                        "bg-slate-400"
                                                                    )} />
                                                                    <div>
                                                                        <h4 className={cn(
                                                                            "font-black uppercase text-xs sm:text-sm tracking-widest flex items-center gap-2",
                                                                            isCHM(supplier) ? "text-emerald-500" :
                                                                            isBRUTA(supplier) ? "text-orange-500" :
                                                                            "text-slate-400"
                                                                        )}>
                                                                            {supplier}
                                                                        </h4>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                                                        {supplierSelectedCount > 0 ? (
                                                                            <span className="text-emerald-400">{supplierSelectedCount} selecionados</span>
                                                                        ) : (
                                                                            `${supplierTotalCount} itens disponíveis`
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <Accordion 
                                                                key={`${supplier}-${Object.keys(categories).join('-')}-${materialSearchTerm}`}
                                                                type="multiple" 
                                                                defaultValue={Object.keys(categories)} 
                                                                className="space-y-3"
                                                            >
                                                                {Object.entries(categories).map(([category, items]) => {
                                                                    const catSelectedCount = items.filter(m => quantities[m.id] > 0).length;

                                                                    return (
                                                                        <AccordionItem key={`${supplier}-${category}`} value={category} className="border border-white/5 rounded-2xl px-4 sm:px-5 bg-white/5 shadow-sm overflow-hidden border-b-0">
                                                                            <AccordionTrigger className="hover:no-underline py-3 border-none">
                                                                                <div className="flex items-center gap-3">
                                                                                    <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] uppercase tracking-widest px-2.5 py-0.5">
                                                                                        {items.length} ITENS
                                                                                    </Badge>
                                                                                    <span className="font-black uppercase text-xs tracking-tighter text-slate-300">{category}</span>
                                                                                    {catSelectedCount > 0 && (
                                                                                        <Badge className="bg-emerald-500/20 text-emerald-400 border-none font-black text-[8px] uppercase tracking-widest px-2 py-0.5">
                                                                                            {catSelectedCount} NO PROJETO
                                                                                        </Badge>
                                                                                    )}
                                                                                </div>
                                                                            </AccordionTrigger>
                                                                            <AccordionContent className="pb-4 border-none">
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                                                                    {items.map(item => {
                                                                                        const qtyNum = quantities[item.id] || 0;
                                                                                        const qtyStr = rawQuantities[item.id] !== undefined ? rawQuantities[item.id] : (qtyNum ? String(qtyNum) : "");
                                                                                        const currentPrice = customPrices[item.id] !== undefined ? customPrices[item.id] : item.unit_price;
                                                                                        const priceStr = rawPrices[item.id] !== undefined ? rawPrices[item.id] : String(currentPrice);
                                                                                        const isSelected = (selectedMaterialIds ? selectedMaterialIds.includes(item.id) : quantities[item.id] > 0) || quantities[item.id] > 0;
                                                                                        return (
                                                                                            <div key={item.id} className={cn(
                                                                                                "flex items-center justify-between p-3 rounded-xl transition-all group border",
                                                                                                isSelected 
                                                                                                    ? "bg-primary/15 border-primary/40 shadow-sm" 
                                                                                                    : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10"
                                                                                            )}>
                                                                                                <div className="flex flex-col min-w-0 flex-1 mr-2">
                                                                                                    <span className="text-[11px] font-bold text-slate-200 uppercase tracking-tight truncate" title={item.name}>{item.name}</span>
                                                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{formatCurrency(currentPrice)} / {item.unit}</span>
                                                                                                </div>
                                                                                                <div className="flex items-center gap-2 shrink-0">
                                                                                                    {isSelected && (
                                                                                                        <div className="flex flex-col items-end">
                                                                                                            <span className="text-[7px] font-black text-slate-400 uppercase">R$/Unid.</span>
                                                                                                            <Input
                                                                                                                type="number"
                                                                                                                className="w-20 h-8 rounded-lg text-right font-black text-[10px] border-white/10 focus:bg-white/10 text-white bg-white/5 px-2"
                                                                                                                value={priceStr}
                                                                                                                onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                                                                                            />
                                                                                                        </div>
                                                                                                    )}
                                                                                                    <div className="flex flex-col items-end">
                                                                                                        {isSelected && (
                                                                                                            <span className="text-[7px] font-black text-slate-400 uppercase">Qtd</span>
                                                                                                        )}
                                                                                                        <div className="flex items-center gap-1">
                                                                                                            <Input
                                                                                                                type="number"
                                                                                                                placeholder="0"
                                                                                                                className={cn(
                                                                                                                    "w-16 sm:w-20 h-8 sm:h-9 rounded-lg text-center font-black text-xs transition-all",
                                                                                                                    isSelected 
                                                                                                                        ? "bg-primary text-primary-foreground border-primary font-extrabold shadow-md" 
                                                                                                                        : "bg-white/5 border-white/10 text-white focus:bg-white/10"
                                                                                                                )}
                                                                                                                value={qtyStr}
                                                                                                                onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                                                                            />
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </AccordionContent>
                                                                        </AccordionItem>
                                                                    );
                                                                })}
                                                            </Accordion>
                                                        </div>
                                                    );
                                                })}
                                        </div>

                                        {Object.keys(calculateTotals.categoryTotals).length > 0 && (
                                            <div className="mt-12 p-8 border border-primary/20 bg-slate-100 dark:bg-white/5 rounded-[2.5rem] shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="p-2 bg-primary/20 rounded-xl text-primary">
                                                        <Calculator size={18} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black uppercase text-sm tracking-widest text-slate-900 dark:text-white">Planilha de Fechamento</h4>
                                                        <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest opacity-60">Resumo consolidado dos custos e precificação</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="space-y-4">
                                                        <span className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                                            <div className="h-1 w-4 bg-primary rounded-full" /> Custos por Divisão
                                                        </span>
                                                        <div className="space-y-2">
                                                            {Object.entries(calculateTotals.categoryTotals).map(([cat, total]) => (
                                                                <div key={cat} className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-white/5 last:border-0 group">
                                                                    <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors">{cat}</span>
                                                                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">{formatCurrency(total)}</span>
                                                                </div>
                                                            ))}
                                                            <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-white/5 last:border-0 group">
                                                                    <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors">Custo Operacional ({formData.days_estimated} dias)</span>
                                                                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">{formatCurrency(calculateTotals.fixedCost)}</span>
                                                                </div>
                                                            <div className="pt-4 flex justify-between items-center text-primary">
                                                                <span className="text-[11px] font-black uppercase tracking-widest">Base de Custo Total</span>
                                                                <span className="text-base font-black tracking-tighter text-slate-900 dark:text-white">{formatCurrency(calculateTotals.totalCostPower)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4 bg-slate-50 dark:bg-black/20 p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
                                                        <span className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                                            <div className="h-1 w-4 bg-primary rounded-full" /> Apuração de Preço
                                                        </span>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-white/5">
                                                                <span className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-400">Lucro ({formData.profit_margin}%)</span>
                                                                <span className="text-xs font-black text-slate-800 dark:text-slate-200">{formatCurrency(calculateTotals.totalCostPower * (formData.profit_margin / 100))}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-white/5">
                                                                <span className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-400">Comissão ({formData.commission}%)</span>
                                                                <span className="text-xs font-black text-amber-600 dark:text-amber-400">{formatCurrency(calculateTotals.totalCostPower * (formData.commission / 100))}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-white/5">
                                                                <span className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-400">Imposto ({formData.tax}%)</span>
                                                                <span className="text-xs font-black text-slate-800 dark:text-slate-200">{formatCurrency(calculateTotals.totalCostPower * (formData.tax / 100))}</span>
                                                            </div>

                                                            <div className="flex justify-between items-end pt-2">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400">Valor Sugerido À Vista</span>
                                                                    <span className="text-xs font-black text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">Preço de Tabela</span>
                                                                </div>
                                                                <span className="text-sm font-black text-slate-900 dark:text-white underline decoration-primary/30 underline-offset-4">{formatCurrency(calculateTotals.baseValue)}</span>
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
                            </TabsContent>
                                    
                                    <TabsContent value="ai" className="flex-1 overflow-hidden m-0 flex flex-col min-h-0">
                                        <ScrollArea className="flex-1 p-8 bg-card">
                                            <div className="space-y-6">
                                                <div className="p-6 bg-primary/5 border-2 border-primary/20 rounded-[2rem] shadow-sm">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                                                        <h4 className="font-black uppercase text-sm tracking-widest text-primary">Análise de Projeto por Visão Computacional</h4>
                                                    </div>
                                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-relaxed">
                                                        Faça o upload de uma imagem do projeto (render 3D, desenho técnico ou croqui com medidas). A IA analisará o projeto e estimará as chapas de MDF, fitas e ferragens necessárias a partir do catálogo da BJL Planejados.
                                                    </p>
                                                </div>

                                                {!geminiKey ? (
                                                    <Card className="border border-amber-500/20 bg-amber-500/5 rounded-3xl p-6 space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <Key className="h-5 w-5 text-amber-500" />
                                                            <span className="text-xs font-black uppercase tracking-wider text-amber-500">Chave da API do Gemini Necessária</span>
                                                        </div>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                                                            O assistente de IA usa a API do Gemini. Para começar, cole sua chave de API abaixo. Ela será armazenada localmente e com total segurança no seu próprio navegador.
                                                        </p>
                                                        <div className="flex gap-2">
                                                            <Input 
                                                                type="password" 
                                                                value={geminiKey}
                                                                onChange={e => setGeminiKey(e.target.value)}
                                                                placeholder="AIzaSy..." 
                                                                className="h-12 bg-white/5 border-white/10 rounded-xl font-bold"
                                                            />
                                                            <Button onClick={handleSaveGeminiKeyLocally} className="h-12 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl px-6">
                                                                Salvar Chave
                                                            </Button>
                                                        </div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                            Não tem uma chave? <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Clique aqui para obter uma chave gratuita no Google AI Studio</a>.
                                                        </p>
                                                    </Card>
                                                ) : (
                                                    <div className="space-y-6">
                                                        {/* Upload Area */}
                                                        <div className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center bg-slate-50/50 hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 transition-all relative overflow-hidden group">
                                                            <input 
                                                                type="file" 
                                                                accept="image/*" 
                                                                onChange={handleImageChange}
                                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                                disabled={isAnalyzing}
                                                            />
                                                            {selectedImage ? (
                                                                <div className="space-y-4">
                                                                    <div className="relative inline-block max-w-[200px] rounded-xl overflow-hidden shadow-md border border-slate-200">
                                                                        <img src={selectedImage} alt="Preview do projeto" className="max-h-[150px] object-contain" />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <p className="text-xs font-black uppercase text-slate-800 dark:text-white truncate max-w-[250px]">{selectedImageName}</p>
                                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Clique ou arraste outro arquivo para alterar</p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-4 py-4 flex flex-col items-center">
                                                                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                                        <UploadCloud className="h-8 w-8 text-primary" />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <p className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Selecione a Imagem do Projeto</p>
                                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Arraste a imagem do render 3D ou projeto técnico aqui</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Analysis Action */}
                                                        {selectedImage && !isAnalyzing && !aiResult && (
                                                            <Button 
                                                                onClick={handleAnalyzeProject}
                                                                className="w-full h-14 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                                            >
                                                                <Sparkles className="h-4 w-4" />
                                                                Analisar e Estimar Materiais
                                                            </Button>
                                                        )}

                                                        {/* Loading Screen */}
                                                        {isAnalyzing && (
                                                            <div className="p-12 flex flex-col items-center justify-center text-center space-y-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 animate-pulse">
                                                                <div className="relative">
                                                                    <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl animate-pulse" />
                                                                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/30">
                                                                        <Hammer className="h-8 w-8 text-primary animate-bounce" />
                                                                    </div>
                                                                    <Hourglass className="absolute -bottom-1 -right-1 h-5 w-5 text-amber-500 animate-spin" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <h5 className="font-black uppercase text-xs text-primary tracking-widest">A IA da BJL está trabalhando</h5>
                                                                    <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wider">{analysisSteps[analysisStep]}</p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Error State */}
                                                        {aiError && (
                                                            <div className="p-6 bg-rose-500/10 border-2 border-rose-500/20 rounded-3xl text-center space-y-3">
                                                                <p className="text-xs font-black uppercase text-rose-500">Erro na Análise</p>
                                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{aiError}</p>
                                                                <Button variant="ghost" onClick={handleAnalyzeProject} className="h-10 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500/10 text-rose-500">Tentar Novamente</Button>
                                                            </div>
                                                        )}

                                                        {/* Results Preview */}
                                                        {aiResult && (
                                                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                                <div className="p-6 bg-emerald-500/5 border-2 border-emerald-500/20 rounded-[2rem] space-y-3">
                                                                    <div className="flex items-center gap-2 text-emerald-500">
                                                                        <Brain className="h-5 w-5" />
                                                                        <span className="text-xs font-black uppercase tracking-widest">Parecer da IA da BJL</span>
                                                                    </div>
                                                                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-relaxed uppercase">
                                                                        {aiResult.reasoning}
                                                                    </p>
                                                                </div>

                                                                {aiResult.days_estimated > 0 && (
                                                                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between">
                                                                        <div className="flex items-center gap-2">
                                                                            <Hourglass className="h-4 w-4 text-amber-500" />
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tempo Estimado de Produção</span>
                                                                        </div>
                                                                        <span className="text-sm font-black text-amber-600">{aiResult.days_estimated} {aiResult.days_estimated === 1 ? 'dia' : 'dias'}</span>
                                                                    </div>
                                                                )}

                                                                <div className="space-y-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="h-5 w-1 bg-emerald-500 rounded-full" />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Materiais Recomendados</span>
                                                                    </div>

                                                                    <div className="space-y-2">
                                                                        {aiResult.items.map((item, index) => {
                                                                            const material = allMaterials.find(m => m.id === item.id);
                                                                            if (!material) return null;
                                                                            return (
                                                                                <div key={`ai-recommend-${index}`} className="flex items-center justify-between p-4 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                                                                                    <div>
                                                                                        <p className="text-xs font-black uppercase tracking-tight">{material.name}</p>
                                                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{material.category}</p>
                                                                                    </div>
                                                                                    <div className="text-right">
                                                                                        <p className="text-xs font-black text-primary">{item.qty} {material.unit}</p>
                                                                                        <p className="text-[9px] font-bold text-slate-400">{formatCurrency(material.unit_price * item.qty)}</p>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>

                                                                <div className="flex gap-2">
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        onClick={() => {
                                                                            setAiResult(null);
                                                                            setSelectedImage(null);
                                                                            setSelectedImageName("");
                                                                        }} 
                                                                        className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 text-slate-600"
                                                                    >
                                                                        Limpar
                                                                    </Button>
                                                                    <Button 
                                                                        onClick={handleApplyAiEstimation}
                                                                        className="flex-[2] h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl flex items-center justify-center gap-1.5"
                                                                    >
                                                                        <Check className="h-4 w-4" />
                                                                        Aplicar Itens no Orçamento
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </TabsContent>
                                </Tabs>
                            </div>

                            <div className="p-4 sm:p-8 shrink-0 bg-slate-100 dark:bg-zinc-950/80 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-center">
                                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                                    <Package className="h-5 w-5" />
                                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                                        {Object.values(quantities).filter(q => q > 0).length} itens selecionados
                                    </span>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="flex-1 sm:flex-none h-12 sm:h-14 px-4 sm:px-8 font-black uppercase tracking-widest text-[10px] rounded-xl sm:rounded-2xl text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/5">Descartar</Button>
                                    <Button onClick={handleSaveBudget} className="flex-[2] sm:flex-none h-12 sm:h-14 px-6 sm:px-10 bg-primary font-black uppercase tracking-widest text-[10px] sm:text-xs rounded-xl sm:rounded-2xl shadow-2xl shadow-primary/20 group">
                                        Finalizar e Salvar
                                        <ChevronRight className="h-4 w-4 ml-1 sm:ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </header>

            {activeTab === "orcamentos" ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Card 
                            onMouseMove={handleCardMouseMove}
                            onMouseLeave={handleCardMouseLeave}
                            className="spotlight-card tilt-card bg-blue-500/5 border-blue-500/20 border-l-4 border-l-blue-500 p-6 flex flex-col gap-3 shadow-xl shadow-blue-500/5 transition-all group"
                        >
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 animate-pulse">
                                    <Calculator size={18} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600/50 group-hover:text-blue-600 transition-colors">Em Aberto ({selectedYear})</span>
                            </div>
                            <div>
                                <span className="text-3xl font-black text-blue-600 tracking-tighter">
                                    <AnimatedCounter 
                                        value={filteredBudgetsByYear.filter(b => b.status === "em_elaboracao").reduce((acc, curr) => acc + curr.total_value, 0)} 
                                        formatter={formatCurrency}
                                    />
                                </span>
                                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tight mt-1 opacity-60">Total de propostas pendentes</p>
                            </div>
                        </Card>

                        <Card 
                            onMouseMove={handleCardMouseMove}
                            onMouseLeave={handleCardMouseLeave}
                            className="spotlight-card tilt-card bg-emerald-500/5 border-emerald-500/20 border-l-4 border-l-emerald-500 p-6 flex flex-col gap-3 shadow-xl shadow-emerald-500/5 transition-all group"
                        >
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 animate-pulse">
                                    <TrendingUp size={18} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/50 group-hover:text-emerald-600 transition-colors">Conversão ({selectedYear})</span>
                            </div>
                            <div>
                                <span className="text-3xl font-black text-emerald-600 tracking-tighter">
                                    <AnimatedCounter 
                                        value={filteredBudgetsByYear.length > 0 ? (filteredBudgetsByYear.filter(b => b.status === 'aprovado').length / filteredBudgetsByYear.length) * 100 : 0} 
                                        formatter={(v) => `${v.toFixed(0)}%`}
                                    />
                                </span>
                                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tight mt-1 opacity-60">Taxa de fechamento global</p>
                            </div>
                        </Card>

                        <Card 
                            onMouseMove={handleCardMouseMove}
                            onMouseLeave={handleCardMouseLeave}
                            className="spotlight-card tilt-card bg-amber-500/5 border-amber-500/20 border-l-4 border-l-amber-500 p-6 flex flex-col gap-3 shadow-xl shadow-amber-500/5 transition-all group"
                        >
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 animate-pulse">
                                    <DollarSign size={18} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600/50 group-hover:text-amber-600 transition-colors">Ticket Médio ({selectedYear})</span>
                            </div>
                            <div>
                                <span className="text-3xl font-black text-amber-600 tracking-tighter">
                                    <AnimatedCounter 
                                        value={filteredBudgetsByYear.length > 0 ? (filteredBudgetsByYear.reduce((acc, curr) => acc + curr.total_value, 0) / filteredBudgetsByYear.length) : 0} 
                                        formatter={formatCurrency}
                                    />
                                </span>
                                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tight mt-1 opacity-60">Valor médio por proposta</p>
                            </div>
                        </Card>

                        <Card 
                            onMouseMove={handleCardMouseMove}
                            onMouseLeave={handleCardMouseLeave}
                            className="spotlight-card tilt-card bg-primary/5 border-primary/20 border-l-4 border-l-primary p-6 flex flex-col gap-3 shadow-xl shadow-primary/5 transition-all group"
                        >
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary animate-pulse">
                                    <Layers size={18} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary/50 group-hover:text-primary transition-colors">Catálogo</span>
                            </div>
                            <div>
                                <span className="text-3xl font-black text-primary tracking-tighter">
                                    <AnimatedCounter value={allMaterials.length} />
                                </span>
                                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tight mt-1 opacity-60">Itens cadastrados na lista</p>
                            </div>
                        </Card>
                    </div>

                    <Card className="border-none shadow-2xl bg-card overflow-hidden rounded-[2.5rem]">
                        <CardHeader className="p-8 border-b border-border/10 flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-2xl text-primary border border-border shadow-sm">
                                    <HistoryIcon className="h-6 w-6" />
                                </div>
                                <div className="space-y-0.5">
                                    <CardTitle className="text-lg font-black uppercase tracking-tighter text-foreground">Histórico de Propostas</CardTitle>
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-60">Acompanhamento de orçamentos emitidos</p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                                <Tabs value={selectedYear} onValueChange={setSelectedYear} className="bg-white/50 border border-border/50 p-1 rounded-2xl h-12 shadow-sm">
                                    <TabsList className="bg-transparent h-full">
                                        {availableYears.map(year => (
                                            <TabsTrigger 
                                                key={year} 
                                                value={year} 
                                                className="px-6 h-full rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest transition-all"
                                            >
                                                {year}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </Tabs>

                                <div className="relative w-full sm:w-80">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                                    <Input
                                        placeholder="Pesquisar cliente..."
                                        className="pl-12 bg-white border-border/50 h-12 rounded-2xl text-xs font-medium shadow-inner focus:ring-2 focus:ring-primary/20"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                         <CardContent className="p-0">
                            {/* Table view for md and up */}
                            <div className="overflow-x-auto touch-pan-x webkit-overflow-scrolling-touch">
                                <table className="w-full text-xs min-w-[650px]">
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
                                        {filteredBudgets.map((orc) => (
                                            <tr key={orc.id} className="hover:bg-slate-50/80 transition-all group">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-xl bg-muted/30 flex items-center justify-center font-black text-xs text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                            {orc.client_name.charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-[13px] uppercase text-foreground group-hover:text-primary transition-colors leading-tight">{orc.client_name}</span>
                                                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Ref: #{600 + [...budgets].reverse().findIndex(b => b.id === orc.id)}</span>
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
                                                         {orc.status !== 'aprovado' ? (
                                                             <Button 
                                                                 variant="ghost" 
                                                                 size="icon" 
                                                                 className="h-10 w-10 rounded-xl hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-600 transition-all active:scale-95 border border-emerald-500/10"
                                                                 onClick={() => {
                                                                     if (confirm(`Aprovar projeto e lançar materiais no pedido da semana para "${orc.client_name}"?`)) {
                                                                         convertToWeeklyOrders(orc);
                                                                     }
                                                                 }}
                                                                 title="Aprovar e Pedir Materiais"
                                                             >
                                                                 <CheckCircle2 size={18} />
                                                             </Button>
                                                         ) : (
                                                             <Button 
                                                                 variant="ghost" 
                                                                 size="icon" 
                                                                 className="h-10 w-10 rounded-xl hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 transition-all active:scale-95 border border-rose-500/10 animate-pulse"
                                                                 onClick={() => {
                                                                     if (confirm(`Remover aprovação de "${orc.client_name}"? Isso também excluirá os materiais da lista de pedidos.`)) {
                                                                         cancelBudgetApproval(orc);
                                                                     }
                                                                 }}
                                                                 title="Remover Aprovação (Voltar para Edição)"
                                                             >
                                                                 <RotateCcw size={18} />
                                                             </Button>
                                                         )}
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
                                                            onClick={() => {
                                                                setPrintingBudget(orc);
                                                                setPrintingTab('commercial');
                                                            }}
                                                            title="Imprimir Orçamento"
                                                        >
                                                            <FileText size={16} />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-10 w-10 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors border border-border/5 rounded-xl ml-1"
                                                            onClick={() => {
                                                                if (confirm(`Tem certeza que deseja excluir o orçamento para "${orc.client_name}"?`)) {
                                                                    deleteBudget(orc.id);
                                                                }
                                                            }}
                                                            title="Excluir Orçamento"
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

                            {/* Card view for mobile */}
                            <div className="md:hidden divide-y divide-border/5">
                                {budgets.filter(b => b.client_name.toLowerCase().includes(searchTerm.toLowerCase())).map((orc) => (
                                    <div key={orc.id} className="p-6 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-muted/30 flex items-center justify-center font-black text-xs text-muted-foreground">
                                                    {orc.client_name.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-[13px] uppercase text-foreground leading-tight">{orc.client_name}</span>
                                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Ref: #{600 + [...budgets].reverse().findIndex(b => b.id === orc.id)}</span>
                                                </div>
                                            </div>
                                            {getStatusBadge(orc.status)}
                                        </div>
                                        
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projeto</span>
                                            <span className="font-bold text-[11px] uppercase text-muted-foreground tracking-tighter bg-muted/20 px-3 py-1.5 rounded-lg border border-border/5 w-fit">{orc.project_name}</span>
                                        </div>

                                        <div className="flex justify-between items-end pt-2">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</span>
                                                <span className="font-black text-lg text-primary tabular-nums">{formatCurrency(orc.total_value)}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                {orc.status !== 'aprovado' ? (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-10 w-10 rounded-xl border border-emerald-500/50 text-emerald-500"
                                                        onClick={() => {
                                                            if (confirm(`Aprovar projeto e lançar materiais?`)) {
                                                                convertToWeeklyOrders(orc);
                                                            }
                                                        }}
                                                    >
                                                        <CheckCircle2 size={16} />
                                                    </Button>
                                                ) : (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-10 w-10 rounded-xl border border-rose-500/50 text-rose-500"
                                                        onClick={() => {
                                                            if (confirm(`Remover aprovação?`)) {
                                                                cancelBudgetApproval(orc);
                                                            }
                                                        }}
                                                    >
                                                        <RotateCcw size={16} />
                                                    </Button>
                                                )}
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-10 w-10 rounded-xl border border-border/50 text-slate-400"
                                                    onClick={() => handleEditBudget(orc)}
                                                >
                                                    <Pencil size={16} />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-10 w-10 rounded-xl border border-border/50 text-slate-400 hover:text-amber-500 hover:border-amber-500/50 transition-all"
                                                    onClick={() => {
                                                        toast.info("Preparando visualização para impressão...");
                                                        setPrintingBudget(orc);
                                                        setPrintingTab('commercial');
                                                    }}
                                                >
                                                    <Printer size={16} />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-10 w-10 rounded-xl border border-border/50 text-rose-400"
                                                    onClick={() => {
                                                        if (confirm(`Excluir orçamento para "${orc.client_name}"?`)) {
                                                            deleteBudget(orc.id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {budgets.length === 0 && !loading && (
                                <div className="py-20 text-center text-muted-foreground italic uppercase text-[10px] font-black tracking-widest opacity-40">
                                    Nenhum orçamento encontrado
                                </div>
                            )}
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
                                            <Input value={newMaterial.unit} onChange={e => setNewMaterial({ ...newMaterial, unit: e.target.value })} placeholder="Ex: UNIDADE, M2" className="rounded-2xl h-12 border-slate-200 text-slate-900 font-bold" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fornecedor</Label>
                                            <Select 
                                                value={newMaterial.supplier} 
                                                onValueChange={val => setNewMaterial({ ...newMaterial, supplier: val })}
                                            >
                                                <SelectTrigger className="w-full h-12 rounded-2xl border-slate-200 bg-white px-4 text-xs font-bold uppercase text-slate-900 shadow-sm focus:ring-2 focus:ring-primary/20">
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                    {["CHM Morais", "BRUTA", "EXTERNO", "OUTROS"].map(sup => (
                                                        <SelectItem key={sup} value={sup} className="font-black uppercase text-[10px] py-3">{sup}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
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
                        <div className="overflow-x-auto touch-pan-x webkit-overflow-scrolling-touch">
                            <table className="w-full text-xs min-w-[600px]">
                                <thead>
                                    <tr className="bg-slate-50 text-muted-foreground/50 h-16 border-b border-border/10">
                                        <th className="px-8 text-left font-black uppercase tracking-[0.1em] text-[10px]">Categoria</th>
                                        <th className="px-8 text-left font-black uppercase tracking-[0.1em] text-[10px]">Nome do Material</th>
                                        <th className="px-8 text-left font-black uppercase tracking-[0.1em] text-[10px]">Fornecedor</th>
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
                                            <td className="px-8 py-5">
                                                {mat.supplier === "CHM Morais" ? (
                                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[9px] font-black uppercase tracking-widest">CHM Morais</Badge>
                                                ) : mat.supplier === "BRUTA" ? (
                                                    <Badge className="bg-orange-500/10 text-orange-600 border-orange-200 text-[9px] font-black uppercase tracking-widest">BRUTA</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest opacity-40">{mat.supplier || "Outros"}</Badge>
                                                )}
                                            </td>
                                            <td className="px-8 py-5 text-center font-bold text-muted-foreground">{mat.unit}</td>
                                            <td className="px-8 py-5 text-right font-black text-sm text-primary">
                                                <Input
                                                    type="number"
                                                    defaultValue={mat.unit_price}
                                                    onBlur={(e) => updateMaterial(mat.id, { unit_price: parseFloat(e.target.value) })}
                                                    className="w-32 ml-auto h-10 rounded-xl text-right font-black border-transparent bg-transparent hover:border-muted focus:bg-white text-white"
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
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fornecedor</Label>
                                    <Select 
                                        value={editingMaterial.supplier} 
                                        onValueChange={val => setEditingMaterial({ ...editingMaterial, supplier: val })}
                                    >
                                        <SelectTrigger className="w-full h-12 rounded-2xl border-slate-200 bg-white px-4 text-xs font-bold uppercase text-slate-900">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                                            {["CHM Morais", "BRUTA", "EXTERNO", "OUTROS"].map(sup => (
                                                <SelectItem key={sup} value={sup} className="font-black uppercase text-[10px] py-3">{sup}</SelectItem>
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
                    initialTab={printingTab}
                    onClose={() => setPrintingBudget(null)} 
                    onSave={handleSaveFromPrintView}
                    budgetNumber={600 + [...budgets].reverse().findIndex(b => b.id === printingBudget.id)}
                />
            )}
        </div>
    );
};

export default Orcamento;
