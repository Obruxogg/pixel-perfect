CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE public.app_role AS ENUM ('admin','manager','seller');
CREATE TYPE public.record_status AS ENUM ('active','inactive');
CREATE TYPE public.discount_kind AS ENUM ('percentage','fixed');
CREATE TYPE public.proposal_status AS ENUM ('draft','sent','viewed','awaiting_response','negotiation','approved','refused','expired','cancelled');
CREATE TYPE public.timer_status AS ENUM ('active','paused','expired','completed','cancelled');
CREATE TYPE public.followup_status AS ENUM ('pending','completed','cancelled');

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;

CREATE TABLE public.teams (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, description text, status public.record_status NOT NULL DEFAULT 'active', is_demo boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.teams TO authenticated; GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY teams_read ON public.teams FOR SELECT TO authenticated USING (true);

CREATE TABLE public.profiles (id uuid PRIMARY KEY, full_name text NOT NULL, avatar_url text, phone text, job_title text, team_id uuid REFERENCES public.teams(id), manager_id uuid REFERENCES public.profiles(id), hired_at date, status public.record_status NOT NULL DEFAULT 'active', preferences jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.profiles TO authenticated; GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_own ON public.profiles FOR ALL TO authenticated USING (id=auth.uid()) WITH CHECK (id=auth.uid());

CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, role public.app_role NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,role));
GRANT SELECT ON public.user_roles TO authenticated; GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY roles_own ON public.user_roles FOR SELECT TO authenticated USING (user_id=auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE OR REPLACE FUNCTION public.my_team_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT team_id FROM public.profiles WHERE id=auth.uid() $$;
CREATE OR REPLACE FUNCTION public.can_access_profile(_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT _id=auth.uid() OR public.has_role(auth.uid(),'admin') OR (public.has_role(auth.uid(),'manager') AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=_id AND p.team_id=public.my_team_id())) $$;
CREATE OR REPLACE FUNCTION public.ensure_my_profile(_name text) RETURNS public.profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE p public.profiles; initial_role public.app_role; BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF; INSERT INTO public.profiles(id,full_name) VALUES(auth.uid(),COALESCE(NULLIF(trim(_name),''),'Novo usuário')) ON CONFLICT(id) DO UPDATE SET full_name=CASE WHEN profiles.full_name='Novo usuário' THEN EXCLUDED.full_name ELSE profiles.full_name END RETURNING * INTO p; IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid()) THEN SELECT CASE WHEN EXISTS(SELECT 1 FROM public.user_roles) THEN 'seller'::public.app_role ELSE 'admin'::public.app_role END INTO initial_role; INSERT INTO public.user_roles(user_id,role) VALUES(auth.uid(),initial_role); END IF; RETURN p; END $$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role),public.my_team_id(),public.can_access_profile(uuid),public.ensure_my_profile(text) TO authenticated;

