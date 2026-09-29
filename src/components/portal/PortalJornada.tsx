import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Calendar, Target, Key, Heart, Check, ChevronDown, ChevronUp,
  Video, FileText, Type, Headphones, ExternalLink, Search, Star,
  ArrowLeft, Download, BookmarkPlus, Bookmark,
} from "lucide-react";

const FASES = [
  { id: "rotina", label: "ROTINA", cor: "#3B82F6", icon: Calendar },
  { id: "estrategia", label: "ESTRATÉGIA", cor: "#8B5CF6", icon: Target },
  { id: "autonomia", label: "AUTONOMIA", cor: "#F59E0B", icon: Key },
  { id: "liberdade", label: "LIBERDADE", cor: "#22C55E", icon: Heart },
];

const CATEGORIAS: Record<string, string> = {
  alimentacao: "Alimentação", comportamento: "Comportamento", rotina: "Rotina",
  exercicio: "Exercício", sono: "Sono", saude_intestinal: "Saúde intestinal",
  ansiedade: "Ansiedade alimentar", motivacao: "Motivação", receitas: "Receitas", outro: "Outro",
};

const TIPO_ICONS: Record<string, any> = {
  video: Video, pdf: FileText, texto: Type, audio: Headphones, link: ExternalLink,
};

const TIPO_LABELS: Record<string, string> = {
  video: "VÍDEO", pdf: "PDF", texto: "LEITURA", audio: "ÁUDIO", link: "LINK",
};

const TIPO_BADGE: Record<string, string> = {
  video: "bg-blue-100 text-blue-700",
  pdf: "bg-red-100 text-red-700",
  texto: "bg-emerald-100 text-emerald-700",
  audio: "bg-purple-100 text-purple-700",
  link: "bg-gray-100 text-gray-700",
};

function getIncentive(pct: number) {
  if (pct === 0) return "Comece sua jornada. O primeiro passo é o mais importante.";
  if (pct <= 25) return "Ótimo início! Continue explorando.";
  if (pct <= 50) return "Você está na metade. Constância é tudo.";
  if (pct <= 75) return "Quase lá! Você está absorvendo muito.";
  return "Fase concluída! Gabriel avaliará sua promoção.";
}

interface Props {
  paciente: any;
}

type Conteudo = {
  id: string; titulo: string; fase: string; tipo: string; categoria: string;
  descricao: string | null; conteudo_texto: string | null; url_midia: string | null;
  arquivo_path: string | null; duracao_estimada: string | null; tags: string[];
  ordem: number; obrigatorio: boolean;
};

