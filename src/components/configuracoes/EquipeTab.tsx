import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollaborators, Collaborator } from "@/hooks/useCollaborators";
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
    Loader2 
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
        toggleStatus, 
        deleteCollaborator 
    } = useCollaborators();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCollab, setEditingCollab] = useState<Collaborator | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        role: "Marceneiro",
        phone: "",
        email: "",
        hourly_rate: "0"
    });

    const handleOpenCreate = () => {
        setEditingCollab(null);
        setFormData({
            name: "",
            role: "Marceneiro",
            phone: "",
            email: "",
            hourly_rate: "0"
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
            hourly_rate: String(collab.hourly_rate || 0)
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
                    hourly_rate: parseFloat(formData.hourly_rate) || 0
                });
            } else {
                await addCollaborator({
                    name: formData.name.trim(),
                    role: formData.role,
                    phone: formData.phone.trim(),
                    email: formData.email.trim(),
                    hourly_rate: parseFloat(formData.hourly_rate) || 0
                });
            }
            setIsDialogOpen(false);
        } finally {
            setIsSaving(false);
        }
    };

    const activeCount = collaborators.filter(c => c.active).length;
    const inactiveCount = collaborators.length - activeCount;

    return (
        <div className="space-y-6">
            {/* Header de Gestão da Equipe */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-inner">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-['Cinzel'] font-bold text-luxury shimmer-gold uppercase tracking-wider">
                                Gestão de Equipe & Marcenaria
                            </h2>
                            <p className="text-xs text-muted-foreground font-medium">
                                {activeCount} {activeCount === 1 ? 'colaborador ativo' : 'colaboradores ativos'} na fábrica e montagem
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

            {/* Grid de Colaboradores */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {collaborators.map((collab) => {
                            const cleanPhone = collab.phone?.replace(/\D/g, "");
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
                                            {/* Cabeçalho do Card */}
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

                                            {/* Informações detalhadas */}
                                            <div className="pt-2 border-t border-white/5 space-y-2 text-xs">
                                                {collab.phone && (
                                                    <div className="flex items-center justify-between text-muted-foreground">
                                                        <span className="flex items-center gap-1.5 font-medium">
                                                            <Phone className="h-3.5 w-3.5 text-primary/70" />
                                                            {collab.phone}
                                                        </span>
                                                        {cleanPhone && (
                                                            <a
                                                                href={`https://wa.me/55${cleanPhone}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-md transition-colors"
                                                            >
                                                                <MessageCircle className="h-3 w-3" />
                                                                WhatsApp
                                                            </a>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between text-muted-foreground pt-1">
                                                    <span className="flex items-center gap-1.5 font-medium">
                                                        <DollarSign className="h-3.5 w-3.5 text-primary/70" />
                                                        Valor da Hora:
                                                    </span>
                                                    <span className="font-bold text-white">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(collab.hourly_rate || 0)}/h
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Ação de Ativar / Inativar */}
                                            <div className="pt-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => toggleStatus(collab.id, collab.active)}
                                                    className={`w-full h-9 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all ${
                                                        collab.active 
                                                            ? 'border-white/10 hover:border-amber-500/40 hover:bg-amber-500/10 text-muted-foreground hover:text-amber-400' 
                                                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                                    }`}
                                                >
                                                    {collab.active ? (
                                                        <>
                                                            <XCircle className="h-3.5 w-3.5 mr-1.5" />
                                                            Inativar Colaborador
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                                                            Reativar Colaborador
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

            {/* Modal de Criação / Edição */}
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
                                    Valor Hora (R$/h)
                                </Label>
                                <Input
                                    type="number"
                                    step="0.50"
                                    min="0"
                                    value={formData.hourly_rate}
                                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                                    placeholder="25.00"
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
