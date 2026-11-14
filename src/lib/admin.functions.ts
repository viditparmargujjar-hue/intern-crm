import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin-only: lists every account with its role. */
export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Only admins can view accounts.");

    const [profiles, roles] = await Promise.all([
      context.supabase.from("profiles").select("id, full_name, email, created_at").order("created_at"),
      context.supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
    ]);
    if (profiles.error) throw new Error(profiles.error.message);
    if (roles.error) throw new Error(roles.error.message);
    const admins = new Set((roles.data ?? []).map((r) => r.user_id));

    return (profiles.data ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? "",
      name: u.full_name ?? u.email ?? "",
      role: admins.has(u.id) ? "admin" : "intern",
      created_at: u.created_at,
      last_sign_in_at: null as string | null,
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
