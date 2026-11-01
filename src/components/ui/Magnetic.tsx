import React from "react";

interface MagneticProps {
  children: React.ReactNode;
  range?: number;
  strength?: number;
  className?: string;
}

export const Magnetic = ({ children, className }: MagneticProps) => {
  return <div className={className}>{children}</div>;
};
