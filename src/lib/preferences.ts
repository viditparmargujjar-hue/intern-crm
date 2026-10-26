import { useMemo } from "react";
/**
 * Per-user CRM preferences, stored in the `preferences` jsonb column of
 * public.users and merged with defaults so old rows keep working.
 */
import { useQuery } from "@tanstack/react-query";

import { fetchProfile } from "@/lib/crm-api";
import { LEAD_STATUSES, PRIORITIES } from "@/lib/crm";

export const DATE_FORMATS = ["d MMM yyyy", "yyyy-MM-dd", "MM/dd/yyyy"] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export interface CrmPreferences {
  defaultLeadStatus: string;
  defaultPriority: string;
  dateFormat: DateFormat;
  notifyLeadUpdates: boolean;
  notifyTaskUpdates: boolean;
  notifyApprovals: boolean;
  notifyOverdue: boolean;
}

export const DEFAULT_PREFERENCES: CrmPreferences = {
  defaultLeadStatus: "New",
  defaultPriority: "Medium",
  dateFormat: "d MMM yyyy",
  notifyLeadUpdates: true,
  notifyTaskUpdates: true,
  notifyApprovals: true,
  notifyOverdue: true,
};

/** Merges stored json with defaults, dropping invalid enum values. */
export function parsePreferences(raw: unknown): CrmPreferences {
  const o = (raw ?? {}) as Record<string, unknown>;
  const pick = <T>(value: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(value as T) ? (value as T) : fallback;
  const bool = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
  return {
    defaultLeadStatus: pick(o["defaultLeadStatus"], LEAD_STATUSES, DEFAULT_PREFERENCES.defaultLeadStatus),
    defaultPriority: pick(o["defaultPriority"], PRIORITIES, DEFAULT_PREFERENCES.defaultPriority),
    dateFormat: pick(o["dateFormat"], DATE_FORMATS, DEFAULT_PREFERENCES.dateFormat),
    notifyLeadUpdates: bool(o["notifyLeadUpdates"], true),
    notifyTaskUpdates: bool(o["notifyTaskUpdates"], true),
    notifyApprovals: bool(o["notifyApprovals"], true),
    notifyOverdue: bool(o["notifyOverdue"], true),
  };
}

/** Current user's profile row plus parsed preferences. */
export function usePreferences() {
  const profile = useQuery({ queryKey: ["profile"], queryFn: fetchProfile, staleTime: 60_000 });
  // Memoised so effects that depend on preferences don't re-run (and reset forms) every render.
  const raw = profile.data?.preferences;
  const preferences = useMemo(() => parsePreferences(raw), [raw]);
  return { ...profile, preferences };
}
