import React from "react";
import { cn } from "@/lib/utils";

/**
 * 1. SERROTE DE MARCENARIA CLÁSSICO (AnimatedHandsaw)
 * Cabo entalhado em madeira nobre, rebites de latão, lâmina de aço e serragem.
 */
export const AnimatedHandsaw: React.FC<{
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  animate?: boolean;
  showSawdust?: boolean;
  flip?: boolean;
}> = ({
  className,
  size = "md",
  animate = true,
  showSawdust = true,
  flip = false,
}) => {
  const sizeClasses = {
    sm: "w-10 h-6",
    md: "w-16 h-10",
    lg: "w-28 h-16",
    xl: "w-40 h-24",
  };

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center select-none pointer-events-none",
        sizeClasses[size],
        flip && "-scale-x-100",
        className
      )}
    >
      <svg
        viewBox="0 0 220 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "w-full h-full overflow-visible drop-shadow-[0_6px_14px_rgba(217,119,6,0.28)]",
          animate && "animate-sawing"
        )}
      >
        <defs>
          <linearGradient id="sawBladeSteel" x1="40" y1="25" x2="210" y2="75" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="35%" stopColor="#CBD5E1" />
            <stop offset="70%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>
          <linearGradient id="sawBladeGlow" x1="50" y1="30" x2="195" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#FEF3C7" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="woodHandleGrad" x1="5" y1="15" x2="65" y2="95" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="45%" stopColor="#B45309" />
            <stop offset="85%" stopColor="#78350F" />
            <stop offset="100%" stopColor="#451A03" />
          </linearGradient>
          <linearGradient id="woodHandleHighlight" x1="8" y1="15" x2="55" y2="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#92400E" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        <ellipse cx="135" cy="84" rx="58" ry="6" fill="rgba(245, 158, 11, 0.16)" />

        <path
          d="M 52 30 L 208 46 L 204 68 L 198 63 L 194 70 L 188 64 L 184 71 L 178 65 L 174 72 L 168 66 L 164 73 L 158 67 L 154 74 L 148 68 L 144 75 L 138 69 L 134 76 L 128 70 L 124 77 L 118 71 L 114 78 L 108 72 L 104 79 L 98 73 L 94 80 L 88 74 L 84 81 L 78 75 L 74 82 L 68 76 L 64 83 L 58 77 L 52 83 Z"
          fill="url(#sawBladeSteel)"
          stroke="#475569"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        <path d="M 60 36 L 198 49 L 196 55 L 60 44 Z" fill="url(#sawBladeGlow)" />
        <line x1="72" y1="52" x2="178" y2="59" stroke="#64748B" strokeWidth="1" strokeDasharray="6 4" strokeOpacity="0.6" />
        <text
          x="105"
          y="56"
          fill="#475569"
          fontSize="8.5"
          fontWeight="800"
          fontFamily="monospace"
          letterSpacing="2"
          transform="rotate(4.5 105 56)"
        >
          BJL•OFICINA
        </text>

        <path
          d="M 58 77 L 64 83 L 68 76 L 74 82 L 78 75 L 84 81 L 88 74 L 94 80 L 98 73 L 104 79 L 108 72 L 114 78 L 118 71 L 124 77 L 128 70 L 134 76 L 138 69 L 144 75 L 148 68 L 154 74 L 158 67 L 164 73 L 168 66 L 174 72 L 178 65 L 184 71 L 188 64 L 194 70 L 198 63 L 204 68"
          stroke="#FBBF24"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.75"
        />

        <path
          d="M 18 24 C 10 24, 6 34, 8 48 C 10 64, 14 79, 22 88 C 28 95, 42 96, 48 89 C 53 84, 54 77, 60 77 L 64 31 C 57 30, 54 22, 46 18 C 37 14, 25 18, 18 24 Z"
          fill="url(#woodHandleGrad)"
          stroke="url(#woodHandleHighlight)"
          strokeWidth="2"
        />
        <path d="M 16 34 C 14 50, 18 70, 26 83" stroke="#451A03" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.55" />
        <path d="M 42 23 C 48 38, 49 62, 43 84" stroke="#FDE68A" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.3" />
        <path
          d="M 24 36 C 20 38, 19 52, 22 65 C 24 74, 32 78, 37 74 C 41 70, 41 54, 39 42 C 37 35, 29 33, 24 36 Z"
          fill="#26170C"
          stroke="#92400E"
          strokeWidth="1.8"
        />

        <g>
          <circle cx="54" cy="40" r="3.2" fill="#FBBF24" stroke="#78350F" strokeWidth="1" />
          <line x1="52.5" y1="40" x2="55.5" y2="40" stroke="#78350F" strokeWidth="0.9" />
          <circle cx="56" cy="55" r="3.5" fill="#FBBF24" stroke="#78350F" strokeWidth="1" />
          <line x1="54.5" y1="53.5" x2="57.5" y2="56.5" stroke="#78350F" strokeWidth="0.9" />
          <circle cx="53" cy="70" r="3.2" fill="#FBBF24" stroke="#78350F" strokeWidth="1" />
          <line x1="51.5" y1="70" x2="54.5" y2="70" stroke="#78350F" strokeWidth="0.9" />
        </g>

        {showSawdust && (
          <g className={cn(animate && "animate-sawdust-burst")}>
            <path d="M 115 84 C 120 92, 130 90, 128 83 C 126 78, 119 81, 122 86" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M 155 79 C 162 87, 171 84, 168 78" stroke="#FBBF24" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <circle cx="98" cy="87" r="2.2" fill="#FBBF24" />
            <circle cx="108" cy="93" r="1.5" fill="#D97706" />
            <circle cx="138" cy="89" r="2.4" fill="#FDE68A" />
            <circle cx="147" cy="95" r="1.6" fill="#F59E0B" />
            <circle cx="175" cy="85" r="2" fill="#FBBF24" />
            <circle cx="186" cy="91" r="1.4" fill="#D97706" />
          </g>
        )}
      </svg>
    </div>
  );
};

