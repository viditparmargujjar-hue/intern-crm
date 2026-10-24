import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/layout/Logo";
import { FormField } from "@/components/crm/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Loader2, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { approvalMessages, getApprovalStatus } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Intern Login — Pixel Infinite CRM" },
      { name: "description", content: "Sign in or create your intern account for Pixel Infinite CRM." },
      { property: "og:title", content: "Intern Login — Pixel Infinite CRM" },
      { property: "og:description", content: "Sign in or create your intern account for Pixel Infinite CRM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InternAuth,
});

type Mode = "login" | "signup" | "forgot";

const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(80),
    email: z.string().trim().email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" });

function InternAuth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  function switchMode(m: Mode) {
    setMode(m);
    setErrors({});
    setError(undefined);
    setInfo(undefined);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setInfo(undefined);
    setErrors({});
    setBusy(true);
    try {
      if (mode === "login") {
        const { data: signIn, error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) {
          const code = (error as { code?: string }).code;
          return setError(
            code === "invalid_credentials"
              ? "Incorrect email or password."
              : code === "email_not_confirmed"
                ? "Please confirm your email first — check your inbox."
                : error.message,
          );
        }
        const status = await getApprovalStatus(signIn.user.id);
        if (status !== "admin" && status !== "approved") {
          await supabase.auth.signOut();
          return setError(approvalMessages[status]);
        }
        toast.success("Welcome back!");
        navigate({ to: "/", replace: true });
      } else if (mode === "signup") {
        const parsed = signupSchema.safeParse(form);
        if (!parsed.success) {
          const fe: Record<string, string> = {};
          parsed.error.issues.forEach((i) => (fe[String(i.path[0])] = i.message));
          return setErrors(fe);
        }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: parsed.data.fullName },
          },
        });
        if (error) return setError(error.message);
        await supabase.auth.signOut();
        toast.success("Registration submitted");
        switchMode("login");
        setInfo(
          "Your registration request has been submitted. Please wait for admin approval. Also confirm your email from your inbox.",
        );
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) return setError(error.message);
        setInfo("If that email has an account, a reset link is on its way.");
      }
    } finally {
      setBusy(false);
    }
  }

  const titles = {
    login: ["Intern Login", "Sign in to your CRM workspace."],
    signup: ["Create intern account", "Sign up to start managing leads."],
    forgot: ["Reset password", "We'll email you a reset link."],
  } as const;

  const intern = (
    <form onSubmit={onSubmit} className="space-y-4" noValidate={mode === "signup"}>
        {mode === "signup" ? (
          <FormField label="Full name" htmlFor="fullName" error={errors["fullName"]}>
            <Input id="fullName" className="h-11" value={form.fullName} onChange={set("fullName")} />
          </FormField>
        ) : null}
        <FormField label="Email" htmlFor="email" error={errors["email"]}>
          <Input id="email" type="email" autoComplete="email" required className="h-11" value={form.email} onChange={set("email")} />
        </FormField>
        {mode !== "forgot" ? (
          <FormField label="Password" htmlFor="password" error={errors["password"]}>
            <PasswordInput id="password" required className="h-11" value={form.password} onChange={set("password")} />
          </FormField>
        ) : null}
        {mode === "signup" ? (
          <FormField label="Confirm password" htmlFor="confirm" error={errors["confirm"]}>
            <PasswordInput id="confirm" required className="h-11" value={form.confirm} onChange={set("confirm")} />
          </FormField>
        ) : null}
        {mode === "login" ? (
          <button type="button" onClick={() => switchMode("forgot")} className="text-primary text-xs font-medium">
            Forgot password?
          </button>
        ) : null}
        {error ? <p role="alert" className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border px-3 py-2 text-sm">{error}</p> : null}
        {info ? <p className="text-sm text-status-converted">{info}</p> : null}
        <Button type="submit" className="h-11 w-full" disabled={busy}>
          {busy ? <><Loader2 className="size-4 animate-spin" /> Please wait…</> : mode === "login" ? "Login" : mode === "signup" ? "Sign up" : "Send reset link"}
        </Button>
        <p className="text-muted-foreground text-center text-xs">
          {mode === "login" ? (
            <>No account? <button type="button" onClick={() => switchMode("signup")} className="text-primary font-medium">Sign up</button></>
          ) : (
            <>Have an account? <button type="button" onClick={() => switchMode("login")} className="text-primary font-medium">Login</button></>
          )}
        </p>
      </form>
  );

  return (
    <div className="premium-login intern-login bg-background relative min-h-screen overflow-hidden">
      <div aria-hidden className="login-backdrop pointer-events-none absolute inset-x-0 top-0" />

      <div className="login-content animate-page relative mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-8 sm:py-12">
        <header className="text-primary-foreground mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex items-center gap-3">
            <Logo className="size-10" />
            <div>
              <p className="text-sm font-semibold">Pixel Infinite CRM</p>
              <p className="text-primary-foreground/60 text-xs">Lead & client workspace</p>
            </div>
          </div>
          <Link
            to="/admin/login"
            className="border-primary-foreground/25 bg-primary-foreground/5 text-primary-foreground/80 hover:border-primary-foreground/50 hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:ring-primary-foreground/60 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-primary focus-visible:outline-none"
          >
            <ShieldCheck className="size-3.5 opacity-80" />
            Admin Login
          </Link>
        </header>
        <div className="login-welcome text-primary-foreground mb-8">
          <h1 className="text-2xl font-semibold sm:text-3xl">Welcome back</h1>
          <p className="text-primary-foreground/70 mt-1 text-sm">Sign in to continue managing your leads and follow-ups.</p>
        </div>

        <div className="login-form-surface bg-card shadow-hover rounded-2xl border p-6 sm:p-10">
          <section aria-labelledby="intern-title">
            <div className="text-brand mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase">
              <Users className="size-4" /> Intern
            </div>
            <h2 id="intern-title" className="text-xl font-semibold">{titles[mode][0]}</h2>
            <p className="text-muted-foreground mt-1 mb-6 text-sm">{titles[mode][1]}</p>
            {intern}
          </section>
        </div>
        <p className="text-muted-foreground mt-6 text-center text-xs">Secure sign-in · Pixel Infinite</p>
      </div>
    </div>
  );
}
