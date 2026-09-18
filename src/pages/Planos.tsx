import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { CardsSkeleton } from "@/components/Loading";
import { Plus, Utensils } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const tipoRefeicaoLabels: Record<string, string> = {
  cafe_da_manha: "Café da Manhã",
  lanche_da_manha: "Lanche da Manhã",
  almoco: "Almoço",
  lanche_da_tarde: "Lanche da Tarde",
  jantar: "Jantar",
  ceia: "Ceia",
};

export default function Planos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [planos, setPlanos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPlano, setNewPlano] = useState({ nome: "", paciente_id: "", observacoes: "" });

  useEffect(() => {
    if (user) {
      loadPlanos();
      loadPacientes();
    }
  }, [user]);

  const loadPlanos = async () => {
    const { data } = await supabase
      .from("planos_alimentares")
      .select("*, pacientes(nome_completo)")
      .eq("is_template", false)
      .order("created_at", { ascending: false });
    setPlanos(data || []);
    setCarregando(false);
  };

  const loadPacientes = async () => {
    const { data } = await supabase.from("pacientes").select("id, nome_completo").eq("ativo", true).order("nome_completo");
    setPacientes(data || []);
  };

  const createPlano = async () => {
    if (!user || !newPlano.paciente_id) return;
    const { error } = await supabase.from("planos_alimentares").insert({
      user_id: user.id,
      paciente_id: newPlano.paciente_id,
      nome: newPlano.nome || "Plano Alimentar",
      observacoes: newPlano.observacoes || null,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Plano criado!" });
      setDialogOpen(false);
      setNewPlano({ nome: "", paciente_id: "", observacoes: "" });
      loadPlanos();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Planos Alimentares" description={`${planos.length} plano${planos.length !== 1 ? "s" : ""} cadastrado${planos.length !== 1 ? "s" : ""}`} icon={Utensils}>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo Plano</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Plano Alimentar</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Paciente *</Label>
                <Select value={newPlano.paciente_id} onValueChange={(v) => setNewPlano((p) => ({ ...p, paciente_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
                  <SelectContent>
                    {pacientes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome_completo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nome do Plano</Label>
                <Input value={newPlano.nome} onChange={(e) => setNewPlano((p) => ({ ...p, nome: e.target.value }))} placeholder="Plano Alimentar" />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={newPlano.observacoes} onChange={(e) => setNewPlano((p) => ({ ...p, observacoes: e.target.value }))} />
              </div>
              <Button onClick={createPlano} className="w-full">Criar Plano</Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {carregando ? <CardsSkeleton /> : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {planos.map((p) => (
          <Card key={p.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Utensils className="h-4 w-4 text-primary" />
                {p.nome}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{(p as any).pacientes?.nome_completo || "—"}</p>
              <p>{format(new Date(p.created_at), "dd/MM/yyyy")}</p>
              {p.observacoes && <p className="mt-1 text-xs">{p.observacoes}</p>}
            </CardContent>
          </Card>
        ))}
        {planos.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon={Utensils}
              title="Nenhum plano criado ainda"
              description="Crie um plano do zero ou anexe o PDF de um plano que você já montou."
            />
          </div>
        )}
      </div>
      )}
    </div>
  );
}
