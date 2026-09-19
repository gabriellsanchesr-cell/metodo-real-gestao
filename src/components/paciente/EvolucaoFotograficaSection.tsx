import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Camera, Plus, Trash2, Loader2, ArrowLeftRight } from "lucide-react";
import { format } from "date-fns";

const ANGULOS = [
  { value: "frente", label: "Frente" },
  { value: "lateral", label: "Lateral" },
  { value: "costas", label: "Costas" },
];

const BUCKET = "evolucao-fotos";

interface Props {
  paciente: any;
}

export function EvolucaoFotograficaSection({ paciente }: Props) {
  const { session } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fotos, setFotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadDate, setUploadDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [uploadAngulo, setUploadAngulo] = useState("frente");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [compareDate1, setCompareDate1] = useState("");
  const [compareDate2, setCompareDate2] = useState("");

  useEffect(() => { loadFotos(); }, [paciente.id]);

  const loadFotos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("evolucao_fotos")
      .select("*")
      .eq("paciente_id", paciente.id)
      .order("data_registro", { ascending: false });
    setFotos(data || []);
    setLoading(false);
  };

  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const generateUrls = async () => {
      const paths = fotos.map(f => f.foto_path).filter(Boolean);
      if (paths.length === 0) return;
      const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
      if (data) {
        const urlMap: Record<string, string> = {};
        data.forEach((item) => { if (item.signedUrl) urlMap[item.path!] = item.signedUrl; });
        setSignedUrls(urlMap);
      }
    };
    generateUrls();
  }, [fotos]);

  const getPublicUrl = (path: string) => {
    return signedUrls[path] || '';
  };

  const handleUpload = async () => {
    if (!session?.user?.id || selectedFiles.length === 0) return;
    setUploading(true);
    try {
      for (const file of selectedFiles) {
        const ext = file.name.split(".").pop();
        const path = `${paciente.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: storageErr } = await supabase.storage.from(BUCKET).upload(path, file);
        if (storageErr) throw storageErr;
        const { error: dbErr } = await supabase.from("evolucao_fotos").insert({
          paciente_id: paciente.id,
          user_id: session.user.id,
          data_registro: uploadDate,
          angulo: uploadAngulo,
          foto_path: path,
        });
        if (dbErr) throw dbErr;
      }
      toast({ title: "Fotos enviadas!", description: `${selectedFiles.length} foto(s) adicionada(s).` });
      setUploadOpen(false);
      setSelectedFiles([]);
      loadFotos();
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (foto: any) => {
    await supabase.storage.from(BUCKET).remove([foto.foto_path]);
    await supabase.from("evolucao_fotos").delete().eq("id", foto.id);
    toast({ title: "Foto removida" });
    loadFotos();
  };

  const dates = [...new Set(fotos.map(f => f.data_registro))].sort().reverse();
  const groupedByDate = dates.map(d => ({ date: d, photos: fotos.filter(f => f.data_registro === d) }));

  const compareFotos1 = fotos.filter(f => f.data_registro === compareDate1);
  const compareFotos2 = fotos.filter(f => f.data_registro === compareDate2);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg md:text-xl font-semibold text-[#0E1E35]">Evolução Fotográfica</h2>
        <div className="flex gap-2 flex-wrap">
          {dates.length >= 2 && (
            <Button variant="outline" size="sm" onClick={() => setCompareMode(!compareMode)} className="border-[#004AAD] text-[#004AAD]">
              <ArrowLeftRight className="h-4 w-4 mr-1" /> {compareMode ? "Fechar comparação" : "Comparar"}
            </Button>
          )}
          <Button size="sm" onClick={() => setUploadOpen(true)} className="bg-[#004AAD] hover:bg-[#004AAD]/90">
            <Plus className="h-4 w-4 mr-1" /> Adicionar fotos
          </Button>
        </div>
      </div>

      {compareMode && (
        <Card className="border-[#E2E5F0] rounded-xl">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Data 1</Label>
                <Select value={compareDate1} onValueChange={setCompareDate1}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{dates.map(d => <SelectItem key={d} value={d}>{format(new Date(d + "T12:00:00"), "dd/MM/yyyy")}</SelectItem>)}</SelectContent>
                </Select>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {compareFotos1.map(f => (
                    <div key={f.id} className="space-y-1">
                      <img src={getPublicUrl(f.foto_path)} className="rounded-lg object-cover aspect-[3/4] w-full" />
                      <Badge variant="secondary" className="text-xs">{ANGULOS.find(a => a.value === f.angulo)?.label}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>Data 2</Label>
                <Select value={compareDate2} onValueChange={setCompareDate2}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{dates.map(d => <SelectItem key={d} value={d}>{format(new Date(d + "T12:00:00"), "dd/MM/yyyy")}</SelectItem>)}</SelectContent>
                </Select>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {compareFotos2.map(f => (
                    <div key={f.id} className="space-y-1">
                      <img src={getPublicUrl(f.foto_path)} className="rounded-lg object-cover aspect-[3/4] w-full" />
                      <Badge variant="secondary" className="text-xs">{ANGULOS.find(a => a.value === f.angulo)?.label}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {fotos.length === 0 ? (
        <Card className="border-[#E2E5F0] rounded-xl">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Camera className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhuma foto registrada ainda.</p>
            <Button onClick={() => setUploadOpen(true)} className="bg-[#004AAD] hover:bg-[#004AAD]/90">
              <Plus className="h-4 w-4 mr-1" /> Adicionar fotos
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedByDate.map(({ date, photos }) => (
            <div key={date} className="space-y-3">
              <h3 className="text-sm font-medium text-[#6B7080]">{format(new Date(date + "T12:00:00"), "dd/MM/yyyy")}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map(f => (
                  <div key={f.id} className="group relative">
                    <img src={getPublicUrl(f.foto_path)} className="rounded-xl object-cover aspect-[3/4] w-full border border-[#E2E5F0]" />
                    <Badge className="absolute top-2 left-2 text-xs" variant="secondary">
                      {ANGULOS.find(a => a.value === f.angulo)?.label}
                    </Badge>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(f)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Adicionar Fotos</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Data do registro</Label>
              <Input type="date" value={uploadDate} onChange={e => setUploadDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Ângulo</Label>
              <Select value={uploadAngulo} onValueChange={setUploadAngulo}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{ANGULOS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fotos</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="mt-1 block w-full max-w-full text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-muted file:text-foreground"
                onChange={e => setSelectedFiles(Array.from(e.target.files || []))}
              />
              {selectedFiles.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{selectedFiles.length} arquivo(s) selecionado(s)</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={uploading || selectedFiles.length === 0} className="bg-[#004AAD] hover:bg-[#004AAD]/90">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
