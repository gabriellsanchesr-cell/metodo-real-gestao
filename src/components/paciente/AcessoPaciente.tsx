import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound, UserX, UserCheck, ShieldCheck, ShieldOff, Pencil } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  ativo: { label: "Conta Ativa", color: "bg-success/10 text-success border-success/20", icon: ShieldCheck },
  desativado: { label: "Conta Inativa", color: "bg-destructive/10 text-destructive border-destructive/20", icon: ShieldOff },
  sem_conta: { label: "Sem Conta", color: "bg-muted text-muted-foreground border-border", icon: KeyRound },
};

interface Props {
  paciente: any;
  onCreateAccess: () => void;
  onEditAccess: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  actionLoading: boolean;
}

export function AcessoPaciente({ paciente, onCreateAccess, onEditAccess, onDeactivate, onReactivate, actionLoading }: Props) {
  const status = paciente.account_status || "sem_conta";
  const cfg = statusConfig[status] || statusConfig.sem_conta;
  const Icon = cfg.icon;

  return (
    <div className="space-y-4">
      <Card className="border-border rounded-xl">
        <CardHeader><CardTitle className="text-base">Controle de Acesso</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${cfg.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
                {cfg.label}
              </span>
              {paciente.email && <p className="text-sm text-muted-foreground mt-0.5">{paciente.email}</p>}
            </div>
          </div>

          <div className="text-sm space-y-2">
            <Row label="E-mail de login" value={paciente.email || "—"} />
            <Row label="Data de criação" value={paciente.auth_user_id ? new Date(paciente.created_at).toLocaleDateString("pt-BR") : "—"} />
          </div>

          <div className="flex gap-2 flex-wrap pt-2">
            {status === "sem_conta" && (
              <Button size="sm" onClick={onCreateAccess}>
                <KeyRound className="h-3.5 w-3.5 mr-1" /> Criar Acesso
              </Button>
            )}
            {(status === "ativo" || status === "desativado") && (
              <Button size="sm" variant="outline" onClick={onEditAccess}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Alterar E-mail/Senha
              </Button>
            )}
            {status === "ativo" && (
              <Button size="sm" variant="outline" onClick={onDeactivate} disabled={actionLoading}>
                <UserX className="h-3.5 w-3.5 mr-1" /> Desativar Acesso
              </Button>
            )}
            {status === "desativado" && (
              <Button size="sm" variant="outline" onClick={onReactivate} disabled={actionLoading}>
                <UserCheck className="h-3.5 w-3.5 mr-1" /> Reativar Acesso
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
