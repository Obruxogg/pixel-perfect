-- Migration: Atualização de permissões nas regras de desconto de pontualidade
-- Garante que vendedores e gerentes tenham acesso às regras de desconto vinculadas às condições comerciais da Tabela 2026

-- 1. Atualizar todas as regras de desconto vinculadas a condições comerciais ativas
UPDATE public.discount_rules
SET
  allowed_roles = ARRAY['seller'::public.app_role, 'manager'::public.app_role, 'admin'::public.app_role],
  updated_at = now()
WHERE id IN (
  SELECT DISTINCT discount_rule_id
  FROM public.commercial_conditions
  WHERE discount_rule_id IS NOT NULL
    AND status = 'active'
);

-- 2. Atualizar quaisquer outras regras de desconto ativas de pontualidade ou que possuam apenas ['admin']
UPDATE public.discount_rules
SET
  allowed_roles = ARRAY['seller'::public.app_role, 'manager'::public.app_role, 'admin'::public.app_role],
  updated_at = now()
WHERE status = 'active'
  AND (
    allowed_roles = ARRAY['admin'::public.app_role]
    OR NOT ('seller'::public.app_role = ANY(allowed_roles))
  );

-- 3. Atualizar o valor padrão (DEFAULT) da coluna allowed_roles para incluir seller, manager e admin
ALTER TABLE public.discount_rules
  ALTER COLUMN allowed_roles SET DEFAULT ARRAY['seller'::public.app_role, 'manager'::public.app_role, 'admin'::public.app_role];

