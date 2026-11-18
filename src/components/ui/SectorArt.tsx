import React from "react";
import { cn } from "@/lib/utils";

type ArtSize = "sm" | "md" | "lg" | "xl";

const standardSizes: Record<ArtSize, string> = {
  sm: "w-10 h-10",
  md: "w-16 h-16",
  lg: "w-24 h-24",
  xl: "w-32 h-32",
};

/**
 * 1. BANCO & COFRE EXECUTIVO (AnimatedBankBuilding)
 * Fachada clássica de banco com colunas douradas, cofre giratório e moedas flutuantes.
 * Ideal para o módulo Financeiro & DRE.
 */
export const AnimatedBankBuilding: React.FC<{
  className?: string;
  size?: ArtSize;
}> = ({ className, size = "lg" }) => {
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center select-none pointer-events-none",
        standardSizes[size],
        className
      )}
    >
      <svg
        viewBox="0 0 180 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible drop-shadow-[0_10px_22px_rgba(245,158,11,0.28)]"
      >
        <defs>
          <linearGradient id="bankGoldGrad" x1="20" y1="15" x2="160" y2="135" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="45%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>
          <linearGradient id="bankWallGrad" x1="30" y1="45" x2="150" y2="130" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#5C3A20" />
            <stop offset="100%" stopColor="#2A180B" />
          </linearGradient>
          <linearGradient id="vaultSteelGrad" x1="68" y1="68" x2="112" y2="112" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="50%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
        </defs>

        {/* Sombra base */}
        <ellipse cx="90" cy="138" rx="70" ry="8" fill="rgba(245, 158, 11, 0.16)" />

        {/* Degraus da base do Banco */}
        <rect x="18" y="126" width="144" height="8" rx="3" fill="#78350F" stroke="#F59E0B" strokeWidth="1.2" />
        <rect x="26" y="118" width="128" height="8" rx="2.5" fill="#92400E" stroke="#FBBF24" strokeWidth="1.2" />

        {/* Corpo interno do prédio */}
        <rect x="32" y="54" width="116" height="64" rx="4" fill="url(#bankWallGrad)" stroke="rgba(251,191,36,0.35)" strokeWidth="1.2" />

        {/* 4 Colunas clássicas */}
        {[38, 60, 110, 132].map((xPos, idx) => (
          <g key={idx}>
            <rect x={xPos} y="56" width="10" height="60" rx="2" fill="url(#bankGoldGrad)" stroke="#451A03" strokeWidth="1" />
            <rect x={xPos - 2} y="54" width="14" height="5" rx="1.5" fill="#FDE68A" />
            <rect x={xPos - 2} y="113" width="14" height="5" rx="1.5" fill="#D97706" />
          </g>
        ))}

        {/* Porta / Cofre Central */}
        <rect x="73" y="64" width="34" height="54" rx="4" fill="#1A0F07" stroke="#FBBF24" strokeWidth="1.4" />
        <circle cx="90" cy="91" r="13" fill="url(#vaultSteelGrad)" stroke="#FBBF24" strokeWidth="1.4" />
        <g className="animate-vault-dial">
          <circle cx="90" cy="91" r="6" fill="#1E293B" stroke="#FDE68A" strokeWidth="1" />
          <line x1="90" y1="81" x2="90" y2="101" stroke="#FBBF24" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="80" y1="91" x2="100" y2="91" stroke="#FBBF24" strokeWidth="1.6" strokeLinecap="round" />
        </g>

        {/* Frontão Triangular Clássico */}
        <polygon
          points="16,52 90,14 164,52"
          fill="url(#bankGoldGrad)"
          stroke="#FEF3C7"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <polygon
          points="32,48 90,22 148,48"
          fill="#3B2311"
          stroke="#F59E0B"
          strokeWidth="1"
        />
        <rect x="24" y="50" width="132" height="6" rx="2" fill="#D97706" stroke="#FEF3C7" strokeWidth="1" />

        {/* Símbolo $ no frontão */}
        <text
          x="90"
          y="43"
          textAnchor="middle"
          fill="#FDE68A"
          fontSize="14"
          fontWeight="900"
          fontFamily="monospace"
        >
          R$
        </text>

        {/* Moedas douradas flutuantes */}
        <g className="animate-coin-float">
          <circle cx="24" cy="30" r="10" fill="#F59E0B" stroke="#FEF3C7" strokeWidth="1.4" />
          <text x="24" y="34" textAnchor="middle" fill="#451A03" fontSize="10" fontWeight="900">$</text>
        </g>
        <g className="animate-coin-float" style={{ animationDelay: "0.9s" }}>
          <circle cx="156" cy="26" r="11" fill="#FBBF24" stroke="#FFFBEB" strokeWidth="1.4" />
          <text x="156" y="30" textAnchor="middle" fill="#451A03" fontSize="11" fontWeight="900">$</text>
        </g>
      </svg>
    </div>
  );
};

