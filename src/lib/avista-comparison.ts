import { calculateCommercialPrice, money } from "./commercial-calculation";
import { eligibleCommercialConditions } from "./commercial-options";

export type AVistaOption = {
  isSpecificCondition: boolean;
  conditionId?: string;
  conditionName?: string;
  paymentMethodId?: string;
  paymentMethodName: string;
  courseNet: number;
  enrollmentPayable: number;
  totalAVista: number;
  discountName?: string;
  discountAmount?: number;
};

export type ComparativeAnchorData = {
  showAnchor: boolean;
  installments: number;
  installmentValue: number;
  totalParcelado: number;
  totalAVista: number;
  aVistaCourseNet: number;
  enrollmentPayable: number;
  economy: number;
  economyPercentage: number;
  paymentMethodName: string;
  conditionName?: string;
  isSpecificCondition: boolean;
  conditionId?: string;
  paymentMethodId?: string;
};

export interface FindBestAVistaConditionInput {
  courseId: string;
  courseBasePrice: number;
  roles: string[];
  conditions: any[];
  methods: any[];
  installments: any[];
  prices: any[];
  discounts: any[];
  enrollmentFee?: number;
  enrollmentPromotionalFee?: number;
  enrollmentCondition?: "normal" | "promotional";
  promotionalActive?: boolean;
  materialDiscount?: number;
  materialBilling?: "included" | "discounted" | "separate";
  fallbackCourseNet?: number;
}

/**
 * Normaliza e identifica se uma forma de pagamento é Pix ou Dinheiro
 */
export function isPixOrCash(name?: string | null, code?: string | null): boolean {
  const norm = `${name || ""} ${code || ""}`.toLowerCase();
  return /pix|dinheiro|espécie|especie|cash/i.test(norm);
}

/**
 * Busca a melhor condição comercial à vista ativa e autorizada para o curso.
 * 1. Prioriza condições cadastradas para Pix ou Dinheiro (1x / à vista)
 * 2. Calcula o valor de cada uma via calculateCommercialPrice e seleciona o menor valor líquido
 * 3. Fallback: caso não haja condição específica, usa o valor líquido do curso sem encargos
 */
export function findBestAVistaOption(input: FindBestAVistaConditionInput): AVistaOption {
  const {
    courseId,
    courseBasePrice,
    roles,
    conditions,
    methods,
    installments,
    prices,
    discounts,
    enrollmentFee,
    enrollmentPromotionalFee,
    enrollmentCondition,
    promotionalActive,
    materialDiscount,
    materialBilling,
    fallbackCourseNet,
  } = input;

  // 1. Filtrar condições elegíveis para o curso e perfis do usuário
  const eligible = eligibleCommercialConditions({
    courseId,
    roles,
    conditions,
    methods,
    installments,
    prices,
    discounts,
  });

  // 2. Condições com parcelamento à vista (installment_option_id === null ou parcelas === 1)
  const aVistaConditions = eligible.filter((cond) => {
    if (!cond.installment_option_id) return true;
    const inst = installments.find((i) => i.id === cond.installment_option_id);
    return inst && inst.installments === 1;
  });

  // 3. Filtrar especificamente condições com Pix ou Dinheiro
  const pixOrCashConditions = aVistaConditions.filter((cond) => {
    const method = methods.find((m) => m.id === cond.payment_method_id);
    return isPixOrCash(method?.name, method?.code);
  });

  // Conjunto a avaliar: primeiro Pix/Dinheiro; se não houver, avalia qualquer condição à vista autorizada
  const candidates = pixOrCashConditions.length > 0 ? pixOrCashConditions : aVistaConditions;

  let bestOption: AVistaOption | null = null;

  for (const cond of candidates) {
    const priceRow = prices.find((p) => p.id === cond.course_price_id);
    const rule = discounts.find((d) => d.id === cond.discount_rule_id);
    const method = methods.find((m) => m.id === cond.payment_method_id);
    const configuredPrice = Number(priceRow?.price ?? courseBasePrice ?? 0);

    const calc = calculateCommercialPrice({
      coursePrice: configuredPrice,
      enrollmentFee,
      enrollmentPromotionalFee,
      enrollmentCondition,
      promotionalActive,
      materialDiscount,
      materialBilling,
      special: rule ? { ...rule, value: Number(rule.value) } : null,
      installments: 1,
    });

    const candidate: AVistaOption = {
      isSpecificCondition: true,
      conditionId: cond.id,
      conditionName: cond.name,
      paymentMethodId: cond.payment_method_id,
      paymentMethodName: method?.name || "Pix / Dinheiro",
      courseNet: calc.courseNet,
      enrollmentPayable: calc.enrollmentPayable,
      totalAVista: calc.totalContract,
      discountName: rule?.name,
      discountAmount: calc.totalCourseDiscounts,
    };

    if (!bestOption || candidate.courseNet < bestOption.courseNet) {
      bestOption = candidate;
    }
  }

  // 4. Fallback caso não haja nenhuma condição cadastrada
  if (!bestOption) {
    const fallbackNet = money(
      fallbackCourseNet != null && fallbackCourseNet > 0 ? fallbackCourseNet : courseBasePrice
    );
    // Matrícula a pagar no fallback
    const normEnrollment = money(Math.max(0, enrollmentFee ?? 0));
    const promoEnrollment = enrollmentPromotionalFee != null ? money(Math.max(0, enrollmentPromotionalFee)) : normEnrollment;
    const isPromo = (promotionalActive ?? true) && (enrollmentCondition === "promotional" || (enrollmentCondition === undefined && promoEnrollment < normEnrollment));
    const payableEnrollment = isPromo ? promoEnrollment : normEnrollment;

    bestOption = {
      isSpecificCondition: false,
      paymentMethodName: "À Vista (Pix ou Dinheiro)",
      courseNet: fallbackNet,
      enrollmentPayable: payableEnrollment,
      totalAVista: money(fallbackNet + payableEnrollment),
    };
  }

  return bestOption;
}

