import { useState, useEffect } from "react";

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    formatter?: (v: number) => string;
}

export const AnimatedCounter = ({ 
    value, 
    duration = 1200, 
    formatter = (v: number) => v.toFixed(0) 
}: AnimatedCounterProps) => {
    const [displayValue, setDisplayValue] = useState(value);

    useEffect(() => {
        const start = displayValue;
        const end = value;
        let startTimestamp: number | null = null;

        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            
            // Easing function: outQuart
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            const current = start + (end - start) * easeProgress;
            
            setDisplayValue(current);
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                setDisplayValue(end);
            }
        };

        const animation = window.requestAnimationFrame(step);
        return () => window.cancelAnimationFrame(animation);
    }, [value, duration]);

    return <>{formatter(displayValue)}</>;
};