/**
 * 2. CARTÃO / INSTITUIÇÃO BANCÁRIA DINÂMICA (AnimatedBankVaultCard)
 * Adapta o desenho conforme a conta selecionada na Conciliação Bancária.
 */
export const AnimatedBankVaultCard: React.FC<{
  account?: string;
  className?: string;
}> = ({ account = "itau", className }) => {
  const isItau = account === "itau" || account === "banco_itau";
  const isNubank = account === "nubank";
  const isDinheiro = account === "dinheiro";
  const isRecargaPay = account === "recarga_pay";

  const primaryColor = isItau
    ? "#EC7000"
    : isNubank
    ? "#A855F7"
    : isDinheiro
    ? "#10B981"
    : isRecargaPay
    ? "#F97316"
    : "#F59E0B";

  const secondaryColor = isItau
    ? "#003D99"
    : isNubank
    ? "#581C87"
    : isDinheiro
    ? "#065F46"
    : isRecargaPay
    ? "#7C2D12"
    : "#78350F";

  return (
    <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none w-24 h-20", className)}>
      <svg viewBox="0 0 150 115" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
        <ellipse cx="75" cy="106" rx="54" ry="6" fill={primaryColor} fillOpacity="0.18" />

        {isDinheiro ? (
          /* Gaveta / Maço de Cédulas & Moedas */
          <g>
            <rect x="22" y="42" width="106" height="54" rx="10" fill={secondaryColor} stroke={primaryColor} strokeWidth="2" />
            <rect x="30" y="50" width="90" height="38" rx="6" fill="#064E3B" stroke="#34D399" strokeWidth="1.2" strokeDasharray="4 3" />
            <circle cx="75" cy="69" r="12" fill="#10B981" stroke="#A7F3D0" strokeWidth="1.5" />
            <text x="75" y="73" textAnchor="middle" fill="#ECFDF5" fontSize="12" fontWeight="900">$</text>
            <g className="animate-coin-float">
              <circle cx="118" cy="30" r="11" fill="#FBBF24" stroke="#FEF3C7" strokeWidth="1.5" />
              <text x="118" y="34" textAnchor="middle" fill="#451A03" fontSize="11" fontWeight="900">$</text>
            </g>
          </g>
        ) : (
          /* Cartão Corporativo + Mini Prédio Bancário */
          <g>
            {/* Prédio ao fundo */}
            <polygon points="78,34 112,14 146,34" fill={primaryColor} fillOpacity="0.85" stroke="#FEF3C7" strokeWidth="1.2" />
            <rect x="84" y="34" width="56" height="40" rx="3" fill={secondaryColor} stroke={primaryColor} strokeWidth="1.2" />
            <rect x="92" y="40" width="6" height="28" rx="1" fill="#FDE68A" fillOpacity="0.85" />
            <rect x="109" y="40" width="6" height="28" rx="1" fill="#FDE68A" fillOpacity="0.85" />
            <rect x="126" y="40" width="6" height="28" rx="1" fill="#FDE68A" fillOpacity="0.85" />

            {/* Cartão em primeiro plano */}
            <rect x="12" y="42" width="96" height="60" rx="10" fill={secondaryColor} stroke={primaryColor} strokeWidth="2" />
            <rect x="12" y="54" width="96" height="10" fill={primaryColor} fillOpacity="0.28" />
            {/* Chip dourado */}
            <rect x="24" y="70" width="16" height="12" rx="3" fill="#FBBF24" stroke="#FEF3C7" strokeWidth="1" />
            <line x1="24" y1="76" x2="40" y2="76" stroke="#78350F" strokeWidth="0.9" />
            <line x1="32" y1="70" x2="32" y2="82" stroke="#78350F" strokeWidth="0.9" />
            {/* Linhas do número */}
            <rect x="48" y="74" width="44" height="4" rx="2" fill="#E2E8F0" fillOpacity="0.6" />
            <rect x="48" y="84" width="28" height="4" rx="2" fill="#E2E8F0" fillOpacity="0.35" />
          </g>
        )}
      </svg>
    </div>
  );
};

