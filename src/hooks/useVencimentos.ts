import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { faltaMigration, lerDiasAlerta, listarContratosAtivos, type ContratoComPaciente } from "@/lib/contratosApi";
import { diasAteVencimento, situacao, type Situacao } from "@/lib/vencimento";

export interface LinhaVencimento {
  contrato: ContratoComPaciente;
  pacienteId: string;
  nome: string;
  dias: number;
  situacao: Situacao;
}

/**
 * Carrega os contratos ativos e as pacientes ativas sem contrato, uma vez,
 * e entrega tudo já classificado. Usado pelo Dashboard, pela página de
 * Vencimentos e pela central de notificações.
 */
export function useVencimentos() {
  const [contratos, setContratos] = useState<ContratoComPaciente[]>([]);
  const [semPlano, setSemPlano] = useState<{ id: string; nome_completo: string }[]>([]);
  const [diasAlerta, setDiasAlerta] = useState(7);
  const [carregando, setCarregando] = useState(true);
  const [semTabela, setSemTabela] = useState(false);

  const carregar = async () => {
    try {
      const [lista, dias, pacientes] = await Promise.all([
        listarContratosAtivos(),
        lerDiasAlerta(),
        // ativo nulo conta como ativo; neq("ativo", false) descartaria os nulos.
        supabase.from("pacientes").select("id, nome_completo").or("ativo.is.null,ativo.eq.true").order("nome_completo"),
      ]);
      setContratos(lista);
      setDiasAlerta(dias);
      const comPlano = new Set(lista.map((c) => c.paciente_id));
      setSemPlano((pacientes.data ?? []).filter((p) => !comPlano.has(p.id)));
      setSemTabela(false);
    } catch (e) {
      if (faltaMigration(e)) setSemTabela(true);
      else console.warn("useVencimentos", e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const linhas = useMemo<LinhaVencimento[]>(() => {
    // Uma linha por paciente: se houver mais de um ativo, vale o de vencimento mais distante.
    const porPaciente = new Map<string, ContratoComPaciente>();
    for (const c of contratos) {
      const atual = porPaciente.get(c.paciente_id);
      if (!atual || c.data_vencimento > atual.data_vencimento) porPaciente.set(c.paciente_id, c);
    }
    return [...porPaciente.values()]
      .map((c) => {
        const dias = diasAteVencimento(c.data_vencimento);
        return {
          contrato: c,
          pacienteId: c.paciente_id,
          nome: c.pacientes?.nome_completo ?? "Paciente",
          dias,
          situacao: situacao(dias, diasAlerta),
        };
      })
      .sort((a, b) => a.dias - b.dias);
  }, [contratos, diasAlerta]);

  const urgentes = linhas.filter((l) => l.situacao !== "em_dia");

  return { linhas, urgentes, semPlano, diasAlerta, carregando, semTabela, recarregar: carregar };
}
