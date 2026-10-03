import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { bloqueadoNaVisualizacao, usePortalModo } from "@/contexts/PortalModoContext";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  paciente: any;
}

interface Mensagem {
  id: string;
  conversa_id: string;
  remetente_id: string;
  conteudo: string;
  tipo: string;
  lida: boolean;
  lida_em: string | null;
  created_at: string;
}

export function PortalChat({ paciente }: Props) {
  const { user } = useAuth();
  const { modoVisualizacao } = usePortalModo();
  // Quem é "eu" na conversa: no "ver como paciente" o login é do nutri, mas a
  // tela tem que mostrar as mensagens do ponto de vista da paciente.
  const meuId: string | undefined = modoVisualizacao ? paciente.auth_user_id ?? undefined : user?.id;
  const [conversa, setConversa] = useState<any>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<any>(null);

  useEffect(() => {
    loadConversa();
  }, [paciente]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [mensagens]);

  const loadConversa = async () => {
    const { data: conv } = await supabase
      .from("conversas")
      .select("*")
      .eq("paciente_id", paciente.id)
      .maybeSingle();

    if (conv) {
      setConversa(conv);
      const { data: msgs } = await supabase
        .from("mensagens")
        .select("*")
        .eq("conversa_id", conv.id)
        .order("created_at", { ascending: true });
      setMensagens((msgs as Mensagem[]) || []);

      // Mark as read (nunca no modo visualização: zeraria o contador da paciente)
      if (user && !modoVisualizacao) {
        await supabase.from("mensagens")
          .update({ lida: true, lida_em: new Date().toISOString() })
          .eq("conversa_id", conv.id)
          .neq("remetente_id", user.id)
          .eq("lida", false);
        await supabase.from("conversas").update({ nao_lidas_paciente: 0 }).eq("id", conv.id);
      }
    }
    setLoading(false);
  };

  // Realtime messages
  useEffect(() => {
    if (!conversa || modoVisualizacao) return;
    const channel = supabase
      .channel(`portal-msgs-${conversa.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "mensagens",
        filter: `conversa_id=eq.${conversa.id}`,
      }, (payload) => {
        const msg = payload.new as Mensagem;
        setMensagens(prev => [...prev, msg]);
        if (user && msg.remetente_id !== user.id) {
          supabase.from("mensagens").update({ lida: true, lida_em: new Date().toISOString() }).eq("id", msg.id).then();
          supabase.from("conversas").update({ nao_lidas_paciente: 0 }).eq("id", conversa.id).then();
        }
      })
      .subscribe();

    // Typing indicator
    const typingChannel = supabase.channel(`typing-${conversa.id}`);
    typingChannel
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.user_id !== user?.id) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 3000);
        }
      })
      .subscribe();
    typingRef.current = typingChannel;

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(typingChannel);
    };
  }, [conversa, user]);

  const handleSend = async () => {
    if (bloqueadoNaVisualizacao(modoVisualizacao)) return;
    if (!text.trim() || !conversa || !user) return;
    const msg = text.trim();
    setText("");
    await supabase.from("mensagens").insert({
      conversa_id: conversa.id, remetente_id: user.id, conteudo: msg, tipo: "texto",
    });
    await supabase.from("conversas").update({
      ultima_mensagem_texto: msg.substring(0, 100),
      ultima_mensagem_em: new Date().toISOString(),
      nao_lidas_nutri: (conversa.nao_lidas_nutri || 0) + 1,
    }).eq("id", conversa.id);
  };

  const handleTyping = () => {
    if (modoVisualizacao) return;
    typingRef.current?.send({ type: "broadcast", event: "typing", payload: { user_id: user?.id } });
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
      const dateKey = format(new Date(msg.created_at), "yyyy-MM-dd");
      const last = groups[groups.length - 1];
      if (last && last.date === dateKey) last.msgs.push(msg);
      else groups.push({ date: dateKey, msgs: [msg] });
    });
    return groups;
  };

  const lastMyMsg = [...mensagens].reverse().find(m => m.remetente_id === meuId);

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>;

  if (!conversa) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="font-medium">Chat</p>
        <p className="text-sm mt-1">Seu nutricionista ainda não iniciou uma conversa.</p>
        <p className="text-xs mt-1">As mensagens aparecerão aqui quando disponíveis.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-border mb-2">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <img src="/logo.png" alt="Nutricionista" className="h-8 w-8 rounded-full object-contain" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Gabriel Sanches</p>
          <p className="text-[10px] text-muted-foreground">Nutricionista • Responde em até 24h</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1 py-2">
        {groupedMessages().map(group => (
          <div key={group.date}>
            <div className="flex items-center justify-center my-2">
              <span className="text-[10px] text-muted-foreground bg-muted/50 px-3 py-0.5 rounded-full">
                {formatDateLabel(group.msgs[0].created_at)}
              </span>
            </div>
            {group.msgs.map(msg => {
              const isMine = msg.remetente_id === meuId;
              return (
                <div key={msg.id} className={`flex mb-1.5 ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-3 py-2 text-sm ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-[16px] rounded-br-[4px]"
                      : "bg-muted rounded-[16px] rounded-bl-[4px] text-foreground"
                  }`}>
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

        {lastMyMsg?.lida && lastMyMsg.lida_em && (
          <p className="text-[9px] text-muted-foreground text-right">
            Visualizado às {format(new Date(lastMyMsg.lida_em), "HH:mm")}
          </p>
        )}

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

      {/* Input */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <input
          value={text}
          onChange={e => { setText(e.target.value); handleTyping(); }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Escreva sua mensagem…"
          className="flex-1 h-10 bg-muted/50 rounded-full px-4 text-sm outline-none border-none placeholder:text-muted-foreground"
        />
        <Button size="icon" className="h-9 w-9 rounded-full shrink-0" onClick={handleSend} disabled={!text.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
