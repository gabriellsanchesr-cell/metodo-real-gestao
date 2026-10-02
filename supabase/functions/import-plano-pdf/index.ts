import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TIPOS_VALIDOS = [
  "cafe_da_manha",
  "lanche_da_manha",
  "almoco",
  "lanche_da_tarde",
  "jantar",
  "ceia",
];

const SYSTEM_PROMPT = `Você é um extrator EXPERT de planos alimentares em PDF (português brasileiro) feitos por nutricionistas, incluindo formatos WebDiet, Dietbox, Dietbox PRO, Dietsmart, Excel exportado e planos manuscritos digitalizados.

OBJETIVO: devolver o plano EM ESTRUTURA EDITÁVEL — refeição por refeição, opção por opção, alimento por alimento — como se um humano o tivesse digitado dentro de um editor. NUNCA devolva um bloco de texto inteiro em "nome".

REGRAS DE EXTRAÇÃO:
1) Identifique cada refeição usando títulos comuns: "Café da manhã", "Desjejum", "Colação", "Lanche da manhã", "Almoço", "Lanche da tarde", "Pré-treino", "Pós-treino", "Jantar", "Ceia", "Suplementação", ou nomes livres definidos pelo nutricionista. Use o nome EXATO do PDF em "nome".
2) Extraia o horário (HH:MM ou "07h", "13h30") em "horario" no formato HH:MM. Se houver intervalo, use o início.
3) Mapeie tipo_sugerido para o enum mais próximo do nome.
4) OPÇÕES (Opção A, B, C, "Opção 1", "Alternativa", repetições da mesma refeição): cada opção vira um item em "opcoes" com sua própria lista de alimentos. NÃO some opções juntas. NÃO inclua substituições como opções.
5) ALIMENTOS — cada linha vira um item separado em "alimentos":
   • Quebre por linha, por "+", por bullet, por número, por ponto-e-vírgula. Nunca junte vários alimentos em um único item.
   • "nome": SOMENTE o nome do alimento, em minúsculo, sem quantidade, sem medida, sem parênteses. Ex.: "arroz integral", "frango grelhado", "banana prata".
   • "nota": texto entre parênteses ou descritor secundário (preparo, marca, variedade).
   • "quantidade_g": número em GRAMAS ou ML. Converta: 1 fatia pão≈30g; 1 col sopa≈15g; 1 col chá≈5g; 1 xícara≈200ml; 1 un média maçã≈130g; 1 un média banana≈65g; 1 ovo≈50g; 1 clara≈33g; 1 copo≈200ml; 1 concha≈80g; 1 escumadeira≈45g.
   • Para "à vontade", "livre", "ad libitum": quantidade_g=100, medida_caseira="à vontade", precisa_revisao=true.
   • "medida_caseira": texto literal do PDF ("2 col sopa", "1 fatia (30g)", "100g", "1 xíc chá").
6) TOTAIS DA OPÇÃO: se o PDF mostra "507 kcal · P 40g · C 61g · G 12g" no cabeçalho/rodapé da opção, copie em kcal_opcao, prot_opcao_g, carb_opcao_g, gord_opcao_g. NÃO recalcule. Se não houver, deixe em branco.
7) SUBSTITUIÇÕES POR ITEM: se houver bloco "Substituições", "Trocas", "Pode trocar por", "Opção de troca" ligado a um alimento, preencha substituicoes_por_item: para cada alimento_base (use o mesmo "nome" que aparece em alimentos), liste alternativas com nome, quantidade_g, medida_caseira.
8) Observações da refeição (preparo, dicas, hidratação local) vão em observacoes da refeição. Observações gerais do plano (notas clínicas, lista de compras, hidratação diária) vão na raiz em observacoes.

PROIBIDO:
- Inventar alimentos que não estão no PDF.
- Trocar nome (NUNCA "maçã"→"macarrão", NUNCA "doce de leite"→"batata doce").
- Colocar parágrafos inteiros, observações, ou substituições dentro do campo "nome" do alimento.
- Repetir o mesmo alimento dentro da mesma opção (a menos que apareça duas vezes no PDF).
- Devolver "opcoes" vazio: se só há 1 opção, devolva opcoes=[{letra:"A", alimentos:[...]}].

Devolva APENAS JSON válido conforme o schema da tool salvar_plano.`;

