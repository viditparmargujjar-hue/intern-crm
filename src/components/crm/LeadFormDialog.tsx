import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AssigneeSelect } from "@/components/crm/AssigneeSelect";
import { FormField } from "@/components/crm/FormField";
import { InternMultiSelect } from "@/components/crm/InternMultiSelect";
import { useCurrentUser } from "@/lib/auth";
import { usePreferences } from "@/lib/preferences";
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
import { createLead, fetchLeadAssignments, setLeadAssignments, updateLead } from "@/lib/crm-api";
import { LEAD_SOURCES, LEAD_STATUSES, PRIORITIES, type Lead } from "@/lib/crm";

const leadSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(100),
  company_name: z.string().trim().max(120).optional(),
  email: z.union([z.string().trim().email("Enter a valid email"), z.literal("")]),
  phone: z.string().trim().max(30).optional(),
  lead_source: z.string().min(1, "Pick a lead source"),
  status: z.string().min(1),
  assigned_to: z.string().trim().max(80).optional(),
  assigned_user_id: z.string(),
  priority: z.enum(PRIORITIES),
  next_follow_up: z.string().optional(),
  notes: z.string().trim().max(1000).optional(),
});

type FormValues = z.infer<typeof leadSchema>;

const emptyForm: FormValues = {
  full_name: "",
  company_name: "",
  email: "",
  phone: "",
  lead_source: "Website",
  status: "New",
  assigned_to: "",
  assigned_user_id: "",
  priority: "Medium",
  next_follow_up: "",
  notes: "",
};

export function LeadFormDialog({
  trigger,
  lead,
}: {
  trigger: ReactNode;
  lead?: Lead;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { data: me } = useCurrentUser();
  const { preferences } = usePreferences();
  const [sharedIds, setSharedIds] = useState<string[]>([]);

  // Existing shared assignees, loaded when editing a lead.
  const assignments = useQuery({
    queryKey: ["lead_assignments"],
    queryFn: fetchLeadAssignments,
    enabled: open && Boolean(lead),
  });

  // Fill the form with the existing lead every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSharedIds(
      lead ? (assignments.data ?? []).filter((a) => a.lead_id === lead.id).map((a) => a.user_id) : [],
    );
    setValues(
      lead
        ? {
            full_name: lead.full_name,
            company_name: lead.company_name ?? "",
            email: lead.email ?? "",
            phone: lead.phone ?? "",
            lead_source: lead.lead_source ?? "Website",
            status: lead.status,
            assigned_to: lead.assigned_to ?? "",
            assigned_user_id: lead.assigned_user_id ?? "",
            priority: (lead.priority as FormValues["priority"]) ?? "Medium",
            next_follow_up: lead.next_follow_up ?? "",
            notes: lead.notes ?? "",
          }
        : {
            ...emptyForm,
            status: preferences.defaultLeadStatus,
            priority: preferences.defaultPriority as FormValues["priority"],
            assigned_user_id: me?.id ?? "",
            assigned_to: me?.name ?? "",
          },
    );
  }, [open, lead, me, assignments.data, preferences]);

  const save = useMutation({
    mutationFn: async (form: FormValues) => {
      const payload = {
        full_name: form.full_name,
        company_name: form.company_name || null,
        email: form.email || null,
        phone: form.phone || null,
        lead_source: form.lead_source,
        status: form.status,
        assigned_to: form.assigned_to || null,
        priority: form.priority,
        ...(me?.role === "admin"
          ? { assigned_user_id: form.assigned_user_id || null }
          : lead
            ? {}
            : { assigned_user_id: me?.id ?? null }),
        next_follow_up: form.next_follow_up || null,
        notes: form.notes || null,
      };
      const saved = lead ? await updateLead(lead.id, payload) : await createLead(payload);
      // Admins can share the lead with several interns at once.
      if (me?.role === "admin") {
        await setLeadAssignments(saved.id, sharedIds.filter((id) => id !== saved.assigned_user_id));
      }
      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success(lead ? "Lead updated" : "Lead added");
      setOpen(false);
    },
    onError: (error: Error) => toast.error(error.message || "Could not save the lead"),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = leadSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    save.mutate(result.data);
  }

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{lead ? "Edit lead" : "Add lead"}</DialogTitle>
          <DialogDescription>
            Fill in what you know. Only the full name and the source are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Full name" htmlFor="full_name" error={errors["full_name"]}>
              <Input
                id="full_name"
                value={values.full_name}
                onChange={(event) => set("full_name", event.target.value)}
                placeholder="Daniel Okafor"
              />
            </FormField>
            <FormField label="Company name" htmlFor="company_name">
              <Input
                id="company_name"
                value={values.company_name}
                onChange={(event) => set("company_name", event.target.value)}
                placeholder="Brightpath Labs"
              />
            </FormField>
            <FormField label="Email" htmlFor="email" error={errors["email"]}>
              <Input
                id="email"
                type="email"
                value={values.email}
                onChange={(event) => set("email", event.target.value)}
                placeholder="daniel@brightpath.com"
              />
            </FormField>
            <FormField label="Phone number" htmlFor="phone">
              <Input
                id="phone"
                value={values.phone}
                onChange={(event) => set("phone", event.target.value)}
                placeholder="+1 415 555 0134"
              />
            </FormField>
            <FormField label="Lead source" error={errors["lead_source"]}>
              <Select
                value={values.lead_source}
                onValueChange={(value) => set("lead_source", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a source" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Status">
              <Select value={values.status} onValueChange={(value) => set("status", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
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
              <FormField label="Also shared with" htmlFor="shared_with">
                <InternMultiSelect
                  value={sharedIds}
                  onChange={setSharedIds}
                  excludeIds={values.assigned_user_id ? [values.assigned_user_id] : []}
                  placeholder="Share with more interns…"
                />
              </FormField>
            ) : null}
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
            <FormField label="Next follow-up date" htmlFor="next_follow_up">
              <Input
                id="next_follow_up"
                type="date"
                value={values.next_follow_up}
                onChange={(event) => set("next_follow_up", event.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Notes" htmlFor="notes" error={errors["notes"]}>
            <Textarea
              id="notes"
              rows={3}
              value={values.notes}
              onChange={(event) => set("notes", event.target.value)}
              placeholder="What did you discuss?"
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : lead ? "Save changes" : "Add lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
