import { ChevronsUpDown, Search, X } from "lucide-react";
import { useState } from "react";

import { useProfiles } from "@/components/crm/AssigneeSelect";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { initials } from "@/lib/crm";

function AvatarChip({ name, onRemove }: { name: string; onRemove?: () => void }) {
  return (
    <span className="bg-muted inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-1.5 pl-0.5 text-xs font-medium">
      <span className="bg-primary text-primary-foreground grid size-5 place-items-center rounded-full text-[9px] font-semibold">
        {initials(name)}
      </span>
      {name}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          className="text-muted-foreground hover:text-foreground rounded-full p-0.5 transition-colors"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  );
}

export { AvatarChip };

/**
 * Searchable multi-select of workspace accounts, shown as removable chips.
 * Used by admins to share a lead or follow-up with several interns at once.
 */
export function InternMultiSelect({
  value,
  onChange,
  excludeIds,
  placeholder = "Select interns…",
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  /** Ids to hide from the list (e.g. the primary assignee). */
  excludeIds?: string[];
  placeholder?: string;
}) {
  const { data: profiles } = useProfiles();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const options = (profiles ?? []).filter((p) => !excludeIds?.includes(p.id));
  const byId = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? p.email ?? "Unknown"]));
  const q = search.trim().toLowerCase();
  const visible = options.filter(
    (p) => !q || (p.full_name ?? "").toLowerCase().includes(q) || (p.email ?? "").toLowerCase().includes(q),
  );

  const toggle = (id: string, on: boolean) =>
    onChange(on ? [...new Set([...value, id])] : value.filter((v) => v !== id));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-between font-normal">
            <span className="text-muted-foreground">
              {value.length ? `${value.length} selected` : placeholder}
            </span>
            <ChevronsUpDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          <div className="relative mb-2">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email"
              className="h-8 pl-8 text-sm"
              aria-label="Search interns"
            />
          </div>
          <div className="max-h-48 space-y-0.5 overflow-y-auto">
            {visible.length === 0 ? (
              <p className="text-muted-foreground px-2 py-3 text-center text-xs">No matches.</p>
            ) : (
              visible.map((p) => {
                const checked = value.includes(p.id);
                const name = p.full_name ?? p.email ?? "Unknown";
                return (
                  <label
                    key={p.id}
                    className="hover:bg-muted flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => toggle(p.id, v === true)}
                      aria-label={`Assign ${name}`}
                    />
                    <span className="bg-primary text-primary-foreground grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold">
                      {initials(name)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{name}</span>
                  </label>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <AvatarChip key={id} name={byId.get(id) ?? "Unknown"} onRemove={() => toggle(id, false)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
