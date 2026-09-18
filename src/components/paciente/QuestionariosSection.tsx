import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Send, Eye, ClipboardCopy, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { AvisarPacienteToggle } from "@/components/AvisarPacienteToggle";
import { avisarPaciente } from "@/lib/notificacoes";

const TIPOS = [
  { value: "anamnese", label: "Anamnese" },
  { value: "checkin_semanal", label: "Check-in Semanal" },
  { value: "qualidade_vida", label: "Qualidade de Vida" },
  { value: "comportamento_alimentar", label: "Comportamento Alimentar" },
  { value: "sintomas_intestinais", label: "Sintomas Intestinais" },
];

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  enviado: "bg-blue-100 text-blue-800",
  respondido: "bg-green-100 text-green-800",
};

interface Props {
  paciente: any;
}

export function QuestionariosSection({ paciente }: Props) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [questionarios, setQuestionarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendTipo, setSendTipo] = useState("checkin_semanal");
  const [avisar, setAvisar] = useState(true);
  const [sending, setSending] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<any>(null);

  useEffect(() => { loadQuestionarios(); }, [paciente.id]);

  const loadQuestionarios = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("questionarios")
      .select("*")
      .eq("paciente_id", paciente.id)
      .order("created_at", { ascending: false });
    setQuestionarios(data || []);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!session?.user?.id) return;
    setSending(true);
    try {
      const { data, error } = await supabase.from("questionarios").insert({
        paciente_id: paciente.id,
        user_id: session.user.id,
        tipo: sendTipo as any,
        status: "enviado" as any,
        data_envio: new Date().toISOString(),
      }).select("token").single();
      if (error) throw error;
      const url = `${window.location.origin}/questionario/${data.token}`;
      // A área de transferência pode falhar (permissão do navegador); isso não
      // pode impedir o aviso nem parecer que o questionário não foi criado.
      await navigator.clipboard.writeText(url).catch(() => undefined);
      if (avisar) {
        const titulo = TIPOS.find((t) => t.value === sendTipo)?.label;
        avisarPaciente(paciente.id, "questionario_enviado", { titulo, token: data.token });
      } else {
        toast({ title: "Link copiado!", description: "Envie o link ao paciente." });
      }
      setSendOpen(false);
      loadQuestionarios();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = async (token: string) => {
    const url = `${window.location.origin}/questionario/${token}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!" });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#1A1F3C]">Questionários</h2>
        <Button size="sm" onClick={() => setSendOpen(true)} className="bg-[#2B3990] hover:bg-[#2B3990]/90">
          <Send className="h-4 w-4 mr-1" /> Enviar questionário
        </Button>
      </div>

      {questionarios.length === 0 ? (
        <Card className="border-[#E2E5F0] rounded-xl">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhum questionário enviado.</p>
            <Button onClick={() => setSendOpen(true)} className="bg-[#2B3990] hover:bg-[#2B3990]/90">
              <Send className="h-4 w-4 mr-1" /> Enviar questionário
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-[#E2E5F0] rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enviado em</TableHead>
                <TableHead>Respondido em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questionarios.map(q => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">{TIPOS.find(t => t.value === q.tipo)?.label || q.tipo}</TableCell>
                  <TableCell>
                    <Badge className={`${STATUS_COLORS[q.status] || ""} border-0`}>
                      {q.status === "pendente" ? "Pendente" : q.status === "enviado" ? "Enviado" : "Respondido"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {q.data_envio ? format(new Date(q.data_envio), "dd/MM/yyyy HH:mm") : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {q.data_resposta ? format(new Date(q.data_resposta), "dd/MM/yyyy HH:mm") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleCopyLink(q.token)} title="Copiar link">
                        <ClipboardCopy className="h-4 w-4" />
                      </Button>
                      {q.status === "respondido" && q.respostas && (
                        <Button size="icon" variant="ghost" onClick={() => { setViewData(q); setViewOpen(true); }} title="Ver respostas">
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Send modal */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Enviar Questionário</DialogTitle></DialogHeader>
          <div>
            <Label>Tipo de questionário</Label>
            <Select value={sendTipo} onValueChange={setSendTipo}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <AvisarPacienteToggle
            checked={avisar}
            onCheckedChange={setAvisar}
            label="Enviar o link para a paciente por e-mail"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)}>Cancelar</Button>
            <Button onClick={handleSend} disabled={sending} className="bg-[#2B3990] hover:bg-[#2B3990]/90">
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {avisar ? "Criar e enviar" : "Criar e copiar link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View responses modal */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Respostas — {TIPOS.find(t => t.value === viewData?.tipo)?.label}</DialogTitle>
          </DialogHeader>
          {viewData?.respostas && typeof viewData.respostas === "object" ? (
            <div className="space-y-3">
              {Object.entries(viewData.respostas).map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs font-medium text-[#6B7080] capitalize">{key.replace(/_/g, " ")}</p>
                  <p className="text-sm text-[#1A1F3C] whitespace-pre-wrap">{String(value)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados de resposta.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
