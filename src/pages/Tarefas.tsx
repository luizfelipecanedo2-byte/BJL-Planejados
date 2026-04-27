import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Calendar as CalendarIcon, User as UserIcon, CheckCircle2, Circle, LayoutGrid, ChevronRight, Filter } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { format, isToday, isTomorrow, addDays, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Task {
    id: string;
    title: string;
    description: string;
    status: string;
    assigned_to: string | null;
    created_at: string;
    completed_at: string | null;
    priority: string;
    created_by: string;
    project_name: string | null;
    due_date: string;
}

interface Profile {
    id: string;
    role: string;
    email?: string;
}

const Tarefas = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Form state
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newProject, setNewProject] = useState("");
    const [newDueDate, setNewDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [newAssignedTo, setNewAssignedTo] = useState<string | "all">("all");
    const [newPriority, setNewPriority] = useState("normal");

    const [activeView, setActiveView] = useState("hoje");

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id);
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                setUserRole(profile?.role || 'colaborador');
            }

            await Promise.all([fetchTasks(), fetchProfiles()]);
        } catch (error) {
            console.error("Error fetching initial data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTasks = async () => {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('due_date', { ascending: true })
            .order('project_name', { ascending: true });

        if (error) {
            toast.error("Erro ao carregar tarefas");
        } else {
            setTasks(data || []);
        }
    };

    const fetchProfiles = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, role');
        
        if (!error) {
            setProfiles(data || []);
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const taskData = {
                title: newTitle,
                description: newDescription,
                project_name: newProject || "Geral",
                due_date: newDueDate,
                assigned_to: newAssignedTo === "all" ? null : newAssignedTo,
                priority: newPriority,
                created_by: user.id,
                status: 'pending'
            };

            const { error } = await supabase.from('tasks').insert([taskData]);

            if (error) throw error;

            toast.success("Tarefa criada com sucesso!");
            setIsDialogOpen(false);
            setNewTitle("");
            setNewDescription("");
            setNewProject("");
            setNewDueDate(format(new Date(), "yyyy-MM-dd"));
            setNewAssignedTo("all");
            setNewPriority("normal");
            fetchTasks();
        } catch (error) {
            console.error("Error creating task:", error);
            toast.error("Erro ao criar tarefa");
        }
    };

    const handleToggleStatus = async (task: Task) => {
        const newStatus = task.status === 'pending' ? 'completed' : 'pending';
        const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

        try {
            const { error } = await supabase
                .from('tasks')
                .update({ status: newStatus, completed_at: completedAt })
                .eq('id', task.id);

            if (error) throw error;

            setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus, completed_at: completedAt } : t));
            toast.success(newStatus === 'completed' ? "Tarefa concluída!" : "Tarefa reaberta");
        } catch (error) {
            toast.error("Erro ao atualizar tarefa");
        }
    };

    const handleDeleteTask = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;

        try {
            const { error } = await supabase.from('tasks').delete().eq('id', id);
            if (error) throw error;
            setTasks(tasks.filter(t => t.id !== id));
            toast.success("Tarefa excluída");
        } catch (error) {
            toast.error("Erro ao excluir tarefa");
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-rose-500';
            case 'normal': return 'bg-amber-500';
            case 'low': return 'bg-emerald-500';
            default: return 'bg-slate-500';
        }
    };

    const filterTasksByView = () => {
        const now = new Date();
        const today = format(now, "yyyy-MM-dd");
        const tomorrow = format(addDays(now, 1), "yyyy-MM-dd");
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

        switch (activeView) {
            case "hoje":
                return tasks.filter(t => 
                    (t.due_date === today) || 
                    (t.due_date < today && t.status === 'pending')
                );
            case "amanha":
                return tasks.filter(t => t.due_date === tomorrow);
            case "semana":
                return tasks.filter(t => {
                    const date = parseISO(t.due_date);
                    return isWithinInterval(date, { start: weekStart, end: weekEnd });
                });
            case "todas":
                return tasks;
            default:
                return tasks;
        }
    };

    const filteredTasks = filterTasksByView();
    
    // Grouping by Project
    const groupedTasks = filteredTasks.reduce((acc: { [key: string]: Task[] }, task) => {
        const project = task.project_name || "Geral";
        if (!acc[project]) acc[project] = [];
        acc[project].push(task);
        return acc;
    }, {});

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter text-luxury shimmer-gold uppercase">CRM de Tarefas</h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mt-2 opacity-60">Operação & Planejamento Estratégico</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <Tabs value={activeView} onValueChange={setActiveView} className="bg-white/5 border border-white/10 p-1 rounded-2xl h-12 shadow-inner">
                        <TabsList className="bg-transparent h-full">
                            <TabsTrigger value="hoje" className="px-5 h-full rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white font-black uppercase text-[9px] tracking-widest transition-all">Hoje</TabsTrigger>
                            <TabsTrigger value="amanha" className="px-5 h-full rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white font-black uppercase text-[9px] tracking-widest transition-all">Amanhã</TabsTrigger>
                            <TabsTrigger value="semana" className="px-5 h-full rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white font-black uppercase text-[9px] tracking-widest transition-all">Semana</TabsTrigger>
                            <TabsTrigger value="todas" className="px-5 h-full rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white font-black uppercase text-[9px] tracking-widest transition-all">Todas</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {userRole === 'admin' && (
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="h-12 px-8 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all hover:scale-105 active:scale-95 gap-2">
                                    <Plus className="h-4 w-4" />
                                    Nova Tarefa
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="glass-card border-white/10 text-white max-w-lg rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
                                <div className="bg-primary p-8 text-primary-foreground">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Planejar Atividade</DialogTitle>
                                        <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest mt-1">Defina metas e responsabilidades</p>
                                    </DialogHeader>
                                </div>
                                <form onSubmit={handleCreateTask} className="p-8 space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Projeto / Ambiente</Label>
                                        <div className="relative">
                                            <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-50" />
                                            <Input 
                                                placeholder="Ex: Closet de Karol, Cozinha Gourmet..." 
                                                value={newProject}
                                                onChange={(e) => setNewProject(e.target.value)}
                                                className="bg-white/5 border-white/10 rounded-xl h-12 pl-12 font-bold"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Título da Tarefa</Label>
                                        <Input 
                                            placeholder="O que precisa ser feito?" 
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                            className="bg-white/5 border-white/10 rounded-xl h-12 font-bold"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data de Execução</Label>
                                            <Input 
                                                type="date"
                                                value={newDueDate}
                                                onChange={(e) => setNewDueDate(e.target.value)}
                                                className="bg-white/5 border-white/10 rounded-xl h-12 font-bold text-white [color-scheme:dark]"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Prioridade</Label>
                                            <Select value={newPriority} onValueChange={setNewPriority}>
                                                <SelectTrigger className="bg-white/5 border-white/10 rounded-xl h-12">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-white/10">
                                                    <SelectItem value="low">Baixa</SelectItem>
                                                    <SelectItem value="normal">Normal</SelectItem>
                                                    <SelectItem value="high">Alta</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Atribuir a</Label>
                                        <Select value={newAssignedTo} onValueChange={setNewAssignedTo}>
                                            <SelectTrigger className="bg-white/5 border-white/10 rounded-xl h-12">
                                                <SelectValue placeholder="Selecione um funcionário" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/10">
                                                <SelectItem value="all">Equipe Inteira</SelectItem>
                                                {profiles.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.role === 'admin' ? 'Administrador' : `Colaborador (${p.id.slice(0,4)})`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Detalhes (Opcional)</Label>
                                        <Textarea 
                                            placeholder="Instruções adicionais..." 
                                            value={newDescription}
                                            onChange={(e) => setNewDescription(e.target.value)}
                                            className="bg-white/5 border-white/10 rounded-xl min-h-[100px] font-medium"
                                        />
                                    </div>

                                    <Button type="submit" className="w-full bg-primary hover:bg-primary/80 text-white font-black h-14 rounded-2xl mt-4 uppercase tracking-widest text-sm shadow-xl shadow-primary/20">
                                        Lançar no Sistema
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            {/* Tasks Container */}
            <div className="space-y-12">
                {loading ? (
                    <div className="py-20 flex justify-center">
                        <div className="relative">
                            <div className="h-16 w-16 rounded-full border-4 border-primary/20 animate-pulse" />
                            <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-t-4 border-primary animate-spin" />
                        </div>
                    </div>
                ) : Object.keys(groupedTasks).length === 0 ? (
                    <div className="py-32 text-center glass-card rounded-[3rem] border-dashed border-2 border-white/5 max-w-2xl mx-auto">
                        <CheckCircle2 className="h-20 w-20 text-primary opacity-10 mx-auto mb-6" />
                        <h3 className="text-xl font-black text-luxury uppercase tracking-widest mb-2">Tudo em dia!</h3>
                        <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Nenhuma atividade pendente para este período</p>
                    </div>
                ) : (
                    Object.entries(groupedTasks).map(([project, projectTasks]) => (
                        <div key={project} className="space-y-6">
                            <div className="flex items-center gap-4 group">
                                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-lg">
                                    <LayoutGrid className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-luxury uppercase tracking-tight group-hover:text-primary transition-colors">{project}</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Badge variant="outline" className="text-[8px] font-black uppercase border-white/10 text-muted-foreground">
                                            {projectTasks.length} {projectTasks.length === 1 ? 'ATIVIDADE' : 'ATIVIDADES'}
                                        </Badge>
                                        <div className="h-1 w-1 rounded-full bg-white/20" />
                                        <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Organizado por Projeto</span>
                                    </div>
                                </div>
                                <div className="flex-1 h-[1px] bg-gradient-to-r from-white/10 to-transparent ml-4" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {projectTasks.map((task) => (
                                    <Card 
                                        key={task.id} 
                                        className={cn(
                                            "glass-card border-white/5 transition-all duration-500 group/card relative overflow-hidden rounded-[2.5rem]",
                                            task.status === 'completed' ? 'opacity-50 grayscale' : 'hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1'
                                        )}
                                    >
                                        <div className={cn(
                                            "absolute top-0 left-0 w-1.5 h-full transition-all duration-500",
                                            getPriorityColor(task.priority),
                                            task.status === 'completed' && 'bg-slate-500'
                                        )} />

                                        <CardHeader className="pb-4 pt-8 px-8 flex flex-row items-start justify-between space-y-0">
                                            <div className="flex items-center gap-4">
                                                <button 
                                                    onClick={() => handleToggleStatus(task)}
                                                    className="relative flex items-center justify-center group/check"
                                                >
                                                    {task.status === 'completed' ? (
                                                        <div className="h-7 w-7 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                                                            <CheckCircle2 className="h-5 w-5" />
                                                        </div>
                                                    ) : (
                                                        <div className="h-7 w-7 rounded-xl border-2 border-white/20 flex items-center justify-center text-transparent group-hover/check:border-primary group-hover/check:bg-primary/10 transition-all">
                                                            <Circle className="h-4 w-4" />
                                                        </div>
                                                    )}
                                                </button>
                                                <div className="space-y-1.5">
                                                    <CardTitle className={cn(
                                                        "text-[15px] font-black tracking-tight text-white leading-tight uppercase",
                                                        task.status === 'completed' && 'line-through text-muted-foreground'
                                                    )}>
                                                        {task.title}
                                                    </CardTitle>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-widest">{task.priority === 'high' ? 'Crítico' : task.priority === 'normal' ? 'Padrão' : 'Baixo'}</span>
                                                        <div className="h-1 w-1 rounded-full bg-white/10" />
                                                        <span className="text-[8px] font-black text-primary uppercase tracking-widest">Atividade</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {userRole === 'admin' && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-rose-500/30 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                                    onClick={() => handleDeleteTask(task.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </CardHeader>

                                        <CardContent className="px-8 pb-8 space-y-6">
                                            {task.description && (
                                                <p className="text-[11px] text-white/50 font-bold leading-relaxed">
                                                    {task.description}
                                                </p>
                                            )}
                                            
                                            <div className="pt-6 border-t border-white/5 flex flex-col gap-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-6 rounded-lg bg-white/5 flex items-center justify-center">
                                                            <UserIcon className="h-3 w-3 text-muted-foreground" />
                                                        </div>
                                                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                                                            {task.assigned_to ? 'Responsável' : 'Equipe BJL'}
                                                        </span>
                                                    </div>
                                                    <span className="text-[9px] font-black text-white/80 uppercase">
                                                        {task.assigned_to ? `ID: ${task.assigned_to.slice(0,6)}` : 'Geral'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-6 rounded-lg bg-white/5 flex items-center justify-center">
                                                            <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                                                        </div>
                                                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Prazo</span>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className={cn(
                                                            "text-[10px] font-black uppercase tracking-tighter",
                                                            isToday(parseISO(task.due_date)) ? "text-primary" : 
                                                            isTomorrow(parseISO(task.due_date)) ? "text-amber-500" : "text-white/80"
                                                        )}>
                                                            {isToday(parseISO(task.due_date)) ? 'Hoje' : 
                                                             isTomorrow(parseISO(task.due_date)) ? 'Amanhã' : 
                                                             format(parseISO(task.due_date), "dd 'de' MMMM", { locale: ptBR })}
                                                        </span>
                                                        <span className="text-[8px] font-bold text-muted-foreground/30 uppercase">{format(parseISO(task.due_date), "EEEE", { locale: ptBR })}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {task.completed_at && (
                                                <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-2 rounded-2xl border border-emerald-500/20">
                                                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">
                                                        Entregue em {format(new Date(task.completed_at), "dd/MM 'às' HH:mm")}
                                                    </span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Tarefas;
