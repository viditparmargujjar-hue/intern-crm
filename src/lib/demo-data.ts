import type { Activity, FollowUp, Lead } from "@/lib/crm";

/**
 * Local, display-only sample records shown when the workspace has no real data.
 * Never written to the database.
 */
const day = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * day).toISOString();
const date = (offsetDays: number) => iso(offsetDays).slice(0, 10);

const lead = (
  n: number,
  full_name: string,
  company_name: string,
  status: string,
  priority: string,
  source: string,
  followUp: number,
): Lead => ({
  id: `demo-lead-${n}`,
  full_name,
  company_name,
  email: `${full_name.split(" ")[0]!.toLowerCase()}@${company_name.toLowerCase().replace(/\s+/g, "")}.com`,
  phone: `+91 98${n}00 4${n}21${n}`,
  lead_source: source,
  status,
  priority,
  assigned_to: null,
  assigned_user_id: null,
  next_follow_up: date(followUp),
  notes: null,
  created_at: iso(-n * 2),
});

export const demoLeads: Lead[] = [
  lead(1, "Aarav Mehta", "Nimbus Retail", "New", "High", "Website", 1),
  lead(2, "Priya Sharma", "Orbit Labs", "Contacted", "Medium", "Referral", 2),
  lead(3, "Rohan Kapoor", "Bluepeak Foods", "Qualified", "High", "LinkedIn", 3),
  lead(4, "Sneha Iyer", "Vertex Studio", "Follow-up", "Medium", "Event", -1),
  lead(5, "Kabir Singh", "Lumen Logistics", "Converted", "Low", "Website", 6),
  lead(6, "Ananya Rao", "Crescent Health", "Lost", "Low", "Cold call", 9),
];

const fu = (
  n: number,
  leadN: number,
  type: string,
  description: string,
  status: string,
  priority: string,
  offset: number,
): FollowUp => ({
  id: `demo-fu-${n}`,
  lead_id: `demo-lead-${leadN}`,
  customer_id: null,
  follow_up_date: date(offset),
  due_at: iso(offset),
  follow_up_type: type,
  description,
  status,
  priority,
  assigned_to: null,
  assigned_user_id: null,
  created_at: iso(-3),
  updated_at: iso(-1),
});

/** 3 follow-ups + 4 tasks. */
export const demoFollowUps: FollowUp[] = [
  fu(1, 1, "Call", "Intro call about store rollout", "Pending", "High", 1),
  fu(2, 2, "Email", "Send pricing deck", "Pending", "Medium", 2),
  fu(3, 3, "Meeting", "Demo with procurement team", "Pending", "High", 3),
  fu(4, 4, "Task", "Prepare revised proposal", "Pending", "Medium", -1),
  fu(5, 5, "Task", "Share onboarding checklist", "Completed", "Low", -2),
  fu(6, 3, "Task", "Collect requirements doc", "Completed", "Medium", -4),
  fu(7, 2, "Task", "Update CRM notes after call", "Pending", "Low", 4),
];

const act = (n: number, leadN: number, activity_type: string, description: string, ago: number): Activity => ({
  id: `demo-act-${n}`,
  lead_id: `demo-lead-${leadN}`,
  customer_id: null,
  activity_type,
  description,
  activity_date: iso(-ago),
  created_at: iso(-ago),
});

export const demoActivities: Activity[] = [
  act(1, 5, "Status Change", "Kabir Singh moved to Converted", 0.1),
  act(2, 3, "Meeting", "Discovery meeting with Bluepeak Foods", 0.5),
  act(3, 2, "Email", "Pricing deck sent to Priya Sharma", 1),
  act(4, 1, "Call", "First call with Aarav Mehta", 2),
  act(5, 4, "Note", "Sneha asked for a revised quote", 3),
];