/**
 * 3. NOTA FISCAL & SELO SEFAZ (AnimatedInvoiceStamp)
 * Documento fiscal estilizado com selo dourado de autorização.
 */
export const AnimatedInvoiceStamp: React.FC<{
  className?: string;
  size?: ArtSize;
}> = ({ className, size = "md" }) => (
  <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", standardSizes[size], className)}>
    <svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
      <rect x="26" y="14" width="84" height="110" rx="10" fill="#3B2311" stroke="#F59E0B" strokeWidth="2" />
      <rect x="38" y="28" width="44" height="8" rx="3" fill="#FBBF24" />
      <rect x="38" y="46" width="60" height="5" rx="2.5" fill="#FDE68A" fillOpacity="0.55" />
      <rect x="38" y="58" width="52" height="5" rx="2.5" fill="#FDE68A" fillOpacity="0.35" />
      <rect x="38" y="70" width="58" height="5" rx="2.5" fill="#FDE68A" fillOpacity="0.35" />
      <rect x="38" y="86" width="32" height="10" rx="3" fill="rgba(16,185,129,0.22)" stroke="#10B981" strokeWidth="1.2" />
      <text x="54" y="94" textAnchor="middle" fill="#6EE7B7" fontSize="6.5" fontWeight="900">NF-e</text>

      {/* Selo de autorização animado */}
      <g className="animate-check-pop">
        <circle cx="102" cy="98" r="20" fill="#10B981" stroke="#ECFDF5" strokeWidth="2" />
        <path d="M 93 98 L 99 104 L 112 91" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  </div>
);

/**
 * 4. PRANCHETA DE PROJETO & PLANTA BAIXA (AnimatedBlueprintBoard)
 * Prancheta de marcenaria sob medida com esquadro, desenho técnico de armário e lápis.
 */
