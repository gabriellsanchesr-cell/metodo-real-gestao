import { avisarNoCelular } from "@/lib/push";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ConversationList } from "@/components/chat/ConversationList";
import { MessageArea } from "@/components/chat/MessageArea";
import { PatientContext } from "@/components/chat/PatientContext";

export interface Conversa {
  id: string;
  nutri_id: string;
  paciente_id: string;
  arquivada: boolean;
  ultima_mensagem_texto: string | null;
  ultima_mensagem_em: string | null;
  nao_lidas_nutri: number;
  nao_lidas_paciente: number;
  paciente?: any;
}

export interface Mensagem {
  id: string;
  conversa_id: string;
  remetente_id: string;
  conteudo: string;
  tipo: string;
  arquivo_url: string | null;
  referencia_id: string | null;
  lida: boolean;
  lida_em: string | null;
  created_at: string;
}

export default function Chat() {
  const { user } = useAuth();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [selectedConversa, setSelectedConversa] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversas = useCallback(async () => {
    if (!user) return;
    const { data: convData } = await supabase
      .from("conversas")
      .select("*")
      .eq("nutri_id", user.id)
      .order("ultima_mensagem_em", { ascending: false, nullsFirst: false });

    if (convData && convData.length > 0) {
      const pacienteIds = convData.map(c => c.paciente_id);
      const { data: pacientes } = await supabase
        .from("pacientes")
        .select("id, nome_completo, fase_real, peso_inicial, email, telefone")
        .in("id", pacienteIds);

      const pacMap = new Map((pacientes || []).map(p => [p.id, p]));
      const enriched = convData.map(c => ({ ...c, paciente: pacMap.get(c.paciente_id) }));
      setConversas(enriched);
    } else {
      setConversas([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadConversas(); }, [loadConversas]);

  // Realtime for conversas updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("conversas-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversas", filter: `nutri_id=eq.${user.id}` }, () => {
        loadConversas();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadConversas]);

  const loadMensagens = useCallback(async (conversaId: string) => {
    const { data } = await supabase
      .from("mensagens")
      .select("*")
      .eq("conversa_id", conversaId)
      .order("created_at", { ascending: true });
    setMensagens((data as Mensagem[]) || []);

    // Mark unread messages as read
    if (user) {
      await supabase
        .from("mensagens")
        .update({ lida: true, lida_em: new Date().toISOString() })
        .eq("conversa_id", conversaId)
        .neq("remetente_id", user.id)
        .eq("lida", false);

      await supabase
        .from("conversas")
        .update({ nao_lidas_nutri: 0 })
        .eq("id", conversaId);
    }
  }, [user]);

  // Realtime for messages
  useEffect(() => {
    if (!selectedConversa) return;
    const channel = supabase
      .channel(`mensagens-${selectedConversa.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "mensagens",
        filter: `conversa_id=eq.${selectedConversa.id}`,
      }, (payload) => {
        const newMsg = payload.new as Mensagem;
        setMensagens(prev => [...prev, newMsg]);
        // Mark as read if from patient
        if (user && newMsg.remetente_id !== user.id) {
          supabase.from("mensagens").update({ lida: true, lida_em: new Date().toISOString() }).eq("id", newMsg.id).then();
          supabase.from("conversas").update({ nao_lidas_nutri: 0 }).eq("id", selectedConversa.id).then();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConversa, user]);

  const selectConversa = (conv: Conversa) => {
    setSelectedConversa(conv);
    loadMensagens(conv.id);
  };

  const sendMessage = async (conteudo: string, tipo = "texto") => {
    if (!user || !selectedConversa || !conteudo.trim()) return;
    await supabase.from("mensagens").insert({
      conversa_id: selectedConversa.id,
      remetente_id: user.id,
      conteudo: conteudo.trim(),
      tipo,
    });
    await supabase.from("conversas").update({
      ultima_mensagem_texto: conteudo.trim().substring(0, 100),
      ultima_mensagem_em: new Date().toISOString(),
      nao_lidas_paciente: (selectedConversa.nao_lidas_paciente || 0) + 1,
    }).eq("id", selectedConversa.id);
    // Aviso no celular da paciente, se ela ativou no app.
    if (selectedConversa.paciente_id) {
      avisarNoCelular(selectedConversa.paciente_id, "Nova mensagem do seu nutri",
        tipo === "texto" ? conteudo.trim().slice(0, 140) : "Você recebeu um arquivo no chat.", "/portal?aba=mensagens");
    }
  };

  const startConversation = async (pacienteId: string) => {
    if (!user) return;
    // Check if conversation exists
    const existing = conversas.find(c => c.paciente_id === pacienteId);
    if (existing) { selectConversa(existing); return; }

    const { data } = await supabase.from("conversas").insert({
      nutri_id: user.id,
      paciente_id: pacienteId,
    }).select().single();

    if (data) {
      await loadConversas();
      const { data: pac } = await supabase.from("pacientes").select("id, nome_completo, fase_real, peso_inicial, email, telefone").eq("id", pacienteId).single();
      selectConversa({ ...data, paciente: pac });
    }
  };

  const archiveConversa = async (conversaId: string, archived: boolean) => {
    await supabase.from("conversas").update({ arquivada: archived }).eq("id", conversaId);
    loadConversas();
    if (selectedConversa?.id === conversaId) setSelectedConversa(null);
  };

  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Left column - Conversations */}
      <ConversationList
        conversas={conversas}
        selectedId={selectedConversa?.id}
        onSelect={selectConversa}
        onStartNew={startConversation}
        onArchive={archiveConversa}
        loading={loading}
        userId={user?.id || ""}
      />

      {/* Center column - Messages */}
      <MessageArea
        conversa={selectedConversa}
        mensagens={mensagens}
        userId={user?.id || ""}
        onSend={sendMessage}
      />

      {/* Right column - Patient context */}
      {selectedConversa?.paciente && (
        <PatientContext paciente={selectedConversa.paciente} pacienteId={selectedConversa.paciente_id} />
      )}
    </div>
  );
}