interface AlimentoExtraido {
  nome: string;
  nota?: string;
  quantidade_g: number;
  medida_caseira: string;
  precisa_revisao?: boolean;
}

interface SubstituicaoItem {
  alimento_base: string;
  alternativas: AlimentoExtraido[];
}

interface OpcaoExtraida {
  letra: string;
  alimentos: AlimentoExtraido[];
  substituicoes_por_item?: SubstituicaoItem[];
  kcal_opcao?: number;
  prot_opcao_g?: number;
  carb_opcao_g?: number;
  gord_opcao_g?: number;
}

interface RefeicaoExtraida {
  nome: string;
  horario?: string;
  tipo_sugerido: string;
  ordem: number;
  observacoes?: string;
  opcoes: OpcaoExtraida[];
}

const ALIASES: Array<{ match: RegExp; tacoLike: string; precisaRevisao?: boolean }> = [
  { match: /^maca$/, tacoLike: "maca com casca" },
  { match: /^maca fuji$/, tacoLike: "maca fuji" },
  { match: /^banana( prata)?$/, tacoLike: "banana prata" },
  { match: /^ponca$/, tacoLike: "tangerina", precisaRevisao: true },
  { match: /^tangerina$/, tacoLike: "tangerina" },
  { match: /^carne magra/, tacoLike: "carne bovina patinho grelhado" },
  { match: /^patinho/, tacoLike: "carne bovina patinho grelhado" },
  { match: /^alcatra/, tacoLike: "carne bovina alcatra grelhada" },
  { match: /^carne moida/, tacoLike: "carne bovina acem cozido", precisaRevisao: true },
  { match: /^frango( grelhado| peito)?$/, tacoLike: "frango peito grelhado" },
  { match: /^tilapia( grelhada| cozida)?$/, tacoLike: "peixe tilapia cozida" },
  { match: /tilapia ou sardinha/, tacoLike: "peixe sardinha enlatada", precisaRevisao: true },
  { match: /^sardinha/, tacoLike: "peixe sardinha enlatada" },
  { match: /^atum/, tacoLike: "peixe atum em agua enlatado" },
  { match: /^salmao/, tacoLike: "peixe salmao grelhado" },
  { match: /^ovos? mexidos?$/, tacoLike: "ovo de galinha inteiro cozido" },
  { match: /^ovos?$/, tacoLike: "ovo de galinha inteiro cozido" },
  { match: /^claras?( de ovo)?$/, tacoLike: "ovo de galinha clara", precisaRevisao: true },
  { match: /^arroz( branco| cozido)?$/, tacoLike: "arroz cozido" },
  { match: /^arroz integral/, tacoLike: "arroz integral cozido" },
  { match: /^batata( inglesa)?( cozida)?$/, tacoLike: "batata inglesa cozida" },
  { match: /^batata[- ]doce( cozida)?$/, tacoLike: "batata-doce cozida" },
  { match: /^mandioca/, tacoLike: "mandioca cozida" },
  { match: /^inhame/, tacoLike: "inhame cozido" },
  { match: /^quinoa/, tacoLike: "quinoa" },
  { match: /^macarrao de arroz/, tacoLike: "macarrao de arroz", precisaRevisao: true },
  { match: /^macarrao( comum| trigo)?$/, tacoLike: "macarrao cozido" },
  { match: /^aveia/, tacoLike: "aveia flocos" },
  { match: /^tapioca( goma)?/, tacoLike: "tapioca" },
  { match: /^folhas e legumes/, tacoLike: "alface", precisaRevisao: true },
  { match: /iogurte.*(zero lactose|natural|desnatado)/, tacoLike: "iogurte natural desnatado" },
  { match: /^iogurte/, tacoLike: "iogurte natural integral" },
  { match: /^amendoas?$/, tacoLike: "amendoa", precisaRevisao: true },
  { match: /^amendoim/, tacoLike: "amendoim torrado" },
  { match: /^pasta de amendoim/, tacoLike: "pasta de amendoim" },
  { match: /^abacate/, tacoLike: "abacate" },
  { match: /^azeite/, tacoLike: "azeite oliva" },
  { match: /^molho de tomate/, tacoLike: "molho de tomate", precisaRevisao: true },
];

