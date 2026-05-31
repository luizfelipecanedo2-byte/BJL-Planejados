import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    animate?: boolean;
    delay?: number;
}

export const PremiumCard = ({
    children,
    className,
    animate = true,
    delay = 0,
    ...props
}: PremiumCardProps) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const [rotate, setRotate] = useState({ x: 0, y: 0 });
    const [tilt, setTilt] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;

        const card = cardRef.current;
        const rect = card.getBoundingClientRect();
        
        // Calculate relative mouse coordinates for spotlight
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCoords({ x, y });

        // Calculate rotation for 3D Tilt
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -4; // Max -4 to 4 deg (sleek tilt)
        const rotateY = ((x - centerX) / centerX) * 4;  // Max -4 to 4 deg
        setRotate({ x: rotateX, y: rotateY });

        // Calculate offset factor for parallax (ranges from -1 to 1)
        const tiltX = (x - centerX) / centerX;
        const tiltY = (y - centerY) / centerY;
        setTilt({ x: tiltX, y: tiltY });
    };

    const handleMouseLeave = () => {
        setRotate({ x: 0, y: 0 });
        setTilt({ x: 0, y: 0 });
    };

    const cardContent = (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                "--mouse-x": `${coords.x}px`,
                "--mouse-y": `${coords.y}px`,
                "--tilt-x": tilt.x,
                "--tilt-y": tilt.y,
                transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
                transformStyle: "preserve-3d",
                perspective: "1000px",
                transition: "transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
            } as React.CSSProperties}
            className={cn(
                "glass-card rounded-2xl p-6 relative overflow-hidden group spotlight-card transition-all duration-300",
                className
            )}
            {...props}
        >
            {/* The Border Beam Laser Effect */}
            <div 
                className="absolute inset-0 rounded-2xl pointer-events-none z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden"
                style={{
                    padding: "1.5px",
                    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                }}
            >
                <div 
                    className="absolute top-1/2 left-1/2 w-[300%] h-[300%] -translate-x-1/2 -translate-y-1/2 animate-[spin_5s_linear_infinite]"
                    style={{
                        background: "conic-gradient(from 0deg, transparent 35%, hsl(var(--primary)) 50%, transparent 65%)",
                    }}
                />
            </div>

            {/* The spotlight background */}
            <div 
                className="absolute inset-0 z-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                    background: `radial-gradient(400px circle at var(--mouse-x) var(--mouse-y), hsl(var(--primary) / 0.08), transparent 80%)`
                }}
            />
            {/* The content wrapper with preserve-3d */}
            <div className="relative z-10 w-full h-full" style={{ transform: "translateZ(10px)", transformStyle: "preserve-3d" }}>
                {children}
            </div>
        </div>
    );

    if (animate) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay }}
                className="h-full"
            >
                {cardContent}
            </motion.div>
        );
    }

    return cardContent;
};
