import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { z } from "zod";

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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createCustomer, updateCustomer } from "@/lib/crm-api";
import { CUSTOMER_STATUSES, type Customer } from "@/lib/crm";

const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  company: z.string().trim().max(120).optional(),
  email: z.union([z.string().trim().email("Enter a valid email"), z.literal("")]),
  phone: z.string().trim().max(30).optional(),
  status: z.string().min(1),
  last_contacted: z.string().optional(),
  notes: z.string().trim().max(1000).optional(),
});

type FormValues = z.infer<typeof customerSchema>;

const emptyForm: FormValues = {
  name: "",
  company: "",
  email: "",
  phone: "",
  status: "Active",
  last_contacted: "",
  notes: "",
};

export function CustomerFormDialog({
  trigger,
  customer,
}: {
  trigger: ReactNode;
  customer?: Customer;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setValues(
      customer
        ? {
            name: customer.name,
            company: customer.company ?? "",
            email: customer.email ?? "",
            phone: customer.phone ?? "",
            status: customer.status,
            last_contacted: customer.last_contacted ?? "",
            notes: customer.notes ?? "",
          }
        : emptyForm,
    );
  }, [open, customer]);

  const save = useMutation({
    mutationFn: async (form: FormValues) => {
      const payload = {
        name: form.name,
        company: form.company || null,
        email: form.email || null,
        phone: form.phone || null,
        status: form.status,
        last_contacted: form.last_contacted || null,
        notes: form.notes || null,
      };
      return customer ? updateCustomer(customer.id, payload) : createCustomer(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success(customer ? "Customer updated" : "Customer added");
      setOpen(false);
    },
    onError: (error: Error) => toast.error(error.message || "Could not save the customer"),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = customerSchema.safeParse(values);
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
          <DialogTitle>{customer ? "Edit customer" : "Add customer"}</DialogTitle>
          <DialogDescription>Customer details used across the CRM.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" htmlFor="name" error={errors["name"]}>
              <Input
                id="name"
                value={values.name}
                onChange={(event) => set("name", event.target.value)}
              />
            </FormField>
            <FormField label="Company" htmlFor="company">
              <Input
                id="company"
                value={values.company}
                onChange={(event) => set("company", event.target.value)}
              />
            </FormField>
            <FormField label="Email" htmlFor="customer_email" error={errors["email"]}>
              <Input
                id="customer_email"
                type="email"
                value={values.email}
                onChange={(event) => set("email", event.target.value)}
              />
            </FormField>
            <FormField label="Phone" htmlFor="customer_phone">
              <Input
                id="customer_phone"
                value={values.phone}
                onChange={(event) => set("phone", event.target.value)}
              />
            </FormField>
            <FormField label="Status">
              <Select value={values.status} onValueChange={(value) => set("status", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Last contacted" htmlFor="last_contacted">
              <Input
                id="last_contacted"
                type="date"
                value={values.last_contacted}
                onChange={(event) => set("last_contacted", event.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Notes" htmlFor="customer_notes" error={errors["notes"]}>
            <Textarea
              id="customer_notes"
              rows={3}
              value={values.notes}
              onChange={(event) => set("notes", event.target.value)}
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : customer ? "Save changes" : "Add customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
