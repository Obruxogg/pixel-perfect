type ActiveRecord = { id: string; status: string };
type Price = ActiveRecord & { course_id: string; payment_method_id: string | null; installment_option_id: string | null; valid_from: string | null; valid_until: string | null };
type Installment = ActiveRecord & { payment_method_id: string; installments: number };
type Discount = ActiveRecord & { allowed_roles: string[]; course_ids: string[]; payment_method_ids: string[]; valid_from: string | null; valid_until: string | null };
type Condition = ActiveRecord & { course_id: string; course_price_id: string; payment_method_id: string; installment_option_id: string | null; discount_rule_id: string | null; allowed_roles: string[] };

function isCurrent(record: { valid_from: string | null; valid_until: string | null }, now: number) {
  return (!record.valid_from || Date.parse(record.valid_from) <= now) && (!record.valid_until || Date.parse(record.valid_until) >= now);
}

// The same eligibility rules drive the editor and validate proposal creation.
export function eligibleCommercialConditions<T extends Condition>(input: {
  courseId: string;
  roles: string[];
  conditions: T[];
  methods: ActiveRecord[];
  installments: Installment[];
  prices: Price[];
  discounts: Discount[];
  now?: number;
}) {
  const now = input.now ?? Date.now();
  return input.conditions.filter(condition => {
    if (condition.status !== "active" || condition.course_id !== input.courseId || !condition.allowed_roles.some(role => input.roles.includes(role))) return false;
    const method = input.methods.find(item => item.id === condition.payment_method_id && item.status === "active");
    if (!method) return false;
    if (condition.installment_option_id) {
      const installment = input.installments.find(item => item.id === condition.installment_option_id);
      if (!installment || installment.status !== "active" || installment.payment_method_id !== method.id || !Number.isInteger(installment.installments) || installment.installments < 1) return false;
    }
    const price = input.prices.find(item => item.id === condition.course_price_id);
    if (!price || price.status !== "active" || price.course_id !== input.courseId || !isCurrent(price, now)) return false;
    if (price.payment_method_id && price.payment_method_id !== method.id) return false;
    if (price.installment_option_id && price.installment_option_id !== condition.installment_option_id) return false;
    if (condition.discount_rule_id) {
      const discount = input.discounts.find(item => item.id === condition.discount_rule_id);
      if (!discount || discount.status !== "active" || !isCurrent(discount, now) || !discount.allowed_roles.some(role => input.roles.includes(role))) return false;
      if (discount.course_ids.length && !discount.course_ids.includes(input.courseId)) return false;
      if (discount.payment_method_ids.length && !discount.payment_method_ids.includes(method.id)) return false;
    }
    return true;
  });
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatInstallmentSummary(total: number, count: number, portion: number) {
  if (count <= 1) return `À vista: ${currency.format(total)}`;
  const last = Math.round((total - portion * (count - 1)) * 100) / 100;
  if (Math.round(last * 100) === Math.round(portion * 100)) return `${count}x de ${currency.format(portion)}`;
  return `${count - 1}x de ${currency.format(portion)} + última de ${currency.format(last)}`;
}