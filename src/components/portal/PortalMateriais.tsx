import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, FileText, Link as LinkIcon, ExternalLink, Download } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { usePortalModo } from "@/contexts/PortalModoContext";

const CAT_LABEL: Record<string, string> = {
  ebook: "E-book", video: "Vídeo", receita: "Receita", treino: "Treino",
  lista_compras: "Lista de compras", artigo: "Artigo", outro: "Outro",
};

export function PortalMateriais({ paciente }: { paciente: any }) {
  const { modoVisualizacao } = usePortalModo();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [paciente.id]);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("materiais_paciente").select("*").eq("paciente_id", paciente.id)
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  const markSeen = async (m: any) => {
    if (m.visto_em || modoVisualizacao) return;
    await (supabase as any).from("materiais_paciente").update({ visto_em: new Date().toISOString() }).eq("id", m.id);
  };

  const handleOpen = async (m: any) => {
    if (m.tipo === "link" && m.url_externa) {
      window.open(m.url_externa, "_blank", "noopener");
      markSeen(m);
      return;
    }
    if (m.arquivo_path) {
      const { data, error } = await supabase.storage.from("documentos-pdf").createSignedUrl(m.arquivo_path, 3600);
      if (error || !data) { toast({ title: "Erro ao abrir arquivo", variant: "destructive" }); return; }
      window.open(data.signedUrl, "_blank", "noopener");
      markSeen(m);
    }
  };

  if (loading) {
    return <Card className="rounded-2xl"><CardContent className="py-8 text-center text-muted-foreground">Carregando...</CardContent></Card>;
  }

  if (items.length === 0) {
    return (
      <Card className="rounded-2xl border-dashed">
        <CardContent className="py-12 text-center">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-semibold text-foreground">Sem materiais ainda</p>
          <p className="text-sm text-muted-foreground mt-1">Materiais extras enviados pelo nutricionista aparecerão aqui.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {items.map(m => (
        <Card key={m.id} className="rounded-2xl cursor-pointer hover:shadow-md transition-all" onClick={() => handleOpen(m)}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${m.tipo === "link" ? "bg-blue-100" : "bg-primary/10"}`}>
                {m.tipo === "link" ? <LinkIcon className="h-5 w-5 text-blue-600" /> : <FileText className="h-5 w-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <h4 className="font-semibold text-foreground">{m.titulo}</h4>
                  <Badge variant="secondary" className="text-xs">{CAT_LABEL[m.categoria] || m.categoria}</Badge>
                </div>
                {m.descricao && <p className="text-sm text-muted-foreground line-clamp-2">{m.descricao}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(m.created_at), "dd/MM/yyyy")}
                </p>
              </div>
              {m.tipo === "link" ? <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 mt-1" /> : <Download className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
