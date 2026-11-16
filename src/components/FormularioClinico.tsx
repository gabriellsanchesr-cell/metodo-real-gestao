import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { type Campo, type Respostas, type Secao, valorLegivel, vazio } from "@/lib/formularios";

const COR_NOTA = ["", "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-lime-500", "bg-emerald-500"];

interface EdicaoProps {
  secoes: Secao[];
  valores: Respostas;
  onChange: (id: string, valor: Respostas[string]) => void;
}

function CampoEdicao({ c, valor, onChange }: { c: Campo; valor: Respostas[string]; onChange: (v: Respostas[string]) => void }) {
  const id = `campo-${c.id}`;
  const rotulo = <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">{c.rotulo}</Label>;

  if (c.tipo === "nota") {
    return (
      <div className="space-y-1.5">
        {rotulo}
        <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={c.rotulo}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={Number(valor) === n}
              onClick={() => onChange(Number(valor) === n ? null : n)}
              className={`h-9 rounded-lg border text-sm font-semibold transition-colors ${
                Number(valor) === n ? `${COR_NOTA[n]} border-transparent text-white` : "bg-background hover:bg-muted"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        {(c.ruim || c.bom) && (
          <div className="flex justify-between gap-2 text-[10px] text-muted-foreground"><span>1 · {c.ruim}</span><span className="text-right">5 · {c.bom}</span></div>
        )}
      </div>
    );
  }

  if (c.tipo === "opcoes" || c.tipo === "simnao") {
    const opcoes = c.tipo === "simnao" ? ["Sim", "Não"] : c.opcoes ?? [];
    const atual = c.tipo === "simnao" ? (valor === true ? "Sim" : valor === false ? "Não" : "") : String(valor ?? "");
    return (
      <div className="space-y-1.5">
        {rotulo}
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={c.rotulo}>
          {opcoes.map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={atual === o}
              onClick={() => onChange(atual === o ? null : c.tipo === "simnao" ? o === "Sim" : o)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                atual === o ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (c.tipo === "textoLongo") {
    return (
      <div className="space-y-1.5">
        {rotulo}
        <Textarea id={id} rows={3} placeholder={c.dica} value={String(valor ?? "")} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {rotulo}
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type={c.tipo === "hora" ? "time" : "text"}
          inputMode={c.tipo === "numero" ? "decimal" : undefined}
          placeholder={c.dica}
          value={String(valor ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className={c.tipo === "numero" || c.tipo === "hora" ? "max-w-[140px]" : ""}
        />
        {c.unidade && <span className="text-xs text-muted-foreground">{c.unidade}</span>}
      </div>
    </div>
  );
}

/** Preenchimento: uma seção por cartão, campos em duas colunas no computador. */
export function FormularioClinicoEdicao({ secoes, valores, onChange }: EdicaoProps) {
  return (
    <div className="space-y-4">
      {secoes.map((s) => (
        <Card key={s.id} id={`secao-${s.id}`} className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{s.titulo}</CardTitle>
            {s.descricao && <p className="text-xs text-muted-foreground">{s.descricao}</p>}
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {s.campos.map((c) => (
              <div key={c.id} className={c.largo || c.tipo === "textoLongo" ? "sm:col-span-2" : ""}>
                <CampoEdicao c={c} valor={valores[c.id]} onChange={(v) => onChange(c.id, v)} />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Leitura: só o que foi respondido. Notas viram barrinhas coloridas. */
export function FormularioClinicoLeitura({ secoes, valores }: { secoes: Secao[]; valores: Respostas }) {
  const comResposta = secoes.filter((s) => s.campos.some((c) => !vazio(valores[c.id])));
  if (!comResposta.length) return <p className="text-sm text-muted-foreground">Nada preenchido.</p>;
  return (
    <div className="space-y-4">
      {comResposta.map((s) => (
        <Card key={s.id} className="rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-muted-foreground">{s.titulo}</CardTitle></CardHeader>
          <CardContent className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {s.campos.filter((c) => !vazio(valores[c.id])).map((c) => {
              const v = valores[c.id];
              const largo = c.largo || c.tipo === "textoLongo";
              return (
                <div key={c.id} className={largo ? "sm:col-span-2" : ""}>
                  <p className="text-xs text-muted-foreground">{c.rotulo}</p>
                  {c.tipo === "nota" ? (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex flex-1 gap-1" aria-hidden>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= Number(v) ? COR_NOTA[Number(v)] : "bg-muted"}`} />
                        ))}
                      </div>
                      <span className="text-xs font-semibold tabular-nums">{String(v)}/5</span>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm text-foreground">{valorLegivel(c, v)}</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