export function PortalJornada({ paciente }: Props) {
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [visualizacoes, setVisualizacoes] = useState<Record<string, boolean>>({});
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [viewingContent, setViewingContent] = useState<Conteudo | null>(null);
  const [showPrevious, setShowPrevious] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);
  const [readProgress, setReadProgress] = useState(0);

  const faseAtual = paciente?.fase_real || "rotina";
  const faseAtualIdx = FASES.findIndex(f => f.id === faseAtual);
  const faseInfo = FASES[faseAtualIdx] || FASES[0];
  const fasesAcessiveis = FASES.slice(0, faseAtualIdx + 1).map(f => f.id);

  useEffect(() => { if (paciente) loadData(); }, [paciente]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: c }, { data: v }, { data: f }] = await Promise.all([
      supabase.from("conteudos_real").select("*").eq("status", "publicado").order("ordem"),
      supabase.from("conteudo_visualizacoes").select("*").eq("paciente_id", paciente.id),
      supabase.from("conteudo_favoritos").select("conteudo_id").eq("paciente_id", paciente.id),
    ]);
    setConteudos((c as any) || []);
    const visMap: Record<string, boolean> = {};
    (v || []).forEach((item: any) => { visMap[item.conteudo_id] = item.visto; });
    setVisualizacoes(visMap);
    setFavoritos(new Set((f || []).map((item: any) => item.conteudo_id)));
    setLoading(false);
  };

  const conteudosFaseAtual = useMemo(() =>
    conteudos.filter(c => c.fase === faseAtual).sort((a, b) => a.ordem - b.ordem),
    [conteudos, faseAtual]
  );

  const conteudosFasesAnteriores = useMemo(() =>
    conteudos.filter(c => fasesAcessiveis.includes(c.fase) && c.fase !== faseAtual),
    [conteudos, fasesAcessiveis, faseAtual]
  );

  const vistos = conteudosFaseAtual.filter(c => visualizacoes[c.id]).length;
  const totalFase = conteudosFaseAtual.length;
  const pct = totalFase > 0 ? Math.round((vistos / totalFase) * 100) : 0;

  const filteredConteudos = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return conteudos.filter(c =>
      fasesAcessiveis.includes(c.fase) && (
        c.titulo.toLowerCase().includes(q) ||
        (c.tags || []).some(t => t.toLowerCase().includes(q)) ||
        CATEGORIAS[c.categoria]?.toLowerCase().includes(q)
      )
    );
  }, [searchQuery, conteudos, fasesAcessiveis]);

  const favoritosConteudos = useMemo(() =>
    conteudos.filter(c => favoritos.has(c.id)),
    [conteudos, favoritos]
  );

  const markAsViewed = async (conteudoId: string) => {
    await supabase.from("conteudo_visualizacoes").upsert({
      conteudo_id: conteudoId,
      paciente_id: paciente.id,
      visto: true,
      visto_em: new Date().toISOString(),
    }, { onConflict: "conteudo_id,paciente_id" });
    setVisualizacoes(prev => ({ ...prev, [conteudoId]: true }));
  };

  const toggleFavorite = async (conteudoId: string) => {
    if (favoritos.has(conteudoId)) {
      await supabase.from("conteudo_favoritos").delete()
        .eq("conteudo_id", conteudoId).eq("paciente_id", paciente.id);
      setFavoritos(prev => { const n = new Set(prev); n.delete(conteudoId); return n; });
    } else {
      await supabase.from("conteudo_favoritos").insert({
        conteudo_id: conteudoId, paciente_id: paciente.id,
      });
      setFavoritos(prev => new Set(prev).add(conteudoId));
    }
  };

  if (loading) return <div className="py-12 text-center text-muted-foreground text-sm">Carregando conteúdos...</div>;

  // Content viewer
  if (viewingContent) {
    return (
      <ContentViewer
        content={viewingContent}
        isViewed={!!visualizacoes[viewingContent.id]}
        isFavorite={favoritos.has(viewingContent.id)}
        onBack={() => setViewingContent(null)}
        onMarkViewed={() => markAsViewed(viewingContent.id)}
        onToggleFavorite={() => toggleFavorite(viewingContent.id)}
        readProgress={readProgress}
        setReadProgress={setReadProgress}
      />
    );
  }

  // Favorites view
  if (showFavorites) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setShowFavorites(false)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <h2 className="text-lg font-bold text-foreground">Meus Favoritos</h2>
        {favoritosConteudos.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">Nenhum conteúdo salvo ainda</p>
        ) : (
          favoritosConteudos.map(c => (
            <ContentCard key={c.id} content={c} isViewed={!!visualizacoes[c.id]}
              isFavorite={true} onClick={() => setViewingContent(c)} onToggleFavorite={() => toggleFavorite(c.id)} />
          ))
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Phase banner */}
      <div className="rounded-2xl p-4 text-white" style={{ background: `linear-gradient(135deg, ${faseInfo.cor}, ${faseInfo.cor}dd)` }}>
        <div className="flex items-center gap-2 mb-2">
          <faseInfo.icon className="h-5 w-5" />
          <span className="text-sm font-bold">Você está na fase: {faseInfo.label}</span>
        </div>
        {/* Phase progress bar */}
        <div className="flex items-center gap-2 mt-3">
          {FASES.map((f, i) => (
            <div key={f.id} className="flex items-center gap-1">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                i < faseAtualIdx ? "bg-white/30 border-white/50" :
                i === faseAtualIdx ? "bg-white border-white shadow-lg" :
                "bg-transparent border-white/30"
              }`} style={i === faseAtualIdx ? { color: faseInfo.cor } : {}}>
                {i < faseAtualIdx ? <Check className="h-3 w-3 text-white" /> :
                  i === faseAtualIdx ? f.label[0] : f.label[0]}
              </div>
              {i < FASES.length - 1 && <div className={`h-0.5 w-4 ${i < faseAtualIdx ? "bg-white/50" : "bg-white/20"}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Progress card */}
      <Card className="rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">{vistos} de {totalFase} conteúdos visualizados</span>
            <span className="text-sm font-bold" style={{ color: faseInfo.cor }}>{pct}%</span>
          </div>
          <Progress value={pct} className="h-2.5" />
          <p className="text-xs text-muted-foreground mt-2 italic">{getIncentive(pct)}</p>
        </CardContent>
      </Card>

      {/* Search and favorites */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar conteúdo..." className="pl-9 rounded-xl"
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <Button variant="outline" size="icon" className="rounded-xl shrink-0" onClick={() => setShowFavorites(true)}>
          <Bookmark className="h-4 w-4" />
        </Button>
      </div>

      {/* Search results */}
      {filteredConteudos ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{filteredConteudos.length} resultado(s)</p>
          {filteredConteudos.map(c => (
            <ContentCard key={c.id} content={c} isViewed={!!visualizacoes[c.id]}
              isFavorite={favoritos.has(c.id)} onClick={() => setViewingContent(c)}
              onToggleFavorite={() => toggleFavorite(c.id)} showFase />
          ))}
        </div>
      ) : (
        <>
          {/* Current phase contents */}
          <div className="space-y-2">
            {conteudosFaseAtual.map(c => (
              <ContentCard key={c.id} content={c} isViewed={!!visualizacoes[c.id]}
                isFavorite={favoritos.has(c.id)} onClick={() => { setViewingContent(c); setReadProgress(0); }}
                onToggleFavorite={() => toggleFavorite(c.id)} />
            ))}
            {conteudosFaseAtual.length === 0 && (
              <p className="text-center py-8 text-muted-foreground text-sm">Nenhum conteúdo disponível nesta fase ainda.</p>
            )}
          </div>

          {/* Previous phases */}
          {conteudosFasesAnteriores.length > 0 && (
            <div>
              <button onClick={() => setShowPrevious(!showPrevious)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2">
                {showPrevious ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Conteúdos das fases anteriores ({conteudosFasesAnteriores.length})
              </button>
              {showPrevious && (
                <div className="space-y-2 mt-2">
                  {conteudosFasesAnteriores.map(c => (
                    <ContentCard key={c.id} content={c} isViewed={!!visualizacoes[c.id]}
                      isFavorite={favoritos.has(c.id)} onClick={() => { setViewingContent(c); setReadProgress(0); }}
                      onToggleFavorite={() => toggleFavorite(c.id)} showFase />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Phase complete */}
          {pct >= 100 && totalFase > 0 && (
            <Card className="rounded-2xl border-2" style={{ borderColor: faseInfo.cor }}>
              <CardContent className="p-4 text-center">
                <p className="font-bold text-foreground">Você concluiu todos os conteúdos desta fase!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Seu progresso já aparece para o seu nutri, que avalia a passagem para a próxima fase.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ContentCard({ content, isViewed, isFavorite, onClick, onToggleFavorite, showFase }: {
  content: Conteudo; isViewed: boolean; isFavorite: boolean;
  onClick: () => void; onToggleFavorite: () => void; showFase?: boolean;
}) {
  const TipoIcon = TIPO_ICONS[content.tipo] || FileText;
  const fase = FASES.find(f => f.id === content.fase);

  return (
    <Card className={`rounded-2xl overflow-hidden transition-shadow hover:shadow-md cursor-pointer`}
      style={{ borderLeft: `4px solid ${isViewed ? "#22C55E" : "#D1D5DB"}` }}>
      <CardContent className="p-3 flex items-center gap-3" onClick={onClick}>
        <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: (fase?.cor || "#666") + "15" }}>
          <TipoIcon className="h-5 w-5" style={{ color: fase?.cor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Badge className={`text-[9px] px-1.5 py-0 ${TIPO_BADGE[content.tipo]}`}>
              {TIPO_LABELS[content.tipo]}
            </Badge>
            {showFase && fase && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0" style={{ color: fase.cor, borderColor: fase.cor + "50" }}>
                {fase.label}
              </Badge>
            )}
          </div>
          <h4 className="font-semibold text-sm text-foreground truncate mt-0.5">{content.titulo}</h4>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{CATEGORIAS[content.categoria]}</span>
            {content.duracao_estimada && <span>• {content.duracao_estimada}</span>}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 shrink-0">
          <button onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
            className="p-1 hover:bg-muted rounded-full transition-colors">
            {isFavorite
              ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              : <Star className="h-4 w-4 text-muted-foreground" />
            }
          </button>
          {isViewed && <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
        </div>
      </CardContent>
    </Card>
  );
}

function ContentViewer({ content, isViewed, isFavorite, onBack, onMarkViewed, onToggleFavorite, readProgress, setReadProgress }: {
  content: Conteudo; isViewed: boolean; isFavorite: boolean;
  onBack: () => void; onMarkViewed: () => void; onToggleFavorite: () => void;
  readProgress: number; setReadProgress: (v: number) => void;
}) {
  const fase = FASES.find(f => f.id === content.fase);
  const [justMarked, setJustMarked] = useState(false);

  const handleMark = () => {
    onMarkViewed();
    setJustMarked(true);
    setTimeout(() => setJustMarked(false), 2000);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (content.tipo !== "texto") return;
    const el = e.currentTarget;
    const pct = Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100);
    setReadProgress(Math.min(pct, 100));
  };

  return (
    <div className="space-y-3">
      {content.tipo === "texto" && (
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${readProgress}%` }} />
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <button onClick={onToggleFavorite} className="p-2 hover:bg-muted rounded-full">
          {isFavorite
            ? <Bookmark className="h-5 w-5 fill-primary text-primary" />
            : <BookmarkPlus className="h-5 w-5 text-muted-foreground" />
          }
        </button>
      </div>

      <div>
        <Badge className={`text-[10px] ${TIPO_BADGE[content.tipo]}`}>{TIPO_LABELS[content.tipo]}</Badge>
        <h2 className="text-lg font-bold text-foreground mt-1">{content.titulo}</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <span>{CATEGORIAS[content.categoria]}</span>
          {content.duracao_estimada && <span>• {content.duracao_estimada}</span>}
          {fase && <Badge variant="outline" className="text-[10px]" style={{ color: fase.cor, borderColor: fase.cor + "40" }}>{fase.label}</Badge>}
        </div>
        {content.descricao && <p className="text-sm text-muted-foreground mt-2">{content.descricao}</p>}
      </div>

      {/* Video */}
      {content.tipo === "video" && content.url_midia && (
        <div className="rounded-xl overflow-hidden bg-black aspect-video">
          {content.url_midia.includes("youtu") ? (
            <iframe src={`https://www.youtube.com/embed/${extractYoutubeId(content.url_midia)}`}
              className="w-full h-full" allowFullScreen />
          ) : content.url_midia.includes("vimeo") ? (
            <iframe src={`https://player.vimeo.com/video/${extractVimeoId(content.url_midia)}`}
              className="w-full h-full" allowFullScreen />
          ) : (
            <div className="flex items-center justify-center h-full text-white text-sm">
              <a href={content.url_midia} target="_blank" rel="noopener noreferrer" className="underline">Abrir vídeo</a>
            </div>
          )}
        </div>
      )}

      {/* Text content */}
      {content.tipo === "texto" && content.conteudo_texto && (
        <div className="bg-card rounded-xl p-4 max-h-[60vh] overflow-y-auto" onScroll={handleScroll}>
          <div className="prose prose-sm max-w-none text-foreground leading-relaxed"
            style={{ fontSize: "16px", lineHeight: "1.7" }}>
            {content.conteudo_texto.split("\n").map((line, i) => {
              if (line.startsWith("### ")) return <h3 key={i} className="text-base font-bold mt-4 mb-2">{line.replace("### ", "")}</h3>;
              if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-bold mt-4 mb-2">{line.replace("## ", "")}</h2>;
              if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-bold mt-4 mb-2">{line.replace("# ", "")}</h1>;
              if (line.startsWith("- ")) return <li key={i} className="ml-4">{line.replace("- ", "")}</li>;
              if (line.startsWith("> ")) return <blockquote key={i} className="border-l-4 border-primary pl-3 italic text-muted-foreground my-2">{line.replace("> ", "")}</blockquote>;
              if (line.trim() === "---") return <hr key={i} className="my-4" />;
              if (line.trim() === "") return <br key={i} />;
              return <p key={i} className="mb-2">{line}</p>;
            })}
          </div>
        </div>
      )}

      {/* Link */}
      {content.tipo === "link" && content.url_midia && (
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <ExternalLink className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <a href={content.url_midia} target="_blank" rel="noopener noreferrer">
              <Button className="mt-2">Acessar conteúdo</Button>
            </a>
          </CardContent>
        </Card>
      )}

      {/* Audio */}
      {content.tipo === "audio" && content.url_midia && (
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <audio controls className="w-full" src={content.url_midia}>
              Seu navegador não suporta áudio.
            </audio>
          </CardContent>
        </Card>
      )}

      {/* Mark as viewed */}
      <div className="pt-2">
        {justMarked ? (
          <div className="flex items-center justify-center gap-2 py-3 text-emerald-600 font-medium animate-in fade-in">
            <Check className="h-5 w-5" /> Marcado como visto!
          </div>
        ) : !isViewed ? (
          <Button onClick={handleMark} className="w-full rounded-xl" style={{ backgroundColor: "#22C55E" }}>
            <Check className="h-4 w-4 mr-1" />
            {content.tipo === "video" ? "Marcar como assistido" :
              content.tipo === "link" ? "Marcar como acessado" : "Marcar como lido"}
          </Button>
        ) : (
          <div className="flex items-center justify-center gap-2 py-2 text-emerald-600 text-sm">
            <Check className="h-4 w-4" /> Você já visualizou este conteúdo
          </div>
        )}
      </div>
    </div>
  );
}

function extractYoutubeId(url: string): string {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
  return match?.[1] || "";
}

function extractVimeoId(url: string): string {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match?.[1] || "";
}
