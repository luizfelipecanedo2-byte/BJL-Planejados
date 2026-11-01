import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  X,
  Send,
  RefreshCw,
  Key,
  TrendingUp,
  AlertTriangle,
  Calculator,
  Hammer,
  DollarSign,
  Bot,
  User,
  Check,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  askBJLPartnerAI,
  buildBJLBusinessSnapshot,
  BJLPartnerSnapshot,
  PartnerChatMessage,
} from "@/services/geminiService";

const QUICK_PROMPTS = [
  {
    icon: DollarSign,
    label: "Raio-X do Mês",
    prompt: "Sócio, faça um raio-x completo do nosso financeiro deste mês: quanto entrou, quanto saiu, qual nosso saldo e como estamos comparados ao ano?",
    color: "text-emerald-400 border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/20",
  },
  {
    icon: AlertTriangle,
    label: "Contas & Vencimentos (7d)",
    prompt: "Quais contas estão atrasadas hoje e o que temos para pagar nos próximos 7 dias? Quanto precisamos de caixa?",
    color: "text-amber-400 border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/20",
  },
  {
    icon: TrendingUp,
    label: "Para onde vai o dinheiro?",
    prompt: "Analise nossas maiores despesas por categoria neste mês. Onde estamos gastando mais e onde podemos economizar?",
    color: "text-rose-400 border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/20",
  },
  {
    icon: Calculator,
    label: "Auditar Orçamentos",
    prompt: "Analise nossos últimos orçamentos: quais estão pendentes para fecharmos, qual o valor na mesa e como estão nossas margens de lucro?",
    color: "text-blue-400 border-blue-500/25 bg-blue-500/10 hover:bg-blue-500/20",
  },
  {
    icon: Hammer,
    label: "Status da Fábrica (OS)",
    prompt: "Como está nossa fila de produção na fábrica? Quantas Ordens de Serviço estão ativas e quais projetos exigem mais atenção?",
    color: "text-purple-400 border-purple-500/25 bg-purple-500/10 hover:bg-purple-500/20",
  },
];

const formatBRL = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

function renderFormattedText(text: string) {
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={idx} className="h-2" />;

    const formatInline = (str: string) => {
      const parts = str.split(/(\*\*.*?\*\*)/g);
      return parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          return (
            <strong key={i} className="font-black text-white">
              {p.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{p}</span>;
      });
    };

    if (trimmed.startsWith("### ")) {
      return (
        <h3 key={idx} className="text-xs font-black uppercase tracking-wider text-amber-400 mt-2 mb-1">
          {formatInline(trimmed.replace("### ", ""))}
        </h3>
      );
    }
    if (trimmed.startsWith("#### ")) {
      return (
        <h4 key={idx} className="text-[11px] font-black uppercase tracking-wider text-slate-200 mt-2 mb-0.5">
          {formatInline(trimmed.replace("#### ", ""))}
        </h4>
      );
    }
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      const content = trimmed.replace(/^(\*|-|•)\s+/, "");
      return (
        <div key={idx} className="flex items-start gap-2 pl-1 py-0.5 text-xs text-slate-300 leading-relaxed">
          <span className="text-amber-400 font-black mt-0.5">•</span>
          <span className="flex-1">{formatInline(content)}</span>
        </div>
      );
    }

    return (
      <p key={idx} className="text-xs text-slate-300 leading-relaxed">
        {formatInline(trimmed)}
      </p>
    );
  });
}

