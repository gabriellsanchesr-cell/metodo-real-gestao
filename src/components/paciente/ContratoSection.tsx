import { useEffect, useMemo, useState } from "react";
import { CalendarClock, History, Pencil, RefreshCw, XCircle, Plus, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/Loading";
import { formatBRL } from "@/lib/format";
import {
  MODALIDADES, calcularVencimento, contratoVigente, diasAteVencimento, formatarData, hojeISO,
  inicioDaRenovacao, progressoPeriodo, rotuloModalidade, rotuloPrazo, situacao,
  type Contrato, type Modalidade,
} from "@/lib/vencimento";
import { ESTILO_SITUACAO } from "@/components/paciente/estiloVencimento";
import {
  atualizarContrato, criarContrato, faltaMigration, lerDiasAlerta, listarContratosDoPaciente, renovarContrato,
} from "@/lib/contratosApi";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props { paciente: any; compacto?: boolean; onAbrir?: () => void }

type ModoForm = { tipo: "novo" } | { tipo: "editar"; contrato: Contrato } | { tipo: "renovar"; contrato: Contrato };

export function ContratoSection({ paciente, compacto, onAbrir }: Props) {
  const { toast } = useToast();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [semTabela, setSemTabela] = useState(false);
  const [diasAlerta, setDiasAlerta] = useState(7);
  const [form, setForm] = useState<ModoForm | null>(null);

  const carregar = async () => {
    try {
      const [lista, dias] = await Promise.all([listarContratosDoPaciente(paciente.id), lerDiasAlerta()]);
      setContratos(lista);
      setDiasAlerta(dias);
      setSemTabela(false);
    } catch (e) {
      if (faltaMigration(e)) setSemTabela(true);
      else toast({ title: "Erro ao carregar o plano contratado", variant: "destructive" });
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
    // carregar muda a cada render; o que importa é trocar de paciente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paciente.id]);

  const vigente = useMemo(() => contratoVigente(contratos), [contratos]);
  const historico = contratos.filter((c) => c.id !== vigente?.id);

  if (carregando) {
    return <Card className="border-border/60 shadow-sm"><CardContent className="p-5"><ListSkeleton rows={2} /></CardContent></Card>;
  }

  if (semTabela) {
    return (
      <Card className="border-border/60 shadow-sm">
        <EmptyState
          compact
          icon={Database}
          title="Controle de vencimento aguardando o banco"
          description="A tela está pronta, mas a atualização do banco de dados ainda não foi aplicada."
        />
      </Card>
    );
  }

  const dias = vigente ? diasAteVencimento(vigente.data_vencimento) : null;
  const sit = dias !== null ? situacao(dias, diasAlerta) : null;
  const estilo = sit ? ESTILO_SITUACAO[sit] : null;

  const resumo = vigente && estilo && dias !== null ? (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {rotuloModalidade(vigente.modalidade)}
            {vigente.valor ? ` · ${formatBRL(vigente.valor)}` : ""}
          </p>
          <p className="mt-1 text-2xl font-bold leading-tight text-foreground">{rotuloPrazo(dias)}</p>
        </div>
        <Badge variant="outline" className={cn("rounded-full px-3", estilo.badge)}>{estilo.rotulo}</Badge>
      </div>
      <Progress value={progressoPeriodo(vigente.data_inicio, vigente.data_vencimento)} className={cn("h-2", estilo.barra)} />
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Início</p>
          <p className="font-medium text-foreground">{formatarData(vigente.data_inicio)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Vencimento</p>
          <p className="font-medium text-foreground">{formatarData(vigente.data_vencimento)}</p>
        </div>
      </div>
    </div>
  ) : null;

  // ── Versão resumida, para a Visão Geral ───────────────────────────────
  if (compacto) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <CalendarClock className="h-4 w-4 text-primary" /> Plano contratado
          </CardTitle>
          {onAbrir && <Button variant="ghost" size="sm" onClick={onAbrir}>Gerenciar</Button>}
        </CardHeader>
        <CardContent>
          {resumo ?? (
            <EmptyState
              compact
              icon={CalendarClock}
              title="Sem período registrado"
              description="Registre o plano contratado para acompanhar o vencimento."
              action={onAbrir && <Button size="sm" onClick={onAbrir}>Registrar</Button>}
            />
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Versão completa ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <CalendarClock className="h-5 w-5 text-primary" /> Plano contratado
          </h2>
          <p className="text-sm text-muted-foreground">
            Período do acompanhamento e vencimento. Os alertas aparecem no sistema a partir de {diasAlerta} dias antes.
          </p>
        </div>
        {!vigente && (
          <Button onClick={() => setForm({ tipo: "novo" })}><Plus className="mr-2 h-4 w-4" /> Registrar plano</Button>
        )}
      </div>

      {vigente ? (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="space-y-5 p-5">
            {resumo}
            {vigente.observacoes && (
              <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{vigente.observacoes}</p>
            )}
            <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
              <Button onClick={() => setForm({ tipo: "renovar", contrato: vigente })}>
                <RefreshCw className="mr-2 h-4 w-4" /> Renovar
              </Button>
              <Button variant="outline" onClick={() => setForm({ tipo: "editar", contrato: vigente })}>
                <Pencil className="mr-2 h-4 w-4" /> Editar datas
              </Button>
              <Button
                variant="ghost"
                className="text-muted-foreground"
                onClick={async () => {
                  if (!window.confirm("Encerrar este plano? Ele sai dos alertas de vencimento, mas fica no histórico.")) return;
                  try {
                    await atualizarContrato(vigente.id, { status: "encerrado" });
                    toast({ title: "Plano encerrado" });
                    carregar();
                  } catch {
                    toast({ title: "Não consegui encerrar o plano", variant: "destructive" });
                  }
                }}
              >
                <XCircle className="mr-2 h-4 w-4" /> Encerrar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60 shadow-sm">
          <EmptyState
            icon={CalendarClock}
            title="Nenhum plano ativo"
            description="Registre o período contratado (mensal, bimestral ou trimestral) para o sistema avisar quando estiver perto de vencer."
            action={<Button onClick={() => setForm({ tipo: "novo" })}><Plus className="mr-2 h-4 w-4" /> Registrar plano</Button>}
          />
        </Card>
      )}

      {historico.length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <History className="h-4 w-4 text-muted-foreground" /> Histórico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {historico.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/40">
                <div>
                  <p className="font-medium text-foreground">{rotuloModalidade(c.modalidade)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatarData(c.data_inicio)} até {formatarData(c.data_vencimento)}
                    {c.valor ? ` · ${formatBRL(c.valor)}` : ""}
                  </p>
                </div>
                <Badge variant="outline" className="rounded-full capitalize text-muted-foreground">{c.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {form && (
        <FormContrato
          modo={form}
          paciente={paciente}
          onFechar={() => setForm(null)}
          onSalvo={() => { setForm(null); carregar(); }}
        />
      )}
    </div>
  );
}

// ─── Formulário ─────────────────────────────────────────────────────────

function FormContrato({
  modo, paciente, onFechar, onSalvo,
}: {
  modo: ModoForm;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  paciente: any;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const { toast } = useToast();
  const base = modo.tipo === "novo" ? null : modo.contrato;

  const inicioPadrao =
    modo.tipo === "renovar" ? inicioDaRenovacao(modo.contrato.data_vencimento)
    : base?.data_inicio ?? hojeISO();
  const modalidadePadrao: Modalidade = base?.modalidade ?? "mensal";

  const [modalidade, setModalidade] = useState<Modalidade>(modalidadePadrao);
  const [inicio, setInicio] = useState(inicioPadrao);
  const [vencimento, setVencimento] = useState(
    modo.tipo === "editar" ? modo.contrato.data_vencimento : calcularVencimento(inicioPadrao, modalidadePadrao) ?? "",
  );
  const [valor, setValor] = useState(base?.valor ? String(base.valor) : "");
  const [obs, setObs] = useState(modo.tipo === "editar" ? modo.contrato.observacoes ?? "" : "");
  const [salvando, setSalvando] = useState(false);

  // Trocar modalidade ou início recalcula o vencimento, exceto no personalizado.
  const mudarModalidade = (m: Modalidade) => {
    setModalidade(m);
    const v = calcularVencimento(inicio, m);
    if (v) setVencimento(v);
  };
  const mudarInicio = (d: string) => {
    setInicio(d);
    const v = calcularVencimento(d, modalidade);
    if (v) setVencimento(v);
  };

  const invalido = !inicio || !vencimento || vencimento < inicio;

  const salvar = async () => {
    if (invalido) return;
    setSalvando(true);
    const dados = {
      user_id: paciente.user_id,
      paciente_id: paciente.id,
      modalidade,
      data_inicio: inicio,
      data_vencimento: vencimento,
      valor: valor ? Number(valor.replace(",", ".")) : null,
      observacoes: obs.trim() || null,
    };
    try {
      if (modo.tipo === "editar") await atualizarContrato(modo.contrato.id, dados);
      else if (modo.tipo === "renovar") await renovarContrato(modo.contrato.id, dados);
      else await criarContrato(dados);
      toast({ title: modo.tipo === "renovar" ? "Plano renovado" : "Plano salvo" });
      onSalvo();
    } catch {
      toast({ title: "Não consegui salvar o plano", variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  const titulo = modo.tipo === "renovar" ? "Renovar plano" : modo.tipo === "editar" ? "Editar plano" : "Registrar plano";

  return (
    <Dialog open onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {modo.tipo === "renovar"
              ? "O período atual vai para o histórico e este passa a ser o vigente."
              : "O vencimento é calculado pela modalidade, mas você pode ajustar a data."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Modalidade</Label>
            <Select value={modalidade} onValueChange={(v) => mudarModalidade(v as Modalidade)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODALIDADES.map((m) => <SelectItem key={m.valor} value={m.valor}>{m.rotulo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Início</Label>
              <Input type="date" value={inicio} onChange={(e) => mudarInicio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Input type="date" value={vencimento} min={inicio} onChange={(e) => setVencimento(e.target.value)} />
            </div>
          </div>
          {vencimento && inicio && vencimento < inicio && (
            <p className="text-xs text-destructive">O vencimento não pode ser antes do início.</p>
          )}
          <div className="space-y-2">
            <Label>Valor (opcional)</Label>
            <Input inputMode="decimal" placeholder="240,00" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: pagamento em duas vezes" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={salvar} disabled={invalido || salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
