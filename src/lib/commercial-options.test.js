import { describe, expect, test } from "bun:test";
import { eligibleCommercialConditions, formatInstallmentSummary } from "./commercial-options";

const method = { id: "credit", status: "active" };
const installment = { id: "six", status: "active", payment_method_id: "credit", installments: 6 };
const price = { id: "price", status: "active", course_id: "course", payment_method_id: "credit", installment_option_id: "six", valid_from: null, valid_until: null };
const condition = { id: "condition", status: "active", course_id: "course", course_price_id: "price", payment_method_id: "credit", installment_option_id: "six", discount_rule_id: null, allowed_roles: ["seller"] };
const input = { courseId: "course", roles: ["seller"], conditions: [condition], methods: [method], installments: [installment], prices: [price], discounts: [], now: Date.parse("2026-10-09T00:00:00Z") };

describe("authorized payment combinations", () => {
  test("allows a configured active combination", () => expect(eligibleCommercialConditions(input)).toEqual([condition]));
  test("rejects a condition for another course or role", () => {
    expect(eligibleCommercialConditions({ ...input, courseId: "another" })).toEqual([]);
    expect(eligibleCommercialConditions({ ...input, roles: ["manager"] })).toEqual([]);
  });
  test("rejects inactive methods and mismatched installments", () => {
    expect(eligibleCommercialConditions({ ...input, methods: [{ ...method, status: "inactive" }] })).toEqual([]);
    expect(eligibleCommercialConditions({ ...input, installments: [{ ...installment, payment_method_id: "boleto" }] })).toEqual([]);
    expect(eligibleCommercialConditions({ ...input, installments: [{ ...installment, status: "inactive" }] })).toEqual([]);
  });
  test("rejects missing or expired prices", () => {
    expect(eligibleCommercialConditions({ ...input, prices: [] })).toEqual([]);
    expect(eligibleCommercialConditions({ ...input, prices: [{ ...price, valid_until: "2026-10-08T00:00:00Z" }] })).toEqual([]);
  });
  test("rejects unavailable and out-of-scope discounts", () => {
    const withDiscount = { ...input, conditions: [{ ...condition, discount_rule_id: "discount" }] };
    expect(eligibleCommercialConditions(withDiscount)).toEqual([]);
    const discount = { id: "discount", status: "active", allowed_roles: ["seller"], course_ids: [], payment_method_ids: [], valid_from: null, valid_until: null };
    expect(eligibleCommercialConditions({ ...withDiscount, discounts: [discount] })).toHaveLength(1);
    expect(eligibleCommercialConditions({ ...withDiscount, discounts: [{ ...discount, course_ids: ["another"] }] })).toEqual([]);
  });
  test("a null installment is only an explicitly authorized cash condition", () => {
    expect(eligibleCommercialConditions({ ...input, conditions: [{ ...condition, installment_option_id: null }], prices: [{ ...price, installment_option_id: null }] })).toHaveLength(1);
  });
  test("shows exact remainder rather than misleading equal installments", () => {
    expect(formatInstallmentSummary(100, 3, 33.33)).toContain("última de R$ 33,34");
    expect(formatInstallmentSummary(3000, 6, 500)).toBe("6x de R$ 500,00");
    expect(formatInstallmentSummary(100, 1, 100)).toBe("À vista: R$ 100,00");
  });
});