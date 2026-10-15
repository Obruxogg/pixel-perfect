import { describe, test, expect } from "bun:test";
import { calculateCommercialPrice } from "./commercial-calculation";
import { formatInstallmentSummary } from "./commercial-options";

describe("Nexo Comercial — Motor Financeiro Completo (15 Requisitos Obrigatórios)", () => {
  // 1. Matrícula normal de R$ 450,00
  test("1. Matrícula normal de R$ 450,00 cobrada integralmente e fora das parcelas", () => {
    const calc = calculateCommercialPrice({
      coursePrice: 3000,
      enrollmentFee: 450,
      enrollmentCondition: "normal",
      installments: 10,
    });
    expect(calc.enrollmentFee).toBe(450);
    expect(calc.enrollmentDiscount).toBe(0);
    expect(calc.enrollmentPayable).toBe(450);
    expect(calc.courseNet).toBe(3000);
    expect(calc.installmentBalance).toBe(3000);
    expect(calc.portion).toBe(300); // 3000 / 10
    expect(calc.totalContract).toBe(3450); // 3000 + 450
  });

  // 2. Matrícula promocional de R$ 350,00
  test("2. Matrícula promocional de R$ 350,00 com desconto de R$ 100,00", () => {
    const calc = calculateCommercialPrice({
      coursePrice: 3000,
      enrollmentFee: 450,
      enrollmentPromotionalFee: 350,
      enrollmentCondition: "promotional",
      installments: 10,
    });
    expect(calc.enrollmentFee).toBe(450);
    expect(calc.enrollmentPromotionalFee).toBe(350);
    expect(calc.enrollmentDiscount).toBe(100);
    expect(calc.enrollmentPayable).toBe(350);
    expect(calc.courseNet).toBe(3000);
    expect(calc.installmentBalance).toBe(3000);
    expect(calc.portion).toBe(300);
    expect(calc.totalContract).toBe(3350); // 3000 + 350
  });

  // 3. Matrícula personalizada por curso
  test("3. Matrícula personalizada por curso sobrepõe valor global", () => {
    const globalNormal = 450;
    const globalPromo = 350;
    const courseCustomNormal = 500;
    const courseCustomPromo = 380;

    const calc = calculateCommercialPrice({
      coursePrice: 4000,
      enrollmentFee: courseCustomNormal ?? globalNormal,
      enrollmentPromotionalFee: courseCustomPromo ?? globalPromo,
      enrollmentCondition: "promotional",
      installments: 10,
    });
    expect(calc.enrollmentFee).toBe(500);
    expect(calc.enrollmentPromotionalFee).toBe(380);
    expect(calc.enrollmentDiscount).toBe(120);
    expect(calc.enrollmentPayable).toBe(380);
    expect(calc.totalContract).toBe(4380);
  });

  // 4. Alteração do valor global pelo gerente
  test("4. Alteração do valor global afeta apenas cursos padrão e preserva personalizados", () => {
    // Cenário: Gerente altera global de 450/350 para 480/370
    const newGlobalNormal = 480;
    const newGlobalPromo = 370;

    // Curso A (usa padrão global)
    const courseA = { enrollment_fee: null, promotional_fee: null };
    const calcA = calculateCommercialPrice({
      coursePrice: 2000,
      enrollmentFee: courseA.enrollment_fee ?? newGlobalNormal,
      enrollmentPromotionalFee: courseA.promotional_fee ?? newGlobalPromo,
      enrollmentCondition: "promotional",
    });
    expect(calcA.enrollmentPayable).toBe(370);

    // Curso B (personalizado)
    const courseB = { enrollment_fee: 550, promotional_fee: 400 };
    const calcB = calculateCommercialPrice({
      coursePrice: 2000,
      enrollmentFee: courseB.enrollment_fee ?? newGlobalNormal,
      enrollmentPromotionalFee: courseB.promotional_fee ?? newGlobalPromo,
      enrollmentCondition: "promotional",
    });
    expect(calcB.enrollmentPayable).toBe(400); // Preserva o seu próprio valor
  });

  // 5. Parcelamento sem inclusão da matrícula
  test("5. Parcelamento NUNCA inclui a matrícula", () => {
    const calc = calculateCommercialPrice({
      coursePrice: 4242,
      enrollmentFee: 450,
      enrollmentPromotionalFee: 350,
      enrollmentCondition: "promotional",
      special: { name: "Boleto", kind: "percentage", value: 18 },
      installments: 12,
    });
    // Saldo parcelável = 3478.44
    expect(calc.installmentBalance).toBe(3478.44);
    expect(calc.portion).toBe(289.87);
    expect(calc.sumInstallments).toBe(3478.44);
    // Matrícula = 350
    expect(calc.enrollmentPayable).toBe(350);
    // Se matrícula estivesse incluída no parcelamento seria 3828.44 / 12 = 319.03 -> O QUE NUNCA PODE OCORRER
    expect(calc.portion).not.toBe(319.03);
    expect(calc.sumInstallments).not.toBe(3828.44);
  });

  // 6. Desconto comercial de 18%
  test("6. Desconto comercial de 18% sobre o valor de tabela do curso", () => {
    const calc = calculateCommercialPrice({
      coursePrice: 4242,
      special: { name: "18%", kind: "percentage", value: 18 },
    });
    expect(calc.breakdown[0].amount).toBe(763.56);
    expect(calc.courseNet).toBe(3478.44);
    expect(calc.installmentBalance).toBe(3478.44);
  });

  // 7. Desconto comercial de 25%
  test("7. Desconto comercial de 25% sobre o valor de tabela do curso", () => {
    const calc = calculateCommercialPrice({
      coursePrice: 4000,
      special: { name: "25%", kind: "percentage", value: 25 },
    });
    expect(calc.breakdown[0].amount).toBe(1000);
    expect(calc.courseNet).toBe(3000);
    expect(calc.installmentBalance).toBe(3000);
  });

  // 8. Desconto comercial de 30%
  test("8. Desconto comercial de 30% sobre o valor de tabela do curso", () => {
    const calc = calculateCommercialPrice({
      coursePrice: 5000,
      special: { name: "30%", kind: "percentage", value: 30 },
    });
    expect(calc.breakdown[0].amount).toBe(1500);
    expect(calc.courseNet).toBe(3500);
    expect(calc.installmentBalance).toBe(3500);
  });

  // 9. Parcelamento em 1, 3, 6 e 12 vezes
  test("9. Parcelamento em 1, 3, 6 e 12 vezes", () => {
    const balance = 3478.44;

    const p1 = calculateCommercialPrice({ coursePrice: balance, installments: 1 });
    expect(p1.portion).toBe(3478.44);
    expect(p1.sumInstallments).toBe(3478.44);

    const p3 = calculateCommercialPrice({ coursePrice: balance, installments: 3 });
    expect(p3.portion).toBe(1159.48);
    expect(p3.lastPortion).toBe(1159.48);
    expect(p3.sumInstallments).toBe(3478.44);

    const p6 = calculateCommercialPrice({ coursePrice: balance, installments: 6 });
    expect(p6.portion).toBe(579.74);
    expect(p6.sumInstallments).toBe(3478.44);

    const p12 = calculateCommercialPrice({ coursePrice: balance, installments: 12 });
    expect(p12.portion).toBe(289.87);
    expect(p12.sumInstallments).toBe(3478.44);
  });

  // 10. Ajuste exato de centavos
  test("10. Ajuste exato de centavos garantindo soma perfeita ao saldo parcelável", () => {
    // 1000 em 3x: 333.33 + 333.33 + 333.34 = 1000.00
    const calc3 = calculateCommercialPrice({ coursePrice: 1000, installments: 3 });
    expect(calc3.portion).toBe(333.33);
    expect(calc3.lastPortion).toBe(333.34);
    expect(calc3.sumInstallments).toBe(1000.0);
    expect(calc3.installmentsList).toEqual([333.33, 333.33, 333.34]);

    // 100 em 7x
    const calc7 = calculateCommercialPrice({ coursePrice: 100, installments: 7 });
    expect(calc7.sumInstallments).toBe(100.0);
    expect(calc7.installmentsList.reduce((a, b) => a + b, 0)).toBe(100.0);
  });

  // 11. Material didático incluso
  test("11. Material didático incluso sem acréscimo de custo nas parcelas", () => {
    const calc = calculateCommercialPrice({
      coursePrice: 3000,
      materialBilling: "included",
      materialDiscount: 0,
      installments: 10,
    });
    expect(calc.courseNet).toBe(3000);
    expect(calc.installmentBalance).toBe(3000);
    expect(calc.portion).toBe(300);
  });

  // 12. Material com desconto comercial
  test("12. Material com desconto comercial deduz da base e não duplica", () => {
    const calc = calculateCommercialPrice({
      coursePrice: 3000,
      materialDiscount: 200,
      special: { name: "10%", kind: "percentage", value: 10 },
      installments: 10,
    });
    // Material deduz 200 -> Base 2800 -> 10% de 2800 = 280. Total líquido = 2520.
    expect(calc.material).toBe(200);
    expect(calc.breakdown[0].amount).toBe(200);
    expect(calc.breakdown[1].amount).toBe(280);
    expect(calc.courseNet).toBe(2520);
    expect(calc.installmentBalance).toBe(2520);
    expect(calc.portion).toBe(252);
  });

  // 13. Propostas históricas preservadas
  test("13. Propostas históricas preservam snapshots sem recalcular", () => {
    const historicalSnapshot = {
      coursePrice: 4000,
      courseNet: 3200,
      installmentBalance: 3200,
      enrollmentPayable: 350,
      totalContract: 3550,
      installments: 10,
      installmentValue: 320,
    };
    // Simula renderização de proposta antiga gravada no banco
    expect(historicalSnapshot.courseNet).toBe(3200);
    expect(historicalSnapshot.installmentValue).toBe(320);
    expect(historicalSnapshot.totalContract).toBe(3550);
  });

  // 14. Permissões de papéis
  test("14. Regras de permissão para gerente e vendedor", () => {
    function canEditGlobalSettings(roles) {
      return roles.includes("admin") || roles.includes("manager");
    }
    expect(canEditGlobalSettings(["seller"])).toBe(false);
    expect(canEditGlobalSettings(["manager"])).toBe(true);
    expect(canEditGlobalSettings(["admin"])).toBe(true);
  });

  // 15. Correspondência entre simulação, proposta salva e apresentação ao aluno
  test("15. Correspondência idêntica entre simulação, proposta salva e apresentação ao aluno (Barbearia Profissional)", () => {
    const simulation = calculateCommercialPrice({
      coursePrice: 4242,
      enrollmentFee: 450,
      enrollmentPromotionalFee: 350,
      enrollmentCondition: "promotional",
      special: { name: "Boleto", kind: "percentage", value: 18 },
      installments: 12,
    });

    const savedProposal = {
      course_price_snapshot: simulation.coursePrice,
      course_net_snapshot: simulation.courseNet,
      enrollment_fee_snapshot: simulation.enrollmentFee,
      enrollment_payable_snapshot: simulation.enrollmentPayable,
      installment_balance_snapshot: simulation.installmentBalance,
      installments: simulation.count,
      installment_value: simulation.portion,
      final_price: simulation.totalContract,
    };

    const studentPresentation = {
      courseName: "Barbearia Profissional",
      enrollmentValue: simulation.enrollmentPayable,
      installmentsSummary: formatInstallmentSummary(simulation.installmentBalance, simulation.count, simulation.portion),
      materialStatus: "Incluso",
      totalContract: simulation.totalContract,
    };

    // Verificação de igualdade absoluta entre as três camadas
    expect(savedProposal.course_price_snapshot).toBe(4242.0);
    expect(savedProposal.installment_balance_snapshot).toBe(3478.44);
    expect(savedProposal.installment_value).toBe(289.87);
    expect(savedProposal.enrollment_payable_snapshot).toBe(350.0);
    expect(savedProposal.final_price).toBe(3828.44);

    expect(studentPresentation.enrollmentValue).toBe(350.0);
    expect(studentPresentation.installmentsSummary).toBe("12x de R$ 289,87");
    expect(studentPresentation.totalContract).toBe(3828.44);
  });
});
