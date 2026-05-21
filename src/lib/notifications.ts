import { supabase } from "./supabase";

export type NotificationType = 'info' | 'warning' | 'success' | 'error';

export async function createNotification(userId: string, title: string, message: string, type: NotificationType = 'info', link?: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: userId,
          title,
          message,
          type,
          link,
          read: false
        }
      ]);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error };
  }
}

export async function checkAndNotifyOverdueTasks() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch overdue tasks
    const today = new Date().toISOString().split('T')[0];
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'pending')
      .lt('due_date', today);

    if (tasksError) throw tasksError;

    if (tasks && tasks.length > 0) {
      const titles = tasks.map(task => `Tarefa Atrasada: ${task.title}`);
      
      // Batch check which notifications already exist
      const { data: existing, error: existingError } = await supabase
        .from('notifications')
        .select('title')
        .eq('user_id', user.id)
        .in('title', titles);

      if (existingError) throw existingError;

      const existingTitlesSet = new Set((existing || []).map(n => n.title));

      // Filter tasks that do not have a notification yet
      const newNotifications = tasks
        .filter(task => !existingTitlesSet.has(`Tarefa Atrasada: ${task.title}`))
        .map(task => ({
          user_id: user.id,
          title: `Tarefa Atrasada: ${task.title}`,
          message: `A tarefa "${task.title}" venceu em ${task.due_date}. Por favor, verifique o status.`,
          type: 'warning' as const,
          link: '/tarefas',
          read: false
        }));

      if (newNotifications.length > 0) {
        const { error: insertError } = await supabase
          .from('notifications')
          .insert(newNotifications);
        
        if (insertError) throw insertError;
      }
    }
  } catch (error) {
    console.error('Error in checkAndNotifyOverdueTasks:', error);
  }
}
