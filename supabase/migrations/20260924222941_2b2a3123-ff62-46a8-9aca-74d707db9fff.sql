CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.has_role(uuid,public.app_role) SET SCHEMA private;
ALTER FUNCTION public.my_team_id() SET SCHEMA private;
ALTER FUNCTION public.can_access_profile(uuid) SET SCHEMA private;
DROP FUNCTION public.ensure_my_profile(text);

REVOKE ALL ON FUNCTION private.has_role(uuid,public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.my_team_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_access_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid,public.app_role),private.my_team_id(),private.can_access_profile(uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,private AS $$ SELECT private.has_role(_user_id,_role) $$;
CREATE OR REPLACE FUNCTION public.my_team_id() RETURNS uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,private AS $$ SELECT private.my_team_id() $$;
CREATE OR REPLACE FUNCTION public.can_access_profile(_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,private AS $$ SELECT private.can_access_profile(_id) $$;
REVOKE ALL ON FUNCTION public.has_role(uuid,public.app_role),public.my_team_id(),public.can_access_profile(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role),public.my_team_id(),public.can_access_profile(uuid) TO authenticated,service_role;