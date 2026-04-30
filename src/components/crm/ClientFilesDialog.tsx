import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { Client } from "@/types/client";
import FileUploader from "../shared/FileUploader";
import { 
    File, 
    Image as ImageIcon, 
    Trash2, 
    Download, 
    FolderOpen,
    ExternalLink,
    Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface FileItem {
    name: string;
    id: string;
    created_at: string;
    metadata: any;
}

interface ClientFilesDialogProps {
    client: Client | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function ClientFilesDialog({ client, open, onOpenChange }: ClientFilesDialogProps) {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(false);

    const bucketName = "project-files";
    const folderPath = client ? `clients/${client.id}` : "";

    useEffect(() => {
        if (open && client) {
            fetchFiles();
        }
    }, [open, client]);

    const fetchFiles = async () => {
        if (!client) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.storage
                .from(bucketName)
                .list(folderPath, {
                    limit: 100,
                    offset: 0,
                    sortBy: { column: 'created_at', order: 'desc' },
                });

            if (error) throw error;
            setFiles(data as any || []);
        } catch (error: any) {
            console.error('Error fetching files:', error);
            // Don't show toast if bucket doesn't exist yet, we'll handle it in uploader
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (fileName: string) => {
        if (!window.confirm("Deseja realmente excluir este arquivo?")) return;
        
        try {
            const { error } = await supabase.storage
                .from(bucketName)
                .remove([`${folderPath}/${fileName}`]);

            if (error) throw error;
            toast.success("Arquivo excluído com sucesso!");
            fetchFiles();
        } catch (error: any) {
            toast.error(`Erro ao excluir arquivo: ${error.message}`);
        }
    };

    const getFileUrl = (fileName: string) => {
        const { data } = supabase.storage
            .from(bucketName)
            .getPublicUrl(`${folderPath}/${fileName}`);
        return data.publicUrl;
    };

    const isImage = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || "");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-card border-white/10 text-white max-w-2xl rounded-[2.5rem] p-0 overflow-hidden shadow-2xl luxury-shadow">
                <div className="bg-primary p-8 text-primary-foreground">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                                <FolderOpen className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Documentos & Fotos</DialogTitle>
                                <DialogDescription className="text-primary-foreground/80 font-medium">{client?.name}</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto hide-scrollbar">
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Upload de Arquivos</h4>
                        <FileUploader 
                            bucketName={bucketName} 
                            folderPath={folderPath} 
                            onUploadComplete={fetchFiles} 
                        />
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Arquivos Salvos</h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {loading ? (
                                <div className="col-span-full py-12 flex flex-col items-center justify-center space-y-4">
                                    <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Listando arquivos...</p>
                                </div>
                            ) : files.length > 0 ? (
                                files.map((file) => (
                                    <div key={file.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all group relative overflow-hidden">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2.5 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform duration-500">
                                                {isImage(file.name) ? <ImageIcon className="h-5 w-5 text-primary" /> : <File className="h-5 w-5 text-primary" />}
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-sm font-bold text-luxury truncate group-hover:text-primary transition-colors pr-8">
                                                    {file.name.split('_').slice(1).join('_') || file.name}
                                                </span>
                                                <div className="flex items-center gap-1.5 mt-1 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDistanceToNow(new Date(file.created_at), { addSuffix: true, locale: ptBR })}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-primary hover:bg-primary/10"
                                                onClick={() => window.open(getFileUrl(file.name), '_blank')}
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-rose-500 hover:bg-rose-500/10"
                                                onClick={() => handleDelete(file.name)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-12 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.02]">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nenhum arquivo encontrado</p>
                                    <p className="text-[10px] text-muted-foreground/40 mt-2">Os documentos enviados aparecerão aqui.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-center">
                    <p className="text-[9px] font-black uppercase text-muted-foreground/30 tracking-[0.3em]">BJL PLANEJADOS • GESTÃO DE DOCUMENTOS</p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
