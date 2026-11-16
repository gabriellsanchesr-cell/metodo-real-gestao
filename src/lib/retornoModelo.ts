/**
 * Roteiro do retorno: o que investigar em cada consulta de acompanhamento,
 * do relato geral à conduta. Nota de 1 a 5 (5 é sempre o lado bom) com
 * texto livre ao lado, para o retorno ser comparável de uma vez para outra
 * sem perder a fala da paciente.
 */
import type { Campo, Secao } from "@/lib/formularios";
import { BRISTOL } from "@/lib/anamneseModelo";

const REFEICOES = [
  { id: "cafe", nome: "Café da manhã" },
  { id: "lanche_manha", nome: "Lanche da manhã" },
  { id: "almoco", nome: "Almoço" },
  { id: "lanche_tarde", nome: "Lanche da tarde" },
  { id: "jantar", nome: "Jantar" },
  { id: "ceia", nome: "Ceia" },
];

function refeicao(id: string, nome: string): Campo[] {
  return [
    { id: `ref_${id}_adesao`, rotulo: `${nome}: seguiu o plano`, tipo: "nota", ruim: "Quase nunca", bom: "Quase sempre" },
    { id: `ref_${id}_fome`, rotulo: `${nome}: fome antes`, tipo: "nota", ruim: "Fome demais ou nenhuma", bom: "Fome na medida" },
    { id: `ref_${id}`, rotulo: `${nome}: o que comeu de fato, trocas, horário`, tipo: "textoLongo", largo: true },
  ];
}

