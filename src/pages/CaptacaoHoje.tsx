import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Target, Send, MessageCircle, UserCheck, Database, CheckCircle2, Clock, XCircle, Handshake, Plus, Pencil, ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { StatCard, StatGrid } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { StatsSkeleton, ListSkeleton } from "@/components/Loading";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { faltaMigration } from "@/lib/contratosApi";
import {
  GATILHOS, linkWhatsApp, montarFila, montarPlacar,
  type Alvo, type DadosFila, type ItemFila, type Placar,
} from "@/lib/captacao";
import {
  CATEGORIA_CAPTACAO, adiar, carregarDadosFila, listarParceiros, marcarEnviado, marcarPerdido, marcarRespondeu,
  salvarParceiro, type Parceiro,
} from "@/lib/captacaoApi";
import { cn } from "@/lib/utils";

type Filtro = "todos" | Alvo;

const COR_PRIORIDADE: Record<number, string> = {
  1: "border-destructive/40 bg-destructive/10 text-destructive",
  2: "border-warning/40 bg-warning/10 text-warning",
  3: "border-primary/30 bg-primary/10 text-primary",
  4: "border-success/40 bg-success/10 text-success",
  5: "border-border bg-muted text-muted-foreground",
};

const TIPOS_PARCEIRO = [
  { value: "personal", label: "Personal" },
  { value: "academia", label: "Academia" },
  { value: "estudio", label: "Estúdio" },
  { value: "clinica", label: "Clínica" },
  { value: "outro", label: "Outro" },
];

