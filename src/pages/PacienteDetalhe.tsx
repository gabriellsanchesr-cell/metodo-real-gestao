import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PacienteHeader } from "@/components/paciente/PacienteHeader";
import { PacienteSidebar, sections, type SectionId } from "@/components/paciente/PacienteSidebar";
import { VisaoGeral } from "@/components/paciente/VisaoGeral";
import { DadosPaciente } from "@/components/paciente/DadosPaciente";
import { AcompanhamentoSection } from "@/components/paciente/AcompanhamentoSection";
import { PlanoAlimentarSection } from "@/components/paciente/PlanoAlimentarSection";
import { ConsultasSection } from "@/components/paciente/ConsultasSection";
import { CalculoEnergetico } from "@/components/paciente/CalculoEnergetico";
import { AcessoPaciente } from "@/components/paciente/AcessoPaciente";
import { AnamneseSection } from "@/components/paciente/AnamneseSection";
import { EvolucaoFotograficaSection } from "@/components/paciente/EvolucaoFotograficaSection";
import { QuestionariosSection } from "@/components/paciente/QuestionariosSection";
import { ExamesSection } from "@/components/paciente/ExamesSection";
import { OrientacoesSection } from "@/components/paciente/OrientacoesSection";
import { ProntuarioSection } from "@/components/paciente/ProntuarioSection";
import { MetasSection } from "@/components/paciente/MetasSection";
import { MateriaisExtrasSection } from "@/components/paciente/MateriaisExtrasSection";
import { ReceitaSection } from "@/components/paciente/ReceitaSection";
import { SuplementosSection } from "@/components/paciente/SuplementosSection";
import { AvaliacoesFisicasSection } from "@/components/paciente/AvaliacoesFisicasSection";
import { DiarioAlimentarSection } from "@/components/paciente/DiarioAlimentarSection";
import { FinanceiroSection } from "@/components/paciente/FinanceiroSection";
import { ContratoSection } from "@/components/paciente/ContratoSection";
import { EmailsSection } from "@/components/paciente/EmailsSection";
import { PacienteAccessModal } from "@/components/PacienteAccessModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";

export default function PacienteDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [paciente, setPaciente] = useState<any>(null);
  const [searchParams] = useSearchParams();
  // Permite abrir a ficha direto numa seção, ex.: /pacientes/:id?secao=contrato
  const secaoInicial = sections.find((s) => s.id === searchParams.get("secao"))?.id ?? "visao-geral";
  const [activeSection, setActiveSection] = useState<SectionId>(secaoInicial);
  const [accessModal, setAccessModal] = useState<{ open: boolean; mode: "create" | "edit" }>({ open: false, mode: "create" });
  const [deleteModal, setDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { if (id) loadPaciente(); }, [id]);

  const loadPaciente = async () => {
    const { data } = await supabase.from("pacientes").select("*").eq("id", id).single();
    setPaciente(data);
  };

  const handleAction = async (action: "deactivate" | "reactivate") => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-patient-auth", { body: { action, paciente_id: id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Sucesso", description: action === "deactivate" ? "Acesso desativado." : "Acesso reativado." });
      loadPaciente();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-patient-auth", { body: { action: "delete", paciente_id: id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Sucesso", description: "Paciente excluído." });
      navigate("/pacientes");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  if (!paciente) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="space-y-3 text-center">
          <div className="h-10 w-10 mx-auto rounded-full bg-muted animate-pulse" />
          <p className="text-muted-foreground">Carregando paciente...</p>
        </div>
      </div>
    );
  }

  const sectionLabel = sections.find(s => s.id === activeSection)?.label || "";

  const renderSection = () => {
    switch (activeSection) {
      case "visao-geral": return <VisaoGeral paciente={paciente} onNavigate={setActiveSection} />;
      case "dados": return <DadosPaciente paciente={paciente} onEdit={() => navigate(`/pacientes/novo?edit=${paciente.id}`)} />;
      case "acompanhamento": return <AcompanhamentoSection paciente={paciente} />;
      case "plano": return <PlanoAlimentarSection paciente={paciente} />;
      case "consultas": return <ConsultasSection paciente={paciente} />;
      case "calculo": return <CalculoEnergetico paciente={paciente} />;
      case "acesso": return (
        <AcessoPaciente
          paciente={paciente}
          onCreateAccess={() => setAccessModal({ open: true, mode: "create" })}
          onEditAccess={() => setAccessModal({ open: true, mode: "edit" })}
          onDeactivate={() => handleAction("deactivate")}
          onReactivate={() => handleAction("reactivate")}
          actionLoading={actionLoading}
        />
      );
      case "anamnese": return <AnamneseSection paciente={paciente} />;
      case "fotos": return <EvolucaoFotograficaSection paciente={paciente} />;
      case "questionarios": return <QuestionariosSection paciente={paciente} />;
      case "exames": return <ExamesSection paciente={paciente} />;
      case "orientacoes": return <OrientacoesSection paciente={paciente} />;
      case "prontuario": return <ProntuarioSection paciente={paciente} />;
      case "avaliacoes": return <AvaliacoesFisicasSection paciente={paciente} />;
      case "diario": return <DiarioAlimentarSection paciente={paciente} />;
      case "receituario": return <ReceitaSection paciente={paciente} />;
      case "metas": return <MetasSection paciente={paciente} />;
      case "materiais": return <MateriaisExtrasSection paciente={paciente} />;
      case "suplementos": return <SuplementosSection paciente={paciente} />;
      case "financeiro": return <FinanceiroSection paciente={paciente} />;
      case "contrato": return <ContratoSection paciente={paciente} />;
      case "emails": return <EmailsSection paciente={paciente} />;
      default: return null;
    }
  };

  return (
    <div className="-m-6 flex flex-col h-[calc(100vh-3.5rem)]">
      <PacienteHeader
        paciente={paciente}
        activeSection={activeSection}
        sectionLabel={sectionLabel}
        onCreateAccess={() => setAccessModal({ open: true, mode: "create" })}
        onDeactivate={() => handleAction("deactivate")}
        onReactivate={() => handleAction("reactivate")}
        onDelete={() => setDeleteModal(true)}
        onEdit={() => navigate(`/pacientes/novo?edit=${paciente.id}`)}
        actionLoading={actionLoading}
      />

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <PacienteSidebar active={activeSection} onSelect={setActiveSection} />
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6 min-w-0 w-full">
          {renderSection()}
        </main>
      </div>

      <PacienteAccessModal
        open={accessModal.open}
        onOpenChange={(v) => setAccessModal(s => ({ ...s, open: v }))}
        pacienteId={paciente.id}
        pacienteNome={paciente.nome_completo}
        pacienteEmail={paciente.email}
        mode={accessModal.mode}
        onSuccess={loadPaciente}
      />
      <DeleteConfirmModal
        open={deleteModal}
        onOpenChange={setDeleteModal}
        pacienteNome={paciente.nome_completo}
        onConfirm={handleDelete}
        loading={actionLoading}
      />
    </div>
  );
}
