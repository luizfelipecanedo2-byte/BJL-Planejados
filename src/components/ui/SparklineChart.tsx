import React, { useId } from "react";
import { cn } from "@/lib/utils";

interface SparklineChartProps {
    data: number[];
    width?: number;
    height?: number;
    variant?: 'emerald' | 'amber' | 'rose' | 'blue' | 'purple' | 'primary';
    showPoints?: boolean;
    showArea?: boolean;
    className?: string;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
    data,
    width = 110,
    height = 34,
    variant = 'emerald',
    showPoints = true,
    showArea = true,
    className
}) => {
    const gradientId = useId();

    if (!data || data.length < 2) {
        return null;
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 4;

    const effectiveWidth = width - padding * 2;
    const effectiveHeight = height - padding * 2;

    const points = data.map((val, idx) => {
        const x = padding + (idx / (data.length - 1)) * effectiveWidth;
        const y = padding + effectiveHeight - ((val - min) / range) * effectiveHeight;
        return { x, y, val };
    });

    // Gera curva bezier suave
    const getCurvedPath = (pts: { x: number; y: number }[]) => {
        let path = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const curr = pts[i];
            const next = pts[i + 1];
            const cpX1 = curr.x + (next.x - curr.x) / 2;
            const cpY1 = curr.y;
            const cpX2 = curr.x + (next.x - curr.x) / 2;
            const cpY2 = next.y;
            path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
        }
        return path;
    };

    const linePath = getCurvedPath(points);
    const lastPoint = points[points.length - 1];

    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    const colors = {
        emerald: {
            stroke: '#10B981',
            fillStart: 'rgba(16, 185, 129, 0.35)',
            fillEnd: 'rgba(16, 185, 129, 0.0)',
            dotGlow: 'rgba(16, 185, 129, 0.6)'
        },
        amber: {
            stroke: '#F59E0B',
            fillStart: 'rgba(245, 158, 11, 0.35)',
            fillEnd: 'rgba(245, 158, 11, 0.0)',
            dotGlow: 'rgba(245, 158, 11, 0.6)'
        },
        rose: {
            stroke: '#F43F5E',
            fillStart: 'rgba(244, 63, 94, 0.35)',
            fillEnd: 'rgba(244, 63, 94, 0.0)',
            dotGlow: 'rgba(244, 63, 94, 0.6)'
        },
        blue: {
            stroke: '#3B82F6',
            fillStart: 'rgba(59, 130, 246, 0.35)',
            fillEnd: 'rgba(59, 130, 246, 0.0)',
            dotGlow: 'rgba(59, 130, 246, 0.6)'
        },
        purple: {
            stroke: '#A855F7',
            fillStart: 'rgba(168, 85, 247, 0.35)',
            fillEnd: 'rgba(168, 85, 247, 0.0)',
            dotGlow: 'rgba(168, 85, 247, 0.6)'
        },
        primary: {
            stroke: '#EC7000',
            fillStart: 'rgba(236, 112, 0, 0.35)',
            fillEnd: 'rgba(236, 112, 0, 0.0)',
            dotGlow: 'rgba(236, 112, 0, 0.6)'
        }
    };

    const c = colors[variant] || colors.emerald;

    return (
        <div className={cn("inline-flex items-center shrink-0", className)}>
            <svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                className="overflow-visible"
            >
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={c.fillStart} />
                        <stop offset="100%" stopColor={c.fillEnd} />
                    </linearGradient>
                    <filter id={`glow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor={c.stroke} floodOpacity="0.4" />
                    </filter>
                </defs>

                {showArea && (
                    <path
                        d={areaPath}
                        fill={`url(#${gradientId})`}
                    />
                )}

                <path
                    d={linePath}
                    fill="none"
                    stroke={c.stroke}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter={`url(#glow-${gradientId})`}
                />

                {showPoints && lastPoint && (
                    <g>
                        <circle
                            cx={lastPoint.x}
                            cy={lastPoint.y}
                            r="4"
                            fill={c.stroke}
                            className="animate-ping opacity-75"
                        />
                        <circle
                            cx={lastPoint.x}
                            cy={lastPoint.y}
                            r="3"
                            fill="#FFFFFF"
                            stroke={c.stroke}
                            strokeWidth="1.5"
                        />
                    </g>
                )}
            </svg>
        </div>
    );
};

export default SparklineChart;
