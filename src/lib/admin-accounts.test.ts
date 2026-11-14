import { beforeEach, expect, it, vi } from "vitest";

// Exercise the real handler without executing the framework's RPC transport.
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
      handler: (handler: unknown) => handler,
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

import { listAccounts } from "./admin.functions";

const run = listAccounts as unknown as (input: { context: { userId: string; supabase: unknown } }) => Promise<Array<{ id: string; role: string; name: string; email: string; created_at: string; last_sign_in_at: string | null }>>;
const profiles = [{ id: "admin-id", full_name: "Admin", email: "admin@example.invalid", created_at: "2026-10-25T19:00:43Z" }, { id: "intern-id", full_name: "Intern", email: "intern@example.invalid", created_at: "2026-11-06T14:26:07Z" }];
const rpc = vi.fn();
const from = vi.fn((table: string) => ({ select: () => ({
  order: async () => ({ data: profiles, error: null }),
  eq: async () => ({ data: table === "user_roles" ? [{ user_id: "admin-id", role: "admin" }] : [], error: null }),
}) }));
beforeEach(() => { vi.clearAllMocks(); });

it("reads accounts using only the authenticated client without a service key", async () => {
  rpc.mockResolvedValue({ data: true, error: null });
  const result = await run({ context: { userId: "admin-id", supabase: { rpc, from } } });
  expect(rpc).toHaveBeenCalledWith("has_role", { _user_id: "admin-id", _role: "admin" });
  expect(result).toEqual(profiles.map(p => ({ id: p.id, name: p.full_name, email: p.email, created_at: p.created_at, role: p.id === "admin-id" ? "admin" : "intern", last_sign_in_at: null })));
  expect(from.mock.calls.map(([table]) => table)).toEqual(["profiles", "user_roles"]);
});

it("rejects interns before reading account information", async () => {
  rpc.mockResolvedValue({ data: false, error: null });
  await expect(run({ context: { userId: "intern-id", supabase: { rpc, from } } })).rejects.toThrow("Only admins can view accounts.");
  expect(from).not.toHaveBeenCalled();
});

it("fails closed when admin verification fails", async () => {
  rpc.mockResolvedValue({ data: null, error: { message: "Verification failed" } });
  await expect(run({ context: { userId: "admin-id", supabase: { rpc, from } } })).rejects.toThrow("Only admins can view accounts.");
  expect(from).not.toHaveBeenCalled();
});