export const AnimatedBlueprintBoard: React.FC<{
  className?: string;
  size?: ArtSize;
}> = ({ className, size = "lg" }) => (
  <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", standardSizes[size], className)}>
    <svg viewBox="0 0 180 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible drop-shadow-[0_10px_22px_rgba(245,158,11,0.24)]">
      <ellipse cx="90" cy="136" rx="68" ry="7" fill="rgba(245, 158, 11, 0.14)" />

      {/* Base da Prancheta em Madeira */}
      <rect x="20" y="22" width="132" height="104" rx="10" fill="#78350F" stroke="#FBBF24" strokeWidth="2" />
      {/* Folha de Projeto Técnico */}
      <rect x="30" y="30" width="112" height="88" rx="5" fill="#1E293B" stroke="#38BDF8" strokeWidth="1.2" />

      {/* Grade de Planta Baixa */}
      <path d="M 30 52 H 142 M 30 74 H 142 M 30 96 H 142 M 58 30 V 118 M 86 30 V 118 M 114 30 V 118" stroke="#38BDF8" strokeOpacity="0.16" strokeWidth="1" />

      {/* Desenho Técnico de Cozinha Planejada */}
      <rect x="44" y="44" width="66" height="22" rx="2" stroke="#FBBF24" strokeWidth="1.6" fill="rgba(245,158,11,0.12)" />
      <line x1="66" y1="44" x2="66" y2="66" stroke="#FBBF24" strokeWidth="1.2" />
      <line x1="88" y1="44" x2="88" y2="66" stroke="#FBBF24" strokeWidth="1.2" />
      <rect x="44" y="76" width="82" height="28" rx="2" stroke="#38BDF8" strokeWidth="1.6" fill="rgba(56,189,248,0.1)" />
      <line x1="72" y1="76" x2="72" y2="104" stroke="#38BDF8" strokeWidth="1.2" />
      <line x1="100" y1="76" x2="100" y2="104" stroke="#38BDF8" strokeWidth="1.2" />

      {/* Esquadro Metálico */}
      <polygon points="104,116 146,116 146,74" fill="rgba(251,191,36,0.22)" stroke="#FBBF24" strokeWidth="1.6" strokeLinejoin="round" />

      {/* Lápis de Carpinteiro Animado */}
      <g className="animate-pencil-sketch">
        <g transform="translate(115, 24) rotate(35)">
          <rect x="0" y="0" width="12" height="58" rx="2" fill="#F59E0B" stroke="#FEF3C7" strokeWidth="1.2" />
          <polygon points="0,58 12,58 6,70" fill="#FDE68A" stroke="#78350F" strokeWidth="1" />
          <polygon points="4,66 8,66 6,70" fill="#0F172A" />
          <rect x="0" y="-8" width="12" height="8" rx="2" fill="#EF4444" stroke="#FCA5A5" strokeWidth="1" />
        </g>
      </g>
    </svg>
  </div>
);

/**
 * 5. ESQUADREJADEIRA & LINHA DE CORTE (AnimatedPanelSaw)
 * Serra circular de bancada cortando chapa de MDF com guia de precisão.
 * Ideal para Ordens de Serviço & Produção.
 */
export const AnimatedPanelSaw: React.FC<{
  className?: string;
  size?: ArtSize;
}> = ({ className, size = "lg" }) => (
  <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", standardSizes[size], className)}>
    <svg viewBox="0 0 180 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible drop-shadow-[0_10px_22px_rgba(245,158,11,0.26)]">
      <ellipse cx="90" cy="136" rx="70" ry="7" fill="rgba(245, 158, 11, 0.16)" />

      {/* Pés e Mesa da Esquadrejadeira */}
      <rect x="34" y="90" width="12" height="40" rx="2" fill="#451A03" stroke="#D97706" strokeWidth="1.2" />
      <rect x="134" y="90" width="12" height="40" rx="2" fill="#451A03" stroke="#D97706" strokeWidth="1.2" />
      <rect x="20" y="76" width="140" height="16" rx="4" fill="#64748B" stroke="#E2E8F0" strokeWidth="1.5" />

      {/* Chapa de MDF sobre a mesa */}
      <rect x="30" y="64" width="110" height="12" rx="2.5" fill="#B45309" stroke="#FDE68A" strokeWidth="1.3" />
      <line x1="45" y1="70" x2="125" y2="70" stroke="#78350F" strokeWidth="1.2" />

      {/* Disco de Serra Giratório */}
      <g className="animate-spin-saw-fast" style={{ transformOrigin: "92px 66px" }}>
        <circle cx="92" cy="66" r="24" fill="#CBD5E1" stroke="#475569" strokeWidth="1.5" />
        <circle cx="92" cy="66" r="26" stroke="#FBBF24" strokeWidth="2.5" strokeDasharray="4 4" />
        <circle cx="92" cy="66" r="7" fill="#F59E0B" stroke="#78350F" strokeWidth="1.4" />
      </g>

      {/* Coifa Protetora Superior */}
      <path d="M 68 46 Q 92 32 114 48 L 106 54 H 74 Z" fill="#F59E0B" stroke="#FEF3C7" strokeWidth="1.4" />

      {/* Guia paralelo */}
      <rect x="128" y="54" width="10" height="22" rx="2" fill="#F59E0B" stroke="#FEF3C7" strokeWidth="1" />
    </svg>
  </div>
);

