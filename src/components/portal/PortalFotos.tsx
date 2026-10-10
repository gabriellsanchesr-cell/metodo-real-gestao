import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, CheckCircle2, Loader2, Lock, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { bloqueadoNaVisualizacao, usePortalModo } from "@/contexts/PortalModoContext";
import { isoLocal } from "@/lib/datas";
import { formatarData } from "@/lib/vencimento";
import { reduzirImagem } from "@/lib/imagem";

const BUCKET = "evolucao-fotos";

const ANGULOS_FOTO = [
  { value: "frente", label: "Frente", dica: "De frente, braços soltos ao lado do corpo" },
  { value: "lateral", label: "Lateral", dica: "De lado, olhando para a frente" },
  { value: "costas", label: "Costas", dica: "De costas, braços soltos" },
] as const;

interface Foto {
  id: string;
  data_registro: string;
  angulo: string;
  foto_path: string;
  enviada_pela_paciente?: boolean | null;
}

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  paciente: any;
}

/**
 * Fotos de evolução enviadas pela própria paciente (frente, lateral e
 * costas). Vão para a mesma galeria que o nutri vê na ficha. Ela apaga só
 * as que enviou. Precisa da migration 20261010130000.
 */
export function PortalFotos({ paciente }: Props) {
  const { modoVisualizacao } = usePortalModo();
  const { toast } = useToast();
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const hoje = isoLocal();

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from("evolucao_fotos")
      .select("*")
      .eq("paciente_id", paciente.id)
      .order("data_registro", { ascending: false })
      .order("created_at", { ascending: false });
    const lista = (data || []) as Foto[];
    setFotos(lista);
    setCarregando(false);
    const paths = lista.map((f) => f.foto_path).filter(Boolean);
    if (paths.length === 0) return;
    const { data: assinadas } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
    const mapa: Record<string, string> = {};
    (assinadas || []).forEach((a) => { if (a.signedUrl && a.path) mapa[a.path] = a.signedUrl; });
    setUrls(mapa);
  }, [paciente.id]);

  useEffect(() => { carregar(); }, [carregar]);

  const enviar = async (angulo: string, arquivo: File) => {
    if (bloqueadoNaVisualizacao(modoVisualizacao)) return;
    if (!arquivo.type.startsWith("image/")) {
      toast({ title: "Escolha uma foto", description: "O arquivo precisa ser uma imagem.", variant: "destructive" });
      return;
    }
    setEnviando(angulo);
    try {
      const blob = await reduzirImagem(arquivo);
      const ext = blob === arquivo ? (arquivo.name.split(".").pop() || "jpg").toLowerCase() : "jpg";
      // Subpasta "paciente": é só nela que a paciente pode gravar e apagar.
      const path = `${paciente.id}/paciente/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: erroArquivo } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || "image/jpeg" });
      if (erroArquivo) throw erroArquivo;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: erroLinha } = await (supabase as any).from("evolucao_fotos").insert({
        paciente_id: paciente.id,
        user_id: paciente.user_id,
        data_registro: hoje,
        angulo,
        foto_path: path,
        enviada_pela_paciente: true,
      });
      if (erroLinha) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw erroLinha;
      }
      toast({ title: "Foto enviada", description: "Só você e o seu nutri têm acesso a ela." });
      carregar();
    } catch (e) {
      console.error("[PortalFotos]", e);
      toast({ title: "Não consegui enviar a foto", description: "Tente de novo em instantes ou mande pelo chat.", variant: "destructive" });
    } finally {
      setEnviando(null);
    }
  };

  const apagar = async (f: Foto) => {
    if (bloqueadoNaVisualizacao(modoVisualizacao)) return;
    if (!window.confirm("Apagar esta foto? Não dá para desfazer.")) return;
    const { error } = await supabase.from("evolucao_fotos").delete().eq("id", f.id);
    if (error) {
      toast({ title: "Não consegui apagar", description: "Tente de novo em instantes.", variant: "destructive" });
      return;
    }
    await supabase.storage.from(BUCKET).remove([f.foto_path]);
    carregar();
  };

  const deHoje = (angulo: string) => fotos.find((f) => f.data_registro.slice(0, 10) === hoje && f.angulo === angulo && f.enviada_pela_paciente);

  const porData = useMemo(() => {
    const grupos = new Map<string, Foto[]>();
    for (const f of fotos) {
      const d = f.data_registro.slice(0, 10);
      grupos.set(d, [...(grupos.get(d) ?? []), f]);
    }
    return [...grupos.entries()];
  }, [fotos]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold text-foreground">Fotos de evolução</h2>
        <p className="text-sm text-muted-foreground">
          Uma de frente, uma de lado e uma de costas. A foto mostra o que a balança não mostra.
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="space-y-3 p-4">
          <p className="text-sm font-semibold text-foreground">Fotos de hoje</p>
          <div className="grid grid-cols-3 gap-2">
            {ANGULOS_FOTO.map((a) => {
              const feita = deHoje(a.value);
              const ocupado = enviando === a.value;
              return (
                <div key={a.value} className="space-y-1.5">
                  <button
                    type="button"
                    disabled={!!enviando}
                    onClick={() => inputs.current[a.value]?.click()}
                    aria-label={`Enviar foto de ${a.label.toLowerCase()}`}
                    className="relative flex aspect-[3/4] w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
                  >
                    {feita && urls[feita.foto_path] ? (
                      <>
                        <img src={urls[feita.foto_path]} alt={`Foto de ${a.label.toLowerCase()} de hoje`} className="absolute inset-0 h-full w-full object-cover" />
                        <CheckCircle2 className="absolute right-1.5 top-1.5 h-5 w-5 rounded-full bg-white text-emerald-600" />
                      </>
                    ) : ocupado ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6" />
                    )}
                  </button>
                  <p className="text-center text-xs font-medium text-foreground">{a.label}</p>
                  <input
                    ref={(el) => { inputs.current[a.value] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const arq = e.target.files?.[0]; if (arq) enviar(a.value, arq); e.target.value = ""; }}
                  />
                </div>
              );
            })}
          </div>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>Mesmo lugar, mesma luz e, se der, a mesma roupa das fotos anteriores.</li>
            <li>Celular apoiado na altura da cintura, corpo inteiro no enquadramento.</li>
            <li>De preferência de manhã, antes de comer.</li>
          </ul>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 shrink-0" /> Só você e o seu nutri veem estas fotos.
          </p>
        </CardContent>
      </Card>

      {carregando ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : porData.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Sua evolução</h3>
          {porData.map(([data, lista]) => (
            <div key={data} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{formatarData(data)}</p>
              <div className="grid grid-cols-3 gap-2">
                {lista.map((f) => (
                  <div key={f.id} className="relative">
                    {urls[f.foto_path]
                      ? <img src={urls[f.foto_path]} alt={`Foto de ${f.angulo} em ${formatarData(data)}`} loading="lazy" className="aspect-[3/4] w-full rounded-xl border object-cover" />
                      : <div className="aspect-[3/4] w-full rounded-xl border bg-muted" />}
                    <Badge variant="secondary" className="absolute left-1.5 top-1.5 text-[10px]">
                      {ANGULOS_FOTO.find((a) => a.value === f.angulo)?.label ?? f.angulo}
                    </Badge>
                    {f.enviada_pela_paciente && (
                      <Button size="icon" variant="secondary" className="absolute bottom-1.5 right-1.5 h-7 w-7 rounded-full" onClick={() => apagar(f)} aria-label="Apagar foto">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
