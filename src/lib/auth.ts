import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/** Returns true when the given user has the admin role. */
export async function isAdmin(userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

/** Current signed-in user plus their role ("admin" or "intern"). */
export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return null;
      const admin = await isAdmin(user.id);
      const name =
        (user.user_metadata?.["full_name"] as string | undefined) ?? user.email ?? "User";
      return { id: user.id, email: user.email ?? "", name, role: admin ? "admin" : "intern" } as const;
    },
  });
}

export type ApprovalStatus = "pending" | "approved" | "rejected" | "admin" | "unknown";

/** Approval status of the given account, read from trusted database records. */
export async function getApprovalStatus(userId: string): Promise<ApprovalStatus> {
  if (await isAdmin(userId)) return "admin";
  const { data } = await supabase
    .from("registration_requests")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.status as ApprovalStatus | undefined) ?? "unknown";
}

export const approvalMessages: Record<string, string> = {
  pending: "Your registration request has been submitted. Please wait for admin approval.",
  rejected: "Your registration request was not approved. Please contact the admin.",
  unknown: "Your account is not approved for CRM access yet. Please contact the admin.",
};
