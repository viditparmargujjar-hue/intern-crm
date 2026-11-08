import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

function query(sql: string) {
  return execFileSync("lovable", ["supabase", "query", sql], { encoding: "utf8" });
}

it("allows only admins to read audit history", () => {
  const result = query("SELECT count(*) AS matching FROM pg_policies WHERE schemaname='public' AND tablename='registration_review_history' AND cmd='SELECT' AND qual LIKE '%has_role%admin%'");
  expect(result).toMatch(/"matching"\s*:\s*1/);
});

it("does not grant authenticated users permission to rewrite audit decisions", () => {
  const result = query("SELECT has_table_privilege('authenticated','public.registration_review_history','INSERT') AS can_insert, has_table_privilege('authenticated','public.registration_review_history','UPDATE') AS can_update, has_table_privilege('authenticated','public.registration_review_history','DELETE') AS can_delete");
  expect(result).toMatch(/"can_insert"\s*:\s*false/);
  expect(result).toMatch(/"can_update"\s*:\s*false/);
  expect(result).toMatch(/"can_delete"\s*:\s*false/);
});

it("captures actual admin identity and database time on each changed decision", () => {
  const result = query("SELECT count(*) AS matching FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname='capture_registration_review' AND p.prosrc LIKE '%actor := auth.uid()%' AND p.prosrc LIKE '%NEW.reviewed_at := clock_timestamp()%' AND p.prosrc LIKE '%NEW.status IS DISTINCT FROM OLD.status%'");
  expect(result).toMatch(/"matching"\s*:\s*1/);
});