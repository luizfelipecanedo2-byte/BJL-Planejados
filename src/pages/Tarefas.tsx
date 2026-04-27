import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Calendar as CalendarIcon, User as UserIcon, CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    const [newAssignedTo, setNewAssignedTo] = useState<string | "all">("all");
    const [newPriority, setNewPriority] = useState("normal");

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
            .order('created_at', { ascending: false });

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
        
        // Profiles table might not have emails, so we just use IDs for now
        // or we could fetch them if we have access to auth.users (usually restricted)
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter text-luxury shimmer-gold uppercase">Tarefas Diárias</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Gerenciamento de atividades e metas</p>
                </div>
                
                {userRole === 'admin' && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 bg-primary hover:bg-primary/80 text-white font-bold rounded-xl shadow-lg shadow-primary/20">
                                <Plus className="h-4 w-4" />
                                Nova Tarefa
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="glass-card border-white/10 text-white">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black uppercase tracking-tighter text-luxury">Criar Nova Tarefa</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreateTask} className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Título</Label>
                                    <Input 
                                        placeholder="Ex: Limpar bancada, Organizar estoque..." 
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        className="bg-white/5 border-white/10 rounded-xl"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Descrição (Opcional)</Label>
                                    <Textarea 
                                        placeholder="Detalhes da tarefa..." 
                                        value={newDescription}
                                        onChange={(e) => setNewDescription(e.target.value)}
                                        className="bg-white/5 border-white/10 rounded-xl min-h-[100px]"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Atribuir a</Label>
                                        <Select value={newAssignedTo} onValueChange={setNewAssignedTo}>
                                            <SelectTrigger className="bg-white/5 border-white/10 rounded-xl">
                                                <SelectValue placeholder="Selecione um funcionário" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/10">
                                                <SelectItem value="all">Todos</SelectItem>
                                                {profiles.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.role === 'admin' ? 'Admin' : `Colaborador (${p.id.slice(0,4)})`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Prioridade</Label>
                                        <Select value={newPriority} onValueChange={setNewPriority}>
                                            <SelectTrigger className="bg-white/5 border-white/10 rounded-xl">
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
                                <Button type="submit" className="w-full bg-primary hover:bg-primary/80 text-white font-bold h-12 rounded-xl mt-4">
                                    Salvar Tarefa
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-12 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="col-span-full py-20 text-center glass-card rounded-3xl border-dashed border-2 border-white/5">
                        <CheckCircle2 className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                        <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">Nenhuma tarefa pendente</p>
                    </div>
                ) : (
                    tasks.map((task) => (
                        <Card key={task.id} className={`glass-card border-white/5 transition-all duration-300 hover:border-white/10 ${task.status === 'completed' ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                            <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => handleToggleStatus(task)}
                                        className="transition-transform active:scale-90"
                                    >
                                        {task.status === 'completed' ? (
                                            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                        ) : (
                                            <Circle className="h-6 w-6 text-muted-foreground" />
                                        )}
                                    </button>
                                    <div className="space-y-1">
                                        <CardTitle className={`text-lg font-black tracking-tight text-luxury ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                                            {task.title}
                                        </CardTitle>
                                        <Badge className={`${getPriorityColor(task.priority)} text-[8px] font-black uppercase tracking-widest px-1.5 py-0`}>
                                            {task.priority === 'high' ? 'Alta' : task.priority === 'normal' ? 'Normal' : 'Baixa'}
                                        </Badge>
                                    </div>
                                </div>
                                {userRole === 'admin' && (
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg"
                                        onClick={() => handleDeleteTask(task.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {task.description && (
                                    <p className="text-xs text-white/60 font-medium leading-relaxed">
                                        {task.description}
                                    </p>
                                )}
                                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                        <UserIcon className="h-3 w-3" />
                                        <span>{task.assigned_to ? 'Atribuída' : 'Todos'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                        <CalendarIcon className="h-3 w-3" />
                                        <span>{format(new Date(task.created_at), "dd 'de' MMM", { locale: ptBR })}</span>
                                    </div>
                                </div>
                                {task.completed_at && (
                                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500 flex items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded-md w-fit">
                                        Concluída em {format(new Date(task.completed_at), "dd/MM HH:mm")}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default Tarefas;
