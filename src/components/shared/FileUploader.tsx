import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, X, File, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
    bucketName: string;
    folderPath: string;
    onUploadComplete: () => void;
}

export default function FileUploader({ bucketName, folderPath, onUploadComplete }: FileUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            setProgress(10);
            
            if (!event.target.files || event.target.files.length === 0) {
                return;
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${folderPath}/${fileName}`;

            setProgress(30);

            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file);

            if (uploadError) {
                if (uploadError.message.includes("Bucket not found")) {
                    toast.error(`Bucket '${bucketName}' não encontrado. Crie-o no painel do Supabase.`);
                } else {
                    throw uploadError;
                }
                return;
            }

            setProgress(100);
            toast.success("Arquivo enviado com sucesso!");
            onUploadComplete();
        } catch (error: any) {
            console.error('Error uploading file:', error);
            toast.error(`Erro ao enviar arquivo: ${error.message}`);
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    return (
        <div className="space-y-4">
            <div className="relative group">
                <label className={cn(
                    "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-[2rem] bg-white/5 hover:bg-white/[0.08] hover:border-primary/50 transition-all cursor-pointer overflow-hidden",
                    uploading && "pointer-events-none opacity-50"
                )}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 space-y-2 relative z-10">
                        {uploading ? (
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        ) : (
                            <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
                            {uploading ? "Enviando..." : "Clique ou Arraste para enviar"}
                        </p>
                    </div>
                    <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
            </div>
            
            {uploading && (
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <span>Progresso do Upload</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5 bg-white/5" />
                </div>
            )}
        </div>
    );
}