/**
 * 2. DISCO DE SERRA CIRCULAR (SpinningSawBlade)
 */
export const SpinningSawBlade: React.FC<{
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  fast?: boolean;
}> = ({ className, size = "md", fast = false }) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16",
    xl: "w-28 h-28",
  };

  const numTeeth = 20;
  const teethPaths: string[] = [];
  for (let i = 0; i < numTeeth; i++) {
    const angle1 = (i * 360) / numTeeth;
    const angle2 = ((i + 0.55) * 360) / numTeeth;
    const angle3 = ((i + 0.85) * 360) / numTeeth;

    const rad1 = (angle1 * Math.PI) / 180;
    const rad2 = (angle2 * Math.PI) / 180;
    const rad3 = (angle3 * Math.PI) / 180;

    const rInner = 37;
    const rOuter = 46;

    const x1 = 50 + rInner * Math.cos(rad1);
    const y1 = 50 + rInner * Math.sin(rad1);
    const x2 = 50 + rOuter * Math.cos(rad2);
    const y2 = 50 + rOuter * Math.sin(rad2);
    const x3 = 50 + rInner * Math.cos(rad3);
    const y3 = 50 + rInner * Math.sin(rad3);

    teethPaths.push(
      `${i === 0 ? "M" : "L"} ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)}`
    );
  }
  const fullGearPath = teethPaths.join(" ") + " Z";

  return (
    <div className={cn("relative inline-flex items-center justify-center select-none", sizeClasses[size], className)}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "w-full h-full drop-shadow-[0_0_12px_rgba(245,158,11,0.3)]",
          fast ? "animate-spin-saw-fast" : "animate-spin-saw group-hover:animate-spin-saw-fast"
        )}
      >
        <defs>
          <radialGradient id="bladeMetalGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="30%" stopColor="#CBD5E1" />
            <stop offset="75%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#FBBF24" />
          </radialGradient>
        </defs>
        <path d={fullGearPath} fill="url(#bladeMetalGrad)" stroke="#F59E0B" strokeWidth="1.2" strokeLinejoin="round" />
        <circle cx="50" cy="50" r="28" stroke="#475569" strokeWidth="1" strokeDasharray="5 3" />
        <circle cx="50" cy="50" r="18" fill="#3B2514" stroke="#F59E0B" strokeWidth="2" />
        <line x1="50" y1="14" x2="50" y2="26" stroke="#26170C" strokeWidth="2" strokeLinecap="round" />
        <line x1="50" y1="74" x2="50" y2="86" stroke="#26170C" strokeWidth="2" strokeLinecap="round" />
        <line x1="14" y1="50" x2="26" y2="50" stroke="#26170C" strokeWidth="2" strokeLinecap="round" />
        <line x1="74" y1="50" x2="86" y2="50" stroke="#26170C" strokeWidth="2" strokeLinecap="round" />
        <circle cx="50" cy="50" r="8" fill="#26170C" stroke="#FBBF24" strokeWidth="2.5" />
      </svg>
    </div>
  );
};

/**
 * 3. MÓVEL PLANEJADO 3D ISOMÉTRICO (AnimatedCabinet3D)
 * Desenho arquitetônico de um Armário/Closet Planejado com nichos iluminados,
 * gavetas deslizando, portas com puxadores de latão e cotas técnicas (2400mm).
 */
