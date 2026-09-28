import React, { useState, useEffect } from "react";
import { Download, Smartphone, Share, PlusSquare, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function PWAInstallButton({ variant = "default", className = "" }: { variant?: "default" | "minimal" | "floating", className?: string }) {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isIos, setIsIos] = useState(false);
    const [isIosModalOpen, setIsIosModalOpen] = useState(false);

    useEffect(() => {
        // Detectar se já está instalado e rodando em modo standalone (tela cheia)
        const checkStandalone = () => {
            const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator as any).standalone === true;
            setIsStandalone(isPWA);
        };
        checkStandalone();

        // Detectar iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIos(isIosDevice);

        // Escutar evento de instalação do Chrome / Android / Edge
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, []);

    // Se já estiver rodando como aplicativo instalado, não precisa mostrar o botão
    if (isStandalone) {
        return null;
    }

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        } else if (isIos) {
            setIsIosModalOpen(true);
        } else {
            // Em navegadores de desktop que já passaram do prompt ou iOS
            setIsIosModalOpen(true);
        }
    };

    if (variant === "minimal") {
        return (
            <>
                <button
                    onClick={handleInstallClick}
                    type="button"
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 ${className}`}
                    title="Instalar App no seu dispositivo"
                >
                    <Download className="h-3.5 w-3.5" />
                    <span>Instalar App</span>
                </button>

                <IosInstallDialog open={isIosModalOpen} onOpenChange={setIsIosModalOpen} isIos={isIos} />
            </>
        );
    }

    return (
        <>
            <Button
                onClick={handleInstallClick}
                type="button"
                className={`h-9 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all gap-1.5 ${className}`}
            >
                <Smartphone className="h-4 w-4" />
                <span>Instalar Aplicativo</span>
            </Button>

            <IosInstallDialog open={isIosModalOpen} onOpenChange={setIsIosModalOpen} isIos={isIos} />
        </>
    );
}

function IosInstallDialog({ open, onOpenChange, isIos }: { open: boolean; onOpenChange: (open: boolean) => void; isIos: boolean }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-slate-950 border border-white/10 text-white rounded-3xl p-6 shadow-2xl">
                <DialogHeader className="space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                        <Smartphone size={24} />
                    </div>
                    <DialogTitle className="text-center text-lg font-black uppercase tracking-tight text-white">
                        Instalar BJL Planejados
                    </DialogTitle>
                    <DialogDescription className="text-center text-xs text-muted-foreground">
                        Tenha acesso rápido direto da tela de início do seu celular ou tablet, sem barras do navegador.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {isIos ? (
                        <>
                            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 font-black text-xs">1</div>
                                <div>
                                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                        Toque no botão <Share className="h-3.5 w-3.5 text-sky-400 inline" /> Compartilhar
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        Na barra inferior do Safari (o ícone de quadrado com seta para cima).
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 font-black text-xs">2</div>
                                <div>
                                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                        Selecione <PlusSquare className="h-3.5 w-3.5 text-emerald-400 inline" /> "Adicionar à Tela de Início"
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        Role a lista de opções para baixo até encontrar a opção com ícone de mais.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 font-black text-xs">3</div>
                                <div>
                                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                        Toque em <CheckCircle2 className="h-3.5 w-3.5 text-primary inline" /> "Adicionar"
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        O ícone da BJL Planejados aparecerá como um aplicativo nativo na sua tela!
                                    </p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2 text-center">
                            <p className="text-xs text-white/90 leading-relaxed">
                                No seu navegador (Chrome, Edge ou Android), clique nos <strong>três pontinhos (menu)</strong> no canto superior direito e selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                            </p>
                        </div>
                    )}
                </div>

                <Button
                    onClick={() => onOpenChange(false)}
                    className="w-full h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider"
                >
                    Entendi
                </Button>
            </DialogContent>
        </Dialog>
    );
}