CREATE POLICY teams_manage ON public.teams FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY profiles_scope_read ON public.profiles FOR SELECT TO authenticated USING (public.can_access_profile(id));
CREATE POLICY profiles_scope_update ON public.profiles FOR UPDATE TO authenticated USING (public.can_access_profile(id)) WITH CHECK (public.can_access_profile(id));
CREATE POLICY roles_admin_read ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.areas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, description text, status public.record_status NOT NULL DEFAULT 'active', sort_order integer NOT NULL DEFAULT 0, is_demo boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.areas TO authenticated; GRANT ALL ON public.areas TO service_role;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY areas_read ON public.areas FOR SELECT TO authenticated USING (true); CREATE POLICY areas_admin ON public.areas FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.courses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), area_id uuid NOT NULL REFERENCES public.areas(id), name text NOT NULL, description text, workload_hours integer NOT NULL CHECK(workload_hours>0), modality text NOT NULL, base_price numeric(12,2) NOT NULL CHECK(base_price>=0), status public.record_status NOT NULL DEFAULT 'active', sort_order integer NOT NULL DEFAULT 0, is_demo boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(area_id,name));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.courses TO authenticated; GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY courses_read ON public.courses FOR SELECT TO authenticated USING (true); CREATE POLICY courses_admin ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.payment_methods (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, status public.record_status NOT NULL DEFAULT 'active', sort_order integer NOT NULL DEFAULT 0, is_demo boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.payment_methods TO authenticated; GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_read ON public.payment_methods FOR SELECT TO authenticated USING (true); CREATE POLICY payment_admin ON public.payment_methods FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.installment_options (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_method_id uuid NOT NULL REFERENCES public.payment_methods(id), installments integer NOT NULL CHECK(installments>0), label text NOT NULL, status public.record_status NOT NULL DEFAULT 'active', sort_order integer NOT NULL DEFAULT 0, is_demo boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(payment_method_id,installments));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.installment_options TO authenticated; GRANT ALL ON public.installment_options TO service_role;
ALTER TABLE public.installment_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY installment_read ON public.installment_options FOR SELECT TO authenticated USING (true); CREATE POLICY installment_admin ON public.installment_options FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.course_prices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), course_id uuid NOT NULL REFERENCES public.courses(id), payment_method_id uuid REFERENCES public.payment_methods(id), installment_option_id uuid REFERENCES public.installment_options(id), price numeric(12,2) NOT NULL CHECK(price>=0), label text, status public.record_status NOT NULL DEFAULT 'active', valid_from timestamptz, valid_until timestamptz, is_demo boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.course_prices TO authenticated; GRANT ALL ON public.course_prices TO service_role;
ALTER TABLE public.course_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY prices_read ON public.course_prices FOR SELECT TO authenticated USING (true); CREATE POLICY prices_admin ON public.course_prices FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.discount_rules (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, kind public.discount_kind NOT NULL, value numeric(12,2) NOT NULL CHECK(value>=0), min_final_price numeric(12,2), max_discount numeric(12,2), allowed_roles public.app_role[] NOT NULL DEFAULT ARRAY['admin'::public.app_role], course_ids uuid[] NOT NULL DEFAULT '{}', payment_method_ids uuid[] NOT NULL DEFAULT '{}', valid_from timestamptz, valid_until timestamptz, status public.record_status NOT NULL DEFAULT 'active', is_default boolean NOT NULL DEFAULT false, exceed_behavior text NOT NULL DEFAULT 'block' CHECK(exceed_behavior IN ('block','approval')), is_demo boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.discount_rules TO authenticated; GRANT ALL ON public.discount_rules TO service_role;
ALTER TABLE public.discount_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY discounts_read ON public.discount_rules FOR SELECT TO authenticated USING (true); CREATE POLICY discounts_admin ON public.discount_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.campaigns (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, description text, starts_at timestamptz, ends_at timestamptz, status public.record_status NOT NULL DEFAULT 'active', is_demo boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.campaigns TO authenticated; GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaigns_read ON public.campaigns FOR SELECT TO authenticated USING (true); CREATE POLICY campaigns_admin ON public.campaigns FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.commercial_conditions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, course_id uuid NOT NULL REFERENCES public.courses(id), course_price_id uuid NOT NULL REFERENCES public.course_prices(id), payment_method_id uuid NOT NULL REFERENCES public.payment_methods(id), installment_option_id uuid REFERENCES public.installment_options(id), discount_rule_id uuid REFERENCES public.discount_rules(id), campaign_id uuid REFERENCES public.campaigns(id), allowed_roles public.app_role[] NOT NULL DEFAULT ARRAY['seller'::public.app_role,'manager'::public.app_role,'admin'::public.app_role], validity_minutes integer NOT NULL DEFAULT 60 CHECK(validity_minutes>0), seller_extension_minutes integer NOT NULL DEFAULT 60, manager_extension_minutes integer NOT NULL DEFAULT 1440, status public.record_status NOT NULL DEFAULT 'active', is_demo boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.commercial_conditions TO authenticated; GRANT ALL ON public.commercial_conditions TO service_role;
ALTER TABLE public.commercial_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY conditions_read ON public.commercial_conditions FOR SELECT TO authenticated USING (true); CREATE POLICY conditions_admin ON public.commercial_conditions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.crm_stages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, color_key text NOT NULL DEFAULT 'neutral', sort_order integer NOT NULL DEFAULT 0, status public.record_status NOT NULL DEFAULT 'active', is_won boolean NOT NULL DEFAULT false, is_lost boolean NOT NULL DEFAULT false, is_demo boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.crm_stages TO authenticated; GRANT ALL ON public.crm_stages TO service_role;
ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY stages_read ON public.crm_stages FOR SELECT TO authenticated USING (true); CREATE POLICY stages_admin ON public.crm_stages FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL, whatsapp text NOT NULL, email text, notes text, source text, owner_id uuid REFERENCES public.profiles(id), crm_stage_id uuid REFERENCES public.crm_stages(id), status public.record_status NOT NULL DEFAULT 'active', is_demo boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(whatsapp));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.students TO authenticated; GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY students_scope ON public.students FOR SELECT TO authenticated USING (owner_id IS NULL OR public.can_access_profile(owner_id)); CREATE POLICY students_create ON public.students FOR INSERT TO authenticated WITH CHECK (owner_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR (public.has_role(auth.uid(),'manager') AND public.can_access_profile(owner_id))); CREATE POLICY students_update ON public.students FOR UPDATE TO authenticated USING (owner_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR (public.has_role(auth.uid(),'manager') AND public.can_access_profile(owner_id))) WITH CHECK (owner_id IS NULL OR public.can_access_profile(owner_id));

CREATE TABLE public.student_assignments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id), seller_id uuid REFERENCES public.profiles(id), assigned_by uuid NOT NULL REFERENCES public.profiles(id), started_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz, reason text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE ON public.student_assignments TO authenticated; GRANT ALL ON public.student_assignments TO service_role;
ALTER TABLE public.student_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY assignments_scope ON public.student_assignments FOR SELECT TO authenticated USING (seller_id IS NULL OR public.can_access_profile(seller_id)); CREATE POLICY assignments_write ON public.student_assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