export const AnimatedCabinet3D: React.FC<{
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}> = ({ className, size = "lg" }) => {
  const sizeClasses = {
    sm: "w-14 h-14",
    md: "w-20 h-20",
    lg: "w-28 h-28",
    xl: "w-36 h-36",
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", sizeClasses[size], className)}>
      <svg viewBox="0 0 160 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible drop-shadow-[0_10px_18px_rgba(0,0,0,0.45)]">
        <defs>
          <linearGradient id="cabWoodSide" x1="20" y1="20" x2="80" y2="130" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#B45309" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>
          <linearGradient id="cabWoodFront" x1="80" y1="20" x2="140" y2="130" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>
          <linearGradient id="cabLedGlow" x1="80" y1="35" x2="135" y2="75" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Linhas de Cota de Projeto (Blueprint Técnico) */}
        <g stroke="#FBBF24" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="3 3">
          <line x1="16" y1="30" x2="16" y2="122" />
          <line x1="24" y1="136" x2="82" y2="148" />
          <line x1="82" y1="148" x2="144" y2="126" />
        </g>
        <text x="2" y="78" fill="#FDE68A" fontSize="7" fontFamily="monospace" fontWeight="bold" transform="rotate(-90 8 78)">2400mm</text>
        <text x="108" y="146" fill="#FDE68A" fontSize="7" fontFamily="monospace" fontWeight="bold">1800mm</text>

        {/* Topo Isométrico do Armário Planejado */}
        <polygon points="82,12 142,32 82,52 24,32" fill="#D97706" stroke="#FDE68A" strokeWidth="1.2" />

        {/* Lateral Esquerda do Móvel */}
        <polygon points="24,32 82,52 82,138 24,116" fill="url(#cabWoodSide)" stroke="#FBBF24" strokeWidth="1.2" />
        {/* Veios na lateral */}
        <path d="M 38 45 C 36 70, 42 95, 38 118" stroke="#451A03" strokeWidth="1" strokeOpacity="0.5" />
        <path d="M 62 52 C 64 78, 58 105, 62 128" stroke="#451A03" strokeWidth="1" strokeOpacity="0.5" />

        {/* Frente Direita do Armário (Corpo Principal) */}
        <polygon points="82,52 142,32 142,116 82,138" fill="url(#cabWoodFront)" stroke="#FDE68A" strokeWidth="1.2" />

        {/* Nicho Superior Iluminado com Fita LED Quente */}
        <polygon points="86,55 138,38 138,64 86,81" fill="#2A180D" stroke="#FBBF24" strokeWidth="1" />
        <polygon points="87,56 137,39 137,43 87,60" fill="url(#cabLedGlow)" />
        {/* Vaso / Decoração dentro do nicho */}
        <ellipse cx="105" cy="66" rx="5" ry="7" fill="#F59E0B" />
        <rect x="118" y="54" width="12" height="10" transform="skewY(-18)" fill="#FDE68A" fillOpacity="0.7" />

        {/* Porta do Armário com Puxador Cava Dourado */}
        <polygon points="86,84 111,76 111,124 86,133" fill="#B45309" stroke="#FDE68A" strokeWidth="1" />
        <line x1="107" y1="92" x2="107" y2="112" stroke="#FEF3C7" strokeWidth="2" strokeLinecap="round" />

        {/* 2 Gavetas Planejadas (a gaveta de cima desliza suavemente!) */}
        <g className="animate-drawer-slide">
          <polygon points="114,75 138,67 138,91 114,99" fill="#D97706" stroke="#FEF3C7" strokeWidth="1.2" />
          <line x1="122" y1="84" x2="131" y2="81" stroke="#FEF3C7" strokeWidth="2" strokeLinecap="round" />
        </g>
        <polygon points="114,102 138,94 138,115 114,123" fill="#B45309" stroke="#FBBF24" strokeWidth="1" />
        <line x1="122" y1="110" x2="131" y2="107" stroke="#FDE68A" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
};

/**
 * 4. PLAINA MANUAL DE MARCENARIA (AnimatedWoodPlane)
 * Plaina de madeira e latão deslizando sobre a prancha e soltando maravalhas em espiral!
 */