/**
 * 6. PRATELEIRA INDUSTRIAL DE CHAPAS MDF (AnimatedLumberRack)
 * Estante de almoxarifado com chapas empilhadas e caixas de ferragens.
 */
export const AnimatedLumberRack: React.FC<{
  className?: string;
  size?: ArtSize;
}> = ({ className, size = "lg" }) => (
  <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", standardSizes[size], className)}>
    <svg viewBox="0 0 180 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible drop-shadow-[0_10px_22px_rgba(245,158,11,0.22)]">
      <ellipse cx="90" cy="138" rx="68" ry="7" fill="rgba(245, 158, 11, 0.14)" />

      {/* Estrutura metálica do Rack */}
      <rect x="26" y="18" width="8" height="114" rx="2" fill="#94A3B8" stroke="#475569" strokeWidth="1.2" />
      <rect x="146" y="18" width="8" height="114" rx="2" fill="#94A3B8" stroke="#475569" strokeWidth="1.2" />

      {/* Prateleira 1 (Topo): Caixas de Ferragens */}
      <rect x="24" y="48" width="132" height="6" rx="2" fill="#F59E0B" />
      <rect x="40" y="24" width="32" height="24" rx="4" fill="#D97706" stroke="#FEF3C7" strokeWidth="1.3" />
      <rect x="48" y="31" width="16" height="4" rx="1.5" fill="#451A03" />
      <rect x="78" y="24" width="32" height="24" rx="4" fill="#B45309" stroke="#FBBF24" strokeWidth="1.3" />
      <rect x="86" y="31" width="16" height="4" rx="1.5" fill="#451A03" />
      <rect x="116" y="28" width="24" height="20" rx="4" fill="#10B981" fillOpacity="0.85" stroke="#A7F3D0" strokeWidth="1.2" />

      {/* Prateleira 2 (Meio): Chapas de MDF Claras */}
      <rect x="24" y="88" width="132" height="6" rx="2" fill="#F59E0B" />
      <rect x="38" y="64" width="104" height="7" rx="2" fill="#FDE68A" stroke="#D97706" strokeWidth="1" />
      <rect x="38" y="72" width="104" height="7" rx="2" fill="#F59E0B" stroke="#78350F" strokeWidth="1" />
      <rect x="38" y="80" width="104" height="7" rx="2" fill="#B45309" stroke="#FBBF24" strokeWidth="1" />

      {/* Prateleira 3 (Base): Chapas Imbuia */}
      <rect x="24" y="124" width="132" height="6" rx="2" fill="#F59E0B" />
      <rect x="38" y="102" width="104" height="10" rx="2" fill="#78350F" stroke="#F59E0B" strokeWidth="1.1" />
      <rect x="38" y="113" width="104" height="10" rx="2" fill="#92400E" stroke="#FBBF24" strokeWidth="1.1" />
    </svg>
  </div>
);

/**
 * 7. RETALHOS & SOBRAS ENCAIXADAS (AnimatedOffcutsPuzzle)
 * Peças aproveitadas de MDF com cotas de medida.
 */
export const AnimatedOffcutsPuzzle: React.FC<{
  className?: string;
  size?: ArtSize;
}> = ({ className, size = "lg" }) => (
  <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", standardSizes[size], className)}>
    <svg viewBox="0 0 180 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
      <rect x="22" y="24" width="76" height="52" rx="5" fill="#B45309" stroke="#FDE68A" strokeWidth="1.8" />
      <rect x="104" y="24" width="54" height="76" rx="5" fill="#92400E" stroke="#FBBF24" strokeWidth="1.8" />
      <rect x="22" y="82" width="76" height="44" rx="5" fill="#D97706" stroke="#FEF3C7" strokeWidth="1.8" />
      <rect x="104" y="106" width="54" height="20" rx="4" fill="#78350F" stroke="#F59E0B" strokeWidth="1.5" />
      <text x="60" y="54" textAnchor="middle" fill="#FEF3C7" fontSize="11" fontWeight="900" fontFamily="monospace">120x60</text>
      <text x="131" y="66" textAnchor="middle" fill="#FDE68A" fontSize="10" fontWeight="900" fontFamily="monospace">85x45</text>
    </svg>
  </div>
);

