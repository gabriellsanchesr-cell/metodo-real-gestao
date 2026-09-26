import { useMemo, useState } from "react";
import { Search, X, Wheat, Drumstick, Droplets, Info, ArrowRightLeft, Utensils } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CATEGORIAS, LISTA_ALIMENTOS, buscarAlimentos, formatarGramas, gramasPara, kcalEm,
  agruparDoPlano, refeicoesDoPlano,
  type Alimento, type CategoriaSubstituicao, type ItemDoPlano,
} from "@/lib/substituicoes";

const ICONES: Record<CategoriaSubstituicao, typeof Wheat> = {
  carboidrato: Wheat,
  proteina: Drumstick,
  gordura: Droplets,
};

/** Campo numérico que aceita ficar vazio enquanto a paciente digita. */
function lerNumero(texto: string): number {
  const n = parseFloat(texto.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Descarta letras coladas ou digitadas por engano; mantém vírgula decimal. */
function soNumero(texto: string): string {
  return texto.replace(/[^\d.,]/g, "").slice(0, 6);
}

interface Props {
  /** Alimentos do plano ativo, que aparecem prontos no topo para ela não precisar buscar. */
  itensPlano?: ItemDoPlano[];
  /** No painel do nutri o título já vem do cabeçalho da página. */
  semTitulo?: boolean;
}

export function PortalSubstituicoes({ itensPlano = [], semTitulo = false }: Props) {
  const [categoria, setCategoria] = useState<CategoriaSubstituicao>(
    () => itensPlano[0]?.categoria ?? "carboidrato",
  );
  const [busca, setBusca] = useState("");
  const [base, setBase] = useState<Alimento | null>(null);
  const [gramasTexto, setGramasTexto] = useState("100");
  const [kcalTexto, setKcalTexto] = useState("100");
  /** Filtro opcional: null mostra todas as refeições, cada alimento uma vez. */
  const [refeicao, setRefeicao] = useState<string | null>(null);

  const kcal = base ? kcalEm(base.kcal100g, lerNumero(gramasTexto)) : lerNumero(kcalTexto);

  const lista = useMemo(
    () => buscarAlimentos(LISTA_ALIMENTOS.filter((a) => a.categoria === categoria), busca)
      .filter((a) => a.id !== base?.id),
    [categoria, busca, base],
  );

  const refeicoes = useMemo(() => refeicoesDoPlano(itensPlano), [itensPlano]);
  const doPlano = useMemo(() => agruparDoPlano(itensPlano, categoria, refeicao), [itensPlano, categoria, refeicao]);
  const contagemPlano = (c: CategoriaSubstituicao) => agruparDoPlano(itensPlano, c, refeicao).length;

  const escolherDoPlano = (i: ItemDoPlano) => {
    const g = i.gramas ?? (kcal > 0 ? gramasPara(i.kcal100g, kcal) : 100);
    setBase(i);
    setGramasTexto(String(Math.round(g)));
    setBusca("");
  };

  const trocarCategoria = (c: CategoriaSubstituicao) => {
    setCategoria(c);
    setBusca("");
    setBase(null);
  };

  const escolherBase = (a: Alimento) => {
    // Mantém as calorias atuais: a paciente só troca o ponto de partida.
    const g = kcal > 0 ? gramasPara(a.kcal100g, kcal) : 100;
    setBase(a);
    setGramasTexto(String(Math.round(g)));
    setBusca("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const limparBase = () => {
    if (kcal > 0) setKcalTexto(String(Math.round(kcal)));
    setBase(null);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {!semTitulo && <div>
        <h2 className="text-lg font-semibold text-foreground">Substituições</h2>
        <p className="text-sm text-muted-foreground">
          Troque um alimento do seu plano por outro do mesmo grupo, mantendo as calorias.
        </p>
      </div>}

      {/* Grupo */}
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1" role="tablist">
        {CATEGORIAS.map((c) => {
          const Icone = ICONES[c.id];
          const ativo = c.id === categoria;
          return (
            <button
              key={c.id}
              role="tab"
              aria-selected={ativo}
              onClick={() => trocarCategoria(c.id)}
              className={cn(
                "flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-xs font-medium transition-colors",
                ativo ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
              )}
            >
              <Icone className="h-4 w-4 shrink-0" />
              {c.rotulo}
              {contagemPlano(c.id) > 0 && (
                <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", ativo ? "bg-primary/10" : "bg-background/60")}>
                  {contagemPlano(c.id)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Ponto de partida */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        {base ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Trocar</p>
                <p className="mt-0.5 text-sm font-semibold leading-snug text-foreground first-letter:uppercase">{base.nome}</p>
              </div>
              <Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-9 w-9 shrink-0 rounded-xl" onClick={limparBase} aria-label="Trocar alimento de partida">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Input
                type="text"
                inputMode="decimal"
                value={gramasTexto}
                onChange={(e) => setGramasTexto(soNumero(e.target.value))}
                className="h-11 w-24 rounded-xl bg-card text-center text-base font-semibold"
                aria-label="Quantidade em gramas"
              />
              <span className="text-sm text-muted-foreground">g</span>
              <span className="ml-auto text-sm font-medium text-foreground tabular-nums">
                {Math.round(kcal)} kcal
              </span>
            </div>
          </>
        ) : (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Quantas calorias trocar</p>
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="text"
                inputMode="decimal"
                value={kcalTexto}
                onChange={(e) => setKcalTexto(soNumero(e.target.value))}
                className="h-11 w-24 rounded-xl bg-card text-center text-base font-semibold"
                aria-label="Calorias"
              />
              <span className="text-sm text-muted-foreground">kcal</span>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
              <ArrowRightLeft className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {itensPlano.length > 0
                ? "Ou toque em um alimento do seu plano, logo abaixo, para partir da quantidade dele."
                : "Ou busque o alimento do seu plano e toque nele para partir da quantidade em gramas."}
            </p>
          </>
        )}
      </div>

      {/* Do plano: já prontos, sem precisar buscar */}
      {itensPlano.length > 0 && !busca.trim() && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Utensils className="h-3.5 w-3.5" /> Do seu plano
          </h3>

          {/* Refeição: escolha opcional, só filtra */}
          {refeicoes.length > 1 && (
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {[null, ...refeicoes].map((r) => {
                const ativa = r === refeicao;
                return (
                  <button
                    key={r ?? "todas"}
                    onClick={() => setRefeicao(r)}
                    className={cn(
                      "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      ativa ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {r ?? "Todas"}
                  </button>
                );
              })}
            </div>
          )}

          {doPlano.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhum alimento deste grupo {refeicao ? "nesta refeição" : "no seu plano"}.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {doPlano.map(({ item, refeicoes: onde, gramasVariam }) => {
                const escolhido = base?.id === item.id;
                const gramas = item.gramas && !gramasVariam ? formatarGramas(item.gramas) : null;
                // Com refeição escolhida o nome dela já está no filtro.
                const refeicoesTexto = refeicao ? null : onde.join(", ");
                return (
                  <button
                    key={item.id}
                    onClick={() => escolherDoPlano(item)}
                    className={cn(
                      "flex max-w-full flex-col items-start rounded-xl border px-3 py-2 text-left transition-colors active:bg-muted",
                      escolhido ? "border-primary bg-primary/5" : "border-border bg-card",
                    )}
                  >
                    <span className="line-clamp-1 text-sm font-medium text-foreground first-letter:uppercase">{item.nome}</span>
                    {(gramas || refeicoesTexto || gramasVariam) && (
                      <span className="line-clamp-1 text-[11px] text-muted-foreground">
                        {[gramas ?? (gramasVariam ? "quantidades variam" : null), refeicoesTexto].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar alimento"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-11 rounded-xl pl-10"
        />
      </div>

      {/* Equivalências */}
      {kcal <= 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Informe uma quantidade para ver as trocas.</p>
      ) : lista.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum alimento encontrado.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {lista.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => escolherBase(a)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors active:bg-muted"
              >
                <span className="min-w-0 text-sm leading-snug text-foreground">{a.nome}</span>
                <span className="shrink-0 text-base font-semibold text-primary tabular-nums">
                  {formatarGramas(gramasPara(a.kcal100g, kcal))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-start gap-2 rounded-2xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          A troca mantém as calorias, mas proteína, fibras e saciedade podem mudar entre um alimento e outro.
          Os pesos são do alimento no estado indicado (cru, cozido, grelhado). Valores da Tabela TACO.
          Na dúvida, fale com seu nutri pelas Mensagens.
        </p>
      </div>
    </div>
  );
}