export const AnimatedWoodPlane: React.FC<{
  className?: string;
  size?: "sm" | "md" | "lg";
}> = ({ className, size = "md" }) => {
  const sizeClasses = {
    sm: "w-14 h-10",
    md: "w-24 h-14",
    lg: "w-32 h-20",
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", sizeClasses[size], className)}>
      <svg viewBox="0 0 180 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
        {/* Tábua base sendo aplainada */}
        <rect x="10" y="76" width="160" height="14" rx="4" fill="#78350F" stroke="#D97706" strokeWidth="1.2" />
        <line x1="20" y1="83" x2="155" y2="83" stroke="#451A03" strokeWidth="1" strokeDasharray="12 6" />

        {/* Corpo da Plaina deslizando */}
        <g className="animate-planing">
          {/* Base de Ferro/Aço e Sapata da Plaina */}
          <path d="M 35 75 L 145 75 L 152 60 L 118 60 L 105 46 L 55 46 L 42 60 L 30 60 Z" fill="#B45309" stroke="#FDE68A" strokeWidth="1.5" />
          <rect x="34" y="71" width="112" height="4" fill="#E2E8F0" />

          {/* Punho traseiro (Tote) e Pommel dianteiro em Madeira Nobre */}
          <path d="M 44 60 C 38 45, 42 30, 52 28 C 60 27, 62 38, 56 48 L 54 60 Z" fill="#78350F" stroke="#FBBF24" strokeWidth="1.3" />
          <ellipse cx="132" cy="52" rx="9" ry="11" fill="#78350F" stroke="#FBBF24" strokeWidth="1.3" />

          {/* Lâmina inclinada de aço e capa de latão */}
          <path d="M 78 24 L 94 20 L 104 68 L 88 68 Z" fill="#CBD5E1" stroke="#475569" strokeWidth="1.2" />
          <circle cx="91" cy="36" r="5" fill="#FBBF24" stroke="#78350F" strokeWidth="1.2" />

          {/* Maravalha (Fita espiral de madeira saindo da boca da plaina!) */}
          <path
            d="M 96 62 C 102 42, 122 30, 130 42 C 136 52, 120 62, 114 52 C 110 45, 120 38, 124 44"
            stroke="#FDE68A"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 102 56 C 112 34, 136 22, 144 35"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
};

/**
 * 5. FORMÃO & MALHO DE MARCENARIA (AnimatedHammerAndChisel)
 * Malho de madeira batendo no formão para esculpir encaixe artesanal!
 */
export const AnimatedHammerAndChisel: React.FC<{
  className?: string;
  size?: "sm" | "md" | "lg";
}> = ({ className, size = "md" }) => {
  const sizeClasses = {
    sm: "w-14 h-14",
    md: "w-20 h-20",
    lg: "w-28 h-28",
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", sizeClasses[size], className)}>
      <svg viewBox="0 0 150 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
        {/* Bloco de madeira com encaixe rabo de andorinha */}
        <path d="M 55 96 L 140 96 L 140 120 L 55 120 L 55 106 L 72 106 L 72 96 Z" fill="#92400E" stroke="#FBBF24" strokeWidth="1.4" />
        {/* Lasca / Cavaco de madeira saltando */}
        <path d="M 76 88 Q 88 78 96 86" stroke="#FDE68A" strokeWidth="2.2" strokeLinecap="round" className="animate-sawdust-burst" />
        <circle cx="84" cy="80" r="2.2" fill="#FBBF24" className="animate-sawdust-burst" />

        {/* Formão (Chisel) inclinado */}
        <g transform="translate(38, 38) rotate(32)">
          {/* Cabo de madeira torneado com anel de latão */}
          <rect x="0" y="0" width="14" height="32" rx="6" fill="#B45309" stroke="#FDE68A" strokeWidth="1.3" />
          <rect x="1" y="28" width="12" height="5" fill="#FBBF24" />
          {/* Lâmina chanfrada de aço */}
          <polygon points="3,33 11,33 13,68 1,68" fill="#E2E8F0" stroke="#64748B" strokeWidth="1.2" />
          <polygon points="1,62 13,62 14,72 0,72" fill="#94A3B8" />
        </g>

        {/* Malho de Marcenaria (Wooden Mallet) batendo */}
        <g className="animate-mallet-tap" style={{ transformOrigin: "25px 75px" }}>
          {/* Cabo do malho */}
          <rect x="20" y="34" width="8" height="46" rx="3" transform="rotate(-28 20 34)" fill="#D97706" stroke="#78350F" strokeWidth="1.2" />
          {/* Cabeça robusta chanfrada do malho */}
          <polygon
            points="4,28 38,10 48,30 14,48"
            fill="#78350F"
            stroke="#FBBF24"
            strokeWidth="1.5"
          />
          <line x1="12" y1="34" x2="38" y2="20" stroke="#FDE68A" strokeWidth="1.2" strokeOpacity="0.6" />
        </g>
      </svg>
    </div>
  );
};

/**
 * 6. PARAFUSADEIRA / FURADEIRA DE MARCENARIA (AnimatedCordlessDrill)
 * Parafusadeira profissional fixando parafuso dourado com giro na ponteira!
 */
export const AnimatedCordlessDrill: React.FC<{
  className?: string;
  size?: "sm" | "md" | "lg";
}> = ({ className, size = "md" }) => {
  const sizeClasses = {
    sm: "w-14 h-14",
    md: "w-20 h-20",
    lg: "w-28 h-28",
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", sizeClasses[size], className)}>
      <svg viewBox="0 0 140 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
        <g className="animate-drill-vibe">
          {/* Corpo do Motor da Parafusadeira (Amarelo/Âmbar Industrial & Preto) */}
          <rect x="20" y="22" width="58" height="34" rx="10" fill="#D97706" stroke="#FEF3C7" strokeWidth="1.5" />
          <rect x="28" y="29" width="24" height="10" rx="3" fill="#26170C" />
          {/* Fendas de ventilação do motor */}
          <line x1="58" y1="29" x2="58" y2="49" stroke="#451A03" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="64" y1="29" x2="64" y2="49" stroke="#451A03" strokeWidth="2.5" strokeLinecap="round" />

          {/* Mandril cônico metálico */}
          <polygon points="78,27 94,31 94,47 78,51" fill="#475569" stroke="#CBD5E1" strokeWidth="1.2" />
          <rect x="94" y="34" width="6" height="10" fill="#94A3B8" />

          {/* Ponteira Bit + Parafuso girando */}
          <line x1="100" y1="39" x2="118" y2="39" stroke="#E2E8F0" strokeWidth="3" />
          <path d="M 118 35 L 132 39 L 118 43 Z" fill="#FBBF24" />
          {/* Rosca do parafuso */}
          <line x1="121" y1="35" x2="123" y2="43" stroke="#78350F" strokeWidth="1.3" />
          <line x1="125" y1="36" x2="127" y2="42" stroke="#78350F" strokeWidth="1.3" />

          {/* Empunhadura Anatômica & Gatilho */}
          <path d="M 30 56 L 50 56 L 42 96 L 22 96 Z" fill="#B45309" stroke="#FBBF24" strokeWidth="1.4" />
          <rect x="50" y="58" width="7" height="12" rx="2" fill="#EF4444" />

          {/* Bateria de Lítio na Base */}
          <rect x="16" y="94" width="36" height="16" rx="4" fill="#26170C" stroke="#F59E0B" strokeWidth="1.5" />
          <rect x="22" y="100" width="12" height="4" rx="1" fill="#10B981" />
        </g>

        {/* Brilho de torque no parafuso */}
        <circle cx="128" cy="39" r="9" stroke="#FDE68A" strokeWidth="1.2" strokeDasharray="3 3" className="animate-spin-saw-fast" style={{ transformOrigin: "128px 39px" }} />
      </svg>
    </div>
  );
};

/**
 * 7. TRENA DE MARCENARIA, ESQUADRO & COMPASSO (AnimatedTapeMeasure)
 * Trena puxando fita amarela milimetrada + compasso de precisão!
 */
export const AnimatedTapeMeasure: React.FC<{
  className?: string;
  size?: "sm" | "md" | "lg";
}> = ({ className, size = "md" }) => {
  const sizeClasses = {
    sm: "w-14 h-12",
    md: "w-24 h-16",
    lg: "w-32 h-22",
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", sizeClasses[size], className)}>
      <svg viewBox="0 0 180 110" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
        {/* Fita Amarela Milimetrada esticada */}
        <g className="animate-tape-extend">
          <rect x="58" y="68" width="110" height="14" rx="2" fill="#FBBF24" stroke="#92400E" strokeWidth="1.3" />
          {/* Tracinhos de milímetros na fita */}
          <path
            d="M 66 68 V 74 M 74 68 V 77 M 82 68 V 74 M 90 68 V 77 M 98 68 V 74 M 106 68 V 77 M 114 68 V 74 M 122 68 V 77 M 130 68 V 74 M 138 68 V 77 M 146 68 V 74 M 154 68 V 77"
            stroke="#451A03"
            strokeWidth="1.3"
          />
          {/* Gancho metálico na ponta da trena */}
          <path d="M 168 64 L 173 64 L 173 86 L 165 86" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* Corpo da Trena (Couro Marrom & Latão Dourado) */}
        <path
          d="M 16 48 C 16 30, 32 22, 50 22 C 66 22, 74 34, 74 52 L 74 82 L 24 82 C 18 82, 16 74, 16 64 Z"
          fill="#92400E"
          stroke="#FDE68A"
          strokeWidth="1.8"
        />
        <circle cx="46" cy="54" r="15" fill="#D97706" stroke="#FEF3C7" strokeWidth="1.5" />
        <circle cx="46" cy="54" r="6" fill="#451A03" />
        {/* Trava da trena */}
        <rect x="68" y="38" width="9" height="14" rx="3" fill="#FBBF24" stroke="#451A03" strokeWidth="1" />
      </svg>
    </div>
  );
};

