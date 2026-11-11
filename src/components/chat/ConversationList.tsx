import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageSquarePlus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Conversa } from "@/pages/Chat";
import { BulkMessageModal } from "./BulkMessageModal";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  conversas: Conversa[];
  selectedId?: string;
  onSelect: (c: Conversa) => void;
  onStartNew: (pacienteId: string) => void;
  onArchive: (id: string, archived: boolean) => void;
  loading: boolean;
  userId: string;
}

type Filter = "todos" | "nao_lidos" | "arquivados";

export function ConversationList({ conversas, selectedId, onSelect, onStartNew, onArchive, loading, userId }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [showNewChat, setShowNewChat] = useState(false);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);

  useEffect(() => {
    if (showNewChat) {
      supabase.from("pacientes").select("id, nome_completo, email").or("ativo.is.null,ativo.eq.true").order("nome_completo").then(({ data }) => {
        setPacientes(data || []);
      });
    }
  }, [showNewChat]);

  const filtered = conversas.filter(c => {
    if (filter === "arquivados") return c.arquivada;
    if (filter === "nao_lidos") return !c.arquivada && c.nao_lidas_nutri > 0;
    return !c.arquivada;
  }).filter(c => {
    if (!search) return true;
    return c.paciente?.nome_completo?.toLowerCase().includes(search.toLowerCase());
  });

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isToday(d)) return format(d, "HH:mm");
    if (isYesterday(d)) return "Ontem";
    return format(d, "dd/MM", { locale: ptBR });
  };

  const getInitials = (name: string) => {
    return name?.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase() || "?";
  };

  return (
    <div className="w-[280px] border-r border-border bg-card flex flex-col shrink-0">
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-foreground">Mensagens</h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBulkOpen(true)} title="Mensagem em massa">
              <Users className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowNewChat(!showNewChat)} title="Nova conversa">
              <MessageSquarePlus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs rounded-lg"
          />
        </div>
        <div className="flex gap-1">
          {(["todos", "nao_lidos", "arquivados"] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[10px] px-2 py-1 rounded-full transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {f === "todos" ? "Todos" : f === "nao_lidos" ? "Não lidos" : "Arquivados"}
            </button>
          ))}
        </div>
      </div>

      {showNewChat && (
        <div className="p-2 border-b border-border bg-muted/30 max-h-48 overflow-y-auto">
          <p className="text-[10px] text-muted-foreground px-2 mb-1 font-medium">Iniciar conversa com:</p>
          {pacientes.map(p => (
            <button
              key={p.id}
              onClick={() => { onStartNew(p.id); setShowNewChat(false); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted text-left text-xs"
            >
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                {getInitials(p.nome_completo)}
              </div>
              <span className="truncate text-foreground">{p.nome_completo}</span>
            </button>
          ))}
        </div>
      )}

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 text-center text-xs text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            {filter === "arquivados" ? "Nenhuma conversa arquivada" : "Nenhuma conversa encontrada"}
          </div>
        ) : (
          filtered.map(conv => (
            <div
              key={conv.id}
              onClick={() => onSelect(conv)}
              onContextMenu={(e) => {
                e.preventDefault();
                onArchive(conv.id, !conv.arquivada);
              }}
              className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors border-b border-border/50 ${
                selectedId === conv.id ? "bg-primary/5" : "hover:bg-muted/50"
              }`}
            >
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {getInitials(conv.paciente?.nome_completo || "")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground truncate">{conv.paciente?.nome_completo || "Paciente"}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-1">{formatTime(conv.ultima_mensagem_em)}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[11px] text-muted-foreground truncate">{conv.ultima_mensagem_texto || "Nenhuma mensagem"}</span>
                  {conv.nao_lidas_nutri > 0 && (
                    <Badge className="h-4 min-w-[16px] text-[9px] px-1 bg-destructive text-destructive-foreground shrink-0 ml-1">
                      {conv.nao_lidas_nutri}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </ScrollArea>

      <BulkMessageModal open={bulkOpen} onOpenChange={setBulkOpen} userId={userId} />
    </div>
  );
}
