import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PacienteForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const isEdit = !!editId;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [form, setForm] = useState({
    nome_completo: "",
    data_nascimento: "",
    sexo: "",
    telefone: "",
    email: "",
    peso_inicial: "",
    altura: "",
    objetivo: "outro" as string,
    objetivo_outro: "",
    restricoes_alimentares: "",
    alergias: "",
    historico_patologias: "",
    medicamentos: "",
    nivel_atividade: "sedentario" as string,
    rotina_sono: "",
    observacoes_comportamentais: "",
    fase_real: "rotina" as string,
  });

  useEffect(() => {
    if (!isEdit || !editId) return;
    (async () => {
      const { data, error } = await supabase.from("pacientes").select("*").eq("id", editId).maybeSingle();
      if (error || !data) {
        toast({ title: "Erro ao carregar paciente", description: error?.message || "Paciente não encontrado", variant: "destructive" });
        navigate("/pacientes");
        return;
      }
      setForm({
        nome_completo: data.nome_completo ?? "",
        data_nascimento: data.data_nascimento ?? "",
        sexo: data.sexo ?? "",
        telefone: data.telefone ?? "",
        email: data.email ?? "",
        peso_inicial: data.peso_inicial != null ? String(data.peso_inicial) : "",
        altura: data.altura != null ? String(data.altura) : "",
        objetivo: (data.objetivo as string) ?? "outro",
        objetivo_outro: data.objetivo_outro ?? "",
        restricoes_alimentares: data.restricoes_alimentares ?? "",
        alergias: data.alergias ?? "",
        historico_patologias: data.historico_patologias ?? "",
        medicamentos: data.medicamentos ?? "",
        nivel_atividade: (data.nivel_atividade as string) ?? "sedentario",
        rotina_sono: data.rotina_sono ?? "",
        observacoes_comportamentais: data.observacoes_comportamentais ?? "",
        fase_real: (data.fase_real as string) ?? "rotina",
      });
      setLoadingData(false);
    })();
  }, [isEdit, editId, navigate, toast]);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const payload = {
      nome_completo: form.nome_completo,
      data_nascimento: form.data_nascimento || null,
      sexo: form.sexo || null,
      telefone: form.telefone || null,
      email: form.email || null,
      peso_inicial: form.peso_inicial ? parseFloat(form.peso_inicial) : null,
      altura: form.altura ? parseFloat(form.altura) : null,
      objetivo: form.objetivo as any,
      objetivo_outro: form.objetivo_outro || null,
      restricoes_alimentares: form.restricoes_alimentares || null,
      alergias: form.alergias || null,
      historico_patologias: form.historico_patologias || null,
      medicamentos: form.medicamentos || null,
      nivel_atividade: form.nivel_atividade as any,
      rotina_sono: form.rotina_sono || null,
      observacoes_comportamentais: form.observacoes_comportamentais || null,
      fase_real: form.fase_real as any,
    };

    const { error } = isEdit
      ? await supabase.from("pacientes").update(payload).eq("id", editId!)
      : await supabase.from("pacientes").insert({ ...payload, user_id: user.id });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: isEdit ? "Paciente atualizado!" : "Paciente cadastrado!" });
      navigate(isEdit ? `/pacientes/${editId}` : "/pacientes");
    }
    setLoading(false);
  };

  if (loadingData) {
    return <div className="max-w-3xl mx-auto p-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate(isEdit ? `/pacientes/${editId}` : "/pacientes")} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>

      <PageHeader
        title={isEdit ? "Editar Paciente" : "Cadastrar Paciente"}
        description={isEdit ? "Atualize os dados cadastrais" : "Preencha os dados para criar o cadastro"}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Dados Pessoais</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label>Nome Completo *</Label>
              <Input value={form.nome_completo} onChange={(e) => set("nome_completo", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Data de Nascimento</Label>
              <Input type="date" value={form.data_nascimento} onChange={(e) => set("data_nascimento", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Sexo</Label>
              <Select value={form.sexo} onValueChange={(v) => set("sexo", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Antropometria e Objetivo</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Peso Inicial (kg)</Label>
              <Input type="number" step="0.1" value={form.peso_inicial} onChange={(e) => set("peso_inicial", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Altura (m)</Label>
              <Input type="number" step="0.01" value={form.altura} onChange={(e) => set("altura", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Objetivo Principal</Label>
              <Select value={form.objetivo} onValueChange={(v) => set("objetivo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="emagrecimento">Emagrecimento</SelectItem>
                  <SelectItem value="ganho_de_massa">Ganho de Massa</SelectItem>
                  <SelectItem value="saude_intestinal">Saúde Intestinal</SelectItem>
                  <SelectItem value="controle_ansiedade_alimentar">Controle de Ansiedade Alimentar</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.objetivo === "outro" && (
              <div className="space-y-2">
                <Label>Qual objetivo?</Label>
                <Input value={form.objetivo_outro} onChange={(e) => set("objetivo_outro", e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Fase do Método R.E.A.L.</Label>
              <Select value={form.fase_real} onValueChange={(v) => set("fase_real", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rotina">Rotina</SelectItem>
                  <SelectItem value="estrategia">Estratégia</SelectItem>
                  <SelectItem value="autonomia">Autonomia</SelectItem>
                  <SelectItem value="liberdade">Liberdade</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Saúde e Histórico</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>Restrições Alimentares</Label>
              <Textarea value={form.restricoes_alimentares} onChange={(e) => set("restricoes_alimentares", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Alergias</Label>
              <Textarea value={form.alergias} onChange={(e) => set("alergias", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Histórico de Patologias</Label>
              <Textarea value={form.historico_patologias} onChange={(e) => set("historico_patologias", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Uso de Medicamentos</Label>
              <Textarea value={form.medicamentos} onChange={(e) => set("medicamentos", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nível de Atividade Física</Label>
              <Select value={form.nivel_atividade} onValueChange={(v) => set("nivel_atividade", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentario">Sedentário</SelectItem>
                  <SelectItem value="leve">Leve</SelectItem>
                  <SelectItem value="moderado">Moderado</SelectItem>
                  <SelectItem value="intenso">Intenso</SelectItem>
                  <SelectItem value="muito_intenso">Muito Intenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rotina de Sono</Label>
              <Textarea value={form.rotina_sono} onChange={(e) => set("rotina_sono", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Observações Comportamentais</Label>
              <Textarea value={form.observacoes_comportamentais} onChange={(e) => set("observacoes_comportamentais", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Salvando..." : isEdit ? "Salvar Alterações" : "Cadastrar Paciente"}
        </Button>
      </form>
    </div>
  );
}
