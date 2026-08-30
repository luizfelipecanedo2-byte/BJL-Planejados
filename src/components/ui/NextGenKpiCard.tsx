import React from 'react';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NextGenKpiCardProps {
    title: string;
    value: string;
    change?: string;
    isPositive?: boolean;
    sparklineData?: number[];
    subtitle?: string;
    icon?: LucideIcon;
    variant?: 'default' | 'emerald' | 'rose' | 'amber' | 'blue';
    className?: string;
}

export const NextGenKpiCard: React.FC<NextGenKpiCardProps> = ({
    title,
    value,
    change,
    isPositive = true,
    sparklineData = [10, 15, 12, 18, 14, 22, 25],
    subtitle = "vs. período anterior",
    icon: Icon,
    variant = 'default',
    className,
}) => {
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;
    const width = 100;
    const height = 32;

    const points = sparklineData
        .map((val, idx) => {
            const x = (idx / (sparklineData.length - 1)) * width;
            const y = height - ((val - min) / range) * (height - 8) - 4;
            return `${x},${y}`;
        })
        .join(' ');

    const strokeColor = 
        variant === 'emerald' ? '#10b981' :
        variant === 'rose' ? '#f43f5e' :
        variant === 'amber' ? '#f59e0b' :
        variant === 'blue' ? '#3b82f6' :
        isPositive ? '#10b981' : '#f43f5e';

    return (
        <div className={cn(
            "group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-xl transition-all duration-300 hover:border-border hover:bg-card/90 shadow-sm hover:shadow-md",
            className
        )}>
            {/* Linha de brilho superior */}
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {Icon && (
                        <div className={cn(
                            "p-2 rounded-xl border",
                            variant === 'emerald' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                            variant === 'rose' ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                            variant === 'amber' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                            "bg-primary/10 text-primary border-primary/20"
                        )}>
                            <Icon className="h-4 w-4" />
                        </div>
                    )}
                    <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                        {title}
                    </span>
                </div>

                {change && (
                    <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border",
                        isPositive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    )}>
                        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {change}
                    </span>
                )}
            </div>

            <div className="mt-4 flex items-end justify-between gap-2">
                <div>
                    <h3 className="font-mono text-2xl font-black tracking-tight text-foreground">
                        {value}
                    </h3>
                    {subtitle && (
                        <p className="mt-1 text-[11px] text-muted-foreground font-medium">
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* Sparkline */}
                {sparklineData.length > 1 && (
                    <div className="relative shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <svg width={width} height={height} className="overflow-visible">
                            <polyline
                                fill="none"
                                stroke={strokeColor}
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={points}
                            />
                        </svg>
                    </div>
                )}
            </div>
        </div>
    );
};
