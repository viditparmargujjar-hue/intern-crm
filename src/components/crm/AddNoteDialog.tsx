import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/crm/FormField";
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
import { Textarea } from "@/components/ui/textarea";
import { logActivity } from "@/lib/crm-api";

/** Adds a free-text note to a lead or customer as a "Note" activity. */
export function AddNoteDialog({
  trigger,
  leadId,
  customerId,
}: {
  trigger: ReactNode;
  leadId?: string;
  customerId?: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () =>
      logActivity({
        lead_id: leadId ?? null,
        customer_id: customerId ?? null,
        activity_type: "Note",
        description: note.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Note added");
      setNote("");
      setOpen(false);
    },
    onError: (mutationError: Error) => toast.error(mutationError.message || "Could not add note"),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (note.trim().length === 0) {
      setError("Write something before saving");
      return;
    }
    if (note.trim().length > 1000) {
      setError("Keep the note under 1000 characters");
      return;
    }
    setError("");
    save.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add note</DialogTitle>
          <DialogDescription>Notes show up in the activity timeline.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Note" htmlFor="note" error={error}>
            <Textarea
              id="note"
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Spoke with the team, they want a demo next week."
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Add note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