/**
 * 8. CHAPAS DE MDF, TORAS DE MADEIRA & GRAMPO SARGENTO (AnimatedMdfPlanksAndClamps)
 * Pilha de pranchas de madeira nobre com anéis do tronco e grampo sargento de marcenaria!
 */
export const AnimatedMdfPlanksAndClamps: React.FC<{
  className?: string;
  size?: "sm" | "md" | "lg";
}> = ({ className, size = "md" }) => {
  const sizeClasses = {
    sm: "w-14 h-12",
    md: "w-24 h-16",
    lg: "w-32 h-22",
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", sizeClasses[size], className)}>
      <svg viewBox="0 0 180 115" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
        {/* 3 Chapas de Madeira / MDF Empilhadas (Freijó, Imbuia, Carvalho) */}
        <g>
          {/* Chapa 3 (Base - Imbuia Escura) */}
          <rect x="18" y="74" width="136" height="16" rx="4" fill="#78350F" stroke="#D97706" strokeWidth="1.3" />
          <circle cx="30" cy="82" r="4" stroke="#FBBF24" strokeWidth="0.9" strokeOpacity="0.6" />
          <path d="M 45 82 Q 85 77 140 83" stroke="#451A03" strokeWidth="1.2" />

          {/* Chapa 2 (Meio - Freijó Dourado) */}
          <rect x="24" y="54" width="130" height="16" rx="4" fill="#B45309" stroke="#FBBF24" strokeWidth="1.3" />
          <circle cx="36" cy="62" r="4" stroke="#FDE68A" strokeWidth="0.9" strokeOpacity="0.6" />
          <path d="M 50 62 Q 95 67 142 60" stroke="#78350F" strokeWidth="1.2" />

          {/* Chapa 1 (Topo - Carvalho Mel) */}
          <rect x="30" y="34" width="124" height="16" rx="4" fill="#D97706" stroke="#FEF3C7" strokeWidth="1.3" />
          <circle cx="42" cy="42" r="4" stroke="#451A03" strokeWidth="0.9" strokeOpacity="0.6" />
          <path d="M 56 42 Q 100 37 144 43" stroke="#78350F" strokeWidth="1.2" />
        </g>

        {/* Grampo Sargento "F" de Marcenaria Prendendo as Chapas */}
        <g transform="translate(105, 10)">
          {/* Haste vertical de aço */}
          <rect x="20" y="4" width="6" height="96" rx="2" fill="#CBD5E1" stroke="#475569" strokeWidth="1.2" />
          {/* Braço superior do sargento */}
          <rect x="0" y="8" width="26" height="8" rx="2" fill="#EF4444" stroke="#FCA5A5" strokeWidth="1" />
          {/* Braço inferior do sargento */}
          <rect x="0" y="84" width="26" height="8" rx="2" fill="#EF4444" stroke="#FCA5A5" strokeWidth="1" />
          {/* Rosca e cabo de madeira do aperto */}
          <line x1="6" y1="84" x2="6" y2="74" stroke="#E2E8F0" strokeWidth="3" />
          <rect x="1" y="92" width="10" height="14" rx="4" fill="#B45309" stroke="#FDE68A" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
};

/**
 * 9. PAINEL DE FERRAMENTAS DA OFICINA (ToolRackWidget)
 * Um quadro de ferramentas de marcenaria (Pegboard) com Formão, Malho, Esquadro,
 * Trena, Parafusadeira e Serrote pendurados! Ideal para a barra lateral.
 */
export const ToolRackWidget: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        "p-3 rounded-2xl bg-gradient-to-br from-[#472c18] via-[#382212] to-[#29180c] border border-amber-500/35 shadow-inner relative overflow-hidden group",
        className
      )}
    >
      {/* Furos de Pegboard de oficina ao fundo */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#FBBF24 1px, transparent 1px)",
          backgroundSize: "10px 10px",
        }}
      />

      <div className="relative z-10 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-200 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            Quadro da Oficina BJL
          </span>
          <span className="text-[8px] font-mono text-amber-300/80 bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-500/25">
            ARTESANAL
          </span>
        </div>

        {/* Mini Galeria de 4 Ferramentas Diferentes na Bancada */}
        <div className="grid grid-cols-4 gap-1.5 pt-1 items-center justify-items-center bg-[#231409]/60 rounded-xl p-1.5 border border-amber-500/20">
          <div title="Móveis Planejados 3D">
            <AnimatedCabinet3D size="sm" className="w-9 h-9" />
          </div>
          <div title="Formão & Malho">
            <AnimatedHammerAndChisel size="sm" className="w-9 h-9" />
          </div>
          <div title="Plaina Manual">
            <AnimatedWoodPlane size="sm" className="w-10 h-8" />
          </div>
          <div title="Trena & Medição">
            <AnimatedTapeMeasure size="sm" className="w-10 h-8" />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Barra de Progresso Estilo Tábua de Marcenaria com Plaina ou Serrote
 */
