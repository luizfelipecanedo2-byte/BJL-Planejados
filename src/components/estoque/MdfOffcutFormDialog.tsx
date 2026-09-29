import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MdfOffcut, GrainDirection, OffcutStatus } from "@/types/mdfOffcut";
import { Sparkles, Layers, Box, Compass, MapPin } from "lucide-react";

interface MdfOffcutFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: Omit<MdfOffcut, "id" | "createdAt" | "updatedAt">) => void;
    onUpdate?: (id: string, updates: Partial<MdfOffcut>) => void;
    editingOffcut?: MdfOffcut | null;
    nextCode?: string;
}

const COMMON_PATTERNS = [
    "Branco TX",
    "Louro Freijó",
    "Gianduia Trama",
    "Grafite Matt",
    "Carvalho Budi",
    "Preto Silk",
    "Nogueira",
    "Itapuã"
];

const COMMON_THICKNESSES = [6, 15, 18, 25];

export const MdfOffcutFormDialog = ({
    open,
    onOpenChange,
    onSubmit,
    onUpdate,
    editingOffcut,
    nextCode = "RET-001"
}: MdfOffcutFormDialogProps) => {
    const [code, setCode] = useState(nextCode);
    const [materialName, setMaterialName] = useState("");
    const [thicknessMm, setThicknessMm] = useState<number>(15);
    const [lengthMm, setLengthMm] = useState<number | "">("");
    const [widthMm, setWidthMm] = useState<number | "">("");
    const [quantity, setQuantity] = useState<number>(1);
    const [grainDirection, setGrainDirection] = useState<GrainDirection>("none");
    const [location, setLocation] = useState("Rack A - Baia 1");
    const [status, setStatus] = useState<OffcutStatus>("disponivel");
    const [reservedProject, setReservedProject] = useState("");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (editingOffcut) {
            setCode(editingOffcut.code);
            setMaterialName(editingOffcut.materialName);
            setThicknessMm(editingOffcut.thicknessMm);
            setLengthMm(editingOffcut.lengthMm);
            setWidthMm(editingOffcut.widthMm);
            setQuantity(editingOffcut.quantity);
            setGrainDirection(editingOffcut.grainDirection);
            setLocation(editingOffcut.location);
            setStatus(editingOffcut.status);
            setReservedProject(editingOffcut.reservedProject || "");
            setNotes(editingOffcut.notes || "");
        } else {
            setCode(nextCode);
            setMaterialName("");
            setThicknessMm(15);
            setLengthMm("");
            setWidthMm("");
            setQuantity(1);
            setGrainDirection("none");
            setLocation("Rack A - Baia 1");
            setStatus("disponivel");
            setReservedProject("");
            setNotes("");
        }
    }, [editingOffcut, nextCode, open]);

    const areaM2 = (Number(lengthMm || 0) * Number(widthMm || 0)) / 1_000_000;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!materialName.trim()) {
            alert("Informe o padrão/cor do MDF!");
            return;
        }

        if (!lengthMm || Number(lengthMm) <= 0 || !widthMm || Number(widthMm) <= 0) {
            alert("Informe o comprimento e a largura em milímetros (mm)!");
            return;
        }

        const payload = {
            code: code.trim() || nextCode,
            materialName: materialName.trim(),
            thicknessMm: Number(thicknessMm),
            lengthMm: Number(lengthMm),
            widthMm: Number(widthMm),
            quantity: Number(quantity) || 1,
            grainDirection,
            location: location.trim() || "Galpão",
            status,
            reservedProject: reservedProject.trim() || null,
            notes: notes.trim() || null
        };

        if (editingOffcut && onUpdate) {
            onUpdate(editingOffcut.id, payload);
        } else {
            onSubmit(payload);
        }

        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-card/95 border-white/10 backdrop-blur-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        {editingOffcut ? "Editar Retalho de MDF" : "Cadastrar Sobra / Retalho de MDF"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Código / Etiqueta</Label>
                            <Input
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="Ex: RET-001"
                                className="font-mono font-bold"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Status da Sobra</Label>
                            <Select value={status} onValueChange={(val: OffcutStatus) => setStatus(val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="disponivel">🟢 Disponível para uso</SelectItem>
                                    <SelectItem value="reservado">🟡 Reservado para Projeto</SelectItem>
                                    <SelectItem value="utilizado">⚪ Utilizado (Baixado)</SelectItem>
                                    <SelectItem value="descartado">🔴 Descartado / Quebrado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Material & Quick chips */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center justify-between">
                            <span>Padrão / Cor do MDF</span>
                            <span className="text-[10px] text-primary lowercase">Sugestões rápidas abaixo</span>
                        </Label>
                        <Input
                            value={materialName}
                            onChange={(e) => setMaterialName(e.target.value)}
                            placeholder="Ex: Branco TX, Louro Freijó, Gianduia..."
                            className="font-medium"
                            required
                        />
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {COMMON_PATTERNS.map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setMaterialName(p)}
                                    className={`text-[10px] font-bold px-2 py-1 rounded-full border transition-all ${
                                        materialName === p
                                            ? "bg-primary text-black border-primary"
                                            : "bg-muted/40 hover:bg-muted text-muted-foreground border-white/5"
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Thickness chips */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Espessura (mm)</Label>
                        <div className="flex items-center gap-2">
                            {COMMON_THICKNESSES.map((th) => (
                                <Button
                                    key={th}
                                    type="button"
                                    variant={thicknessMm === th ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setThicknessMm(th)}
                                    className="font-mono font-bold"
                                >
                                    {th} mm
                                </Button>
                            ))}
                            <Input
                                type="number"
                                placeholder="Outra"
                                value={COMMON_THICKNESSES.includes(thicknessMm) ? "" : thicknessMm}
                                onChange={(e) => setThicknessMm(Number(e.target.value))}
                                className="w-24 font-mono font-bold text-sm"
                            />
                        </div>
                    </div>

                    {/* Dimensions Length x Width */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/20 p-3 rounded-2xl border border-white/5">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Comprimento (mm)</Label>
                            <Input
                                type="number"
                                placeholder="Ex: 1250"
                                value={lengthMm}
                                onChange={(e) => setLengthMm(e.target.value === "" ? "" : Number(e.target.value))}
                                className="font-mono text-base font-bold"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Largura (mm)</Label>
                            <Input
                                type="number"
                                placeholder="Ex: 600"
                                value={widthMm}
                                onChange={(e) => setWidthMm(e.target.value === "" ? "" : Number(e.target.value))}
                                className="font-mono text-base font-bold"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Qtd de Peças</Label>
                            <Input
                                type="number"
                                min={1}
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                                className="font-mono text-base font-bold"
                                required
                            />
                        </div>

                        <div className="col-span-full pt-1 text-xs text-muted-foreground flex justify-between items-center border-t border-white/5">
                            <span>Área unitária calculada:</span>
                            <span className="font-mono font-bold text-primary">
                                {areaM2 > 0 ? `${areaM2.toFixed(3)} m²` : "0 m²"} 
                                {quantity > 1 ? ` (${(areaM2 * quantity).toFixed(3)} m² total)` : ""}
                            </span>
                        </div>
                    </div>

                    {/* Grain Direction & Location */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                                <Compass className="h-3.5 w-3.5 text-primary" />
                                Sentido do Veio da Madeira
                            </Label>
                            <Select value={grainDirection} onValueChange={(val: GrainDirection) => setGrainDirection(val)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sem veio / Unicolor / Indiferente</SelectItem>
                                    <SelectItem value="longitudinal">Longitudinal (no Comprimento)</SelectItem>
                                    <SelectItem value="transversal">Transversal (na Largura)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-primary" />
                                Localização no Galpão
                            </Label>
                            <Input
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Ex: Rack A - Baia 2, Prateleira B..."
                            />
                        </div>
                    </div>

                    {/* Reserved Project (if applicable) */}
                    {status === "reservado" && (
                        <div className="space-y-1.5 animate-in fade-in duration-200">
                            <Label className="text-xs font-bold uppercase text-amber-500">Projeto / Ordem de Serviço Destinada</Label>
                            <Input
                                value={reservedProject}
                                onChange={(e) => setReservedProject(e.target.value)}
                                placeholder="Ex: OS #104 - Cozinha do João Silva"
                            />
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Observações / Detalhes</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ex: Já tem 1 lado com fita de borda, sobra limpa de corte sem avarias..."
                            rows={2}
                        />
                    </div>

                    <DialogFooter className="pt-2 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-wider">
                            {editingOffcut ? "Salvar Alterações" : "Salvar Retalho"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
