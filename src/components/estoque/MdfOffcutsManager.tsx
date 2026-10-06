import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    Layers, 
    Plus, 
    Search, 
    Printer, 
    Pencil, 
    Trash2, 
    CheckCircle2, 
    Clock, 
    Sparkles, 
    Maximize2, 
    Scissors, 
    HelpCircle,
    RotateCcw,
    BookmarkCheck,
    Bookmark
} from "lucide-react";
import { toast } from "sonner";
import { MdfOffcut, OffcutStatus } from "@/types/mdfOffcut";
import { 
    getOffcuts, 
    createOffcut, 
    updateOffcut, 
    deleteOffcut,
    isCloudConnected,
    syncLocalOffcutsToSupabase
} from "@/services/mdfOffcutService";
import { MdfOffcutFormDialog } from "./MdfOffcutFormDialog";
import { MdfPrintLabelDialog } from "./MdfPrintLabelDialog";
import { cn } from "@/lib/utils";

export const MdfOffcutsManager = () => {
    const [offcuts, setOffcuts] = useState<MdfOffcut[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedThickness, setSelectedThickness] = useState<number | "all">("all");
    const [selectedStatus, setSelectedStatus] = useState<OffcutStatus | "all">("disponivel");
    const [cloudConnected, setCloudConnected] = useState(isCloudConnected);
    const [pendingLocalCount, setPendingLocalCount] = useState(0);

    // Calculadora de Encaixe / Peça Desejada
    const [targetLength, setTargetLength] = useState<string>("");
    const [targetWidth, setTargetWidth] = useState<string>("");
    const [allowRotation, setAllowRotation] = useState(true);
    const [finderActive, setFinderActive] = useState(false);

    // Dialogs
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingOffcut, setEditingOffcut] = useState<MdfOffcut | null>(null);
    const [labelOffcut, setLabelOffcut] = useState<MdfOffcut | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getOffcuts();
            setOffcuts(data);
            setCloudConnected(isCloudConnected);
            const cached = localStorage.getItem("bjl_mdf_offcuts_cache");
            if (cached) {
                try {
                    const list = JSON.parse(cached);
                    const count = list.filter((i: any) => i.id?.startsWith("local-")).length;
                    setPendingLocalCount(count);
                } catch (e) {}
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro ao carregar retalhos de MDF.");
        } finally {
            setLoading(false);
        }
    };

    // Próximo código automático
    const nextCode = useMemo(() => {
        const nums = offcuts
            .map(o => {
                const match = o.code.match(/RET-(\d+)/i);
                return match ? parseInt(match[1], 10) : 0;
            })
            .filter(n => !isNaN(n));
        const max = nums.length > 0 ? Math.max(...nums) : 0;
        return `RET-${String(max + 1).padStart(3, "0")}`;
    }, [offcuts]);

    // Métricas HUD
    const availableOffcuts = offcuts.filter(o => o.status === "disponivel");
    const reservedOffcuts = offcuts.filter(o => o.status === "reservado");
    const totalAvailablePieces = availableOffcuts.reduce((acc, o) => acc + o.quantity, 0);

    const totalM2Available = availableOffcuts.reduce((acc, o) => {
        return acc + ((o.lengthMm * o.widthMm) / 1_000_000) * o.quantity;
    }, 0);

    // Chapa padrão MDF: 2750 x 1840 mm = 5.06 m²
    const sheetsEquivalent = (totalM2Available / 5.06).toFixed(1);

    // Filtragem de dados
    const filteredOffcuts = useMemo(() => {
        const tLen = parseFloat(targetLength) || 0;
        const tWid = parseFloat(targetWidth) || 0;
        const isFinding = finderActive && (tLen > 0 || tWid > 0);

        return offcuts.filter(item => {
            // Filtro por texto
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const match = 
                    item.code.toLowerCase().includes(q) ||
                    item.materialName.toLowerCase().includes(q) ||
                    item.location.toLowerCase().includes(q) ||
                    (item.notes && item.notes.toLowerCase().includes(q)) ||
                    (item.reservedProject && item.reservedProject.toLowerCase().includes(q));
                if (!match) return false;
            }

            // Filtro por espessura
            if (selectedThickness !== "all" && item.thicknessMm !== selectedThickness) {
                return false;
            }

            // Filtro por status
            if (selectedStatus !== "all" && item.status !== selectedStatus) {
                return false;
            }

            // Calculadora de encaixe (peça cabe na sobra?)
            if (isFinding) {
                if (item.status !== "disponivel") return false;

                const fitsDirect = item.lengthMm >= tLen && item.widthMm >= tWid;
                const canRotate = allowRotation && item.grainDirection === "none";
                const fitsRotated = canRotate && (item.lengthMm >= tWid && item.widthMm >= tLen);

                if (!fitsDirect && !fitsRotated) return false;
            }

            return true;
        });
    }, [offcuts, searchQuery, selectedThickness, selectedStatus, targetLength, targetWidth, allowRotation, finderActive]);

    const handleCreate = async (data: Omit<MdfOffcut, "id" | "createdAt" | "updatedAt">) => {
        try {
            const created = await createOffcut(data);
            setOffcuts(prev => [created, ...prev]);
            toast.success(`Retalho ${created.code} cadastrado com sucesso!`);
        } catch (err) {
            toast.error("Erro ao cadastrar retalho.");
        }
    };

    const handleUpdate = async (id: string, updates: Partial<MdfOffcut>) => {
        try {
            await updateOffcut(id, updates);
            setOffcuts(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
            toast.success("Retalho atualizado!");
        } catch (err) {
            toast.error("Erro ao atualizar retalho.");
        }
    };

    const handleDelete = async (id: string, code: string) => {
        if (!window.confirm(`Deseja excluir permanentemente o retalho ${code}?`)) return;
        try {
            await deleteOffcut(id);
            setOffcuts(prev => prev.filter(o => o.id !== id));
            toast.success(`Retalho ${code} removido.`);
        } catch (err) {
            toast.error("Erro ao remover retalho.");
        }
    };

    const handleQuickUse = async (offcut: MdfOffcut) => {
        if (offcut.quantity > 1) {
            const qtyStr = window.prompt(`Quantas peças de ${offcut.code} (${offcut.materialName}) foram utilizadas? (Disponíveis: ${offcut.quantity})`, "1");
            if (!qtyStr) return;
            const qty = parseInt(qtyStr, 10);
            if (isNaN(qty) || qty <= 0) return;

            if (qty >= offcut.quantity) {
                await handleUpdate(offcut.id, { status: "utilizado", quantity: 0 });
                toast.success(`Todas as ${offcut.quantity} peças foram marcadas como utilizadas!`);
            } else {
                await handleUpdate(offcut.id, { quantity: offcut.quantity - qty });
                toast.success(`${qty} peça(s) utilizada(s)! Restam ${offcut.quantity - qty} em estoque.`);
            }
        } else {
            const confirm = window.confirm(`Confirmar que a sobra ${offcut.code} (${offcut.materialName}) foi utilizada na produção?`);
            if (!confirm) return;
            await handleUpdate(offcut.id, { status: "utilizado" });
            toast.success(`Sobra ${offcut.code} marcada como utilizada!`);
        }
    };

    const handleToggleReserve = async (offcut: MdfOffcut) => {
        if (offcut.status === "reservado") {
            await handleUpdate(offcut.id, { status: "disponivel", reservedProject: null });
            toast.success(`Sobra ${offcut.code} liberada para estoque disponível.`);
        } else {
            const project = window.prompt("Nome do Cliente ou Número da OS para reservar:", "OS #");
            if (project === null) return;
            await handleUpdate(offcut.id, { status: "reservado", reservedProject: project });
            toast.success(`Sobra ${offcut.code} reservada para "${project}"!`);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* AVISO DE CONEXÃO COM O SUPABASE */}
            {!cloudConnected && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">⚠️</span>
                            <p className="font-bold text-sm text-amber-200">
                                Modo Local Ativo (Tabela do Supabase não criada)
                            </p>
                        </div>
                        <p className="text-xs text-amber-300/80">
                            Os retalhos estão salvos temporariamente apenas na memória deste aparelho. Para que todos os celulares e computadores sincronizem na nuvem, rode o script <strong>CREATE_MDF_OFFCUTS_TABLE.sql</strong> no SQL Editor do Supabase.
                            {pendingLocalCount > 0 && ` Há ${pendingLocalCount} retalho(s) pendente(s) de envio neste aparelho.`}
                        </p>
                    </div>
                </div>
            )}

            {cloudConnected && pendingLocalCount > 0 && (
                <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                    <p className="text-xs">
                        🔄 Há <strong>{pendingLocalCount} retalho(s)</strong> salvo(s) localmente neste aparelho aguardando envio para o Supabase.
                    </p>
                    <Button
                        size="sm"
                        onClick={async () => {
                            const count = await syncLocalOffcutsToSupabase();
                            toast.success(`${count} retalho(s) sincronizado(s) com a nuvem!`);
                            await loadData();
                        }}
                        className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                        Sincronizar Agora com a Nuvem
                    </Button>
                </div>
            )}

            {/* HUD METRICS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card tilt-card border-beam-card">
                    <CardContent className="p-5 flex items-center justify-between relative">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Retalhos Disponíveis</p>
                            <h3 className="text-3xl font-black text-amber-400 tracking-tighter">
                                {availableOffcuts.length} <span className="text-xs font-bold text-muted-foreground uppercase">tipos</span>
                            </h3>
                            <p className="text-xs font-bold text-white/70 mt-1">{totalAvailablePieces} peças físicas no rack</p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                            <Layers className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card tilt-card border-beam-card">
                    <CardContent className="p-5 flex items-center justify-between relative">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Área Reaproveitável</p>
                            <h3 className="text-3xl font-black text-emerald-400 tracking-tighter">
                                {totalM2Available.toFixed(2)} <span className="text-xs font-bold text-muted-foreground">m²</span>
                            </h3>
                            <p className="text-xs font-bold text-white/70 mt-1">Madeira útil guardada</p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <Maximize2 className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card tilt-card border-beam-card">
                    <CardContent className="p-5 flex items-center justify-between relative">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Economia em Chapas</p>
                            <h3 className="text-3xl font-black text-sky-400 tracking-tighter">
                                ~{sheetsEquivalent} <span className="text-xs font-bold text-muted-foreground uppercase">chapas</span>
                            </h3>
                            <p className="text-xs font-bold text-white/70 mt-1">Equivalente a chapas novas</p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                            <Sparkles className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card tilt-card border-beam-card">
                    <CardContent className="p-5 flex items-center justify-between relative">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Peças Reservadas</p>
                            <h3 className="text-3xl font-black text-amber-500 tracking-tighter">
                                {reservedOffcuts.length} <span className="text-xs font-bold text-muted-foreground uppercase">itens</span>
                            </h3>
                            <p className="text-xs font-bold text-white/70 mt-1">Destinadas para projetos</p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                            <BookmarkCheck className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ENCAIXE INTELIGENTE / ENCONTRE A SOBRA PARA SUA PEÇA */}
            <Card className="border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card/50 to-card/70 backdrop-blur-2xl shadow-xl rounded-3xl overflow-hidden">
                <CardHeader className="pb-3 border-b border-white/5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                <Scissors className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-black uppercase tracking-wider text-amber-400">
                                    Localizador Inteligente de Sobras ("Caber na Sobra")
                                </CardTitle>
                                <p className="text-[11px] text-muted-foreground">
                                    Precisa cortar uma peça? Digite as medidas mínimas e o sistema filtra as sobras que servem!
                                </p>
                            </div>
                        </div>

                        {finderActive && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                    setTargetLength("");
                                    setTargetWidth("");
                                    setFinderActive(false);
                                }}
                                className="text-xs text-muted-foreground hover:text-white"
                            >
                                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                Limpar busca de encaixe
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Comprimento Mínimo (mm)</label>
                            <Input
                                type="number"
                                placeholder="Ex: 800"
                                value={targetLength}
                                onChange={(e) => {
                                    setTargetLength(e.target.value);
                                    setFinderActive(true);
                                }}
                                className="font-mono font-bold"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Largura Mínima (mm)</label>
                            <Input
                                type="number"
                                placeholder="Ex: 450"
                                value={targetWidth}
                                onChange={(e) => {
                                    setTargetWidth(e.target.value);
                                    setFinderActive(true);
                                }}
                                className="font-mono font-bold"
                            />
                        </div>

                        <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-white/10 bg-muted/20">
                            <input
                                type="checkbox"
                                id="allowRotationCheck"
                                checked={allowRotation}
                                onChange={(e) => setAllowRotation(e.target.checked)}
                                className="rounded border-white/20 text-primary accent-primary h-4 w-4"
                            />
                            <label htmlFor="allowRotationCheck" className="text-xs font-bold text-white/90 cursor-pointer select-none">
                                Girar 90° se sem veio
                            </label>
                        </div>

                        <Button 
                            onClick={() => setFinderActive(true)}
                            className="bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-wider text-xs h-10 shadow-lg shadow-amber-500/20"
                        >
                            <Search className="h-4 w-4 mr-1.5" />
                            Buscar Peça Adequada
                        </Button>
                    </div>

                    {finderActive && (targetLength || targetWidth) && (
                        <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                            <span className="text-amber-200">
                                🔍 Buscando sobras que comportam peça de <b>{targetLength || 0} × {targetWidth || 0} mm</b>
                            </span>
                            <Badge variant="outline" className="border-amber-400 text-amber-400 font-bold">
                                {filteredOffcuts.length} sobra(s) compatível(eis)
                            </Badge>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* BARRA DE FILTROS & AÇÕES */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="flex flex-1 flex-wrap gap-2 items-center">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por cor, código, rack..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-card/60 border-white/10 h-10"
                        />
                    </div>

                    {/* Filtro Espessura */}
                    <div className="flex items-center gap-1 bg-card/60 p-1 rounded-xl border border-white/10">
                        <Button
                            variant={selectedThickness === "all" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setSelectedThickness("all")}
                            className="h-8 text-[11px] font-bold"
                        >
                            Todas
                        </Button>
                        {[6, 15, 18, 25].map(th => (
                            <Button
                                key={th}
                                variant={selectedThickness === th ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setSelectedThickness(th)}
                                className="h-8 text-[11px] font-mono font-bold px-2"
                            >
                                {th}mm
                            </Button>
                        ))}
                    </div>

                    {/* Filtro Status */}
                    <div className="flex items-center gap-1 bg-card/60 p-1 rounded-xl border border-white/10">
                        <Button
                            variant={selectedStatus === "all" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setSelectedStatus("all")}
                            className="h-8 text-[11px] font-bold"
                        >
                            Todos
                        </Button>
                        <Button
                            variant={selectedStatus === "disponivel" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setSelectedStatus("disponivel")}
                            className="h-8 text-[11px] font-bold text-emerald-400"
                        >
                            Disponíveis
                        </Button>
                        <Button
                            variant={selectedStatus === "reservado" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setSelectedStatus("reservado")}
                            className="h-8 text-[11px] font-bold text-amber-400"
                        >
                            Reservados
                        </Button>
                        <Button
                            variant={selectedStatus === "utilizado" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setSelectedStatus("utilizado")}
                            className="h-8 text-[11px] font-bold text-muted-foreground"
                        >
                            Utilizados
                        </Button>
                    </div>
                </div>

                <Button 
                    onClick={() => {
                        setEditingOffcut(null);
                        setIsFormOpen(true);
                    }}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-wider h-10 px-5 shadow-xl shadow-primary/20 gap-1.5"
                >
                    <Plus className="h-4 w-4" />
                    Nova Sobra de MDF
                </Button>
            </div>

            {/* LISTA / GRID DE RETALHOS */}
            {filteredOffcuts.length === 0 ? (
                <div className="p-12 text-center rounded-3xl border border-white/10 bg-card/20 space-y-3">
                    <Layers className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                    <h3 className="text-lg font-bold text-white">Nenhum retalho encontrado</h3>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        {finderActive 
                            ? "Nenhuma sobra disponível atende às dimensões informadas. Considere cortar de uma chapa nova." 
                            : "Não há registros com os filtros atuais. Cadastre uma sobra usando o botão acima!"}
                    </p>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                            setSearchQuery("");
                            setSelectedThickness("all");
                            setSelectedStatus("all");
                            setFinderActive(false);
                        }}
                    >
                        Limpar todos os filtros
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredOffcuts.map((offcut) => {
                        const area = ((offcut.lengthMm * offcut.widthMm) / 1_000_000).toFixed(3);
                        const isAvailable = offcut.status === "disponivel";
                        const isReserved = offcut.status === "reservado";
                        const isUsed = offcut.status === "utilizado";

                        return (
                            <Card 
                                key={offcut.id} 
                                className={cn(
                                    "border backdrop-blur-xl transition-all duration-200 hover:shadow-2xl overflow-hidden relative group",
                                    isAvailable && "border-white/10 bg-card/40 hover:border-amber-500/40",
                                    isReserved && "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60",
                                    isUsed && "border-white/5 bg-card/20 opacity-60"
                                )}
                            >
                                <CardContent className="p-5 space-y-4">
                                    {/* Header com Código e Status */}
                                    <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xl font-black text-amber-400 tracking-tight">
                                                    {offcut.code}
                                                </span>
                                                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-white">
                                                    {offcut.thicknessMm}mm
                                                </span>
                                                {offcut.quantity > 1 && (
                                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                                                        {offcut.quantity} un
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="text-base font-bold text-white uppercase tracking-tight mt-0.5">
                                                {offcut.materialName}
                                            </h4>
                                        </div>

                                        <div>
                                            {isAvailable && (
                                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20">
                                                    Disponível
                                                </Badge>
                                            )}
                                            {isReserved && (
                                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/20">
                                                    Reservado
                                                </Badge>
                                            )}
                                            {isUsed && (
                                                <Badge variant="outline" className="text-muted-foreground border-white/10">
                                                    Utilizado
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Medidas Grandes & Área */}
                                    <div className="grid grid-cols-2 gap-2 bg-black/20 p-3 rounded-2xl border border-white/5">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                                                Dimensões (mm)
                                            </span>
                                            <span className="font-mono text-lg font-black text-white">
                                                {offcut.lengthMm} × {offcut.widthMm}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                                                Área Total
                                            </span>
                                            <span className="font-mono text-lg font-black text-primary">
                                                {(Number(area) * offcut.quantity).toFixed(2)} m²
                                            </span>
                                        </div>
                                    </div>

                                    {/* Informações Complementares */}
                                    <div className="space-y-1.5 text-xs text-muted-foreground">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] uppercase font-bold text-white/50">Localização:</span>
                                            <span className="font-semibold text-white/90">{offcut.location || "Galpão"}</span>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] uppercase font-bold text-white/50">Sentido do Veio:</span>
                                            <span className="font-medium text-white/80">
                                                {offcut.grainDirection === "longitudinal" && "Longitudinal (no comp.)"}
                                                {offcut.grainDirection === "transversal" && "Transversal (na larg.)"}
                                                {offcut.grainDirection === "none" && "Sem veio / Unicolor"}
                                            </span>
                                        </div>

                                        {offcut.reservedProject && (
                                            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-semibold mt-1">
                                                📌 Reservado p/: {offcut.reservedProject}
                                            </div>
                                        )}

                                        {offcut.notes && (
                                            <p className="text-[11px] italic text-white/60 line-clamp-2 pt-1 border-t border-white/5">
                                                "{offcut.notes}"
                                            </p>
                                        )}
                                    </div>

                                    {/* Ações do Card */}
                                    <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-1">
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setLabelOffcut(offcut)}
                                                className="h-8 px-2 text-xs border-white/10 hover:border-white/30"
                                                title="Imprimir Etiqueta"
                                            >
                                                <Printer className="h-3.5 w-3.5 mr-1 text-primary" />
                                                Etiqueta
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleToggleReserve(offcut)}
                                                className="h-8 px-2 text-xs border-white/10 hover:border-white/30"
                                                title={isReserved ? "Liberar para estoque" : "Reservar para projeto"}
                                            >
                                                {isReserved ? (
                                                    <BookmarkCheck className="h-3.5 w-3.5 mr-1 text-amber-400" />
                                                ) : (
                                                    <Bookmark className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                                                )}
                                                {isReserved ? "Liberar" : "Reservar"}
                                            </Button>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {isAvailable && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleQuickUse(offcut)}
                                                    className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                                                    title="Dar baixa / Utilizar"
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                                    Usar
                                                </Button>
                                            )}

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setEditingOffcut(offcut);
                                                    setIsFormOpen(true);
                                                }}
                                                className="h-8 w-8 text-muted-foreground hover:text-white"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(offcut.id, offcut.code)}
                                                className="h-8 w-8 text-muted-foreground hover:text-red-400"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Modal de Cadastro / Edição */}
            <MdfOffcutFormDialog
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSubmit={handleCreate}
                onUpdate={handleUpdate}
                editingOffcut={editingOffcut}
                nextCode={nextCode}
            />

            {/* Modal de Impressão de Etiqueta */}
            <MdfPrintLabelDialog
                open={!!labelOffcut}
                onOpenChange={(open) => !open && setLabelOffcut(null)}
                offcut={labelOffcut}
            />
        </div>
    );
};
