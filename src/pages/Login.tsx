import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Lock, Loader2 } from "lucide-react";

export default function Login() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            toast.success("Login realizado com sucesso!");
        } catch (error: any) {
            toast.error(error.message || "Erro ao fazer login");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-black relative overflow-hidden">
            {/* Ambient Background Layer */}
            <div className="absolute inset-0 aurora-bg opacity-30"></div>
            <div className="absolute inset-0 stardust opacity-50"></div>
            
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black"></div>

            <Card className="w-full max-w-md relative shadow-2xl border border-white/10 backdrop-blur-3xl bg-black/40 rounded-[2.5rem] p-4 overflow-hidden spotlight-card tilt-card border-beam-card">
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />

                <CardHeader className="space-y-4 flex flex-col items-center pt-8 pb-4 relative z-10">
                    <div className="relative group">
                        <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/30 transition-all duration-700 opacity-50" />
                        <img
                            src="/logo-bjl.png"
                            alt="BJL Planejados"
                            className="h-32 w-auto object-contain relative z-10 drop-shadow-[0_0_25px_rgba(255,215,0,0.3)] hover:scale-105 transition-transform duration-500"
                        />
                    </div>
                    
                    <div className="text-center space-y-2">
                        <h1 className="text-xl sm:text-4xl font-black tracking-tighter shimmer-gold whitespace-nowrap">
                            BJL PLANEJADOS
                        </h1>
                        <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-muted-foreground/60 leading-none">
                            High-End Management System
                        </p>
                    </div>
                </CardHeader>

                <CardContent className="px-6 pb-8 relative z-10">
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">E-mail</label>
                            <div className="relative group/input">
                                <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-md group-focus-within/input:bg-primary/10 transition-all" />
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                                <Input
                                    type="email"
                                    placeholder="seu@email.com"
                                    className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all text-base font-medium"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Senha</label>
                            <div className="relative group/input">
                                <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-md group-focus-within/input:bg-primary/10 transition-all" />
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all text-base font-medium"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <Button 
                            className="w-full h-14 text-base font-black uppercase tracking-widest bg-primary hover:bg-primary/80 text-primary-foreground rounded-2xl shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden group" 
                            type="submit" 
                            disabled={loading}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] transition-transform" />
                            {loading ? (
                                <div className="flex items-center gap-3">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Acessando...</span>
                                </div>
                            ) : (
                                "Entrar no Sistema"
                            )}
                        </Button>
                    </form>
                    
                    <div className="mt-10 text-center">
                        <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
                            BJL Planejados &copy; {new Date().getFullYear()} • Edição de Luxo
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
