import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ClipboardCopy, FileText, Edit, User, Stethoscope, Loader2 } from "lucide-react";
import { format } from "date-fns";

const SECTIONS = [
  { key: "objetivos_motivacoes", label: "Objetivos e Motivações" },
  { key: "historico_treino", label: "Histórico de Treino e Rotina" },
  { key: "historico_alimentar", label: "Histórico Alimentar" },
  { key: "saude_intestinal", label: "Saúde Intestinal" },
  { key: "sono_estresse", label: "Sono e Estresse" },
  { key: "historico_medico", label: "Histórico Médico" },
  { key: "espaco_livre", label: "Espaço Livre" },
] as const;

type SectionKey = typeof SECTIONS[number]["key"];

interface Props {
  paciente: any;
}

export function AnamneseSection({ paciente }: Props) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [anamnese, setAnamnese] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<SectionKey, string>>({
    objetivos_motivacoes: "",
    historico_treino: "",
    historico_alimentar: "",
    saude_intestinal: "",
    sono_estresse: "",
    historico_medico: "",
    espaco_livre: "",
  });

  useEffect(() => {
    loadAnamnese();
  }, [paciente.id]);

  const loadAnamnese = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("anamneses")
      .select("*")
      .eq("paciente_id", paciente.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setAnamnese(data);
    if (data) {
      setFormData({
        objetivos_motivacoes: data.objetivos_motivacoes || "",
        historico_treino: data.historico_treino || "",
        historico_alimentar: data.historico_alimentar || "",
        saude_intestinal: data.saude_intestinal || "",
        sono_estresse: data.sono_estresse || "",
        historico_medico: data.historico_medico || "",
        espaco_livre: data.espaco_livre || "",
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!session?.user?.id) return;
    setSaving(true);
    try {
      if (anamnese) {
        const { error } = await supabase
          .from("anamneses")
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq("id", anamnese.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("anamneses").insert({
          paciente_id: paciente.id,
          user_id: session.user.id,
          ...formData,
          preenchido_por: "nutricionista",
          respondido: true,
        });
        if (error) throw error;
      }
      toast({ title: "Salvo", description: "Anamnese salva com sucesso." });
      setFormOpen(false);
      loadAnamnese();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSendLink = async () => {
    if (!session?.user?.id) return;
    try {
      let token = anamnese?.token;
      if (!token) {
        const { data, error } = await supabase.from("anamneses").insert({
          paciente_id: paciente.id,
          user_id: session.user.id,
          preenchido_por: "paciente",
          respondido: false,
        }).select("token").single();
        if (error) throw error;
        token = data.token;
        loadAnamnese();
      }
      const url = `${window.location.origin}/anamnese/${token}`;
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copiado!", description: "Envie o link ao paciente para preenchimento." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!anamnese || !anamnese.respondido) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#0E1E35]">Anamnese</h2>
        </div>
        <Card className="border-[#E2E5F0] rounded-xl">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground text-center">Nenhuma anamnese preenchida para este paciente.</p>
            <div className="flex gap-3">
              <Button onClick={handleSendLink} variant="outline" className="border-[#004AAD] text-[#004AAD]">
                <ClipboardCopy className="h-4 w-4 mr-2" />
                Enviar link ao paciente
              </Button>
              <Button onClick={() => { setFormOpen(true); }} className="bg-[#004AAD] hover:bg-[#004AAD]/90">
                <Edit className="h-4 w-4 mr-2" />
                Preencher manualmente
              </Button>
            </div>
          </CardContent>
        </Card>
        <AnamneseFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          formData={formData}
          setFormData={setFormData}
          onSave={handleSave}
          saving={saving}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#0E1E35]">Anamnese</h2>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1">
            {anamnese.preenchido_por === "paciente" ? (
              <><User className="h-3 w-3" /> Paciente</>
            ) : (
              <><Stethoscope className="h-3 w-3" /> Nutricionista</>
            )}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {format(new Date(anamnese.updated_at || anamnese.created_at), "dd/MM/yyyy")}
          </span>
          <Button size="sm" variant="outline" onClick={() => setFormOpen(true)} className="border-[#004AAD] text-[#004AAD]">
            <Edit className="h-4 w-4 mr-1" /> Editar
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {SECTIONS.map(({ key, label }) => (
          <Card key={key} className="border-[#E2E5F0] rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#6B7080]">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#0E1E35] whitespace-pre-wrap">
                {(anamnese as any)[key] || <span className="text-muted-foreground italic">Não preenchido</span>}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AnamneseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        formData={formData}
        setFormData={setFormData}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}

function AnamneseFormDialog({
  open, onOpenChange, formData, setFormData, onSave, saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  formData: Record<SectionKey, string>;
  setFormData: (v: Record<SectionKey, string>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preencher Anamnese</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {SECTIONS.map(({ key, label }) => (
            <div key={key}>
              <Label className="text-[#6B7080]">{label}</Label>
              <Textarea
                value={formData[key]}
                onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave} disabled={saving} className="bg-[#004AAD] hover:bg-[#004AAD]/90">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
