import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PasswordInput } from "@/components/auth/PasswordInput";
import { FormField } from "@/components/crm/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { isAdmin } from "@/lib/auth";

/** Admin sign-in: authenticates, then verifies the admin role from trusted role records. */
export function AdminLoginForm({ idPrefix = "admin" }: { idPrefix?: string }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setBusy(false);
      const code = (error as { code?: string } | null)?.code;
      setError(
        code === "invalid_credentials"
          ? "Incorrect email or password."
          : code === "email_not_confirmed"
            ? "This email hasn't been confirmed yet. Check your inbox."
            : (error?.message ?? "Couldn't sign in. Please try again."),
      );
      return;
    }
    if (!(await isAdmin(data.user.id))) {
      await supabase.auth.signOut();
      setBusy(false);
      setError("This account does not have admin access.");
      return;
    }
    toast.success("Signed in as admin");
    navigate({ to: "/admin", replace: true });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormField label="Admin email" htmlFor={`${idPrefix}-email`}>
        <Input id={`${idPrefix}-email`} type="email" autoComplete="email" required className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} />
      </FormField>
      <FormField label="Password" htmlFor={`${idPrefix}-password`}>
        <PasswordInput id={`${idPrefix}-password`} autoComplete="current-password" required className="h-11" value={password} onChange={(e) => setPassword(e.target.value)} />
      </FormField>
      {error ? (
        <p role="alert" className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground h-11 w-full transition-colors" disabled={busy}>
        {busy ? <><Loader2 className="size-4 animate-spin" /> Signing in…</> : "Login as admin"}
      </Button>
    </form>
  );
}
