export type CommercialDiscount = {
  name: string;
  kind: "percentage" | "fixed";
  value: number;
  amount: number;
  base?: number;
};

export const money = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

export type CalculateCommercialPriceInput = {
  coursePrice: number;
  enrollmentFee?: number;
  enrollmentPromotionalFee?: number;
  enrollmentCondition?: "normal" | "promotional";
  promotionalActive?: boolean;
  materialDiscount?: number;
  materialReferencePrice?: number;
  materialBilling?: "included" | "discounted" | "separate";
  special?: {
    name: string;
    kind: "percentage" | "fixed";
    value: number;
    max_discount?: number | null;
    min_final_price?: number | null;
  } | null;
  additional?: number;
  installments?: number;
  parcelCharges?: number;
};

export function calculateCommercialPrice(input: CalculateCommercialPriceInput) {
  // 1. Valor comercial de tabela do curso
  const coursePrice = money(Math.max(0, input.coursePrice));

  // 2. Material didático
  const materialBilling = input.materialBilling ?? "included";
  const rawMaterialDiscount = money(Math.max(0, input.materialDiscount ?? 0));
  // Desconto de material didático sobre o curso quando aplicável
  const materialDiscountAmount = money(Math.min(coursePrice, rawMaterialDiscount));

  const breakdown: CommercialDiscount[] = [];
  if (materialDiscountAmount > 0) {
    breakdown.push({
      name: "Desconto de Material Didático",
      kind: "fixed",
      value: rawMaterialDiscount,
      amount: materialDiscountAmount,
      base: coursePrice,
    });
  }

  // Base do curso após dedução do desconto de material (se houver)
  const courseBaseAfterMaterial = money(Math.max(0, coursePrice - materialDiscountAmount));
  let remainingCourse = courseBaseAfterMaterial;

  // 3. Desconto de Condição Especial (regra comercial)
  const rule = input.special;
  let specialAmount = 0;
  if (rule && rule.value > 0) {
    const requested = rule.kind === "percentage"
      ? money((courseBaseAfterMaterial * Number(rule.value)) / 100)
      : money(Number(rule.value));

    const floor = Math.min(courseBaseAfterMaterial, Number(rule.min_final_price ?? 0));
    const maxDiscount = rule.max_discount != null ? Number(rule.max_discount) : requested;
    specialAmount = money(Math.max(0, Math.min(requested, maxDiscount, courseBaseAfterMaterial - floor)));

    breakdown.push({
      name: `Condição Especial: ${rule.name}`,
      kind: rule.kind,
      value: Number(rule.value),
      amount: specialAmount,
      base: courseBaseAfterMaterial,
    });
    remainingCourse = money(Math.max(0, remainingCourse - specialAmount));
  }

  // 4. Desconto Adicional Autorizado
  let additionalAmount = 0;
  if (input.additional && input.additional > 0) {
    const floor = Math.min(courseBaseAfterMaterial, Number(rule?.min_final_price ?? 0));
    additionalAmount = money(Math.max(0, Math.min(Number(input.additional), remainingCourse - floor)));

    breakdown.push({
      name: "Desconto Adicional Autorizado",
      kind: "fixed",
      value: Number(input.additional),
      amount: additionalAmount,
      base: remainingCourse,
    });
    remainingCourse = money(Math.max(0, remainingCourse - additionalAmount));
  }

  // 5. Valor líquido do curso = Valor de tabela − Descontos aplicáveis ao curso
  const totalCourseDiscounts = money(materialDiscountAmount + specialAmount + additionalAmount);
  const courseNet = money(Math.max(0, coursePrice - totalCourseDiscounts));

  // 6. Saldo parcelável = Valor líquido do curso + eventuais encargos de parcelamento autorizados
  const parcelCharges = money(Math.max(0, input.parcelCharges ?? 0));
  const installmentBalance = money(courseNet + parcelCharges);

  // 7. Valor das parcelas = Saldo parcelável ÷ Quantidade de parcelas (distribuição exata de centavos)
  const count = Math.max(1, Math.floor(Number(input.installments) || 1));
  const portion = Math.floor((installmentBalance * 100) / count) / 100;
  const lastPortion = money(installmentBalance - portion * (count - 1));
  const installmentsList = Array.from({ length: count }, (_, i) => (i === count - 1 ? lastPortion : portion));
  const sumInstallments = money(portion * (count - 1) + lastPortion);

  // 8. Matrícula — cobrança independente, NUNCA integra as parcelas do curso
  const normalFee = money(Math.max(0, input.enrollmentFee ?? 0));
  const promoFee = input.enrollmentPromotionalFee != null ? money(Math.max(0, input.enrollmentPromotionalFee)) : normalFee;
  const isPromoActive = input.promotionalActive ?? true;

  const isPromotional = isPromoActive && (input.enrollmentCondition === "promotional" || (input.enrollmentCondition === undefined && promoFee < normalFee));
  const enrollmentPayable = isPromotional ? promoFee : normalFee;
  const enrollmentDiscount = isPromotional ? money(Math.max(0, normalFee - promoFee)) : 0;
  const enrollmentCondition = isPromotional ? "promotional" : "normal";

  // 9. Total geral da contratação = Saldo parcelável + Matrícula + cobranças adicionais
  const totalContract = money(installmentBalance + enrollmentPayable);

  // Economia total (curso + matrícula)
  const totalEconomy = money(totalCourseDiscounts + enrollmentDiscount);
  const discountPct = coursePrice > 0 ? Math.round((totalCourseDiscounts / coursePrice) * 100) : 0;

  return {
    // Curso
    coursePrice,
    courseNet,
    subtotal: courseNet, // alias para valor líquido do curso
    original: coursePrice, // alias para valor de tabela original
    material: materialDiscountAmount,
    materialBilling,
    breakdown,
    totalCourseDiscounts,

    // Parcelamento
    parcelCharges,
    installmentBalance,
    count,
    portion,
    lastPortion,
    installmentsList,
    sumInstallments,

    // Matrícula (SEPARADA)
    enrollmentFee: normalFee,
    enrollmentPromotionalFee: promoFee,
    enrollmentDiscount,
    enrollmentPayable,
    enrollmentCondition,
    isPromotionalEnrollment: isPromotional,

    // Total Geral
    totalContract,
    final: totalContract, // alias para total geral da contratação
    economy: totalEconomy,
    courseEconomy: totalCourseDiscounts,
    discountPct,
  };
}