export const BJLPartnerChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<BJLPartnerSnapshot | null>(null);
  const [isRefreshingSnap, setIsRefreshingSnap] = useState(false);
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => localStorage.getItem("bjl_gemini_api_key") || "");
  const [aiMode, setAiMode] = useState<"gemini" | "local-cfo">("gemini");

  const [messages, setMessages] = useState<PartnerChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem("bjl_partner_chat_history");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        role: "assistant",
        content:
          "### 🤝 Olá, Sócio! Estou online e conectado aos números da BJL Planejados.\n\nJá carreguei o **Financeiro**, os **Orçamentos**, o **Catálogo de MDF/Ferragens** e as **Ordens de Serviço**.\n\nO que vamos analisar agora? Você pode clicar em um dos atalhos abaixo ou me perguntar qualquer coisa sobre nosso caixa, margens ou precificação de projetos!",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      },
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem("bjl_partner_chat_history", JSON.stringify(messages));
    } catch {
      // ignore
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const loadSnapshot = async (force = false) => {
    setIsRefreshingSnap(true);
    try {
      const snap = await buildBJLBusinessSnapshot(force);
      setSnapshot(snap);
    } catch (e) {
      console.error("Erro ao carregar snapshot do Sócio IA:", e);
    } finally {
      setIsRefreshingSnap(false);
    }
  };

  useEffect(() => {
    if (isOpen && !snapshot) {
      loadSnapshot(false);
    }
  }, [isOpen]);

  // Atalho de teclado Ctrl+J / Cmd+J e evento global
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    const handleCustomOpen = (e: any) => {
      setIsOpen(true);
      if (e.detail?.prompt) {
        handleSendMessage(e.detail.prompt);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-bjl-partner-ai", handleCustomOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-bjl-partner-ai", handleCustomOpen as EventListener);
    };
  }, [messages, apiKeyInput]);

  const handleSaveApiKey = () => {
    localStorage.setItem("bjl_gemini_api_key", apiKeyInput.trim());
    setShowKeyConfig(false);
    toast.success("Chave do Gemini salva com sucesso! O Sócio IA agora usa o motor completo Gemini 2.5.");
  };

  const handleClearChat = () => {
    const initial: PartnerChatMessage[] = [
      {
        role: "assistant",
        content:
          "### 🤝 Conversa reiniciada, Sócio!\n\nMeus dados continuam sincronizados em tempo real com o Financeiro, Orçamentos e Fábrica. Qual número vamos auditar agora?",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      },
    ];
    setMessages(initial);
    sessionStorage.removeItem("bjl_partner_chat_history");
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt ?? input).trim();
    if (!textToSend || isLoading) return;

    if (!customPrompt) setInput("");

    const userMsg: PartnerChatMessage = {
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const { reply, snapshot: freshSnap, mode } = await askBJLPartnerAI(
        updatedMessages,
        apiKeyInput.trim() || undefined,
        false
      );
      setSnapshot(freshSnap);
      setAiMode(mode);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: reply,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao consultar o Sócio IA.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Tive um contratempo técnico ao processar sua pergunta: **${err?.message || "Erro desconhecido"}**. Tente novamente ou verifique a conexão.`,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Botão Flutuante Mobile & Atalho Rápido */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-20 right-4 sm:hidden z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-2xl shadow-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-xs uppercase tracking-wider transition-transform active:scale-95",
          isOpen && "hidden"
        )}
      >
        <Sparkles className="h-4 w-4 fill-black" />
        <span>Sócio IA</span>
      </button>

      {/* Drawer Lateral do Sócio IA */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop leve sem blur pesado para manter 0ms de performance */}
          <div
            className="fixed inset-0 bg-black/60 transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative z-10 w-full max-w-lg bg-[#090d16] border-l border-white/[0.08] shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header Executivo */}
            <div className="p-4 border-b border-white/[0.08] bg-[#0d1320] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">
                      Sócio IA • BJL Planejados
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {apiKeyInput ? "Gemini 2.5" : "CFO Live"}
                    </span>
                  </div>
                  <p className="text-[10px] font-semibold text-slate-400">
                    Conectado ao Financeiro, Orçamentos e Fábrica em tempo real
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowKeyConfig((prev) => !prev)}
                  title="Configurar Chave API do Google Gemini"
                  className={cn(
                    "h-8 w-8 rounded-xl border border-white/[0.06] hover:bg-white/[0.08]",
                    apiKeyInput ? "text-amber-400" : "text-slate-400"
                  )}
                >
                  <Key className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    loadSnapshot(true);
                    toast.success("Dados do Financeiro e Orçamentos recarregados na memória do Sócio IA!");
                  }}
                  disabled={isRefreshingSnap}
                  title="Atualizar dados do sistema"
                  className="h-8 w-8 rounded-xl border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.08]"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isRefreshingSnap && "animate-spin text-amber-400")} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearChat}
                  title="Limpar conversa"
                  className="h-8 w-8 rounded-xl border border-white/[0.06] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 rounded-xl border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.08]"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Gaveta de Configuração Rápida da Chave Gemini */}
            {showKeyConfig && (
              <div className="p-3.5 bg-amber-500/10 border-b border-amber-500/25 space-y-2 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                    <Key className="h-3 w-3" /> Chave Google Gemini API (Opcional para IA Generativa Completa)
                  </span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-bold text-amber-300 underline hover:text-white"
                  >
                    Gerar Chave Grátis ↗
                  </a>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Cole sua chave AIzaSy..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="h-8 text-xs bg-[#090d16] border-white/15 rounded-xl"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveApiKey}
                    className="h-8 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-[10px] uppercase tracking-wider"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" /> Salvar
                  </Button>
                </div>
              </div>
            )}

            {/* Strip de Indicadores ao Vivo */}
            {snapshot && (
              <div className="grid grid-cols-4 gap-1.5 p-2.5 bg-[#0b101b] border-b border-white/[0.06] shrink-0">
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block truncate">
                    Saldo {snapshot.currentMonthLabel.split("/")[0]}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-black tabular-nums truncate block mt-0.5",
                      snapshot.monthMetrics.paidBalance >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}
                  >
                    {formatBRL(snapshot.monthMetrics.paidBalance)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-[8px] font-black uppercase tracking-wider text-amber-400/90 block truncate">
                    Vence em 7d
                  </span>
                  <span className="text-[11px] font-black tabular-nums text-amber-400 truncate block mt-0.5">
                    {formatBRL(snapshot.alerts.dueNext7DaysTotal)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-[8px] font-black uppercase tracking-wider text-blue-400/90 block truncate">
                    Em Orçamentos
                  </span>
                  <span className="text-[11px] font-black tabular-nums text-blue-400 truncate block mt-0.5">
                    {formatBRL(snapshot.budgetsSummary.pendingTotalValue)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-[8px] font-black uppercase tracking-wider text-purple-400/90 block truncate">
                    Fábrica Ativa
                  </span>
                  <span className="text-[11px] font-black tabular-nums text-purple-400 truncate block mt-0.5">
                    {snapshot.productionSummary.activeOSCount} OSs
                  </span>
                </div>
              </div>
            )}

            {/* Corpo de Mensagens do Chat */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={i}
                    className={cn("flex gap-2.5", isUser ? "justify-end" : "justify-start")}
                  >
                    {!isUser && (
                      <div className="h-7 w-7 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3.5 py-2.5 border",
                        isUser
                          ? "bg-amber-500 text-black font-semibold border-amber-400 rounded-br-sm"
                          : "bg-[#111726] border-white/[0.07] text-slate-200 rounded-bl-sm space-y-1"
                      )}
                    >
                      {isUser ? (
                        <p className="text-xs leading-relaxed">{msg.content}</p>
                      ) : (
                        <div>{renderFormattedText(msg.content)}</div>
                      )}
                      {msg.timestamp && (
                        <span
                          className={cn(
                            "block text-[9px] mt-1 text-right font-mono",
                            isUser ? "text-black/60" : "text-slate-500"
                          )}
                        >
                          {msg.timestamp}
                        </span>
                      )}
                    </div>
                    {isUser && (
                      <div className="h-7 w-7 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0 mt-0.5">
                        <User className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Bot className="h-4 w-4 animate-pulse" />
                  </div>
                  <div className="bg-[#111726] border border-white/[0.07] rounded-2xl px-4 py-2.5 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-bounce" />
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-bounce [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-bounce [animation-delay:300ms]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">
                      Analisando números da BJL...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Atalhos Estratégicos de 1 Clique */}
            <div className="px-3 py-2 border-t border-white/[0.06] bg-[#0b101b] shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
                {QUICK_PROMPTS.map((qp) => (
                  <button
                    key={qp.label}
                    onClick={() => handleSendMessage(qp.prompt)}
                    disabled={isLoading}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all shrink-0",
                      qp.color
                    )}
                  >
                    <qp.icon className="h-3 w-3" />
                    <span>{qp.label}</span>
                    <ChevronRight className="h-2.5 w-2.5 opacity-60" />
                  </button>
                ))}
              </div>
            </div>

            {/* Barra de Digitação */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-[#0d1320] border-t border-white/[0.08] flex items-center gap-2 shrink-0"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte sobre o caixa, contas, margens ou orçamentos..."
                disabled={isLoading}
                className="flex-1 h-10 rounded-xl bg-[#090d16] border-white/[0.1] text-xs placeholder:text-slate-500 focus-visible:ring-amber-500/40"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
