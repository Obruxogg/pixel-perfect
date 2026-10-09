import { describe, test, expect } from "bun:test";
import { calculateCommercialPrice } from "./commercial-calculation";

describe("course + enrollment - material - special condition", () => {
  test("percentage is applied after the fixed material discount", () => {
    const result = calculateCommercialPrice({ coursePrice: 3000, enrollmentFee: 350, materialDiscount: 200, special: { name: "Especial", kind: "percentage", value: 10 } });
    expect(result.original).toBe(3350);
    expect(result.subtotal).toBe(3150);
    expect(result.breakdown.map(d => d.amount)).toEqual([200, 315]);
    expect(result.final).toBe(2835);
  });
  test("fixed special discount stays separate", () => {
    const result = calculateCommercialPrice({ coursePrice: 3000, enrollmentFee: 350, materialDiscount: 200, special: { name: "Especial", kind: "fixed", value: 500 } });
    expect(result.final).toBe(2650);
    expect(result.breakdown).toHaveLength(2);
  });
  test("zero custom enrollment is valid", () => {
    expect(calculateCommercialPrice({ coursePrice: 3000, enrollmentFee: 0, materialDiscount: 0 }).final).toBe(3000);
  });
  test("excessive discounts never produce a negative final price", () => {
    expect(calculateCommercialPrice({ coursePrice: 100, enrollmentFee: 50, materialDiscount: 200, special: { name: "Especial", kind: "fixed", value: 200 } }).final).toBe(0);
  });
  test("floor and maximum special discount are respected", () => {
    const result = calculateCommercialPrice({ coursePrice: 3000, enrollmentFee: 350, materialDiscount: 200, special: { name: "Especial", kind: "percentage", value: 90, max_discount: 500, min_final_price: 2900 }, additional: 500 });
    expect(result.final).toBe(2900);
  });
  test("installments preserve cents with remainder in the last payment", () => {
    const result = calculateCommercialPrice({ coursePrice: 100, enrollmentFee: 0, materialDiscount: 0, installments: 3 });
    expect(result.portion).toBe(33.33);
    expect(Math.round((result.final - result.portion * (result.count - 1)) * 100) / 100).toBe(33.34);
  });
});