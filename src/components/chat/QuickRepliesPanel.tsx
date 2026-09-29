import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X, Settings } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Props {
  patientName: string;
  onSelect: (text: string) => void;
  onClose: () => void;
  userId: string;
}

interface QuickReply {
  id: string;
  titulo: string;
  categoria: string;
  texto: string;
  ativo: boolean;
}

const CATEGORIES = [
  "Check-in recebido",
  "Motivação e constância",
  "Orientações gerais",
  "Ajuste de plano",
  "Confirmação de consulta",
  "Recaída",
  "Bom resultado",
  "Geral",
  // Título = nome do gatilho ("Renovação", "Pedir indicação"...): substitui o texto padrão da tela Captação.
  "Captação",
];

const DEFAULT_REPLIES: Omit<QuickReply, "id">[] = [
  { titulo: "Check-in positivo", categoria: "Check-in recebido", texto: "Oi, {nome}! Recebi seu check-in. Boa evolução essa semana. Continue assim, constância é o que transforma.", ativo: true },
  { titulo: "Check-in com dificuldade", categoria: "Check-in recebido", texto: "Oi, {nome}. Vi que essa semana foi mais difícil. Tudo bem, faz parte do processo. Me conta o que aconteceu para a gente ajustar juntos.", ativo: true },
  { titulo: "Motivação", categoria: "Motivação e constância", texto: "Você está no caminho certo, {nome}. Foco no processo, não no número. O corpo acompanha.", ativo: true },
  { titulo: "Recaída", categoria: "Recaída", texto: "Sem culpa, {nome}. Nenhum processo é linear. O que importa é retomar com calma. Vamos em frente.", ativo: true },
  { titulo: "Bom resultado", categoria: "Bom resultado", texto: "Excelente resultado, {nome}. Isso é fruto da sua constância. Vamos manter o ritmo.", ativo: true },
  { titulo: "Confirmação de consulta", categoria: "Confirmação de consulta", texto: "Oi, {nome}! Confirmo nossa consulta. Qualquer dúvida é só chamar.", ativo: true },
];

export function QuickRepliesPanel({ patientName, onSelect, onClose, userId }: Props) {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [search, setSearch] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [editReply, setEditReply] = useState<Partial<QuickReply> | null>(null);
  const { toast } = useToast();

  useEffect(() => { loadReplies(); }, []);

  const loadReplies = async () => {
    const { data } = await supabase.from("respostas_rapidas").select("*").eq("user_id", userId).eq("ativo", true).order("categoria");
    setReplies((data as QuickReply[]) || []);
  };

  const handleSelect = (texto: string) => {
    const replaced = texto.replace(/\{nome\}/g, patientName);
    onSelect(replaced);
  };

  const seedDefaults = async () => {
    for (const r of DEFAULT_REPLIES) {
      await supabase.from("respostas_rapidas").insert({ ...r, user_id: userId });
    }
    loadReplies();
    toast({ title: "Respostas padrão criadas!" });
  };

  const saveReply = async () => {
    if (!editReply?.titulo || !editReply?.texto) return;
    if (editReply.id) {
      await supabase.from("respostas_rapidas").update({
        titulo: editReply.titulo, categoria: editReply.categoria, texto: editReply.texto,
      }).eq("id", editReply.id);
    } else {
      await supabase.from("respostas_rapidas").insert({
        user_id: userId, titulo: editReply.titulo, categoria: editReply.categoria || "Geral", texto: editReply.texto,
      });
    }
    setEditReply(null);
    loadReplies();
  };

  const deleteReply = async (id: string) => {
    await supabase.from("respostas_rapidas").delete().eq("id", id);
    loadReplies();
  };

  const filtered = replies.filter(r =>
    !search || r.titulo.toLowerCase().includes(search.toLowerCase()) || r.texto.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = CATEGORIES.map(cat => ({
    categoria: cat,
    items: filtered.filter(r => r.categoria === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div className="border-t border-border bg-card px-3 py-2 max-h-64">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-foreground">Respostas Rápidas</span>
        <div className="flex gap-1">
          <Dialog open={manageOpen} onOpenChange={setManageOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6"><Settings className="h-3 w-3" /></Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Gerenciar Respostas Rápidas</DialogTitle></DialogHeader>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {replies.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">Nenhuma resposta cadastrada.</p>
                    <Button size="sm" className="mt-2" onClick={seedDefaults}>Criar respostas padrão</Button>
                  </div>
                )}
                {replies.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{r.titulo}</p>
                      <p className="text-[10px] text-muted-foreground">{r.categoria}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setEditReply(r)}>Editar</Button>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive" onClick={() => deleteReply(r.id)}>Excluir</Button>
                    </div>
                  </div>
                ))}
                <Button size="sm" variant="outline" className="w-full" onClick={() => setEditReply({ titulo: "", categoria: "Geral", texto: "" })}>
                  + Nova Resposta
                </Button>
              </div>
              {editReply && (
                <div className="border-t pt-3 space-y-2">
                  <Label className="text-xs">Título</Label>
                  <Input value={editReply.titulo || ""} onChange={e => setEditReply({ ...editReply, titulo: e.target.value })} className="h-8 text-xs" />
                  <Label className="text-xs">Categoria</Label>
                  <Select value={editReply.categoria || "Geral"} onValueChange={v => setEditReply({ ...editReply, categoria: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Label className="text-xs">Texto (use {"{nome}"} para nome do paciente)</Label>
                  <Textarea value={editReply.texto || ""} onChange={e => setEditReply({ ...editReply, texto: e.target.value })} className="text-xs min-h-[60px]" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveReply}>Salvar</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditReply(null)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}><X className="h-3 w-3" /></Button>
        </div>
      </div>
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="h-7 pl-7 text-[11px]" />
      </div>
      <ScrollArea className="max-h-36">
        {replies.length === 0 ? (
          <div className="text-center py-3">
            <p className="text-[11px] text-muted-foreground">Nenhuma resposta cadastrada.</p>
            <Button size="sm" variant="link" className="text-[11px] h-auto p-0 mt-1" onClick={seedDefaults}>Criar padrões</Button>
          </div>
        ) : grouped.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-2">Nenhum resultado</p>
        ) : (
          grouped.map(g => (
            <div key={g.categoria} className="mb-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">{g.categoria}</p>
              {g.items.map(r => (
                <button
                  key={r.id}
                  onClick={() => handleSelect(r.texto)}
                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted/50 text-[11px] text-foreground transition-colors"
                >
                  <span className="font-medium">{r.titulo}</span>
                  <span className="text-muted-foreground ml-1 truncate">— {r.texto.substring(0, 50)}...</span>
                </button>
              ))}
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
