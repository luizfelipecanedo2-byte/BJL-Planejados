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

/**
 * Checks for overdue tasks and creates notifications if they don't exist yet.
 * This is a simple implementation that runs on client side.
 */
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
      // Check which ones we already notified (to avoid spam)
      // For simplicity, we could check if a notification with this title/task exists
      for (const task of tasks) {
        const title = `Tarefa Atrasada: ${task.title}`;
        
        // Check if notification already exists for today
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('title', title)
          .limit(1);

        if (!existing || existing.length === 0) {
          await createNotification(
            user.id,
            title,
            `A tarefa "${task.title}" venceu em ${task.due_date}. Por favor, verifique o status.`,
            'warning',
            '/tarefas'
          );
        }
      }
    }
  } catch (error) {
    console.error('Error in checkAndNotifyOverdueTasks:', error);
  }
}