export const WoodCuttingProgressBar: React.FC<{
  percent: number;
  className?: string;
  showSaw?: boolean;
  height?: "sm" | "md" | "lg";
  colorVariant?: "wood" | "emerald" | "amber";
}> = ({
  percent,
  className,
  showSaw = true,
  height = "md",
  colorVariant = "wood",
}) => {
  const clamped = Math.min(Math.max(percent, 2), 100);
  const heightClasses = {
    sm: "h-2.5",
    md: "h-4",
    lg: "h-5",
  };

  const fillGradients = {
    wood: "from-[#92400E] via-[#D97706] to-[#FBBF24]",
    emerald: "from-emerald-700 via-emerald-500 to-emerald-300",
    amber: "from-amber-700 via-amber-500 to-yellow-300",
  };

  return (
    <div className={cn("relative w-full py-2", className)}>
      <div
        className={cn(
          "w-full rounded-full overflow-hidden relative border border-amber-500/40 bg-[#22140a] p-[2px] shadow-inner",
          heightClasses[height]
        )}
      >
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(251,191,36,0.5) 0px, rgba(251,191,36,0.5) 1px, transparent 1px, transparent 8px)",
          }}
        />
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden bg-gradient-to-r shadow-[0_0_18px_rgba(245,158,11,0.55)]",
            fillGradients[colorVariant]
          )}
          style={{ width: `${clamped}%` }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "repeating-linear-gradient(115deg, rgba(69,26,3,0.45) 0px, rgba(69,26,3,0.45) 2px, transparent 2px, transparent 10px)",
            }}
          />
        </div>
      </div>

      {showSaw && (
        <div
          className="absolute -top-4 transition-all duration-1000 ease-out z-20 pointer-events-none"
          style={{ left: `calc(${Math.min(Math.max(clamped, 6), 92)}% - 24px)` }}
        >
          <AnimatedWoodPlane size="sm" />
        </div>
      )}
    </div>
  );
};

