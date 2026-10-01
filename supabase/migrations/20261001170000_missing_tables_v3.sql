-- V3: Adiciona tabelas ausentes no banco remoto
-- sales, commercial_triggers e proposal_discounts

-- ============================================================
-- TABELA: sales (registros de vendas confirmadas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES public.proposals(id),
  student_id uuid NOT NULL REFERENCES public.students(id),
  seller_id uuid NOT NULL REFERENCES public.profiles(id),
  course_id uuid REFERENCES public.courses(id),
  course_name text NOT NULL,
  original_price numeric(12,2) NOT NULL,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  final_price numeric(12,2) NOT NULL,
  payment_method_name text NOT NULL,
  installments integer NOT NULL DEFAULT 1,
  installment_value numeric(12,2) NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY sales_scope ON public.sales FOR SELECT TO authenticated
  USING (public.can_access_profile(seller_id));

CREATE POLICY sales_create ON public.sales FOR INSERT TO authenticated
  WITH CHECK (
    seller_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'manager') AND public.can_access_profile(seller_id))
  );

-- ============================================================
-- TABELA: commercial_triggers (gatilhos comerciais configuráveis)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.commercial_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text NOT NULL,
  description text,
  trigger_type text NOT NULL DEFAULT 'badge',
  template_text text NOT NULL,
  condition_rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  allowed_roles public.app_role[] NOT NULL DEFAULT ARRAY['seller'::public.app_role, 'manager'::public.app_role, 'admin'::public.app_role],
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_triggers TO authenticated;
GRANT ALL ON public.commercial_triggers TO service_role;
ALTER TABLE public.commercial_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY triggers_read ON public.commercial_triggers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY triggers_manage ON public.commercial_triggers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER commercial_triggers_set_updated_at
  BEFORE UPDATE ON public.commercial_triggers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- TABELA: proposal_discounts (descontos detalhados por proposta)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.proposal_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind public.discount_kind NOT NULL DEFAULT 'fixed',
  value numeric(12,2) NOT NULL DEFAULT 0,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_discounts TO authenticated;
GRANT ALL ON public.proposal_discounts TO service_role;
ALTER TABLE public.proposal_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY proposal_discounts_scope ON public.proposal_discounts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.proposals p
      WHERE p.id = proposal_id
        AND public.can_access_profile(p.seller_id)
    )
  );

CREATE POLICY proposal_discounts_create ON public.proposal_discounts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.proposals p
      WHERE p.id = proposal_id
        AND (
          p.seller_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'manager')
        )
    )
  );

-- ============================================================
-- DADOS INICIAIS: Gatilhos padrão
-- ============================================================
INSERT INTO public.commercial_triggers (name, title, description, trigger_type, template_text, sort_order)
VALUES
  ('Condicao Especial', 'Condicao Especial', 'Condicao especial disponivel neste atendimento', 'special_condition', 'Condicao especial disponivel exclusivamente neste atendimento.', 1),
  ('Economia Garantida', 'Economia Garantida', 'Mostra valor economizado', 'economy', 'Voce economiza {{economy}} nesta condicao especial.', 2),
  ('Validade da Oferta', 'Validade da Oferta', 'Alerta de validade da condicao', 'validity', 'Esta condicao e valida ate {{valid_until}}.', 3),
  ('Desconto Aplicado', 'Desconto Aplicado', 'Percentual de reducao', 'discount_pct', 'Desconto total aplicado: {{discount_pct}}%.', 4),
  ('Atendimento Imediato', 'Ultima Condicao', 'Exclusivo do atendimento atual', 'custom', 'Condicao apresentada em tempo real para a sua matricula.', 5)
ON CONFLICT DO NOTHING;
