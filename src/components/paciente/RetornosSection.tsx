import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertTriangle, ArrowLeft, CalendarClock, ChevronRight, ClipboardList, Download, Loader2, Plus, Save, Trash2,
} from "lucide-react";
import { FormularioClinicoEdicao, FormularioClinicoLeitura } from "@/components/FormularioClinico";
import { RETORNO_SECOES } from "@/lib/retornoModelo";
import { notasBaixas, progresso, vazio, type Respostas } from "@/lib/formularios";
import { listarCheckins } from "@/lib/checkinApi";
import { mediaDoCheckin, pontosDeAtencao, type Checkin } from "@/lib/checkin";
import { buscarUltimoPeso } from "@/lib/pesoApi";
import { isoLocal } from "@/lib/datas";
import { formatarData } from "@/lib/vencimento";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface Retorno {
  id: string;
  paciente_id: string;
  data_hora: string;
  respostas: Respostas | null;
  consulta_id: string | null;
  created_at: string;
}

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  paciente: any;
}

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Do check-in para o retorno: notas que medem a mesma coisa. */
const DO_CHECKIN: [keyof Checkin, string][] = [
  ["seguiu_plano", "adesao_geral"], ["fome", "fome_geral"], ["vontade_doce", "doce"], ["sono", "sono_nota"],
  ["intestino", "intestino_nota"], ["disposicao", "energia_nota"], ["treino", "treino_rendimento"], ["peso", "peso"],
];

/**
 * Retornos da paciente: cada consulta de acompanhamento com data e horário e
 * um roteiro clínico (src/lib/retornoModelo.ts). Ao lado, o que ela já contou:
 * os combinados do retorno anterior, os check-ins desde então e a anamnese.
 */
