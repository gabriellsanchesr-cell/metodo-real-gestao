import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, CalendarDays } from "lucide-react";
import { AvisarPacienteToggle } from "@/components/AvisarPacienteToggle";
import { avisarPaciente } from "@/lib/notificacoes";

const tipoLabels: Record<string, string> = {
  primeira_consulta: "Primeira Consulta", retorno: "Retorno", online: "Online", presencial: "Presencial",
};
const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  agendado: { label: "Agendada", variant: "default" },
  realizado: { label: "Realizada", variant: "secondary" },
  cancelado: { label: "Cancelada", variant: "destructive" },
};

interface Props { paciente: any; }

export function ConsultasSection({ paciente }: Props) {
  const [consultas, setConsultas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();

  const [avisar, setAvisar] = useState(true);
  const [form, setForm] = useState({
    data_hora: "",
    tipo: "retorno" as string,
    status: "agendado" as string,
    anotacoes: "",
  });

  useEffect(() => { load(); }, [paciente.id]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("consultas")
      .select("*")
      .eq("paciente_id", paciente.id)
      .order("data_hora", { ascending: false });
    setConsultas(data || []);
    setLoading(false);
  };

  const podeAvisar = form.status === "agendado" && !!form.data_hora && new Date(form.data_hora) > new Date();

  const handleSave = async () => {
    if (!session?.user?.id || !form.data_hora) return;
    const dataHoraISO = new Date(form.data_hora).toISOString();
    const { error } = await supabase.from("consultas").insert({
      paciente_id: paciente.id,
      user_id: session.user.id,
      data_hora: dataHoraISO,
      tipo: form.tipo as any,
      status: form.status as any,
      anotacoes: form.anotacoes || null,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Consulta registrada" });
      // Registro de consulta que já aconteceu não é aviso para a paciente.
      if (podeAvisar && avisar) avisarPaciente(paciente.id, "consulta_agendada", { data: dataHoraISO });
      setModalOpen(false);
      setAvisar(true);
      setForm({ data_hora: "", tipo: "retorno", status: "agendado", anotacoes: "" });
      load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">Consultas</h3>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Registrar Consulta
        </Button>
      </div>

      <Card className="border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Anotações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : consultas.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                <CalendarDays className="h-6 w-6 mx-auto mb-2 opacity-50" />
                Nenhuma consulta registrada.
              </TableCell></TableRow>
            ) : (
              consultas.map(c => {
                const sCfg = statusLabels[c.status] || statusLabels.agendado;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{new Date(c.data_hora).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</TableCell>
                    <TableCell>{tipoLabels[c.tipo] || c.tipo}</TableCell>
                    <TableCell><Badge variant={sCfg.variant}>{sCfg.label}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[200px]">{c.anotacoes || "—"}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Consulta</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Data e Hora</Label><Input type="datetime-local" value={form.data_hora} onChange={e => setForm(f => ({ ...f, data_hora: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primeira_consulta">Primeira Consulta</SelectItem>
                    <SelectItem value="retorno">Retorno</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agendado">Agendada</SelectItem>
                    <SelectItem value="realizado">Realizada</SelectItem>
                    <SelectItem value="cancelado">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Anotações Clínicas</Label><Textarea value={form.anotacoes} onChange={e => setForm(f => ({ ...f, anotacoes: e.target.value }))} rows={4} /></div>
          </div>
          {podeAvisar && <AvisarPacienteToggle checked={avisar} onCheckedChange={setAvisar} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.data_hora}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
