import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Users, MoreHorizontal, UserCheck, UserX, Pencil, Trash2, KeyRound, Loader2, X, Archive, ArchiveRestore } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { PacienteAccessModal } from "@/components/PacienteAccessModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/Loading";
import { format } from "date-fns";


const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ativo: { label: "Ativo", variant: "default" },
  desativado: { label: "Inativo", variant: "destructive" },
  sem_conta: { label: "Sem conta", variant: "outline" },
};

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

export default function Pacientes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");

  const [accessModal, setAccessModal] = useState<{ open: boolean; paciente: any; mode: "create" | "edit" }>({
    open: false, paciente: null, mode: "create",
  });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; paciente: any }>({
    open: false, paciente: null,
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkFase, setBulkFase] = useState("");

  useEffect(() => {
    if (user) loadPacientes();
  }, [user]);

  const loadPacientes = async () => {
    const { data } = await supabase
      .from("pacientes")
      .select("*")
      .order("nome_completo");
    setPacientes(data || []);
    setCarregando(false);
  };

  const filtered = pacientes.filter((p) => {
    const matchBusca = p.nome_completo.toLowerCase().includes(busca.toLowerCase());
    const arquivado = p.ativo === false;
    if (filtroStatus === "arquivados") return matchBusca && arquivado;
    if (arquivado) return false;
    const status = p.account_status || "sem_conta";
    const matchStatus = filtroStatus === "todos" || status === filtroStatus;
    return matchBusca && matchStatus;
  });


  /** Quantos pacientes cada filtro traria, ignorando a busca por nome. */
  const contagens: Record<string, number> = {
    todos: pacientes.filter((p) => p.ativo !== false).length,
    ativo: pacientes.filter((p) => p.ativo !== false && (p.account_status || "sem_conta") === "ativo").length,
    desativado: pacientes.filter((p) => p.ativo !== false && (p.account_status || "sem_conta") === "desativado").length,
    sem_conta: pacientes.filter((p) => p.ativo !== false && (p.account_status || "sem_conta") === "sem_conta").length,
    arquivados: pacientes.filter((p) => p.ativo === false).length,
  };
  const selectedPacientes = pacientes.filter((p) => selected.includes(p.id));

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.includes(p.id));

  const toggleOne = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleAllFiltered = () =>
    setSelected(allFilteredSelected ? [] : filtered.map((p) => p.id));

  const invokeAuth = async (action: string, paciente_id: string) => {
    const { data, error } = await supabase.functions.invoke("manage-patient-auth", {
      body: { action, paciente_id },
    });
    if (error || data?.error) throw new Error(data?.error || error?.message);
  };

  const runBulk = async (label: string, fn: (p: any) => Promise<void>, items: any[] = selectedPacientes) => {
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
    await loadPacientes();
    toast({
      title: errors.length ? "Concluído com falhas" : "Sucesso",
      description: `${label}: ${ok} de ${items.length}.${errors.length ? ` Falhas: ${errors.slice(0, 3).join(" | ")}` : ""}`,
      variant: errors.length ? "destructive" : undefined,
    });
  };

  const bulkDeactivate = () =>
    runBulk("Acessos desativados", (p) => invokeAuth("deactivate", p.id),
      selectedPacientes.filter((p) => p.account_status === "ativo"));

  const bulkReactivate = () =>
    runBulk("Acessos reativados", (p) => invokeAuth("reactivate", p.id),
      selectedPacientes.filter((p) => p.account_status === "desativado"));

  const bulkDelete = async () => {
    setBulkDeleteOpen(false);
    await runBulk("Pacientes excluídos", (p) => invokeAuth("delete", p.id));
  };

  const bulkSetFase = async (fase: string) => {
    setBulkFase("");
    await runBulk("Fase atualizada", async (p) => {
      const { error } = await supabase.from("pacientes").update({ fase_real: fase as any }).eq("id", p.id);
      if (error) throw error;
    });
  };

  const bulkSetAtivo = (ativo: boolean) =>
    runBulk(ativo ? "Cadastros reativados" : "Cadastros arquivados", async (p) => {
      const { error } = await supabase.from("pacientes").update({ ativo }).eq("id", p.id);
      if (error) throw error;
    });


  const handleAction = async (action: "deactivate" | "reactivate", paciente: any) => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-patient-auth", {
        body: { action, paciente_id: paciente.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Sucesso", description: action === "deactivate" ? "Acesso desativado." : "Acesso reativado." });
      loadPacientes();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.paciente) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-patient-auth", {
        body: { action: "delete", paciente_id: deleteModal.paciente.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Sucesso", description: "Paciente excluído permanentemente." });
      setDeleteModal({ open: false, paciente: null });
      loadPacientes();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pacientes"
        description={`${filtered.length} paciente${filtered.length !== 1 ? "s" : ""} encontrado${filtered.length !== 1 ? "s" : ""}`}
        icon={Users}
      >
        <Button onClick={() => navigate("/pacientes/novo")} className="rounded-xl">
          <Plus className="h-4 w-4 mr-2" /> Novo Paciente
        </Button>
      </PageHeader>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar paciente..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-10 rounded-xl" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["todos", "ativo", "desativado", "sem_conta", "arquivados"].map((s) => (
            <Button
              key={s}
              variant={filtroStatus === s ? "default" : "outline"}
              size="sm"
              onClick={() => { setFiltroStatus(s); setSelected([]); }}
              className="rounded-full px-4 text-xs"
            >
              {s === "todos" ? "Todos" : s === "arquivados" ? "Arquivados" : statusConfig[s]?.label || s}
              <span className="ml-1.5 tabular-nums opacity-70">{contagens[s] ?? 0}</span>
            </Button>
          ))}
        </div>
      </div>




      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium text-foreground">
            {selected.length} selecionado{selected.length !== 1 ? "s" : ""}
          </span>
          {bulkBusy && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <Select value={bulkFase} onValueChange={bulkSetFase} disabled={bulkBusy}>
              <SelectTrigger className="w-[170px] h-9 rounded-xl text-xs"><SelectValue placeholder="Alterar fase R.E.A.L." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rotina">Rotina</SelectItem>
                <SelectItem value="estrategia">Estratégia</SelectItem>
                <SelectItem value="autonomia">Autonomia</SelectItem>
                <SelectItem value="liberdade">Liberdade</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="rounded-xl" disabled={bulkBusy} onClick={bulkDeactivate}>
              <UserX className="h-4 w-4 mr-1.5" /> Desativar acesso
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" disabled={bulkBusy} onClick={bulkReactivate}>
              <UserCheck className="h-4 w-4 mr-1.5" /> Reativar acesso
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" disabled={bulkBusy} onClick={() => bulkSetAtivo(false)}>
              <Archive className="h-4 w-4 mr-1.5" /> Arquivar
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" disabled={bulkBusy} onClick={() => bulkSetAtivo(true)}>
              <ArchiveRestore className="h-4 w-4 mr-1.5" /> Reativar cadastro
            </Button>
            <Button variant="destructive" size="sm" className="rounded-xl" disabled={bulkBusy} onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1.5" /> Excluir
            </Button>
            <Button variant="ghost" size="sm" className="rounded-xl" disabled={bulkBusy} onClick={() => setSelected([])}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {carregando ? (
        <TableSkeleton rows={6} cols={4} />
      ) : (
      <div className="border rounded-xl overflow-hidden shadow-sm bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[40px]">
                  <Checkbox checked={allFilteredSelected} onCheckedChange={toggleAllFiltered} aria-label="Selecionar todos" />
                </TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden xl:table-cell">E-mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Cadastro</TableHead>
                <TableHead className="w-[60px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const status = p.account_status || "sem_conta";
                const cfg = statusConfig[status] || statusConfig.sem_conta;
                return (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => navigate(`/pacientes/${p.id}`)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.includes(p.id)} onCheckedChange={() => toggleOne(p.id)} aria-label={`Selecionar ${p.nome_completo}`} />
                    </TableCell>
                    <TableCell>

                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                          {getInitials(p.nome_completo)}
                        </div>
                        <span className="font-medium text-foreground truncate">{p.nome_completo}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden xl:table-cell">{p.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={cfg.variant} className="rounded-full whitespace-nowrap">{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden sm:table-cell">
                      {p.created_at ? format(new Date(p.created_at), "dd/MM/yyyy") : "—"}
                    </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {status === "sem_conta" && (
                          <DropdownMenuItem onClick={() => setAccessModal({ open: true, paciente: p, mode: "create" })}>
                            <KeyRound className="h-4 w-4 mr-2" /> Criar Acesso
                          </DropdownMenuItem>
                        )}
                        {status === "ativo" && (
                          <>
                            <DropdownMenuItem onClick={() => setAccessModal({ open: true, paciente: p, mode: "edit" })}>
                              <Pencil className="h-4 w-4 mr-2" /> Editar Acesso
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction("deactivate", p)}>
                              <UserX className="h-4 w-4 mr-2" /> Desativar
                            </DropdownMenuItem>
                          </>
                        )}
                        {status === "desativado" && (
                          <DropdownMenuItem onClick={() => handleAction("reactivate", p)}>
                            <UserCheck className="h-4 w-4 mr-2" /> Reativar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteModal({ open: true, paciente: p })}>
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    icon={busca ? Search : Users}
                    title={busca ? `Nenhum paciente para "${busca}"` : "Nenhum paciente neste filtro"}
                    description={busca
                      ? "Confira a grafia ou limpe a busca para ver a lista inteira."
                      : "Troque o filtro acima ou cadastre a primeira paciente."}
                    action={busca
                      ? <Button variant="outline" onClick={() => setBusca("")}>Limpar busca</Button>
                      : <Button onClick={() => navigate("/pacientes/novo")}><Plus className="h-4 w-4 mr-2" /> Novo Paciente</Button>}
                  />
                </TableCell>
              </TableRow>
            )}
            </TableBody>
          </Table>
        </div>
      </div>
      )}

      {accessModal.paciente && (
        <PacienteAccessModal
          open={accessModal.open}
          onOpenChange={(v) => setAccessModal((s) => ({ ...s, open: v }))}
          pacienteId={accessModal.paciente.id}
          pacienteNome={accessModal.paciente.nome_completo}
          pacienteEmail={accessModal.paciente.email}
          mode={accessModal.mode}
          onSuccess={loadPacientes}
        />
      )}

      {deleteModal.paciente && (
        <DeleteConfirmModal
          open={deleteModal.open}
          onOpenChange={(v) => setDeleteModal((s) => ({ ...s, open: v }))}
          pacienteNome={deleteModal.paciente.nome_completo}
          onConfirm={handleDelete}
          loading={actionLoading}
        />
      )}

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selected.length} paciente(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente e remove os cadastros e acessos selecionados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={bulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
