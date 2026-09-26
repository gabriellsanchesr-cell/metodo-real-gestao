// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

/**
 * O modelo às vezes devolve um "correspondente" que não está na lista, ou
 * com a grafia levemente diferente. Só aceita o nome exato; o resto vira null.
 */
function limparAlimentos(bruto: unknown, catalogo: string[], num: (v: unknown) => number | null) {
  if (!Array.isArray(bruto) || !catalogo.length) return [];
  const validos = new Set(catalogo);
  const texto = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  return bruto
    .map((a: Record<string, unknown> | null) => {
      const nome = texto(a?.nome, 120);
      if (!nome) return null;
      const g = num(a?.quantidade_g);
      const corr = texto(a?.correspondente, 120);
      return {
        nome,
        quantidade_g: g && g > 0 && g < 2000 ? g : null,
        refeicao: texto(a?.refeicao, 60),
        correspondente: corr && validos.has(corr) ? corr : null,
      };
    })
    .filter(Boolean)
    .slice(0, 120);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { fileBase64, mimeType, catalogo: catalogoBruto } = await req.json();
    // Lista de alimentos da calculadora de substituições do portal. Opcional:
    // sem ela, a função devolve só os totais, como antes.
    const catalogo: string[] = Array.isArray(catalogoBruto)
      ? catalogoBruto.filter((n: unknown) => typeof n === 'string' && n.length < 120).slice(0, 400)
      : [];
    if (!fileBase64) {
      return new Response(JSON.stringify({ error: 'fileBase64 obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY ausente' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dataUrl = `data:${mimeType || 'application/pdf'};base64,${fileBase64}`;

    const systemPrompt = `Você lê PDFs de planos alimentares e extrai APENAS os totais nutricionais do dia (1 dia inteiro do plano).

Retorne SOMENTE JSON válido neste formato exato:
{
  "kcal": number | null,
  "proteina_g": number | null,
  "carboidrato_g": number | null,
  "gordura_g": number | null,
  "fibra_g": number | null,
  "refeicoes_estimadas": number | null,
  "observacoes": string | null,
  "alimentos": [{ "nome": string, "quantidade_g": number | null, "refeicao": string | null, "correspondente": string | null }]
}

REGRAS:
- Procure por linhas/tabelas com totais diários (ex: "Total do dia", "Totais", "Resumo nutricional", "VET", "Valor Energético Total").
- Se houver várias opções (A/B/C) por refeição, considere apenas a OPÇÃO A para calcular o total — se o documento já trouxer um total único, use-o.
- NÃO invente valores. Se algum campo não existir no PDF, retorne null naquele campo.
- Unidades: kcal em kcal, macros em gramas. Converta vírgula para ponto.
- "refeicoes_estimadas" = quantas refeições (café, lanche, almoço, etc) o plano tem.
- "observacoes": curta nota (até 200 chars) explicando de onde extraiu (ex: "Totais retirados da seção 'Resumo Nutricional' na última página"). Use null se nada notável.
${catalogo.length ? `
ALIMENTOS (lista "alimentos"):
- Liste cada alimento que aparece no plano, de todas as refeições e opções, uma vez por refeição.
- "nome": o nome como está no PDF, em minúsculo, sem quantidade (ex.: "arroz branco", "pão francês").
- "quantidade_g": a quantidade em gramas ou ml, se o PDF trouxer. Converta medidas caseiras só quando o PDF der o peso; senão null.
- "refeicao": o nome da refeição (ex.: "Café da manhã", "Almoço").
- "correspondente": o nome EXATO, copiado letra por letra, do item mais parecido da LISTA abaixo, respeitando o preparo (cru, cozido, grelhado). Se nenhum item for claramente o mesmo alimento, use null. Não force: verduras, legumes, temperos, bebidas sem caloria e preparações compostas quase sempre ficam null.
- NÃO inclua substituições sugeridas pelo PDF como alimentos do plano.

LISTA:
${catalogo.join('\n')}` : ''}`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: [
            { type: 'text', text: catalogo.length
              ? 'Extraia os totais nutricionais diários e a lista de alimentos deste plano alimentar.'
              : 'Extraia os totais nutricionais diários deste plano alimentar.' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ] },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: 'Limite de uso da IA atingido. Tente novamente em instantes.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: 'Créditos de IA esgotados.' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error('AI gateway error', aiRes.status, txt);
      return new Response(JSON.stringify({ error: 'Falha ao processar com IA', detail: txt }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? '{}';
    let parsed: any = {};
    try {
      parsed = typeof content === 'string' ? JSON.parse(content) : content;
    } catch {
      parsed = {};
    }

    const num = (v: any) => {
      if (v === null || v === undefined || v === '') return null;
      const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.,-]/g, '').replace(',', '.'));
      return isNaN(n) ? null : n;
    };

    const totals = {
      kcal: num(parsed.kcal),
      proteina_g: num(parsed.proteina_g),
      carboidrato_g: num(parsed.carboidrato_g),
      gordura_g: num(parsed.gordura_g),
      fibra_g: num(parsed.fibra_g),
      refeicoes_estimadas: num(parsed.refeicoes_estimadas),
      observacoes: typeof parsed.observacoes === 'string' ? parsed.observacoes.slice(0, 240) : null,
      alimentos: limparAlimentos(parsed.alimentos, catalogo, num),
    };

    return new Response(JSON.stringify(totals), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('parse-plano-pdf-totais error', e);
    return new Response(JSON.stringify({ error: e?.message || 'Erro inesperado' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