CREATE TABLE public.student_interactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id), user_id uuid NOT NULL REFERENCES public.profiles(id), kind text NOT NULL, notes text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT ON public.student_interactions TO authenticated; GRANT ALL ON public.student_interactions TO service_role;
ALTER TABLE public.student_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY interactions_scope ON public.student_interactions FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.students s WHERE s.id=student_id AND (s.owner_id IS NULL OR public.can_access_profile(s.owner_id)))); CREATE POLICY interactions_create ON public.student_interactions FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.students s WHERE s.id=student_id AND (s.owner_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))));

CREATE TABLE public.proposals (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id), seller_id uuid NOT NULL REFERENCES public.profiles(id), course_id uuid REFERENCES public.courses(id), area_name text NOT NULL, course_name text NOT NULL, course_workload_hours integer, course_modality text, original_price numeric(12,2) NOT NULL, discount_name text, discount_kind public.discount_kind, discount_value numeric(12,2) NOT NULL DEFAULT 0, discount_amount numeric(12,2) NOT NULL DEFAULT 0, final_price numeric(12,2) NOT NULL, payment_method_name text NOT NULL, installments integer NOT NULL DEFAULT 1, installment_value numeric(12,2) NOT NULL, status public.proposal_status NOT NULL DEFAULT 'draft', timer_status public.timer_status, valid_until timestamptz, timer_remaining_seconds integer, notes text, is_demo boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE ON public.proposals TO authenticated; GRANT ALL ON public.proposals TO service_role;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY proposals_scope ON public.proposals FOR SELECT TO authenticated USING (public.can_access_profile(seller_id)); CREATE POLICY proposals_create ON public.proposals FOR INSERT TO authenticated WITH CHECK (seller_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR (public.has_role(auth.uid(),'manager') AND public.can_access_profile(seller_id))); CREATE POLICY proposals_update ON public.proposals FOR UPDATE TO authenticated USING (public.can_access_profile(seller_id)) WITH CHECK (public.can_access_profile(seller_id));

CREATE TABLE public.proposal_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), proposal_id uuid NOT NULL REFERENCES public.proposals(id), user_id uuid NOT NULL REFERENCES public.profiles(id), action text NOT NULL, old_data jsonb, new_data jsonb, notes text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT ON public.proposal_events TO authenticated; GRANT ALL ON public.proposal_events TO service_role;
ALTER TABLE public.proposal_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY proposal_events_scope ON public.proposal_events FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.proposals p WHERE p.id=proposal_id AND public.can_access_profile(p.seller_id))); CREATE POLICY proposal_events_create ON public.proposal_events FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid());

CREATE TABLE public.proposal_timer_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), proposal_id uuid NOT NULL REFERENCES public.proposals(id), user_id uuid NOT NULL REFERENCES public.profiles(id), action text NOT NULL, previous_status public.timer_status, new_status public.timer_status, previous_valid_until timestamptz, new_valid_until timestamptz, notes text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT ON public.proposal_timer_events TO authenticated; GRANT ALL ON public.proposal_timer_events TO service_role;
ALTER TABLE public.proposal_timer_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY timer_events_scope ON public.proposal_timer_events FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.proposals p WHERE p.id=proposal_id AND public.can_access_profile(p.seller_id))); CREATE POLICY timer_events_create ON public.proposal_timer_events FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid());

