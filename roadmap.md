# Setup tasks for remixed project

- [x] Add admin, outcome, and inclusive date-range filters to registration review history; six tests passed, verified with real history on desktop/mobile including no matches, invalid ranges, and reset.

- [x] Add append-only registration review history, reviewer identity and review time; verified successive decisions and reload readback on desktop/mobile, removed test data, and tested access protection.

- [x] Improve Intern Approvals discovery and loading, error, search, and no-pending states; verified desktop/mobile with real registrations.

- [x] Add compact, immutable deployment version and accurately labeled build timestamp in desktop/mobile navigation; exact last-published time unavailable from the platform.

- [x] Polish intern/admin login and dashboards with scoped presentation-only styling.
- [x] Step 1 — Clear copied Drizzle migrations and rescaffold an empty migration set
- [x] Admin Login entry point on the intern login page
- [x] Initial admin provisioned: crm1intern@gmail.com, admin role, browser login reaches /admin.
- [x] Restored auth.users signup triggers; intern signup verified (viditparmagujjar@gmail.com approved).
- [ ] Intern password sign-in re-test — requires the intern's own password; blocked on user.

## Premium SaaS pass (uploaded brief, 21 Oct 2026)
- [ ] Settings: working profile, password change, notifications, CRM preferences, reset/cancel (admin + intern share /settings).
- [ ] Top-header theme switcher (light/dark/system) on desktop sidebar + mobile nav.
- [ ] Multi-intern assignment for follow-ups (join table + picker + chips + RLS).
- [ ] Multi-intern assignment for leads (join table + picker + bulk assign + RLS).
- [ ] Verify: build, tests, browser check of settings save, theme switch, multi-assign, shared visibility.
