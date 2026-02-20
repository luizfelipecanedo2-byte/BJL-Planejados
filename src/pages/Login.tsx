import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";

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
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop')] bg-cover bg-center">
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm"></div>
            <Card className="w-full max-w-md relative shadow-2xl border-none">
                <CardHeader className="space-y-1 flex flex-col items-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <LogIn className="w-10 h-10 text-primary" />
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight">BJL Planejados</CardTitle>
                    <CardDescription className="text-base">
                        Entre com suas credenciais para acessar o sistema
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                                <Input
                                    type="email"
                                    placeholder="Seu e-mail"
                                    className="pl-10 h-12"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                                <Input
                                    type="password"
                                    placeholder="Sua senha"
                                    className="pl-10 h-12"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <Button className="w-full h-12 text-lg font-semibold" type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Entrando...
                                </>
                            ) : (
                                "Entrar no Sistema"
                            )}
                        </Button>
                    </form>
                    <div className="mt-6 text-center text-sm text-muted-foreground">
                        Esqueceu sua senha? Entre em contato com o administrador.
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
