import { dataLocal } from "@/lib/datas";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Scale, Activity, Calendar, CheckSquare, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface Props {
  paciente: any;
  pacienteId: string;
}

export function PatientContext({ paciente, pacienteId }: Props) {
  const navigate = useNavigate();
  const [nextConsulta, setNextConsulta] = useState<any>(null);
  const [lastCheckin, setLastCheckin] = useState<any>(null);
  const [aderenciaMedia, setAderenciaMedia] = useState<number | null>(null);

  useEffect(() => {
    loadContext();
  }, [pacienteId]);

  const loadContext = async () => {
    // Next consultation
    const { data: consulta } = await supabase
      .from("consultas")
      .select("data_hora")
      .eq("paciente_id", pacienteId)
      .eq("status", "agendado")
      .gte("data_hora", new Date().toISOString())
      .order("data_hora", { ascending: true })
      .limit(1)
      .maybeSingle();
    setNextConsulta(consulta);

    // Last checkin
    const { data: checkin } = await supabase
      .from("checklist_respostas")
      .select("semana, aderencia_plano")
      .eq("paciente_id", pacienteId)
      .eq("respondido", true)
      .order("semana", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLastCheckin(checkin);

    // Average adherence (4 weeks)
    const { data: checkins } = await supabase
      .from("checklist_respostas")
      .select("aderencia_plano")
      .eq("paciente_id", pacienteId)
      .eq("respondido", true)
      .order("semana", { ascending: false })
      .limit(4);
    if (checkins && checkins.length > 0) {
      const vals = checkins.filter(c => c.aderencia_plano != null).map(c => c.aderencia_plano!);
      if (vals.length > 0) setAderenciaMedia(Math.round(vals.reduce((a, b) => a + b, 0) / vals.length));
    }
  };

  const getInitials = (name: string) => name?.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase() || "?";

  const faseLabels: Record<string, string> = { rotina: "Rastreio", estrategia: "Estratégia", autonomia: "Ajuste", liberdade: "Lifestyle" };

  return (
    <div className="w-[240px] border-l border-border bg-card flex flex-col shrink-0">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Avatar + Name */}
          <div className="text-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary mx-auto">
              {getInitials(paciente.nome_completo)}
            </div>
            <p className="font-semibold text-sm text-foreground mt-2">{paciente.nome_completo}</p>
          </div>

          {/* Stats */}
          <div className="space-y-3">
            <InfoRow icon={Scale} label="Último peso" value={paciente.peso_inicial ? `${paciente.peso_inicial} kg` : "—"} />
            <InfoRow icon={Activity} label="Fase R.E.A.L." value={faseLabels[paciente.fase_real] || "—"} />
            <InfoRow
              icon={Calendar}
              label="Próxima consulta"
              value={nextConsulta ? format(new Date(nextConsulta.data_hora), "dd/MM HH:mm", { locale: ptBR }) : "—"}
            />
            <InfoRow
              icon={CheckSquare}
              label="Último check-in"
              value={lastCheckin ? format(dataLocal(lastCheckin.semana), "dd/MM", { locale: ptBR }) : "—"}
            />
            <InfoRow
              icon={TrendingUp}
              label="Aderência (4 sem)"
              value={aderenciaMedia != null ? `${aderenciaMedia}%` : "—"}
            />
          </div>

          <button
            onClick={() => navigate(`/pacientes/${pacienteId}`)}
            className="w-full text-xs text-primary hover:underline text-center mt-2"
          >
            Ver perfil completo →
          </button>
        </div>
      </ScrollArea>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
