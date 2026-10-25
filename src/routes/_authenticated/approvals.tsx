import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingRows, Panel } from "@/components/crm/Surfaces";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listRegistrations, reviewRegistration } from "@/lib/admin.functions";
import { isAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/crm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/approvals")({
  beforeLoad: async ({ context }) => {
    if (!(await isAdmin(context.user.id))) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Intern Approvals — Pixel Infinite CRM" },
      { name: "description", content: "Approve or reject intern registrations." },
      { property: "og:title", content: "Intern Approvals — Pixel Infinite CRM" },
      { property: "og:description", content: "Approve or reject intern registrations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApprovalsPage,
});

const tabs = ["pending", "approved", "rejected", "all"] as const;
type Decision = "approved" | "rejected";

function ApprovalsPage() {
  const qc = useQueryClient();
  const fetchRegs = useServerFn(listRegistrations);
  const review = useServerFn(reviewRegistration);
  const regs = useQuery({ queryKey: ["registrations"], queryFn: () => fetchRegs() });
  const [tab, setTab] = useState<(typeof tabs)[number]>("pending");
  const [search, setSearch] = useState("");

  const mutation = useMutation({
    mutationFn: (v: { id: string; status: Decision }) => review({ data: v }),
    onSuccess: (r) => {
      toast.success(r.status === "approved" ? "Intern approved" : "Intern rejected");
      qc.invalidateQueries({ queryKey: ["registrations"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const all = regs.data ?? [];
  const count = (s: string) => (s === "all" ? all.length : all.filter((r) => r.status === s).length);
  const q = search.trim().toLowerCase();
  const rows = all.filter(
    (r) =>
      (tab === "all" || r.status === tab) &&
      (!q || (r.full_name ?? "").toLowerCase().includes(q) || (r.email ?? "").toLowerCase().includes(q)),
  );

  return (
    <div className="premium-dashboard premium-admin space-y-6">
      <PageHeader title="Intern Approvals" description="Review new intern registrations before they can use the CRM." />
      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {tabs.map((t) => (
            <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)} className="capitalize">
              {t} <span className="ml-1 opacity-70">({count(t)})</span>
            </Button>
          ))}
          <div className="relative ml-auto min-w-48 flex-1 sm:max-w-xs">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" className="pl-9" aria-label="Search registrations" />
          </div>
          <Button size="sm" variant="outline" onClick={() => regs.refetch()} aria-label="Refresh">
            <RefreshCw className={cn("size-4", regs.isFetching && "animate-spin")} />
          </Button>
        </div>
        {regs.isLoading ? (
          <LoadingRows />
        ) : regs.error ? (
          <ErrorState message={(regs.error as Error).message} />
        ) : !rows.length ? (
          <EmptyState title="No registrations here" description="New intern sign-ups appear in Pending." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-left text-xs">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Registered</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-border border-t">
                    <td className="py-2.5 pr-4 font-medium">{r.full_name}</td>
                    <td className="py-2.5 pr-4">{r.email}</td>
                    <td className="py-2.5 pr-4">{formatDate(r.created_at)}</td>
                    <td className="py-2.5 pr-4">
                      <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="capitalize">
                        {r.status}
                      </Badge>
                    </td>
                    <td className="flex gap-2 py-2.5">
                      {(["approved", "rejected"] as const).map((s) => (
                        <AlertDialog key={s}>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant={s === "approved" ? "default" : "outline"} disabled={mutation.isPending || r.status === s}>
                              {s === "approved" ? "Approve" : "Reject"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{s === "approved" ? "Approve" : "Reject"} {r.full_name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {s === "approved"
                                  ? "They will be able to sign in and use the CRM."
                                  : "They will be blocked from signing in to the CRM."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => mutation.mutate({ id: r.id, status: s })}>
                                {s === "approved" ? "Approve" : "Reject"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
