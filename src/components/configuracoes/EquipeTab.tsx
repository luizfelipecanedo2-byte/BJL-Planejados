import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollaborators, Collaborator, CollaboratorExtra } from "@/hooks/useCollaborators";
import { 
    Users, 
    UserPlus, 
    Pencil, 
    Trash2, 
    Phone, 
    DollarSign, 
    CheckCircle, 
    XCircle, 
    MessageCircle, 
    Hammer, 
    Sparkles, 
    Loader2,
    Gift,
    Calendar,
    Receipt,
    PlusCircle,
    ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const COMMON_ROLES = [
    "Marceneiro",
    "Marceneiro Líder",
    "Montador",
    "Marceneiro / Montador",
    "Ajudante de Marcenaria",
    "Projetista",
    "Acabador / Pintor",
    "Encarregado de Produção"
];

export function EquipeTab() {
    const { 
        collaborators, 
        loading, 
        addCollaborator, 
        updateCollaborator, 
        addExtra,
        deleteExtra,
        toggleStatus, 
        deleteCollaborator 
    } = useCollaborators();

    // Modal de Criar / Editar Colaborador
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCollab, setEditingCollab] = useState<Collaborator | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Modal de Lançar Extra / Histórico
    const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
    const [selectedCollabForExtra, setSelectedCollabForExtra] = useState<Collaborator | null>(null);
    const [extraAmount, setExtraAmount] = useState("");
    const [extraDesc, setExtraDesc] = useState("");
    const [extraDate, setExtraDate] = useState(new Date().toISOString().split("T")[0]);
    const [isSavingExtra, setIsSavingExtra] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        role: "Marceneiro",
        phone: "",
        email: "",
        salary: "2500"
    });

    const handleOpenCreate = () => {
        setEditingCollab(null);
        setFormData({
            name: "",
            role: "Marceneiro",
            phone: "",
            email: "",
            salary: "2500"
        });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (collab: Collaborator) => {
        setEditingCollab(collab);
        setFormData({
            name: collab.name,
            role: collab.role || "Marceneiro",
            phone: collab.phone || "",
            email: collab.email || "",
            salary: String(collab.salary || 0)
        });
        setIsDialogOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setIsSaving(true);
        try {
            if (editingCollab) {
                await updateCollaborator(editingCollab.id, {
                    name: formData.name.trim(),
                    role: formData.role,
                    phone: formData.phone.trim(),
                    email: formData.email.trim(),
                    salary: parseFloat(formData.salary) || 0
                });
            } else {
                await addCollaborator({
                    name: formData.name.trim(),
                    role: formData.role,
                    phone: formData.phone.trim(),
                    email: formData.email.trim(),
                    salary: parseFloat(formData.salary) || 0
                });
            }
            setIsDialogOpen(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleOpenExtraModal = (collab: Collaborator) => {
        setSelectedCollabForExtra(collab);
        setExtraAmount("50");
        setExtraDesc("Ficou até tarde");
        setExtraDate(new Date().toISOString().split("T")[0]);
        setIsExtraModalOpen(true);
    };

    const handleSaveExtra = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCollabForExtra || !extraAmount || !extraDesc.trim()) return;

        setIsSavingExtra(true);
        try {
            await addExtra(
                selectedCollabForExtra.id,
                parseFloat(extraAmount),
                extraDesc.trim(),
                extraDate
            );
            // Limpa form mas mantém modal aberto para ver o histórico atualizado
            setExtraAmount("");
            setExtraDesc("");
        } finally {
            setIsSavingExtra(false);
        }
    };

    const activeCount = collaborators.filter(c => c.active).length;
    const inactiveCount = collaborators.length - activeCount;

    // Colaborador atualmente selecionado com dados sincronizados
    const currentExtraCollab = selectedCollabForExtra 
        ? collaborators.find(c => c.id === selectedCollabForExtra.id) || selectedCollabForExtra 
        : null;

    return (
        <div className="space-y-6">
            {/* Header da Gestão da Equipe */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-inner">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-['Cinzel'] font-bold text-luxury shimmer-gold uppercase tracking-wider">
                                Gestão de Equipe & Folha Salarial
                            </h2>
                            <p className="text-xs text-muted-foreground font-medium">
                                {activeCount} {activeCount === 1 ? 'colaborador ativo' : 'colaboradores ativos'} • Controle de Salário Base + Bônus e Horas Extras
                                {inactiveCount > 0 && ` (${inactiveCount} inativo)`}
                            </p>
                        </div>
                    </div>
                </div>

                <Button 
                    onClick={handleOpenCreate}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-widest px-6 h-12 rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                    <UserPlus className="h-4 w-4" />
                    Novo Colaborador
                </Button>
            </div>

            {/* Grid de Cards dos Colaboradores */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {collaborators.map((collab) => {
                            const cleanPhone = collab.phone?.replace(/\D/g, "");
                            const baseSalary = collab.salary || 0;
                            const extrasTotal = collab.extras_total || 0;
                            const totalSalaryWithExtras = baseSalary + extrasTotal;

                            return (
                                <motion.div
                                    key={collab.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Card className={`glass-card border-white/5 shadow-xl transition-all duration-300 relative overflow-hidden group ${
                                        !collab.active ? 'opacity-60 grayscale-[40%]' : 'hover:border-primary/30'
                                    }`}>
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all pointer-events-none" />
                                        
                                        <CardContent className="p-6 space-y-4">
                                            {/* Cabeçalho do Card com Nome e Status */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="relative">
                                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-amber-500/10 border border-primary/30 flex items-center justify-center text-base font-black text-primary shadow-inner uppercase">
                                                            {collab.name.substring(0, 2)}
                                                        </div>
                                                        <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-background ${
                                                            collab.active ? 'bg-emerald-500' : 'bg-slate-500'
                                                        }`} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-bold text-base text-luxury truncate group-hover:text-primary transition-colors">
                                                            {collab.name}
                                                        </h3>
                                                        <Badge variant="outline" className="text-[10px] font-bold border-white/10 bg-white/[0.02] text-muted-foreground uppercase tracking-wider mt-0.5">
                                                            <Hammer className="h-2.5 w-2.5 mr-1 text-primary" />
                                                            {collab.role || "Marceneiro"}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleOpenEdit(collab)}
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary rounded-lg hover:bg-white/5"
                                                        title="Editar"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => deleteCollaborator(collab.id, collab.name)}
                                                        className="h-8 w-8 text-muted-foreground hover:text-rose-500 rounded-lg hover:bg-rose-500/10"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Painel Financeiro: Salário Base + Extras */}
                                            <div className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-2.5">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                                                        <DollarSign className="h-3.5 w-3.5 text-primary/70" />
                                                        Salário Base:
                                                    </span>
                                                    <span className="font-bold text-white">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(baseSalary)}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                                                        <Gift className="h-3.5 w-3.5 text-amber-400" />
                                                        Extras / Bônus do Mês:
                                                    </span>
                                                    <span className={`font-black ${extrasTotal > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                                                        {extrasTotal > 0 ? `+ ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(extrasTotal)}` : 'R$ 0,00'}
                                                    </span>
                                                </div>

                                                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                                                        Total a Pagar:
                                                    </span>
                                                    <span className="text-base font-black text-emerald-400">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSalaryWithExtras)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Botão de Ação: Lançar Extra / Ver Bônus */}
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => handleOpenExtraModal(collab)}
                                                    className="flex-1 h-10 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    <PlusCircle className="h-4 w-4" />
                                                    Lançar Extra ({collab.extras?.length || 0})
                                                </Button>

                                                {collab.phone && cleanPhone && (
                                                    <a
                                                        href={`https://wa.me/55${cleanPhone}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="h-10 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 flex items-center justify-center transition-colors"
                                                        title="Abrir WhatsApp"
                                                    >
                                                        <MessageCircle className="h-4 w-4" />
                                                    </a>
                                                )}
                                            </div>

                                            {/* Ação de Ativar / Inativar */}
                                            <div className="pt-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleStatus(collab.id, collab.active)}
                                                    className={`w-full h-8 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all ${
                                                        collab.active 
                                                            ? 'text-muted-foreground/60 hover:text-amber-400 hover:bg-amber-500/10' 
                                                            : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                                                    }`}
                                                >
                                                    {collab.active ? (
                                                        <>
                                                            <XCircle className="h-3 w-3 mr-1" />
                                                            Inativar Funcionário
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Reativar Funcionário
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* MODAL 1: Lançar Extra / Ver Histórico de Bônus */}
            <Dialog open={isExtraModalOpen} onOpenChange={setIsExtraModalOpen}>
                <DialogContent className="sm:max-w-lg bg-slate-950 border border-white/10 text-white rounded-3xl p-6 shadow-2xl backdrop-blur-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-['Cinzel'] font-bold text-luxury shimmer-gold uppercase tracking-wider flex items-center gap-2">
                            <Gift className="h-5 w-5 text-amber-400" />
                            Lançar Extra • {currentExtraCollab?.name}
                        </DialogTitle>
                    </DialogHeader>

                    {currentExtraCollab && (
                        <div className="space-y-6 pt-2">
                            {/* Card de Resumo Salarial */}
                            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent border border-amber-500/20 grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Salário Base</p>
                                    <p className="text-sm font-bold text-white mt-1">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentExtraCollab.salary || 0)}
                                    </p>
                                </div>
                                <div className="border-x border-white/10">
                                    <p className="text-[9px] font-black uppercase text-amber-400 tracking-widest">Total Extras</p>
                                    <p className="text-sm font-black text-amber-400 mt-1">
                                        + {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentExtraCollab.extras_total || 0)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase text-emerald-400 tracking-widest">Total do Mês</p>
                                    <p className="text-sm font-black text-emerald-400 mt-1">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((currentExtraCollab.salary || 0) + (currentExtraCollab.extras_total || 0))}
                                    </p>
                                </div>
                            </div>

                            {/* Formulário de Novo Extra */}
                            <form onSubmit={handleSaveExtra} className="space-y-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                                <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                    <PlusCircle className="h-4 w-4 text-primary" />
                                    Registrar Novo Extra
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                            Data do Ocorrido
                                        </Label>
                                        <Input
                                            type="date"
                                            value={extraDate}
                                            onChange={(e) => setExtraDate(e.target.value)}
                                            required
                                            className="h-10 bg-white/5 border-white/10 rounded-xl font-bold text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                            Valor do Extra (R$) *
                                        </Label>
                                        <Input
                                            type="number"
                                            step="5.00"
                                            min="1"
                                            placeholder="Ex: 50.00"
                                            value={extraAmount}
                                            onChange={(e) => setExtraAmount(e.target.value)}
                                            required
                                            className="h-10 bg-white/5 border-white/10 rounded-xl font-bold text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                        Motivo / Justificativa *
                                    </Label>
                                    <Input
                                        placeholder="Ex: Ficou até tarde finalizando a montagem da cozinha"
                                        value={extraDesc}
                                        onChange={(e) => setExtraDesc(e.target.value)}
                                        required
                                        className="h-10 bg-white/5 border-white/10 rounded-xl font-bold text-xs"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isSavingExtra || !extraAmount || !extraDesc.trim()}
                                    className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-lg shadow-amber-500/20"
                                >
                                    {isSavingExtra ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Lançando...
                                        </>
                                    ) : (
                                        <>
                                            <Gift className="mr-2 h-4 w-4" />
                                            Lançar R$ {extraAmount || "0"} no Salário
                                        </>
                                    )}
                                </Button>
                            </form>

                            {/* Histórico de Extras Já Lançados */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-widest text-white flex items-center justify-between">
                                    <span>Histórico de Extras Lançados</span>
                                    <span className="text-[10px] text-muted-foreground font-normal">
                                        {currentExtraCollab.extras?.length || 0} lançamento(s)
                                    </span>
                                </h4>

                                {(!currentExtraCollab.extras || currentExtraCollab.extras.length === 0) ? (
                                    <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-white/10 rounded-2xl">
                                        Nenhum extra lançado para este colaborador ainda.
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {currentExtraCollab.extras.map((extra) => (
                                            <div 
                                                key={extra.id}
                                                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs hover:border-white/10 transition-colors"
                                            >
                                                <div className="min-w-0 flex-1 pr-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-white truncate">
                                                            {extra.description}
                                                        </span>
                                                        <Badge variant="outline" className="text-[9px] border-white/10 text-muted-foreground font-mono">
                                                            {extra.date}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="font-black text-amber-400">
                                                        + {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(extra.amount)}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => deleteExtra(extra.id)}
                                                        className="h-7 w-7 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                                                        title="Excluir lançamento"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* MODAL 2: Criação / Edição de Colaborador */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md bg-slate-950 border border-white/10 text-white rounded-3xl p-6 shadow-2xl backdrop-blur-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-['Cinzel'] font-bold text-luxury shimmer-gold uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            {editingCollab ? "Editar Colaborador" : "Novo Colaborador"}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSave} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Nome Completo ou Apelido *
                            </Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ex: Adrian, Lucas, Samuel..."
                                required
                                className="h-12 bg-white/5 border-white/10 rounded-xl font-bold focus:bg-white/10"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Cargo / Especialidade
                            </Label>
                            <Select 
                                value={formData.role} 
                                onValueChange={(val) => setFormData({ ...formData, role: val })}
                            >
                                <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl font-bold">
                                    <SelectValue placeholder="Selecione o cargo" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 font-bold text-white">
                                    {COMMON_ROLES.map((r) => (
                                        <SelectItem key={r} value={r}>{r}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    WhatsApp / Celular
                                </Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="(22) 99999-9999"
                                    className="h-12 bg-white/5 border-white/10 rounded-xl font-bold focus:bg-white/10"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Salário Base Mensal (R$) *
                                </Label>
                                <Input
                                    type="number"
                                    step="50.00"
                                    min="0"
                                    value={formData.salary}
                                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                                    placeholder="2500.00"
                                    className="h-12 bg-white/5 border-white/10 rounded-xl font-bold focus:bg-white/10"
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-4 flex gap-2 sm:justify-end">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsDialogOpen(false)}
                                className="h-12 rounded-xl font-bold"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSaving || !formData.name.trim()}
                                className="h-12 px-6 rounded-xl bg-primary text-primary-foreground font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    "Salvar Colaborador"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
