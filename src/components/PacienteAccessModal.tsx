import { chamarFuncao } from "@/lib/funcoes";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PacienteAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pacienteId: string;
  pacienteNome: string;
  pacienteEmail?: string;
  mode: "create" | "edit";
  onSuccess: () => void;
}

export function PacienteAccessModal({
  open, onOpenChange, pacienteId, pacienteNome, pacienteEmail, mode, onSuccess,
}: PacienteAccessModalProps) {
  const [email, setEmail] = useState(pacienteEmail || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const action = mode === "create" ? "create" : "update";
      const payload: Record<string, string> = { action, paciente_id: pacienteId };
      
      if (mode === "create") {
        payload.email = email;
        payload.password = password;
        payload.nome_completo = pacienteNome;
      } else {
        if (email && email !== pacienteEmail) payload.email = email;
        if (password) payload.password = password;
      }

      // Mostra o motivo real do servidor e renova a sessão se o login caiu.
      await chamarFuncao("manage-patient-auth", payload);

      toast({
        title: "Sucesso",
        description: mode === "create" ? "Acesso criado com sucesso." : "Dados atualizados com sucesso.",
      });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Criar Acesso" : "Editar Acesso"} — {pacienteNome}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="modal-email">E-mail de acesso</Label>
            <Input
              id="modal-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="paciente@email.com"
              required={mode === "create"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="modal-password">{mode === "create" ? "Senha inicial" : "Nova senha (deixe vazio para manter)"}</Label>
            <Input
              id="modal-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required={mode === "create"}
              minLength={6}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : mode === "create" ? "Criar Acesso" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
