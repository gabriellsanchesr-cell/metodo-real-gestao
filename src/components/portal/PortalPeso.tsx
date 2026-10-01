import { useState } from "react";
import { Scale, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { hojeLocal } from "@/lib/portal";
import { cn } from "@/lib/utils";

interface Props {
  paciente: { id: string; user_id: string };
  /** Último peso lançado nos acompanhamentos, para mostrar e decidir o destaque. */
  ultimo: { peso: number; data: string } | null;
  onSalvo: () => void;
}

function lerNumero(texto: string): number | null {
  const n = parseFloat(texto.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Faixas largas só para pegar erro de digitação (680 em vez de 68,0). */
const PESO_MIN = 25;
const PESO_MAX = 300;

/**
 * A paciente registra o peso da semana. O lembrete de sábado por e-mail
 * aponta para cá. Grava em acompanhamentos com registrado_pela_paciente.
 */
export function PortalPeso({ paciente, ultimo, onSalvo }: Props) {
  const { toast } = useToast();
  const [aberto, setAberto] = useState(false);
  const [peso, setPeso] = useState("");
  const [cintura, setCintura] = useState("");
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);

  const diasDesde = ultimo
    ? Math.floor((new Date(`${hojeLocal()}T00:00:00`).getTime() - new Date(`${ultimo.data}T00:00:00`).getTime()) / 86400000)
    : null;
  const pendente = diasDesde == null || diasDesde >= 7;

  const salvar = async () => {
    const p = lerNumero(peso);
    if (p == null || p < PESO_MIN || p > PESO_MAX) {
      toast({ title: "Confira o peso", description: "Use o número da balança, por exemplo 68,4.", variant: "destructive" });
      return;
    }
    const c = lerNumero(cintura);
    setSalvando(true);
    const { error } = await supabase.from("acompanhamentos").insert({
      paciente_id: paciente.id,
      user_id: paciente.user_id,
      data_registro: hojeLocal(),
      peso: p,
      circunferencia_abdominal: c,
      observacoes_paciente: obs.trim() || null,
      registrado_pela_paciente: true,
    });
    setSalvando(false);
    if (error) {
      toast({
        title: "Não consegui registrar agora",
        description: "Tente de novo em instantes ou mande o peso pelo WhatsApp.",
        variant: "destructive",
      });
      console.error("[PortalPeso]", error);
      return;
    }
    toast({ title: "Peso registrado", description: "Obrigado. Vou acompanhar por aqui." });
    setAberto(false);
    setPeso(""); setCintura(""); setObs("");
    onSalvo();
  };

  return (
    <Card className={cn("rounded-2xl shadow-sm", pendente ? "border-primary/30 bg-primary/5" : "border-border")}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Scale className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {pendente ? "Hora de registrar seu peso" : "Peso da semana registrado"}
            </p>
            <p className="text-xs text-muted-foreground">
              {ultimo
                ? `Último: ${ultimo.peso.toLocaleString("pt-BR")} kg em ${ultimo.data.split("-").reverse().slice(0, 2).join("/")}`
                : "Registre uma vez por semana, de preferência no sábado."}
            </p>
          </div>
          {!aberto && (
            <Button size="sm" variant={pendente ? "default" : "outline"} className="shrink-0 rounded-xl" onClick={() => setAberto(true)}>
              {pendente ? "Registrar" : <><Check className="mr-1 h-3.5 w-3.5" /> De novo</>}
            </Button>
          )}
        </div>

        {aberto && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-xs font-medium text-foreground">Peso (kg)</span>
                <Input inputMode="decimal" placeholder="68,4" value={peso} autoFocus
                  onChange={(e) => setPeso(e.target.value.replace(/[^\d.,]/g, "").slice(0, 6))} className="h-11 rounded-xl text-base" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-foreground">Cintura (cm) <span className="font-normal text-muted-foreground">opcional</span></span>
                <Input inputMode="decimal" placeholder="80" value={cintura}
                  onChange={(e) => setCintura(e.target.value.replace(/[^\d.,]/g, "").slice(0, 6))} className="h-11 rounded-xl text-base" />
              </label>
            </div>
            <Textarea placeholder="Algo sobre a semana? (opcional)" value={obs} onChange={(e) => setObs(e.target.value.slice(0, 500))} rows={2} className="rounded-xl" />
            <p className="text-[11px] text-muted-foreground">
              Para o número ser comparável: logo depois de acordar e ir ao banheiro, antes de comer, na mesma balança.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setAberto(false)} disabled={salvando}>Cancelar</Button>
              <Button className="flex-1 rounded-xl" onClick={salvar} disabled={salvando}>
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
