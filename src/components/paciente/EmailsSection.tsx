import { useEffect, useState } from "react";
import { Mail, CheckCircle2, AlertCircle, CircleDashed, MinusCircle, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/Loading";
import {
  definirReceberEmails, faltaMigration, listarEmailsDoPaciente, type EmailEnviado,
} from "@/lib/contratosApi";
import { ROTULO_TIPO, statusEmail, type TipoAviso } from "@/lib/notificacoes";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props { paciente: any }

const STATUS: Record<EmailEnviado["status"], { rotulo: string; icone: typeof Mail; classe: string }> = {
  enviado: { rotulo: "Enviado", icone: CheckCircle2, classe: "text-success border-success/30 bg-success/10" },
  simulado: { rotulo: "Só registrado", icone: CircleDashed, classe: "text-muted-foreground border-border bg-muted/40" },
  ignorado: { rotulo: "Não enviado", icone: MinusCircle, classe: "text-muted-foreground border-border bg-muted/40" },
  falhou: { rotulo: "Falhou", icone: AlertCircle, classe: "text-destructive border-destructive/30 bg-destructive/10" },
  pendente: { rotulo: "Pendente", icone: CircleDashed, classe: "text-warning border-warning/30 bg-warning/10" },
};

function quando(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function EmailsSection({ paciente }: Props) {
  const { toast } = useToast();
  const [emails, setEmails] = useState<EmailEnviado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [semTabela, setSemTabela] = useState(false);
  const [receber, setReceber] = useState<boolean>(paciente.receber_emails !== false);
  const [provedor, setProvedor] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setEmails(await listarEmailsDoPaciente(paciente.id));
      } catch (e) {
        if (faltaMigration(e)) setSemTabela(true);
      } finally {
        setCarregando(false);
      }
      const s = await statusEmail();
      setProvedor(s ? s.configurado : null);
    })();
  }, [paciente.id]);

  const alternar = async (v: boolean) => {
    setReceber(v);
    try {
      await definirReceberEmails(paciente.id, v);
      toast({ title: v ? "Avisos por e-mail ligados" : "Avisos por e-mail desligados para esta paciente" });
    } catch {
      setReceber(!v);
      toast({ title: "Não consegui alterar a preferência", variant: "destructive" });
    }
  };

  if (semTabela) {
    return (
      <Card className="border-border/60 shadow-sm">
        <EmptyState
          compact
          icon={Database}
          title="Avisos por e-mail aguardando o banco"
          description="A tela está pronta, mas a atualização do banco de dados ainda não foi aplicada."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Mail className="h-5 w-5 text-primary" /> E-mails enviados
        </h2>
        <p className="text-sm text-muted-foreground">
          Avisos enviados para {paciente.email || "a paciente"} quando você envia ou altera algo.
        </p>
      </div>

      {provedor === false && (
        <div className="flex gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-foreground">
            O serviço de e-mail ainda não está configurado. Os avisos ficam registrados abaixo como
            "Só registrado", mas não chegam na paciente.
          </p>
        </div>
      )}

      <Card className="border-border/60 shadow-sm">
        <CardContent className="flex items-center justify-between gap-4 p-5">
          <div>
            <p className="font-medium text-foreground">Receber avisos por e-mail</p>
            <p className="text-sm text-muted-foreground">
              Desligado, nenhum aviso é enviado para esta paciente, mesmo com a caixa marcada.
            </p>
          </div>
          <Switch checked={receber} onCheckedChange={alternar} aria-label="Receber avisos por e-mail" />
        </CardContent>
      </Card>

      {!paciente.email && (
        <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-foreground">Esta paciente não tem e-mail no cadastro. Os avisos vão falhar até ele ser preenchido.</p>
        </div>
      )}

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Histórico</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {carregando ? (
            <ListSkeleton rows={4} />
          ) : emails.length === 0 ? (
            <EmptyState
              compact
              icon={Mail}
              title="Nenhum aviso enviado ainda"
              description="Quando você salvar algo com a caixa 'Avisar a paciente' marcada, o registro aparece aqui."
            />
          ) : (
            <div className="divide-y divide-border/50">
              {emails.map((e) => {
                const s = STATUS[e.status] ?? STATUS.pendente;
                const Icone = s.icone;
                return (
                  <div key={e.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{e.assunto}</p>
                      <p className="text-xs text-muted-foreground">
                        {ROTULO_TIPO[e.tipo as TipoAviso] ?? e.tipo} · {quando(e.created_at)}
                      </p>
                      {e.erro && e.status !== "enviado" && (
                        <p className="mt-1 text-xs text-muted-foreground">{e.erro}</p>
                      )}
                    </div>
                    <Badge variant="outline" className={cn("shrink-0 gap-1 rounded-full", s.classe)}>
                      <Icone className="h-3 w-3" /> {s.rotulo}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
