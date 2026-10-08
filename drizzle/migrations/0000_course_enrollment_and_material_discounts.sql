CREATE TABLE public.enrollment_settings (
 id text PRIMARY KEY DEFAULT 'global' CHECK (id = 'global'),
 default_fee numeric(12,2) NOT NULL DEFAULT 450 CHECK (default_fee >= 0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.enrollment_settings TO authenticated;
GRANT ALL ON public.enrollment_settings TO service_role;
ALTER TABLE public.enrollment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY enrollment_read ON public.enrollment_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY enrollment_manage ON public.enrollment_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
INSERT INTO public.enrollment_settings (id, default_fee) SELECT 'global', 450 WHERE NOT EXISTS (SELECT 1 FROM public.enrollment_settings WHERE id='global');
ALTER TABLE public.courses ADD COLUMN enrollment_fee numeric(12,2) DEFAULT NULL CHECK (enrollment_fee >= 0), ADD COLUMN material_discount numeric(12,2) NOT NULL DEFAULT 0 CHECK (material_discount >= 0);
CREATE POLICY courses_manager_manage ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'manager'));
ALTER TABLE public.proposals ADD COLUMN course_price_snapshot numeric(12,2), ADD COLUMN enrollment_fee_snapshot numeric(12,2), ADD COLUMN material_discount_snapshot numeric(12,2), ADD COLUMN subtotal_snapshot numeric(12,2);
CREATE OR REPLACE FUNCTION private.audit_enrollment_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE old_value jsonb; affected jsonb;
BEGIN
 IF TG_TABLE_NAME = 'courses' THEN
  IF TG_OP='UPDATE' AND OLD.enrollment_fee IS NOT DISTINCT FROM NEW.enrollment_fee AND OLD.material_discount IS NOT DISTINCT FROM NEW.material_discount THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' THEN old_value=jsonb_build_object('enrollment_fee',OLD.enrollment_fee,'material_discount',OLD.material_discount); END IF;
  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,old_data,new_data) VALUES(auth.uid(),'course_enrollment_updated','courses',NEW.id,old_value,jsonb_build_object('enrollment_fee',NEW.enrollment_fee,'material_discount',NEW.material_discount,'course_name',NEW.name));
 ELSE
  IF TG_OP='UPDATE' AND OLD.default_fee IS NOT DISTINCT FROM NEW.default_fee THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' THEN old_value=jsonb_build_object('default_fee',OLD.default_fee); END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name)),'[]'::jsonb) INTO affected FROM public.courses WHERE enrollment_fee IS NULL;
  INSERT INTO public.audit_logs(user_id,action,entity_type,old_data,new_data) VALUES(auth.uid(),'global_enrollment_updated','enrollment_settings',old_value,jsonb_build_object('default_fee',NEW.default_fee,'affected_courses',affected));
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.audit_enrollment_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER courses_enrollment_audit AFTER INSERT OR UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION private.audit_enrollment_change();
CREATE TRIGGER enrollment_settings_audit AFTER INSERT OR UPDATE ON public.enrollment_settings FOR EACH ROW EXECUTE FUNCTION private.audit_enrollment_change();
CREATE TRIGGER enrollment_settings_updated BEFORE UPDATE ON public.enrollment_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE FUNCTION public.set_course_enrollment_bulk(course_ids uuid[], fee numeric) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE changed integer;
BEGIN
 IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')) THEN RAISE EXCEPTION 'Somente a gestão pode alterar matrículas'; END IF;
 IF fee < 0 OR array_length(course_ids,1) IS NULL THEN RAISE EXCEPTION 'Valores ou cursos inválidos'; END IF;
 IF (SELECT count(*) FROM public.courses WHERE id=ANY(course_ids)) <> (SELECT count(DISTINCT x) FROM unnest(course_ids) x) THEN RAISE EXCEPTION 'Curso não encontrado'; END IF;
 UPDATE public.courses SET enrollment_fee=fee WHERE id=ANY(course_ids);
 GET DIAGNOSTICS changed=ROW_COUNT;
 RETURN changed;
END $$;
REVOKE ALL ON FUNCTION public.set_course_enrollment_bulk(uuid[],numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_course_enrollment_bulk(uuid[],numeric) TO authenticated,service_role;