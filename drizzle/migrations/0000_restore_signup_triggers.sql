DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();
DROP TRIGGER IF EXISTS on_auth_user_created_registration ON auth.users;
CREATE TRIGGER on_auth_user_created_registration AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_registration();
INSERT INTO public.profiles (id, full_name, email)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', u.email), u.email FROM auth.users u
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.registration_requests (user_id, full_name, email)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', u.email), u.email FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin')
ON CONFLICT (user_id) DO NOTHING;