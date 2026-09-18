import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Pacientes from "./pages/Pacientes";
import PacienteForm from "./pages/PacienteForm";
import PacienteDetalhe from "./pages/PacienteDetalhe";
import AnamnesePublica from "./pages/AnamnesePublica";
import QuestionarioPublico from "./pages/QuestionarioPublico";
import Planos from "./pages/Planos";
import Acompanhamento from "./pages/Acompanhamento";
import DiariosAlimentares from "./pages/DiariosAlimentares";
import Agenda from "./pages/Agenda";
import Biblioteca from "./pages/Biblioteca";
import Templates from "./pages/Templates";
import MeuPainel from "./pages/MeuPainel";
import PortalPaciente from "./pages/PortalPaciente";
import Chat from "./pages/Chat";
import GestaoUsuarios from "./pages/GestaoUsuarios";
import TrocarSenha from "./pages/TrocarSenha";
import ConfiguracaoClinica from "./pages/ConfiguracaoClinica";
import ConteudoReal from "./pages/ConteudoReal";
import Suplementos from "./pages/Suplementos";
import Relatorios from "./pages/Relatorios";
import Leads from "./pages/Leads";
import Financeiro from "./pages/Financeiro";
import NotFound from "./pages/NotFound";
import { FullPageLoader } from "@/components/Loading";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, role } = useAuth();
  if (loading) return <FullPageLoader />;
  if (session && role === "paciente") return <Navigate to="/portal" replace />;
  if (session && role === "equipe") return <Navigate to="/" replace />;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, role, equipeMembro } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!session) return <Navigate to="/login" replace />;
  if (role === "paciente") return <Navigate to="/portal" replace />;
  // Force password change for equipe
  if (role === "equipe" && equipeMembro?.deve_trocar_senha) return <Navigate to="/trocar-senha" replace />;
  return <>{children}</>;
}

function PacienteRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, role } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!session) return <Navigate to="/login" replace />;
  if (role === "nutri" || role === "equipe") return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/esqueci-senha" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
            <Route path="/anamnese/:token" element={<AnamnesePublica />} />
            <Route path="/questionario/:token" element={<QuestionarioPublico />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/trocar-senha" element={<ProtectedRoute><TrocarSenha /></ProtectedRoute>} />
            <Route path="/meu-painel" element={<PacienteRoute><MeuPainel /></PacienteRoute>} />
            <Route path="/portal" element={<PacienteRoute><PortalPaciente /></PacienteRoute>} />
            <Route path="/" element={<AdminRoute><AppLayout /></AdminRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="pacientes" element={<Pacientes />} />
              <Route path="pacientes/novo" element={<PacienteForm />} />
              <Route path="pacientes/:id" element={<PacienteDetalhe />} />
              <Route path="chat" element={<Chat />} />
              <Route path="planos" element={<Planos />} />
              <Route path="acompanhamento" element={<Acompanhamento />} />
              <Route path="diarios" element={<DiariosAlimentares />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="biblioteca" element={<Biblioteca />} />
              <Route path="conteudo-real" element={<ConteudoReal />} />
              <Route path="suplementos" element={<Suplementos />} />
              <Route path="templates" element={<Templates />} />
              <Route path="relatorios" element={<Relatorios />} />
              <Route path="leads" element={<Leads />} />
              <Route path="financeiro" element={<Financeiro />} />
              <Route path="configuracoes/geral" element={<ConfiguracaoClinica />} />
              <Route path="configuracoes/usuarios" element={<GestaoUsuarios />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
