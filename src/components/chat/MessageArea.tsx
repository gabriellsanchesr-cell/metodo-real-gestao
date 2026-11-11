import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Zap, MessageSquare } from "lucide-react";
import { QuickRepliesPanel } from "./QuickRepliesPanel";
import type { Conversa, Mensagem } from "@/pages/Chat";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  conversa: Conversa | null;
  mensagens: Mensagem[];
  userId: string;
  onSend: (content: string, tipo?: string) => void;
}

export function MessageArea({ conversa, mensagens, userId, onSend }: Props) {
  const [text, setText] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

  // Typing indicator via broadcast
  useEffect(() => {
    if (!conversa) return;
    const channel = supabase.channel(`typing-${conversa.id}`);
    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.user_id !== userId) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 3000);
        }
      })
      .subscribe();
    typingChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [conversa, userId]);

  const handleTyping = () => {
    typingChannelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId },
    });
  };

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return "Hoje";
    if (isYesterday(d)) return "Ontem";
    return format(d, "EEE, dd MMM", { locale: ptBR });
  };

  const groupedMessages = () => {
    const groups: { date: string; msgs: Mensagem[] }[] = [];
    mensagens.forEach(msg => {
      const d = new Date(msg.created_at);
      const dateKey = format(d, "yyyy-MM-dd");
      const last = groups[groups.length - 1];
      if (last && last.date === dateKey) {
        last.msgs.push(msg);
      } else {
        groups.push({ date: dateKey, msgs: [msg] });
      }
    });
    return groups;
  };

  // Find last sent message by nutri to show read receipt
  const lastNutriMsg = [...mensagens].reverse().find(m => m.remetente_id === userId);

  if (!conversa) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Selecione uma conversa</p>
          <p className="text-sm mt-1">Ou inicie uma nova conversa com um paciente</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background">
      {/* Header */}
      <div className="h-14 border-b border-border px-4 flex items-center gap-3 bg-card shrink-0">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
          {conversa.paciente?.nome_completo?.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{conversa.paciente?.nome_completo}</p>
          {conversa.paciente?.fase_real && (
            <p className="text-[10px] text-muted-foreground capitalize">Fase {conversa.paciente.fase_real}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {groupedMessages().map(group => (
          <div key={group.date}>
            <div className="flex items-center justify-center my-3">
              <span className="text-[10px] text-muted-foreground bg-muted/50 px-3 py-0.5 rounded-full">
                {formatDateLabel(group.msgs[0].created_at)}
              </span>
            </div>
            {group.msgs.map(msg => {
              const isMine = msg.remetente_id === userId;
              return (
                <div key={msg.id} className={`flex mb-1.5 ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[70%] px-3.5 py-2 text-sm ${
                      isMine
                        ? "bg-primary text-primary-foreground rounded-[16px] rounded-br-[4px]"
                        : "bg-muted rounded-[16px] rounded-bl-[4px] text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.conteudo}</p>
                    <p className={`text-[9px] mt-0.5 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {format(new Date(msg.created_at), "HH:mm")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Read receipt */}
        {lastNutriMsg?.lida && lastNutriMsg.lida_em && (
          <p className="text-[9px] text-muted-foreground text-right">
            Visualizado às {format(new Date(lastNutriMsg.lida_em), "HH:mm")}
          </p>
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-2 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      {/* Quick Replies Panel */}
      {showQuickReplies && (
        <QuickRepliesPanel
          patientName={conversa.paciente?.nome_completo?.split(" ")[0] || ""}
          onSelect={(text) => { setText(text); setShowQuickReplies(false); }}
          onClose={() => setShowQuickReplies(false)}
          userId={userId}
        />
      )}

      {/* Input */}
      <div className="border-t border-border px-3 py-2 bg-card flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-primary"
          onClick={() => setShowQuickReplies(!showQuickReplies)}
          title="Respostas rápidas"
        >
          <Zap className="h-4 w-4" />
        </Button>
        <input
          value={text}
          onChange={e => { setText(e.target.value); handleTyping(); }}
          onKeyDown={handleKeyDown}
          placeholder="Escreva sua mensagem…"
          className="flex-1 h-10 bg-muted/50 rounded-full px-4 text-sm outline-none border-none placeholder:text-muted-foreground focus:bg-muted"
        />
        <Button
          size="icon"
          className="h-9 w-9 rounded-full shrink-0"
          onClick={handleSend}
          disabled={!text.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