CREATE TABLE public.followups (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id), seller_id uuid NOT NULL REFERENCES public.profiles(id), due_at timestamptz NOT NULL, notes text, status public.followup_status NOT NULL DEFAULT 'pending', completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE ON public.followups TO authenticated; GRANT ALL ON public.followups TO service_role;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY followups_scope ON public.followups FOR SELECT TO authenticated USING (public.can_access_profile(seller_id)); CREATE POLICY followups_write ON public.followups FOR ALL TO authenticated USING (public.can_access_profile(seller_id)) WITH CHECK (public.can_access_profile(seller_id));

CREATE TABLE public.audit_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES public.profiles(id), action text NOT NULL, entity_type text NOT NULL, entity_id uuid, old_data jsonb, new_data jsonb, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT ON public.audit_logs TO authenticated; GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audits_read ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')); CREATE POLICY audits_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid());

CREATE INDEX students_owner_idx ON public.students(owner_id); CREATE INDEX students_stage_idx ON public.students(crm_stage_id); CREATE INDEX proposals_seller_status_idx ON public.proposals(seller_id,status); CREATE INDEX proposals_student_idx ON public.proposals(student_id); CREATE INDEX followups_seller_due_idx ON public.followups(seller_id,due_at); CREATE INDEX interactions_student_idx ON public.student_interactions(student_id,created_at DESC); CREATE INDEX proposal_events_proposal_idx ON public.proposal_events(proposal_id,created_at DESC);

DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['teams','profiles','areas','courses','payment_methods','installment_options','course_prices','discount_rules','campaigns','commercial_conditions','crm_stages','students','proposals','followups'] LOOP EXECUTE format('CREATE TRIGGER %I_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',t,t); END LOOP; END $$;

INSERT INTO public.areas(name,description,sort_order,is_demo) VALUES ('Tecnologia (Demonstração)','Dados de demonstração para testes',1,true),('Gestão (Demonstração)','Dados de demonstração para testes',2,true);
INSERT INTO public.courses(area_id,name,workload_hours,modality,base_price,sort_order,is_demo) SELECT id,'Excel Profissional (Demonstração)',120,'Presencial',2400,1,true FROM public.areas WHERE name='Tecnologia (Demonstração)';
INSERT INTO public.courses(area_id,name,workload_hours,modality,base_price,sort_order,is_demo) SELECT id,'Administração (Demonstração)',180,'Híbrido',3200,1,true FROM public.areas WHERE name='Gestão (Demonstração)';
INSERT INTO public.payment_methods(name,sort_order,is_demo) VALUES ('PIX (Demonstração)',1,true),('Cartão de crédito (Demonstração)',2,true);
INSERT INTO public.installment_options(payment_method_id,installments,label,sort_order,is_demo) SELECT id,1,'À vista',1,true FROM public.payment_methods WHERE name='PIX (Demonstração)';
INSERT INTO public.installment_options(payment_method_id,installments,label,sort_order,is_demo) SELECT id,12,'12 parcelas',2,true FROM public.payment_methods WHERE name='Cartão de crédito (Demonstração)';
INSERT INTO public.course_prices(course_id,payment_method_id,installment_option_id,price,label,is_demo) SELECT c.id,p.id,i.id,c.base_price,'Tabela demonstrativa',true FROM public.courses c CROSS JOIN public.payment_methods p JOIN public.installment_options i ON i.payment_method_id=p.id;
INSERT INTO public.discount_rules(name,kind,value,allowed_roles,is_default,is_demo) VALUES ('Condição inicial (Demonstração)','percentage',10,ARRAY['seller'::public.app_role,'manager'::public.app_role,'admin'::public.app_role],true,true);
INSERT INTO public.crm_stages(name,color_key,sort_order,is_won,is_lost,is_demo) VALUES ('Novo','sky',1,false,false,true),('Contato realizado','cyan',2,false,false,true),('Interesse','amber',3,false,false,true),('Proposta enviada','violet',4,false,false,true),('Aguardando resposta','orange',5,false,false,true),('Negociação','pink',6,false,false,true),('Retorno agendado','teal',7,false,false,true),('Matriculado','green',8,true,false,true),('Perdido','red',9,false,true,true);
INSERT INTO public.commercial_conditions(name,course_id,course_price_id,payment_method_id,installment_option_id,discount_rule_id,validity_minutes,is_demo) SELECT 'Condição demonstrativa — '||c.name,c.id,cp.id,cp.payment_method_id,cp.installment_option_id,d.id,60,true FROM public.courses c JOIN public.course_prices cp ON cp.course_id=c.id CROSS JOIN public.discount_rules d WHERE d.is_demo=true;