export function RetornosSection({ paciente }: Props) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [retornos, setRetornos] = useState<Retorno[]>([]);
  const [semTabela, setSemTabela] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState<Retorno | null>(null);
  const [editando, setEditando] = useState(false);
  const [valores, setValores] = useState<Respostas>({});
  const [salvando, setSalvando] = useState(false);
  const [novoOpen, setNovoOpen] = useState(false);
  const [novaData, setNovaData] = useState(isoLocal());
  const [novaHora, setNovaHora] = useState("09:00");
  const [naAgenda, setNaAgenda] = useState(false);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [anamnese, setAnamnese] = useState<Respostas | null>(null);
  const [peso, setPeso] = useState<{ peso: number; data: string } | null>(null);

  const carregar = useCallback(async () => {
    const { data, error } = await db.from("retornos").select("*").eq("paciente_id", paciente.id).order("data_hora", { ascending: false });
    if (error) { setSemTabela(true); setCarregando(false); return; }
    setRetornos(data || []);
    setCarregando(false);
  }, [paciente.id]);

  useEffect(() => { carregar(); }, [carregar]);

  // Contexto: check-ins, anamnese e último peso, uma vez por paciente.
  useEffect(() => {
    listarCheckins(paciente.id, 12).then((r) => setCheckins(r.checkins));
    supabase.from("anamneses").select("*").eq("paciente_id", paciente.id).order("created_at", { ascending: false }).limit(1).maybeSingle()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }) => setAnamnese(((data as any)?.respostas as Respostas) ?? null));
    buscarUltimoPeso(paciente.id).then((p) => setPeso(p ? { peso: p.peso, data: p.data } : null));
  }, [paciente.id]);

  const anterior = useMemo(
    () => (aberto ? retornos.find((r) => r.data_hora < aberto.data_hora && r.respostas && Object.keys(r.respostas).length) ?? null : null),
    [aberto, retornos],
  );
  const checkinsDoPeriodo = useMemo(() => {
    if (!aberto) return [];
    const ate = aberto.data_hora.slice(0, 10);
    const desde = anterior?.data_hora.slice(0, 10) ?? "0000";
    return checkins.filter((c) => c.semana > desde && c.semana <= ate);
  }, [aberto, anterior, checkins]);

  const criar = async () => {
    if (!session?.user?.id) return;
    const inicio = new Date(`${novaData}T${novaHora || "09:00"}:00`);
    let consultaId: string | null = null;
    if (naAgenda) {
      const { data, error } = await supabase.from("consultas").insert({
        paciente_id: paciente.id, user_id: session.user.id, data_hora: inicio.toISOString(), tipo: "retorno", status: "agendado",
      }).select("id").single();
      if (error) toast({ title: "Retorno criado, mas não entrou na Agenda", description: error.message, variant: "destructive" });
      consultaId = data?.id ?? null;
    }
    const { data, error } = await db.from("retornos").insert({
      paciente_id: paciente.id, user_id: session.user.id, data_hora: inicio.toISOString(), respostas: {}, consulta_id: consultaId,
    }).select("*").single();
    if (error) {
      toast({ title: "Não consegui criar o retorno", description: error.message, variant: "destructive" });
      return;
    }
    setNovoOpen(false);
    setNaAgenda(false);
    await carregar();
    abrir(data as Retorno, true);
  };

  const abrir = (r: Retorno, editar = false) => {
    setAberto(r);
    setValores(r.respostas ?? {});
    setEditando(editar || !r.respostas || Object.keys(r.respostas).length === 0);
  };

  const salvar = async () => {
    if (!aberto) return;
    setSalvando(true);
    const { error } = await db.from("retornos").update({ respostas: valores, updated_at: new Date().toISOString() }).eq("id", aberto.id);
    setSalvando(false);
    if (error) {
      toast({ title: "Não consegui salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Retorno salvo" });
    const atualizado = { ...aberto, respostas: valores };
    setAberto(atualizado);
    setRetornos((l) => l.map((x) => (x.id === aberto.id ? atualizado : x)));
    setEditando(false);
  };

  const excluir = async (r: Retorno) => {
    if (!window.confirm(`Excluir o retorno de ${dataHora(r.data_hora)}? Não dá para desfazer. A consulta na Agenda, se houver, continua lá.`)) return;
    const { error } = await db.from("retornos").delete().eq("id", r.id);
    if (error) { toast({ title: "Não consegui excluir", description: error.message, variant: "destructive" }); return; }
    setAberto(null);
    carregar();
  };

  /** Preenche as notas iguais com o check-in mais recente do período (sem apagar o que já foi digitado). */
  const trazerDoCheckin = () => {
    const c = checkinsDoPeriodo[0];
    if (!c) return;
    setValores((v) => {
      const novo = { ...v };
      for (const [de, para] of DO_CHECKIN) if (vazio(novo[para]) && c[de] != null) novo[para] = c[de] as number;
      return novo;
    });
    toast({ title: "Notas trazidas do check-in", description: `Semana de ${formatarData(c.semana)}. Confira com a paciente.` });
  };

  const baixarTexto = () => {
    if (!aberto) return;
    const linhas = RETORNO_SECOES.map((s) => {
      const itens = s.campos.filter((c) => !vazio(valores[c.id])).map((c) => `- ${c.rotulo}: ${String(valores[c.id]).replace(/\n/g, " ")}${c.tipo === "nota" ? "/5" : c.unidade ? ` ${c.unidade}` : ""}`);
      return itens.length ? `${s.titulo}\n${itens.join("\n")}` : "";
    }).filter(Boolean);
    const texto = `Retorno de ${paciente.nome_completo} - ${dataHora(aberto.data_hora)}\n\n${linhas.join("\n\n")}\n`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([texto], { type: "text/plain;charset=utf-8" }));
    a.download = `Retorno-${String(paciente.nome_completo).trim().replace(/\s+/g, "-")}-${aberto.data_hora.slice(0, 10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  if (carregando) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (semTabela) {
    return (
      <Card className="rounded-xl border-dashed">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          <ClipboardList className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Falta aplicar no banco o SQL dos retornos (20261116120000).
        </CardContent>
      </Card>
    );
  }

  // ─── Um retorno aberto ───────────────────────────────────────────
  if (aberto) {
    const { feitos, total } = progresso(RETORNO_SECOES, valores);
    const baixas = notasBaixas(RETORNO_SECOES, valores);
    const comb = anterior?.respostas ?? {};
    return (
      <div className="space-y-4">
        <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-2 bg-background/95 px-1 py-2 backdrop-blur">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAberto(null)}><ArrowLeft className="h-4 w-4 mr-1" /> Retornos</Button>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Retorno de {dataHora(aberto.data_hora)}</h2>
              <p className="text-xs text-muted-foreground">{feitos} de {total} campos preenchidos</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {editando ? (
              <>
                {checkinsDoPeriodo.length > 0 && (
                  <Button variant="outline" size="sm" onClick={trazerDoCheckin}>Trazer notas do check-in</Button>
                )}
                <Button size="sm" onClick={salvar} disabled={salvando}>
                  {salvando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Salvar
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={baixarTexto}><Download className="h-4 w-4 mr-1" /> Baixar</Button>
                <Button size="sm" onClick={() => setEditando(true)}>Editar</Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => excluir(aberto)} aria-label="Excluir retorno">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-4">
            {!editando && baixas.length > 0 && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold"><AlertTriangle className="h-3.5 w-3.5 text-warning" /> Pontos de atenção</p>
                {baixas.map((b) => <p key={b.campo.id}>{b.campo.rotulo}: <b>{b.nota}/5</b></p>)}
              </div>
            )}
            {editando
              ? <FormularioClinicoEdicao secoes={RETORNO_SECOES} valores={valores} onChange={(id, v) => setValores((s) => ({ ...s, [id]: v }))} />
              : <FormularioClinicoLeitura secoes={RETORNO_SECOES} valores={valores} />}
            {editando && (
              <div className="flex justify-end">
                <Button onClick={salvar} disabled={salvando}>{salvando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Salvar retorno</Button>
              </div>
            )}
          </div>

          {/* O que a paciente já contou: para abrir a consulta sem perguntar de novo. */}
          <aside className="space-y-3 lg:sticky lg:top-16 lg:self-start">
            <Card className="rounded-xl">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Combinados do retorno anterior</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {anterior ? (
                  <>
                    <p className="text-xs text-muted-foreground">{dataHora(anterior.data_hora)}</p>
                    {["metas", "ajustes_plano", "orientacoes"].filter((k) => !vazio(comb[k])).map((k) => (
                      <div key={k}>
                        <p className="text-xs font-medium text-muted-foreground">{k === "metas" ? "Metas" : k === "ajustes_plano" ? "Ajustes no plano" : "Orientações"}</p>
                        <p className="whitespace-pre-wrap">{String(comb[k])}</p>
                      </div>
                    ))}
                    {["metas", "ajustes_plano", "orientacoes"].every((k) => vazio(comb[k])) && <p className="text-muted-foreground">Sem conduta registrada.</p>}
                  </>
                ) : <p className="text-muted-foreground">Este é o primeiro retorno registrado.</p>}
              </CardContent>
            </Card>

            <Card className="rounded-xl">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Check-ins do período</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {checkinsDoPeriodo.length === 0 && <p className="text-muted-foreground">Nenhum check-in respondido no período.</p>}
                {checkinsDoPeriodo.map((c) => {
                  const media = mediaDoCheckin(c);
                  const pontos = pontosDeAtencao(c);
                  return (
                    <div key={c.id} className="space-y-1 border-b pb-2 last:border-0 last:pb-0">
                      <p className="flex flex-wrap items-center gap-1.5 text-xs">
                        <b>Semana de {formatarData(c.semana)}</b>
                        {media != null && <Badge variant="outline" className="text-[10px]">média {String(media).replace(".", ",")}</Badge>}
                        {c.peso != null && <Badge variant="outline" className="text-[10px]">{String(c.peso).replace(".", ",")} kg</Badge>}
                      </p>
                      {pontos.map((p) => (
                        <p key={p.rotulo} className="text-xs">
                          <span className="font-medium">{p.rotulo}{p.nota != null ? ` (${p.nota})` : ""}:</span>{" "}
                          <span className="text-muted-foreground">{p.texto ?? ""}</span>
                        </p>
                      ))}
                      {c.conquista && <p className="text-xs text-muted-foreground">Conquista: {c.conquista}</p>}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="rounded-xl">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Da anamnese</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {peso && <p><span className="text-xs text-muted-foreground">Último peso:</span> {String(peso.peso).replace(".", ",")} kg em {formatarData(peso.data)}</p>}
                {anamnese ? (
                  [["obj_objetivo", "Objetivo"], ["ali_alergias", "Alergias e intolerâncias"], ["med_medicamentos", "Medicamentos"], ["med_condicoes", "Condições"], ["ali_detesta", "Não gosta"]]
                    .filter(([k]) => !vazio(anamnese[k]))
                    .map(([k, t]) => <div key={k}><p className="text-xs text-muted-foreground">{t}</p><p className="whitespace-pre-wrap">{String(anamnese[k])}</p></div>)
                ) : <p className="text-muted-foreground">Anamnese no modelo novo ainda não preenchida.</p>}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    );
  }

  // ─── Lista ───────────────────────────────────────────────────────
  const agora = new Date().toISOString();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-foreground">Retornos</h2>
        <Button onClick={() => setNovoOpen(true)}><Plus className="h-4 w-4 mr-1" /> Novo retorno</Button>
      </div>

      {retornos.length === 0 ? (
        <Card className="rounded-xl border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <ClipboardList className="mx-auto mb-2 h-8 w-8 opacity-40" />
            Nenhum retorno registrado. Crie um com a data e o horário da consulta.
          </CardContent>
        </Card>
      ) : retornos.map((r) => {
        const resp = r.respostas ?? {};
        const preenchido = Object.keys(resp).some((k) => !vazio(resp[k]));
        const futuro = r.data_hora > agora;
        const baixas = notasBaixas(RETORNO_SECOES, resp).length;
        return (
          <Card key={r.id} className="cursor-pointer rounded-xl transition hover:shadow-md" onClick={() => abrir(r)}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-primary/10 p-2"><CalendarClock className="h-5 w-5 text-primary" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{dataHora(r.data_hora)}</p>
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                  {futuro ? <Badge variant="outline" className="text-[10px]">Agendado</Badge>
                    : preenchido ? <Badge className="text-[10px]">Preenchido</Badge>
                      : <Badge variant="secondary" className="text-[10px]">A preencher</Badge>}
                  {!vazio(resp.adesao_geral) && <span>Adesão {String(resp.adesao_geral)}/5</span>}
                  {!vazio(resp.peso) && <span>{String(resp.peso).replace(".", ",")} kg</span>}
                  {baixas > 0 && <span className="text-warning">{baixas} ponto{baixas > 1 ? "s" : ""} de atenção</span>}
                  {r.consulta_id && <span>na Agenda</span>}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo retorno</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="ret-data">Data</Label><Input id="ret-data" type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="ret-hora">Horário</Label><Input id="ret-hora" type="time" value={novaHora} onChange={(e) => setNovaHora(e.target.value)} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={naAgenda} onCheckedChange={(v) => setNaAgenda(v === true)} />
            Também marcar na Agenda como retorno
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoOpen(false)}>Cancelar</Button>
            <Button onClick={criar} disabled={!novaData}>Criar e preencher</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
