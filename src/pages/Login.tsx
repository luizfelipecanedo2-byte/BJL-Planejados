import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Lock, Loader2, ShieldCheck } from "lucide-react";

export default function Login() {
    const navigate = useNavigate();
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

    const handleBypassLogin = () => {
        localStorage.setItem("mock_admin_session", "true");
        toast.success("Acesso Administrador autorizado (Modo Demonstração)!");
        setTimeout(() => {
            window.location.href = "/admin/financeiro";
        }, 800);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-black relative overflow-hidden">
            {/* Ambient Background Layer */}
            <div className="absolute inset-0 aurora-bg opacity-30 pointer-events-none"></div>
            <div className="absolute inset-0 stardust opacity-50 pointer-events-none"></div>
            
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black pointer-events-none"></div>

            <Card className="w-full max-w-md glass-card rounded-[3rem] p-4 overflow-hidden spotlight-card border-beam-card z-10 luxury-shadow">
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
                <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px]" />

                <CardHeader className="space-y-6 flex flex-col items-center pt-10 pb-6 relative z-10">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-primary/30 rounded-full blur-3xl group-hover:bg-primary/50 transition-all duration-1000 opacity-30 animate-pulse" />
                        <img
                            src="/logo-bjl.png"
                            alt="BJL Planejados"
                            className="h-36 w-auto object-contain relative z-10 drop-shadow-[0_0_30px_rgba(var(--primary),0.3)] group-hover:scale-110 transition-transform duration-700"
                        />
                    </div>
                    
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl sm:text-5xl font-black tracking-tighter text-luxury shimmer-gold leading-none">
                            BJL PLANEJADOS
                        </h1>
                        <div className="flex items-center justify-center gap-2">
                           <div className="h-0.5 w-8 bg-primary/40 rounded-full" />
                           <p className="text-[10px] uppercase font-black tracking-[0.4em] text-primary/60">Edição de Luxo</p>
                           <div className="h-0.5 w-8 bg-primary/40 rounded-full" />
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="px-8 pb-10 relative z-10">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-primary/60 uppercase tracking-[0.3em] ml-2 text-luxury">Acesso Restrito</label>
                            <div className="relative group/input">
                                <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-md opacity-0 group-focus-within/input:opacity-100 transition-opacity" />
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within/input:text-primary transition-colors z-[60]" />
                                <Input
                                    type="email"
                                    placeholder="seu@email.com"
                                    className="pl-14 h-16 bg-white/[0.03] border-white/5 rounded-2xl text-white placeholder:text-white/10 focus:border-primary/40 focus:ring-0 transition-all text-base font-medium relative z-50 cursor-text text-luxury"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-primary/60 uppercase tracking-[0.3em] ml-2 text-luxury">Chave de Segurança</label>
                            <div className="relative group/input">
                                <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-md opacity-0 group-focus-within/input:opacity-100 transition-opacity" />
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within/input:text-primary transition-colors z-[60]" />
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-14 h-16 bg-white/[0.03] border-white/5 rounded-2xl text-white placeholder:text-white/10 focus:border-primary/40 focus:ring-0 transition-all text-base font-medium relative z-50 cursor-text text-luxury"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <Button 
                            className="w-full h-16 text-sm font-black uppercase tracking-[0.3em] bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden group/btn" 
                            type="submit" 
                            disabled={loading}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_2s_infinite] transition-transform" />
                            {loading ? (
                                <div className="flex items-center gap-3">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span className="text-luxury">Autenticando...</span>
                                </div>
                            ) : (
                                <span className="text-luxury">Acessar Sistema</span>
                            )}
                        </Button>
                    </form>

                    <div className="mt-4 pt-2">
                        <Button
                            type="button"
                            onClick={handleBypassLogin}
                            className="w-full h-14 text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-lg border border-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <ShieldCheck className="h-4 w-4" />
                            Acesso Rápido (Administrador)
                        </Button>
                    </div>
                    
                    <div className="mt-8 text-center">
                        <p className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.3em] text-luxury">
                            BJL Planejados &copy; {new Date().getFullYear()} • Powered by Lovable
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
