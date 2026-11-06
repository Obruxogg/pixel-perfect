UPDATE public.commercial_conditions SET status='inactive' WHERE course_id IN (SELECT id FROM public.courses WHERE description IS NULL OR description NOT LIKE 'Tabela de Valores 2026%');
UPDATE public.courses SET status='inactive' WHERE description IS NULL OR description NOT LIKE 'Tabela de Valores 2026%';
UPDATE public.areas SET status='inactive' WHERE id NOT IN (SELECT area_id FROM public.courses WHERE status='active');
UPDATE public.discount_rules SET status='inactive' WHERE name NOT LIKE 'Pontualidade %';
UPDATE public.payment_methods SET status='inactive' WHERE is_demo = true;
UPDATE public.installment_options SET status='inactive' WHERE payment_method_id IN (SELECT id FROM public.payment_methods WHERE is_demo = true);