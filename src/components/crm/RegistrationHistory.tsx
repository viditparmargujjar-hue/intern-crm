import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History } from "lucide-react";
import { useState } from "react";

import { ErrorState, LoadingRows } from "@/components/crm/Surfaces";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { listRegistrationHistory } from "@/lib/admin.functions";
import { formatDateTime } from "@/lib/crm";

export function RegistrationHistory({ id, name }: { id: string; name: string | null }) {
  const [open, setOpen] = useState(false);
  const fetchHistory = useServerFn(listRegistrationHistory);
  const history = useQuery({
    queryKey: ["registration-history", id],
    queryFn: () => fetchHistory({ data: { id } }),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Review history" aria-label={`Review history for ${name ?? "intern"}`}>
          <History className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle>Review history</DialogTitle>
          <DialogDescription className="break-words">{name ?? "Intern registration"}</DialogDescription>
        </DialogHeader>
        {history.isPending ? <LoadingRows rows={2} /> : history.isError ? (
          <div className="space-y-3">
            <ErrorState message="Review history couldn't be loaded." />
            <Button variant="outline" onClick={() => history.refetch()}>Try again</Button>
          </div>
        ) : history.data.length === 0 ? (
          <p className="text-muted-foreground py-6 text-sm">No recorded reviews for this registration.</p>
        ) : (
          <ol className="divide-border divide-y">
            {history.data.map((entry) => (
              <li key={entry.id} className="space-y-2 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={entry.status === "approved" ? "default" : "destructive"} className="capitalize">{entry.status}</Badge>
                  <time dateTime={entry.reviewed_at} className="text-muted-foreground text-xs">{formatDateTime(entry.reviewed_at)}</time>
                </div>
                <p className="break-words text-sm font-medium">{entry.reviewer_name || entry.reviewer_email || "Reviewer unavailable"}</p>
                {entry.reviewer_name && entry.reviewer_email ? <p className="text-muted-foreground break-all text-xs">{entry.reviewer_email}</p> : null}
                {entry.previous_status ? <p className="text-muted-foreground text-xs capitalize">{entry.previous_status} → {entry.status}</p> : null}
                {entry.historical ? <p className="text-muted-foreground text-xs">Previously recorded review. Earlier decisions were not tracked.</p> : null}
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}