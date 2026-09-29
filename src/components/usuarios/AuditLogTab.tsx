import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format } from "date-fns";

const tipoLabels: Record<string, string> = {
  login: "Login", logout: "Logout", criacao: "Criação", edicao: "Edição",
  exclusao: "Exclusão", ativacao: "Ativação", desativacao: "Desativação",
  redefinicao_senha: "Redefinição de Senha", alteracao_permissoes: "Alteração de Permissões",
  exportacao_pdf: "Exportação de PDF", exclusao_dados: "Exclusão de Dados", outro: "Outro",
};

const tipoBadgeClass: Record<string, string> = {
  login: "bg-blue-50 text-blue-700", logout: "bg-muted text-muted-foreground",
  criacao: "bg-emerald-50 text-emerald-700", exclusao: "bg-red-50 text-red-700",
  desativacao: "bg-amber-50 text-amber-700", redefinicao_senha: "bg-purple-50 text-purple-700",
};

export function AuditLogTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("todos");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      setLogs((data as any) || []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = logs.filter(l => {
    const matchSearch = !search || l.user_name?.toLowerCase().includes(search.toLowerCase()) || l.acao?.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === "todos" || l.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  const exportCSV = () => {
    const headers = ["Data/Hora", "Usuário", "Tipo", "Ação", "Detalhes"];
    const rows = filtered.map(l => [
      format(new Date(l.created_at), "dd/MM/yyyy HH:mm"),
      l.user_name || "",
      tipoLabels[l.tipo] || l.tipo,
      l.acao,
      l.detalhes || "",
    ]);
    const escapeCell = (value: unknown) => {
      const text = String(value ?? "");
      const formulaSafe = /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
      return `"${formulaSafe.replace(/"/g, '""')}"`;
    };
    const csv = [headers, ...rows].map(r => r.map(escapeCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Input placeholder="Buscar por usuário ou ação..." value={search} onChange={e => setSearch(e.target.value)} className="w-64" />
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {Object.entries(tipoLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</TableCell></TableRow>
            ) : filtered.map(l => (
              <TableRow key={l.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(l.created_at), "dd/MM/yyyy HH:mm")}
                </TableCell>
                <TableCell className="text-sm">{l.user_name || "Sistema"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${tipoBadgeClass[l.tipo] || ""}`}>
                    {tipoLabels[l.tipo] || l.tipo}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{l.acao}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{l.detalhes || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