export default function CaptacaoHoje() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dados, setDados] = useState<DadosFila | null>(null);
  const [placar, setPlacar] = useState<Placar | null>(null);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [semTabela, setSemTabela] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [perda, setPerda] = useState<{ item: ItemFila; motivo: string } | null>(null);
  const [parceiroForm, setParceiroForm] = useState<Partial<Parceiro> | null>(null);

  const carregar = async () => {
    try {
      const [{ dados: d, pacientesNovos }, ps] = await Promise.all([carregarDadosFila(), listarParceiros()]);
      setDados(d);
      setPlacar(montarPlacar(d.toques, pacientesNovos));
      setParceiros(ps);
      setSemTabela(false);
    } catch (e) {
      if (faltaMigration(e)) setSemTabela(true);
      else {
        console.warn("CaptacaoHoje", e);
        toast({ title: "Não consegui carregar a fila", variant: "destructive" });
      }
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const fila = useMemo(() => (dados ? montarFila(dados) : []), [dados]);
  const visiveis = filtro === "todos" ? fila : fila.filter((i) => i.alvo === filtro);
  const quentes = fila.filter((i) => i.prioridade === 1).length;

  const acao = async (item: ItemFila, fn: () => Promise<unknown>, ok: string) => {
    if (!user) return;
    setOcupado(item.chave);
    try {
      await fn();
      toast({ title: ok });
      await carregar();
    } catch (e) {
      console.warn(e);
      toast({ title: "Não deu para salvar", variant: "destructive" });
    } finally {
      setOcupado(null);
    }
  };

  const textoDe = (i: ItemFila) => textos[i.chave] ?? i.mensagem;

  if (semTabela) {
    return (
      <div className="space-y-6">
        <PageHeader title="Captação" icon={Target} />
        <Card className="border-border/60 shadow-sm">
          <EmptyState
            icon={Database}
            title="Aguardando a atualização do banco"
            description="A tela está pronta. Assim que a migration 20260929120000_captacao for aplicada pelo Lovable, a fila aparece aqui."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Captação"
        description="Quem tocar hoje, por quê e com qual mensagem. Nada é enviado sozinho: você revisa e envia pelo WhatsApp."
        icon={Target}
      />

      {carregando || !placar ? <StatsSkeleton /> : (
        <StatGrid>
          <StatCard label="Na fila hoje" value={fila.length} icon={Target} tone={quentes > 0 ? "destructive" : "primary"}
            hint={quentes > 0 ? `${quentes} lead(s) para responder primeiro` : "Nenhum lead esperando resposta"} />
          <StatCard label="Mensagens na semana" value={placar.toquesSemana} icon={Send} tone="neutral" />
          <StatCard label="Respostas na semana" value={placar.respostasSemana} icon={MessageCircle} tone="warning" />
          <StatCard label="Convertidos no mês" value={placar.convertidosMes} icon={UserCheck} tone="success" />
        </StatGrid>
      )}

      {placar && placar.origemMes.length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex flex-wrap items-center gap-2 p-4 text-sm">
            <span className="mr-1 text-muted-foreground">Pacientes novos este mês, por origem:</span>
            {placar.origemMes.map((o) => (
              <Badge key={o.origem} variant="outline" className="rounded-full">
                {o.rotulo}<span className="ml-1.5 tabular-nums opacity-70">{o.total}</span>
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-1.5">
        {([
          ["todos", "Todos"], ["lead", "Leads"], ["paciente", "Pacientes"], ["parceiro", "Parceiros"],
        ] as [Filtro, string][]).map(([v, rotulo]) => (
          <Button key={v} size="sm" variant={filtro === v ? "default" : "outline"} className="rounded-full px-4 text-xs" onClick={() => setFiltro(v)}>
            {rotulo}
            <span className="ml-1.5 tabular-nums opacity-70">{v === "todos" ? fila.length : fila.filter((i) => i.alvo === v).length}</span>
          </Button>
        ))}
      </div>

      {carregando ? <ListSkeleton rows={4} /> : visiveis.length === 0 ? (
        <Card className="border-border/60 shadow-sm">
          <EmptyState icon={CheckCircle2} title="Fila em dia" description="Ninguém para tocar agora. Cadastre leads novos ou parceiros para a fila voltar a andar." />
        </Card>
      ) : (
        <div className="grid gap-3">
          {visiveis.map((i) => {
            const link = linkWhatsApp(i.telefone, textoDe(i));
            const busy = ocupado === i.chave;
            return (
              <Card key={i.chave} className="border-border/60 shadow-sm">
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-foreground">{i.nome}</p>
                        <Badge variant="outline" className={cn("rounded-full", COR_PRIORIDADE[i.prioridade])}>{GATILHOS[i.gatilho].rotulo}</Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{i.motivo}</p>
                    </div>
                    {i.alvo === "paciente" && (
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => navigate(`/pacientes/${i.id}`)}>
                        Ficha <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  <Textarea
                    value={textoDe(i)}
                    onChange={(e) => setTextos((t) => ({ ...t, [i.chave]: e.target.value }))}
                    rows={3}
                    className="text-sm"
                  />

                  <div className="flex flex-wrap gap-2">
                    {link ? (
                      <Button size="sm" asChild>
                        <a href={link} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-1.5 h-4 w-4" />Abrir WhatsApp</a>
                      </Button>
                    ) : (
                      <Button size="sm" disabled>Sem telefone</Button>
                    )}
                    <Button size="sm" variant="outline" disabled={busy}
                      onClick={() => acao(i, () => marcarEnviado(user!.id, i), "Toque registrado")}>
                      <Send className="mr-1.5 h-4 w-4" />Enviei
                    </Button>
                    {i.lead && (
                      <Button size="sm" variant="outline" disabled={busy}
                        onClick={() => acao(i, () => marcarRespondeu(user!.id, i.lead!, i.gatilho), "Resposta registrada")}>
                        <MessageCircle className="mr-1.5 h-4 w-4" />Respondeu
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" disabled={busy}
                      onClick={() => acao(i, () => adiar(user!.id, i), "Adiado")}>
                      <Clock className="mr-1.5 h-4 w-4" />Agora não
                    </Button>
                    {i.lead && (
                      <Button size="sm" variant="ghost" className="text-muted-foreground" disabled={busy}
                        onClick={() => setPerda({ item: i, motivo: "" })}>
                        <XCircle className="mr-1.5 h-4 w-4" />Perdido
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Para trocar o texto padrão de um gatilho, crie no Chat uma resposta rápida na categoria "{CATEGORIA_CAPTACAO}" com o título do gatilho
        (por exemplo, "Renovação" ou "Pedir indicação"). Use {"{nome}"} para o primeiro nome.
      </p>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold"><Handshake className="h-4 w-4" />Parceiros</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setParceiroForm({ tipo: "personal", ativo: true })}>
            <Plus className="mr-1.5 h-4 w-4" />Novo parceiro
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {parceiros.length === 0 ? (
            <EmptyState compact icon={Handshake} title="Nenhum parceiro cadastrado"
              description="Cadastre os personais e academias que indicam. A fila lembra de falar com quem ficou 30 dias sem indicar." />
          ) : (
            <div className="divide-y divide-border/50">
              {parceiros.map((p) => {
                const indicacoes = dados?.leads.filter((l) => l.parceiro_id === p.id).length ?? 0;
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className={cn("font-medium", !p.ativo && "text-muted-foreground line-through")}>{p.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {TIPOS_PARCEIRO.find((t) => t.value === p.tipo)?.label ?? p.tipo} · {indicacoes} indicação(ões)
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setParceiroForm(p)}><Pencil className="h-4 w-4" /></Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!perda} onOpenChange={(o) => !o && setPerda(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Marcar como perdido</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Motivo (opcional)</Label>
            <Input value={perda?.motivo ?? ""} onChange={(e) => setPerda((p) => p && { ...p, motivo: e.target.value })}
              placeholder="Preço, momento, escolheu outro profissional..." />
            <Button className="w-full" onClick={() => {
              if (!perda?.item.lead) return;
              const { item, motivo } = perda;
              setPerda(null);
              acao(item, () => marcarPerdido(user!.id, item.lead!, item.gatilho, motivo), "Lead encerrado");
            }}>Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!parceiroForm} onOpenChange={(o) => !o && setParceiroForm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{parceiroForm?.id ? "Editar parceiro" : "Novo parceiro"}</DialogTitle></DialogHeader>
          {parceiroForm && (
            <div className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={parceiroForm.nome ?? ""} onChange={(e) => setParceiroForm((p) => ({ ...p, nome: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={parceiroForm.tipo ?? "personal"} onValueChange={(v) => setParceiroForm((p) => ({ ...p, tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS_PARCEIRO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={parceiroForm.telefone ?? ""} onChange={(e) => setParceiroForm((p) => ({ ...p, telefone: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea rows={2} value={parceiroForm.observacoes ?? ""} onChange={(e) => setParceiroForm((p) => ({ ...p, observacoes: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={parceiroForm.ativo ?? true} onCheckedChange={(v) => setParceiroForm((p) => ({ ...p, ativo: v }))} />
                <Label>Parceria ativa</Label>
              </div>
              <Button className="w-full" onClick={async () => {
                if (!user || !parceiroForm.nome?.trim()) { toast({ title: "Nome é obrigatório", variant: "destructive" }); return; }
                try {
                  await salvarParceiro(user.id, { ...parceiroForm, nome: parceiroForm.nome });
                  setParceiroForm(null);
                  toast({ title: "Parceiro salvo" });
                  carregar();
                } catch (e) {
                  console.warn(e);
                  toast({ title: "Não deu para salvar", variant: "destructive" });
                }
              }}>Salvar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
