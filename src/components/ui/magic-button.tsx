import * as React from "react"
import { cn } from "@/lib/utils"

export interface MagicButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

export const MagicButton = React.forwardRef<HTMLButtonElement, MagicButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "relative inline-flex h-10 overflow-hidden rounded-md p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.98]",
          className
        )}
        {...props}
      >
        <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#FBBF24_0%,#F59E0B_50%,#FBBF24_100%)]" />
        <span className="inline-flex h-full w-full cursor-pointer items-center justify-center gap-2 rounded-[calc(var(--radius)-1px)] bg-black/80 px-4 py-2 text-sm font-medium text-white backdrop-blur-3xl transition-all hover:bg-black/90 border border-white/10 group-hover:border-primary/50">
          {children}
        </span>
      </button>
    )
  }
)

MagicButton.displayName = "MagicButton"
