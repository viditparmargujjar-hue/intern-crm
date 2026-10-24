import { Menu } from "lucide-react";
import { useState } from "react";

import { SidebarContents } from "@/components/layout/AppSidebar";
import { Logo } from "@/components/layout/Logo";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/** Sidebar in a slide-over panel, for small screens. */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass-strong sticky top-0 z-20 flex items-center gap-3 border-b border-border px-4 py-3 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open navigation">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContents onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <Logo className="size-7 rounded-lg text-xs" />
      <p className="text-sm font-semibold">Pixel Infinite CRM</p>
      <span className="ml-auto flex items-center">
        <ThemeSwitcher />
        <NotificationBell />
      </span>
    </div>
  );
}
