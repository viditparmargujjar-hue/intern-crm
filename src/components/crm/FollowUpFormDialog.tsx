import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AssigneeSelect } from "@/components/crm/AssigneeSelect";
import { FormField } from "@/components/crm/FormField";
import { InternMultiSelect } from "@/components/crm/InternMultiSelect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/lib/auth";
import { usePreferences } from "@/lib/preferences";
import {
  createFollowUp,
  fetchFollowUpAssignments,
  fetchLeads,
  setFollowUpAssignments,
  updateFollowUp,
} from "@/lib/crm-api";
import { FOLLOW_UP_STATUSES, FOLLOW_UP_TYPES, PRIORITIES, todayISO, type FollowUp } from "@/lib/crm";
import { toDueAt } from "@/lib/reminders";

const schema = z.object({
  lead_id: z.string().min(1, "Pick a lead"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time"),
  follow_up_type: z.string().min(1),
  priority: z.enum(PRIORITIES),
  status: z.enum(FOLLOW_UP_STATUSES),
  assigned_user_id: z.string(),
  assigned_to: z.string().optional(),
  description: z.string().trim().max(500, "Keep notes under 500 characters").optional(),
});
type FormValues = z.infer<typeof schema>;

export function FollowUpFormDialog({
  trigger,
  followUp,
  fixedLeadId,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: ReactNode;
  followUp?: FollowUp;
  fixedLeadId?: string;
  /** Kept for older callers; follow-ups now always belong to a lead. */
  fixedCustomerId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submitting = useRef(false);
  const { preferences } = usePreferences();
  const [sharedIds, setSharedIds] = useState<string[]>([]);
  const [values, setValues] = useState<FormValues>({
    lead_id: "",
    date: todayISO(),
    time: "10:00",
    follow_up_type: "Call",
    priority: "Medium",
    status: "Pending",
    assigned_user_id: "",
    assigned_to: "",
    description: "",
  });

  const leads = useQuery({ queryKey: ["leads"], queryFn: fetchLeads, enabled: open });
  const assignments = useQuery({
    queryKey: ["follow_up_assignments"],
    queryFn: fetchFollowUpAssignments,
    enabled: open && Boolean(followUp),
  });

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSharedIds(
      followUp
        ? (assignments.data ?? []).filter((a) => a.follow_up_id === followUp.id).map((a) => a.user_id)
        : [],
    );
    const due = followUp ? new Date(followUp.due_at) : null;
    setValues({
      lead_id: followUp?.lead_id ?? fixedLeadId ?? "",
      date: due ? format(due, "yyyy-MM-dd") : todayISO(),
      time: due ? format(due, "HH:mm") : "10:00",
      follow_up_type: followUp?.follow_up_type ?? "Call",
      priority: (followUp?.priority as FormValues["priority"]) ?? preferences.defaultPriority,
      status: (followUp?.status as FormValues["status"]) ?? "Pending",
      assigned_user_id: followUp?.assigned_user_id ?? me?.id ?? "",
      assigned_to: followUp?.assigned_to ?? me?.name ?? "",
      description: followUp?.description ?? "",
    });
  }, [open, followUp, fixedLeadId, me, assignments.data, preferences]);

  const save = useMutation({
    mutationFn: async (form: FormValues) => {
      const due_at = toDueAt(form.date, form.time);
      const payload = {
        lead_id: form.lead_id,
        follow_up_date: form.date,
        due_at,
        follow_up_type: form.follow_up_type,
        priority: form.priority,
        status: form.status,
        assigned_user_id: me?.role === "admin" ? form.assigned_user_id || null : (followUp?.assigned_user_id ?? me?.id ?? null),
        assigned_to: form.assigned_to || null,
        description: form.description || null,
      };
      const saved = followUp ? await updateFollowUp(followUp.id, payload) : await createFollowUp(payload);
      // Admins can share the follow-up with several interns at once.
      if (me?.role === "admin") {
        await setFollowUpAssignments(saved.id, sharedIds.filter((id) => id !== saved.assigned_user_id));
      }
      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success(followUp ? "Follow-up updated" : "Follow-up scheduled");
      setOpen(false);
    },
    onError: (error: { message?: string; code?: string }) =>
      toast.error(
        error.code === "23505"
          ? "That follow-up is already scheduled."
          : error.message || "Could not save the follow-up",
      ),
    onSettled: () => {
      submitting.current = false;
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return; // block double submissions
    const result = schema.safeParse(values);
    const fieldErrors: Record<string, string> = {};
    if (!result.success) {
      for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    } else if (!followUp && new Date(toDueAt(values.date, values.time)).getTime() < Date.now() - 60_000) {
      fieldErrors["date"] = "Pick a time in the future";
    }
    setErrors(fieldErrors);
    if (!result.success || Object.keys(fieldErrors).length) return;
    submitting.current = true;
    save.mutate(result.data);
  }

  const set = <K extends keyof FormValues>(k: K, v: FormValues[K]) => setValues((c) => ({ ...c, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{followUp ? "Edit follow-up" : "Schedule follow-up"}</DialogTitle>
          <DialogDescription>
            Times are shown in your timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Lead" error={errors["lead_id"]}>
            <Select value={values.lead_id} onValueChange={(v) => set("lead_id", v)} disabled={Boolean(fixedLeadId)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a lead" />
              </SelectTrigger>
              <SelectContent>
                {(leads.data ?? []).map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.full_name}
                    {lead.company_name ? ` · ${lead.company_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Date" htmlFor="fu_date" error={errors["date"]}>
              <Input id="fu_date" type="date" value={values.date} onChange={(e) => set("date", e.target.value)} />
            </FormField>
            <FormField label="Time" htmlFor="fu_time" error={errors["time"]}>
              <Input id="fu_time" type="time" value={values.time} onChange={(e) => set("time", e.target.value)} />
            </FormField>
            <FormField label="Type">
              <Select value={values.follow_up_type} onValueChange={(v) => set("follow_up_type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLLOW_UP_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Priority">
              <Select value={values.priority} onValueChange={(v) => set("priority", v as FormValues["priority"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Assigned to">
              <AssigneeSelect
                value={values.assigned_user_id}
                onChange={(id, name) => setValues((c) => ({ ...c, assigned_user_id: id, assigned_to: name }))}
              />
            </FormField>
            {me?.role === "admin" ? (
              <FormField label="Also shared with" htmlFor="fu_shared_with">
                <InternMultiSelect
                  value={sharedIds}
                  onChange={setSharedIds}
                  excludeIds={values.assigned_user_id ? [values.assigned_user_id] : []}
                  placeholder="Share with more interns…"
                />
              </FormField>
            ) : null}
            {followUp ? (
              <FormField label="Status">
                <Select value={values.status} onValueChange={(v) => set("status", v as FormValues["status"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLLOW_UP_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            ) : null}
          </div>

          <FormField label="Notes" htmlFor="fu_notes" error={errors["description"]}>
            <Textarea
              id="fu_notes"
              rows={3}
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What is this follow-up about?"
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : followUp ? "Save changes" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
