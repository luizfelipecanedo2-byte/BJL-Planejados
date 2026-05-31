import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Calendar as CalendarIcon, User as UserIcon, CheckCircle2, Circle, LayoutGrid, ChevronRight, Filter, ChevronDown, ChevronUp, Send, Pencil, CalendarRange, Check, Sparkles, AlertCircle, ListTodo } from "lucide-react";
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
import { AnimatedCounter } from "@/components/ui/animated-counter";

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

// Helper para verificar visibilidade da tarefa na aba ativa
const checkTaskVisibility = (dueDate: string, status: string, activeView: string) => {
    const now = new Date();
    const today = format(now, "yyyy-MM-dd");
    const tomorrow = format(addDays(now, 1), "yyyy-MM-dd");
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    switch (activeView) {
        case "hoje":
            return (dueDate === today) || (dueDate < today && status === 'pending');
        case "amanha":
            return dueDate === tomorrow;
        case "semana":
            try {
                const date = parseISO(dueDate);
                return isWithinInterval(date, { start: weekStart, end: weekEnd });
            } catch (e) {
                return false;
            }
        case "todas":
            return true;
        default:
            return true;
    }
};

const Tarefas = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [serviceOrders, setServiceOrders] = useState<any[]>([]);
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
    const isAdmin = userRole === 'admin';

    // Weekly Planner State
    const [isPlannerOpen, setIsPlannerOpen] = useState(false);
    const [plannerStep, setPlannerStep] = useState<1 | 2>(1);
    const [plannerFocusProjects, setPlannerFocusProjects] = useState<string[]>([]);
    const [plannerCustomProject, setPlannerCustomProject] = useState("");
    const [plannerTasks, setPlannerTasks] = useState<Array<{
        id: string;
        dayIndex: number;
        project: string;
        environment: string;
        title: string;
        priority: string;
    }>>([]);

    const [tempProject, setTempProject] = useState("");
    const [tempEnvironment, setTempEnvironment] = useState("");
    const [tempTitle, setTempTitle] = useState("");
    const [tempPriority, setTempPriority] = useState("normal");
    const [activePlannerDayIndex, setActivePlannerDayIndex] = useState(0);

    useEffect(() => {
        if (plannerFocusProjects.length > 0 && !plannerFocusProjects.includes(tempProject)) {
            setTempProject(plannerFocusProjects[0]);
        }
    }, [plannerFocusProjects]);

    useEffect(() => {
        const activeProj = tempProject || plannerFocusProjects[0] || "";
        if (activeProj) {
            const match = activeProj.match(/\(([^)]+)\)$/);
            if (match) {
                setTempEnvironment(match[1]);
            } else {
                setTempEnvironment("");
            }
        } else {
            setTempEnvironment("");
        }
    }, [tempProject, plannerFocusProjects]);

    const getNextWeekDays = () => {
        const today = new Date();
        const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
        
        // 0 (Sunday) -> +1
        // 1 (Monday) -> +0 (plan current week)
        // 2-6 (Tue-Sat) -> 8 - currentDay (plan next week)
        const daysToMonday = currentDay === 0 ? 1 : (currentDay === 1 ? 0 : 8 - currentDay);
        
        const dayNames = [
            "Segunda-feira",
            "Terça-feira",
            "Quarta-feira",
            "Quinta-feira",
            "Sexta-feira",
            "Sábado"
        ];

        return dayNames.map((name, index) => {
            const d = new Date(today);
            d.setDate(today.getDate() + daysToMonday + index);
            const labelRaw = format(d, "EEEE (dd/MM)", { locale: ptBR });
            const label = labelRaw.charAt(0).toUpperCase() + labelRaw.slice(1);
            return {
                name,
                dateStr: format(d, "yyyy-MM-dd"),
                label,
                shortLabel: format(d, "dd/MM")
            };
        });
    };

    const handleAddPlannerTask = () => {
        if (!tempTitle.trim()) {
            toast.error("Por favor, digite o título da tarefa.");
            return;
        }
        
        const proj = tempProject || plannerFocusProjects[0] || "Geral";
        const env = tempEnvironment.trim() || "Geral";

        const newTask = {
            id: Math.random().toString(36).substring(2, 9),
            dayIndex: activePlannerDayIndex,
            project: proj,
            environment: env,
            title: tempTitle.trim(),
            priority: tempPriority
        };

        setPlannerTasks([...plannerTasks, newTask]);
        setTempTitle("");
    };

    const handleSaveWeeklyPlanner = async () => {
        if (plannerTasks.length === 0) {
            toast.error("Nenhuma tarefa planejada para salvar.");
            return;
        }

        try {
            const userId = currentUserId || (await supabase.auth.getSession()).data.session?.user?.id || (await supabase.auth.getUser()).data.user?.id;
            if (!userId) {
                toast.error("Usuário não autenticado. Por favor, faça login.");
                return;
            }

            const weekDays = getNextWeekDays();
            
            const tasksToInsert = plannerTasks.map(t => {
                const day = weekDays[t.dayIndex];
                return {
                    title: t.title,
                    description: "Planejado no assistente semanal",
                    project_name: t.project,
                    environment_name: t.environment,
                    due_date: day.dateStr,
                    priority: t.priority,
                    created_by: userId,
                    status: 'pending'
                };
            });

            const { error } = await supabase.from('tasks').insert(tasksToInsert);
            
            if (error) throw error;

            toast.success(`Planejamento concluído! ${plannerTasks.length} tarefas criadas.`);
            setIsPlannerOpen(false);
            
            setPlannerStep(1);
            setPlannerFocusProjects([]);
            setPlannerTasks([]);
            
            fetchTasks();
        } catch (err: any) {
            console.error("Erro ao salvar planejamento semanal:", err);
            toast.error(`Erro ao salvar: ${err.message || 'Erro desconhecido'}`);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            let user = session?.user || null;
            if (!user) {
                const { data: { user: gotUser } } = await supabase.auth.getUser();
                user = gotUser;
            }

            if (user) {
                setCurrentUserId(user.id);
                if (user.email === 'luizfelipe.canedo2@gmail.com') {
                    setUserRole('admin');
                } else {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();
                    setUserRole(profile?.role || 'colaborador');
                }
            }

            await Promise.all([fetchTasks(), fetchProfiles(), fetchServiceOrders()]);
        } catch (error) {
            console.error("Error fetching initial data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchServiceOrders = async () => {
        try {
            const { data, error } = await supabase
                .from('service_orders')
                .select('*');
            if (!error && data) {
                setServiceOrders(data);
            }
        } catch (err) {
            console.warn("Erro ao buscar ordens de serviço:", err);
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

        // Também busca as ordens de serviço para manter prazos atualizados
        fetchServiceOrders();

        const today = format(new Date(), "yyyy-MM-dd");
        const tasksToUpdate = (data || []).filter(t => t.status === 'pending' && t.due_date < today);
        
        if (tasksToUpdate.length > 0) {
            // Fire single background update
            supabase.from('tasks')
                .update({ due_date: today })
                .eq('status', 'pending')
                .lt('due_date', today)
                .then(({ error: err }) => {
                    if (err) console.error("Error updating overdue tasks:", err);
                });
            
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
        if (!newTitle.trim()) return;

        try {
            const userId = currentUserId || (await supabase.auth.getSession()).data.session?.user?.id || (await supabase.auth.getUser()).data.user?.id;
            if (!userId) {
                toast.error("Usuário não autenticado. Por favor, faça login novamente.");
                return;
            }

            const cleanProject = (newProject || "Geral").trim();
            const cleanEnvironment = (newEnvironment || "Geral").trim();

            const taskData = {
                title: newTitle.trim(),
                description: newDescription.trim(),
                project_name: cleanProject,
                environment_name: cleanEnvironment,
                due_date: newDueDate,
                assigned_to: newAssignedTo === "all" ? null : newAssignedTo,
                priority: newPriority,
                created_by: userId,
                status: editingTask ? editingTask.status : 'pending'
            };

            const isVisible = checkTaskVisibility(newDueDate, taskData.status, activeView);

            if (editingTask) {
                const { error } = await supabase.from('tasks').update(taskData).eq('id', editingTask.id);
                if (error) throw error;
                
                if (isVisible) {
                    toast.success("Tarefa atualizada com sucesso!");
                } else {
                    toast.success(`Tarefa atualizada! (Nota: Ela não aparece nesta aba pois está agendada para ${format(parseISO(newDueDate), "dd/MM/yyyy")})`);
                }
            } else {
                const { error } = await supabase.from('tasks').insert([taskData]);
                if (error) throw error;
                
                if (isVisible) {
                    toast.success("Tarefa criada com sucesso!");
                } else {
                    toast.success(`Tarefa criada com sucesso! (Nota: Ela não aparece nesta aba pois está agendada para ${format(parseISO(newDueDate), "dd/MM/yyyy")})`);
                }
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
                    try {
                        const date = parseISO(t.due_date);
                        return isWithinInterval(date, { start: weekStart, end: weekEnd });
                    } catch (e) {
                        return false;
                    }
                });
            case "todas":
                return tasks;
            default:
                return tasks;
        }
    };

    // Keep defaultDueDate synced with activeView
    const defaultDueDate = activeView === 'amanha' 
        ? format(addDays(new Date(), 1), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd");

    const filteredTasks = filterTasksByView();
    
    // Grouping robusto (case-insensitive e trim-insensitive nos nomes)
    const groupedTasks = filteredTasks.reduce((acc: { [key: string]: Task[] }, task) => {
        const project = (task.project_name || "Geral").trim();
        const environment = (task.environment_name || "Geral").trim();
        
        const canonicalKey = `${project.toLowerCase()} - ${environment.toLowerCase()}`;
        const existingKey = Object.keys(acc).find(k => k.toLowerCase() === canonicalKey);
        
        if (existingKey) {
            acc[existingKey].push(task);
        } else {
            const formattedKey = `${project} - ${environment}`;
            acc[formattedKey] = [task];
        }
        return acc;
    }, {});

    // Calculations for Tarefas HUD
    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // Today's tasks (including overdue tasks if they are pending, to match the "Hoje" filter)
    const todayTasks = tasks.filter(t => 
        (t.due_date === todayStr) || 
        (t.due_date < todayStr && t.status === 'pending')
    );
    const totalTodayTasks = todayTasks.length;
    const completedTodayTasks = todayTasks.filter(t => t.status === 'completed').length;
    const pendingTodayTasks = totalTodayTasks - completedTodayTasks;

    // Weekly tasks
    const weeklyTasks = tasks.filter(t => {
        try {
            const date = parseISO(t.due_date);
            return isWithinInterval(date, { start: weekStart, end: weekEnd });
        } catch (e) {
            return false;
        }
    });
    const totalWeeklyTasks = weeklyTasks.length;
    const completedWeeklyTasks = weeklyTasks.filter(t => t.status === 'completed').length;

    // All pending tasks
    const totalPendingTasksCount = tasks.filter(t => t.status === 'pending').length;

    // Critical (high priority) pending tasks
    const criticalPendingTasksCount = tasks.filter(t => t.priority === 'high' && t.status === 'pending').length;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h2 className="text-5xl font-black tracking-tighter text-luxury shimmer-gold uppercase leading-none">Gestão de Operações</h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mt-2 opacity-60">Operação & Planejamento Estratégico</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <Tabs value={activeView} onValueChange={setActiveView} className="bg-white/5 border border-white/10 p-1 rounded-2xl h-12 shadow-inner">
                        <TabsList className="bg-transparent h-full">
                            <TabsTrigger value="hoje" className="px-6 h-full rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-widest transition-all">Hoje</TabsTrigger>
                            <TabsTrigger value="amanha" className="px-6 h-full rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-widest transition-all">Amanhã</TabsTrigger>
                            <TabsTrigger value="semana" className="px-6 h-full rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-widest transition-all">Semana</TabsTrigger>
                            <TabsTrigger value="todas" className="px-6 h-full rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-widest transition-all">Todas</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {userRole === 'admin' && (
                        <>
                            <Button 
                                onClick={() => {
                                    setPlannerStep(1);
                                    setPlannerFocusProjects([]);
                                    setPlannerTasks([]);
                                    setIsPlannerOpen(true);
                                }}
                                className="h-12 px-6 bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 gap-2 border border-amber-400/20"
                            >
                                <CalendarRange className="h-4 w-4" />
                                Planejar Semana
                            </Button>

                            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                                if (!open) {
                                    resetForm();
                                } else {
                                    // Sincroniza a data inicial com base na aba ativa ao abrir
                                    const now = new Date();
                                    if (activeView === 'amanha') {
                                        setNewDueDate(format(addDays(now, 1), "yyyy-MM-dd"));
                                    } else {
                                        setNewDueDate(format(now, "yyyy-MM-dd"));
                                    }
                                }
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
                        </>
                    )}
                </div>
            </div>

            {/* Tarefas HUD */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-primary">
                            <ListTodo className="h-32 w-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Tarefas Diárias (Hoje)</p>
                            <h3 className="text-3xl font-black text-primary tracking-tighter flex items-baseline">
                                <AnimatedCounter value={completedTodayTasks} />
                                <span className="text-xl text-muted-foreground font-bold mx-1">/</span>
                                <AnimatedCounter value={totalTodayTasks} />
                                <span className="text-xs font-bold uppercase ml-2 text-muted-foreground">Concluídas</span>
                            </h3>
                            <p className="text-[9px] text-amber-500/80 font-black uppercase tracking-widest mt-1">({pendingTodayTasks} pendentes)</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-amber-500">
                            <CalendarIcon className="h-32 w-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Pendentes</p>
                            <h3 className="text-3xl font-black text-amber-500 tracking-tighter flex items-baseline">
                                <AnimatedCounter value={totalPendingTasksCount} />
                                <span className="text-xs font-bold uppercase ml-2 text-muted-foreground">Atividades</span>
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-emerald-500">
                            <CalendarRange className="h-32 w-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Tarefas da Semana</p>
                            <h3 className="text-3xl font-black text-emerald-500 tracking-tighter flex items-baseline">
                                <AnimatedCounter value={completedWeeklyTasks} />
                                <span className="text-xl text-muted-foreground font-bold mx-1">/</span>
                                <AnimatedCounter value={totalWeeklyTasks} />
                                <span className="text-xs font-bold uppercase ml-2 text-muted-foreground">Metas</span>
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-white/10 backdrop-blur-2xl bg-card/40 shadow-xl overflow-hidden group spotlight-card">
                    <CardContent className="p-6 flex items-center justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-150 transition-transform duration-500 text-rose-500">
                            <AlertCircle className="h-32 w-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Prioridade Crítica</p>
                            <h3 className="text-3xl font-black text-rose-500 tracking-tighter flex items-baseline">
                                <AnimatedCounter value={criticalPendingTasksCount} />
                                <span className="text-xs font-bold uppercase ml-2 text-muted-foreground">Altas</span>
                            </h3>
                        </div>
                    </CardContent>
                </Card>
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
                                serviceOrders={serviceOrders}
                                defaultDueDate={defaultDueDate}
                                currentUserId={currentUserId}
                                activeView={activeView}
                                isAdmin={isAdmin}
                                onUpdate={fetchTasks} 
                                onEdit={handleEditClick}
                                onToggleStatus={handleToggleStatus}
                                onDelete={handleDeleteTask}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modal do Planejador Semanal */}
            <Dialog open={isPlannerOpen} onOpenChange={setIsPlannerOpen}>
                <DialogContent className="glass-card border-white/10 text-white max-w-4xl rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
                    <div className="bg-gradient-to-r from-amber-500 to-amber-700 p-8 text-white relative">
                        <DialogHeader>
                            <DialogTitle className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
                                <CalendarRange className="h-7 w-7" />
                                Planejamento da Semana (Planner de Domingo)
                            </DialogTitle>
                            <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest mt-1">
                                Defina suas prioridades e organize a agenda de execução de forma integrada
                            </p>
                        </DialogHeader>
                    </div>

                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        {plannerStep === 1 ? (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight text-amber-500 mb-1">
                                        Passo 1: Quais projetos você focará esta semana?
                                    </h3>
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                        Selecione os clientes ativos para definir as metas diárias
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {serviceOrders
                                        .filter(o => o.status !== "Entregue e Finalizado" && o.client)
                                        .map((order: any) => {
                                            const projLabel = `${order.ticket_number || "S/N"} - ${order.client}${order.action ? ` (${order.action})` : ""}`;
                                            const isSelected = plannerFocusProjects.includes(projLabel);
                                            return (
                                                <button
                                                    key={order.id}
                                                    type="button"
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setPlannerFocusProjects(plannerFocusProjects.filter(p => p !== projLabel));
                                                        } else {
                                                            setPlannerFocusProjects([...plannerFocusProjects, projLabel]);
                                                        }
                                                    }}
                                                    className={cn(
                                                        "p-4 rounded-2xl border text-left transition-all duration-300 font-bold text-xs uppercase tracking-wider flex items-center justify-between",
                                                        isSelected 
                                                            ? "bg-amber-500/10 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                                                            : "bg-white/[0.02] border-white/10 hover:bg-white/[0.05] text-white/70"
                                                    )}
                                                >
                                                    <span className="truncate mr-2">{projLabel}</span>
                                                    <div className={cn(
                                                        "h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                                                        isSelected ? "border-amber-500 bg-amber-500 text-black" : "border-white/30"
                                                    )}>
                                                        {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                </div>

                                <div className="space-y-2 pt-3 border-t border-white/5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                        Adicionar outro projeto/cliente
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Ex: Reforma Cozinha Maria"
                                            value={plannerCustomProject}
                                            onChange={(e) => setPlannerCustomProject(e.target.value)}
                                            className="bg-white/5 border-white/10 rounded-xl h-12 font-bold"
                                        />
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                if (plannerCustomProject.trim()) {
                                                    const cleanProj = plannerCustomProject.trim();
                                                    if (!plannerFocusProjects.includes(cleanProj)) {
                                                        setPlannerFocusProjects([...plannerFocusProjects, cleanProj]);
                                                    }
                                                    setPlannerCustomProject("");
                                                }
                                            }}
                                            className="h-12 bg-white/10 hover:bg-white/20 border border-white/10 font-bold uppercase text-[10px] px-6 rounded-xl shrink-0"
                                        >
                                            Adicionar Foco
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-6 border-t border-white/5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        {plannerFocusProjects.length} projeto(s) selecionado(s)
                                    </p>
                                    <Button
                                        type="button"
                                        disabled={plannerFocusProjects.length === 0}
                                        onClick={() => setPlannerStep(2)}
                                        className="bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-widest text-xs h-12 px-8 rounded-xl shadow-lg"
                                    >
                                        Próximo: Planejar Dias
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight text-amber-500 mb-1">
                                        Passo 2: Defina as atividades de cada dia
                                    </h3>
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                        As datas reais serão calculadas e vinculadas automaticamente
                                    </p>
                                </div>

                                <div className="flex flex-col lg:flex-row gap-6">
                                    {/* Abas dos Dias */}
                                    <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-2 pb-2 lg:pb-0 lg:w-48 shrink-0 border-b lg:border-b-0 lg:border-r border-white/5 pr-0 lg:pr-4">
                                        {getNextWeekDays().map((day, idx) => {
                                            const isSelected = activePlannerDayIndex === idx;
                                            const dayTasksCount = plannerTasks.filter(t => t.dayIndex === idx).length;

                                            return (
                                                <button
                                                    key={day.name}
                                                    type="button"
                                                    onClick={() => {
                                                        setActivePlannerDayIndex(idx);
                                                        setTempTitle("");
                                                    }}
                                                    className={cn(
                                                        "px-4 py-3 rounded-xl text-left font-black uppercase text-[10px] tracking-wider transition-all flex items-center justify-between gap-3 shrink-0 lg:w-full",
                                                        isSelected
                                                            ? "bg-amber-500 text-black font-black shadow-lg"
                                                            : "bg-white/5 hover:bg-white/10 text-white/70"
                                                    )}
                                                >
                                                    <div className="flex flex-col text-left">
                                                        <span>{day.name.split("-")[0]}</span>
                                                        <span className={cn(
                                                            "text-[8px] font-bold opacity-60",
                                                            isSelected ? "text-black" : "text-slate-400"
                                                        )}>{day.shortLabel}</span>
                                                    </div>
                                                    {dayTasksCount > 0 && (
                                                        <span className={cn(
                                                            "text-[9px] px-2 py-0.5 rounded-full font-black",
                                                            isSelected ? "bg-black text-amber-500" : "bg-amber-500/25 text-amber-400"
                                                        )}>
                                                            {dayTasksCount}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Área de Criação de Tarefas no Dia Selecionado */}
                                    <div className="flex-1 space-y-6">
                                        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl space-y-4">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-amber-500 flex items-center gap-1.5">
                                                <Sparkles className="h-3.5 w-3.5" />
                                                Planejar para {getNextWeekDays()[activePlannerDayIndex].label}
                                            </h4>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                        Projeto Foco
                                                    </Label>
                                                    <Select
                                                        value={tempProject || plannerFocusProjects[0] || ""}
                                                        onValueChange={setTempProject}
                                                    >
                                                        <SelectTrigger className="bg-white/5 border-white/10 rounded-xl h-10 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-slate-900 border-white/10 text-xs font-bold uppercase">
                                                            {plannerFocusProjects.map(p => (
                                                                <SelectItem key={p} value={p}>{p}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                        Ambiente/Cômodo
                                                    </Label>
                                                    <Input
                                                        placeholder="Ex: Cozinha, Quarto Casal"
                                                        value={tempEnvironment}
                                                        onChange={(e) => setTempEnvironment(e.target.value)}
                                                        className="bg-white/5 border-white/10 rounded-xl h-10 text-xs font-bold"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                                                <div className="sm:col-span-2 space-y-1.5">
                                                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                        O que será feito neste dia?
                                                    </Label>
                                                    <Input
                                                        placeholder="Ex: Finalizar montagem das portas"
                                                        value={tempTitle}
                                                        onChange={(e) => setTempTitle(e.target.value)}
                                                        className="bg-white/5 border-white/10 rounded-xl h-10 text-xs font-bold"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                        Prioridade
                                                    </Label>
                                                    <Select value={tempPriority} onValueChange={setTempPriority}>
                                                        <SelectTrigger className="bg-white/5 border-white/10 rounded-xl h-10 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-slate-900 border-white/10 text-xs">
                                                            <SelectItem value="low">Baixa</SelectItem>
                                                            <SelectItem value="normal">Normal</SelectItem>
                                                            <SelectItem value="high">Alta</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <Button
                                                    type="button"
                                                    onClick={handleAddPlannerTask}
                                                    className="h-10 bg-amber-500 hover:bg-amber-600 text-black font-black uppercase text-[10px] tracking-wider rounded-xl gap-1 shadow-lg shadow-amber-500/10"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    Lançar
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Lista de Atividades do Dia Atual */}
                                        <div className="space-y-3">
                                            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">
                                                Atividades Agendadas para o Dia
                                            </div>

                                            <div className="space-y-2">
                                                {plannerTasks.filter(t => t.dayIndex === activePlannerDayIndex).map(t => (
                                                    <div
                                                        key={t.id}
                                                        className="flex items-center justify-between gap-4 p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-all"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-[8px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                                                    {t.project}
                                                                </span>
                                                                <span className="text-[8px] font-black uppercase tracking-wider text-white/40">
                                                                    {t.environment}
                                                                </span>
                                                                <span className={cn(
                                                                    "h-1.5 w-1.5 rounded-full shrink-0",
                                                                    t.priority === "high" ? "bg-rose-500" :
                                                                    t.priority === "normal" ? "bg-amber-500" : "bg-emerald-500"
                                                                )} />
                                                            </div>
                                                            <p className="text-xs font-bold text-white leading-tight truncate">
                                                                {t.title}
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPlannerTasks(plannerTasks.filter(item => item.id !== t.id))}
                                                            className="h-8 w-8 flex items-center justify-center text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {plannerTasks.filter(t => t.dayIndex === activePlannerDayIndex).length === 0 && (
                                                    <div className="text-center py-6 text-[10px] text-muted-foreground uppercase font-bold tracking-widest border border-dashed border-white/5 rounded-2xl italic">
                                                        Nenhuma tarefa adicionada para este dia.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-6 border-t border-white/5">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setPlannerStep(1)}
                                        className="h-12 border-white/10 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest px-6 rounded-xl"
                                    >
                                        Voltar Foco
                                    </Button>

                                    <div className="flex items-center gap-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden sm:block">
                                            {plannerTasks.length} tarefa(s) no total da semana
                                        </p>
                                        <Button
                                            type="button"
                                            disabled={plannerTasks.length === 0}
                                            onClick={handleSaveWeeklyPlanner}
                                            className="bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-black uppercase tracking-widest text-xs h-12 px-8 rounded-xl shadow-lg shadow-amber-900/10"
                                        >
                                            Salvar e Lançar Cronograma
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

// Componente para adição rápida de tarefas
interface QuickAddTaskProps {
    project: string;
    environment: string;
    defaultDate: string;
    activeView: string;
    onCreated: () => void;
    currentUserId: string | null;
}

const QuickAddTask = ({ project, environment, defaultDate, activeView, onCreated, currentUserId }: QuickAddTaskProps) => {
    const [title, setTitle] = useState("");
    const [dueDate, setDueDate] = useState(defaultDate);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setDueDate(defaultDate);
    }, [defaultDate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const userId = currentUserId || (await supabase.auth.getSession()).data.session?.user?.id || (await supabase.auth.getUser()).data.user?.id;
            if (!userId) {
                toast.error("Usuário não autenticado. Por favor, faça login novamente.");
                return;
            }

            const cleanProject = project.trim();
            const cleanEnvironment = environment.trim();

            const taskData = {
                title: title.trim(),
                project_name: cleanProject,
                environment_name: cleanEnvironment,
                due_date: dueDate,
                created_by: userId,
                status: 'pending',
                priority: 'normal'
            };

            const { error } = await supabase.from('tasks').insert([taskData]);
            if (error) throw error;

            const isVisible = checkTaskVisibility(dueDate, 'pending', activeView);
            if (isVisible) {
                toast.success("Tarefa adicionada!");
            } else {
                toast.success(`Tarefa adicionada! (Nota: Ela não aparece nesta aba pois está agendada para ${format(parseISO(dueDate), "dd/MM/yyyy")})`);
            }
            
            setTitle("");
            onCreated();
        } catch (error) {
            toast.error("Erro ao adicionar tarefa rápida");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 bg-primary/5 p-3 rounded-[1.5rem] border border-primary/10 focus-within:border-primary/30 transition-all shadow-inner">
            <div className="flex items-center gap-2 px-1">
                <CalendarIcon className="h-3.5 w-3.5 text-primary/60" />
                <Input 
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-transparent border-none h-6 p-0 text-[10px] font-black uppercase tracking-tighter w-28 focus-visible:ring-0 text-muted-foreground [color-scheme:dark] shadow-none"
                />
            </div>
            <div className="flex items-center gap-2">
                <Input 
                    placeholder="Nova tarefa..." 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-transparent border-none h-8 text-sm font-bold focus-visible:ring-0 placeholder:text-muted-foreground/30 flex-1 px-1 text-white"
                />
                <Button type="submit" size="icon" className="h-9 w-9 bg-primary hover:bg-primary/80 text-black rounded-xl shrink-0 shadow-lg shadow-primary/20" disabled={!title.trim() || isSubmitting}>
                    <Plus className="h-5 w-5" />
                </Button>
            </div>
        </form>
    );
};

// Componente para item de tarefa ordenável
interface SortableTaskItemProps {
    task: Task;
    isAdmin: boolean;
    onEdit: (task: Task) => void;
    onToggleStatus: (task: Task) => void;
    onDelete: (id: string) => void;
}

const SortableTaskItem = ({ task, isAdmin, onEdit, onToggleStatus, onDelete }: SortableTaskItemProps) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className="flex items-center gap-4 group/item bg-gradient-to-br from-[#1a1a1a]/80 to-[#121212]/90 backdrop-blur-2xl hover:from-[#252525]/90 hover:to-[#1a1a1a]/95 p-4 rounded-full border border-white/10 hover:border-primary/50 transition-all duration-500 relative z-10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] mb-4 hover:-translate-y-1.5 active:scale-[0.97] group/bubble"
        >
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing opacity-20 group-hover/item:opacity-100 flex items-center justify-center shrink-0 transition-opacity p-1.5 hover:bg-white/10 rounded-full">
                <LayoutGrid className="h-4 w-4 text-primary/60 group-hover/bubble:text-primary transition-colors" />
            </div>
            
            <button 
                onClick={() => onToggleStatus(task)}
                className="h-6 w-6 rounded-full border-2 border-white/10 flex items-center justify-center hover:border-primary hover:bg-primary/10 transition-all shrink-0 group/check"
            >
                <Circle className="h-3 w-3 text-transparent group-hover/check:text-primary/60 transition-colors" />
            </button>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", 
                        task.priority === 'high' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 
                        task.priority === 'normal' ? 'bg-amber-500' : 'bg-emerald-500'
                    )} />
                    <p className="text-[13px] font-bold text-white/90 leading-tight break-words font-['Outfit']">{task.title}</p>
                </div>
                {task.description && (
                    <p className="text-[10px] text-muted-foreground/60 line-clamp-1 pl-3.5 italic">{task.description}</p>
                )}
            </div>

            {isAdmin && (
                <div className="flex items-center gap-1 lg:opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <button 
                        onClick={() => onEdit(task)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg text-blue-400/60 hover:text-blue-400 hover:bg-blue-400/10 transition-all shrink-0"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button 
                        onClick={() => onDelete(task.id)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg text-rose-400/60 hover:text-rose-400 hover:bg-rose-400/10 transition-all shrink-0"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
};

// Componente de Cartão de Grupo de Tarefas
interface TaskCardProps {
    title: string;
    tasks: Task[];
    serviceOrders: any[];
    defaultDueDate: string;
    currentUserId: string | null;
    activeView: string;
    isAdmin: boolean;
    onUpdate: () => void;
    onEdit: (task: Task) => void;
    onToggleStatus: (task: Task) => void;
    onDelete: (id: string) => void;
}

const TaskCard = ({ title, tasks, serviceOrders, defaultDueDate, currentUserId, activeView, isAdmin, onUpdate, onEdit, onToggleStatus, onDelete }: TaskCardProps) => {
    const [showCompleted, setShowCompleted] = useState(false);
    
    // Spotlight effect logic
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty("--mouse-x", `${x}px`);
        card.style.setProperty("--mouse-y", `${y}px`);
    };

    const [pendingTasks, setPendingTasks] = useState(() => 
        tasks.filter(t => t.status === 'pending').sort((a,b) => (a.order_index || 0) - (b.order_index || 0))
    );
    const completedTasks = tasks.filter(t => t.status === 'completed');
    
    const lastDashIdx = title.lastIndexOf(' - ');
    const projectName = lastDashIdx !== -1 ? title.substring(0, lastDashIdx) : title;
    const environmentName = lastDashIdx !== -1 ? title.substring(lastDashIdx + 3) : "";

    const parseDate = (dateStr: any) => {
        if (!dateStr) return new Date();
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) {
            const d2 = new Date(dateStr + (dateStr.includes('T') ? '' : 'T12:00:00'));
            return isNaN(d2.getTime()) ? new Date() : d2;
        }
        return d;
    };

    const getDaysRemaining = (forecastDateStr: string) => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const forecast = parseDate(forecastDateStr);
        forecast.setHours(0,0,0,0);
        const diffTime = forecast.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const projName = (tasks[0]?.project_name || projectName || "").trim().toLowerCase();
    const matchingOS = serviceOrders.find(o => {
        const clientName = (o.client || "").trim().toLowerCase();
        const ticketNum = (o.ticket_number || "").trim().toLowerCase();
        
        if (clientName === projName) return true;
        if (ticketNum && projName.includes(ticketNum)) return true;
        return false;
    });

    let deadlineBadge = null;
    if (matchingOS) {
        const isFinished = matchingOS.status === "Entregue e Finalizado";
        const daysRemaining = matchingOS.forecast_date ? getDaysRemaining(matchingOS.forecast_date) : null;

        if (isFinished) {
            deadlineBadge = (
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Entregue
                </span>
            );
        } else if (daysRemaining !== null) {
            if (daysRemaining < 0) {
                deadlineBadge = (
                    <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30 flex items-center gap-1 animate-pulse shrink-0">
                        <AlertCircle className="h-2.5 w-2.5" />
                        Atrasado {Math.abs(daysRemaining)}d
                    </span>
                );
            } else if (daysRemaining <= 3) {
                deadlineBadge = (
                    <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 flex items-center gap-1 animate-pulse shrink-0">
                        <AlertCircle className="h-2.5 w-2.5" />
                        Crítico: {daysRemaining}d
                    </span>
                );
            } else if (daysRemaining <= 7) {
                deadlineBadge = (
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1 shrink-0">
                        <AlertCircle className="h-2.5 w-2.5" />
                        Atenção: {daysRemaining}d
                    </span>
                );
            } else {
                deadlineBadge = (
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 shrink-0">
                        <CalendarIcon className="h-2.5 w-2.5" />
                        Prazo: {daysRemaining}d
                    </span>
                );
            }
        }
    }
    
    useEffect(() => {
        setPendingTasks(tasks.filter(t => t.status === 'pending').sort((a,b) => (a.order_index || 0) - (b.order_index || 0)));
    }, [tasks]);

    const defaultDate = defaultDueDate;

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
        <Card 
            onMouseMove={handleMouseMove}
            className="glass-card border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col h-full hover:border-primary/30 transition-all duration-700 group/card luxury-shadow spotlight-card tilt-card"
        >
            <CardHeader className="p-7 pb-4">
                <div className="flex justify-between items-start">
                    <div className="space-y-1.5 flex-1 min-w-0">
                        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 truncate">
                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
                            <span className="truncate">{title}</span>
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-full shrink-0">
                                <CalendarIcon className="h-2.5 w-2.5 text-primary/60" />
                                {format(new Date(), "dd MMM", { locale: ptBR })}
                            </p>
                            <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-full shrink-0">
                                {pendingTasks.length} {pendingTasks.length === 1 ? 'Pendente' : 'Pendentes'}
                            </p>
                            {deadlineBadge}
                        </div>
                    </div>
                    <div className="h-10 w-10 rounded-2xl bg-white/[0.03] flex items-center justify-center border border-white/5 group-hover/card:border-primary/40 group-hover/card:bg-primary/10 transition-all duration-500">
                        <LayoutGrid className="h-5 w-5 text-primary/40 group-hover/card:text-primary transition-colors" />
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="p-7 pt-2 flex-1 flex flex-col">
                <div className="flex-1">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={pendingTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-1">
                                {pendingTasks.map(task => (
                                    <SortableTaskItem 
                                        key={task.id} 
                                        task={task} 
                                        isAdmin={isAdmin}
                                        onEdit={onEdit}
                                        onToggleStatus={onToggleStatus}
                                        onDelete={onDelete}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>

                    {completedTasks.length > 0 && (
                        <div className="mt-6 pt-5 border-t border-white/5">
                            <button 
                                onClick={() => setShowCompleted(!showCompleted)}
                                className="flex items-center gap-2 text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] hover:text-primary/60 transition-colors group/completed"
                            >
                                <div className="h-4 w-4 rounded-full border border-white/10 flex items-center justify-center group-hover/completed:border-primary/40 transition-colors">
                                    {showCompleted ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                                </div>
                                {completedTasks.length} {completedTasks.length === 1 ? 'item concluído' : 'itens concluídos'}
                            </button>
                            
                            {showCompleted && (
                                <div className="mt-4 space-y-3">
                                    {completedTasks.map(task => (
                                        <div key={task.id} className="flex items-center gap-3 bg-emerald-500/[0.03] p-3 rounded-[1rem] border border-emerald-500/5 opacity-40 hover:opacity-60 transition-opacity group/completed-item">
                                            <button 
                                                onClick={() => onToggleStatus(task)}
                                                className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center text-black shrink-0"
                                            >
                                                <CheckCircle2 className="h-3 w-3" />
                                            </button>
                                            <p className="text-xs font-bold text-white line-through leading-tight font-['Outfit'] flex-1 min-w-0">{task.title}</p>
                                            {isAdmin && (
                                                <button 
                                                    onClick={() => onDelete(task.id)}
                                                    className="h-7 w-7 flex items-center justify-center rounded-lg text-rose-400/60 hover:text-rose-400 hover:bg-rose-400/10 transition-all shrink-0 lg:opacity-0 group-hover/completed-item:opacity-100"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
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
                    activeView={activeView}
                    onCreated={onUpdate} 
                    currentUserId={currentUserId}
                />
            </CardContent>
        </Card>
    );
};

export default Tarefas;
