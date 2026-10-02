import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Não autorizado" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await callerClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return json({ error: "Token inválido" }, 401);
    }

    const callerId = userData.user.id;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "nutri")
      .single();

    if (!roleData) {
      return json({ error: "Apenas nutricionistas podem gerenciar contas" }, 403);
    }

    const body = await req.json();
    const { action, paciente_id, email, password, nome_completo } = body;

    // Verify caller owns the patient (skip ownership check is none of these are mutating other-tenant data)
    const assertOwnership = async (pid: string) => {
      const { data: p } = await adminClient
        .from('pacientes')
        .select('user_id, auth_user_id')
        .eq('id', pid)
        .single();
      if (!p) return { error: json({ error: 'Paciente não encontrado' }, 404) };
      if (p.user_id !== callerId) return { error: json({ error: 'Acesso negado' }, 403) };
      return { paciente: p };
    };

    switch (action) {
      case "create": {
        if (!email || !password || !paciente_id) {
          return json({ error: "Email, senha e paciente_id são obrigatórios" }, 400);
        }
        const ownCreate = await assertOwnership(paciente_id);
        if ('error' in ownCreate) return ownCreate.error;

        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { nome_completo: nome_completo || "" },
        });

        if (createError) return json({ error: createError.message }, 400);

        await adminClient.from("user_roles").insert({ user_id: newUser.user.id, role: "paciente" });

        await adminClient
          .from("pacientes")
          .update({ auth_user_id: newUser.user.id, account_status: "ativo", email })
          .eq("id", paciente_id);

        return json({ success: true, user_id: newUser.user.id });
      }

      case "update": {
        if (!paciente_id) return json({ error: "paciente_id é obrigatório" }, 400);
        const own = await assertOwnership(paciente_id);
        if ('error' in own) return own.error;
        const paciente = own.paciente;

        if (!paciente?.auth_user_id) {
          return json({ error: "Paciente não tem conta vinculada" }, 400);
        }

        const updates: Record<string, unknown> = {};
        if (email) updates.email = email;
        if (password) updates.password = password;

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await adminClient.auth.admin.updateUserById(
            paciente.auth_user_id,
            updates
          );
          if (updateError) return json({ error: updateError.message }, 400);
        }

        if (email) {
          await adminClient.from("pacientes").update({ email }).eq("id", paciente_id);
        }

        return json({ success: true });
      }

      case "deactivate": {
        if (!paciente_id) return json({ error: "paciente_id é obrigatório" }, 400);
        const own = await assertOwnership(paciente_id);
        if ('error' in own) return own.error;
        const paciente = own.paciente;

        if (!paciente?.auth_user_id) {
          return json({ error: "Paciente não tem conta vinculada" }, 400);
        }

        await adminClient.auth.admin.updateUserById(paciente.auth_user_id, {
          ban_duration: "876600h",
        });

        await adminClient.from("pacientes").update({ account_status: "desativado" }).eq("id", paciente_id);
        return json({ success: true });
      }

      case "reactivate": {
        if (!paciente_id) return json({ error: "paciente_id é obrigatório" }, 400);
        const own = await assertOwnership(paciente_id);
        if ('error' in own) return own.error;
        const paciente = own.paciente;

        if (!paciente?.auth_user_id) {
          return json({ error: "Paciente não tem conta vinculada" }, 400);
        }

        await adminClient.auth.admin.updateUserById(paciente.auth_user_id, {
          ban_duration: "none",
        });

        await adminClient.from("pacientes").update({ account_status: "ativo" }).eq("id", paciente_id);
        return json({ success: true });
      }

      case "delete": {
        if (!paciente_id) return json({ error: "paciente_id é obrigatório" }, 400);
        const own = await assertOwnership(paciente_id);
        if ('error' in own) return own.error;
        const paciente = own.paciente;

        if (paciente?.auth_user_id) {
          await adminClient.auth.admin.deleteUser(paciente.auth_user_id);
        }

        await adminClient.from("pacientes").delete().eq("id", paciente_id);
        return json({ success: true });
      }


      default:
        return json({ error: "Ação inválida" }, 400);
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (error) {
    console.error('Unexpected error:', error);
    return json({ error: 'Erro interno do servidor' }, 500);
  }
});
