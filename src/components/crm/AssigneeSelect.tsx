import { useQuery } from "@tanstack/react-query";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/lib/auth";
import { fetchProfiles } from "@/lib/crm-api";

export function useProfiles() {
  return useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles, staleTime: 60_000 });
}

/** Display name for an account id, falling back to the old free-text name. */
export function useAssigneeName() {
  const { data } = useProfiles();
  return (id: string | null, fallback?: string | null) =>
    (id && (data ?? []).find((p) => p.id === id)?.full_name) || fallback || "Unassigned";
}

/**
 * Admins pick any account; interns can only assign to themselves
 * (the database enforces the same rule).
 */
export function AssigneeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string, name: string) => void;
}) {
  const { data: me } = useCurrentUser();
  const { data: profiles } = useProfiles();
  if (me?.role !== "admin") {
    return (
      <div className="bg-muted/50 text-muted-foreground rounded-md border px-3 py-2 text-sm">
        {me?.name ?? "You"} (you)
      </div>
    );
  }
  return (
    <Select
      value={value || "none"}
      onValueChange={(id) => {
        const p = (profiles ?? []).find((x) => x.id === id);
        onChange(id === "none" ? "" : id, p?.full_name ?? p?.email ?? "");
      }}
    >
      <SelectTrigger aria-label="Assigned to">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Unassigned</SelectItem>
        {(profiles ?? []).map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.full_name ?? p.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
