import { avisarNoCelular } from "@/lib/push";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Send } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
}

export function BulkMessageModal({ open, onOpenChange, userId }: Props) {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      supabase.from("pacientes").select("id, nome_completo, auth_user_id").or("ativo.is.null,ativo.eq.true").order("nome_completo").then(({ data }) => {
        setPacientes((data || []).filter((p: any) => p.auth_user_id));
      });
      setSelected(new Set());
      setMessage("");
    }
  }, [open]);

  const toggleAll = () => {
    if (selected.size === pacientes.length) setSelected(new Set());
    else setSelected(new Set(pacientes.map(p => p.id)));
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const handleSend = async () => {
    if (!message.trim() || selected.size === 0) return;
    setSending(true);
    try {
      for (const pacienteId of selected) {
        // Get or create conversation
        let { data: conv } = await supabase
          .from("conversas")
          .select("id, nao_lidas_paciente")
          .eq("nutri_id", userId)
          .eq("paciente_id", pacienteId)
          .maybeSingle();

        if (!conv) {
          const { data: newConv } = await supabase.from("conversas").insert({
            nutri_id: userId, paciente_id: pacienteId,
          }).select("id, nao_lidas_paciente").single();
          conv = newConv;
        }

        if (conv) {
          const pac = pacientes.find(p => p.id === pacienteId);
          const personalizedMsg = message.replace(/\{nome\}/g, pac?.nome_completo?.split(" ")[0] || "");

          await supabase.from("mensagens").insert({
            conversa_id: conv.id, remetente_id: userId, conteudo: personalizedMsg, tipo: "texto",
          });
          await supabase.from("conversas").update({
            ultima_mensagem_texto: personalizedMsg.substring(0, 100),
            ultima_mensagem_em: new Date().toISOString(),
            nao_lidas_paciente: (conv.nao_lidas_paciente || 0) + 1,
          }).eq("id", conv.id);
          // Mesmo aviso no celular do chat individual (Chat.tsx).
          avisarNoCelular(pacienteId, "Nova mensagem do seu nutri", personalizedMsg.slice(0, 140), "/portal?aba=mensagens");
        }
      }
      toast({ title: `Mensagem enviada para ${selected.size} paciente(s)` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Mensagem em Massa</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-foreground">Selecionar pacientes ({selected.size})</p>
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={toggleAll}>
                {selected.size === pacientes.length ? "Desmarcar todos" : "Selecionar todos"}
              </Button>
            </div>
            <ScrollArea className="h-40 border rounded-lg p-2">
              {pacientes.map(p => (
                <label key={p.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-muted/50 px-1 rounded">
                  <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                  <span className="text-xs text-foreground">{p.nome_completo}</span>
                </label>
              ))}
              {pacientes.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum paciente com acesso ativo</p>
              )}
            </ScrollArea>
          </div>
          <div>
            <p className="text-xs font-medium text-foreground mb-1">Mensagem (use {"{nome}"} para personalizar)</p>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Escreva sua mensagem..." className="min-h-[80px] text-sm" />
          </div>
          <Button className="w-full" onClick={handleSend} disabled={sending || !message.trim() || selected.size === 0}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Enviando..." : `Enviar para ${selected.size} paciente(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