/**
 * 8. CAMINHÃO DE ENTREGA & SUPRIMENTOS (AnimatedDeliveryTruck)
 * Furgão da marcenaria carregado com chapas e ferragens.
 */
export const AnimatedDeliveryTruck: React.FC<{
  className?: string;
  size?: ArtSize;
}> = ({ className, size = "lg" }) => (
  <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", standardSizes[size], className)}>
    <svg viewBox="0 0 190 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible drop-shadow-[0_10px_20px_rgba(245,158,11,0.25)]">
      {/* Estrada */}
      <line x1="12" y1="122" x2="178" y2="122" stroke="rgba(251,191,36,0.4)" strokeWidth="2.5" strokeDasharray="10 6" strokeLinecap="round" />

      <g className="animate-truck-ride">
        {/* Baú de Carga */}
        <rect x="18" y="34" width="102" height="68" rx="8" fill="#78350F" stroke="#FBBF24" strokeWidth="2" />
        {/* Faixa Dourada no Baú */}
        <rect x="18" y="58" width="102" height="12" fill="rgba(245,158,11,0.28)" />
        <text x="69" y="67" textAnchor="middle" fill="#FDE68A" fontSize="9.5" fontWeight="900" fontFamily="monospace" letterSpacing="1.5">
          BJL•CARGA
        </text>
        {/* Chapas visíveis no detalhe */}
        <rect x="28" y="42" width="44" height="6" rx="2" fill="#D97706" stroke="#FEF3C7" strokeWidth="0.9" />
        <rect x="28" y="78" width="60" height="14" rx="3" fill="#451A03" stroke="#F59E0B" strokeWidth="1" />

        {/* Cabine do Caminhão */}
        <path d="M 122 52 H 152 L 170 74 V 102 H 122 V 52 Z" fill="#D97706" stroke="#FEF3C7" strokeWidth="2" strokeLinejoin="round" />
        {/* Para-brisa */}
        <polygon points="128,58 148,58 162,74 128,74" fill="#1E293B" stroke="#93C5FD" strokeWidth="1.2" />
        {/* Farol */}
        <rect x="165" y="84" width="6" height="8" rx="2" fill="#FDE047" />
      </g>

      {/* Rodas */}
      <g>
        <circle cx="48" cy="108" r="14" fill="#1E293B" stroke="#FBBF24" strokeWidth="2.2" />
        <circle cx="48" cy="108" r="5" fill="#F59E0B" />
        <circle cx="146" cy="108" r="14" fill="#1E293B" stroke="#FBBF24" strokeWidth="2.2" />
        <circle cx="146" cy="108" r="5" fill="#F59E0B" />
      </g>
    </svg>
  </div>
);

/**
 * 9. PRANCHETA DE TAREFAS & TURNO DA FÁBRICA (AnimatedWorkshopChecklist)
 * Checklist de produção em madeira e latão com selo de conclusão.
 */
