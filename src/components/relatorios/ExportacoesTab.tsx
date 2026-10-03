import { useState } from "react";
import { ROTULO_SITUACAO, usaPortal, type SituacaoPaciente } from "@/lib/painel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Table, Activity, ClipboardCheck, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { generateRelatorioConsultorioPdf } from "@/lib/pdf/relatorioConsultorioPdf";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  pacientes: any[];
  consultas: any[];
  avaliacoes: any[];
  acompanhamentos: any[];
  checklists: any[];
}

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${(c || "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportacoesTab({ pacientes, consultas, avaliacoes, acompanhamentos, checklists }: Props) {
  const { user } = useAuth();
  const [modal, setModal] = useState<string | null>(null);
  const [formato, setFormato] = useState("pdf");
  const [loading, setLoading] = useState(false);

  const reports = [
    { id: "geral", title: "Relatório Geral do Consultório", desc: "Indicadores consolidados, gráficos e resumo", icon: FileText, formats: ["pdf"] },
    { id: "pacientes", title: "Lista de Pacientes", desc: "Tabela completa de pacientes com filtros", icon: Table, formats: ["csv", "pdf"] },
    { id: "evolucao", title: "Evolução Clínica da Carteira", desc: "Tabela de evolução individual e resultados", icon: Activity, formats: ["csv"] },
    { id: "engajamento", title: "Relatório de Engajamento", desc: "Check-ins, aderência e uso do portal", icon: ClipboardCheck, formats: ["pdf"] },
  ];

  async function handleGenerate() {
    setLoading(true);
    try {
      if (modal === "geral" && formato === "pdf") {
        await generateRelatorioConsultorioPdf(pacientes, consultas, avaliacoes, acompanhamentos, checklists, user?.id);
      } else if (modal === "pacientes" && formato === "csv") {
        const headers = ["Nome", "Email", "Telefone", "Objetivo", "Fase", "Sexo", "Situação", "Usa o portal"];
        const rows = pacientes.map(p => [
          p.nome_completo, p.email || "", p.telefone || "", p.objetivo || "", p.fase_real || "", p.sexo || "", ROTULO_SITUACAO[p.situacao as SituacaoPaciente] ?? "Ativo", usaPortal(p) ? "Sim" : "Não",
        ]);
        downloadCSV("pacientes.csv", headers, rows);
      } else if (modal === "evolucao" && formato === "csv") {
        const headers = ["Paciente", "Peso Inicial", "Peso Atual", "Variação Peso", "Abd. Inicial", "Abd. Atual", "Variação Abd."];
        const rows = pacientes.filter(p => p.situacao === "ativo").map(p => {
          const avals = avaliacoes.filter((a: any) => a.paciente_id === p.id && a.peso).sort((a: any, b: any) => new Date(a.data_avaliacao).getTime() - new Date(b.data_avaliacao).getTime());
          if (avals.length < 2) return null;
          const first = avals[0];
          const last = avals[avals.length - 1];
          return [
            p.nome_completo,
            String(first.peso),
            String(last.peso),
            String(Math.round((last.peso - first.peso) * 10) / 10),
            first.circ_abdomen ? String(first.circ_abdomen) : "",
            last.circ_abdomen ? String(last.circ_abdomen) : "",
            (first.circ_abdomen && last.circ_abdomen) ? String(Math.round((last.circ_abdomen - first.circ_abdomen) * 10) / 10) : "",
          ];
        }).filter(Boolean) as string[][];
        downloadCSV("evolucao_clinica.csv", headers, rows);
      } else {
        toast({ title: "Formato não disponível", description: "Selecione outro formato.", variant: "destructive" });
        setLoading(false);
        return;
      }
      toast({ title: "Relatório gerado com sucesso!" });
      setModal(null);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao gerar relatório", variant: "destructive" });
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        {reports.map(r => (
          <Card key={r.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => { setModal(r.id); setFormato(r.formats[0]); }}>
            <CardContent className="p-4 flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <r.icon className="h-5 w-5 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <p className="font-semibold text-sm">{r.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
                <div className="flex gap-1 mt-2">
                  {r.formats.map(f => (
                    <span key={f} className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted font-semibold">{f}</span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!modal} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Gerar Relatório</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Formato</label>
              <Select value={formato} onValueChange={setFormato}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {reports.find(r => r.id === modal)?.formats.map(f => (
                    <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={handleGenerate} disabled={loading}>
              <Download className="h-4 w-4 mr-2" /> {loading ? "Gerando..." : "Gerar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
