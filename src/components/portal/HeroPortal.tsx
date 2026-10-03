import type { LucideIcon } from "lucide-react";
import { Ring, usePrefersReducedMotion } from "@/components/motion";
import { cn } from "@/lib/utils";

/** Frases-núcleo da marca, neutras em gênero (o portal tem homens também); uma por dia. */
const FRASES = [
  "Sua nutrição precisa caber na sua vida real.",
  "Objetivos diferentes. Estratégias diferentes.",
  "Fechar a boca nunca funcionou. Abrir a consciência, sim.",
  "Leveza também se aprende.",
  "Constância vale mais que perfeição.",
  "Corpo, comportamento e rotina andam juntos.",
  "Um dia fora do plano não apaga a semana.",
];

export function fraseDoDia(hoje = new Date()): string {
  const inicio = new Date(hoje.getFullYear(), 0, 0).getTime();
  const dia = Math.floor((hoje.getTime() - inicio) / 86400000);
  return FRASES[dia % FRASES.length];
}

interface Props {
  saudacao: string;
  IconeSaudacao: LucideIcon;
  nome: string;
  /** Dias com diário nesta semana (0 a 7). */
  diasSemana: number;
  sequencia: number;
}

/**
 * Topo do portal, no mesmo desenho do topo do plano HTML v4: azul profundo
 * para navy, brilhos se movendo devagar, a marca ao fundo e o nome entrando
 * palavra por palavra. O anel mostra os dias de diário da semana.
 */
export function HeroPortal({ saudacao, IconeSaudacao, nome, diasSemana, sequencia }: Props) {
  const reduz = usePrefersReducedMotion();
  const anima = !reduz;
  return (
    <div className="relative isolate overflow-hidden rounded-3xl bg-[linear-gradient(155deg,#0050bd_0%,#003b8e_36%,#0a1f45_70%,#06101f_100%)] px-5 pb-5 pt-5 text-white shadow-[0_24px_60px_-28px_rgba(0,44,120,.75)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <i className={cn("absolute -left-[35%] -top-[55%] aspect-square w-[95%] rounded-full bg-[radial-gradient(circle,rgba(40,130,255,.7)_0%,rgba(0,98,224,.25)_40%,transparent_66%)]", anima && "animate-drift-1")} />
        <i className={cn("absolute -bottom-[60%] -right-[30%] aspect-square w-[80%] rounded-full bg-[radial-gradient(circle,rgba(0,98,224,.65)_0%,transparent_64%)]", anima && "animate-drift-2")} />
        <i className="absolute -top-[30%] right-[6%] aspect-square w-[42%] rounded-full bg-[radial-gradient(circle,rgba(184,151,58,.38)_0%,transparent_66%)]" />
        <img src="/logo-branco.png" alt="" className={cn("absolute -bottom-[22%] -right-[8%] w-[48%] max-w-[220px] opacity-[.07]", anima && "animate-float-mark")} />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[.2em] text-[#d8b960]">
            <IconeSaudacao className="h-3.5 w-3.5" /> {saudacao}
          </p>
          <h2 className="mt-2 text-[32px] font-light leading-[1.05] tracking-tight">
            {nome.split(" ").map((p, i) => (
              <span key={i} className="inline-block overflow-hidden pb-1 align-bottom">
                <span
                  className={cn("inline-block", anima && "animate-in slide-in-from-bottom-full fill-mode-both duration-1000")}
                  style={anima ? { animationDelay: `${120 + i * 90}ms` } : undefined}
                >
                  {p}&nbsp;
                </span>
              </span>
            ))}
          </h2>
          <p className={cn("mt-2 max-w-[22rem] text-[13px] leading-snug text-white/80", anima && "animate-in fade-in fill-mode-both delay-500 duration-1000")}>
            {fraseDoDia()}
          </p>
        </div>

        <Ring
          fatias={[{ valor: diasSemana, cor: "#d8b960" }]}
          total={7}
          tamanho={78}
          espessura={9}
          ariaLabel={`${diasSemana} de 7 dias com diário nesta semana`}
          className="[&_circle:first-child]:stroke-white/15"
        >
          <span className="text-xl font-light leading-none">{diasSemana}<span className="text-xs text-white/60">/7</span></span>
          <span className="mt-0.5 text-[8.5px] font-semibold uppercase tracking-[.14em] text-white/60">diário</span>
        </Ring>
      </div>

      {sequencia > 1 && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium">
          {sequencia} dias seguidos registrando
        </p>
      )}
    </div>
  );
}
