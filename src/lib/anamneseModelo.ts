/**
 * Anamnese clínica e nutricional do Gabriel, a mesma do Word
 * (Gabriel Nutri/ANAMNESE CLÍNICA E NUTRICIONAL.docx), campo a campo.
 * Nome, e-mail e data de nascimento vêm do cadastro da paciente.
 */
import type { Secao } from "@/lib/formularios";

const ESCALA_5 = ["Excelente", "Boa", "Regular", "Ruim", "Péssima"];
const ESCALA_5_M = ["Excelente", "Bom", "Regular", "Ruim", "Péssimo"];

export const BRISTOL = [
  "1. Caroços duros e separados",
  "2. Formato de salsicha, mas encaroçada",
  "3. Salsicha com rachaduras na superfície",
  "4. Salsicha ou cobra, lisa e macia",
  "5. Pedaços macios com bordas definidas",
  "6. Pedaços moles e fofos, bordas irregulares",
  "7. Totalmente líquida, sem pedaços",
];

const REFEICOES = [
  { id: "cafe", nome: "Café da manhã", hora: "7h" },
  { id: "lanche_manha", nome: "Lanche da manhã", hora: "" },
  { id: "almoco", nome: "Almoço", hora: "11h" },
  { id: "lanche_tarde", nome: "Lanche da tarde", hora: "15h" },
  { id: "jantar", nome: "Jantar", hora: "18h ou 19h" },
  { id: "ceia", nome: "Ceia", hora: "" },
];

export const ANAMNESE_MODELO = "real_v1";

export const ANAMNESE_SECOES: Secao[] = [
  {
    id: "dados",
    titulo: "Dados iniciais",
    campos: [
      { id: "peso", rotulo: "Peso", tipo: "numero", unidade: "kg" },
      { id: "altura", rotulo: "Altura", tipo: "numero", unidade: "cm" },
    ],
  },
  {
    id: "objetivos",
    titulo: "Objetivos e motivações",
    campos: [
      { id: "obj_tempo_treino", rotulo: "Há quanto tempo treina? Não treina? Vai começar?", tipo: "texto", largo: true },
      { id: "obj_objetivo", rotulo: "Qual o seu objetivo?", tipo: "textoLongo", largo: true },
      { id: "obj_prazos", rotulo: "Objetivo a curto, médio e longo prazo", tipo: "textoLongo", largo: true },
      { id: "obj_importancia", rotulo: "Qual a importância para você de atingir o seu objetivo?", tipo: "textoLongo", largo: true },
    ],
  },
  {
    id: "treino",
    titulo: "Histórico de treino",
    campos: [
      { id: "treino_tempo", rotulo: "Treina há quanto tempo?", tipo: "texto" },
      { id: "treino_frequencia", rotulo: "Frequência de treino atual", tipo: "texto", dica: "Ex.: 4x na semana" },
      { id: "treino_atividades", rotulo: "Quais atividades faz?", tipo: "texto", dica: "Ex.: musculação e cárdio, só musculação...", largo: true },
      { id: "treino_sentado", rotulo: "Fica muito tempo sentado(a)?", tipo: "texto", largo: true },
    ],
  },
  {
    id: "alimentar",
    titulo: "Histórico alimentar",
    campos: [
      { id: "ali_relacao", rotulo: "Como considera a sua relação com a comida?", tipo: "opcoes", opcoes: ESCALA_5, largo: true },
      { id: "ali_frequencia", rotulo: "Frequência de refeições hoje", tipo: "texto" },
      { id: "ali_local", rotulo: "Faz a maior parte das refeições em qual local?", tipo: "texto" },
      { id: "ali_gosta", rotulo: "3 alimentos que mais gosta", tipo: "texto" },
      { id: "ali_detesta", rotulo: "3 alimentos que detesta", tipo: "texto" },
      { id: "ali_fim_semana", rotulo: "Tem facilidade em seguir a dieta no fim de semana?", tipo: "texto", largo: true },
      { id: "ali_suplementos", rotulo: "Toma algum suplemento? Quais?", tipo: "texto", largo: true },
      { id: "ali_frutas", rotulo: "Consegue comer frutas diariamente? Quantas vezes e quais?", tipo: "texto", largo: true },
      { id: "ali_agua", rotulo: "Garrafas de 500 ml de água por dia", tipo: "numero", unidade: "garrafas" },
      { id: "ali_apetite", rotulo: "Como classifica o seu apetite?", tipo: "texto" },
      { id: "ali_emocional", rotulo: "Nota comer emocional no dia a dia? (tristeza, estresse, tédio, vontade de um alimento específico)", tipo: "textoLongo", largo: true },
      { id: "ali_dieta_atual", rotulo: "Segue alguma dieta atualmente?", tipo: "texto", largo: true },
      { id: "ali_alergias", rotulo: "Desconforto com algum alimento, alergia ou intolerância?", tipo: "textoLongo", largo: true },
      { id: "ali_intestino", rotulo: "Como considera o seu fluxo intestinal?", tipo: "opcoes", opcoes: ESCALA_5_M, largo: true },
      { id: "ali_bristol", rotulo: "Escala de Bristol: qual número melhor caracteriza as fezes?", tipo: "opcoes", opcoes: BRISTOL, largo: true },
    ],
  },
  {
    id: "recordatorio",
    titulo: "Recordatório alimentar de 24 horas",
    descricao: "Tudo o que come em um dia normal da rotina, com o máximo de detalhes de quantidades. Balas, chicletes e beliscos também.",
    campos: REFEICOES.flatMap((r) => [
      { id: `rec_${r.id}_hora`, rotulo: `${r.nome}: horário`, tipo: "hora" as const, dica: r.hora },
      { id: `rec_${r.id}_local`, rotulo: `${r.nome}: local`, tipo: "texto" as const },
      { id: `rec_${r.id}`, rotulo: `${r.nome}: o que come`, tipo: "textoLongo" as const, largo: true },
    ]).concat([{ id: "rec_obs", rotulo: "Observações adicionais", tipo: "textoLongo", largo: true }]),
  },
  {
    id: "medico",
    titulo: "Histórico médico",
    campos: [
      { id: "med_familia", rotulo: "Histórico de condição clínica na família? (câncer, diabetes, hipertensão, colesterol...)", tipo: "textoLongo", largo: true },
      { id: "med_cirurgias", rotulo: "Já passou por alguma cirurgia? Qual?", tipo: "texto", largo: true },
      { id: "med_medicamentos", rotulo: "Toma medicamentos regularmente? Quais?", tipo: "textoLongo", largo: true },
      { id: "med_condicoes", rotulo: "Possui alguma condição médica diagnosticada?", tipo: "textoLongo", largo: true },
      { id: "med_deficiencias", rotulo: "Deficiência de vitaminas ou minerais? Faz reposição?", tipo: "textoLongo", largo: true },
      { id: "med_obs", rotulo: "Observações adicionais", tipo: "textoLongo", largo: true },
    ],
  },
  {
    id: "livre",
    titulo: "Espaço livre",
    descricao: "Qualquer coisa relacionada ao acompanhamento.",
    campos: [{ id: "espaco_livre", rotulo: "Espaço livre", tipo: "textoLongo", largo: true }],
  },
];
