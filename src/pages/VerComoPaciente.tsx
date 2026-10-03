import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PortalPacienteConteudo } from "@/pages/PortalPaciente";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * O nutri vê o portal exatamente como a paciente vê, sem trocar de login.
 * Só leitura: o PortalModoProvider desliga toda gravação (ver
 * src/contexts/PortalModoContext.tsx).
 *
 * "Celular" coloca o portal numa moldura de 390 px. O transform da moldura
 * faz o menu de baixo (position: fixed) ficar preso a ela, e não à tela.
 */
export default function VerComoPaciente() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [nome, setNome] = useState<string>("");
  const [celular, setCelular] = useState(() => {
    try { return localStorage.getItem("verComoPaciente:celular") !== "0"; } catch { return true; }
  });

  useEffect(() => {
    if (!id) return;
    supabase.from("pacientes").select("nome_completo").eq("id", id).maybeSingle()
      .then(({ data }) => setNome(data?.nome_completo ?? ""));
  }, [id]);

  const trocarModo = (v: boolean) => {
    setCelular(v);
    try { localStorage.setItem("verComoPaciente:celular", v ? "1" : "0"); } catch { /* opcional */ }
  };
  const voltar = () => navigate(id ? `/pacientes/${id}` : "/pacientes");

  if (!id) return null;

  const portal = <PortalPacienteConteudo pacienteId={id} modoVisualizacao onSair={voltar} />;

  return (
    <div className="min-h-screen bg-navy">
      <div className="sticky top-0 z-[60] flex flex-wrap items-center gap-2 border-b border-gold/30 bg-navy px-4 py-2.5 text-white">
        <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-white hover:bg-white/10 hover:text-white" onClick={voltar}>
          <ArrowLeft className="h-4 w-4" /> Painel
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          <Eye className="h-4 w-4 shrink-0 text-gold" />
          <span className="truncate">
            Vendo como <b className="font-semibold">{nome || "paciente"}</b>
            <span className="hidden text-white/60 sm:inline"> · só leitura, nada é salvo</span>
          </span>
        </div>
        <div className="flex rounded-full bg-white/10 p-0.5">
          {[
            { v: true, icon: Smartphone, rotulo: "Celular" },
            { v: false, icon: Monitor, rotulo: "Tela inteira" },
          ].map(({ v, icon: Icon, rotulo }) => (
            <button
              key={rotulo}
              type="button"
              onClick={() => trocarModo(v)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                celular === v ? "bg-white text-navy" : "text-white/80 hover:text-white",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {rotulo}
            </button>
          ))}
        </div>
      </div>

      {celular ? (
        <div className="flex justify-center px-4 py-6">
          <div
            className="relative h-[min(844px,calc(100vh-110px))] w-[390px] max-w-full overflow-hidden rounded-[2.5rem] border-[10px] border-black bg-background shadow-[0_30px_80px_-20px_rgba(0,0,0,.7)]"
            style={{ transform: "translateZ(0)" }}
          >
            <div className="h-full overflow-y-auto overscroll-contain">{portal}</div>
          </div>
        </div>
      ) : (
        <div className="bg-background">{portal}</div>
      )}
    </div>
  );
}
