import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, ChevronRight, Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FASE_GERAL, tagDaAba, type AbaBiblioteca } from "@/lib/fases";
import { TextoConteudo, abrirArquivoConteudo } from "./TextoConteudo";

interface ItemBiblioteca {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  conteudo_texto: string | null;
  arquivo_path: string | null;
  url_midia: string | null;
  duracao_estimada: string | null;
  ordem: number | null;
}

/**
 * Material do método que todo paciente recebe, por aba do portal. Vem de
 * conteudos_real com fase "geral" e a tag "aba:<id>", publicado pelo nutri
 * em Conteúdo R.E.A.L. > Biblioteca. Fica abaixo do que é só do paciente.
 */
export function BibliotecaPortal({ aba, titulo, descricao }: { aba: AbaBiblioteca; titulo: string; descricao?: string }) {
  const { toast } = useToast();
  const [itens, setItens] = useState<ItemBiblioteca[] | null>(null);
  const [aberto, setAberto] = useState<ItemBiblioteca | null>(null);

  useEffect(() => {
    let cancelado = false;
    supabase
      .from("conteudos_real")
      .select("id, titulo, descricao, tipo, conteudo_texto, arquivo_path, url_midia, duracao_estimada, ordem")
      .eq("status", "publicado")
      .eq("fase", FASE_GERAL)
      .contains("tags", [tagDaAba(aba)])
      .order("ordem")
      .then(({ data }) => { if (!cancelado) setItens((data as ItemBiblioteca[]) || []); });
    return () => { cancelado = true; };
  }, [aba]);

  const abrirPdf = async (item: ItemBiblioteca) => {
    if (!item.arquivo_path) return;
    const ok = await abrirArquivoConteudo(item.arquivo_path);
    if (!ok) toast({ title: "Arquivo indisponível no momento", description: "Avise o seu nutri pelo chat.", variant: "destructive" });
  };

  const abrir = (item: ItemBiblioteca) => {
    if (item.tipo === "link" && item.url_midia) { window.open(item.url_midia, "_blank", "noopener"); return; }
    if (item.tipo === "pdf" && !item.conteudo_texto) { abrirPdf(item); return; }
    setAberto(item);
  };

  if (!itens || itens.length === 0) return null;

  if (aberto) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setAberto(null)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground leading-tight">{aberto.titulo}</h2>
          {aberto.descricao && <p className="text-sm text-muted-foreground mt-1">{aberto.descricao}</p>}
        </div>
        {aberto.arquivo_path && (
          <Button className="w-full rounded-xl" onClick={() => abrirPdf(aberto)}>
            <Download className="h-4 w-4 mr-2" /> Abrir o guia completo em PDF
          </Button>
        )}
        {aberto.conteudo_texto && (
          <Card className="rounded-2xl"><CardContent className="p-5"><TextoConteudo texto={aberto.conteudo_texto} /></CardContent></Card>
        )}
      </div>
    );
  }

  return (
    <section className="space-y-3 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold text-foreground">{titulo}</h2>
        {descricao && <p className="text-sm text-muted-foreground">{descricao}</p>}
      </div>
      {itens.map((item) => {
        const soPdf = item.tipo === "pdf" && !item.conteudo_texto;
        return (
          <Card key={item.id} className="rounded-2xl cursor-pointer hover:shadow-md transition-all" onClick={() => abrir(item)}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${soPdf ? "bg-red-50" : "bg-primary/10"}`}>
                {soPdf ? <FileText className="h-5 w-5 text-red-600" /> : <BookOpen className="h-5 w-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground leading-snug">{item.titulo}</h3>
                {item.descricao && <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{item.descricao}</p>}
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <Badge variant="secondary" className="text-[10px]">{soPdf ? "PDF" : "Leitura"}</Badge>
                  {!soPdf && item.arquivo_path && <Badge variant="outline" className="text-[10px]">+ PDF</Badge>}
                  {item.duracao_estimada && <span className="text-xs text-muted-foreground">{item.duracao_estimada}</span>}
                </div>
              </div>
              {soPdf ? <Download className="h-4 w-4 text-muted-foreground shrink-0 mt-1" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
