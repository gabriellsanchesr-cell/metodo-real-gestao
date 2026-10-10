import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ClipboardCheck, Loader2, MessageSquarePlus, Pencil, Ruler, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { bloqueadoNaVisualizacao, usePortalModo } from "@/contexts/PortalModoContext";
import {
  MEDIDAS_CORPO, PERGUNTAS, checkinDaSemana, mediaDoCheckin, pedirMedidas, semanaDoCheckin,
  type Checkin, type NotaCheckin,
} from "@/lib/checkin";
import { salvarCheckin } from "@/lib/checkinApi";
import { formatarData } from "@/lib/vencimento";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  paciente: any;
  checkins: Checkin[];
  /** A tabela ainda não existe no banco. */
  semTabela?: boolean;
  onSalvo: () => void;
}

const lerNumero = (v: string): number | null => {
  const n = Number(v.replace(",", ".").trim());
  return v.trim() && Number.isFinite(n) && n > 0 ? n : null;
};

const COR_NOTA = ["", "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-lime-500", "bg-emerald-500"];

/**
 * Check-in semanal: a paciente conta como foi a semana, com nota de 1 a 5 e
 * texto livre em cada ponto. O e-mail de sábado e o aviso do portal trazem
 * para cá. Vale do sábado até a sexta e pode ser corrigido nesse período.
 */
