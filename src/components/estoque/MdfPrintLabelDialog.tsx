import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { MdfOffcut } from "@/types/mdfOffcut";

interface MdfPrintLabelDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    offcut: MdfOffcut | null;
}

export const MdfPrintLabelDialog = ({ open, onOpenChange, offcut }: MdfPrintLabelDialogProps) => {
    if (!offcut) return null;

    const areaM2 = ((offcut.lengthMm * offcut.widthMm) / 1_000_000).toFixed(2);

    const handlePrint = () => {
        window.print();
    };

    const grainText = 
        offcut.grainDirection === "longitudinal" ? "Longitudinal (no comprimento)" :
        offcut.grainDirection === "transversal" ? "Transversal (na largura)" : "Sem veio / Unicolor";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-card/95 border-white/20 backdrop-blur-2xl">
                <DialogHeader>
                    <DialogTitle className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
                        <Printer className="h-5 w-5 text-primary" />
                        Etiqueta de Identificação
                    </DialogTitle>
                </DialogHeader>

                {/* Printable Label Box */}
                <div id="mdf-label-print-area" className="p-4 rounded-xl border-2 border-dashed border-amber-500/40 bg-white text-black font-sans shadow-lg my-2 select-text">
                    <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600 block">BJL PLANEJADOS • RETALHO MDF</span>
                            <span className="text-3xl font-black tracking-tight text-black">{offcut.code}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-bold px-2 py-0.5 bg-black text-white rounded">
                                {offcut.thicknessMm} mm
                            </span>
                            <span className="block text-[11px] font-bold text-neutral-700 mt-1">
                                Qtd: {offcut.quantity} un
                            </span>
                        </div>
                    </div>

                    <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs uppercase font-bold text-neutral-600">Padrão / Cor:</span>
                            <span className="font-black text-base text-black uppercase">{offcut.materialName}</span>
                        </div>

                        <div className="flex justify-between items-baseline bg-neutral-100 p-2 rounded">
                            <span className="text-xs uppercase font-bold text-neutral-600">Medidas:</span>
                            <span className="font-black text-lg text-black font-mono">
                                {offcut.lengthMm} × {offcut.widthMm} <span className="text-xs font-normal">mm</span>
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Área:</span>
                                <span className="font-bold text-neutral-800">{areaM2} m²</span>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Localização:</span>
                                <span className="font-bold text-neutral-800">{offcut.location || "Galpão"}</span>
                            </div>
                        </div>

                        <div className="text-xs pt-1 border-t border-neutral-300">
                            <span className="text-[10px] uppercase font-bold text-neutral-500 block">Veio da Madeira:</span>
                            <span className="font-medium text-neutral-800">{grainText}</span>
                        </div>

                        {offcut.notes && (
                            <div className="text-xs pt-1 border-t border-neutral-300">
                                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Observação:</span>
                                <span className="text-neutral-700 italic">{offcut.notes}</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-300 flex justify-between items-center text-[9px] text-neutral-500">
                        <span>BJL Planejados - Controle de Sobras</span>
                        <span>{new Date().toLocaleDateString("pt-BR")}</span>
                    </div>
                </div>

                <DialogFooter className="flex sm:justify-between items-center gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        <X className="h-4 w-4 mr-1" />
                        Fechar
                    </Button>
                    <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                        <Printer className="h-4 w-4 mr-2" />
                        Imprimir Etiqueta
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
