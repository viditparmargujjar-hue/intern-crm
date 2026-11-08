<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Scope login and dashboard refinements under dedicated page classes; shared CRM components retain their default appearance on unrelated pages.
- Shared ownership of leads/follow-ups lives in `lead_assignments` / `follow_up_assignments` join tables (admin-managed, interns read own); `can_access_lead` covers both primary and shared assignment, so reuse it for new lead-scoped access checks.
- Per-user CRM/notification preferences live in the `preferences` jsonb column on `public.users`, parsed via `parsePreferences` in `src/lib/preferences.ts` — always merge with `DEFAULT_PREFERENCES` so old rows keep working.
- The app-wide date format is a module var in `src/lib/crm.ts` (`setDateFormat`), applied by the authenticated shell from user preferences; new date rendering should use `formatDate`/`formatDateTime`.
- Deployment identification is injected into the served code by Vite and displayed through shared navigation; never call build time publication time, because publication completion metadata is unavailable to the app.
- Registration review history is append-only and captured atomically by a database trigger using the authenticated admin identity and database time; legacy entries preserve only the latest known review, never invented earlier decisions.