/**
 * Divisor de Marchetaria & Veios de Madeira
 */
export const SawToothDivider: React.FC<{
  className?: string;
  variant?: "sawtooth" | "woodwave";
}> = ({ className }) => {
  return (
    <div className={cn("w-full overflow-hidden leading-none select-none pointer-events-none", className)}>
      <svg
        viewBox="0 0 1200 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-4"
        preserveAspectRatio="none"
      >
        {/* Filete duplo de marchetaria com losangos artesanais no centro */}
        <line x1="0" y1="12" x2="540" y2="12" stroke="rgba(251, 191, 36, 0.3)" strokeWidth="1.5" />
        <line x1="660" y1="12" x2="1200" y2="12" stroke="rgba(251, 191, 36, 0.3)" strokeWidth="1.5" />
        <polygon points="565,12 580,5 595,12 580,19" fill="rgba(245, 158, 11, 0.25)" stroke="#FBBF24" strokeWidth="1.2" />
        <polygon points="600,12 608,7 616,12 608,17" fill="#FBBF24" />
        <polygon points="621,12 636,5 651,12 636,19" fill="rgba(245, 158, 11, 0.25)" stroke="#FBBF24" strokeWidth="1.2" />
      </svg>
    </div>
  );
};

/**
 * CENA COMPLETA DO ESTÚDIO DE MARCENARIA & MÓVEIS PLANEJADOS (CarpentryWorkbenchScene)
 * Combina diferentes elementos conforme a variante (`variant`):
 * - "studio": Móvel Planejado 3D + Trena + Esquadro (para Vendas / CRM / Cockpit)
 * - "tools": Formão & Malho + Plaina + Parafusadeira (para Ordens de Serviço / Produção)
 * - "materials": Chapas de MDF & Grampo Sargento + Trena (para Estoque / Pedidos)
 * - "workbench": Bancada Clássica com Plaina, Móvel 3D e Ferramentas
 */
export const CarpentryWorkbenchScene: React.FC<{
  className?: string;
  compact?: boolean;
  variant?: "studio" | "tools" | "materials" | "workbench";
}> = ({ className, compact = false, variant = "studio" }) => {
  if (variant === "tools") {
    return (
      <div className={cn("relative flex items-center gap-2 select-none pointer-events-none", className)}>
        <div className="absolute inset-0 bg-amber-500/15 rounded-full blur-2xl" />
        <AnimatedHammerAndChisel size={compact ? "sm" : "md"} />
        <AnimatedCordlessDrill size={compact ? "sm" : "md"} />
        <AnimatedWoodPlane size={compact ? "sm" : "md"} />
      </div>
    );
  }

  if (variant === "materials") {
    return (
      <div className={cn("relative flex items-center gap-2 select-none pointer-events-none", className)}>
        <div className="absolute inset-0 bg-amber-500/15 rounded-full blur-2xl" />
        <AnimatedMdfPlanksAndClamps size={compact ? "md" : "lg"} />
        <AnimatedTapeMeasure size={compact ? "sm" : "md"} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-center gap-2 select-none pointer-events-none",
        className
      )}
    >
      <div className="absolute inset-0 bg-amber-500/15 rounded-full blur-2xl" />
      <AnimatedCabinet3D size={compact ? "md" : "lg"} />
      <div className="flex flex-col items-center -ml-2">
        <AnimatedWoodPlane size={compact ? "sm" : "md"} />
        <AnimatedTapeMeasure size="sm" className="-mt-2" />
      </div>
    </div>
  );
};

