
import React, { useState, useEffect } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, MapPin, Phone, Mail, Globe, Instagram, Facebook, User, Save, Loader2 } from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { motion } from "framer-motion";

const Configuracoes = () => {
    const { settings, loading, updateSettings } = useCompanySettings();
    const [formData, setFormData] = useState({
        name: "",
        cnpj: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        instagram: "",
        facebook: "",
        responsible_name: ""
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (settings) {
            setFormData({
                name: settings.name || "",
                cnpj: settings.cnpj || "",
                address: settings.address || "",
                phone: settings.phone || "",
                email: settings.email || "",
                website: settings.website || "",
                instagram: settings.instagram || "",
                facebook: settings.facebook || "",
                responsible_name: settings.responsible_name || ""
            });
        }
    }, [settings]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await updateSettings(formData);
        setIsSaving(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-700">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-2">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-3 mb-1">
                         <div className="h-8 w-1 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                         <h1 className="text-4xl font-black text-luxury tracking-tighter shimmer-gold">Configurações</h1>
                    </div>
                    <p className="text-muted-foreground font-bold uppercase tracking-[0.2em] text-[10px] opacity-60">Perfil da Empresa & Identidade Visual</p>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                        <CardHeader className="bg-primary/5 border-b border-white/5">
                            <CardTitle className="text-lg font-black uppercase tracking-widest text-primary flex items-center gap-3">
                                <Building2 className="h-5 w-5" /> Dados Institucionais
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome da Empresa</Label>
                                <div className="relative group">
                                    <Input 
                                        value={formData.name} 
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        className="h-12 bg-white/5 border-white/10 rounded-xl font-bold focus:bg-white/10 transition-all pl-11" 
                                    />
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">CNPJ</Label>
                                <div className="relative group">
                                    <Input 
                                        value={formData.cnpj} 
                                        onChange={e => setFormData({...formData, cnpj: e.target.value})}
                                        placeholder="00.000.000/0000-00"
                                        className="h-12 bg-white/5 border-white/10 rounded-xl font-bold focus:bg-white/10 transition-all pl-11" 
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground group-focus-within:text-primary transition-colors">ID</div>
                                </div>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Endereço Comercial</Label>
                                <div className="relative group">
                                    <Input 
                                        value={formData.address} 
                                        onChange={e => setFormData({...formData, address: e.target.value})}
                                        className="h-12 bg-white/5 border-white/10 rounded-xl font-bold focus:bg-white/10 transition-all pl-11" 
                                    />
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Responsável / Administrador</Label>
                                <div className="relative group">
                                    <Input 
                                        value={formData.responsible_name} 
                                        onChange={e => setFormData({...formData, responsible_name: e.target.value})}
                                        className="h-12 bg-white/5 border-white/10 rounded-xl font-bold focus:bg-white/10 transition-all pl-11" 
                                    />
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                        <CardHeader className="bg-primary/5 border-b border-white/5">
                            <CardTitle className="text-lg font-black uppercase tracking-widest text-primary flex items-center gap-3">
                                <Phone className="h-5 w-5" /> Canais de Contato
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Telefone / WhatsApp</Label>
                                <div className="relative group">
                                    <Input 
                                        value={formData.phone} 
                                        onChange={e => setFormData({...formData, phone: e.target.value})}
                                        className="h-12 bg-white/5 border-white/10 rounded-xl font-bold focus:bg-white/10 transition-all pl-11" 
                                    />
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">E-mail de Contato</Label>
                                <div className="relative group">
                                    <Input 
                                        value={formData.email} 
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                        className="h-12 bg-white/5 border-white/10 rounded-xl font-bold focus:bg-white/10 transition-all pl-11" 
                                    />
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Website Oficial</Label>
                                <div className="relative group">
                                    <Input 
                                        value={formData.website} 
                                        onChange={e => setFormData({...formData, website: e.target.value})}
                                        className="h-12 bg-white/5 border-white/10 rounded-xl font-bold focus:bg-white/10 transition-all pl-11" 
                                    />
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
                    <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                        <CardHeader className="bg-primary/5 border-b border-white/5">
                            <CardTitle className="text-lg font-black uppercase tracking-widest text-primary flex items-center gap-3">
                                <Instagram className="h-5 w-5" /> Redes Sociais
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Instagram</Label>
                                <div className="relative group">
                                    <Input 
                                        value={formData.instagram} 
                                        onChange={e => setFormData({...formData, instagram: e.target.value})}
                                        placeholder="@bjlplanejados"
                                        className="h-12 bg-white/5 border-white/10 rounded-xl font-bold focus:bg-white/10 transition-all pl-11" 
                                    />
                                    <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Facebook</Label>
                                <div className="relative group">
                                    <Input 
                                        value={formData.facebook} 
                                        onChange={e => setFormData({...formData, facebook: e.target.value})}
                                        className="h-12 bg-white/5 border-white/10 rounded-xl font-bold focus:bg-white/10 transition-all pl-11" 
                                    />
                                    <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-primary/20 shadow-2xl border-2 p-8 flex flex-col gap-6 items-center text-center">
                        <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center text-primary border border-primary/30 shadow-inner">
                            <Building2 size={40} />
                        </div>
                        <div>
                            <h3 className="font-black uppercase tracking-tighter text-xl">Salvar Alterações</h3>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">
                                Os dados serão atualizados em todos os orçamentos e documentos do sistema.
                            </p>
                        </div>
                        <Button 
                            type="submit" 
                            disabled={isSaving}
                            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Confirmar Atualização
                                </>
                            )}
                        </Button>
                    </Card>
                </div>
            </form>
        </div>
    );
};

export default Configuracoes;
