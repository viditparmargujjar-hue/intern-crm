import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { FormField } from "@/components/crm/FormField";
import { ErrorState, LoadingRows, Panel } from "@/components/crm/Surfaces";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfile, updateProfile } from "@/lib/crm-api";
import { LEAD_STATUSES, PRIORITIES } from "@/lib/crm";
import {
  DATE_FORMATS,
  DEFAULT_PREFERENCES,
  parsePreferences,
  type CrmPreferences,
  type DateFormat,
} from "@/lib/preferences";
import { applyTheme, readTheme, type Theme } from "@/lib/theme";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email"),
});

const passwordSchema = z
  .object({
    password: z.string().min(6, "Use at least 6 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Pixel Infinite CRM" },
      { name: "description", content: "Manage your profile and notification preferences." },
      { property: "og:title", content: "Settings — Pixel Infinite CRM" },
      { property: "og:description", content: "Manage your profile and notification preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyFollowUps, setNotifyFollowUps] = useState(true);
  const [prefs, setPrefs] = useState<CrmPreferences>(DEFAULT_PREFERENCES);
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => setTheme(readTheme()), []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Password change state (separate from the profile form).
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  // Fill the form once the profile loads.
  useEffect(() => {
    if (!profile.data) return;
    setName(profile.data.name);
    setEmail(profile.data.email);
    setNotifyEmail(profile.data.notify_email);
    setNotifyFollowUps(profile.data.notify_followups);
    setPrefs(parsePreferences(profile.data.preferences));
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () =>
      updateProfile(profile.data!.id, {
        name,
        email,
        notify_email: notifyEmail,
        notify_followups: notifyFollowUps,
        preferences: prefs as unknown as Record<string, never>,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Settings saved");
    },
    onError: (error: Error) => toast.error(error.message || "Could not save settings"),
  });

  const changePassword = useMutation({
    mutationFn: async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      setPassword("");
      setConfirm("");
      setPasswordErrors({});
      toast.success("Password updated", { description: "Use it the next time you sign in." });
    },
    onError: (error: Error) => toast.error(error.message || "Could not update the password"),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = profileSchema.safeParse({ name, email });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    save.mutate();
  }

  function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = passwordSchema.safeParse({ password, confirm });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fieldErrors[String(issue.path[0])] ??= issue.message;
      }
      setPasswordErrors(fieldErrors);
      return;
    }
    changePassword.mutate(password);
  }

  /** Restores every field to the last saved values. */
  function handleCancel() {
    if (!profile.data) return;
    setName(profile.data.name);
    setEmail(profile.data.email);
    setNotifyEmail(profile.data.notify_email);
    setNotifyFollowUps(profile.data.notify_followups);
    setPrefs(parsePreferences(profile.data.preferences));
    setErrors({});
    toast.info("Changes discarded");
  }

  if (profile.isError) {
    return <ErrorState message="We couldn't load your settings. Please try again." />;
  }

  const setPref = <K extends keyof CrmPreferences>(key: K, value: CrmPreferences[K]) =>
    setPrefs((current) => ({ ...current, [key]: value }));

  return (
    <div>
      <PageHeader title="Settings" description="Your profile and how you want to be notified." />

      {profile.isLoading ? (
        <Panel>
          <LoadingRows />
        </Panel>
      ) : (
        <div className="max-w-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Panel>
              <div className="border-b px-4 py-3">
                <h2 className="font-display text-sm font-semibold">Profile</h2>
              </div>
              <div className="space-y-4 p-4">
                <FormField label="Name" htmlFor="name" error={errors["name"]}>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </FormField>
                <FormField label="Email" htmlFor="email" error={errors["email"]}>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </FormField>
              </div>
            </Panel>

            <Panel>
              <div className="border-b px-4 py-3">
                <h2 className="font-display text-sm font-semibold">Notifications</h2>
              </div>
              <div className="space-y-4 p-4">
                <ToggleRow
                  label="Email notifications"
                  description="Receive important updates by email."
                  checked={notifyEmail}
                  onChange={setNotifyEmail}
                />
                <ToggleRow
                  label="Follow-up reminders"
                  description="Get reminded when a follow-up is due."
                  checked={notifyFollowUps}
                  onChange={setNotifyFollowUps}
                />
                <ToggleRow
                  label="Lead updates"
                  description="When a lead assigned to you changes."
                  checked={prefs.notifyLeadUpdates}
                  onChange={(v) => setPref("notifyLeadUpdates", v)}
                />
                <ToggleRow
                  label="Task updates"
                  description="When a shared task is updated."
                  checked={prefs.notifyTaskUpdates}
                  onChange={(v) => setPref("notifyTaskUpdates", v)}
                />
                <ToggleRow
                  label="Pending approvals"
                  description="Admins: when a new intern requests access."
                  checked={prefs.notifyApprovals}
                  onChange={(v) => setPref("notifyApprovals", v)}
                />
                <ToggleRow
                  label="Overdue follow-ups"
                  description="When one of your follow-ups goes overdue."
                  checked={prefs.notifyOverdue}
                  onChange={(v) => setPref("notifyOverdue", v)}
                />
              </div>
            </Panel>

            <Panel>
              <div className="border-b px-4 py-3">
                <h2 className="font-display text-sm font-semibold">CRM preferences</h2>
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-3">
                <FormField label="Default lead status">
                  <Select value={prefs.defaultLeadStatus} onValueChange={(v) => setPref("defaultLeadStatus", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Default task priority">
                  <Select
                    value={prefs.defaultPriority}
                    onValueChange={(v) => setPref("defaultPriority", v)}
                  >
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
                <FormField label="Date format">
                  <Select
                    value={prefs.dateFormat}
                    onValueChange={(v) => setPref("dateFormat", v as DateFormat)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_FORMATS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            </Panel>

            <Panel>
              <div className="border-b px-4 py-3">
                <h2 className="font-display text-sm font-semibold">Appearance</h2>
              </div>
              <div className="flex flex-wrap gap-2 p-4" role="radiogroup" aria-label="Theme">
                {(["light", "dark", "system"] as const).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={theme === t}
                    variant={theme === t ? "default" : "outline"}
                    size="sm"
                    className="capitalize"
                    onClick={() => {
                      setTheme(t);
                      applyTheme(t);
                      toast.success(`Theme set to ${t}`);
                    }}
                  >
                    {t}
                  </Button>
                ))}
                <p className="text-muted-foreground w-full text-xs">Saved on this device and applied instantly.</p>
              </div>
            </Panel>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save settings"}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel} disabled={save.isPending}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setPrefs(DEFAULT_PREFERENCES);
                  toast.info("Preferences reset to defaults — save to keep them.");
                }}
                disabled={save.isPending}
              >
                Reset to defaults
              </Button>
            </div>
          </form>

          <Panel>
            <div className="border-b px-4 py-3">
              <h2 className="font-display text-sm font-semibold">Password</h2>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4 p-4">
              <FormField label="New password" htmlFor="new_password" error={passwordErrors["password"]}>
                <Input
                  id="new_password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FormField>
              <FormField label="Confirm new password" htmlFor="confirm_password" error={passwordErrors["confirm"]}>
                <Input
                  id="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </FormField>
              <Button type="submit" variant="outline" disabled={changePassword.isPending}>
                {changePassword.isPending ? "Updating…" : "Update password"}
              </Button>
            </form>
          </Panel>
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="text-muted-foreground text-xs">{description}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
