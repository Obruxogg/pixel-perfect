-- Migration: Melhorias no motor financeiro e gestão de matrículas
-- Garante colunas de matrícula promocional e material didático

-- 1. Enrollment Settings: suporte a matrícula promocional global
ALTER TABLE public.enrollment_settings
  ADD COLUMN IF NOT EXISTS promotional_fee numeric(12,2) NOT NULL DEFAULT 350.00 CHECK (promotional_fee >= 0),
  ADD COLUMN IF NOT EXISTS promotional_active boolean NOT NULL DEFAULT true;

-- Atualiza registro global se os valores forem nulos
UPDATE public.enrollment_settings
SET
  promotional_fee = COALESCE(promotional_fee, 350.00),
  promotional_active = COALESCE(promotional_active, true)
WHERE id = 'global';

-- 2. Courses: suporte a matrícula promocional por curso e tratamento de material
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS promotional_enrollment_fee numeric(12,2) DEFAULT NULL CHECK (promotional_enrollment_fee >= 0),
  ADD COLUMN IF NOT EXISTS material_reference_price numeric(12,2) DEFAULT NULL CHECK (material_reference_price >= 0),
  ADD COLUMN IF NOT EXISTS material_billing text NOT NULL DEFAULT 'included' CHECK (material_billing IN ('included', 'separate', 'discounted'));

-- 3. Proposals: campos auxiliares para rastreabilidade financeira explícita
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS enrollment_condition text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS enrollment_fee_paid numeric(12,2),
  ADD COLUMN IF NOT EXISTS contract_total numeric(12,2);