/**
 * Calcula a ancoragem comparativa entre a proposta parcelada e a opção à vista.
 *
 * Fórmula:
 * Total Parcelado = (Valor da Parcela × Quantidade de Parcelas) + Matrícula a Pagar
 * Total à Vista   = Saldo Líquido do Curso com Desconto à Vista + Matrícula a Pagar
 * Economia        = Total Parcelado - Total à Vista
 *
 * Condição de ativação:
 * - installments > 1 (oculto se installments === 1 ou cash)
 * - Economia > 0
 */
export function calculateComparativeAnchor(params: {
  installments: number;
  installmentValue: number;
  enrollmentPayable: number;
  aVistaOption: AVistaOption;
}): ComparativeAnchorData {
  const count = Math.max(1, Math.floor(Number(params.installments) || 1));
  const portion = money(params.installmentValue);
  const enrollmentPayable = money(params.enrollmentPayable);

  // Regra 2.1: Exibido APENAS quando a proposta tiver 2 ou mais parcelas
  if (count <= 1) {
    return {
      showAnchor: false,
      installments: count,
      installmentValue: portion,
      totalParcelado: money(portion * count + enrollmentPayable),
      totalAVista: params.aVistaOption.totalAVista,
      aVistaCourseNet: params.aVistaOption.courseNet,
      enrollmentPayable,
      economy: 0,
      economyPercentage: 0,
      paymentMethodName: params.aVistaOption.paymentMethodName,
      conditionName: params.aVistaOption.conditionName,
      isSpecificCondition: params.aVistaOption.isSpecificCondition,
      conditionId: params.aVistaOption.conditionId,
      paymentMethodId: params.aVistaOption.paymentMethodId,
    };
  }

  // Total Parcelado = (Valor da Parcela × Quantidade de Parcelas) + Matrícula a Pagar
  const totalParcelado = money(portion * count + enrollmentPayable);

  // Total à Vista = Saldo Líquido do Curso com Desconto à Vista + Matrícula a Pagar
  const aVistaCourseNet = money(params.aVistaOption.courseNet);
  const totalAVista = money(aVistaCourseNet + enrollmentPayable);

  // Economia Comparativa = Total Parcelado - Total à Vista
  const economy = money(totalParcelado - totalAVista);
  const economyPercentage = totalParcelado > 0 ? Math.round((economy / totalParcelado) * 100) : 0;

  // Só exibe se houver economia positiva e parcelas > 1
  const showAnchor = count > 1 && economy > 0;

  return {
    showAnchor,
    installments: count,
    installmentValue: portion,
    totalParcelado,
    totalAVista,
    aVistaCourseNet,
    enrollmentPayable,
    economy,
    economyPercentage,
    paymentMethodName: params.aVistaOption.paymentMethodName,
    conditionName: params.aVistaOption.conditionName,
    isSpecificCondition: params.aVistaOption.isSpecificCondition,
    conditionId: params.aVistaOption.conditionId,
    paymentMethodId: params.aVistaOption.paymentMethodId,
  };
}
