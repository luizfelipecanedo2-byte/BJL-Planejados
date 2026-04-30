import { useState, useEffect } from "react";
import { 
    ChevronRight, 
    MessageCircle, 
    Instagram, 
    Facebook, 
    MapPin, 
    Phone, 
    Mail, 
    CheckCircle2,
    ArrowRight,
    Menu,
    X,
    Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MagicButton } from "@/components/ui/magic-button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const LandingPage = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        message: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Insert into 'sales' table as a new lead
            const { error } = await supabase
                .from('sales')
                .insert([{
                    client_name: formData.name,
                    client_phone: formData.phone,
                    client_email: formData.email,
                    product: 'Interesse via Site',
                    status: 'lead',
                    notes: `Mensagem: ${formData.message}`,
                    total_value: 0
                }]);

            if (error) throw error;
            
            toast.success("Solicitação enviada com sucesso! Entraremos em contato em breve.");
            setFormData({ name: '', email: '', phone: '', message: '' });
        } catch (error: any) {
            console.error('Error submitting lead:', error);
            toast.error("Erro ao enviar solicitação. Tente novamente ou use o WhatsApp.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-primary selection:text-black overflow-x-hidden font-sans">
            {/* Header */}
            <header className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 lg:px-20 py-4 flex items-center justify-between",
                scrolled ? "bg-black/80 backdrop-blur-xl border-b border-white/5 py-4" : "bg-transparent py-8"
            )}>
                <div className="flex items-center gap-3">
                    <img src="/logo-bjl.png" alt="BJL Logo" className="h-10 w-10 object-contain rounded-full border border-primary/30" />
                    <span className="text-xl font-black tracking-tighter uppercase shimmer-gold">BJL Planejados</span>
                </div>

                <nav className="hidden lg:flex items-center gap-10">
                    {["Início", "Sobre", "Projetos", "Depoimentos", "Contato"].map((item) => (
                        <a key={item} href={`#${item.toLowerCase()}`} className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 hover:text-primary transition-colors">
                            {item}
                        </a>
                    ))}
                    <Button variant="outline" className="rounded-full border-primary/30 text-primary hover:bg-primary/10 font-bold uppercase text-[10px] tracking-widest px-8">
                        Portal do Cliente
                    </Button>
                </nav>

                <button className="lg:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    {isMenuOpen ? <X /> : <Menu />}
                </button>
            </header>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-40 bg-black flex flex-col items-center justify-center gap-8 animate-in fade-in duration-300">
                    {["Início", "Sobre", "Projetos", "Depoimentos", "Contato"].map((item) => (
                        <a 
                            key={item} 
                            href={`#${item.toLowerCase()}`} 
                            className="text-2xl font-black uppercase tracking-widest text-white hover:text-primary"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            {item}
                        </a>
                    ))}
                </div>
            )}

            {/* Hero Section */}
            <section id="início" className="relative h-screen flex items-center justify-center px-6 overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-[#050505]" />
                </div>

                <div className="relative z-10 text-center max-w-4xl space-y-8 animate-in slide-in-from-bottom duration-1000">
                    <div className="flex justify-center">
                        <div className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md mb-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Arquitetura & Design High-End</span>
                        </div>
                    </div>
                    <h1 className="text-5xl lg:text-8xl font-black tracking-tighter leading-[0.9] lg:leading-[0.8]">
                        Transformando <br />
                        <span className="shimmer-gold">Ambientes</span> em <br />
                        Obras de Arte
                    </h1>
                    <p className="text-lg lg:text-xl text-white/60 font-medium max-w-2xl mx-auto leading-relaxed">
                        Móveis planejados com tecnologia alemã e acabamento artesanal para quem não abre mão do extraordinário.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
                        <MagicButton className="h-16 px-12 text-sm uppercase font-black tracking-widest shadow-2xl shadow-primary/20">
                            Solicitar Orçamento Gratuito
                        </MagicButton>
                        <button className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:text-primary transition-all group">
                            Ver Galeria de Projetos <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Mouse Scroll indicator */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-30">
                    <div className="w-1 h-12 rounded-full bg-gradient-to-b from-primary to-transparent" />
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-20 px-6 lg:px-20 relative border-y border-white/5 bg-white/[0.01]">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-20">
                    {[
                        { label: "Projetos Entregues", value: "1.2k+" },
                        { label: "Anos de Experiência", value: "15+" },
                        { label: "Garantia Total", value: "10 Anos" },
                        { label: "Clientes Satisfeitos", value: "100%" },
                    ].map((stat, idx) => (
                        <div key={idx} className="flex flex-col items-center text-center space-y-2">
                            <span className="text-4xl lg:text-5xl font-black tracking-tighter text-luxury">{stat.value}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{stat.label}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Featured Projects */}
            <section id="projetos" className="py-32 px-6 lg:px-20 space-y-20">
                <div className="flex flex-col lg:flex-row justify-between items-end gap-8">
                    <div className="space-y-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Nosso Portfólio</span>
                        <h2 className="text-4xl lg:text-6xl font-black tracking-tighter">Projetos que Inspiram</h2>
                    </div>
                    <p className="text-white/40 text-sm max-w-sm font-medium leading-relaxed">
                        Cada projeto é único, desenhado para refletir a personalidade e o estilo de vida de nossos clientes mais exigentes.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[
                        { title: "Cozinha Minimalista Black", category: "Gourmet", img: "https://images.unsplash.com/photo-1556911223-e4524c13936d?q=80&w=2070&auto=format&fit=crop" },
                        { title: "Home Office Tecnológico", category: "Corporativo", img: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=1935&auto=format&fit=crop" },
                        { title: "Suíte Master com Closet", category: "Dormitórios", img: "https://images.unsplash.com/photo-1505691938895-1758d7eaa511?q=80&w=2070&auto=format&fit=crop" },
                    ].map((project, idx) => (
                        <div key={idx} className="group relative aspect-[4/5] rounded-[2.5rem] overflow-hidden luxury-shadow border border-white/5">
                            <img src={project.img} alt={project.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
                            <div className="absolute bottom-8 left-8 right-8 flex flex-col gap-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">{project.category}</span>
                                <h3 className="text-2xl font-black tracking-tight">{project.title}</h3>
                                <button className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/60 group-hover:text-white transition-colors mt-4">
                                    Explorar Projeto <ArrowRight className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Testimonials */}
            <section id="depoimentos" className="py-32 px-6 lg:px-20 bg-white/[0.01]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div className="space-y-12">
                        <div className="space-y-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Experiência do Cliente</span>
                            <h2 className="text-4xl lg:text-6xl font-black tracking-tighter">O que dizem sobre nós</h2>
                        </div>
                        
                        <div className="space-y-8">
                            {[
                                { name: "Ricardo Almeida", role: "Arquiteto", text: "A precisão da BJL Planejados é impressionante. Meus projetos ganham vida com uma fidelidade que raramente encontro no mercado." },
                                { name: "Juliana Mendes", role: "Empresária", text: "Minha cozinha ficou exatamente como eu sonhava. O atendimento é impecável do início ao fim." }
                            ].map((test, idx) => (
                                <div key={idx} className="p-8 rounded-[2rem] bg-white/5 border border-white/5 space-y-4 relative overflow-hidden group">
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map(s => <Star key={s} className="h-3 w-3 fill-primary text-primary" />)}
                                    </div>
                                    <p className="text-lg italic font-medium text-white/80 leading-relaxed">"{test.text}"</p>
                                    <div className="flex flex-col">
                                        <span className="font-black text-sm text-luxury">{test.name}</span>
                                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{test.role}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="relative aspect-square rounded-[3rem] overflow-hidden luxury-shadow border-4 border-white/5 group">
                         <img src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000&auto=format&fit=crop" className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                         <div className="absolute inset-0 bg-primary/20 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contato" className="py-32 px-6 lg:px-20 relative overflow-hidden">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-[160px]" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-[160px]" />

                <div className="relative z-10 glass-card rounded-[3rem] border border-white/10 p-10 lg:p-20 grid grid-cols-1 lg:grid-cols-2 gap-20 luxury-shadow">
                    <div className="space-y-12">
                        <div className="space-y-4">
                            <h2 className="text-4xl lg:text-6xl font-black tracking-tighter">Vamos projetar seu <br /> <span className="shimmer-gold">próximo sonho?</span></h2>
                            <p className="text-white/60 font-medium leading-relaxed">Solicite uma consultoria gratuita com nossos especialistas em design de interiores.</p>
                        </div>

                        <div className="space-y-8">
                            <div className="flex items-center gap-6 group">
                                <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all duration-500">
                                    <Phone className="h-6 w-6" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">Ligue para nós</span>
                                    <span className="text-xl font-bold">(11) 9999-9999</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 group">
                                <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all duration-500">
                                    <MapPin className="h-6 w-6" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">Nossa Sede</span>
                                    <span className="text-xl font-bold">Av. Luxury, 1000 - SP</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 hover:text-primary transition-all">
                                <Instagram className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 hover:text-primary transition-all">
                                <Facebook className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 hover:text-primary transition-all">
                                <MessageCircle className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    <form onSubmit={handleFormSubmit} className="bg-white/5 border border-white/10 p-10 rounded-[2.5rem] space-y-6 relative overflow-hidden backdrop-blur-xl">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Nome Completo</label>
                                <input 
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 px-6 focus:border-primary outline-none transition-all font-bold text-sm" 
                                    placeholder="Ex: Luiz Felipe"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">WhatsApp</label>
                                <input 
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 px-6 focus:border-primary outline-none transition-all font-bold text-sm" 
                                    placeholder="(11) 99999-9999"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">E-mail</label>
                            <input 
                                required
                                type="email"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 px-6 focus:border-primary outline-none transition-all font-bold text-sm" 
                                placeholder="exemplo@email.com"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Seu Ambiente (Opcional)</label>
                            <textarea 
                                className="w-full bg-white/5 border border-white/10 rounded-2xl h-32 p-6 focus:border-primary outline-none transition-all font-bold text-sm resize-none" 
                                placeholder="Conte-nos brevemente sobre o seu sonho..."
                                value={formData.message}
                                onChange={(e) => setFormData({...formData, message: e.target.value})}
                            />
                        </div>
                        <MagicButton 
                            disabled={submitting}
                            className="w-full h-16 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                        >
                            {submitting ? "Enviando..." : "Solicitar Consultoria Exclusive"}
                        </MagicButton>
                    </form>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 border-t border-white/5 px-6 lg:px-20 text-center space-y-8">
                <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-3">
                        <img src="/logo-bjl.png" alt="BJL Logo" className="h-8 w-8 object-contain rounded-full opacity-50 grayscale" />
                        <span className="text-sm font-black uppercase tracking-[0.5em] text-white/30">BJL Planejados</span>
                    </div>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                        © 2026 BJL Móveis Planejados Ltda. Todos os direitos reservados. <br />
                        Design & Tecnologia para Viver Melhor.
                    </p>
                </div>
            </footer>

            {/* Floating WhatsApp */}
            <a 
                href="https://wa.me/5511999999999" 
                target="_blank" 
                className="fixed bottom-10 right-10 z-50 h-16 w-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40 hover:scale-110 transition-transform cursor-pointer"
            >
                <MessageCircle className="h-8 w-8 text-white" />
            </a>
        </div>
    );
};

export default LandingPage;
