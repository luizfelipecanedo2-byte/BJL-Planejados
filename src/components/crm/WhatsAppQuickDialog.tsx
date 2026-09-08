import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MessageSquare, Send, Copy, Sparkles, Check } from "lucide-react";
import { formatCurrency } from "@/lib/salesUtils";

export interface WhatsAppQuickDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  clientPhone: string;
  projectName?: string;
  totalValue?: number;
  deliveryDate?: string;
  context?: "closed" | "measurement" | "project_3d" | "factory_status" | "installation" | "payment" | "general" | "follow_up" | "budget_sent";
}

export const WhatsAppQuickDialog: React.FC<WhatsAppQuickDialogProps> = ({
  open,
  onOpenChange,
  clientName,
  clientPhone,
  projectName = "Móveis Planejados",
  totalValue = 0,
  deliveryDate,
  context = "general",
}) => {
  const firstName = clientName ? clientName.split(" ")[0] : "Cliente";
  const formattedValue = totalValue > 0 ? formatCurrency(totalValue) : "";

  // Templates profissionais e humanizados para a BJL Planejados
  const templates: Record<string, { title: string; text: string }> = {
    follow_up: {
      title: "🔥 Follow-up de Proposta Comercial",
      text: `Olá ${firstName}, tudo bem? Aqui é da BJL Planejados! 🌟\n\nPassando para saber se você conseguiu dar uma olhada na proposta que preparamos para o seu projeto (${projectName}).\n\nFicou alguma dúvida sobre o projeto, materiais ou condições de pagamento? Conseguimos alinhar os detalhes para encaixar perfeitamente no seu planejamento! Como podemos avançar?`,
    },
    budget_sent: {
      title: "📋 Envio de Proposta Comercial",
      text: `Olá ${firstName}, tudo bem? Aqui é da BJL Planejados! ✨\n\nFinalizamos o estudo do seu projeto (${projectName})! Segue o resumo dos valores:\n\n💰 Valor Especial À Vista: ${formattedValue}\n💳 Ou Parcelado no Cartão em até 10x\n\nPodemos marcar para alinhar os detalhes e já reservar a sua data no cronograma de fabricação da marcenaria?`,
    },
    closed: {
      title: "🎉 Boas-Vindas & Contrato Fechado",
      text: `Olá ${firstName}, tudo bem? Aqui é da BJL Planejados! 🌟\n\nPassando para oficializar as boas-vindas à nossa família e agradecer imensamente pela confiança no projeto do seu espaço (${projectName})!\n\nNosso próximo passo estratégico é o agendamento da medição técnica fina in loco para iniciarmos a fabricação com precisão milimétrica. Qualquer dúvida que surgir, estou 100% à sua disposição por aqui!`,
    },
    measurement: {
      title: "📐 Agendamento de Medição Técnica",
      text: `Olá ${firstName}, tudo bem? Aqui é da equipe técnica da BJL Planejados.\n\nGostaríamos de confirmar a nossa visita para a medição técnica fina do seu projeto (${projectName}) ${deliveryDate ? `no dia ${deliveryDate}` : "nesta semana"}.\n\nEsse horário fica confortável para você nos receber no local?`,
    },
    project_3d: {
      title: "🖥️ Projeto 3D Renderizado Pronto",
      text: `Olá ${firstName}! Tenho uma excelente notícia: a modelagem 3D do seu projeto (${projectName}) ficou incrível e está pronta para apresentação! ✨\n\nPodemos agendar uma reunião para alinharmos os detalhes de acabamento, ferragens e visualizarmos o resultado final juntos?`,
    },
    factory_status: {
      title: "🏭 Status de Produção na Fábrica",
      text: `Olá ${firstName}! Tudo bem?\n\nPassando para compartilhar uma atualização da fábrica: seus móveis do projeto (${projectName}) já entraram na linha de corte, usinagem e montagem aqui na marcenaria da BJL! 🪚\n\nEstamos cuidando de cada detalhe com máximo padrão de acabamento. Logo te enviamos fotos do processo!`,
    },
    installation: {
      title: "🚚 Agendamento de Entrega & Montagem",
      text: `Olá ${firstName}! Tudo certo?\n\nSeus móveis planejados (${projectName}) estão com a fabricação 100% concluída e devidamente embalados para transporte! 📦✨\n\nGostaríamos de agendar a entrega e o início da montagem pela nossa equipe técnica ${deliveryDate ? `para o dia ${deliveryDate}` : "nos próximos dias"}. Como está a sua disponibilidade?`,
    },
    payment: {
      title: "💳 Lembrete Amigável de Parcela",
      text: `Olá ${firstName}, tudo bem?\n\nPassando para enviar o lembrete da parcela referente ao contrato de móveis planejados (${projectName})${formattedValue ? ` no valor de ${formattedValue}` : ""}${deliveryDate ? ` com vencimento para ${deliveryDate}` : ""}.\n\nCaso já tenha realizado o pagamento ou precise da chave PIX / boleto atualizado, basta me avisar por aqui. Tenha um ótimo dia!`,
    },
    general: {
      title: "💬 Atendimento Geral",
      text: `Olá ${firstName}, tudo bem? Aqui é da BJL Planejados.\n\nEstou à sua disposição para o que precisar em relação ao seu projeto (${projectName}). Como posso te ajudar hoje?`,
    },
  };

  const initialKey = templates[context] ? context : "general";
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>(initialKey);
  const [message, setMessage] = useState<string>(templates[initialKey]?.text || "");
  const [copied, setCopied] = useState(false);

  // Atualizar mensagem ao trocar template
  const handleSelectTemplate = (key: string) => {
    setSelectedTemplateKey(key);
    setMessage(templates[key].text);
  };

  // Limpar telefone (apenas números)
  const cleanPhone = (clientPhone || "").replace(/\D/g, "");
  // Adicionar DDI 55 se não tiver
  const finalPhone = cleanPhone.length === 10 || cleanPhone.length === 11 ? `55${cleanPhone}` : cleanPhone;

  const handleSendWhatsApp = () => {
    if (!cleanPhone) {
      toast.error("Este cliente não possui telefone cadastrado.");
      return;
    }
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${finalPhone}?text=${encoded}`;
    window.open(url, "_blank");
    onOpenChange(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Mensagem copiada para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar mensagem.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-card/95 backdrop-blur-2xl border-white/10 text-white rounded-[2rem] p-6 sm:p-7 shadow-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <MessageSquare className="h-4 w-4" />
            </span>
            <DialogTitle className="text-lg font-bold text-white tracking-tight">
              Disparar Mensagem via WhatsApp
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Para <strong className="text-white">{clientName}</strong> ({clientPhone || "Sem telefone"})
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Seletor de Templates Rápidos */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-400" />
              Escolha o Tipo de Mensagem
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {Object.entries(templates).map(([key, t]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectTemplate(key)}
                  className={`p-2 rounded-xl text-left text-[11px] font-semibold transition-all border ${
                    selectedTemplateKey === key
                      ? "bg-primary/20 border-primary/40 text-primary shadow-sm"
                      : "bg-white/[0.02] border-white/5 text-muted-foreground hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="line-clamp-2">{t.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Editor da Mensagem */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Texto Personalizado da Mensagem
              </Label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[10px] text-muted-foreground hover:text-white flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? "Copiado!" : "Copiar Texto"}</span>
              </button>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="bg-black/40 border-white/10 text-white rounded-xl text-xs leading-relaxed focus:border-emerald-500/50 resize-none font-sans p-3"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-white/10 text-xs hover:bg-white/5"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={handleSendWhatsApp}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 px-5"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Abrir WhatsApp</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
