import React from "react";
import { cn } from "@/lib/utils";

interface ModuleHeaderProps {
  badge?: string;
  badgeColorClass?: string;
  statusLabel?: string;
  title: string;
  highlight?: string;
  subtitle?: string;
  art?: React.ReactNode;
  actions?: React.ReactNode;
  bottomBar?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

/**
 * Cabeçalho executivo padronizado para todos os módulos do BJL.OS.
 * Reúne a pill de setor, título tipográfico unificado, ilustração temática exclusiva e barra de ações.
 */
export const ModuleHeader: React.FC<ModuleHeaderProps> = ({
  badge,
  badgeColorClass = "text-primary border-primary/25 bg-primary/10",
  statusLabel,
  title,
  highlight,
  subtitle,
  art,
  actions,
  bottomBar,
  className,
  compact = false,
}) => {
  return (
    <header
      className={cn(
        "executive-card border-metallic wood-ruler-top rounded-[2rem] relative overflow-hidden",
        compact ? "p-4 sm:p-5" : "p-5 sm:p-6",
        className
      )}
    >
      <div className="absolute -top-20 -right-16 w-72 h-72 bg-primary/12 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:flex-wrap lg:items-center justify-between gap-4 sm:gap-5">
        <div className="flex items-center gap-4 sm:gap-5 flex-1 min-w-[240px] sm:min-w-[340px]">
          {art && (
            <div className="hidden sm:flex shrink-0 items-center justify-center p-2.5 rounded-2xl bg-[#26160b]/75 border border-amber-500/30 shadow-inner">
              {art}
            </div>
          )}

          <div className="space-y-1.5 min-w-0 flex-1">
            {(badge || statusLabel) && (
              <div className="flex items-center gap-2 flex-wrap">
                {badge && (
                  <span className={cn("tech-hud-pill whitespace-nowrap", badgeColorClass)}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />
                    {badge}
                  </span>
                )}
                {statusLabel && (
                  <span className="text-[10px] font-mono font-semibold text-emerald-300 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shrink-0" />
                    {statusLabel}
                  </span>
                )}
              </div>
            )}

            <h1
              className={cn(
                "font-display font-black tracking-tight text-foreground leading-tight",
                compact ? "text-2xl sm:text-3xl" : "text-2xl sm:text-3xl md:text-4xl"
              )}
            >
              {title}{" "}
              {highlight && <span className="shimmer-gold">{highlight}</span>}
            </h1>

            {subtitle && (
              <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2.5 max-w-full">
            {actions}
          </div>
        )}
      </div>

      {bottomBar && (
        <div className="relative z-10 mt-4 pt-3.5 border-t border-white/[0.08]">
          {bottomBar}
        </div>
      )}
    </header>
  );
};
