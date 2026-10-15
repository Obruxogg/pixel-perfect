import { describe, test, expect } from "bun:test";
import { calculateCommercialPrice } from "./commercial-calculation";

describe("official financial engine - course net, independent enrollment, installments", () => {
  test("percentage is applied after the fixed material discount on course base", () => {
    const result = calculateCommercialPrice({
      coursePrice: 3000,
      enrollmentFee: 350,
      materialDiscount: 200,
      special: { name: "Especial", kind: "percentage", value: 10 },
    });
    // Base do curso: 3000. Desconto material: 200. Base após material: 2800.
    // Desconto 10% de 2800: 280.
    // Valor líquido do curso: 3000 - 200 - 280 = 2520.
    // Matrícula cobrada separadamente: 350.
    // Total geral da contratação: 2520 + 350 = 2870.
    expect(result.coursePrice).toBe(3000);
    expect(result.material).toBe(200);
    expect(result.breakdown.map((d) => d.amount)).toEqual([200, 280]);
    expect(result.courseNet).toBe(2520);
    expect(result.installmentBalance).toBe(2520);
    expect(result.enrollmentPayable).toBe(350);
    expect(result.totalContract).toBe(2870);
  });

  test("fixed special discount stays separate and applies to course", () => {
    const result = calculateCommercialPrice({
      coursePrice: 3000,
      enrollmentFee: 350,
      materialDiscount: 200,
      special: { name: "Especial", kind: "fixed", value: 500 },
    });
    // Curso: 3000 - 200 - 500 = 2300. Matrícula: 350. Total: 2650.
    expect(result.courseNet).toBe(2300);
    expect(result.installmentBalance).toBe(2300);
    expect(result.enrollmentPayable).toBe(350);
    expect(result.totalContract).toBe(2650);
    expect(result.breakdown).toHaveLength(2);
  });

  test("zero custom enrollment is valid and does not increase contract", () => {
    const result = calculateCommercialPrice({ coursePrice: 3000, enrollmentFee: 0, materialDiscount: 0 });
    expect(result.courseNet).toBe(3000);
    expect(result.installmentBalance).toBe(3000);
    expect(result.enrollmentPayable).toBe(0);
    expect(result.totalContract).toBe(3000);
  });

  test("excessive discounts never produce a negative final price", () => {
    const result = calculateCommercialPrice({
      coursePrice: 100,
      enrollmentFee: 50,
      materialDiscount: 200,
      special: { name: "Especial", kind: "fixed", value: 200 },
    });
    expect(result.courseNet).toBe(0);
    expect(result.installmentBalance).toBe(0);
  });

  test("floor and maximum special discount are respected", () => {
    const result = calculateCommercialPrice({
      coursePrice: 3000,
      enrollmentFee: 350,
      materialDiscount: 200,
      special: { name: "Especial", kind: "percentage", value: 90, max_discount: 500, min_final_price: 2300 },
      additional: 500,
    });
    // Base pós material: 2800. Max discount 500. Curso líquido respeita floor: 2300.
    expect(result.courseNet).toBe(2300);
    expect(result.installmentBalance).toBe(2300);
  });

  test("installments preserve cents with remainder in the last payment", () => {
    const result = calculateCommercialPrice({ coursePrice: 100, enrollmentFee: 0, materialDiscount: 0, installments: 3 });
    expect(result.portion).toBe(33.33);
    expect(result.lastPortion).toBe(33.34);
    expect(result.sumInstallments).toBe(100.0);
  });

  test("Barbearia Profissional mandatory official case", () => {
    const result = calculateCommercialPrice({
      coursePrice: 4242.0,
      enrollmentFee: 450.0,
      enrollmentPromotionalFee: 350.0,
      enrollmentCondition: "promotional",
      special: { name: "Boleto bancário 18%", kind: "percentage", value: 18 },
      installments: 12,
    });

    // 1. Valor de tabela: R$ 4.242,00
    expect(result.coursePrice).toBe(4242.0);

    // 2. Desconto comercial: 18% = R$ 763,56
    expect(result.breakdown[0].amount).toBe(763.56);

    // 3. Saldo parcelável: R$ 3.478,44
    expect(result.courseNet).toBe(3478.44);
    expect(result.installmentBalance).toBe(3478.44);

    // 4. Parcelamento: 12 × R$ 289,87 = R$ 3.478,44
    expect(result.count).toBe(12);
    expect(result.portion).toBe(289.87);
    expect(result.lastPortion).toBe(289.87);
    expect(result.sumInstallments).toBe(3478.44);

    // 5. Matrícula promocional cobrada separadamente: R$ 350,00
    expect(result.enrollmentFee).toBe(450.0);
    expect(result.enrollmentDiscount).toBe(100.0);
    expect(result.enrollmentPayable).toBe(350.0);

    // 6. Total geral: R$ 3.478,44 + R$ 350,00 = R$ 3.828,44
    expect(result.totalContract).toBe(3828.44);
    expect(result.final).toBe(3828.44);

    // 7. O sistema nunca poderá dividir R$ 3.828,44 em 12 parcelas
    expect(result.sumInstallments).not.toBe(3828.44);
    expect(result.portion * 12).toBe(3478.44);
  });
});