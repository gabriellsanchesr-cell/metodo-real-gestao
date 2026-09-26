import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PortalDiario } from "@/components/portal/PortalDiario";
import { PortalJornada } from "@/components/portal/PortalJornada";
import { PortalReceitas } from "@/components/portal/PortalReceitas";
import { PortalChat } from "@/components/portal/PortalChat";
import { PortalMetas } from "@/components/portal/PortalMetas";
import { PortalMateriais } from "@/components/portal/PortalMateriais";
import { PortalSubstituicoes } from "@/components/portal/PortalSubstituicoes";
import { itensDoPlano } from "@/lib/substituicoes";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  LogOut, Home, Utensils, BookMarked, Target, MoreHorizontal,
  ChevronDown, ChevronUp, Clock, User, Activity, Sparkles,
  UtensilsCrossed, FolderOpen, MessageSquare, Scale, TrendingUp, TrendingDown, Minus, ArrowLeft, Pill, FlaskConical,
  Bell, Flame, Weight, Zap, CalendarDays, ChevronRight, Heart, Droplets, Moon, Sun, Sunrise, Sunset,
  Calendar, Star, Trophy, CheckCircle2, ArrowRightLeft,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format, differenceInDays, isToday, isTomorrow, addDays, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

// Parse YYYY-MM-DD as local to avoid timezone shifting by -1 day
const parseLocalDate = (s: string | null | undefined): Date => {
  if (!s) return new Date(NaN);
  const iso = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  return new Date(s);
};
import { PdfViewer } from "@/components/paciente/PdfViewer";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

type PortalTab = "inicio" | "plano" | "diario" | "metas" | "mais";
type MoreTab = "avaliacoes" | "receitas" | "materiais" | "mensagens" | "perfil" | "jornada" | "suplementos" | "substituicoes";

const tipoRefeicaoLabels: Record<string, string> = {
  cafe_da_manha: "Café da Manhã", lanche_da_manha: "Lanche da Manhã", almoco: "Almoço",
  lanche_da_tarde: "Lanche da Tarde", jantar: "Jantar", ceia: "Ceia",
};

function getGreeting(): { text: string; icon: any; emoji: string } {
  const h = new Date().getHours();
  if (h < 6) return { text: "Boa noite", icon: Moon, emoji: "🌙" };
  if (h < 12) return { text: "Bom dia", icon: Sunrise, emoji: "☀️" };
  if (h < 18) return { text: "Boa tarde", icon: Sun, emoji: "🌤️" };
  return { text: "Boa noite", icon: Sunset, emoji: "🌙" };
}

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

function PortalDeltaBadge({ current, previous, unit, inverse }: { current: number | null; previous: number | null; unit: string; inverse?: boolean }) {
  if (current == null || previous == null) return null;
  const diff = Math.round((current - previous) * 100) / 100;
  if (diff === 0) return <Badge variant="outline" className="text-xs gap-1"><Minus className="h-3 w-3" /> 0 {unit}</Badge>;
  const positive = diff > 0;
  const isGood = inverse ? !positive : positive;
  return (
    <Badge variant="outline" className={`text-xs gap-1 ${isGood ? "text-emerald-600 border-emerald-200 bg-emerald-50" : "text-red-500 border-red-200 bg-red-50"}`}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}{diff} {unit}
    </Badge>
  );
}

