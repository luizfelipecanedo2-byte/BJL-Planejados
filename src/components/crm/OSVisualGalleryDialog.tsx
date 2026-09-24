import React, { useState, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Camera,
    Upload,
    Ruler,
    Maximize2,
    Trash2,
    Edit3,
    Sparkles,
    Check,
    X,
    Download,
    Eye,
    RefreshCw,
    ImageIcon,
    FileImage
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ServiceOrder, OSAttachmentItem, parseOSAttachment, serializeOSAttachment } from "@/types/serviceOrder";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OSVisualGalleryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: ServiceOrder | null;
    onUpdateOrder?: (orderId: string, updatedAttachments: string[]) => void;
}

export const OSVisualGalleryDialog: React.FC<OSVisualGalleryDialogProps> = ({
    open,
    onOpenChange,
    order,
    onUpdateOrder
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedTagFilter, setSelectedTagFilter] = useState<string>("all");

    // Modal de Zoom / Lightbox
    const [activeLightboxItem, setActiveLightboxItem] = useState<OSAttachmentItem | null>(null);

    // Estado para edição de medidas de um item existente
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
    const [editMeasurements, setEditMeasurements] = useState<string>("");
    const [editTitle, setEditTitle] = useState<string>("");
    const [editTag, setEditTag] = useState<string>("Foto do Local");

    // Estado do formulário de novo upload
    const [newTitle, setNewTitle] = useState<string>("");
    const [newMeasurements, setNewMeasurements] = useState<string>("");
    const [newTag, setNewTag] = useState<OSAttachmentItem['tag']>("Medições / Croqui");

    if (!order) return null;

    // Normaliza os anexos para a lista de OSAttachmentItem
    const rawAttachments: string[] = order.attachments || [];
    const items: OSAttachmentItem[] = rawAttachments.map(parseOSAttachment);

    const filteredItems = selectedTagFilter === "all"
        ? items
        : items.filter(i => (i.tag || 'Foto do Local') === selectedTagFilter);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const fileExt = file.name.split('.').pop() || 'jpg';
            const fileName = `${order.ticketNumber || 'os'}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
            const filePath = `service_orders/${fileName}`;

            // Upload para o bucket attachments
            const { error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('attachments')
                .getPublicUrl(filePath);

            const newItem: OSAttachmentItem = {
                id: `att-${Date.now()}`,
                url: publicUrl,
                title: newTitle.trim() || file.name.replace(/\.[^/.]+$/, ""),
                measurements: newMeasurements.trim() || undefined,
                tag: newTag || 'Medições / Croqui',
                createdAt: new Date().toISOString()
            };

            const updatedRawAttachments = [...rawAttachments, serializeOSAttachment(newItem)];

            // Salva na tabela service_orders
            const { error: dbError } = await supabase
                .from('service_orders')
                .update({ attachments: updatedRawAttachments })
                .eq('id', order.id);

            if (dbError) throw dbError;

            // Limpa formulário
            setNewTitle("");
            setNewMeasurements("");
            if (fileInputRef.current) fileInputRef.current.value = "";

            if (onUpdateOrder) {
                onUpdateOrder(order.id, updatedRawAttachments);
            }

            toast.success("Foto e medidas salvas com sucesso!");
        } catch (error) {
            console.error("Erro ao fazer upload da imagem:", error);
            toast.error("Erro ao fazer upload da foto.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteItem = async (indexToDelete: number) => {
        if (!confirm("Tem certeza que deseja remover esta foto?")) return;

        try {
            const updatedRaw = rawAttachments.filter((_, idx) => idx !== indexToDelete);

            const { error } = await supabase
                .from('service_orders')
                .update({ attachments: updatedRaw })
                .eq('id', order.id);

            if (error) throw error;

            if (onUpdateOrder) {
                onUpdateOrder(order.id, updatedRaw);
            }

            if (editingItemIndex === indexToDelete) {
                setEditingItemIndex(null);
            }

            toast.success("Foto removida.");
        } catch (error) {
            console.error("Erro ao remover foto:", error);
            toast.error("Erro ao remover foto.");
        }
    };

    const handleStartEditing = (index: number, item: OSAttachmentItem) => {
        setEditingItemIndex(index);
        setEditTitle(item.title || "");
        setEditMeasurements(item.measurements || "");
        setEditTag(item.tag || "Foto do Local");
    };

    const handleSaveEditing = async (index: number) => {
        try {
            const currentItem = items[index];
            const updatedItem: OSAttachmentItem = {
                ...currentItem,
                title: editTitle.trim() || currentItem.title,
                measurements: editMeasurements.trim() || undefined,
                tag: editTag as any
            };

            const updatedRaw = [...rawAttachments];
            updatedRaw[index] = serializeOSAttachment(updatedItem);

            const { error } = await supabase
                .from('service_orders')
                .update({ attachments: updatedRaw })
                .eq('id', order.id);

            if (error) throw error;

            if (onUpdateOrder) {
                onUpdateOrder(order.id, updatedRaw);
            }

            setEditingItemIndex(null);
            toast.success("Medidas e anotações atualizadas!");
        } catch (error) {
            console.error("Erro ao atualizar anotações:", error);
            toast.error("Erro ao salvar alterações.");
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-950 border-slate-800 text-slate-100 shadow-2xl">
                    {/* Header com estilo neon sofisticado */}
                    <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-black p-6 border-b border-white/10 relative">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/10 flex items-center justify-center">
                                    <Camera className="h-6 w-6" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-black text-white flex items-center gap-2">
                                        Galeria Visual & Medidas do Local
                                        <Badge className="bg-amber-500 hover:bg-amber-600 text-black border-0 text-[10px] uppercase font-black tracking-wider">
                                            {order.ticketNumber}
                                        </Badge>
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-slate-400 mt-0.5">
                                        Cliente: <strong className="text-white">{order.client}</strong> {order.action && `• ${order.action}`}
                                    </DialogDescription>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment" // Habilita câmera direta no celular
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                                <Button
                                    disabled={isUploading}
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-xl gap-2 shadow-lg shadow-amber-500/20"
                                >
                                    {isUploading ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Upload className="h-4 w-4" />
                                    )}
                                    + Nova Foto do Local / Medidas
                                </Button>
                            </div>
                        </div>

                        {/* Campos rápidos para o próximo upload (Título, Medidas e Categoria) */}
                        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <Label className="text-[10px] uppercase font-bold text-slate-400">Local / Título da Foto</Label>
                                <Input
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="Ex: Parede Principal (Cozinha)"
                                    className="h-8 text-xs bg-slate-900 border-slate-700 rounded-lg text-white"
                                />
                            </div>
                            <div>
                                <Label className="text-[10px] uppercase font-bold text-slate-400">Tipo de Registro</Label>
                                <Select value={newTag} onValueChange={(val: any) => setNewTag(val)}>
                                    <SelectTrigger className="h-8 text-xs bg-slate-900 border-slate-700 rounded-lg text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                                        <SelectItem value="Medições / Croqui">📐 Medições / Croqui</SelectItem>
                                        <SelectItem value="Foto do Local">📸 Foto do Local</SelectItem>
                                        <SelectItem value="Projeto 3D">💻 Projeto 3D / Render</SelectItem>
                                        <SelectItem value="Instalação">🔨 Instalação / Obra</SelectItem>
                                        <SelectItem value="Geral">📁 Geral</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-[10px] uppercase font-bold text-slate-400">Medidas / Anotação da Parede</Label>
                                <Input
                                    value={newMeasurements}
                                    onChange={(e) => setNewMeasurements(e.target.value)}
                                    placeholder="Ex: 3,45m x 2,60m • tomada a 1,10m"
                                    className="h-8 text-xs bg-slate-900 border-slate-700 rounded-lg text-white font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Filtros por Categoria com iluminação */}
                    <div className="px-6 py-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-2 shrink-0">
                            Filtrar:
                        </span>
                        {[
                            { id: 'all', label: `Todos (${items.length})` },
                            { id: 'Medições / Croqui', label: '📐 Medições' },
                            { id: 'Foto do Local', label: '📸 Fotos Local' },
                            { id: 'Projeto 3D', label: '💻 3D' },
                            { id: 'Instalação', label: '🔨 Instalação' }
                        ].map(f => (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => setSelectedTagFilter(f.id)}
                                className={cn(
                                    "px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 border",
                                    selectedTagFilter === f.id
                                        ? "bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.35)] scale-105"
                                        : "bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700"
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Grade de Fotos */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {filteredItems.length === 0 ? (
                            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                                    <ImageIcon className="h-8 w-8" />
                                </div>
                                <h4 className="font-bold text-white text-base">Nenhuma foto adicionada ainda</h4>
                                <p className="text-xs text-slate-400 max-w-sm">
                                    Tire fotos do local da obra, do croqui de medidas com trena ou anexe projetos 3D para consultar na marcenaria a qualquer momento.
                                </p>
                                <Button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl mt-2"
                                >
                                    Carregar Primeira Foto
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {filteredItems.map((item, idx) => {
                                    const rawIndex = items.findIndex(i => i.url === item.url);
                                    const isEditing = editingItemIndex === rawIndex;

                                    return (
                                        <div
                                            key={idx}
                                            className="group bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 flex flex-col"
                                        >
                                            {/* Imagem com overlay de ações */}
                                            <div className="relative aspect-video bg-black/40 overflow-hidden cursor-pointer" onClick={() => setActiveLightboxItem(item)}>
                                                <img
                                                    src={item.url}
                                                    alt={item.title || "Foto da OS"}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    loading="lazy"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-80 group-hover:opacity-100 transition-opacity" />

                                                {/* Tag badge no topo */}
                                                <div className="absolute top-2 left-2">
                                                    <Badge className={cn(
                                                        "text-[10px] font-black uppercase tracking-wider shadow-md",
                                                        item.tag === 'Medições / Croqui' ? "bg-amber-500 text-black" :
                                                        item.tag === 'Projeto 3D' ? "bg-blue-600 text-white" :
                                                        item.tag === 'Instalação' ? "bg-emerald-600 text-white" :
                                                        "bg-slate-800 text-slate-200 border border-slate-700"
                                                    )}>
                                                        {item.tag || 'Foto do Local'}
                                                    </Badge>
                                                </div>

                                                {/* Botão de Zoom */}
                                                <div className="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="p-1.5 rounded-lg bg-black/80 text-white border border-white/20 hover:bg-black">
                                                        <Maximize2 className="h-3.5 w-3.5" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Informações & Medidas */}
                                            <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                                                {!isEditing ? (
                                                    <>
                                                        <div>
                                                            <h5 className="font-black text-sm text-white truncate">
                                                                {item.title || "Sem título"}
                                                            </h5>

                                                            {item.measurements ? (
                                                                <div className="mt-1.5 p-2 rounded-xl bg-slate-950 border border-amber-500/20 text-amber-300 font-mono text-xs flex items-start gap-1.5">
                                                                    <Ruler className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                                                                    <span className="line-clamp-2 leading-relaxed">
                                                                        {item.measurements}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <p className="text-[11px] text-slate-500 italic mt-1">
                                                                    Sem medidas anotadas.
                                                                </p>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px]">
                                                            <span className="text-slate-500">
                                                                {item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR') : ""}
                                                            </span>
                                                            <div className="flex items-center gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleStartEditing(rawIndex, item)}
                                                                    className="h-7 px-2 text-slate-400 hover:text-white gap-1"
                                                                >
                                                                    <Edit3 className="h-3 w-3" />
                                                                    Medidas
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleDeleteItem(rawIndex)}
                                                                    className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    /* Formulário inline de edição de medidas */
                                                    <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                                                        <Input
                                                            value={editTitle}
                                                            onChange={(e) => setEditTitle(e.target.value)}
                                                            placeholder="Título da foto"
                                                            className="h-7 text-xs bg-slate-950 border-slate-700"
                                                        />
                                                        <Textarea
                                                            value={editMeasurements}
                                                            onChange={(e) => setEditMeasurements(e.target.value)}
                                                            placeholder="Ex: Parede L: 3,45m x 2,60m • Tomada a 1,10m"
                                                            className="min-h-[60px] text-xs bg-slate-950 border-slate-700 font-mono"
                                                        />
                                                        <div className="flex justify-end gap-1.5 pt-1">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setEditingItemIndex(null)}
                                                                className="h-6 text-[10px] px-2 border-slate-700"
                                                            >
                                                                Cancelar
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleSaveEditing(rawIndex)}
                                                                className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1"
                                                            >
                                                                <Check className="h-3 w-3" />
                                                                Salvar
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                        <span>
                            {items.length} {items.length === 1 ? 'foto registrada' : 'fotos registradas'} nesta OS
                        </span>
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="border-slate-700 text-white font-bold rounded-xl"
                        >
                            Fechar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Lightbox / Zoom Fullscreen Modal */}
            {activeLightboxItem && (
                <Dialog open={!!activeLightboxItem} onOpenChange={() => setActiveLightboxItem(null)}>
                    <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col p-0 overflow-hidden bg-black border-slate-800 text-white">
                        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[450px] max-h-[70vh] p-2">
                            <img
                                src={activeLightboxItem.url}
                                alt={activeLightboxItem.title}
                                className="max-w-full max-h-full object-contain rounded-lg"
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveLightboxItem(null)}
                                className="absolute top-3 right-3 text-white bg-black/60 hover:bg-black rounded-full h-8 w-8 p-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Painel HUD Técnico de Medidas */}
                        <div className="p-5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-amber-500 text-black text-[10px] uppercase font-black">
                                        {activeLightboxItem.tag || 'Foto do Local'}
                                    </Badge>
                                    <h4 className="font-black text-lg text-white">
                                        {activeLightboxItem.title || "Foto do Local"}
                                    </h4>
                                </div>
                                {activeLightboxItem.measurements && (
                                    <div className="mt-2 p-2.5 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 font-mono text-sm flex items-center gap-2">
                                        <Ruler className="h-4 w-4 text-amber-400 shrink-0" />
                                        <span className="font-bold">
                                            {activeLightboxItem.measurements}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                                <a
                                    href={activeLightboxItem.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    download
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-all"
                                >
                                    <Download className="h-4 w-4" />
                                    Baixar Foto Original
                                </a>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
};

export default OSVisualGalleryDialog;