// Layout-preserving extraction: agrupa itens da página por linha (Y) e ordena por X.
// Resultado: cada página vira blocos de texto que aproximam a estrutura visual do PDF.
async function extractStructuredText(bytes: Uint8Array): Promise<string> {
  const pdf: any = await getDocumentProxy(bytes);
  const pageCount: number = pdf.numPages;
  const pagesOut: string[] = [];

  for (let p = 1; p <= pageCount; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items: Array<{ str: string; x: number; y: number; h: number }> = (content.items || [])
      .map((it: any) => ({
        str: String(it.str ?? ""),
        x: it.transform?.[4] ?? 0,
        y: it.transform?.[5] ?? 0,
        h: it.height ?? (it.transform?.[3] ?? 10),
      }))
      .filter((it: { str: string; x: number; y: number; h: number }) => it.str.length > 0);

    // Agrupa por linha usando tolerância baseada na altura média do texto
    const avgH = items.length ? items.reduce((s, i) => s + i.h, 0) / items.length : 10;
    const tol = Math.max(2.5, avgH * 0.6);
    const lines: Array<{ y: number; parts: typeof items }> = [];
    for (const it of items) {
      const line = lines.find((l) => Math.abs(l.y - it.y) <= tol);
      if (line) line.parts.push(it);
      else lines.push({ y: it.y, parts: [it] });
    }
    lines.sort((a, b) => b.y - a.y); // PDF: y cresce para cima

    const pageLines: string[] = [];
    for (const line of lines) {
      line.parts.sort((a, b) => a.x - b.x);
      // Reconstrói com espaços baseados no gap horizontal
      let prevEndX: number | null = null;
      let buf = "";
      for (const p of line.parts) {
        if (prevEndX !== null) {
          const gap = p.x - prevEndX;
          if (gap > avgH * 1.2) buf += "    "; // coluna nova
          else if (gap > avgH * 0.3 && !buf.endsWith(" ")) buf += " ";
        }
        buf += p.str;
        prevEndX = p.x + (p.str.length * avgH * 0.45);
      }
      const trimmed = buf.replace(/\s+$/g, "");
      if (trimmed.trim().length > 0) pageLines.push(trimmed);
    }
    pagesOut.push(`===== PÁGINA ${p} =====\n${pageLines.join("\n")}`);
  }
  return pagesOut.join("\n\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Não autenticado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return json({ error: "LOVABLE_API_KEY ausente" }, 500);

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Não autenticado" }, 401);

    const body = await req.json();
    const pacienteId: string | undefined = body?.paciente_id;
    const pdfBase64: string | undefined = body?.pdf_base64;
    const mode: string = body?.mode || "paciente";
    if (!pdfBase64) return json({ error: "pdf_base64 é obrigatório" }, 400);
    if (mode === "paciente" && !pacienteId) {
      return json({ error: "paciente_id é obrigatório no modo paciente" }, 400);
    }

    const binaryStr = atob(pdfBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    let pdfText = "";
    try {
      pdfText = (await extractStructuredText(bytes)).trim();
    } catch (e) {
      console.warn("PDF structured extraction failed:", e);
    }

    const MAX_CHARS = 80000;
    if (pdfText.length > MAX_CHARS) pdfText = pdfText.slice(0, MAX_CHARS);

    const isScannedOrEmpty = pdfText.length < 80;
    if (pdfBase64.length > 15 * 1024 * 1024) {
      return json({ error: "PDF muito grande (máx ~10 MB)." }, 413);
    }

    // Sempre envia o PDF como anexo multimodal junto com o texto estruturado,
    // para a IA poder olhar visualmente a estrutura (colunas, tabelas) e cruzar com o texto.
    const userContent: any[] = [
      {
        type: "text",
        text:
          (isScannedOrEmpty
            ? "Este PDF parece ser escaneado ou tem pouco texto extraível. Faça OCR pelo arquivo anexo e estruture o plano. "
            : "Abaixo está o texto extraído com layout aproximado (cada linha corresponde a uma linha visual do PDF). Use também o PDF anexo como referência visual para colunas e blocos. ") +
          "Devolva o JSON estruturado seguindo rigorosamente o schema, com cada alimento em um item separado.\n\n--- TEXTO ESTRUTURADO DO PDF ---\n" +
          (pdfText || "(vazio — use somente o PDF anexo)"),
      },
      {
        type: "image_url",
        image_url: { url: `data:application/pdf;base64,${pdfBase64}` },
      },
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "salvar_plano",
              description: "Salva o plano alimentar estruturado",
              parameters: {
                type: "object",
                properties: {
                  observacoes: { type: "string" },
                  refeicoes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nome: { type: "string" },
                        horario: { type: "string" },
                        tipo_sugerido: { type: "string", enum: TIPOS_VALIDOS },
                        ordem: { type: "number" },
                        observacoes: { type: "string" },
                        opcoes: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              letra: { type: "string" },
                              kcal_opcao: { type: "number" },
                              prot_opcao_g: { type: "number" },
                              carb_opcao_g: { type: "number" },
                              gord_opcao_g: { type: "number" },
                              alimentos: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: {
                                    nome: { type: "string" },
                                    nota: { type: "string" },
                                    quantidade_g: { type: "number" },
                                    medida_caseira: { type: "string" },
                                    precisa_revisao: { type: "boolean" },
                                  },
                                  required: ["nome", "quantidade_g", "medida_caseira"],
                                },
                              },
                              substituicoes_por_item: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: {
                                    alimento_base: { type: "string" },
                                    alternativas: {
                                      type: "array",
                                      items: {
                                        type: "object",
                                        properties: {
                                          nome: { type: "string" },
                                          nota: { type: "string" },
                                          quantidade_g: { type: "number" },
                                          medida_caseira: { type: "string" },
                                        },
                                        required: ["nome", "quantidade_g", "medida_caseira"],
                                      },
                                    },
                                  },
                                  required: ["alimento_base", "alternativas"],
                                },
                              },
                            },
                            required: ["letra", "alimentos"],
                          },
                        },
                      },
                      required: ["nome", "tipo_sugerido", "ordem", "opcoes"],
                    },
                  },
                },
                required: ["refeicoes"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "salvar_plano" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      if (aiResp.status === 429) return json({ error: "Muitas requisições. Tente novamente em instantes." }, 429);
      if (aiResp.status === 402) return json({ error: "Créditos de IA esgotados no workspace Lovable." }, 402);
      return json({ error: "Erro ao chamar IA" }, 500);
    }

    const aiJson = await aiResp.json();
    const message = aiJson?.choices?.[0]?.message;
    const toolCall = message?.tool_calls?.[0];
    let rawArgs: string | undefined = toolCall?.function?.arguments;
    if (!rawArgs && typeof message?.content === "string") {
      const m = message.content.match(/\{[\s\S]*\}/);
      if (m) rawArgs = m[0];
    }
    if (!rawArgs) {
      console.error("No tool call/JSON:", JSON.stringify(aiJson).slice(0, 800));
      return json({ error: "IA não devolveu estrutura válida" }, 500);
    }
    let parsed: { observacoes?: string; refeicoes: RefeicaoExtraida[] };
    try {
      parsed = JSON.parse(rawArgs);
    } catch {
      return json({ error: "Resposta da IA inválida (JSON)" }, 500);
    }
    if (!Array.isArray(parsed.refeicoes) || parsed.refeicoes.length === 0) {
      return json({ error: "Nenhuma refeição identificada no PDF." }, 422);
    }

    const num = (v: any): number | undefined => {
      if (v == null) return undefined;
      if (typeof v === "number" && isFinite(v)) return v;
      const s = String(v).replace(",", ".").match(/-?\d+(\.\d+)?/);
      return s ? parseFloat(s[0]) : undefined;
    };

    // Fallback: varre o texto do PDF capturando padrões "507 kcal · P 40 · C 61 · G 12"
    const pdfTotalsQueue: Array<{ kcal: number; p?: number; c?: number; g?: number }> = [];
    if (pdfText) {
      const re = /(\d{2,4})\s*kcal[^\n]{0,80}?P[^\d]{0,4}(\d{1,3})[^\n]{0,20}?C[^\d]{0,4}(\d{1,3})[^\n]{0,20}?G[^\d]{0,4}(\d{1,3})/gi;
      let mm: RegExpExecArray | null;
      while ((mm = re.exec(pdfText)) !== null) {
        pdfTotalsQueue.push({
          kcal: parseInt(mm[1], 10),
          p: parseInt(mm[2], 10),
          c: parseInt(mm[3], 10),
          g: parseInt(mm[4], 10),
        });
      }
    }
    let pdfTotalsIdx = 0;
    const nextPdfTotal = () => pdfTotalsQueue[pdfTotalsIdx++];

    const admin = createClient(supabaseUrl, supabaseService);
    const { data: tacoAll } = await admin
      .from("alimentos_taco")
      .select("id, nome, energia_kcal, proteina_g, carboidrato_g, lipidio_g, fibra_g");

    const normalize = (s: string) =>
      (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\([^)]*\)/g, " ")
        .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

    const tacoIndex = (tacoAll || []).map((t) => ({ ...t, norm: normalize(t.nome) }));

    function matchTacoByText(text: string) {
      const n = normalize(text);
      if (!n) return null;
      let m = tacoIndex.find((t) => t.norm === n);
      if (m) return m;
      const tokens = n.split(" ").filter((w) => w.length >= 4);
      if (tokens.length === 0) return null;
      const candidates = tacoIndex.filter((t) =>
        tokens.every((tok) => new RegExp(`(^|\\s)${tok}`).test(t.norm))
      );
      if (candidates.length > 0) {
        candidates.sort((a, b) => a.norm.length - b.norm.length);
        return candidates[0];
      }
      return null;
    }

    function findTaco(nome: string, nota?: string) {
      const n = normalize(nome);
      if (!n) return { taco: null, precisaRevisao: false };
      for (const alias of ALIASES) {
        if (alias.match.test(n)) {
          const t = matchTacoByText(alias.tacoLike);
          if (t) return { taco: t, precisaRevisao: !!alias.precisaRevisao };
        }
      }
      let t = matchTacoByText(n);
      if (t) return { taco: t, precisaRevisao: false };
      if (nota) {
        t = matchTacoByText(`${n} ${normalize(nota)}`);
        if (t) return { taco: t, precisaRevisao: false };
        t = matchTacoByText(normalize(nota));
        if (t) return { taco: t, precisaRevisao: false };
      }
      return { taco: null, precisaRevisao: true };
    }

    // Sanitiza alimentos vindos da IA: separa quando vier vários colados num único "nome",
    // remove ruídos óbvios, trunca nomes monstro.
    function splitIfMultiple(a: AlimentoExtraido): AlimentoExtraido[] {
      const raw = (a.nome || "").trim();
      if (!raw) return [];
      // Se o nome for absurdamente longo (> 90 chars) ou contiver múltiplos verbos típicos, tenta quebrar
      if (raw.length > 90 || /(?:\s\+\s|\s;\s|\sou\s)/i.test(raw)) {
        const parts = raw.split(/\s*\+\s*|\s*;\s*|\s+ou\s+/i).map((s) => s.trim()).filter(Boolean);
        if (parts.length > 1) {
          return parts.map((p) => ({
            ...a,
            nome: p,
            precisa_revisao: true,
          }));
        }
      }
      return [a];
    }

    function enrichAlimento(a: AlimentoExtraido) {
      const { taco, precisaRevisao } = findTaco(a.nome, a.nota);
      const qty = num(a.quantidade_g) ?? 100;
      const cleanName = (a.nome || "").trim().replace(/\s+/g, " ");
      const displayName = a.nota ? `${cleanName} (${a.nota})` : cleanName;
      if (taco) {
        const ratio = qty / 100;
        return {
          nome_alimento: displayName,
          quantidade: qty,
          medida_caseira: a.medida_caseira || "1 porção",
          energia_kcal: Number(taco.energia_kcal) * ratio,
          proteina_g: Number(taco.proteina_g) * ratio,
          carboidrato_g: Number(taco.carboidrato_g) * ratio,
          lipidio_g: Number(taco.lipidio_g) * ratio,
          fibra_g: Number(taco.fibra_g) * ratio,
          alimento_taco_id: taco.id,
          precisa_revisao: !!a.precisa_revisao || precisaRevisao,
        };
      }
      return {
        nome_alimento: displayName,
        quantidade: qty,
        medida_caseira: a.medida_caseira || "1 porção",
        energia_kcal: 0, proteina_g: 0, carboidrato_g: 0, lipidio_g: 0, fibra_g: 0,
        alimento_taco_id: null,
        precisa_revisao: true,
      };
    }

    let totalAlimentos = 0;
    let totalOpcoes = 0;
    let totalSubs = 0;
    let totalRevisao = 0;

    const refeicoesEnriquecidas = parsed.refeicoes.map((r, i) => {
      const tipo = TIPOS_VALIDOS.includes(r.tipo_sugerido) ? r.tipo_sugerido : "lanche_da_manha";
      const opcoesRaw = (r.opcoes || []).length ? r.opcoes : [{ letra: "A", alimentos: [] } as OpcaoExtraida];
      const opcoes = opcoesRaw.map((op, j) => {
        totalOpcoes++;
        const rawAls = (op.alimentos || []).flatMap(splitIfMultiple);
        const alimentos = rawAls.map(enrichAlimento);
        const subsMap = new Map<string, AlimentoExtraido[]>();
        for (const s of op.substituicoes_por_item || []) {
          const key = normalize(s.alimento_base);
          if (!key) continue;
          subsMap.set(key, s.alternativas || []);
        }
        const alimentosComSubs = alimentos.map((a, idx) => {
          const aNorm = normalize(a.nome_alimento);
          let alts: AlimentoExtraido[] | undefined = subsMap.get(aNorm);
          if (!alts) {
            const baseToken = aNorm.split(" ")[0];
            for (const [k, v] of subsMap.entries()) {
              if (baseToken.length >= 4 && (k === baseToken || k.startsWith(baseToken + " "))) {
                alts = v;
                break;
              }
            }
          }
          const substituicoes = (alts || []).map((alt, k) => {
            const enriched = enrichAlimento(alt);
            totalSubs++;
            return {
              nome: enriched.nome_alimento,
              quantidade: enriched.quantidade,
              medida_caseira: enriched.medida_caseira,
              alimento_taco_id: enriched.alimento_taco_id,
              ordem: k,
            };
          });
          totalAlimentos++;
          if (a.precisa_revisao) totalRevisao++;
          return { ...a, ordem: idx, substituicoes };
        });
        let kcalOp = num(op.kcal_opcao);
        let pOp = num(op.prot_opcao_g);
        let cOp = num(op.carb_opcao_g);
        let gOp = num(op.gord_opcao_g);
        if (kcalOp == null) {
          const pdfTot = nextPdfTotal();
          if (pdfTot) {
            kcalOp = pdfTot.kcal;
            pOp = pOp ?? pdfTot.p;
            cOp = cOp ?? pdfTot.c;
            gOp = gOp ?? pdfTot.g;
          }
        }
        return {
          letra: op.letra || String.fromCharCode(65 + j),
          alimentos: alimentosComSubs,
          kcal_opcao: kcalOp,
          prot_opcao_g: pOp,
          carb_opcao_g: cOp,
          gord_opcao_g: gOp,
        };
      });
      return {
        nome: r.nome || "",
        horario: r.horario || "",
        tipo,
        ordem: r.ordem || i + 1,
        observacoes: r.observacoes || "",
        opcoes,
      };
    });

    return json({
      observacoes: parsed.observacoes || "",
      refeicoes: refeicoesEnriquecidas,
      stats: {
        refeicoes: refeicoesEnriquecidas.length,
        opcoes: totalOpcoes,
        alimentos: totalAlimentos,
        substituicoes: totalSubs,
        precisam_revisao: totalRevisao,
        texto_extraido_chars: pdfText.length,
      },
    });
  } catch (e) {
    console.error("import-plano-pdf error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
