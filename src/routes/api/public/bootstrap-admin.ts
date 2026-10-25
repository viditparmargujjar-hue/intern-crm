import { createFileRoute } from "@tanstack/react-router";

const ADMIN_EMAIL = "crm1intern@gmail.com";

/** One-time, idempotent: creates the initial admin only when no admin exists yet. */
export const Route = createFileRoute("/api/public/bootstrap-admin")({
  server: {
    handlers: {
      POST: async () => {
        const password = process.env["ADMIN_INITIAL_PASSWORD"];
        if (!password) return Response.json({ error: "not configured" }, { status: 500 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { count } = await supabaseAdmin
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "admin");
        if (count) return Response.json({ ok: true, created: false });

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: ADMIN_EMAIL,
          password,
          email_confirm: true,
          user_metadata: { full_name: "Admin" },
        });
        if (error || !data.user) return Response.json({ error: error?.message }, { status: 500 });
        const { error: roleErr } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: data.user.id, role: "admin" });
        if (roleErr) return Response.json({ error: roleErr.message }, { status: 500 });
        return Response.json({ ok: true, created: true });
      },
    },
  },
});