export const AnimatedWorkshopChecklist: React.FC<{
  className?: string;
  size?: ArtSize;
}> = ({ className, size = "lg" }) => (
  <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", standardSizes[size], className)}>
    <svg viewBox="0 0 160 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible drop-shadow-[0_10px_20px_rgba(245,158,11,0.22)]">
      <ellipse cx="80" cy="138" rx="52" ry="6" fill="rgba(245, 158, 11, 0.14)" />

      {/* Prancheta de Madeira */}
      <rect x="28" y="22" width="104" height="110" rx="12" fill="#78350F" stroke="#FBBF24" strokeWidth="2" />
      <rect x="36" y="32" width="88" height="92" rx="6" fill="#2A180B" stroke="#D97706" strokeWidth="1.2" />
      {/* Prendedor metálico no topo */}
      <rect x="60" y="14" width="40" height="16" rx="5" fill="#F59E0B" stroke="#FEF3C7" strokeWidth="1.4" />
      <circle cx="80" cy="22" r="3" fill="#451A03" />

      {/* Itens do Checklist */}
      {[48, 70, 92].map((yPos, idx) => (
        <g key={idx}>
          <rect x="46" y={yPos} width="14" height="14" rx="4" fill={idx < 2 ? "#10B981" : "rgba(245,158,11,0.18)"} stroke={idx < 2 ? "#A7F3D0" : "#FBBF24"} strokeWidth="1.4" />
          {idx < 2 && (
            <path d={`M 49 ${yPos + 7} L 52 ${yPos + 10} L 57 ${yPos + 4}`} stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          )}
          <rect x="68" y={yPos + 4} width={idx === 2 ? "38" : "46"} height="6" rx="3" fill="#FDE68A" fillOpacity={idx < 2 ? "0.75" : "0.45"} />
        </g>
      ))}

      {/* Selo de Turno Concluído */}
      <g className="animate-check-pop">
        <circle cx="122" cy="108" r="18" fill="#10B981" stroke="#ECFDF5" strokeWidth="2" />
        <path d="M 114 108 L 120 114 L 131 102" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  </div>
);

/**
 * 10. CASA PLANEJADA & CHAVE NA MÃO (AnimatedHomeProject)
 * Residência estilizada com móveis planejados e chave dourada.
 */
export const AnimatedHomeProject: React.FC<{
  className?: string;
  size?: ArtSize;
}> = ({ className, size = "lg" }) => (
  <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", standardSizes[size], className)}>
    <svg viewBox="0 0 170 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible drop-shadow-[0_10px_22px_rgba(245,158,11,0.24)]">
      <ellipse cx="85" cy="136" rx="64" ry="7" fill="rgba(245, 158, 11, 0.14)" />

      {/* Corpo da Casa */}
      <rect x="34" y="64" width="102" height="64" rx="6" fill="#4A2B14" stroke="#FBBF24" strokeWidth="2" />
      {/* Telhado */}
      <polygon points="20,68 85,18 150,68" fill="#B45309" stroke="#FEF3C7" strokeWidth="2" strokeLinejoin="round" />

      {/* Porta em Madeira */}
      <rect x="70" y="84" width="30" height="44" rx="3" fill="#D97706" stroke="#FEF3C7" strokeWidth="1.5" />
      <circle cx="94" cy="106" r="2.5" fill="#FEF3C7" />

      {/* Janela iluminada */}
      <rect x="44" y="78" width="18" height="18" rx="3" fill="#FDE68A" fillOpacity="0.85" stroke="#F59E0B" strokeWidth="1.2" />
      <rect x="108" y="78" width="18" height="18" rx="3" fill="#FDE68A" fillOpacity="0.85" stroke="#F59E0B" strokeWidth="1.2" />

      {/* Chave Dourada Flutuante */}
      <g className="animate-coin-float">
        <circle cx="136" cy="40" r="11" fill="#FBBF24" stroke="#FFFBEB" strokeWidth="1.5" />
        <circle cx="136" cy="40" r="4" fill="#451A03" />
        <rect x="145" y="38" width="16" height="5" rx="2" fill="#FBBF24" stroke="#FFFBEB" strokeWidth="1" />
      </g>
    </svg>
  </div>
);

/**
 * 11. OFICINA & EQUIPE DE MARCENEIROS (AnimatedCraftsmanWorkshop)
 * Capacete de obra / proteção + esquadro da equipe fabril.
 */
