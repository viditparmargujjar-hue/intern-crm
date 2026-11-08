CREATE TABLE public.registration_review_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 registration_id uuid NOT NULL REFERENCES public.registration_requests(id),
 previous_status text,
 status text NOT NULL CHECK (status IN ('approved', 'rejected')),
 reviewed_by uuid,
 reviewer_name text,
 reviewer_email text,
 reviewed_at timestamptz NOT NULL DEFAULT now(),
 historical boolean NOT NULL DEFAULT false
);
GRANT SELECT ON public.registration_review_history TO authenticated;
GRANT ALL ON public.registration_review_history TO service_role;
ALTER TABLE public.registration_review_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read registration history" ON public.registration_review_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX registration_review_history_registration_idx ON public.registration_review_history(registration_id, reviewed_at DESC);
INSERT INTO public.registration_review_history (registration_id, status, reviewed_by, reviewer_name, reviewer_email, reviewed_at, historical)
SELECT r.id, r.status, r.reviewed_by, p.full_name, p.email, r.reviewed_at, true
FROM public.registration_requests r LEFT JOIN public.profiles p ON p.id = r.reviewed_by
WHERE r.status IN ('approved','rejected') AND r.reviewed_at IS NOT NULL;
CREATE FUNCTION public.capture_registration_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor uuid; actor_name text; actor_email text;
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected') THEN
  actor := auth.uid();
  IF actor IS NULL OR NOT public.has_role(actor, 'admin'::public.app_role) OR NEW.user_id = actor THEN
   RAISE EXCEPTION 'Only admins can review another registration';
  END IF;
  NEW.reviewed_by := actor;
  NEW.reviewed_at := clock_timestamp();
  SELECT full_name, email INTO actor_name, actor_email FROM public.profiles WHERE id = actor;
  INSERT INTO public.registration_review_history(registration_id, previous_status, status, reviewed_by, reviewer_name, reviewer_email, reviewed_at)
  VALUES (NEW.id, OLD.status, NEW.status, actor, actor_name, actor_email, NEW.reviewed_at);
 ELSE
  NEW.reviewed_by := OLD.reviewed_by;
  NEW.reviewed_at := OLD.reviewed_at;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.capture_registration_review() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER capture_registration_review BEFORE UPDATE ON public.registration_requests FOR EACH ROW EXECUTE FUNCTION public.capture_registration_review();
COMMENT ON TABLE public.registration_review_history IS 'Append-only admin review decisions; historical rows preserve the latest previously recorded decision, not a reconstructed full history.';