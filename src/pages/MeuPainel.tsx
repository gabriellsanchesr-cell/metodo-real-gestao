import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogOut, User, Utensils, Activity, ClipboardList } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MeuPainel() {
  const { user, signOut } = useAuth();
  const [paciente, setPaciente] = useState<any>(null);
  const [plano, setPlano] = useState<any>(null);
  const [acompanhamentos, setAcompanhamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    // Get patient record linked to this auth user
    const { data: pac } = await supabase
      .from("pacientes")
      .select("*")
      .eq("auth_user_id", user!.id)
      .single();

    setPaciente(pac);

    if (pac) {
      // Get latest plan
      const { data: planoData } = await supabase
        .from("planos_alimentares")
        .select("*, refeicoes(*, alimentos_plano(*))")
        .eq("paciente_id", pac.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      setPlano(planoData);

      // Get acompanhamentos
      const { data: acomp } = await supabase
        .from("acompanhamentos")
        .select("*")
        .eq("paciente_id", pac.id)
        .order("data_registro", { ascending: false })
        .limit(10);
      setAcompanhamentos(acomp || []);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!paciente) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>Seu perfil de paciente ainda não foi vinculado.</p>
            <p className="text-sm mt-2">Entre em contato com seu nutricionista.</p>
            <Button variant="outline" className="mt-4" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tipoRefeicaoLabels: Record<string, string> = {
    cafe_da_manha: "Café da Manhã",
    lanche_da_manha: "Lanche da Manhã",
    almoco: "Almoço",
    lanche_da_tarde: "Lanche da Tarde",
    jantar: "Jantar",
    ceia: "Ceia",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Método R.E.A.L" className="h-8 w-8 rounded-lg object-contain" />
          <div>
            <h1 className="text-lg font-bold text-foreground">Meu Painel</h1>
            <p className="text-sm text-muted-foreground">{paciente.nome_completo}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" /> Sair
        </Button>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <Tabs defaultValue="dados">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="dados" className="flex items-center gap-1">
              <User className="h-4 w-4" /> Meus Dados
            </TabsTrigger>
            <TabsTrigger value="plano" className="flex items-center gap-1">
              <Utensils className="h-4 w-4" /> Plano
            </TabsTrigger>
            <TabsTrigger value="evolucao" className="flex items-center gap-1">
              <Activity className="h-4 w-4" /> Evolução
            </TabsTrigger>
            <TabsTrigger value="checklist" className="flex items-center gap-1">
              <ClipboardList className="h-4 w-4" /> Checklist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Informações Pessoais</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                <p><span className="text-muted-foreground">Nome:</span> {paciente.nome_completo}</p>
                <p><span className="text-muted-foreground">E-mail:</span> {paciente.email || "—"}</p>
                <p><span className="text-muted-foreground">Telefone:</span> {paciente.telefone || "—"}</p>
                <p><span className="text-muted-foreground">Objetivo:</span> {paciente.objetivo?.replace(/_/g, " ") || "—"}</p>
                <p><span className="text-muted-foreground">Fase:</span> <Badge variant="secondary">{paciente.fase_real}</Badge></p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plano" className="mt-4">
            {plano ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">{plano.nome}</CardTitle></CardHeader>
                  <CardContent>
                    {plano.observacoes && <p className="text-sm text-muted-foreground mb-4">{plano.observacoes}</p>}
                    <div className="space-y-4">
                      {plano.refeicoes?.sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0)).map((ref: any) => (
                        <div key={ref.id} className="border rounded-lg p-4">
                          <h4 className="font-semibold text-sm mb-2">{tipoRefeicaoLabels[ref.tipo] || ref.tipo}</h4>
                          {ref.alimentos_plano?.map((ali: any) => (
                            <div key={ali.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                              <span>{ali.nome_alimento} — {ali.medida_caseira}</span>
                              <span className="text-muted-foreground">{ali.energia_kcal} kcal</span>
                            </div>
                          ))}
                          {ref.observacoes && <p className="text-xs text-muted-foreground mt-2">📝 {ref.observacoes}</p>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum plano alimentar disponível ainda.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="evolucao" className="mt-4">
            {acompanhamentos.length > 0 ? (
              <div className="space-y-3">
                {acompanhamentos.map((a) => (
                  <Card key={a.id}>
                    <CardContent className="p-4 text-sm space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{new Date(a.data_registro).toLocaleDateString("pt-BR")}</span>
                        {a.peso && <Badge variant="outline">{a.peso} kg</Badge>}
                      </div>
                      {a.observacoes_nutricionista && <p className="text-muted-foreground">🩺 {a.observacoes_nutricionista}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum acompanhamento registrado.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="checklist" className="mt-4">
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>O checklist semanal estará disponível quando seu nutricionista enviá-lo.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