export default function PortalPaciente() {
  const { user, signOut } = useAuth();
  const [paciente, setPaciente] = useState<any>(null);
  const [plano, setPlano] = useState<any>(null);
  const [planoPdfUrl, setPlanoPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PortalTab>("inicio");
  const [moreTab, setMoreTab] = useState<MoreTab | null>(null);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [activeOption, setActiveOption] = useState<Record<string, string>>({});
  const [portalPresc, setPortalPresc] = useState<any[]>([]);
  const [prescLoaded, setPrescLoaded] = useState(false);
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [selectedAvaliacao, setSelectedAvaliacao] = useState<any>(null);
  const [proximaConsulta, setProximaConsulta] = useState<any>(null);
  const [diaryStreak, setDiaryStreak] = useState(0);
  const [weeklyProgress, setWeeklyProgress] = useState({ done: 0, total: 7 });

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    try {
      const { data: pac } = await supabase
        .from("pacientes").select("*").eq("auth_user_id", user!.id).maybeSingle();
      setPaciente(pac);
      if (pac) {
        const { data: planoData } = await supabase
          .from("planos_alimentares")
          .select("*, refeicoes(*, alimentos_plano(*, alimento_substituicoes(*)))")
          .eq("paciente_id", pac.id)
          .eq("status", "ativo")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setPlano(planoData);
        if (planoData?.tipo === "anexo" && planoData?.pdf_path) {
          try {
            const { data: signed } = await supabase.storage
              .from("documentos-pdf")
              .createSignedUrl(planoData.pdf_path, 3600);
            if (signed?.signedUrl) setPlanoPdfUrl(signed.signedUrl);
          } catch {}
        }
        if (planoData?.id) {
          try {
            const saved = localStorage.getItem(`opcaoSel:${planoData.id}`);
            if (saved) setActiveOption(JSON.parse(saved));
          } catch {}
        }

        const { data: avData } = await supabase
          .from("avaliacoes_fisicas")
          .select("*")
          .eq("paciente_id", pac.id)
          .order("data_avaliacao", { ascending: false });
        setAvaliacoes((avData as any) || []);

        // Load next consultation
        const now = new Date().toISOString();
        const { data: consultaData } = await supabase
          .from("consultas")
          .select("*")
          .eq("paciente_id", pac.id)
          .gte("data_hora", now)
          .order("data_hora", { ascending: true })
          .limit(1);
        if (consultaData && consultaData.length > 0) setProximaConsulta(consultaData[0]);

        // Load diary streak
        const { data: diarioData } = await supabase
          .from("diario_registros")
          .select("data_registro")
          .eq("paciente_id", pac.id)
          .order("data_registro", { ascending: false })
          .limit(30);
        if (diarioData) {
          const uniqueDates = [...new Set(diarioData.map(d => d.data_registro))];
          let streak = 0;
          const today = new Date();
          for (let i = 0; i < uniqueDates.length; i++) {
            const expected = format(addDays(today, -i), "yyyy-MM-dd");
            if (uniqueDates.includes(expected)) streak++;
            else break;
          }
          setDiaryStreak(streak);

          // Weekly progress
          const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
          const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
          const weekDays = uniqueDates.filter(d => d >= weekStart && d <= weekEnd);
          setWeeklyProgress({ done: weekDays.length, total: 7 });
        }
      }
    } catch (err) {
      console.error("[PortalPaciente] loadData error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="px-4 py-3 flex items-center gap-3 border-b border-border bg-card/80 backdrop-blur-lg">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
        </header>
        <main className="flex-1 px-4 py-4 space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </main>
      </div>
    );
  }

  if (!paciente) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-sm w-full rounded-2xl glass-card">
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>Seu perfil de paciente ainda não foi vinculado.</p>
            <p className="text-sm mt-2">Entre em contato com seu nutricionista.</p>
            <Button variant="outline" className="mt-4" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getOpcoes = (ref: any): Record<string, any[]> => {
    const groups: Record<string, any[]> = {};
    (ref.alimentos_plano || []).forEach((a: any) => {
      const k = a.opcao || "A";
      (groups[k] = groups[k] || []).push(a);
    });
    if (!Object.keys(groups).length) groups["A"] = [];
    Object.keys(groups).forEach(k => groups[k].sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0)));
    return groups;
  };
  const getActiveOpt = (ref: any): string => {
    const keys = Object.keys(getOpcoes(ref)).sort();
    return activeOption[ref.id] || keys[0] || "A";
  };
  // Lista de alimentos da opção que o paciente marcou para contabilizar nesta refeição
  const getContabilizada = (r: any): any[] => {
    const opts = getOpcoes(r);
    const chosen = activeOption[r.id];
    if (chosen && opts[chosen]) return opts[chosen];
    return opts["A"] || opts[Object.keys(opts).sort()[0]] || [];
  };

  const totalDiario = plano?.refeicoes?.reduce((acc: number, r: any) => {
    return acc + getContabilizada(r).reduce((a: number, al: any) => a + (al.energia_kcal || 0), 0);
  }, 0) || 0;

  const firstName = paciente.nome_completo.split(" ")[0];
  const initials = getInitials(paciente.nome_completo);
  const greeting = getGreeting();

  const renderContent = () => {
    if (moreTab) return renderMoreContent();
    switch (activeTab) {
      case "inicio": return renderInicio();
      case "plano":
        return (
          <>
            {renderPlano()}
            {plano && (
              <button
                onClick={() => { setMoreTab("substituicoes"); setActiveTab("mais"); }}
                className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left transition-colors active:bg-muted"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Precisa trocar um alimento?</p>
                  <p className="text-xs text-muted-foreground">Veja a quantidade equivalente de outro do mesmo grupo.</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            )}
          </>
        );
      case "diario": return <PortalDiario paciente={paciente} />;
      case "metas": return <PortalMetas paciente={paciente} />;
      case "mais": return renderMoreContent();
      default: return null;
    }
  };

  const renderInicio = () => {
    const consultaDate = proximaConsulta ? new Date(proximaConsulta.data_hora) : null;
    const consultaLabel = consultaDate
      ? isToday(consultaDate) ? "Hoje" : isTomorrow(consultaDate) ? "Amanhã" : format(consultaDate, "dd 'de' MMM", { locale: ptBR })
      : null;

    return (
      <div className="space-y-5">
        {/* Welcome banner - glassmorphism */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-5 text-primary-foreground animate-fade-in">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-foreground/10 blur-sm" />
          <div className="absolute right-8 bottom-0 h-20 w-20 rounded-full bg-primary-foreground/5 blur-sm" />
          <div className="absolute -left-4 -bottom-6 h-16 w-16 rounded-full bg-primary-foreground/8" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90 flex items-center gap-1.5">
                {greeting.emoji} {greeting.text}
              </p>
              <h2 className="text-xl font-bold mt-0.5">{firstName}</h2>
              <p className="text-xs mt-1.5 opacity-80">Acompanhe seu progresso nutricional</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-12 w-12 rounded-2xl bg-primary-foreground/15 backdrop-blur-sm flex items-center justify-center">
                <Trophy className="h-6 w-6" />
              </div>
              {diaryStreak > 0 && (
                <span className="text-[10px] font-bold opacity-90">{diaryStreak} dias</span>
              )}
            </div>
          </div>
        </div>

        {/* Weekly progress bar */}
        <div className="animate-slide-up animate-stagger-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-warning" />
              Progresso Semanal
            </p>
            <span className="text-xs text-muted-foreground">{weeklyProgress.done}/{weeklyProgress.total} dias</span>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                  i < weeklyProgress.done
                    ? "bg-gradient-to-r from-primary to-primary/70"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Metric cards - glassmorphism */}
        <div className="grid grid-cols-3 gap-3 animate-slide-up animate-stagger-2">
          {[
            { icon: Weight, value: paciente.peso_inicial || "—", label: "Peso (kg)", color: "from-blue-500/20 to-blue-600/5", iconColor: "text-blue-600 bg-blue-100" },
            { icon: Flame, value: Math.round(totalDiario), label: "Kcal/dia", color: "from-orange-500/20 to-orange-600/5", iconColor: "text-orange-600 bg-orange-100" },
            { icon: Sparkles, value: paciente.fase_real || "—", label: "Fase R.E.A.L.", color: "from-violet-500/20 to-violet-600/5", iconColor: "text-violet-600 bg-violet-100" },
          ].map((metric, idx) => (
            <Card key={idx} className="rounded-2xl border-none shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300">
              <div className={`absolute inset-0 bg-gradient-to-br ${metric.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <CardContent className="p-3 text-center relative">
                <div className={`mx-auto h-9 w-9 rounded-xl ${metric.iconColor} flex items-center justify-center mb-1.5 transition-transform duration-300 group-hover:scale-110`}>
                  <metric.icon className="h-4 w-4" />
                </div>
                <p className="text-lg font-bold text-foreground capitalize">{metric.value}</p>
                <p className="text-[10px] text-muted-foreground">{metric.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick actions - pill style */}
        <div className="flex gap-2.5 overflow-x-auto pb-1 animate-slide-up animate-stagger-3 scrollbar-hide">
          {[
            { label: "Ver Plano", icon: Utensils, action: () => { setActiveTab("plano"); setMoreTab(null); }, variant: "primary" as const },
            { label: "Registrar Diário", icon: BookMarked, action: () => { setActiveTab("diario"); setMoreTab(null); }, variant: "secondary" as const },
            { label: "Mensagens", icon: MessageSquare, action: () => { setMoreTab("mensagens"); setActiveTab("mais"); }, variant: "secondary" as const },
          ].map((btn, idx) => (
            <button
              key={idx}
              onClick={btn.action}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full shrink-0 transition-all duration-200 active:scale-95 ${
                btn.variant === "primary"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30"
                  : "bg-accent hover:bg-accent/80 text-accent-foreground"
              }`}
            >
              <btn.icon className="h-4 w-4" />
              <span className="text-xs font-semibold whitespace-nowrap">{btn.label}</span>
            </button>
          ))}
        </div>

        {/* Next consultation */}
        {proximaConsulta && (
          <Card className="rounded-2xl overflow-hidden border-primary/15 shadow-sm animate-slide-up animate-stagger-3">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">Próxima Consulta</p>
                  <p className="font-bold text-foreground text-sm">
                    {consultaLabel} às {format(consultaDate!, "HH:mm")}
                  </p>
                </div>
                {isToday(consultaDate!) && (
                  <Badge className="bg-primary/15 text-primary hover:bg-primary/15 text-[10px] font-bold animate-pulse">
                    Hoje!
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active plan card - premium */}
        <div className="animate-slide-up animate-stagger-4">
          {plano ? (
            <Card className="rounded-2xl overflow-hidden shadow-sm gradient-border">
              <div className="h-1.5 bg-gradient-to-r from-primary via-primary/60 to-accent" />
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Utensils className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Plano Ativo
                  </CardTitle>
                  <Badge className="text-[10px] px-2.5 py-0.5 bg-emerald-500 hover:bg-emerald-500 rounded-full">
                    <CheckCircle2 className="h-3 w-3 mr-0.5" /> Ativo
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="font-semibold text-foreground">{plano.nome}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  <span>{plano.refeicoes?.length || 0} refeições</span>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                  <span>{Math.round(totalDiario)} kcal/dia</span>
                </p>
                <Button
                  size="sm"
                  className="mt-3 w-full rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300"
                  onClick={() => { setActiveTab("plano"); setMoreTab(null); }}
                >
                  Ver Plano Completo
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                <Utensils className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Seu plano alimentar será enviado em breve pelo nutricionista.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Diary streak card */}
        {diaryStreak > 0 && (
          <Card className="rounded-2xl border-none shadow-sm bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 animate-scale-in">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                <Flame className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">{diaryStreak} dias seguidos!</p>
                <p className="text-xs text-muted-foreground">Continue registrando seu diário 🔥</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderPlano = () => {
    if (!plano) {
      return (
        <div className="text-center py-12 text-muted-foreground animate-fade-in">
          <Utensils className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nenhum plano ativo</p>
          <p className="text-sm mt-1">Seu plano alimentar será enviado em breve.</p>
        </div>
      );
    }
    if (plano.tipo === "anexo") {
      // Macros vêm de uma "refeição resumo" criada na anexação do PDF
      let p = 0, c = 0, g = 0, f = 0;
      plano.refeicoes?.forEach((r: any) => {
        getContabilizada(r).forEach((a: any) => {
          p += a.proteina_g || 0; c += a.carboidrato_g || 0;
          g += a.lipidio_g || 0; f += a.fibra_g || 0;
        });
      });
      const hasTotais = totalDiario > 0 || p > 0 || c > 0 || g > 0;
      return (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-foreground">{plano.nome}</h2>
              <p className="text-xs text-muted-foreground">
                {hasTotais ? `${Math.round(totalDiario)} kcal/dia` : "Plano em PDF enviado pelo nutricionista"}
              </p>
            </div>
          </div>
          {hasTotais && (
            <Card className="rounded-2xl glass-card">
              <CardContent className="p-4">
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div><p className="text-lg font-bold text-primary">{Math.round(totalDiario)}</p><p className="text-[10px] text-muted-foreground">Kcal</p></div>
                  <div><p className="text-lg font-bold text-blue-500">{Math.round(p)}g</p><p className="text-[10px] text-muted-foreground">Proteína</p></div>
                  <div><p className="text-lg font-bold text-orange-500">{Math.round(c)}g</p><p className="text-[10px] text-muted-foreground">Carb</p></div>
                  <div><p className="text-lg font-bold text-yellow-500">{Math.round(g)}g</p><p className="text-[10px] text-muted-foreground">Gord</p></div>
                  <div><p className="text-lg font-bold text-green-500">{Math.round(f)}g</p><p className="text-[10px] text-muted-foreground">Fibra</p></div>
                </div>
              </CardContent>
            </Card>
          )}
          {plano.observacoes && (
            <Card className="rounded-2xl glass-card">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plano.observacoes}</p>
              </CardContent>
            </Card>
          )}
          <div className="h-[75vh] rounded-2xl overflow-hidden border border-border bg-card">
            {planoPdfUrl ? (
              <PdfViewer url={planoPdfUrl} continuous />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Carregando PDF...
              </div>
            )}
          </div>
          {planoPdfUrl && (
            <div className="flex justify-end">
              <a
                href={planoPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary underline"
              >
                Abrir em nova aba
              </a>
            </div>
          )}
        </div>
      );
    }
    const sortedRefeicoes = [...(plano.refeicoes || [])].sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-foreground">{plano.nome}</h2>
            <p className="text-xs text-muted-foreground">{Math.round(totalDiario)} kcal/dia</p>
          </div>
        </div>
        <Card className="rounded-2xl glass-card">
          <CardContent className="p-4">
            <div className="grid grid-cols-5 gap-2 text-center">
              {(() => {
                let p = 0, c = 0, g = 0, f = 0;
                plano.refeicoes?.forEach((r: any) => {
                  getContabilizada(r).forEach((a: any) => {
                    p += a.proteina_g || 0; c += a.carboidrato_g || 0;
                    g += a.lipidio_g || 0; f += a.fibra_g || 0;
                  });
                });
                return (
                  <>
                    <div><p className="text-lg font-bold text-primary">{Math.round(totalDiario)}</p><p className="text-[10px] text-muted-foreground">Kcal</p></div>
                    <div><p className="text-lg font-bold text-blue-500">{Math.round(p)}g</p><p className="text-[10px] text-muted-foreground">Proteína</p></div>
                    <div><p className="text-lg font-bold text-orange-500">{Math.round(c)}g</p><p className="text-[10px] text-muted-foreground">Carb</p></div>
                    <div><p className="text-lg font-bold text-yellow-500">{Math.round(g)}g</p><p className="text-[10px] text-muted-foreground">Gordura</p></div>
                    <div><p className="text-lg font-bold text-green-500">{Math.round(f)}g</p><p className="text-[10px] text-muted-foreground">Fibra</p></div>
                  </>
                );
              })()}
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">Totais calculados pelas opções marcadas em cada refeição (padrão: Opção A)</p>
          </CardContent>
        </Card>
        {sortedRefeicoes.map((ref: any, idx: number) => {
          const isExp = expandedMeal === ref.id;
          const opcoes = getOpcoes(ref);
          const opLetras = Object.keys(opcoes).sort();
          const activeOpt = getActiveOpt(ref);
          const alimentosAtivos = opcoes[activeOpt] || [];
          const mealKcal = alimentosAtivos.reduce((a: number, al: any) => a + (al.energia_kcal || 0), 0);
          const displayName = ref.nome_customizado?.trim() || tipoRefeicaoLabels[ref.tipo] || ref.tipo;
          return (
            <Card key={ref.id} className="rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md" style={{ animationDelay: `${idx * 0.05}s` }}>
              <button className="w-full text-left p-4 flex items-center justify-between" onClick={() => setExpandedMeal(isExp ? null : ref.id)}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                    <Utensils className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{displayName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      {ref.horario_sugerido && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {ref.horario_sugerido}</span>}
                      <span>{Math.round(mealKcal)} kcal</span>
                      {opLetras.length > 1 && (
                        <>
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">{opLetras.length} opções</span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-medium">Conta no dia: Opção {activeOpt}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className={`transition-transform duration-200 ${isExp ? "rotate-180" : ""}`}>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
              {isExp && (
                <div className="px-4 pb-4 space-y-2 animate-fade-in">
                  {opLetras.length > 1 && (
                    <div className="rounded-xl bg-muted/40 border border-border/60 p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">✓</div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-foreground">Qual opção você vai comer hoje?</p>
                          <p className="text-[10px] text-muted-foreground">Marque uma — ela conta no total do dia (calorias e macros).</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {opLetras.map(l => {
                          const isSel = activeOpt === l;
                          const kcalOp = (opcoes[l] || []).reduce((a: number, al: any) => a + (al.energia_kcal || 0), 0);
                          return (
                            <button
                              key={l}
                              type="button"
                              onClick={() => setActiveOption(prev => {
                                const next = { ...prev, [ref.id]: l };
                                if (plano?.id) {
                                  try { localStorage.setItem(`opcaoSel:${plano.id}`, JSON.stringify(next)); } catch {}
                                }
                                return next;
                              })}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                isSel
                                  ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                                  : "bg-background text-foreground border-border hover:border-emerald-400"
                              }`}
                            >
                              <span className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center ${isSel ? "border-white" : "border-muted-foreground"}`}>
                                {isSel && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                              </span>
                              Opção {l}
                              <span className={`text-[10px] ${isSel ? "text-white/80" : "text-muted-foreground"}`}>· {Math.round(kcalOp)} kcal</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {alimentosAtivos.map((ali: any) => {
                    const subs = (ali.alimento_substituicoes || []).slice().sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
                    return (
                      <div key={ali.id} className="py-2 border-t border-border/50 text-sm">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-foreground">{ali.nome_alimento}</p>
                            <p className="text-xs text-muted-foreground">{ali.quantidade}g{ali.medida_caseira ? ` • ${ali.medida_caseira}` : ""}</p>
                          </div>
                          <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{Math.round(ali.energia_kcal || 0)} kcal</span>
                        </div>
                        {subs.length > 0 && (
                          <div className="mt-2 ml-2 pl-3 border-l-2 border-primary/20 space-y-1">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Substituições</p>
                            {subs.map((s: any) => (
                              <p key={s.id} className="text-xs text-muted-foreground">
                                ↔ {s.nome}{s.quantidade ? ` — ${s.quantidade}g` : ""}{s.medida_caseira ? ` (${s.medida_caseira})` : ""}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {ref.substituicoes_sugeridas && (
                    <div className="bg-muted/50 rounded-xl p-3 text-xs">
                      <p className="font-medium text-foreground mb-1">🔄 Substituições gerais</p>
                      <p className="text-muted-foreground whitespace-pre-line">{ref.substituicoes_sugeridas}</p>
                    </div>
                  )}
                  {ref.observacoes && (
                    <div className="bg-primary/5 rounded-xl p-3 text-xs">
                      <p className="font-medium text-foreground mb-1">📝 Observações</p>
                      <p className="text-muted-foreground">{ref.observacoes}</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
        {plano.observacoes && (
          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-foreground mb-1">Observações do nutricionista</p>
              <p className="text-sm text-muted-foreground">{plano.observacoes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderAvaliacoes = () => {
    if (selectedAvaliacao) {
      const av = selectedAvaliacao;
      const idx = avaliacoes.findIndex(a => a.id === av.id);
      const prev = idx < avaliacoes.length - 1 ? avaliacoes[idx + 1] : null;

      return (
        <div className="space-y-4 animate-fade-in">
          <Button variant="ghost" size="sm" onClick={() => setSelectedAvaliacao(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <h2 className="text-lg font-bold text-foreground">
            Avaliação — {format(parseLocalDate(av.data_avaliacao), "dd/MM/yyyy")}
          </h2>

          <Card className="rounded-2xl glass-card">
            <CardContent className="p-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Peso</p>
                <p className="font-bold text-lg">{av.peso ?? "—"} kg</p>
                <PortalDeltaBadge current={av.peso} previous={prev?.peso} unit="kg" inverse />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">IMC</p>
                <p className="font-bold text-lg">{av.imc ?? "—"}</p>
                <Badge variant="outline" className="text-xs">{av.classificacao_imc || "—"}</Badge>
              </div>
              {av.circ_cintura && (
                <div><p className="text-muted-foreground text-xs">Cintura</p><p className="font-semibold">{av.circ_cintura} cm</p>
                  <PortalDeltaBadge current={av.circ_cintura} previous={prev?.circ_cintura} unit="cm" inverse />
                </div>
              )}
              {av.circ_quadril && (
                <div><p className="text-muted-foreground text-xs">Quadril</p><p className="font-semibold">{av.circ_quadril} cm</p></div>
              )}
              {(av.percentual_gordura_dobras != null || av.bio_percentual_gordura != null) && (
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">% Gordura Corporal</p>
                  <p className="font-bold text-lg">{av.percentual_gordura_dobras ?? av.bio_percentual_gordura}%</p>
                  <PortalDeltaBadge current={av.percentual_gordura_dobras ?? av.bio_percentual_gordura} previous={prev ? (prev.percentual_gordura_dobras ?? prev.bio_percentual_gordura) : null} unit="%" inverse />
                </div>
              )}
              {av.massa_magra_kg && (
                <div><p className="text-muted-foreground text-xs">Massa Magra</p><p className="font-semibold">{av.massa_magra_kg} kg</p></div>
              )}
              {av.massa_gorda_kg && (
                <div><p className="text-muted-foreground text-xs">Massa Gorda</p><p className="font-semibold">{av.massa_gorda_kg} kg</p></div>
              )}
            </CardContent>
          </Card>

          {av.observacoes && (
            <Card className="rounded-2xl">
              <CardContent className="p-4 text-sm">
                <p className="text-muted-foreground text-xs mb-1">Observações</p>
                <p className="text-foreground">{av.observacoes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      );
    }

    const chartData = [...avaliacoes].reverse().map(a => ({
      data: format(parseLocalDate(a.data_avaliacao), "dd/MM", { locale: ptBR }),
      peso: a.peso,
    })).filter(d => d.peso != null);

    return (
      <div className="space-y-4 animate-fade-in">
        <h2 className="text-lg font-bold text-foreground">Minhas Avaliações</h2>

        {avaliacoes.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              <Scale className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Nenhuma avaliação registrada ainda.</p>
              <p className="text-xs mt-1">Seu nutricionista registrará suas avaliações aqui.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {chartData.length > 1 && (
              <Card className="rounded-2xl glass-card">
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm">Evolução do Peso</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="data" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} domain={["dataMin - 1", "dataMax + 1"]} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                        <Line type="monotone" dataKey="peso" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", r: 4, strokeWidth: 2, stroke: "hsl(var(--card))" }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {avaliacoes.length >= 2 && (
              <Card className="rounded-2xl border-primary/20 glass-card">
                <CardHeader className="pb-1"><CardTitle className="text-sm">Última vs Anterior</CardTitle></CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    {[
                      { l: "Peso", k: "peso", u: "kg" },
                      { l: "IMC", k: "imc", u: "" },
                      { l: "% Gordura", k: "percentual_gordura_dobras", u: "%" },
                    ].map(({ l, k, u }) => (
                      <div key={k}>
                        <p className="text-muted-foreground text-xs">{l}</p>
                        <p className="font-bold">{avaliacoes[0][k] ?? "—"}{u}</p>
                        <PortalDeltaBadge current={avaliacoes[0][k]} previous={avaliacoes[1][k]} unit={u} inverse />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {avaliacoes.map((av, idx) => (
              <Card
                key={av.id}
                className="rounded-2xl cursor-pointer hover:shadow-md transition-all duration-200 active:scale-[0.98]"
                onClick={() => setSelectedAvaliacao(av)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                      <Scale className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{format(parseLocalDate(av.data_avaliacao), "dd/MM/yyyy")}</p>
                      <p className="text-xs text-muted-foreground">
                        {av.peso && `${av.peso}kg`} {av.imc && `• IMC ${av.imc}`} {av.percentual_gordura_dobras != null && `• ${av.percentual_gordura_dobras}% gord.`}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    );
  };

  const loadPrescricoes = async () => {
    if (prescLoaded || !paciente) return;
    const { data } = await (supabase as any)
      .from("prescricoes_suplementos")
      .select("*, suplementos_banco(nome, tipo, categoria, apresentacao, manipulado_ativos(*))")
      .eq("paciente_id", paciente.id)
      .eq("ativa", true)
      .order("created_at", { ascending: false });
    setPortalPresc(data || []);
    setPrescLoaded(true);
  };

  const renderPortalSuplemenos = () => {
    if (!prescLoaded) { loadPrescricoes(); return <div className="space-y-3"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /></div>; }
    if (portalPresc.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground animate-fade-in">
          <Pill className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="font-medium">Nenhum suplemento prescrito</p>
          <p className="text-sm mt-1">Seu nutricionista adicionará suas prescrições aqui.</p>
        </div>
      );
    }
    return (
      <div className="space-y-4 animate-fade-in">
        <h2 className="text-lg font-bold text-foreground">Meus Suplementos</h2>
        {portalPresc.map((p: any) => {
          const sup = p.suplementos_banco;
          const remaining = p.data_fim ? differenceInDays(new Date(p.data_fim), new Date()) : null;
          const totalDays = p.data_fim && p.data_inicio ? differenceInDays(new Date(p.data_fim), new Date(p.data_inicio)) : null;
          const progress = remaining != null && totalDays ? Math.max(0, Math.min(100, ((totalDays - remaining) / totalDays) * 100)) : null;
          return (
            <Card key={p.id} className="rounded-2xl hover:shadow-md transition-all duration-200">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${sup?.tipo === "manipulado" ? "bg-violet-100" : "bg-primary/10"}`}>
                    {sup?.tipo === "manipulado" ? <FlaskConical className="h-4 w-4 text-violet-500" /> : <Pill className="h-4 w-4 text-primary" />}
                  </div>
                  <span className="font-semibold text-foreground">{sup?.nome}</span>
                </div>
                <p className="text-sm font-medium text-foreground">{p.dose_prescrita} {p.unidade_dose} — {p.frequencia}</p>
                <p className="text-sm text-muted-foreground">{p.momento_uso} • {p.duracao}</p>
                {remaining != null && (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{remaining > 0 ? `${remaining} dias restantes` : "Encerrada"}</span>
                      {progress != null && <span>{Math.round(progress)}%</span>}
                    </div>
                    {progress != null && (
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                      </div>
                    )}
                  </div>
                )}
                {p.observacoes_paciente && <p className="text-xs text-muted-foreground italic">{p.observacoes_paciente}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderMoreContent = () => {
    switch (moreTab) {
      case "avaliacoes": return renderAvaliacoes();
      case "perfil": return renderPerfil();
      case "receitas": return <PortalReceitas paciente={paciente} />;
      case "mensagens": return <PortalChat paciente={paciente} />;
      case "jornada": return <PortalJornada paciente={paciente} />;
      case "suplementos": return renderPortalSuplemenos();
      case "materiais": return <PortalMateriais paciente={paciente} />;
      case "substituicoes":
        return (
          <PortalSubstituicoes
            itensPlano={itensDoPlano(plano && {
              ...plano,
              refeicoes: (plano.refeicoes || []).map((r: { nome_customizado?: string | null; tipo: string }) => ({
                ...r,
                nome: r.nome_customizado?.trim() || tipoRefeicaoLabels[r.tipo] || null,
              })),
            })}
          />
        );
      default: return renderPlaceholder("Materiais", "Este recurso estará disponível em breve.");
    }
  };

  const renderPerfil = () => (
    <div className="space-y-5 animate-fade-in">
      {/* Avatar header with gradient */}
      <div className="flex flex-col items-center pt-4">
        <div className="relative">
          <Avatar className="h-20 w-20 mb-3 ring-4 ring-primary/10">
            <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute bottom-2 right-0 h-5 w-5 rounded-full bg-emerald-500 border-2 border-card" />
        </div>
        <h2 className="text-lg font-bold text-foreground">{paciente.nome_completo}</h2>
        <p className="text-sm text-muted-foreground">{paciente.email || ""}</p>
      </div>

      {/* Stats mini bar */}
      {diaryStreak > 0 && (
        <div className="flex items-center justify-center gap-4 py-2">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{diaryStreak}</p>
            <p className="text-[10px] text-muted-foreground">Dias streak</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{avaliacoes.length}</p>
            <p className="text-[10px] text-muted-foreground">Avaliações</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-lg font-bold text-foreground capitalize">{paciente.fase_real || "—"}</p>
            <p className="text-[10px] text-muted-foreground">Fase</p>
          </div>
        </div>
      )}

      {/* Personal data card */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Dados Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Telefone</span>
            <span className="font-medium text-foreground">{paciente.telefone || "—"}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-3">
            <span className="text-muted-foreground">Objetivo</span>
            <span className="font-medium text-foreground capitalize">{paciente.objetivo?.replace(/_/g, " ") || "—"}</span>
          </div>
          {paciente.data_nascimento && (
            <div className="flex justify-between border-t border-border pt-3">
              <span className="text-muted-foreground">Nascimento</span>
              <span className="font-medium text-foreground">{format(new Date(paciente.data_nascimento), "dd/MM/yyyy")}</span>
            </div>
          )}
          {paciente.sexo && (
            <div className="flex justify-between border-t border-border pt-3">
              <span className="text-muted-foreground">Sexo</span>
              <span className="font-medium text-foreground capitalize">{paciente.sexo}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logout */}
      <Button variant="outline" className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive" onClick={signOut}>
        <LogOut className="h-4 w-4 mr-2" /> Sair da conta
      </Button>
    </div>
  );

  const renderPlaceholder = (title: string, desc: string) => (
    <div className="text-center py-12 text-muted-foreground animate-fade-in">
      <p className="font-medium text-lg">{title}</p>
      <p className="text-sm mt-1">{desc}</p>
    </div>
  );

  const moreItems: { id: MoreTab; label: string; icon: any; desc: string; color: string; gradient: string }[] = [
    { id: "avaliacoes", label: "Avaliações", icon: Activity, desc: "Medidas e composição", color: "text-blue-600", gradient: "from-blue-100 to-blue-50" },
    { id: "substituicoes", label: "Substituições", icon: ArrowRightLeft, desc: "Trocar alimentos", color: "text-amber-600", gradient: "from-amber-100 to-amber-50" },
    { id: "receitas", label: "Receitas", icon: UtensilsCrossed, desc: "Receitas saudáveis", color: "text-orange-600", gradient: "from-orange-100 to-orange-50" },
    { id: "suplementos", label: "Suplementos", icon: Pill, desc: "Prescrições ativas", color: "text-violet-600", gradient: "from-violet-100 to-violet-50" },
    { id: "jornada", label: "Jornada", icon: Sparkles, desc: "Seu progresso", color: "text-emerald-600", gradient: "from-emerald-100 to-emerald-50" },
    { id: "mensagens", label: "Mensagens", icon: MessageSquare, desc: "Fale com o nutri", color: "text-sky-600", gradient: "from-sky-100 to-sky-50" },
    { id: "perfil", label: "Perfil", icon: User, desc: "Seus dados", color: "text-slate-600", gradient: "from-slate-100 to-slate-50" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header premium with glassmorphism */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/40 px-4 py-3 safe-area-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 ring-2 ring-primary/10">
              <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{greeting.text}</p>
              <h1 className="text-sm font-bold text-foreground leading-tight">{firstName}</h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {moreTab && (
              <Button variant="ghost" size="icon" onClick={() => setMoreTab(null)} className="h-9 w-9 rounded-xl">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {renderContent()}
      </main>

      {/* Bottom nav refined */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/40 safe-area-bottom z-50">
        <div className="flex items-center justify-around py-1.5 pb-2">
          <NavBtn icon={Home} label="Início" active={activeTab === "inicio" && !moreTab} onClick={() => { setActiveTab("inicio"); setMoreTab(null); }} />
          <NavBtn icon={Utensils} label="Plano" active={activeTab === "plano" && !moreTab} onClick={() => { setActiveTab("plano"); setMoreTab(null); }} />
          <NavBtn icon={BookMarked} label="Diário" active={activeTab === "diario" && !moreTab} onClick={() => { setActiveTab("diario"); setMoreTab(null); }} />
          <NavBtn icon={Target} label="Metas" active={activeTab === "metas" && !moreTab} onClick={() => { setActiveTab("metas"); setMoreTab(null); }} />
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[48px]">
                <MoreHorizontal className="h-[22px] w-[22px] text-muted-foreground transition-colors" />
                <span className="text-[10px] text-muted-foreground">Mais</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-8">
              <SheetHeader className="pb-1">
                <SheetTitle className="text-base">Menu</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-3 pt-3">
                {moreItems.map(item => (
                  <button
                    key={item.id}
                    className="flex items-center gap-3 p-3.5 rounded-2xl hover:shadow-md transition-all duration-200 text-left active:scale-[0.97] bg-gradient-to-br dark:from-muted/40 dark:to-muted/20"
                    style={{ background: undefined }}
                    onClick={() => { setMoreTab(item.id); setActiveTab("mais"); }}
                  >
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${item.gradient} ${item.color}`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}

function NavBtn({ icon: Icon, label, active, onClick }: { icon: any; label: string; active: boolean; onClick: () => void }) {
  return (
    <button className="flex flex-col items-center gap-1 px-3 py-1.5 min-w-[48px] relative group" onClick={onClick}>
      <div className={`relative transition-all duration-200 ${active ? "scale-110" : "group-active:scale-90"}`}>
        <Icon className={`h-[22px] w-[22px] transition-colors duration-200 ${active ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <span className={`text-[10px] transition-colors duration-200 ${active ? "text-primary font-semibold" : "text-muted-foreground"}`}>{label}</span>
      {active && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-5 bg-primary rounded-full" />
      )}
    </button>
  );
}
