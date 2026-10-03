import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

interface Props {
  paciente: any;
  onEdit: () => void;
}

const nivelLabels: Record<string, string> = {
  sedentario: "Sedentário", leve: "Leve", moderado: "Moderado", intenso: "Intenso", muito_intenso: "Muito Intenso",
};
const objetivoLabels: Record<string, string> = {
  emagrecimento: "Emagrecimento", ganho_de_massa: "Ganho de Massa", saude_intestinal: "Saúde Intestinal",
  controle_ansiedade_alimentar: "Controle de Ansiedade Alimentar", performance: "Performance", outro: "Outro",
};
const faseLabels: Record<string, string> = {
  rotina: "Rastreio", estrategia: "Estratégia", autonomia: "Ajuste", liberdade: "Lifestyle",
};

function calcIMC(peso: number | null, altura: number | null): string {
  if (!peso || !altura || altura <= 0) return "—";
  const imc = peso / (altura * altura);
  return imc.toFixed(1);
}

function calcAge(dob: string | null): string {
  if (!dob) return "—";
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return `${age} anos`;
}

export function DadosPaciente({ paciente, onEdit }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border rounded-xl">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Informações Pessoais</CardTitle>
            <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
          </CardHeader>
          <CardContent className="text-sm space-y-2.5">
            <Row label="Nome" value={paciente.nome_completo} />
            <Row label="Nascimento" value={paciente.data_nascimento ? new Date(paciente.data_nascimento + "T12:00:00").toLocaleDateString("pt-BR") : "—"} />
            <Row label="Idade" value={calcAge(paciente.data_nascimento)} />
            <Row label="Sexo" value={paciente.sexo === "M" ? "Masculino" : paciente.sexo === "F" ? "Feminino" : paciente.sexo || "—"} />
            <Row label="Telefone" value={paciente.telefone || "—"} />
            <Row label="E-mail" value={paciente.email || "—"} />
          </CardContent>
        </Card>

        <Card className="border-border rounded-xl">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Antropometria Inicial</CardTitle>
            <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
          </CardHeader>
          <CardContent className="text-sm space-y-2.5">
            <Row label="Peso Inicial" value={paciente.peso_inicial ? `${paciente.peso_inicial} kg` : "—"} />
            <Row label="Altura" value={paciente.altura ? `${paciente.altura} m` : "—"} />
            <Row label="IMC" value={calcIMC(paciente.peso_inicial, paciente.altura)} />
            <Row label="Atividade Física" value={nivelLabels[paciente.nivel_atividade] || "—"} />
            <Row label="Objetivo" value={objetivoLabels[paciente.objetivo] || paciente.objetivo_outro || "—"} />
            <Row label="Fase R.E.A.L." value={faseLabels[paciente.fase_real] || "—"} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border rounded-xl">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Saúde e Histórico</CardTitle>
          <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
        </CardHeader>
        <CardContent className="text-sm space-y-2.5">
          <Row label="Restrições Alimentares" value={paciente.restricoes_alimentares || "—"} />
          <Row label="Alergias" value={paciente.alergias || "—"} />
          <Row label="Patologias" value={paciente.historico_patologias || "—"} />
          <Row label="Medicamentos" value={paciente.medicamentos || "—"} />
          <Row label="Sono" value={paciente.rotina_sono || "—"} />
          <Row label="Observações" value={paciente.observacoes_comportamentais || "—"} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground text-right">{value}</span>
    </div>
  );
}
