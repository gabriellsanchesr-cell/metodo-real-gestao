import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, CheckCheck, ClipboardCheck, Ruler, Trash2, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  PERGUNTAS, checkinPendente, mediaDoCheckin, pontosDeAtencao, semanaDoCheckin, variacaoMedidas, type Checkin,
} from "@/lib/checkin";
import { definirMedidasNoCheckin, excluirCheckin, listarCheckins, marcarCheckinVisto } from "@/lib/checkinApi";
import { formatarData } from "@/lib/vencimento";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  paciente: any;
}

const COR_NOTA = ["bg-muted", "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-lime-500", "bg-emerald-500"];
const br = (n: number) => String(n).replace(".", ",");

/**
 * Check-ins semanais que a paciente respondeu no portal. O que tem nota
 * baixa ou texto de dificuldade aparece primeiro, para a leitura ser rápida.
 */
export function CheckinSection({ paciente }: Props) {
  const { toast } = useToast();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [semTabela, setSemTabela] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [medidasLigadas, setMedidasLigadas] = useState<boolean>(paciente.checkin_medidas === true);

  const carregar = useCallback(async () => {
    const r = await listarCheckins(paciente.id, 52);
    setCheckins(r.checkins);
    setSemTabela(r.semTabela);
    setCarregando(false);
  }, [paciente.id]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { setMedidasLigadas(paciente.checkin_medidas === true); }, [paciente.id, paciente.checkin_medidas]);

  const alternarMedidas = async (ligado: boolean) => {
    setMedidasLigadas(ligado);
    try {
      await definirMedidasNoCheckin(paciente.id, ligado);
      toast({ title: ligado ? "Medidas pedidas a cada 15 dias" : "Medidas fora do check-in" });
    } catch (e) {
      setMedidasLigadas(!ligado);
      toast({ title: "Não consegui salvar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const marcarVisto = async (c: Checkin) => {
    try {
      await marcarCheckinVisto(c.id, !c.visto_nutri);
      setCheckins((lista) => lista.map((x) => (x.id === c.id ? { ...x, visto_nutri: !c.visto_nutri } : x)));
    } catch (e) {
      toast({ title: "Não consegui marcar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const excluir = async (c: Checkin) => {
    if (!window.confirm(`Excluir o check-in da semana de ${formatarData(c.semana)}? Não dá para desfazer. O peso que ele lançou no Acompanhamento Semanal continua lá.`)) return;
    try {
      await excluirCheckin(c.id);
      setCheckins((lista) => lista.filter((x) => x.id !== c.id));
    } catch (e) {
      toast({ title: "Não consegui excluir", description: (e as Error).message, variant: "destructive" });
    }
  };

  if (carregando) return <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>;

  if (semTabela) {
    return (
      <Card className="rounded-xl border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          <ClipboardCheck className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Falta aplicar no banco a migration 20261010120000_checkin_semanal.sql para o check-in funcionar.
        </CardContent>
      </Card>
    );
  }

  const usaPortal = paciente.account_status === "ativo";

  return (
    <div className="space-y-4">
      <Card className="rounded-xl">
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Check-in semanal</p>
            <p className="text-xs text-muted-foreground">
              {!usaPortal
                ? "Esta paciente não tem o portal liberado, então não recebe o check-in."
                : checkinPendente(checkins)
                  ? `Ainda não respondeu a semana de ${formatarData(semanaDoCheckin())}. O lembrete sai por e-mail no sábado.`
                  : `Já respondeu a semana de ${formatarData(semanaDoCheckin())}.`}
            </p>
          </div>
          <label className="flex items-center gap-2.5 text-sm">
            <Switch checked={medidasLigadas} onCheckedChange={alternarMedidas} />
            <span>
              <span className="font-medium text-foreground">Pedir medidas a cada 15 dias</span>
              <span className="block text-xs text-muted-foreground">Para pacientes on-line: circunferências no check-in.</span>
            </span>
          </label>
        </CardContent>
      </Card>

      {checkins.length === 0 ? (
        <Card className="rounded-xl border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <ClipboardCheck className="mx-auto mb-2 h-8 w-8 opacity-40" />
            Nenhum check-in respondido ainda.
          </CardContent>
        </Card>
      ) : checkins.map((c, i) => {
        const pontos = pontosDeAtencao(c);
        const media = mediaDoCheckin(c);
        const medidas = variacaoMedidas(c.medidas, checkins.slice(i + 1).map((x) => x.medidas));
        const pesoAnterior = checkins.slice(i + 1).find((x) => x.peso != null)?.peso ?? null;
        const difPeso = c.peso != null && pesoAnterior != null ? Math.round((Number(c.peso) - Number(pesoAnterior)) * 10) / 10 : null;
        return (
          <Card key={c.id} className={`rounded-xl ${c.visto_nutri ? "" : "border-primary/40"}`}>
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-foreground">Semana de {formatarData(c.semana)}</p>
                {!c.visto_nutri && <Badge className="rounded-full text-[10px]">Novo</Badge>}
                {media != null && <Badge variant="outline" className="rounded-full text-[10px]">média {br(media)}</Badge>}
                {c.peso != null && (
                  <Badge variant="outline" className="rounded-full text-[10px]">
                    {br(Number(c.peso))} kg{difPeso != null && difPeso !== 0 ? ` (${difPeso > 0 ? "+" : ""}${br(difPeso)})` : ""}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">respondido em {new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
                <Button variant={c.visto_nutri ? "ghost" : "outline"} size="sm" className="ml-auto h-8 rounded-lg" onClick={() => marcarVisto(c)}>
                  <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> {c.visto_nutri ? "Visto" : "Marcar como visto"}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => excluir(c)} aria-label="Excluir check-in">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>

              {pontos.length > 0 && (
                <div className="space-y-1.5 rounded-lg border border-warning/30 bg-warning/10 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" /> Pontos de atenção
                  </p>
                  {pontos.map((p) => (
                    <p key={p.rotulo} className="text-sm text-foreground">
                      <span className="font-medium">{p.rotulo}{p.nota != null ? ` (nota ${p.nota})` : ""}{p.texto ? ":" : ""}</span>{" "}
                      {p.texto && <span className="whitespace-pre-line text-muted-foreground">{p.texto}</span>}
                    </p>
                  ))}
                </div>
              )}

              <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {PERGUNTAS.map((p) => {
                  const nota = c[p.id];
                  const texto = c.comentarios?.[p.id];
                  return (
                    <div key={p.id} className="min-w-0">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-foreground">{p.rotulo}</span>
                        <span className="tabular-nums text-muted-foreground">{nota ?? "—"}/5</span>
                      </div>
                      <div className="mt-1 flex gap-1" aria-hidden>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span key={n} className={`h-1.5 flex-1 rounded-full ${nota != null && n <= nota ? COR_NOTA[nota] : "bg-muted"}`} />
                        ))}
                      </div>
                      {texto && (nota == null || nota > 2) && <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{texto}</p>}
                    </div>
                  );
                })}
              </div>

              {c.conquista && (
                <p className="flex items-start gap-2 text-sm text-foreground">
                  <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span className="whitespace-pre-line">{c.conquista}</span>
                </p>
              )}

              {medidas.length > 0 && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Ruler className="h-3.5 w-3.5 text-primary" /> Medidas (cm)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {medidas.map((m) => (
                      <Badge key={m.key} variant="outline" className="rounded-full font-normal">
                        {m.label}: <span className="ml-1 font-semibold">{br(m.valor)}</span>
                        {m.variacao != null && m.variacao !== 0 && (
                          <span className="ml-1 text-muted-foreground">({m.variacao > 0 ? "+" : ""}{br(m.variacao)})</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
