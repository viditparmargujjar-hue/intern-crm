REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.registration_review_history FROM anon, authenticated;
REVOKE SELECT ON public.registration_review_history FROM anon;
GRANT SELECT ON public.registration_review_history TO authenticated;
GRANT ALL ON public.registration_review_history TO service_role;