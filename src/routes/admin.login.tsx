import { createFileRoute, Link } from "@tanstack/react-router";

import { AdminLoginForm } from "@/components/auth/AdminLoginForm";
import { AuthCard } from "@/components/auth/AuthCard";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin Login — Pixel Infinite CRM" },
      { name: "description", content: "Sign in to the Pixel Infinite CRM admin panel." },
      { property: "og:title", content: "Admin Login — Pixel Infinite CRM" },
      { property: "og:description", content: "Sign in to the Pixel Infinite CRM admin panel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AuthCard className="premium-login admin-login" title="Admin Login" subtitle="Sign in to manage the CRM workspace.">
      <AdminLoginForm />
      <p className="text-muted-foreground mt-4 text-center text-xs">
        Intern? <Link to="/auth" className="text-primary font-medium">Go to intern login</Link>
      </p>
    </AuthCard>
  ),
});
