import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  findBestAVistaOption,
  calculateComparativeAnchor,
  isPixOrCash,
} from "./avista-comparison.ts";

describe("Âncora Comparativa de Valor à Vista", () => {
  test("isPixOrCash reconhece Pix, Dinheiro e Espécie", () => {
    assert.equal(isPixOrCash("Pix"), true);
    assert.equal(isPixOrCash("Dinheiro"), true);
    assert.equal(isPixOrCash("Pagamento em Espécie"), true);
    assert.equal(isPixOrCash(null, "pix"), true);
    assert.equal(isPixOrCash("Cartão de Crédito"), false);
    assert.equal(isPixOrCash("Boleto Bancário"), false);
  });

  test("calcula economia comparativa corretamente quando parcelado > à vista", () => {
    // Exemplo: 10x de 300 = 3000 + matrícula 350 = 3350
    // À vista: curso 2500 + matrícula 350 = 2850
    // Economia: 3350 - 2850 = 500
    const anchor = calculateComparativeAnchor({
      installments: 10,
      installmentValue: 300,
      enrollmentPayable: 350,
      aVistaOption: {
        isSpecificCondition: true,
        paymentMethodName: "Pix",
        courseNet: 2500,
        enrollmentPayable: 350,
        totalAVista: 2850,
      },
    });

    assert.equal(anchor.showAnchor, true);
    assert.equal(anchor.totalParcelado, 3350);
    assert.equal(anchor.totalAVista, 2850);
    assert.equal(anchor.economy, 500);
    assert.equal(anchor.economyPercentage, Math.round((500 / 3350) * 100));
  });

  test("NÃO ativa âncora quando installments === 1 (à vista selecionado)", () => {
    const anchor = calculateComparativeAnchor({
      installments: 1,
      installmentValue: 2500,
      enrollmentPayable: 350,
      aVistaOption: {
        isSpecificCondition: true,
        paymentMethodName: "Pix",
        courseNet: 2500,
        enrollmentPayable: 350,
        totalAVista: 2850,
      },
    });

    assert.equal(anchor.showAnchor, false);
    assert.equal(anchor.economy, 0);
  });

  test("NÃO ativa âncora se economia for zero ou negativa", () => {
    // Se parcelado total der 2850 e à vista der 2850 (mesmo preço sem juros)
    const anchor = calculateComparativeAnchor({
      installments: 10,
      installmentValue: 250,
      enrollmentPayable: 350,
      aVistaOption: {
        isSpecificCondition: true,
        paymentMethodName: "Pix",
        courseNet: 2500,
        enrollmentPayable: 350,
        totalAVista: 2850,
      },
    });

    assert.equal(anchor.showAnchor, false);
    assert.equal(anchor.economy, 0);
  });

  test("findBestAVistaOption seleciona a melhor condição de Pix/Dinheiro ativa", () => {
    const courseId = "c1";
    const roles = ["seller"];
    const methods = [
      { id: "m_pix", name: "Pix", code: "pix", status: "active" },
      { id: "m_dinheiro", name: "Dinheiro", code: "cash", status: "active" },
      { id: "m_card", name: "Cartão", code: "credit", status: "active" },
    ];
    const prices = [
      { id: "p1", course_id: "c1", price: 3000, status: "active", valid_from: null, valid_until: null },
    ];
    const discounts = [
      { id: "d_pix", name: "Desconto Pix 15%", kind: "percentage", value: 15, allowed_roles: ["seller"], course_ids: [], payment_method_ids: [], status: "active", valid_from: null, valid_until: null },
      { id: "d_cash", name: "Desconto Dinheiro 10%", kind: "percentage", value: 10, allowed_roles: ["seller"], course_ids: [], payment_method_ids: [], status: "active", valid_from: null, valid_until: null },
    ];
    const conditions = [
      {
        id: "cond_pix",
        name: "Pix Especial",
        course_id: "c1",
        course_price_id: "p1",
        payment_method_id: "m_pix",
        installment_option_id: null,
        discount_rule_id: "d_pix",
        allowed_roles: ["seller"],
        status: "active",
      },
      {
        id: "cond_cash",
        name: "Dinheiro Balcão",
        course_id: "c1",
        course_price_id: "p1",
        payment_method_id: "m_dinheiro",
        installment_option_id: null,
        discount_rule_id: "d_cash",
        allowed_roles: ["seller"],
        status: "active",
      },
    ];

    const best = findBestAVistaOption({
      courseId,
      courseBasePrice: 3000,
      roles,
      conditions,
      methods,
      installments: [],
      prices,
      discounts,
      enrollmentFee: 350,
      enrollmentCondition: "normal",
    });

    assert.equal(best.isSpecificCondition, true);
    assert.equal(best.conditionId, "cond_pix");
    assert.equal(best.paymentMethodName, "Pix");
    // 3000 - 15% (450) = 2550
    assert.equal(best.courseNet, 2550);
    assert.equal(best.enrollmentPayable, 350);
    assert.equal(best.totalAVista, 2900);
  });

  test("findBestAVistaOption usa fallback quando não há condição de Pix/Dinheiro", () => {
    const best = findBestAVistaOption({
      courseId: "c1",
      courseBasePrice: 3000,
      roles: ["seller"],
      conditions: [],
      methods: [],
      installments: [],
      prices: [],
      discounts: [],
      enrollmentFee: 350,
      fallbackCourseNet: 2800,
    });

    assert.equal(best.isSpecificCondition, false);
    assert.equal(best.courseNet, 2800);
    assert.equal(best.enrollmentPayable, 350);
    assert.equal(best.totalAVista, 3150);
  });
});
