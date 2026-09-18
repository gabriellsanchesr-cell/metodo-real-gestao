import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, AlertTriangle, Clock, CheckCircle2, UserX, Database, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/PageHeader";
import { StatCard, StatGrid } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { StatsSkeleton, TableSkeleton } from "@/components/Loading";
import { ESTILO_SITUACAO } from "@/components/paciente/estiloVencimento";
import { useVencimentos } from "@/hooks/useVencimentos";
import { formatarData, progressoPeriodo, rotuloModalidade, rotuloPrazo, type Situacao } from "@/lib/vencimento";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

type Filtro = "todos" | "atencao" | "em_dia" | "sem_plano";

export default function Vencimentos() {
  const navigate = useNavigate();
  const { linhas, urgentes, semPlano, diasAlerta, carregando, semTabela } = useVencimentos();
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const cont = useMemo(() => {
    const por = (s: Situacao[]) => linhas.filter((l) => s.includes(l.situacao)).length;
    return {
      vencidos: por(["vencido"]),
      vencendo: por(["vence_hoje", "vencendo"]),
      emDia: por(["em_dia"]),
    };
  }, [linhas]);

  const visiveis = filtro === "atencao" ? urgentes
    : filtro === "em_dia" ? linhas.filter((l) => l.situacao === "em_dia")
    : linhas;

  const abrir = (pacienteId: string) => navigate(`/pacientes/${pacienteId}?secao=contrato`);

  if (semTabela) {
    return (
      <div className="space-y-6">
        <PageHeader title="Vencimentos" icon={CalendarClock} />
        <Card className="border-border/60 shadow-sm">
          <EmptyState
            icon={Database}
            title="Aguardando a atualização do banco"
            description="A tela está pronta. Assim que a migration for aplicada no Supabase, os vencimentos aparecem aqui."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vencimentos"
        description={`Planos das pacientes, do vencimento mais próximo ao mais distante. Destaque a partir de ${diasAlerta} dias antes.`}
        icon={CalendarClock}
      />

      {carregando ? <StatsSkeleton /> : (
        <StatGrid>
          <StatCard label="Vencidos" value={cont.vencidos} icon={AlertTriangle} tone="destructive" onClick={() => setFiltro("atencao")} />
          <StatCard label={`Vencem em ${diasAlerta} dias`} value={cont.vencendo} icon={Clock} tone="warning" onClick={() => setFiltro("atencao")} />
          <StatCard label="Em dia" value={cont.emDia} icon={CheckCircle2} tone="success" onClick={() => setFiltro("em_dia")} />
          <StatCard label="Sem plano registrado" value={semPlano.length} icon={UserX} tone="neutral" onClick={() => setFiltro("sem_plano")} />
        </StatGrid>
      )}

      <div className="flex flex-wrap gap-1.5">
        {([
          ["todos", "Todos", linhas.length],
          ["atencao", "Precisam de atenção", urgentes.length],
          ["em_dia", "Em dia", cont.emDia],
          ["sem_plano", "Sem plano", semPlano.length],
        ] as [Filtro, string, number][]).map(([v, rotulo, n]) => (
          <Button
            key={v}
            size="sm"
            variant={filtro === v ? "default" : "outline"}
            className="rounded-full px-4 text-xs"
            onClick={() => setFiltro(v)}
          >
            {rotulo}<span className="ml-1.5 tabular-nums opacity-70">{n}</span>
          </Button>
        ))}
      </div>

      {carregando ? <TableSkeleton rows={5} cols={4} /> : filtro === "sem_plano" ? (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Pacientes ativas sem período registrado</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {semPlano.length === 0 ? (
              <EmptyState compact icon={CheckCircle2} title="Todas as pacientes ativas têm plano registrado" />
            ) : (
              <div className="divide-y divide-border/50">
                {semPlano.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => abrir(p.id)}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-muted/40 sm:px-2 sm:rounded-lg"
                  >
                    <span className="font-medium text-foreground">{p.nome_completo}</span>
                    <span className="flex items-center gap-1 text-sm text-primary">Registrar <ChevronRight className="h-4 w-4" /></span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : visiveis.length === 0 ? (
        <Card className="border-border/60 shadow-sm">
          <EmptyState
            icon={CalendarClock}
            title={linhas.length === 0 ? "Nenhum plano registrado ainda" : "Nada neste filtro"}
            description={linhas.length === 0
              ? "Registre o plano contratado na ficha de cada paciente, na seção 'Plano contratado'."
              : "Troque o filtro acima para ver as outras pacientes."}
          />
        </Card>
      ) : (
        <div className="grid gap-3">
          {visiveis.map((l) => {
            const e = ESTILO_SITUACAO[l.situacao];
            const c = l.contrato;
            return (
              <Card
                key={c.id}
                onClick={() => abrir(l.pacienteId)}
                className="cursor-pointer border-border/60 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-foreground">{l.nome}</p>
                      <Badge variant="outline" className={cn("rounded-full", e.badge)}>{rotuloPrazo(l.dias)}</Badge>
                    </div>
                    <Progress value={progressoPeriodo(c.data_inicio, c.data_vencimento)} className={cn("h-1.5", e.barra)} />
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm sm:text-right">
                    <div>
                      <p className="text-xs text-muted-foreground">{rotuloModalidade(c.modalidade)}</p>
                      <p className="font-medium text-foreground">{c.valor ? formatBRL(c.valor) : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Início</p>
                      <p className="font-medium text-foreground">{formatarData(c.data_inicio)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Vencimento</p>
                      <p className="font-medium text-foreground">{formatarData(c.data_vencimento)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
