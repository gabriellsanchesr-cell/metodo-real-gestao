import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Shield, ScrollText, Settings } from "lucide-react";
import { EquipeTab } from "@/components/usuarios/EquipeTab";
import { PacientesTab } from "@/components/usuarios/PacientesTab";
import { AuditLogTab } from "@/components/usuarios/AuditLogTab";
import { ConfigUsuariosTab } from "@/components/usuarios/ConfigUsuariosTab";
import { PageHeader } from "@/components/PageHeader";

export default function GestaoUsuarios() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Usuários"
        description="Gerencie equipe, pacientes, auditoria e configurações de acesso"
        icon={Shield}
      />
      <Tabs defaultValue="equipe" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="equipe" className="gap-2"><Shield className="h-4 w-4" /> Equipe</TabsTrigger>
          <TabsTrigger value="pacientes" className="gap-2"><Users className="h-4 w-4" /> Pacientes</TabsTrigger>
          <TabsTrigger value="auditoria" className="gap-2"><ScrollText className="h-4 w-4" /> Auditoria</TabsTrigger>
          <TabsTrigger value="configuracoes" className="gap-2"><Settings className="h-4 w-4" /> Configurações</TabsTrigger>
        </TabsList>
        <TabsContent value="equipe"><EquipeTab /></TabsContent>
        <TabsContent value="pacientes"><PacientesTab /></TabsContent>
        <TabsContent value="auditoria"><AuditLogTab /></TabsContent>
        <TabsContent value="configuracoes"><ConfigUsuariosTab /></TabsContent>
      </Tabs>
    </div>
  );
}
