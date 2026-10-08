export type CommercialDiscount = { name: string; kind: "percentage" | "fixed"; value: number; amount: number };
const money = (value: number) => Math.round(value * 100) / 100;

export function calculateCommercialPrice(input: {
  coursePrice: number;
  enrollmentFee: number;
  materialDiscount: number;
  special?: { name: string; kind: "percentage" | "fixed"; value: number; max_discount?: number | null; min_final_price?: number | null } | null;
  additional?: number;
  installments?: number;
}) {
  const coursePrice = money(input.coursePrice);
  const enrollmentFee = money(input.enrollmentFee);
  const original = money(coursePrice + enrollmentFee);
  const material = money(Math.min(original, input.materialDiscount));
  const subtotal = money(original - material);
  const breakdown: CommercialDiscount[] = [];
  if (material > 0) breakdown.push({ name: "Desconto de Material Didático", kind: "fixed", value: input.materialDiscount, amount: material });
  let remaining = subtotal;
  const rule = input.special;
  if (rule) {
    const requested = rule.kind === "percentage" ? subtotal * rule.value / 100 : rule.value;
    const floor = Math.min(subtotal, Number(rule.min_final_price ?? 0));
    const amount = money(Math.max(0, Math.min(requested, rule.max_discount ?? requested, subtotal - floor)));
    breakdown.push({ name: `Condição Especial: ${rule.name}`, kind: rule.kind, value: rule.value, amount });
    remaining = money(remaining - amount);
  }
  if (input.additional && input.additional > 0) {
    const floor = Math.min(subtotal, Number(rule?.min_final_price ?? 0));
    const amount = money(Math.max(0, Math.min(input.additional, remaining - floor)));
    breakdown.push({ name: "Desconto Adicional Autorizado", kind: "fixed", value: input.additional, amount });
    remaining = money(remaining - amount);
  }
  const final = remaining;
  const economy = money(original - final);
  const count = Math.max(1, input.installments ?? 1);
  const portion = Math.floor(final * 100 / count) / 100;
  return { coursePrice, enrollmentFee, original, material, subtotal, breakdown, final, economy, count, portion, discountPct: original > 0 ? Math.round(economy / original * 100) : 0 };
}