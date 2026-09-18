/**
 * Cálculos antropométricos e energéticos.
 *
 * Ficam aqui, fora dos componentes, por dois motivos: são funções puras que
 * precisam de teste de regressão, e a mesma conta não pode existir em dois
 * lugares com resultados diferentes.
 *
 * Unidades, sempre: peso em kg, altura em cm, dobras em mm, circunferências
 * em cm, idade em anos. A tabela `pacientes` guarda altura em METROS; quem
 * lê de lá converte antes de chamar estas funções.
 */

export type Sexo = "M" | "F";

/**
 * Normaliza o sexo vindo do banco. Devolve null quando não dá para afirmar.
 *
 * Importante: NÃO assume masculino no silêncio. A diferença entre os sexos
 * no Mifflin-St Jeor é de 166 kcal, e em dobras cutâneas muda a equação
 * inteira, então um palpite aqui contamina todo o resto.
 */
export function normalizarSexo(sexo: string | null | undefined): Sexo | null {
  if (!sexo) return null;
  const s = String(sexo).trim().toLowerCase();
  if (s === "m" || s === "masculino") return "M";
  if (s === "f" || s === "feminino") return "F";
  return null;
}

/** Idade em anos. Devolve null quando não há data de nascimento. */
export function calcIdade(dataNascimento: string | null | undefined): number | null {
  if (!dataNascimento) return null;
  const nasc = new Date(dataNascimento);
  if (Number.isNaN(nasc.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade >= 0 && idade < 130 ? idade : null;
}

// ─── IMC ────────────────────────────────────────────────────────────

export interface ResultadoIMC {
  imc: number | null;
  classificacao: string | null;
}

/** IMC a partir de peso (kg) e altura (cm), com classificação da OMS. */
export function calcIMC(peso: number | null, alturaCm: number | null): ResultadoIMC {
  if (!peso || !alturaCm || peso <= 0 || alturaCm <= 0) {
    return { imc: null, classificacao: null };
  }
  const m = alturaCm / 100;
  const imc = peso / (m * m);
  let classificacao = "Normal";
  if (imc < 18.5) classificacao = "Baixo peso";
  else if (imc < 25) classificacao = "Normal";
  else if (imc < 30) classificacao = "Sobrepeso";
  else if (imc < 35) classificacao = "Obesidade I";
  else if (imc < 40) classificacao = "Obesidade II";
  else classificacao = "Obesidade III";
  return { imc: Math.round(imc * 100) / 100, classificacao };
}

/** Faixa de peso correspondente a IMC 18,5–24,9 para a altura informada. */
export function pesoIdeal(alturaCm: number | null): { min: number; max: number } | null {
  if (!alturaCm || alturaCm <= 0) return null;
  const m = alturaCm / 100;
  return {
    min: Math.round(18.5 * m * m * 10) / 10,
    max: Math.round(24.9 * m * m * 10) / 10,
  };
}

// ─── Circunferências ────────────────────────────────────────────────

/** Relação cintura/quadril, com o risco segundo os cortes da OMS. */
export function calcRCQ(cintura: number | null, quadril: number | null, sexo: Sexo | null) {
  if (!cintura || !quadril || quadril <= 0) return { rcq: null, risco: null };
  const rcq = Math.round((cintura / quadril) * 100) / 100;
  if (!sexo) return { rcq, risco: null };
  const limiteAlto = sexo === "M" ? 0.9 : 0.85;
  const limiteModerado = sexo === "M" ? 0.85 : 0.8;
  const risco = rcq > limiteAlto ? "Elevado" : rcq > limiteModerado ? "Moderado" : "Normal";
  return { rcq, risco };
}

/** Relação cintura/estatura. Cintura e altura ambas em cm. */
export function calcRelacaoCinturaEstatura(cintura: number | null, alturaCm: number | null): number | null {
  if (!cintura || !alturaCm || alturaCm <= 0) return null;
  return Math.round((cintura / alturaCm) * 100) / 100;
}

/** Circunferência muscular do braço: CB (cm) menos π × DCT (mm convertida em cm). */
export function calcCMB(circBracoCm: number | null, dobraTricepsMm: number | null): number | null {
  if (!circBracoCm || !dobraTricepsMm) return null;
  return Math.round((circBracoCm - Math.PI * (dobraTricepsMm / 10)) * 100) / 100;
}

// ─── Composição corporal ────────────────────────────────────────────

export type Protocolo = "pollock3" | "pollock7" | "petroski" | "guedes" | "durnin" | "faulkner";

/** Dobras exigidas por cada protocolo, por sexo. Em milímetros. */
export const DOBRAS_POR_PROTOCOLO: Record<Protocolo, { M: string[]; F: string[] }> = {
  pollock3: {
    M: ["dobra_peitoral", "dobra_abdominal", "dobra_coxa"],
    F: ["dobra_triceps", "dobra_suprailiaca", "dobra_coxa"],
  },
  pollock7: {
    M: ["dobra_peitoral", "dobra_axilar_media", "dobra_triceps", "dobra_subescapular", "dobra_abdominal", "dobra_suprailiaca", "dobra_coxa"],
    F: ["dobra_peitoral", "dobra_axilar_media", "dobra_triceps", "dobra_subescapular", "dobra_abdominal", "dobra_suprailiaca", "dobra_coxa"],
  },
  // Petroski usa conjuntos DIFERENTES por sexo. O masculino é
  // subescapular/tríceps/suprailíaca/panturrilha; o feminino é
  // axilar média/suprailíaca/coxa/panturrilha.
  petroski: {
    M: ["dobra_subescapular", "dobra_triceps", "dobra_suprailiaca", "dobra_panturrilha"],
    F: ["dobra_axilar_media", "dobra_suprailiaca", "dobra_coxa", "dobra_panturrilha"],
  },
  guedes: {
    M: ["dobra_triceps", "dobra_suprailiaca", "dobra_abdominal"],
    F: ["dobra_coxa", "dobra_suprailiaca", "dobra_subescapular"],
  },
  durnin: {
    M: ["dobra_biceps", "dobra_triceps", "dobra_subescapular", "dobra_suprailiaca"],
    F: ["dobra_biceps", "dobra_triceps", "dobra_subescapular", "dobra_suprailiaca"],
  },
  faulkner: {
    M: ["dobra_triceps", "dobra_subescapular", "dobra_suprailiaca", "dobra_abdominal"],
    F: ["dobra_triceps", "dobra_subescapular", "dobra_suprailiaca", "dobra_abdominal"],
  },
};

export interface EntradaComposicao {
  protocolo: Protocolo;
  sexo: Sexo;
  idade: number;
  /** Dobras em mm, por nome de campo. */
  dobras: Record<string, number | null | undefined>;
  /** Exigidos só pelo Petroski feminino. */
  pesoKg?: number | null;
  alturaCm?: number | null;
}

export interface ResultadoComposicao {
  pctGordura: number | null;
  densidade: number | null;
  /** Preenchido quando faltou dado para calcular; serve de aviso na tela. */
  faltando: string[];
}

/** Converte densidade corporal em percentual de gordura (Siri, 1961). */
export function siri(densidade: number): number {
  return (4.95 / densidade - 4.5) * 100;
}

function somarDobras(entrada: EntradaComposicao): { soma: number; faltando: string[] } {
  const campos = DOBRAS_POR_PROTOCOLO[entrada.protocolo][entrada.sexo];
  const faltando: string[] = [];
  let soma = 0;
  for (const campo of campos) {
    const v = Number(entrada.dobras[campo]);
    if (!v || v <= 0) faltando.push(campo);
    else soma += v;
  }
  return { soma, faltando };
}

/**
 * Percentual de gordura por dobras cutâneas.
 *
 * Referências das equações de densidade:
 * - Jackson & Pollock (1978, homens) e Jackson, Pollock & Ward (1980, mulheres)
 * - Petroski (1995): masculino com termo linear e quadrático do somatório;
 *   feminino com somatório, idade, MASSA CORPORAL e ESTATURA. O feminino
 *   estava implementado sem peso e sem altura e com as dobras do masculino,
 *   o que devolvia por volta de 43% de gordura para 30mm de dobras.
 * - Guedes (1985), Durnin & Womersley (1974), Faulkner (1968)
 */
export function calcComposicao(entrada: EntradaComposicao): ResultadoComposicao {
  const { protocolo, sexo, idade } = entrada;
  const { soma, faltando } = somarDobras(entrada);
  if (faltando.length > 0 || soma <= 0) return { pctGordura: null, densidade: null, faltando };

  const homem = sexo === "M";
  let densidade: number;

  switch (protocolo) {
    case "pollock3":
      densidade = homem
        ? 1.10938 - 0.0008267 * soma + 0.0000016 * soma * soma - 0.0002574 * idade
        : 1.0994921 - 0.0009929 * soma + 0.0000023 * soma * soma - 0.0001392 * idade;
      break;

    case "pollock7":
      densidade = homem
        ? 1.112 - 0.00043499 * soma + 0.00000055 * soma * soma - 0.00028826 * idade
        : 1.097 - 0.00046971 * soma + 0.00000056 * soma * soma - 0.00012828 * idade;
      break;

    case "petroski": {
      if (homem) {
        densidade = 1.10726863 - 0.00081201 * soma + 0.00000212 * soma * soma - 0.00041761 * idade;
        break;
      }
      // O feminino precisa de peso e estatura; sem eles não há como calcular.
      const peso = Number(entrada.pesoKg);
      const altura = Number(entrada.alturaCm);
      const faltaAqui: string[] = [];
      if (!peso || peso <= 0) faltaAqui.push("peso");
      if (!altura || altura <= 0) faltaAqui.push("altura");
      if (faltaAqui.length > 0) return { pctGordura: null, densidade: null, faltando: faltaAqui };
      densidade =
        1.0346585 - 0.00063129 * soma - 0.000311 * idade - 0.0004889 * peso + 0.00051345 * altura;
      break;
    }

    case "guedes": {
      const log = Math.log10(soma);
      densidade = homem ? 1.17136 - 0.06706 * log : 1.1665 - 0.07063 * log;
      break;
    }

    case "durnin": {
      const log = Math.log10(soma);
      if (homem) {
        if (idade < 20) densidade = 1.162 - 0.063 * log;
        else if (idade < 30) densidade = 1.1631 - 0.0632 * log;
        else if (idade < 40) densidade = 1.1422 - 0.0544 * log;
        else if (idade < 50) densidade = 1.162 - 0.07 * log;
        else densidade = 1.1715 - 0.0779 * log;
      } else {
        if (idade < 20) densidade = 1.1549 - 0.0678 * log;
        else if (idade < 30) densidade = 1.1599 - 0.0717 * log;
        else if (idade < 40) densidade = 1.1423 - 0.0632 * log;
        else if (idade < 50) densidade = 1.1333 - 0.0612 * log;
        else densidade = 1.1339 - 0.0645 * log;
      }
      break;
    }

    case "faulkner":
      // Faulkner devolve percentual direto, sem passar por densidade.
      return { pctGordura: Math.round((soma * 0.153 + 5.783) * 10) / 10, densidade: null, faltando: [] };

    default:
      return { pctGordura: null, densidade: null, faltando: [] };
  }

  if (!Number.isFinite(densidade) || densidade <= 0) {
    return { pctGordura: null, densidade: null, faltando: [] };
  }
  const pct = siri(densidade);
  if (!Number.isFinite(pct) || pct <= 0 || pct >= 80) {
    // Resultado fora do possível: é erro de medida ou de dado, não um valor.
    return { pctGordura: null, densidade: Math.round(densidade * 10000) / 10000, faltando: [] };
  }
  return {
    pctGordura: Math.round(pct * 10) / 10,
    densidade: Math.round(densidade * 10000) / 10000,
    faltando: [],
  };
}

/** Classificação do percentual de gordura. */
export function classificarGordura(pct: number | null, sexo: Sexo | null): string | null {
  if (pct === null || !sexo) return null;
  if (sexo === "M") {
    if (pct < 6) return "Muito baixo";
    if (pct < 14) return "Excelente";
    if (pct < 18) return "Bom";
    if (pct < 25) return "Acima da média";
    return "Elevado";
  }
  if (pct < 14) return "Muito baixo";
  if (pct < 21) return "Excelente";
  if (pct < 25) return "Bom";
  if (pct < 32) return "Acima da média";
  return "Elevado";
}

// ─── Gasto energético ───────────────────────────────────────────────

export type FormulaTMB =
  | "harris_benedict" | "harris_revisada" | "mifflin" | "fao_oms"
  | "cunningham" | "owen" | "tinsley";

export interface EntradaTMB {
  formula: FormulaTMB;
  pesoKg: number;
  alturaCm: number;
  idade: number;
  sexo: Sexo;
  /** Massa livre de gordura, em kg. Exigida por Cunningham e Tinsley. */
  mlgKg?: number | null;
}

/** Taxa metabólica basal, em kcal/dia. Devolve null quando falta dado. */
export function calcTMB(e: EntradaTMB): number | null {
  const { formula, pesoKg: p, alturaCm: h, idade: i, sexo } = e;
  if (!p || !h || i === null || i === undefined) return null;
  const homem = sexo === "M";
  const mlg = Number(e.mlgKg) || 0;

  switch (formula) {
    case "harris_benedict":
      return homem
        ? 66.5 + 13.75 * p + 5.003 * h - 6.755 * i
        : 655.1 + 9.563 * p + 1.85 * h - 4.676 * i;
    case "harris_revisada":
      return homem
        ? 88.362 + 13.397 * p + 4.799 * h - 5.677 * i
        : 447.593 + 9.247 * p + 3.098 * h - 4.33 * i;
    case "mifflin":
      return homem ? 10 * p + 6.25 * h - 5 * i + 5 : 10 * p + 6.25 * h - 5 * i - 161;
    case "fao_oms":
      if (homem) {
        if (i < 3) return 60.9 * p - 54;
        if (i < 10) return 22.7 * p + 495;
        if (i < 18) return 17.5 * p + 651;
        if (i < 30) return 15.3 * p + 679;
        if (i < 60) return 11.6 * p + 879;
        return 13.5 * p + 487;
      }
      if (i < 3) return 61.0 * p - 51;
      if (i < 10) return 22.5 * p + 499;
      if (i < 18) return 12.2 * p + 746;
      if (i < 30) return 14.7 * p + 496;
      if (i < 60) return 8.7 * p + 829;
      return 10.5 * p + 596;
    case "cunningham":
      return mlg > 0 ? 500 + 22 * mlg : null;
    case "owen":
      return homem ? 879 + 10.2 * p : 795 + 7.18 * p;
    case "tinsley":
      // Tinsley (2019) tem DUAS equações, e a escolha é pela variável
      // disponível, não pelo sexo: massa livre de gordura quando houver,
      // massa corporal caso contrário.
      return mlg > 0 ? 25.9 * mlg - 284 : 24.8 * p + 10;
    default:
      return null;
  }
}

/** Fórmulas que exigem massa livre de gordura para produzir resultado. */
export const FORMULAS_QUE_EXIGEM_MLG: FormulaTMB[] = ["cunningham"];

export interface EntradaMacros {
  metaKcal: number;
  pesoKg: number;
  proteinaModo: "gkg" | "pct";
  proteinaValor: number;
  carboidratoPct: number;
}

export interface ResultadoMacros {
  proteina: { g: number; pct: number; kcal: number };
  carboidrato: { g: number; pct: number; kcal: number };
  gordura: { g: number; pct: number; kcal: number };
  valido: boolean;
  erro: string | null;
}

/**
 * Distribuição de macros. A gordura é o que sobra depois de proteína e
 * carboidrato, então proteína + carboidrato acima de 100% é entrada
 * inválida, e não um resultado com gordura negativa.
 */
export function calcMacros(e: EntradaMacros): ResultadoMacros {
  const meta = e.metaKcal;
  let protPct: number;
  let protG: number;
  let protKcal: number;

  if (e.proteinaModo === "gkg") {
    protG = e.pesoKg * e.proteinaValor;
    protKcal = protG * 4;
    protPct = meta > 0 ? (protKcal / meta) * 100 : 0;
  } else {
    protPct = e.proteinaValor;
    protKcal = meta * (protPct / 100);
    protG = protKcal / 4;
  }

  const carbPct = e.carboidratoPct;
  const gordPct = 100 - protPct - carbPct;
  const carbKcal = meta * (carbPct / 100);
  const gordKcal = meta * (gordPct / 100);

  const erro =
    gordPct < 0
      ? `Proteína (${Math.round(protPct)}%) e carboidrato (${Math.round(carbPct)}%) somam mais de 100%. Não sobra caloria para a gordura.`
      : gordPct < 15
        ? `Gordura em ${Math.round(gordPct)}% do total, abaixo dos 20% usualmente recomendados.`
        : null;

  return {
    proteina: { g: Math.round(protG), pct: Math.round(protPct), kcal: Math.round(protKcal) },
    carboidrato: { g: Math.round(carbKcal / 4), pct: Math.round(carbPct), kcal: Math.round(carbKcal) },
    gordura: { g: Math.round(gordKcal / 9), pct: Math.round(gordPct), kcal: Math.round(gordKcal) },
    valido: gordPct >= 0,
    erro,
  };
}

// ─── Coerência de macronutrientes ───────────────────────────────────

export interface TotaisPlano {
  kcal: number | null;
  proteina_g: number | null;
  carboidrato_g: number | null;
  gordura_g: number | null;
}

export interface CoerenciaMacros {
  /** false quando a caloria declarada não corresponde aos macros. */
  coerente: boolean;
  /** Soma real: 4 kcal/g de proteína e carboidrato, 9 kcal/g de gordura. */
  kcalCalculado: number | null;
  divergenciaPct: number | null;
  mensagem: string | null;
}

/**
 * Confere se a caloria declarada bate com a soma dos macronutrientes.
 *
 * Existe porque os totais de um plano em PDF são extraídos por IA, e um
 * dígito lido errado passa despercebido. Aqui a aritmética decide.
 *
 * A tolerância de 10% acomoda o arredondamento normal de um plano; acima
 * disso é erro de leitura ou de digitação, não arredondamento.
 */
export function conferirCoerenciaMacros(t: TotaisPlano, toleranciaPct = 10): CoerenciaMacros {
  const { kcal, proteina_g: p, carboidrato_g: c, gordura_g: g } = t;
  if (kcal == null || p == null || c == null || g == null) {
    return { coerente: true, kcalCalculado: null, divergenciaPct: null, mensagem: null };
  }
  const kcalCalculado = Math.round(p * 4 + c * 4 + g * 9);
  if (kcal <= 0) {
    return {
      coerente: false, kcalCalculado, divergenciaPct: null,
      mensagem: `A caloria declarada é ${kcal}, mas os macros somam ${kcalCalculado} kcal.`,
    };
  }
  const divergenciaPct = Math.round((Math.abs(kcalCalculado - kcal) / kcal) * 1000) / 10;
  if (divergenciaPct <= toleranciaPct) {
    return { coerente: true, kcalCalculado, divergenciaPct, mensagem: null };
  }
  return {
    coerente: false,
    kcalCalculado,
    divergenciaPct,
    mensagem:
      `O plano declara ${Math.round(kcal)} kcal, mas ${Math.round(p)}g de proteína, ` +
      `${Math.round(c)}g de carboidrato e ${Math.round(g)}g de gordura somam ${kcalCalculado} kcal ` +
      `(${divergenciaPct}% de diferença). Confira o PDF antes de usar estes números.`,
  };
}
