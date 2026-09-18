import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function Acompanhamento() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [selectedPaciente, setSelectedPaciente] = useState("");
  const [acompanhamentos, setAcompanhamentos] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    paciente_id: "",
    peso: "",
    circunferencia_abdominal: "",
    circunferencia_quadril: "",
    nivel_energia: 3,
    qualidade_sono: 3,
    aderencia_plano: 80,
    observacoes_paciente: "",
    observacoes_nutricionista: "",
  });

  useEffect(() => {
    if (user) loadPacientes();
  }, [user]);

  useEffect(() => {
    if (selectedPaciente) loadAcompanhamentos();
  }, [selectedPaciente]);

  const loadPacientes = async () => {
    const { data } = await supabase.from("pacientes").select("id, nome_completo").eq("ativo", true).order("nome_completo");
    setPacientes(data || []);
  };

  const loadAcompanhamentos = async () => {
    const { data } = await supabase
      .from("acompanhamentos")
      .select("*")
      .eq("paciente_id", selectedPaciente)
      .order("data_registro");
    setAcompanhamentos(data || []);
  };

  const handleSave = async () => {
    if (!user || !form.paciente_id) return;
    const { error } = await supabase.from("acompanhamentos").insert({
      user_id: user.id,
      paciente_id: form.paciente_id,
      peso: form.peso ? parseFloat(form.peso) : null,
      circunferencia_abdominal: form.circunferencia_abdominal ? parseFloat(form.circunferencia_abdominal) : null,
      circunferencia_quadril: form.circunferencia_quadril ? parseFloat(form.circunferencia_quadril) : null,
      nivel_energia: form.nivel_energia,
      qualidade_sono: form.qualidade_sono,
      aderencia_plano: form.aderencia_plano,
      observacoes_paciente: form.observacoes_paciente || null,
      observacoes_nutricionista: form.observacoes_nutricionista || null,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Acompanhamento registrado!" });
      setDialogOpen(false);
      if (selectedPaciente === form.paciente_id) loadAcompanhamentos();
    }
  };

  const chartData = acompanhamentos.map((a) => ({
    data: a.data_registro,
    peso: a.peso,
    abdominal: a.circunferencia_abdominal,
    quadril: a.circunferencia_quadril,
  }));

  const ultimo = acompanhamentos.length > 0 ? acompanhamentos[acompanhamentos.length - 1] : null;
  const penultimo = acompanhamentos.length > 1 ? acompanhamentos[acompanhamentos.length - 2] : null;
  const variacao = ultimo?.peso && penultimo?.peso ? (ultimo.peso - penultimo.peso).toFixed(1) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Acompanhamento" description="Evolução de peso e medidas por paciente" icon={Activity}>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo Registro</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Registrar Acompanhamento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Paciente *</Label>
                <Select value={form.paciente_id} onValueChange={(v) => setForm((f) => ({ ...f, paciente_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {pacientes.map((p) => (<SelectItem key={p.id} value={p.id}>{p.nome_completo}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Peso (kg)</Label>
                  <Input type="number" step="0.1" value={form.peso} onChange={(e) => setForm((f) => ({ ...f, peso: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Circ. Abdominal</Label>
                  <Input type="number" step="0.1" value={form.circunferencia_abdominal} onChange={(e) => setForm((f) => ({ ...f, circunferencia_abdominal: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Circ. Quadril</Label>
                  <Input type="number" step="0.1" value={form.circunferencia_quadril} onChange={(e) => setForm((f) => ({ ...f, circunferencia_quadril: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Energia: {form.nivel_energia}/5</Label>
                <Slider value={[form.nivel_energia]} onValueChange={([v]) => setForm((f) => ({ ...f, nivel_energia: v }))} min={1} max={5} step={1} />
              </div>
              <div className="space-y-2">
                <Label>Sono: {form.qualidade_sono}/5</Label>
                <Slider value={[form.qualidade_sono]} onValueChange={([v]) => setForm((f) => ({ ...f, qualidade_sono: v }))} min={1} max={5} step={1} />
              </div>
              <div className="space-y-2">
                <Label>Aderência ao plano: {form.aderencia_plano}%</Label>
                <Slider value={[form.aderencia_plano]} onValueChange={([v]) => setForm((f) => ({ ...f, aderencia_plano: v }))} min={0} max={100} step={5} />
              </div>
              <div className="space-y-2">
                <Label>Observações do Paciente</Label>
                <Textarea value={form.observacoes_paciente} onChange={(e) => setForm((f) => ({ ...f, observacoes_paciente: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Observações Clínicas</Label>
                <Textarea value={form.observacoes_nutricionista} onChange={(e) => setForm((f) => ({ ...f, observacoes_nutricionista: e.target.value }))} />
              </div>
              <Button onClick={handleSave} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="space-y-2">
        <Label>Selecione o paciente para ver evolução</Label>
        <Select value={selectedPaciente} onValueChange={setSelectedPaciente}>
          <SelectTrigger className="max-w-sm"><SelectValue placeholder="Selecione um paciente" /></SelectTrigger>
          <SelectContent>
            {pacientes.map((p) => (<SelectItem key={p.id} value={p.id}>{p.nome_completo}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {selectedPaciente && (
        <>
          {variacao !== null && (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Variação semanal:</span>
                <span className={`text-lg font-bold ${parseFloat(variacao) < 0 ? "text-success" : parseFloat(variacao) > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {parseFloat(variacao) > 0 ? "+" : ""}{variacao} kg
                </span>
              </CardContent>
            </Card>
          )}

          {chartData.length > 1 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Evolução</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="peso" stroke="hsl(233, 38%, 55%)" name="Peso (kg)" strokeWidth={2} />
                    <Line type="monotone" dataKey="abdominal" stroke="hsl(38, 92%, 50%)" name="Abdominal (cm)" strokeWidth={2} />
                    <Line type="monotone" dataKey="quadril" stroke="hsl(152, 60%, 42%)" name="Quadril (cm)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
