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
import { Plus, Search, Users, MoreHorizontal, UserCheck, UserX, Pencil, Trash2, KeyRound, Loader2, X, Archive, ArchiveRestore, PauseCircle, PlayCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { PacienteAccessModal } from "@/components/PacienteAccessModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/Loading";
import { format } from "date-fns";
import { arquivarPaciente, definirInativo, descreverIgnoradas, gerenciarAcesso, separarPorAcesso } from "@/lib/acessoPortal";
import { ArquivarPacientesDialog } from "@/components/paciente/ArquivarPacientesDialog";
import { AcessoPortalControle } from "@/components/paciente/AcessoPortalControle";
import { listarContratosAtivos } from "@/lib/contratosApi";
import { emAcompanhamento, pacientesVencidos, usaPortal } from "@/lib/painel";


/** Situação do acesso ao portal. "Ativo" na clínica é outra coisa: ver FILTROS. */
const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ativo: { label: "Usa o portal", variant: "default" },
  desativado: { label: "Portal bloqueado", variant: "destructive" },
  sem_conta: { label: "Sem portal", variant: "outline" },
};

/**
 * Filtros da lista. "Ativos" é quem está em acompanhamento, com ou sem
 * portal (não arquivada e não vencida); "Usam o portal" é só o acesso.
 * Antes eram a mesma coisa, e quem é atendida sem portal sumia de "Ativo".
 */
const FILTROS = [
  { id: "todos", rotulo: "Todos" },
  { id: "ativos", rotulo: "Ativos" },
  { id: "portal", rotulo: "Usam o portal" },
  { id: "vencidos", rotulo: "Vencidos" },
  { id: "inativos", rotulo: "Inativos" },
  { id: "desativado", rotulo: "Portal bloqueado" },
  { id: "sem_conta", rotulo: "Sem portal" },
  { id: "arquivados", rotulo: "Arquivados" },
] as const;

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

