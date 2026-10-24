/**
 * All database calls live here so pages stay focused on the UI.
 * Every function throws on error; React Query turns that into an error state.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { Activity, AppUser, Customer, FollowUp, Lead } from "@/lib/crm";
import { todayISO } from "@/lib/crm";

/* ---------------------------------- leads --------------------------------- */

export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchLead(id: string): Promise<Lead> {
  const { data, error } = await supabase.from("leads").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createLead(values: TablesInsert<"leads">): Promise<Lead> {
  const { data, error } = await supabase.from("leads").insert(values).select().single();
  if (error) throw error;
  await logActivity({
    lead_id: data.id,
    activity_type: "Note",
    description: `Lead created from ${data.lead_source ?? "an unknown source"}.`,
  });
  return data;
}

export async function updateLead(id: string, values: TablesUpdate<"leads">): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw error;
}

/** Changes a lead's status and records a status-change activity. */
export async function changeLeadStatus(lead: Lead, status: string): Promise<Lead> {
  const updated = await updateLead(lead.id, { status });
  await logActivity({
    lead_id: lead.id,
    activity_type: "Status Change",
    description: `Status changed from ${lead.status} to ${status}.`,
  });
  return updated;
}

/**
 * Converts a lead into a customer:
 * status becomes "Converted", a customer row is created and an activity is logged.
 */
export async function convertLeadToCustomer(lead: Lead): Promise<Customer> {
  const existing = await supabase
    .from("customers")
    .select("*")
    .eq("lead_id", lead.id)
    .maybeSingle();
  if (existing.error) throw existing.error;

  let customer = existing.data;
  if (!customer) {
    const { data, error } = await supabase
      .from("customers")
      .insert({
        name: lead.full_name,
        company: lead.company_name,
        email: lead.email,
        phone: lead.phone,
        status: "Active",
        last_contacted: todayISO(),
        notes: lead.notes,
        lead_id: lead.id,
      })
      .select()
      .single();
    if (error) throw error;
    customer = data;
  }

  await updateLead(lead.id, { status: "Converted", next_follow_up: null });
  await logActivity({
    lead_id: lead.id,
    customer_id: customer.id,
    activity_type: "Status Change",
    description: `Lead converted to customer (${customer.name}).`,
  });
  return customer;
}

/* -------------------------------- customers ------------------------------- */

export async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchCustomer(id: string): Promise<Customer> {
  const { data, error } = await supabase.from("customers").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createCustomer(values: TablesInsert<"customers">): Promise<Customer> {
  const { data, error } = await supabase.from("customers").insert(values).select().single();
  if (error) throw error;
  return data;
}

export async function updateCustomer(
  id: string,
  values: TablesUpdate<"customers">,
): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
}

/* -------------------------------- follow-ups ------------------------------ */

