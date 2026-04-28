import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Calendar as CalendarIcon, User as UserIcon, CheckCircle2, Circle, LayoutGrid, ChevronRight, Filter, ChevronDown, ChevronUp, Send, Pencil } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { useSales } from "@/hooks/useSales";

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
    environment_name: string | null;
    due_date: string;
    order_index?: number;
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
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    // Form state
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newProject, setNewProject] = useState("");
    const [newEnvironment, setNewEnvironment] = useState("");
    const [newDueDate, setNewDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [newAssignedTo, setNewAssignedTo] = useState<string | "all">("all");
    const [newPriority, setNewPriority] = useState("normal");

    const [activeView, setActiveView] = useState("hoje");
    const { sales } = useSales();

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
            .order('project_name', { ascending: true })
            .order('environment_name', { ascending: true });

        if (error) {
            toast.error("Erro ao carregar tarefas");
            return;
        }

        const today = format(new Date(), "yyyy-MM-dd");
        
        const tasksToUpdate = (data || []).filter(t => t.status === 'pending' && t.due_date < today);
        
        if (tasksToUpdate.length > 0) {
            // Fire background update
            Promise.all(
                tasksToUpdate.map(t => 
                    supabase.from('tasks').update({ due_date: today }).eq('id', t.id)
                )
            ).catch(err => console.error("Error updating overdue tasks:", err));
            
            // Optimistically update local data
            const updatedData = (data || []).map(t => {
                if (t.status === 'pending' && t.due_date < today) {
                    return { ...t, due_date: today };
                }
                return t;
            });
            setTasks(updatedData);
        } else {
            setTasks(data || []);
        }
    };

    const resetForm = () => {
        setEditingTask(null);
        setNewTitle("");
        setNewDescription("");
        setNewProject("");
        setNewEnvironment("");
        setNewDueDate(format(new Date(), "yyyy-MM-dd"));
        setNewAssignedTo("all");
        setNewPriority("normal");
    };

    const handleEditClick = (task: Task) => {
        setEditingTask(task);
        setNewTitle(task.title);
        setNewDescription(task.description || "");
        setNewProject(task.project_name || "");
        setNewEnvironment(task.environment_name || "");
        setNewDueDate(task.due_date);
        setNewAssignedTo(task.assigned_to || "all");
        setNewPriority(task.priority);
        setIsDialogOpen(true);
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
                environment_name: newEnvironment || "Geral",
                due_date: newDueDate,
                assigned_to: newAssignedTo === "all" ? null : newAssignedTo,
                priority: newPriority,
                created_by: user.id,
                status: editingTask ? editingTask.status : 'pending'
            };

            if (editingTask) {
                const { error } = await supabase.from('tasks').update(taskData).eq('id', editingTask.id);
                if (error) throw error;
                toast.success("Tarefa atualizada com sucesso!");
            } else {
                const { error } = await supabase.from('tasks').insert([taskData]);
                if (error) throw error;
                toast.success("Tarefa criada com sucesso!");
            }

            setIsDialogOpen(false);
            resetForm();
            fetchTasks();
        } catch (error) {
            console.error("Error saving task:", error);
            toast.error("Erro ao salvar tarefa");
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
    
    const groupedTasks = filteredTasks.reduce((acc: { [key: string]: Task[] }, task) => {
        const key = `${task.project_name || "Geral"} - ${task.environment_name || "Geral"}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(task);
        return acc;
    }, {});

    const QuickAddTask = ({ project, environment, defaultDate, onCreated }: { project: string, environment: string, defaultDate: string, onCreated: () => void }) => {
        const [title, setTitle] = useState("");
        const [dueDate, setDueDate] = useState(defaultDate);
        const [isSubmitting, setIsSubmitting] = useState(false);

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!title.trim() || isSubmitting) return;

            setIsSubmitting(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const taskData = {
                    title: title,
                    project_name: project,
                    environment_name: environment,
                    due_date: dueDate,
                    created_by: user.id,
                    status: 'pending',
                    priority: 'normal'
                };

                const { error } = await supabase.from('tasks').insert([taskData]);
                if (error) throw error;

                setTitle("");
                onCreated();
            } catch (error) {
                toast.error("Erro ao adicionar tarefa rápida");
            } finally {
                setIsSubmitting(false);
            }
        };

        return (
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 bg-white/5 p-2 rounded-xl border border-white/5 focus-within:border-primary/50 transition-all">
                <div className="flex items-center gap-2 px-1">
                    <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                    <Input 
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="bg-transparent border-none h-6 p-0 text-xs w-28 focus-visible:ring-0 text-muted-foreground [color-scheme:dark] shadow-none"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Input 
                        placeholder="Nova tarefa..." 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="bg-transparent border-none h-8 text-sm font-bold focus-visible:ring-0 placeholder:text-muted-foreground/30 flex-1 px-1"
                    />
                    <Button type="submit" size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg shrink-0" disabled={!title.trim() || isSubmitting}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </form>
        );
    };

    const SortableTaskItem = ({ task, onEdit, onToggleStatus, onDelete }: any) => {
        const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
        
        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
        };

        return (
            <div ref={setNodeRef} style={style} className="flex items-start gap-3 group/item bg-transparent relative z-10">
                <div {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing opacity-30 hover:opacity-100 flex items-center justify-center shrink-0">
                    <LayoutGrid className="h-3 w-3 text-white" />
                </div>
                <button 
                    onClick={() => onToggleStatus(task)}
                    className="mt-0.5 h-4 w-4 rounded-md border border-white/20 flex items-center justify-center hover:border-primary transition-all shrink-0"
                >
                    <Circle className="h-2.5 w-2.5 text-transparent group-hover/item:text-primary/40" />
                </button>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white/90 leading-snug break-words">{task.title}</p>
                </div>
                <button 
                    onClick={() => onEdit(task)}
                    className="opacity-0 group-hover/item:opacity-100 h-4 w-4 text-blue-500/40 hover:text-blue-500 transition-all shrink-0 mr-1"
                >
                    <Pencil className="h-3 w-3" />
                </button>
                <button 
                    onClick={() => onDelete(task.id)}
                    className="opacity-0 group-hover/item:opacity-100 h-4 w-4 text-rose-500/40 hover:text-rose-500 transition-all shrink-0"
                >
                    <Trash2 className="h-3 w-3" />
                </button>
            </div>
        );
    };

    const TaskCard = ({ title, tasks, onUpdate, onEdit }: { title: string, tasks: Task[], onUpdate: () => void, onEdit: (task: Task) => void }) => {
        const [showCompleted, setShowCompleted] = useState(false);
        const [pendingTasks, setPendingTasks] = useState(() => 
            tasks.filter(t => t.status === 'pending').sort((a,b) => (a.order_index || 0) - (b.order_index || 0))
        );
        const completedTasks = tasks.filter(t => t.status === 'completed');
        const [projectName, environmentName] = title.split(' - ');
        
        useEffect(() => {
            setPendingTasks(tasks.filter(t => t.status === 'pending').sort((a,b) => (a.order_index || 0) - (b.order_index || 0)));
        }, [tasks]);

        const defaultDate = pendingTasks.length > 0 ? pendingTasks[0].due_date : format(new Date(), "yyyy-MM-dd");

        const sensors = useSensors(
            useSensor(PointerSensor),
            useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
        );

        const handleDragEnd = (event: any) => {
            const { active, over } = event;
            if (over && active.id !== over.id) {
                setPendingTasks((items) => {
                    const oldIndex = items.findIndex((i) => i.id === active.id);
                    const newIndex = items.findIndex((i) => i.id === over.id);
                    const newItems = arrayMove(items, oldIndex, newIndex);
                    
                    const updates = newItems.map((item, index) => ({
                        id: item.id,
                        order_index: index
                    }));
                    
                    Promise.all(updates.map(u => 
                        supabase.from('tasks').update({ order_index: u.order_index }).eq('id', u.id)
                    )).catch(e => console.log('Error updating order', e));

                    return newItems;
                });
            }
        };

        return (
            <Card className="glass-card border-white/5 rounded-[2rem] overflow-hidden flex flex-col h-full hover:border-primary/20 transition-all group/card">
                <CardHeader className="p-6 pb-2">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <h3 className="text-base font-black text-white/90 uppercase tracking-tight">{title}</h3>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                <CalendarIcon className="h-2.5 w-2.5" />
                                {format(new Date(), "dd/MM/yyyy")}
                            </p>
                        </div>
                        <LayoutGrid className="h-4 w-4 text-primary/40 group-hover/card:text-primary transition-colors" />
                    </div>
                </CardHeader>
                
                <CardContent className="p-6 pt-2 flex-1 flex flex-col">
                    <div className="space-y-2 flex-1">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={pendingTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                {pendingTasks.map(task => (
                                    <SortableTaskItem 
                                        key={task.id} 
                                        task={task} 
                                        onEdit={onEdit}
                                        onToggleStatus={handleToggleStatus}
                                        onDelete={handleDeleteTask}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>

                        {completedTasks.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/5">
                                <button 
                                    onClick={() => setShowCompleted(!showCompleted)}
                                    className="flex items-center gap-2 text-xs font-black text-muted-foreground/50 uppercase tracking-widest hover:text-muted-foreground transition-colors"
                                >
                                    {showCompleted ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                    {completedTasks.length} {completedTasks.length === 1 ? 'item concluído' : 'itens concluídos'}
                                </button>
                                
                                {showCompleted && (
                                    <div className="mt-2 space-y-2">
                                        {completedTasks.map(task => (
                                            <div key={task.id} className="flex items-start gap-3 opacity-40">
                                                <button 
                                                    onClick={() => handleToggleStatus(task)}
                                                    className="mt-0.5 h-4 w-4 rounded-md bg-emerald-500 flex items-center justify-center text-white shrink-0"
                                                >
                                                    <CheckCircle2 className="h-3 w-3" />
                                                </button>
                                                <p className="text-sm font-bold text-white line-through leading-snug break-words">{task.title}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <QuickAddTask 
                        project={projectName} 
                        environment={environmentName} 
                        defaultDate={defaultDate}
                        onCreated={onUpdate} 
                    />
                </CardContent>
            </Card>
        );
    };

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
                        <Dialog open={isDialogOpen} onOpenChange={(open) => {
                            if (!open) resetForm();
                            setIsDialogOpen(open);
                        }}>
                            <DialogTrigger asChild>
                                <Button className="h-12 px-8 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all hover:scale-105 active:scale-95 gap-2">
                                    <Plus className="h-4 w-4" />
                                    Nova Tarefa
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="glass-card border-white/10 text-white max-w-lg rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
                                <div className="bg-primary p-8 text-primary-foreground">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
                                            {editingTask ? "Editar Atividade" : "Planejar Atividade"}
                                        </DialogTitle>
                                        <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest mt-1">Defina metas e responsabilidades</p>
                                    </DialogHeader>
                                </div>
                                <form onSubmit={handleCreateTask} className="p-8 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Projeto</Label>
                                            <div className="relative">
                                                <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-50" />
                                                <Input 
                                                    placeholder="Ex: Edifício Solar" 
                                                    value={newProject}
                                                    onChange={(e) => setNewProject(e.target.value)}
                                                    className="bg-white/5 border-white/10 rounded-xl h-12 pl-12 font-bold"
                                                    list="project-suggestions"
                                                />
                                                <datalist id="project-suggestions">
                                                    {Array.from(new Set(sales.map(s => s.clientName))).map(name => (
                                                        <option key={name} value={name} />
                                                    ))}
                                                </datalist>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Ambiente</Label>
                                            <div className="relative">
                                                <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-50" />
                                                <Input 
                                                    placeholder="Ex: Closet Carol" 
                                                    value={newEnvironment}
                                                    onChange={(e) => setNewEnvironment(e.target.value)}
                                                    className="bg-white/5 border-white/10 rounded-xl h-12 pl-12 font-bold"
                                                />
                                            </div>
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
                                        {editingTask ? "Salvar Alterações" : "Lançar no Sistema"}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Object.entries(groupedTasks).map(([key, tasks]) => (
                            <TaskCard 
                                key={key} 
                                title={key} 
                                tasks={tasks} 
                                onUpdate={fetchTasks} 
                                onEdit={handleEditClick}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Tarefas;
