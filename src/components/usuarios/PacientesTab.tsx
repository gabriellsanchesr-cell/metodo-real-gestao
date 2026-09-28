import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, KeyRound, Power, Shield, Trash2, Plus, Loader2, X } from "lucide-react";
import { PacienteAccessModal } from "@/components/PacienteAccessModal";
import { PortalPermissoesModal } from "./PortalPermissoesModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { arquivarPaciente, descreverIgnoradas, gerenciarAcesso, separarPorAcesso } from "@/lib/acessoPortal";
import { ArquivarPacientesDialog } from "@/components/paciente/ArquivarPacientesDialog";


const statusBadge: Record<string, string> = {
  ativo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  desativado: "bg-muted text-muted-foreground",
  sem_conta: "bg-amber-50 text-amber-700 border-amber-200",
};

const faseLabels: Record<string, string> = {
  rotina: "Rotina", estrategia: "Estratégia", autonomia: "Autonomia", liberdade: "Liberdade",
};

export function PacientesTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterFase, setFilterFase] = useState("todos");
  const [accessModal, setAccessModal] = useState<{ pac: any; mode: "create" | "edit" } | null>(null);
  const [portalPermsTarget, setPortalPermsTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkFase, setBulkFase] = useState("");
  const [confirmarArquivar, setConfirmarArquivar] = useState(false);


  const load = async () => {
    const { data } = await supabase.from("pacientes").select("*").order("nome_completo");
    setPacientes((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = pacientes.filter(p => {
    const matchSearch = !search || p.nome_completo?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase());
    const status = p.account_status || "sem_conta";
    const matchStatus = filterStatus === "todos" || status === filterStatus;
    const matchFase = filterFase === "todos" || p.fase_real === filterFase;
    return matchSearch && matchStatus && matchFase;
  });

  const toggleAtivo = async (pac: any) => {
    if (!pac.auth_user_id) return;
    const action = pac.account_status === "ativo" ? "deactivate" : "reactivate";
    try {
      await gerenciarAcesso(action, pac.id);
      toast({ title: action === "deactivate" ? "Acesso ao portal bloqueado" : "Acesso ao portal liberado", description: pac.nome_completo });
      load();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await gerenciarAcesso("delete", deleteTarget.id);
      toast({ title: "Sucesso", description: "Paciente excluído." });
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const selectedPacientes = pacientes.filter(p => selected.includes(p.id));
  const allFilteredSelected = filtered.length > 0 && filtered.every(p => selected.includes(p.id));

  const toggleOne = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleAllFiltered = () =>
    setSelected(allFilteredSelected ? [] : filtered.map(p => p.id));

  const runBulk = async (
    label: string,
    fn: (p: any) => Promise<void>,
    items: any[] = selectedPacientes,
  ) => {
    if (items.length === 0) return;
    setBulkBusy(true);
    let ok = 0;
    const errors: string[] = [];
    for (const p of items) {
      try {
        await fn(p);
        ok++;
      } catch (err: any) {
        errors.push(`${p.nome_completo}: ${err.message}`);
      }
    }
    setBulkBusy(false);
    setSelected([]);
    await load();
    toast({
      title: errors.length ? "Concluído com falhas" : "Sucesso",
      description: `${label}: ${ok} de ${items.length}.${errors.length ? ` Falhas: ${errors.slice(0, 3).join(" | ")}` : ""}`,
      variant: errors.length ? "destructive" : undefined,
    });
  };

  const invokeAuth = (action: "deactivate" | "reactivate" | "delete", paciente_id: string) =>
    gerenciarAcesso(action, paciente_id);

  // Quem não se encaixa (sem conta, já bloqueada) era descartado em silêncio.
  const acessoEmMassa = async (action: "deactivate" | "reactivate") => {
    const { aplicaveis, ignoradas } = separarPorAcesso(selectedPacientes, action);
    if (aplicaveis.length === 0) {
      toast({
        title: action === "deactivate" ? "Nenhum acesso para bloquear" : "Nenhum acesso para liberar",
        description: `${descreverIgnoradas(ignoradas)}.`,
      });
      return;
    }
    await runBulk(action === "deactivate" ? "Acessos bloqueados" : "Acessos liberados", p => invokeAuth(action, p.id), aplicaveis);
    if (ignoradas.length) toast({ title: "Algumas ficaram de fora", description: `${descreverIgnoradas(ignoradas)}.` });
  };
  const bulkDeactivate = () => acessoEmMassa("deactivate");
  const bulkReactivate = () => acessoEmMassa("reactivate");
  const bulkArquivar = (bloquear: boolean) =>
    runBulk(bloquear ? "Arquivadas e com acesso bloqueado" : "Pacientes arquivados", p => arquivarPaciente(p, bloquear));

  const bulkDelete = async () => {
    setBulkDeleteOpen(false);
    await runBulk("Pacientes excluídos", p => invokeAuth("delete", p.id));
  };

  const bulkSetFase = async (fase: string) => {
    setBulkFase("");
    await runBulk("Fase atualizada", async (p) => {
      const { error } = await supabase.from("pacientes").update({ fase_real: fase as any }).eq("id", p.id);
      if (error) throw error;
    });
  };

  const bulkSetAtivo = (ativo: boolean) =>
    runBulk(ativo ? "Pacientes marcados como ativos" : "Pacientes arquivados", async (p) => {
      const { error } = await supabase.from("pacientes").update({ ativo }).eq("id", p.id);
      if (error) throw error;
    });



  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="Buscar por nome ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} className="w-64" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="desativado">Inativo</SelectItem>
              <SelectItem value="sem_conta">Sem conta</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterFase} onValueChange={setFilterFase}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Fase" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="rotina">Rotina</SelectItem>
              <SelectItem value="estrategia">Estratégia</SelectItem>
              <SelectItem value="autonomia">Autonomia</SelectItem>
              <SelectItem value="liberdade">Liberdade</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => navigate("/pacientes/novo")} className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar Paciente
        </Button>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-primary/5 p-3">
          <span className="text-sm font-medium text-foreground">
            {selected.length} selecionado{selected.length > 1 ? "s" : ""}
          </span>
          {bulkBusy && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          <div className="mx-1 h-5 w-px bg-border" />
          <Select value={bulkFase} onValueChange={bulkSetFase} disabled={bulkBusy}>
            <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Alterar fase R.E.A.L." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="rotina">Rotina</SelectItem>
              <SelectItem value="estrategia">Estratégia</SelectItem>
              <SelectItem value="autonomia">Autonomia</SelectItem>
              <SelectItem value="liberdade">Liberdade</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" disabled={bulkBusy} onClick={bulkDeactivate}>Bloquear acesso</Button>
          <Button variant="outline" size="sm" disabled={bulkBusy} onClick={bulkReactivate}>Liberar acesso</Button>
          <Button variant="outline" size="sm" disabled={bulkBusy} onClick={() => setConfirmarArquivar(true)}>Arquivar</Button>
          <Button variant="outline" size="sm" disabled={bulkBusy} onClick={() => bulkSetAtivo(true)}>Reativar cadastro</Button>
          <Button variant="destructive" size="sm" disabled={bulkBusy} onClick={() => setBulkDeleteOpen(true)} className="gap-1">
            <Trash2 className="h-4 w-4" /> Excluir
          </Button>
          <Button variant="ghost" size="sm" disabled={bulkBusy} onClick={() => setSelected([])} className="gap-1">
            <X className="h-4 w-4" /> Limpar
          </Button>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={toggleAllFiltered}
                  aria-label="Selecionar todos"
                />
              </TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Fase</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum paciente encontrado</TableCell></TableRow>
            ) : filtered.map((p) => {

              const status = p.account_status || "sem_conta";
              return (
                <TableRow key={p.id} data-state={selected.includes(p.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selected.includes(p.id)}
                      onCheckedChange={() => toggleOne(p.id)}
                      aria-label={`Selecionar ${p.nome_completo}`}
                    />
                  </TableCell>
                  <TableCell>

                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                        {p.nome_completo?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{p.nome_completo}</p>
                        <p className="text-xs text-muted-foreground">{p.email || "Sem e-mail"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.fase_real ? <Badge variant="outline">{faseLabels[p.fase_real] || p.fase_real}</Badge> : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusBadge[status] || statusBadge.sem_conta}>
                      {status === "ativo" ? "Ativo" : status === "desativado" ? "Inativo" : "Sem conta"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(p.created_at), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/pacientes/${p.id}`)} title="Ver perfil">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {status === "sem_conta" ? (
                        <Button variant="ghost" size="icon" onClick={() => setAccessModal({ pac: p, mode: "create" })} title="Criar acesso">
                          <KeyRound className="h-4 w-4 text-amber-600" />
                        </Button>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => setAccessModal({ pac: p, mode: "edit" })} title="Editar acesso">
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => toggleAtivo(p)} title={status === "ativo" ? "Desativar" : "Reativar"}>
                            <Power className={`h-4 w-4 ${status === "ativo" ? "text-emerald-600" : "text-muted-foreground"}`} />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setPortalPermsTarget(p)} title="Permissões do portal">
                        <Shield className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(p)} title="Excluir">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {accessModal && (
        <PacienteAccessModal
          open
          onOpenChange={() => setAccessModal(null)}
          pacienteId={accessModal.pac.id}
          pacienteNome={accessModal.pac.nome_completo}
          pacienteEmail={accessModal.pac.email}
          mode={accessModal.mode}
          onSuccess={load}
        />
      )}
      {portalPermsTarget && (
        <PortalPermissoesModal open onOpenChange={() => setPortalPermsTarget(null)} paciente={portalPermsTarget} />
      )}
      <DeleteConfirmModal
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        pacienteNome={deleteTarget?.nome_completo || ""}
        onConfirm={handleDelete}
      />
      <ArquivarPacientesDialog
        open={confirmarArquivar}
        onOpenChange={setConfirmarArquivar}
        pacientes={selectedPacientes}
        onConfirmar={bulkArquivar}
      />
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selected.length} paciente(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente e remove os dados e acessos dos pacientes selecionados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={bulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>

  );
}
