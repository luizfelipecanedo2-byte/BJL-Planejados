import { Bell, Check, Info, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-rose-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all duration-300 group"
        >
          <Bell className={cn("h-5 w-5 transition-all group-hover:scale-110", unreadCount > 0 ? "text-primary animate-pulse" : "text-muted-foreground")} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground shadow-lg shadow-primary/40 border border-background">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] glass-card border-white/10 p-0 rounded-[2rem] overflow-hidden shadow-2xl luxury-shadow animate-in fade-in zoom-in duration-300">
        <div className="bg-primary/10 p-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-xl">
               <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
               <h3 className="text-sm font-black text-luxury uppercase tracking-widest">Notificações</h3>
               <p className="text-[10px] font-bold text-primary/60 uppercase">Você tem {unreadCount} mensagens novas</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary hover:bg-primary/10 h-8 px-3 rounded-lg"
            >
              Marcar tudo como lido
            </Button>
          )}
        </div>
        
        <div className="max-h-[450px] overflow-y-auto hide-scrollbar p-2 space-y-1">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={cn(
                  "p-4 rounded-2xl transition-all duration-300 cursor-pointer border border-transparent group relative overflow-hidden",
                  n.read ? "opacity-60 hover:opacity-100 hover:bg-white/5" : "bg-white/5 border-white/10 hover:border-primary/30 hover:bg-white/[0.08]"
                )}
              >
                {!n.read && (
                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                )}
                
                <div className="flex gap-4">
                  <div className={cn(
                    "p-2.5 rounded-xl h-fit shrink-0 transition-transform group-hover:scale-110 duration-500",
                    n.read ? "bg-white/5" : "bg-primary/10 shadow-lg"
                  )}>
                    {getIcon(n.type)}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className={cn(
                        "text-xs font-black tracking-tight mb-0.5 text-luxury transition-colors",
                        n.read ? "text-muted-foreground" : "text-primary"
                    )}>
                        {n.title}
                    </span>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-medium">
                      {n.message}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2.5 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                       <Clock className="h-3 w-3" />
                       {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center px-8">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/5">
                <Bell className="h-8 w-8 text-white/10" />
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nenhuma notificação encontrada</p>
              <p className="text-[10px] text-muted-foreground/40 mt-2">Fique tranquilo! Avisaremos quando algo importante acontecer.</p>
            </div>
          )}
        </div>
        
        {notifications.length > 0 && (
            <div className="p-4 border-t border-white/5 bg-white/[0.02] flex justify-center">
                 <p className="text-[9px] font-black uppercase text-muted-foreground/30 tracking-[0.3em]">BJL PLANEJADOS • LUXO & GESTÃO</p>
            </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