export const RETORNO_SECOES: Secao[] = [
  {
    id: "panorama",
    titulo: "Como foi o período",
    descricao: "Comece aberto: o que a paciente traz sem ser perguntada costuma ser o mais importante.",
    campos: [
      { id: "geral_nota", rotulo: "Como avalia o período desde a última consulta", tipo: "nota", ruim: "Muito difícil", bom: "Muito bom" },
      { id: "adesao_geral", rotulo: "Adesão geral ao plano", tipo: "nota", ruim: "Quase nada", bom: "Quase tudo" },
      { id: "relato", rotulo: "Relato livre da paciente", tipo: "textoLongo", largo: true, dica: "Como foram as semanas, o que mudou na rotina." },
      { id: "vitorias", rotulo: "Vitórias do período", tipo: "textoLongo", largo: true },
      { id: "dificuldades", rotulo: "Principais dificuldades", tipo: "textoLongo", largo: true },
      { id: "rotina_mudou", rotulo: "Mudou algo na rotina? (trabalho, horários, viagens, família)", tipo: "textoLongo", largo: true },
    ],
  },
  {
    id: "refeicoes",
    titulo: "Refeição por refeição",
    descricao: "Para cada refeição: o quanto seguiu, como chegou de fome e o que comeu de fato.",
    campos: REFEICOES.flatMap((r) => refeicao(r.id, r.nome)),
  },
  {
    id: "fome",
    titulo: "Fome, saciedade e comportamento alimentar",
    campos: [
      { id: "fome_geral", rotulo: "Fome ao longo do dia", tipo: "nota", ruim: "Fome demais", bom: "Sob controle" },
      { id: "saciedade", rotulo: "Saciedade depois das refeições", tipo: "nota", ruim: "Não sacia", bom: "Sacia bem" },
      { id: "fome_horario", rotulo: "Horário de maior fome", tipo: "texto" },
      { id: "beliscos", rotulo: "Beliscos fora do plano (o quê, quando)", tipo: "texto", largo: true },
      { id: "doce", rotulo: "Vontade de doce", tipo: "nota", ruim: "Muito forte", bom: "Tranquila" },
      { id: "emocional", rotulo: "Comer emocional (estresse, tédio, ansiedade)", tipo: "nota", ruim: "Frequente", bom: "Não aconteceu" },
      { id: "compulsao", rotulo: "Episódio de compulsão ou perda de controle", tipo: "simnao" },
      { id: "compulsao_obs", rotulo: "Se sim: quantos, gatilho e o que comeu", tipo: "textoLongo", largo: true },
      { id: "relacao_comida", rotulo: "Relação com a comida no período", tipo: "nota", ruim: "Culpa e briga", bom: "Leve" },
      { id: "enjoo", rotulo: "Enjoou de algum alimento ou refeição?", tipo: "texto", largo: true },
    ],
  },
  {
    id: "fds",
    titulo: "Fim de semana e vida social",
    campos: [
      { id: "fds_nota", rotulo: "Fins de semana", tipo: "nota", ruim: "Fugiu muito do plano", bom: "Dentro do combinado" },
      { id: "fora_casa", rotulo: "Refeições fora de casa por semana", tipo: "numero", unidade: "refeições" },
      { id: "alcool", rotulo: "Bebida alcoólica (frequência e quantidade)", tipo: "texto", largo: true },
      { id: "eventos", rotulo: "Eventos, viagens ou datas especiais no período", tipo: "texto", largo: true },
    ],
  },
  {
    id: "sono",
    titulo: "Sono",
    campos: [
      { id: "sono_nota", rotulo: "Qualidade do sono", tipo: "nota", ruim: "Muito ruim", bom: "Muito boa" },
      { id: "sono_horas", rotulo: "Horas de sono por noite", tipo: "numero", unidade: "h" },
      { id: "sono_horario", rotulo: "Horário de dormir e de acordar", tipo: "texto" },
      { id: "sono_despertares", rotulo: "Acorda durante a noite? Acorda cansada?", tipo: "texto", largo: true },
    ],
  },
  {
    id: "intestino",
    titulo: "Intestino e digestão",
    campos: [
      { id: "intestino_nota", rotulo: "Funcionamento do intestino", tipo: "nota", ruim: "Preso ou desregulado", bom: "Regular" },
      { id: "intestino_freq", rotulo: "Evacuações por semana", tipo: "numero", unidade: "vezes" },
      { id: "bristol", rotulo: "Escala de Bristol", tipo: "opcoes", opcoes: BRISTOL, largo: true },
      { id: "gases", rotulo: "Gases, estufamento, azia ou refluxo", tipo: "nota", ruim: "Frequentes", bom: "Ausentes" },
      { id: "digestao_obs", rotulo: "Alimentos que pioram a digestão", tipo: "texto", largo: true },
    ],
  },
  {
    id: "energia",
    titulo: "Energia, humor e estresse",
    campos: [
      { id: "energia_nota", rotulo: "Energia e disposição", tipo: "nota", ruim: "Sem energia", bom: "Muita disposição" },
      { id: "energia_queda", rotulo: "Em que horário a energia cai?", tipo: "texto" },
      { id: "cafeina", rotulo: "Café ou cafeína por dia", tipo: "texto" },
      { id: "humor", rotulo: "Humor", tipo: "nota", ruim: "Muito baixo", bom: "Muito bom" },
      { id: "estresse", rotulo: "Estresse", tipo: "nota", ruim: "Muito alto", bom: "Baixo" },
      { id: "foco", rotulo: "Foco e concentração", tipo: "nota", ruim: "Muito ruim", bom: "Muito bom" },
    ],
  },
  {
    id: "treino",
    titulo: "Treino",
    campos: [
      { id: "treino_freq", rotulo: "Treinos por semana", tipo: "numero", unidade: "treinos" },
      { id: "treino_rendimento", rotulo: "Rendimento no treino", tipo: "nota", ruim: "Muito fraco", bom: "Muito bom" },
      { id: "treino_recuperacao", rotulo: "Recuperação e dores", tipo: "nota", ruim: "Dores fortes", bom: "Recupera bem" },
      { id: "treino_pre_pos", rotulo: "Como fez o pré e o pós-treino", tipo: "texto", largo: true },
      { id: "treino_mudancas", rotulo: "Mudou o treino ou o horário?", tipo: "texto", largo: true },
    ],
  },
  {
    id: "hidratacao",
    titulo: "Hidratação",
    campos: [
      { id: "agua", rotulo: "Garrafas de 500 ml de água por dia", tipo: "numero", unidade: "garrafas" },
      { id: "urina", rotulo: "Cor da urina na maior parte do dia", tipo: "opcoes", opcoes: ["Clara", "Amarelo claro", "Amarelo escuro", "Escura"] },
    ],
  },
  {
    id: "saude",
    titulo: "Saúde",
    campos: [
      { id: "sintomas", rotulo: "Sintomas novos (dor de cabeça, cãibra, queda de cabelo, tontura...)", tipo: "textoLongo", largo: true },
      { id: "medicamentos", rotulo: "Medicamentos ou suplementos novos ou suspensos", tipo: "textoLongo", largo: true },
      { id: "ciclo", rotulo: "Ciclo menstrual (fase, TPM, alterações), se aplicável", tipo: "texto", largo: true },
      { id: "exames", rotulo: "Exames novos ou consulta médica no período", tipo: "texto", largo: true },
    ],
  },
  {
    id: "medidas",
    titulo: "Medidas do dia",
    descricao: "Para a composição completa, registre também em Avaliações Físicas.",
    campos: [
      { id: "peso", rotulo: "Peso", tipo: "numero", unidade: "kg" },
      { id: "cintura", rotulo: "Cintura", tipo: "numero", unidade: "cm" },
      { id: "quadril", rotulo: "Quadril", tipo: "numero", unidade: "cm" },
      { id: "percepcao_corpo", rotulo: "Como percebe o corpo e as roupas", tipo: "texto", largo: true },
    ],
  },
  {
    id: "conduta",
    titulo: "Conduta",
    descricao: "O que muda a partir de hoje. A próxima consulta abre por aqui.",
    campos: [
      { id: "ajustes_plano", rotulo: "Ajustes no plano alimentar", tipo: "textoLongo", largo: true },
      { id: "metas", rotulo: "Metas até o próximo retorno", tipo: "textoLongo", largo: true, dica: "Uma por linha, poucas e concretas." },
      { id: "orientacoes", rotulo: "Orientações e combinados", tipo: "textoLongo", largo: true },
      { id: "suplementacao", rotulo: "Suplementação (início, ajuste, suspensão)", tipo: "texto", largo: true },
      { id: "proximo_retorno", rotulo: "Próximo retorno sugerido", tipo: "texto", dica: "Ex.: em 15 dias" },
      { id: "obs_clinica", rotulo: "Observações clínicas (uso interno)", tipo: "textoLongo", largo: true },
    ],
  },
];