export default function Pacientes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [confirmarArquivar, setConfirmarArquivar] = useState(false);
  const [busca, setBusca] = useState("");
  const [searchParams] = useSearchParams();
  const [filtroStatus, setFiltroStatus] = useState<string>(() => {
    const f = searchParams.get("filtro");
    return FILTROS.some((x) => x.id === f) ? f! : "todos";
  });
  const [vencidos, setVencidos] = useState<Set<string>>(new Set());

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
    const [{ data }, contratos] = await Promise.all([
      supabase.from("pacientes").select("*").order("nome_completo"),
      listarContratosAtivos().catch(() => []),
    ]);
    setPacientes(data || []);
    setVencidos(pacientesVencidos(contratos));
    setCarregando(false);
  };

  const passaNoFiltro = (p: { id: string; ativo?: boolean | null; inativo?: boolean | null; account_status?: string | null }, filtro: string) => {
    if (filtro === "arquivados") return p.ativo === false;
    if (p.ativo === false) return false;
    if (filtro === "todos") return true;
    if (filtro === "ativos") return emAcompanhamento(p, vencidos);
    if (filtro === "portal") return usaPortal(p);
    if (filtro === "inativos") return p.inativo === true;
    // Inativa já parou: o vencimento dela não pede mais ação.
    if (filtro === "vencidos") return vencidos.has(p.id) && p.inativo !== true;
    return (p.account_status || "sem_conta") === filtro;
  };

  const filtered = pacientes.filter((p) =>
    p.nome_completo.toLowerCase().includes(busca.toLowerCase()) && passaNoFiltro(p, filtroStatus));


  /**
   * Arquivadas que combinam com a busca mas não aparecem por causa do filtro.
   * Sem isto, procurar uma paciente arquivada devolve "nenhum resultado" e
   * parece que ela sumiu do sistema.
   */
  const arquivadasNaBusca = busca.trim() && filtroStatus !== "arquivados"
    ? pacientes.filter((p) => p.ativo === false && p.nome_completo.toLowerCase().includes(busca.toLowerCase()))
    : [];

  /** Quantos pacientes cada filtro traria, ignorando a busca por nome. */
  const contagens: Record<string, number> = Object.fromEntries(
    FILTROS.map((f) => [f.id, pacientes.filter((p) => passaNoFiltro(p, f.id)).length]),
  );
  const selectedPacientes = pacientes.filter((p) => selected.includes(p.id));

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.includes(p.id));

  const toggleOne = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleAllFiltered = () =>
    setSelected(allFilteredSelected ? [] : filtered.map((p) => p.id));

  const invokeAuth = (action: "deactivate" | "reactivate" | "delete", paciente_id: string) =>
    gerenciarAcesso(action, paciente_id);

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

  // Antes, quem não se encaixava era descartado em silêncio: selecionar só
  // pacientes sem conta e clicar em "Desativar acesso" não fazia nada, sem aviso.
  const acessoEmMassa = async (action: "deactivate" | "reactivate") => {
    const { aplicaveis, ignoradas } = separarPorAcesso(selectedPacientes, action);
    const nomes = descreverIgnoradas(ignoradas);
    if (aplicaveis.length === 0) {
      toast({
        title: action === "deactivate" ? "Nenhum acesso para bloquear" : "Nenhum acesso para liberar",
        description: `${nomes}. Para quem não tem conta, use "Criar acesso" ao lado do nome.`,
      });
      return;
    }
    await runBulk(action === "deactivate" ? "Acessos bloqueados" : "Acessos liberados",
      (p) => invokeAuth(action, p.id), aplicaveis);
    if (ignoradas.length) toast({ title: "Algumas ficaram de fora", description: `${nomes}.` });
  };
  const bulkDeactivate = () => acessoEmMassa("deactivate");
  const bulkReactivate = () => acessoEmMassa("reactivate");
  const podemBloquear = separarPorAcesso(selectedPacientes, "deactivate").aplicaveis.length;
  const podemLiberar = separarPorAcesso(selectedPacientes, "reactivate").aplicaveis.length;

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

  const bulkArquivar = (bloquear: boolean) =>
    runBulk(bloquear ? "Arquivadas e com acesso bloqueado" : "Cadastros arquivados", (p) => arquivarPaciente(p, bloquear));

  const bulkInativo = (inativo: boolean) =>
    runBulk(inativo ? "Marcadas como inativas" : "Marcadas como ativas", (p) => definirInativo(p.id, inativo));

  const alternarInativo = async (p: { id: string; nome_completo: string; inativo?: boolean | null }) => {
    const inativo = p.inativo !== true;
    setActionLoading(true);
    try {
      await definirInativo(p.id, inativo);
      toast({ title: inativo ? "Paciente inativa" : "Paciente ativa de novo", description: p.nome_completo.trim() });
      loadPacientes();
    } catch (err) {
      toast({ title: "Não consegui alterar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const bulkSetAtivo = (ativo: boolean) =>
    runBulk(ativo ? "Cadastros reativados" : "Cadastros arquivados", async (p) => {
      const { error } = await supabase.from("pacientes").update({ ativo }).eq("id", p.id);
      if (error) throw error;
    });


  const handleAction = async (action: "deactivate" | "reactivate", paciente: any) => {
    setActionLoading(true);
    try {
      await gerenciarAcesso(action, paciente.id);
      toast({
        title: action === "deactivate" ? "Acesso ao portal bloqueado" : "Acesso ao portal liberado",
        description: paciente.nome_completo.trim(),
      });
      loadPacientes();
    } catch (err: any) {
      toast({ title: "Não consegui alterar o acesso", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.paciente) return;
    setActionLoading(true);
    try {
      await gerenciarAcesso("delete", deleteModal.paciente.id);
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
          {FILTROS.map((f) => (
            <Button
              key={f.id}
              variant={filtroStatus === f.id ? "default" : "outline"}
              size="sm"
              onClick={() => { setFiltroStatus(f.id); setSelected([]); }}
              className="rounded-full px-4 text-xs"
            >
              {f.rotulo}
              <span className="ml-1.5 tabular-nums opacity-70">{contagens[f.id] ?? 0}</span>
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
                <SelectItem value="rotina">Rastreio</SelectItem>
                <SelectItem value="estrategia">Estratégia</SelectItem>
                <SelectItem value="autonomia">Ajuste</SelectItem>
                <SelectItem value="liberdade">Lifestyle</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="rounded-xl" disabled={bulkBusy} onClick={bulkDeactivate}
              title={podemBloquear ? undefined : "Nenhuma selecionada está com o portal liberado"}>
              <UserX className="h-4 w-4 mr-1.5" /> Bloquear acesso{podemBloquear ? ` (${podemBloquear})` : ""}
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" disabled={bulkBusy} onClick={bulkReactivate}
              title={podemLiberar ? undefined : "Nenhuma selecionada está com o portal bloqueado"}>
              <UserCheck className="h-4 w-4 mr-1.5" /> Liberar acesso{podemLiberar ? ` (${podemLiberar})` : ""}
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" disabled={bulkBusy} onClick={() => bulkInativo(true)}>
              <PauseCircle className="h-4 w-4 mr-1.5" /> Tornar inativo
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" disabled={bulkBusy} onClick={() => bulkInativo(false)}>
              <PlayCircle className="h-4 w-4 mr-1.5" /> Tornar ativo
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" disabled={bulkBusy} onClick={() => setConfirmarArquivar(true)}>
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

      {arquivadasNaBusca.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <Archive className="h-4 w-4 shrink-0 text-warning" />
          <p className="text-foreground">
            {arquivadasNaBusca.length === 1
              ? `${arquivadasNaBusca[0].nome_completo} está arquivada e por isso não aparece nesta lista.`
              : `${arquivadasNaBusca.length} pacientes arquivadas combinam com esta busca.`}
          </p>
          <Button size="sm" variant="outline" className="ml-auto rounded-full" onClick={() => setFiltroStatus("arquivados")}>
            Ver arquivadas
          </Button>
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
                <TableHead>Situação</TableHead>
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
                        {/* A linha inteira abre a ficha; o controle (e o diálogo dele) não pode propagar o clique. */}
                        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                          <AcessoPortalControle
                            compacto
                            nome={p.nome_completo}
                            status={status}
                            carregando={actionLoading}
                            onCriar={() => setAccessModal({ open: true, paciente: p, mode: "create" })}
                            onLiberar={() => handleAction("reactivate", p)}
                            onBloquear={() => handleAction("deactivate", p)}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden xl:table-cell">{p.email || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={cfg.variant} className="rounded-full whitespace-nowrap">{cfg.label}</Badge>
                        {p.ativo !== false && p.inativo === true && (
                          <Badge variant="secondary" className="rounded-full whitespace-nowrap" title="Parou o acompanhamento. Continua na lista, fora de Ativos.">
                            Inativo
                          </Badge>
                        )}
                        {p.ativo !== false && p.inativo !== true && vencidos.has(p.id) && (
                          <Badge
                            variant="outline"
                            className="rounded-full whitespace-nowrap border-destructive/40 bg-destructive/10 text-destructive"
                            title="O acompanhamento venceu e não foi renovado."
                          >
                            Vencido
                          </Badge>
                        )}
                        {p.ativo === false && status === "ativo" && (
                          <Badge
                            variant="outline"
                            className="rounded-full whitespace-nowrap border-warning/40 bg-warning/10 text-warning"
                            title="Arquivar não remove o acesso: esta paciente ainda consegue entrar no portal."
                          >
                            Acesso ativo
                          </Badge>
                        )}
                      </div>
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
                              <UserX className="h-4 w-4 mr-2" /> Bloquear acesso
                            </DropdownMenuItem>
                          </>
                        )}
                        {status === "desativado" && (
                          <DropdownMenuItem onClick={() => handleAction("reactivate", p)}>
                            <UserCheck className="h-4 w-4 mr-2" /> Liberar acesso
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => alternarInativo(p)}>
                          {p.inativo === true
                            ? <><PlayCircle className="h-4 w-4 mr-2" /> Tornar ativo</>
                            : <><PauseCircle className="h-4 w-4 mr-2" /> Tornar inativo</>}
                        </DropdownMenuItem>
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

      <ArquivarPacientesDialog
        open={confirmarArquivar}
        onOpenChange={setConfirmarArquivar}
        pacientes={selectedPacientes}
        onConfirmar={bulkArquivar}
      />

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
