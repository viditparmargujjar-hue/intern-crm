import { createFileRoute, redirect } from "@tanstack/react-router";

// The Customers section was removed; old links go back to the dashboard.
export const Route = createFileRoute("/_authenticated/customers")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
