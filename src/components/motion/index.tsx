/**
 * Kit de movimento do Método R.E.A.L., o mesmo vocabulário do plano HTML v4:
 * entrar ao rolar, número que conta, anel e barra que se desenham.
 *
 * Regras (iguais às do plano):
 * - O valor final é o que fica na tela. Sem JS rodando a animação, com
 *   "reduzir movimento" ligado ou fora da tela, o número certo já aparece.
 * - Nada de biblioteca: IntersectionObserver + requestAnimationFrame + CSS.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** "Reduzir movimento" do sistema. O CSS global já zera transições; JS precisa perguntar. */
export function usePrefersReducedMotion(): boolean {
  const [reduz, setReduz] = useState(() =>
    typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const on = () => setReduz(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduz;
}

/** true a partir da primeira vez que o elemento aparece na tela (não volta a false). */
export function useInView<T extends Element>(margem = "0px 0px -8% 0px") {
  const ref = useRef<T | null>(null);
  const [visto, setVisto] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || visto) return;
    if (typeof IntersectionObserver === "undefined") { setVisto(true); return; }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { setVisto(true); io.disconnect(); }
    }, { rootMargin: margem });
    io.observe(el);
    return () => io.disconnect();
  }, [margem, visto]);
  return { ref, visto };
}

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Atraso em ms, para escalonar uma lista. */
  delay?: number;
  as?: "div" | "section" | "li";
}

/** Sobe e aparece quando entra na tela. */
export function Reveal({ children, className, delay = 0, as: Tag = "div" }: RevealProps) {
  const { ref, visto } = useInView<HTMLDivElement>();
  const reduz = usePrefersReducedMotion();
  const mostrar = visto || reduz;
  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-out-expo will-change-transform",
        mostrar ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5",
        className,
      )}
      style={{ transitionDelay: mostrar ? `${delay}ms` : undefined }}
    >
      {children}
    </Tag>
  );
}

const fmt = (v: number, casas: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

interface CountUpProps {
  value: number | null | undefined;
  decimals?: number;
  /** ms */
  duration?: number;
  /** Texto quando não há número. */
  vazio?: string;
  className?: string;
}

/** Número que conta até o valor ao aparecer. Muda de valor? Conta do anterior até o novo. */
export function CountUp({ value, decimals = 0, duration = 1300, vazio = "—", className }: CountUpProps) {
  const { ref, visto } = useInView<HTMLSpanElement>();
  const reduz = usePrefersReducedMotion();
  const alvo = typeof value === "number" && Number.isFinite(value) ? value : null;
  const [mostrado, setMostrado] = useState<number | null>(alvo);
  const anterior = useRef<number>(0);
  const animou = useRef(false);

  useEffect(() => {
    if (alvo === null) { setMostrado(null); return; }
    if (reduz || !visto) { setMostrado(alvo); if (!visto) anterior.current = 0; return; }
    const de = animou.current ? anterior.current : 0;
    animou.current = true;
    anterior.current = alvo;
    if (de === alvo) { setMostrado(alvo); return; }
    let t0: number | null = null;
    let raf = 0;
    const passo = (t: number) => {
      if (t0 === null) t0 = t;
      const k = Math.min((t - t0) / duration, 1);
      const e = 1 - Math.pow(1 - k, 4);
      setMostrado(k < 1 ? de + (alvo - de) * e : alvo);
      if (k < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [alvo, visto, reduz, duration]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {mostrado === null ? vazio : fmt(mostrado, decimals)}
    </span>
  );
}

export interface FatiaAnel {
  valor: number;
  /** Cor CSS (ex.: "hsl(var(--macro-prot))"). */
  cor: string;
  rotulo?: string;
}

interface RingProps {
  fatias: FatiaAnel[];
  /** px */
  tamanho?: number;
  espessura?: number;
  /** Total que fecha o anel. Sem ele, as fatias somadas fecham 100%. */
  total?: number;
  children?: ReactNode;
  className?: string;
  ariaLabel?: string;
}

/** Anel dividido em fatias que se desenha ao aparecer (o mesmo do plano). */
export function Ring({ fatias, tamanho = 150, espessura = 11, total, children, className, ariaLabel }: RingProps) {
  const { ref, visto } = useInView<HTMLDivElement>();
  const reduz = usePrefersReducedMotion();
  const desenhar = visto || reduz;
  const r = 50 - espessura / 2;
  const circ = 2 * Math.PI * r;
  const soma = total ?? fatias.reduce((a, f) => a + Math.max(f.valor, 0), 0);
  const gap = fatias.length > 1 ? 1.6 : 0;
  let acc = 0;
  return (
    <div ref={ref} className={cn("relative shrink-0", className)} style={{ width: tamanho, height: tamanho }}
      role={ariaLabel ? "img" : undefined} aria-label={ariaLabel}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={espessura} />
        {soma > 0 && fatias.map((f, i) => {
          const len = Math.max((circ * Math.max(f.valor, 0)) / soma - gap, 0);
          const off = -acc;
          acc += (circ * Math.max(f.valor, 0)) / soma;
          const style: CSSProperties = {
            strokeDasharray: `${desenhar ? len : 0} ${circ}`,
            strokeDashoffset: off,
            transition: "stroke-dasharray 1.4s cubic-bezier(.2,.8,.2,1)",
            transitionDelay: `${150 + i * 200}ms`,
          };
          return <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={f.cor} strokeWidth={espessura} style={style} />;
        })}
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>}
    </div>
  );
}

interface BarProps {
  /** 0 a 1 */
  fracao: number;
  className?: string;
  corClassName?: string;
}

/** Barra que se preenche ao aparecer. */
export function Bar({ fracao, className, corClassName = "bg-gradient-to-r from-primary to-primary-2" }: BarProps) {
  const { ref, visto } = useInView<HTMLDivElement>();
  const reduz = usePrefersReducedMotion();
  const f = Math.min(Math.max(fracao, 0), 1);
  return (
    <div ref={ref} className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full origin-left rounded-full transition-transform duration-1000 ease-out-expo", corClassName)}
        style={{ transform: `scaleX(${visto || reduz ? f : 0})` }}
      />
    </div>
  );
}
