DROP TRIGGER IF EXISTS follow_ups_before_write ON public.follow_ups;
CREATE TRIGGER follow_ups_before_write BEFORE INSERT OR UPDATE ON public.follow_ups FOR EACH ROW EXECUTE FUNCTION public.follow_ups_before_write();
DROP TRIGGER IF EXISTS notify_follow_up_change ON public.follow_ups;
CREATE TRIGGER notify_follow_up_change AFTER UPDATE ON public.follow_ups FOR EACH ROW EXECUTE FUNCTION public.notify_follow_up_change();
DROP TRIGGER IF EXISTS notify_lead_assignment ON public.leads;
CREATE TRIGGER notify_lead_assignment AFTER INSERT OR UPDATE OF assigned_user_id ON public.leads FOR EACH ROW EXECUTE FUNCTION public.notify_lead_assignment();
CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe_key_key ON public.notifications (dedupe_key);