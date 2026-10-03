import { useEffect, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { PortalSubstituicoes } from "@/components/portal/PortalSubstituicoes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { itensDoPlano, type ItemDoPlano } from "@/lib/substituicoes";
import { format } from "date-fns";

const SEM_PACIENTE = "nenhuma";

interface PacienteOpcao { id: string; nome_completo: string }

type PlanoAtivo = NonNullable<Parameters<typeof itensDoPlano>[0]> & { id: string; titulo?: string | null; created_at: string };

/**
 * A mesma calculadora do portal, para o nutri. Escolhendo uma paciente,
 * os alimentos do plano ativo dela aparecem prontos, como ela vê.
 */
export default function Substituicoes() {
  const [pacientes, setPacientes] = useState<PacienteOpcao[]>([]);
  const [pacienteId, setPacienteId] = useState(SEM_PACIENTE);
  const [itens, setItens] = useState<ItemDoPlano[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [semPlano, setSemPlano] = useState(false);
  const [planos, setPlanos] = useState<PlanoAtivo[]>([]);
  const [planoId, setPlanoId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("pacientes")
      .select("id, nome_completo")
      .or("ativo.is.null,ativo.eq.true")
      .order("nome_completo")
      .then(({ data }) => setPacientes(data || []));
  }, []);

  useEffect(() => {
    setItens([]);
    setSemPlano(false);
    setPlanos([]);
    setPlanoId(null);
    if (pacienteId === SEM_PACIENTE) return;
    let cancelado = false;
    setCarregando(true);
    supabase
      .from("planos_alimentares")
      .select("*, refeicoes(*, alimentos_plano(*))")
      .eq("paciente_id", pacienteId)
      .eq("status", "ativo")
      // Todos os ativos: há pacientes com dois de propósito (semana e fim de
      // semana). Abre no mais novo, que é o que acabou de ser entregue.
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelado) return;
        const lista = (data || []) as unknown as PlanoAtivo[];
        setPlanos(lista);
        setPlanoId(lista[0]?.id ?? null);
        setItens(itensDoPlano(lista[0]));
        setSemPlano(lista.length === 0);
        setCarregando(false);
      });
    return () => { cancelado = true; };
  }, [pacienteId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Substituições"
        description="Equivalência calórica entre alimentos do mesmo grupo, com os valores da TACO. É a mesma calculadora que a paciente vê no portal."
        icon={ArrowRightLeft}
      />

      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ver com o plano de</p>
          <Select value={pacienteId} onValueChange={setPacienteId}>
            <SelectTrigger className="h-11 rounded-xl bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEM_PACIENTE}>Nenhuma paciente (só a tabela)</SelectItem>
              {pacientes.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome_completo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {planos.length > 1 && (
            <Select
              value={planoId ?? undefined}
              onValueChange={(id) => { setPlanoId(id); setItens(itensDoPlano(planos.find((p) => p.id === id))); }}
            >
              <SelectTrigger className="h-10 rounded-xl bg-card text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {planos.map((p, i) => (
                  <SelectItem key={p.id} value={p.id}>
                    {(p.titulo || "Plano alimentar").trim()} · {format(new Date(p.created_at), "dd/MM/yyyy")}{i === 0 ? " (mais novo)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {carregando && <p className="text-xs text-muted-foreground">Carregando o plano...</p>}
          {!carregando && semPlano && (
            <p className="text-xs text-muted-foreground">Esta paciente não tem plano ativo.</p>
          )}
          {!carregando && !semPlano && pacienteId !== SEM_PACIENTE && itens.length === 0 && (
            <p className="text-xs text-muted-foreground">
              O plano ativo não tem alimentos lidos para a calculadora. Se for PDF anexado, use "Ler alimentos do PDF" na ficha dela.
            </p>
          )}
        </div>

        {/* key: trocar de paciente recomeça a calculadora com os alimentos dela. */}
        <PortalSubstituicoes key={`${pacienteId}:${planoId}:${itens.length}`} itensPlano={itens} semTitulo />
      </div>
    </div>
  );
}
