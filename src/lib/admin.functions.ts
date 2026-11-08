import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin-only: lists every account with its role. */
export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only admins can view accounts.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data, error }, roles] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ perPage: 200 }),
      supabaseAdmin.from("user_roles").select("user_id, role").eq("role", "admin"),
    ]);
    if (error) throw new Error(error.message);
    const admins = new Set((roles.data ?? []).map((r) => r.user_id));

    return data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      name: (u.user_metadata?.["full_name"] as string | undefined) ?? u.email ?? "",
      role: admins.has(u.id) ? "admin" : "intern",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    }));
  });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Only admins can manage registrations.");
}

/** Admin-only: all intern registration requests, newest first. */
export const listRegistrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("registration_requests")
      .select("id, user_id, full_name, email, status, created_at, reviewed_at, reviewed_by")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

/** Admin-only, append-only decisions for one registration. */
export const listRegistrationHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input?.id ?? ""))
      throw new Error("Invalid registration");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: history, error } = await context.supabase
      .from("registration_review_history")
      .select("id, previous_status, status, reviewed_by, reviewer_name, reviewer_email, reviewed_at, historical")
      .eq("registration_id", data.id)
      .order("reviewed_at", { ascending: false });
    if (error) throw new Error(error.message);
    return history;
  });

/** Admin-only: approve or reject someone else's registration. */
export const reviewRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: "approved" | "rejected" }) => {
    if (typeof input?.id !== "string" || !["approved", "rejected"].includes(input.status))
      throw new Error("Invalid request");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("registration_requests")
      .update({ status: data.status, reviewed_by: context.userId, reviewed_at: new Date().toISOString() })
      .eq("id", data.id)
      .neq("user_id", context.userId)
      .select("id, status")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Request not found, or you cannot review your own account.");
    return { ...row, emailSent: false };
  });
