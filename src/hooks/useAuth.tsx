import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "nutri" | "paciente" | "equipe" | null;

interface EquipePermissoes {
  [modulo: string]: { [permissao: string]: boolean };
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  role: AppRole;
  isNutri: boolean;
  isAdmin: boolean;
  isEquipe: boolean;
  isPaciente: boolean;
  equipePermissoes: EquipePermissoes;
  equipeMembro: any;
  hasPermission: (modulo: string, permissao: string) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  role: null,
  isNutri: false,
  isAdmin: false,
  isEquipe: false,
  isPaciente: false,
  equipePermissoes: {},
  equipeMembro: null,
  hasPermission: () => false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);
  const [equipePermissoes, setEquipePermissoes] = useState<EquipePermissoes>({});
  const [equipeMembro, setEquipeMembro] = useState<any>(null);

  const fetchRole = async (userId: string) => {
    try {
      const rolePromise = supabase.rpc("get_user_role", { _user_id: userId });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 5000)
      );
      const { data, error } = await Promise.race([rolePromise, timeoutPromise]) as any;

      if (!error && data) {
        const r = data as AppRole;
        setRole(r);
        if (r === "equipe") {
          const { data: membro } = await supabase
            .from("equipe_membros")
            .select("*")
            .eq("auth_user_id", userId)
            .single();
          if (membro) {
            setEquipeMembro(membro);
            setEquipePermissoes((membro as any).permissoes || {});
          }
        } else {
          setEquipeMembro(null);
          setEquipePermissoes({});
        }
      } else {
        setRole(null);
      }
    } catch {
      setRole(null);
    }
  };

  useEffect(() => {
    // Safety net: force loading=false after 5s no matter what
    const safetyTimer = setTimeout(() => setLoading(false), 5000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          // Defer to avoid Supabase deadlock inside the callback
          setTimeout(() => {
            fetchRole(newSession.user.id).finally(() => {
              clearTimeout(safetyTimer);
              setLoading(false);
            });
          }, 0);
        } else {
          setRole(null);
          setEquipeMembro(null);
          setEquipePermissoes({});
          clearTimeout(safetyTimer);
          setLoading(false);
        }
      }
    );

    // Then get the current session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (!currentSession) {
        clearTimeout(safetyTimer);
        setLoading(false);
      }
      // If session exists, onAuthStateChange will handle role fetch + setLoading
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  const signOut = async () => {
    // "local": sair neste aparelho não derruba o login dos outros. O padrão
    // (global) encerrava todas as sessões, e a aba que ficou aberta em outro
    // lugar passava a receber "Token inválido" das funções.
    await supabase.auth.signOut({ scope: "local" });
    setRole(null);
    setEquipeMembro(null);
    setEquipePermissoes({});
  };

  const hasPermission = (modulo: string, permissao: string): boolean => {
    if (role === "nutri") return true;
    if (role !== "equipe") return false;
    return !!equipePermissoes?.[modulo]?.[permissao];
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
      role,
      isNutri: role === "nutri",
      isAdmin: role === "nutri",
      isEquipe: role === "equipe",
      isPaciente: role === "paciente",
      equipePermissoes,
      equipeMembro,
      hasPermission,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