export const AnimatedCraftsmanWorkshop: React.FC<{
  className?: string;
  size?: ArtSize;
}> = ({ className, size = "lg" }) => (
  <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", standardSizes[size], className)}>
    <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
      <ellipse cx="80" cy="126" rx="55" ry="6" fill="rgba(245, 158, 11, 0.16)" />
      {/* Capacete de Marcenaria / Obra */}
      <path d="M 34 86 C 34 46, 126 46, 126 86 Z" fill="#F59E0B" stroke="#FEF3C7" strokeWidth="2" />
      <rect x="24" y="84" width="112" height="12" rx="6" fill="#D97706" stroke="#FEF3C7" strokeWidth="1.8" />
      <rect x="72" y="48" width="16" height="36" rx="4" fill="#FDE68A" stroke="#78350F" strokeWidth="1.2" />
      {/* Estrela / Selo Equipe */}
      <circle cx="80" cy="110" r="10" fill="#10B981" stroke="#ECFDF5" strokeWidth="1.5" />
      <path d="M 75 110 L 79 114 L 86 106" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

/**
 * 12. AGENDA & CALENDÁRIO DA OFICINA (AnimatedWorkshopCalendar)
 * Calendário em moldura de madeira com marcador dourado.
 */
export const AnimatedWorkshopCalendar: React.FC<{
  className?: string;
  size?: ArtSize;
}> = ({ className, size = "lg" }) => (
  <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", standardSizes[size], className)}>
    <svg viewBox="0 0 160 145" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible drop-shadow-[0_10px_20px_rgba(245,158,11,0.22)]">
      <ellipse cx="80" cy="134" rx="56" ry="6" fill="rgba(245, 158, 11, 0.15)" />
      <rect x="24" y="28" width="112" height="96" rx="12" fill="#4A2B14" stroke="#FBBF24" strokeWidth="2" />
      <path d="M 24 40 C 24 33.37 29.37 28 36 28 H 124 C 130.63 28 136 33.37 136 40 V 52 H 24 V 40 Z" fill="#D97706" />
      {/* Argolas */}
      <rect x="46" y="16" width="10" height="20" rx="4" fill="#FDE68A" stroke="#78350F" strokeWidth="1.4" />
      <rect x="104" y="16" width="10" height="20" rx="4" fill="#FDE68A" stroke="#78350F" strokeWidth="1.4" />
      {/* Dias */}
      {[64, 84, 104].map((y, row) =>
        [40, 62, 84, 106].map((x, col) => {
          const isHighlight = row === 1 && col === 2;
          return (
            <rect
              key={`${row}-${col}`}
              x={x}
              y={y}
              width="14"
              height="12"
              rx="3"
              fill={isHighlight ? "#10B981" : "rgba(251, 191, 36, 0.22)"}
              stroke={isHighlight ? "#A7F3D0" : "rgba(251, 191, 36, 0.4)"}
              strokeWidth="1"
            />
          );
        })
      )}
    </svg>
  </div>
);

/**
 * 13. ENGRENAGENS DE PRECISÃO & CONFIGURAÇÕES (AnimatedPrecisionGears)
 * Engrenagens douradas entrelaçadas para Configurações do Sistema.
 */
export const AnimatedPrecisionGears: React.FC<{
  className?: string;
  size?: ArtSize;
}> = ({ className, size = "lg" }) => (
  <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", standardSizes[size], className)}>
    <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible drop-shadow-[0_10px_20px_rgba(245,158,11,0.25)]">
      {/* Engrenagem Maior */}
      <g className="animate-gear-spin">
        <circle cx="66" cy="74" r="32" fill="#B45309" stroke="#FBBF24" strokeWidth="5" strokeDasharray="10 6" />
        <circle cx="66" cy="74" r="22" fill="#4A2B14" stroke="#FDE68A" strokeWidth="2" />
        <circle cx="66" cy="74" r="9" fill="#F59E0B" stroke="#FEF3C7" strokeWidth="1.5" />
      </g>

      {/* Engrenagem Menor */}
      <g className="animate-gear-spin-reverse">
        <circle cx="114" cy="48" r="20" fill="#D97706" stroke="#FEF3C7" strokeWidth="4" strokeDasharray="7 5" />
        <circle cx="114" cy="48" r="13" fill="#3B2311" stroke="#FBBF24" strokeWidth="1.5" />
        <circle cx="114" cy="48" r="5" fill="#FDE68A" />
      </g>
    </svg>
  </div>
);