export function PortalCheckin({ paciente, checkins, semTabela, onSalvo }: Props) {
  const { modoVisualizacao } = usePortalModo();
  const { toast } = useToast();
  const semana = semanaDoCheckin();
  const atual = useMemo(() => checkinDaSemana(checkins), [checkins]);
  const comMedidas = pedirMedidas(paciente, checkins);

  const [editando, setEditando] = useState(!atual);
  const [notas, setNotas] = useState<Partial<Record<NotaCheckin, number>>>({});
  const [comentarios, setComentarios] = useState<Partial<Record<NotaCheckin, string>>>({});
  const [comentarioAberto, setComentarioAberto] = useState<Partial<Record<NotaCheckin, boolean>>>({});
  const [peso, setPeso] = useState("");
  const [dificuldades, setDificuldades] = useState("");
  const [conquista, setConquista] = useState("");
  const [medidas, setMedidas] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [tentouEnviar, setTentouEnviar] = useState(false);

  // Preenche com o que já foi respondido nesta semana (para corrigir).
  useEffect(() => {
    setEditando(!atual);
    if (!atual) return;
    setNotas(Object.fromEntries(PERGUNTAS.filter((p) => atual[p.id] != null).map((p) => [p.id, atual[p.id] as number])));
    setComentarios(atual.comentarios ?? {});
    setPeso(atual.peso != null ? String(atual.peso).replace(".", ",") : "");
    setDificuldades(atual.dificuldades ?? "");
    setConquista(atual.conquista ?? "");
    setMedidas(Object.fromEntries(Object.entries(atual.medidas ?? {}).map(([k, v]) => [k, String(v).replace(".", ",")])));
  }, [atual]);

  const faltando = PERGUNTAS.filter((p) => notas[p.id] == null);

  const enviar = async () => {
    if (bloqueadoNaVisualizacao(modoVisualizacao)) return;
    setTentouEnviar(true);
    if (faltando.length > 0) {
      toast({ title: "Falta dar a nota em alguns pontos", description: faltando.map((p) => p.rotulo).join(", "), variant: "destructive" });
      document.getElementById(`checkin-${faltando[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const p = lerNumero(peso);
    if (peso.trim() && (p == null || p < 25 || p > 350)) {
      toast({ title: "Confira o peso", description: "Use o número da balança, por exemplo 68,4.", variant: "destructive" });
      return;
    }
    const m: Record<string, number> = {};
    for (const [k, v] of Object.entries(medidas)) {
      const n = lerNumero(v);
      if (n != null) m[k] = n;
    }
    setSalvando(true);
    try {
      await salvarCheckin(paciente, semana, { notas, comentarios, peso: p, dificuldades, conquista, medidas: Object.keys(m).length ? m : null });
      toast({ title: "Check-in enviado", description: "Obrigado. Vou ler e ajustar o que for preciso." });
      setTentouEnviar(false);
      onSalvo();
    } catch (e) {
      console.error("[PortalCheckin]", e);
      toast({ title: "Não consegui enviar agora", description: "Tente de novo em instantes. Suas respostas continuam na tela.", variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  if (semTabela) {
    return (
      <Card className="rounded-2xl border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          <ClipboardCheck className="mx-auto mb-2 h-8 w-8 opacity-40" />
          O check-in semanal estará disponível em breve.
        </CardContent>
      </Card>
    );
  }

  const anteriores = checkins.filter((c) => c.semana.slice(0, 10) !== semana);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold text-foreground">Check-in semanal</h2>
        <p className="text-sm text-muted-foreground">
          Conte como foi a sua semana. Leva uns 3 minutos e é por aqui que eu ajusto o seu plano.
        </p>
      </div>

      {atual && !editando ? (
        <Card className="rounded-2xl border-emerald-200 bg-emerald-50/60">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">Check-in desta semana enviado</p>
                <p className="text-sm text-muted-foreground">
                  Semana de {formatarData(semana)}. Você pode corrigir as respostas até sexta-feira.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PERGUNTAS.map((p) => atual[p.id] != null && (
                <Badge key={p.id} variant="outline" className="gap-1.5 bg-background">
                  <span className={`h-2 w-2 rounded-full ${COR_NOTA[atual[p.id] as number]}`} />
                  {p.rotulo} {atual[p.id]}
                </Badge>
              ))}
              {atual.peso != null && <Badge variant="outline" className="bg-background">{String(atual.peso).replace(".", ",")} kg</Badge>}
            </div>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setEditando(true)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Corrigir respostas
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="rounded-2xl">
            <CardContent className="space-y-2 p-4">
              <label htmlFor="checkin-peso" className="font-semibold text-foreground">Peso atual (kg)</label>
              <p className="text-xs text-muted-foreground">De manhã, depois de ir ao banheiro e antes de comer. Sem balança esta semana? Pode deixar em branco.</p>
              <Input id="checkin-peso" inputMode="decimal" placeholder="Ex.: 68,4" value={peso} onChange={(e) => setPeso(e.target.value)} className="h-12 max-w-[160px] rounded-xl text-base" />
            </CardContent>
          </Card>

          {PERGUNTAS.map((p) => {
            const nota = notas[p.id];
            const aberto = comentarioAberto[p.id] || !!comentarios[p.id] || (nota != null && nota <= 2);
            const faltou = tentouEnviar && nota == null;
            return (
              <Card key={p.id} id={`checkin-${p.id}`} className={`rounded-2xl ${faltou ? "border-destructive/60" : ""}`}>
                <CardContent className="space-y-3 p-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">{p.rotulo}</p>
                    <p className="font-semibold leading-snug text-foreground">{p.pergunta}</p>
                  </div>
                  <div>
                    <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={p.pergunta}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={nota === n}
                          aria-label={`Nota ${n}`}
                          onClick={() => setNotas((s) => ({ ...s, [p.id]: n }))}
                          className={`h-12 rounded-xl border text-base font-bold transition-all ${
                            nota === n
                              ? `${COR_NOTA[n]} border-transparent text-white shadow-md`
                              : "border-border bg-card text-foreground hover:bg-muted"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="mt-1.5 flex justify-between gap-3 text-[11px] text-muted-foreground">
                      <span>1 · {p.ruim}</span>
                      <span className="text-right">5 · {p.bom}</span>
                    </div>
                  </div>
                  {aberto ? (
                    <Textarea
                      value={comentarios[p.id] ?? ""}
                      onChange={(e) => setComentarios((s) => ({ ...s, [p.id]: e.target.value }))}
                      placeholder={p.dica}
                      rows={2}
                      className="rounded-xl text-sm"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setComentarioAberto((s) => ({ ...s, [p.id]: true }))}
                      className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" /> Quero comentar
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}

          <Card className="rounded-2xl border-primary/30 bg-primary/5">
            <CardContent className="space-y-2 p-4">
              <label htmlFor="checkin-dificuldades" className="font-semibold text-foreground">Dificuldades da semana</label>
              <p className="text-xs text-muted-foreground">O que mais atrapalhou? Aqui não tem resposta errada: é o que mais me ajuda a ajustar o seu plano.</p>
              <Textarea id="checkin-dificuldades" value={dificuldades} onChange={(e) => setDificuldades(e.target.value)} rows={4} className="rounded-xl bg-background text-sm"
                placeholder="Ex.: o lanche da tarde não deu para fazer no trabalho, fim de semana fora de casa, enjoei do frango..." />
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="space-y-2 p-4">
              <label htmlFor="checkin-conquista" className="flex items-center gap-2 font-semibold text-foreground">
                <Trophy className="h-4 w-4 text-amber-500" /> Uma conquista da semana
              </label>
              <Textarea id="checkin-conquista" value={conquista} onChange={(e) => setConquista(e.target.value)} rows={2} className="rounded-xl text-sm"
                placeholder="Algo que deu certo, por menor que pareça." />
            </CardContent>
          </Card>

          {comMedidas && (
            <Card className="rounded-2xl">
              <CardContent className="space-y-3 p-4">
                <div>
                  <p className="flex items-center gap-2 font-semibold text-foreground"><Ruler className="h-4 w-4 text-primary" /> Medidas (a cada 15 dias)</p>
                  <p className="text-xs text-muted-foreground">Em centímetros, com a fita justa sem apertar. Preencha as que conseguir medir, de preferência sempre no mesmo horário.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {MEDIDAS_CORPO.map((m) => (
                    <div key={m.key}>
                      <label htmlFor={`medida-${m.key}`} className="text-[11px] font-medium text-muted-foreground">{m.label}</label>
                      <Input id={`medida-${m.key}`} inputMode="decimal" placeholder="cm" value={medidas[m.key] ?? ""}
                        onChange={(e) => setMedidas((s) => ({ ...s, [m.key]: e.target.value }))} className="h-10 rounded-lg" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            {atual && (
              <Button variant="outline" className="h-12 rounded-xl" onClick={() => setEditando(false)} disabled={salvando}>Cancelar</Button>
            )}
            <Button className="h-12 flex-1 rounded-xl text-base" onClick={enviar} disabled={salvando}>
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {atual ? "Salvar correções" : "Enviar check-in"}
            </Button>
          </div>
        </>
      )}

      {anteriores.length > 0 && (
        <section className="space-y-2 pt-2">
          <h3 className="text-sm font-semibold text-foreground">Semanas anteriores</h3>
          {anteriores.slice(0, 8).map((c) => {
            const media = mediaDoCheckin(c);
            return (
              <Card key={c.id} className="rounded-xl">
                <CardContent className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="font-medium text-foreground">Semana de {formatarData(c.semana)}</span>
                  <span className="flex items-center gap-3 text-muted-foreground">
                    {c.peso != null && <span>{String(c.peso).replace(".", ",")} kg</span>}
                    {media != null && (
                      <span className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${COR_NOTA[Math.round(media)]}`} /> média {String(media).replace(".", ",")}
                      </span>
                    )}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}