export async function fetchFollowUps(): Promise<FollowUp[]> {
  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .order("follow_up_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createFollowUp(values: TablesInsert<"follow_ups">): Promise<FollowUp> {
  const { data, error } = await supabase.from("follow_ups").insert(values).select().single();
  if (error) throw error;
  // Keep the lead's "next follow-up" field in sync.
  if (data.lead_id) {
    await updateLead(data.lead_id, { next_follow_up: data.follow_up_date });
  }
  return data;
}

export async function updateFollowUp(
  id: string,
  values: TablesUpdate<"follow_ups">,
): Promise<FollowUp> {
  const { data, error } = await supabase
    .from("follow_ups")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFollowUp(id: string): Promise<void> {
  const { error } = await supabase.from("follow_ups").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Completes a follow-up: marks it done, logs an activity and updates the
 * "last contacted" date of the related customer.
 */
export async function completeFollowUp(followUp: FollowUp): Promise<void> {
  await updateFollowUp(followUp.id, { status: "Completed" });
  await logActivity({
    lead_id: followUp.lead_id,
    customer_id: followUp.customer_id,
    activity_type: "Follow-up Completed",
    description: `${followUp.follow_up_type} follow-up completed${
      followUp.description ? `: ${followUp.description}` : "."
    }`,
  });
  if (followUp.customer_id) {
    await updateCustomer(followUp.customer_id, { last_contacted: todayISO() });
  }
  if (followUp.lead_id) {
    await updateLead(followUp.lead_id, { next_follow_up: null });
  }
}

/* -------------------------------- activities ------------------------------ */

export async function fetchActivities(): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .order("activity_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function logActivity(values: TablesInsert<"activities">): Promise<Activity> {
  const { data, error } = await supabase.from("activities").insert(values).select().single();
  if (error) throw error;
  return data;
}

/* ------------------------------ assignments ------------------------------- */

export type LeadAssignment = Tables<"lead_assignments">;
export type FollowUpAssignment = Tables<"follow_up_assignments">;

export async function fetchLeadAssignments(): Promise<LeadAssignment[]> {
  const { data, error } = await supabase.from("lead_assignments").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function fetchFollowUpAssignments(): Promise<FollowUpAssignment[]> {
  const { data, error } = await supabase.from("follow_up_assignments").select("*");
  if (error) throw error;
  return data ?? [];
}

/** Replaces the shared-assignee set of one lead with exactly `userIds`. */
export async function setLeadAssignments(leadId: string, userIds: string[]): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from("lead_assignments")
    .select("user_id")
    .eq("lead_id", leadId);
  if (readError) throw readError;
  const current = new Set((existing ?? []).map((r) => r.user_id));
  const wanted = new Set(userIds);
  const toAdd = [...wanted].filter((id) => !current.has(id));
  const toRemove = [...current].filter((id) => !wanted.has(id));
  if (toRemove.length) {
    const { error } = await supabase
      .from("lead_assignments")
      .delete()
      .eq("lead_id", leadId)
      .in("user_id", toRemove);
    if (error) throw error;
  }
  if (toAdd.length) {
    const { error } = await supabase
      .from("lead_assignments")
      .insert(toAdd.map((user_id) => ({ lead_id: leadId, user_id })));
    if (error) throw error;
  }
}

/** Replaces the shared-assignee set of one follow-up with exactly `userIds`. */
export async function setFollowUpAssignments(followUpId: string, userIds: string[]): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from("follow_up_assignments")
    .select("user_id")
    .eq("follow_up_id", followUpId);
  if (readError) throw readError;
  const current = new Set((existing ?? []).map((r) => r.user_id));
  const wanted = new Set(userIds);
  const toAdd = [...wanted].filter((id) => !current.has(id));
  const toRemove = [...current].filter((id) => !wanted.has(id));
  if (toRemove.length) {
    const { error } = await supabase
      .from("follow_up_assignments")
      .delete()
      .eq("follow_up_id", followUpId)
      .in("user_id", toRemove);
    if (error) throw error;
  }
  if (toAdd.length) {
    const { error } = await supabase
      .from("follow_up_assignments")
      .insert(toAdd.map((user_id) => ({ follow_up_id: followUpId, user_id })));
    if (error) throw error;
  }
}

/** Adds interns to many leads at once; existing assignments are kept (no duplicates). */
export async function bulkAssignLeads(leadIds: string[], userIds: string[]): Promise<void> {
  if (!leadIds.length || !userIds.length) return;
  const rows = leadIds.flatMap((lead_id) => userIds.map((user_id) => ({ lead_id, user_id })));
  const { error } = await supabase
    .from("lead_assignments")
    .upsert(rows, { onConflict: "lead_id,user_id", ignoreDuplicates: true });
  if (error) throw error;
}

/* ---------------------------------- user ---------------------------------- */

export async function fetchProfile(): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(id: string, values: TablesUpdate<"users">): Promise<AppUser> {
  const { data, error } = await supabase
    .from("users")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* -------------------------------- pipeline -------------------------------- */

export interface PipelineFilters {
  search: string;
  assignee: string; // "all" | "unassigned" | user id
  source: string; // "all" | source
  priority: string; // "all" | priority
  followUp: string; // "any" | "overdue" | "today" | "week" | "none"
  status: string; // "all" | status
}

/** Filters run in the database; RLS limits interns to their own leads. */
export async function fetchPipelineLeads(f: PipelineFilters): Promise<Lead[]> {
  let q = supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(1000);
  const term = f.search.trim().replace(/[%,()]/g, " ");
  if (term) {
    const p = `%${term}%`;
    q = q.or(`full_name.ilike.${p},email.ilike.${p},phone.ilike.${p},company_name.ilike.${p}`);
  }
  if (f.assignee === "unassigned") q = q.is("assigned_user_id", null);
  else if (f.assignee !== "all") q = q.eq("assigned_user_id", f.assignee);
  if (f.source !== "all") q = q.eq("lead_source", f.source);
  if (f.priority !== "all") q = q.eq("priority", f.priority);
  if (f.status !== "all") q = q.eq("status", f.status);
  const today = todayISO();
  if (f.followUp === "overdue") q = q.lt("next_follow_up", today);
  else if (f.followUp === "today") q = q.eq("next_follow_up", today);
  else if (f.followUp === "week") {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    q = q.gte("next_follow_up", today).lte("next_follow_up", d.toISOString().slice(0, 10));
  } else if (f.followUp === "none") q = q.is("next_follow_up", null);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Atomic stage change: fails if someone else moved the lead first. Logs the activity. */
export async function moveLeadStatus(lead: Lead, to: string): Promise<Lead> {
  const { data, error } = await supabase.rpc("move_lead_status", {
    _lead_id: lead.id,
    _from: lead.status,
    _to: to,
  });
  if (error) throw error;
  return data as Lead;
}

/* -------------------------------- profiles -------------------------------- */

export async function fetchProfiles(): Promise<import("@/lib/crm").Profile[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("full_name");
  if (error) throw error;
  return data ?? [];
}

/* ------------------------------ follow-up actions ------------------------- */

export async function cancelFollowUp(f: FollowUp): Promise<void> {
  await updateFollowUp(f.id, { status: "Cancelled" });
  await logActivity({
    lead_id: f.lead_id,
    customer_id: f.customer_id,
    activity_type: "Note",
    description: `${f.follow_up_type} follow-up cancelled.`,
  });
  if (f.lead_id) await updateLead(f.lead_id, { next_follow_up: null });
}

export async function rescheduleFollowUp(f: FollowUp, dueAt: string, date: string): Promise<void> {
  await updateFollowUp(f.id, { due_at: dueAt, follow_up_date: date, status: "Pending" });
  await logActivity({
    lead_id: f.lead_id,
    customer_id: f.customer_id,
    activity_type: "Note",
    description: `${f.follow_up_type} follow-up rescheduled to ${new Date(dueAt).toLocaleString()}.`,
  });
  if (f.lead_id) await updateLead(f.lead_id, { next_follow_up: date });
}

/* ------------------------------ notifications ----------------------------- */

export async function fetchNotifications(): Promise<import("@/lib/crm").AppNotification[]> {
  // Top up due-soon / overdue reminders (deduplicated in the database).
  await supabase.rpc("generate_followup_reminders");
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw error;
}