/**
 * MURAL DE FUNDO DA OFICINA DE MARCENARIA (FloatingSawdustBackground)
 * Desenhos variados em estilo Blueprint/Gravura de Marcenaria espalhados sutilmente:
 * - Projeto 3D de Armário Planejado com cotas
 * - Plaina manual, Formão & Malho, Trena, Parafusadeira, Chapas de MDF e Grampo Sargento
 * - Veios naturais de madeira Nogueira/Imbuia
 */
export const FloatingSawdustBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Textura de Veios de Madeira Nobre */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.05]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="woodGrainPattern"
            width="360"
            height="360"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 0 40 Q 90 18, 180 40 T 360 40 M 0 110 Q 100 138, 200 105 T 360 110 M 0 185 Q 80 155, 175 190 T 360 185 M 0 260 Q 120 285, 230 250 T 360 260 M 0 325 Q 95 300, 195 330 T 360 325"
              fill="none"
              stroke="#FBBF24"
              strokeWidth="1.3"
            />
            <ellipse cx="180" cy="185" rx="52" ry="15" fill="none" stroke="#F59E0B" strokeWidth="1" />
            <ellipse cx="180" cy="185" rx="26" ry="7.5" fill="none" stroke="#FDE68A" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#woodGrainPattern)" />
      </svg>

      {/* Marca d'água 1: Projeto 3D de Móvel Planejado no canto superior direito */}
      <div className="absolute right-8 top-20 opacity-[0.07] hidden xl:block">
        <AnimatedCabinet3D className="w-[260px] h-[260px]" />
      </div>

      {/* Marca d'água 2: Formão & Malho de Entalhe à esquerda */}
      <div className="absolute left-64 bottom-12 opacity-[0.06] hidden lg:block">
        <AnimatedHammerAndChisel className="w-[190px] h-[190px]" />
      </div>

      {/* Marca d'água 3: Plaina Manual & Maravalhas no centro-direita inferior */}
      <div className="absolute right-20 bottom-16 opacity-[0.06] hidden xl:block">
        <AnimatedWoodPlane className="w-[220px] h-[140px]" />
      </div>

      {/* Marca d'água 4: Pilha de Chapas MDF & Sargento no centro-esquerda superior */}
      <div className="absolute left-72 top-24 opacity-[0.05] hidden 2xl:block">
        <AnimatedMdfPlanksAndClamps className="w-[200px] h-[130px]" />
      </div>

      {/* Partículas de Serragem Dourada Flutuantes */}
      <div className="sawdust-particle left-[15%] top-[24%] animate-float-slow" />
      <div className="sawdust-particle left-[32%] top-[70%] animate-float-medium" />
      <div className="sawdust-particle left-[52%] top-[32%] animate-float-fast" />
      <div className="sawdust-particle left-[68%] top-[76%] animate-float-slow" />
      <div className="sawdust-particle left-[84%] top-[30%] animate-float-medium" />
    </div>
  );
};

/**
 * Selo Artesanal de Marchetaria & Marcenaria (com ícone variável!)
 */
export const MarcenariaBadge: React.FC<{
  label?: string;
  className?: string;
  variant?: "saw" | "blade" | "cabinet" | "plane" | "chisel" | "tape" | "drill";
}> = ({ label = "Marcenaria & Móveis Planejados", className, variant = "cabinet" }) => {
  const renderMiniArt = () => {
    switch (variant) {
      case "cabinet":
        return <AnimatedCabinet3D size="sm" className="w-5 h-5 -my-1" />;
      case "plane":
        return <AnimatedWoodPlane size="sm" className="w-7 h-4 -my-1" />;
      case "chisel":
        return <AnimatedHammerAndChisel size="sm" className="w-5 h-5 -my-1" />;
      case "tape":
        return <AnimatedTapeMeasure size="sm" className="w-6 h-4 -my-1" />;
      case "drill":
        return <AnimatedCordlessDrill size="sm" className="w-5 h-5 -my-1" />;
      case "blade":
        return <SpinningSawBlade size="sm" className="w-4 h-4" />;
      case "saw":
      default:
        return <AnimatedHandsaw size="sm" className="w-7 h-4 -my-1" animate={true} showSawdust={false} />;
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-700/20 to-amber-950/40 border border-amber-400/40 text-amber-200 text-[10px] font-bold uppercase tracking-wider shadow-[0_4px_15px_rgba(245,158,11,0.15)] group cursor-default",
        className
      )}
    >
      {renderMiniArt()}
      <span>{label}</span>
    </div>
  );
};
