import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePortalModo } from "@/contexts/PortalModoContext";
import { ativarAvisos, desativarAvisos, estadoDosAvisos, type EstadoPush } from "@/lib/push";

const CHAVE_ADIADO = "avisosAdiado";

/**
 * Convite para receber avisos no celular (check-in de sábado, resposta no
 * chat, plano e avaliação novos). "card": aviso na Início, some com o "x".
 * "chave": liga e desliga, no Perfil.
 */
export function AtivarAvisos({ pacienteId, variante = "card" }: { pacienteId: string; variante?: "card" | "chave" }) {
  const { modoVisualizacao } = usePortalModo();
  const { toast } = useToast();
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [adiado, setAdiado] = useState(() => {
    try { return localStorage.getItem(CHAVE_ADIADO) === "1"; } catch { return false; }
  });

  useEffect(() => { estadoDosAvisos().then(setEstado).catch(() => setEstado("indisponivel")); }, []);

  if (modoVisualizacao || !estado || estado === "indisponivel") return null;

  const ligar = async () => {
    setOcupado(true);
    try {
      const novo = await ativarAvisos(pacienteId);
      setEstado(novo);
      if (novo === "ligado") toast({ title: "Avisos ativados", description: "Você vai receber os lembretes aqui no celular." });
      else if (novo === "bloqueado") toast({ title: "Avisos bloqueados no celular", description: "Libere as notificações do app nas configurações do celular e tente de novo." });
    } catch {
      toast({ title: "Não consegui ativar agora", description: "Tente de novo em instantes.", variant: "destructive" });
    } finally {
      setOcupado(false);
    }
  };

  const desligar = async () => {
    setOcupado(true);
    try { await desativarAvisos(); setEstado("desligado"); } finally { setOcupado(false); }
  };

  if (variante === "chave") {
    if (estado === "precisa-instalar") {
      return <p className="rounded-xl border px-4 py-3 text-sm text-muted-foreground">Para receber avisos no iPhone, instale o app na tela de início primeiro.</p>;
    }
    return (
      <label className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
        <span>
          <span className="block text-sm font-medium text-foreground">Avisos no celular</span>
          <span className="block text-xs text-muted-foreground">
            {estado === "bloqueado" ? "Bloqueados nas configurações do celular." : "Check-in, mensagens e novidades do seu plano."}
          </span>
        </span>
        <Switch checked={estado === "ligado"} disabled={ocupado || estado === "bloqueado"} onCheckedChange={(v) => (v ? ligar() : desligar())} />
      </label>
    );
  }

  // Card na Início: só para quem ainda pode ativar.
  if (adiado || estado !== "desligado") return null;
  const agoraNao = () => {
    try { localStorage.setItem(CHAVE_ADIADO, "1"); } catch { /* opcional */ }
    setAdiado(true);
  };
  return (
    <Card className="rounded-2xl border-primary/20">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10"><Bell className="h-5 w-5 text-primary" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug text-foreground">Receba os avisos no celular</p>
          <p className="text-xs text-muted-foreground">Check-in de sábado, respostas no chat e novidades do plano.</p>
        </div>
        <Button size="sm" className="shrink-0 rounded-xl" onClick={ligar} disabled={ocupado}>Ativar</Button>
        <button type="button" onClick={agoraNao} aria-label="Agora não" className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
      </CardContent>
    </Card>
  );
}
