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

describe("permissões de perfil (seller, manager, admin) para formas de pagamento e pontualidade", () => {
  const analisesClinicasCourseId = "course-analises-clinicas";

  const paymentMethods = [
    { id: "method-a-vista", name: "À Vista", status: "active" },
    { id: "method-cartao", name: "Cartão de Crédito", status: "active" },
    { id: "method-recorrente", name: "Recorrente", status: "active" },
    { id: "method-boleto", name: "Boleto", status: "active" },
  ];

  const installmentOptions = [
    { id: "inst-av-1", payment_method_id: "method-a-vista", installments: 1, status: "active" },
    { id: "inst-av-3", payment_method_id: "method-a-vista", installments: 3, status: "active" },
    { id: "inst-cc-12", payment_method_id: "method-cartao", installments: 12, status: "active" },
    { id: "inst-rec-46", payment_method_id: "method-recorrente", installments: 46, status: "active" },
    { id: "inst-bol-46", payment_method_id: "method-boleto", installments: 46, status: "active" },
  ];

  const coursePrice = {
    id: "price-analises",
    course_id: analisesClinicasCourseId,
    price: 3600,
    status: "active",
    valid_from: null,
    valid_until: null,
    payment_method_id: null,
    installment_option_id: null,
  };

  // 4 regras de desconto de pontualidade da Tabela 2026:
  // À vista (30%), Cartão (25%), Recorrente (21%), Boleto (18%)
  const pontualidadeDiscountsWithAdminOnly = [
    { id: "disc-av-30", name: "Pontualidade 30% À Vista", status: "active", allowed_roles: ["admin"], course_ids: [], payment_method_ids: ["method-a-vista"], valid_from: null, valid_until: null },
    { id: "disc-cc-25", name: "Pontualidade 25% Cartão", status: "active", allowed_roles: ["admin"], course_ids: [], payment_method_ids: ["method-cartao"], valid_from: null, valid_until: null },
    { id: "disc-rec-21", name: "Pontualidade 21% Recorrente", status: "active", allowed_roles: ["admin"], course_ids: [], payment_method_ids: ["method-recorrente"], valid_from: null, valid_until: null },
    { id: "disc-bol-18", name: "Pontualidade 18% Boleto", status: "active", allowed_roles: ["admin"], course_ids: [], payment_method_ids: ["method-boleto"], valid_from: null, valid_until: null },
  ];

  const pontualidadeDiscountsUpdated = [
    { id: "disc-av-30", name: "Pontualidade 30% À Vista", status: "active", allowed_roles: ["seller", "manager", "admin"], course_ids: [], payment_method_ids: ["method-a-vista"], valid_from: null, valid_until: null },
    { id: "disc-cc-25", name: "Pontualidade 25% Cartão", status: "active", allowed_roles: ["seller", "manager", "admin"], course_ids: [], payment_method_ids: ["method-cartao"], valid_from: null, valid_until: null },
    { id: "disc-rec-21", name: "Pontualidade 21% Recorrente", status: "active", allowed_roles: ["seller", "manager", "admin"], course_ids: [], payment_method_ids: ["method-recorrente"], valid_from: null, valid_until: null },
    { id: "disc-bol-18", name: "Pontualidade 18% Boleto", status: "active", allowed_roles: ["seller", "manager", "admin"], course_ids: [], payment_method_ids: ["method-boleto"], valid_from: null, valid_until: null },
  ];

  const conditions = [
    { id: "cond-av-1", status: "active", course_id: analisesClinicasCourseId, course_price_id: "price-analises", payment_method_id: "method-a-vista", installment_option_id: "inst-av-1", discount_rule_id: "disc-av-30", allowed_roles: ["seller", "manager", "admin"] },
    { id: "cond-av-3", status: "active", course_id: analisesClinicasCourseId, course_price_id: "price-analises", payment_method_id: "method-a-vista", installment_option_id: "inst-av-3", discount_rule_id: "disc-av-30", allowed_roles: ["seller", "manager", "admin"] },
    { id: "cond-cc-12", status: "active", course_id: analisesClinicasCourseId, course_price_id: "price-analises", payment_method_id: "method-cartao", installment_option_id: "inst-cc-12", discount_rule_id: "disc-cc-25", allowed_roles: ["seller", "manager", "admin"] },
    { id: "cond-rec-46", status: "active", course_id: analisesClinicasCourseId, course_price_id: "price-analises", payment_method_id: "method-recorrente", installment_option_id: "inst-rec-46", discount_rule_id: "disc-rec-21", allowed_roles: ["seller", "manager", "admin"] },
    { id: "cond-bol-46", status: "active", course_id: analisesClinicasCourseId, course_price_id: "price-analises", payment_method_id: "method-boleto", installment_option_id: "inst-bol-46", discount_rule_id: "disc-bol-18", allowed_roles: ["seller", "manager", "admin"] },
  ];

  test("demonstra a falha original: vendedores e gerentes eram bloqueados quando as regras de desconto possuíam apenas ['admin']", () => {
    const sellerResult = eligibleCommercialConditions({
      courseId: analisesClinicasCourseId,
      roles: ["seller"],
      conditions,
      methods: paymentMethods,
      installments: installmentOptions,
      prices: [coursePrice],
      discounts: pontualidadeDiscountsWithAdminOnly,
    });
    expect(sellerResult).toHaveLength(0);

    const managerResult = eligibleCommercialConditions({
      courseId: analisesClinicasCourseId,
      roles: ["manager"],
      conditions,
      methods: paymentMethods,
      installments: installmentOptions,
      prices: [coursePrice],
      discounts: pontualidadeDiscountsWithAdminOnly,
    });
    expect(managerResult).toHaveLength(0);

    // Apenas admin conseguia ver as opções com desconto
    const adminResult = eligibleCommercialConditions({
      courseId: analisesClinicasCourseId,
      roles: ["admin"],
      conditions,
      methods: paymentMethods,
      installments: installmentOptions,
      prices: [coursePrice],
      discounts: pontualidadeDiscountsWithAdminOnly,
    });
    expect(adminResult).toHaveLength(5);
  });

  test("com a atualização para allowed_roles = ['seller', 'manager', 'admin'], Vendedor tem acesso às 4 formas de pagamento", () => {
    const sellerResult = eligibleCommercialConditions({
      courseId: analisesClinicasCourseId,
      roles: ["seller"],
      conditions,
      methods: paymentMethods,
      installments: installmentOptions,
      prices: [coursePrice],
      discounts: pontualidadeDiscountsUpdated,
    });

    expect(sellerResult).toHaveLength(5);

    const availableMethods = paymentMethods.filter((m) =>
      sellerResult.some((c) => c.payment_method_id === m.id)
    );
    expect(availableMethods).toHaveLength(4);
    expect(availableMethods.map((m) => m.name)).toEqual([
      "À Vista",
      "Cartão de Crédito",
      "Recorrente",
      "Boleto",
    ]);

    // Opções de parcelamento verificadas
    const cc = sellerResult.filter((c) => c.payment_method_id === "method-cartao");
    expect(cc).toHaveLength(1);
    expect(cc[0].installment_option_id).toBe("inst-cc-12");

    const bol = sellerResult.filter((c) => c.payment_method_id === "method-boleto");
    expect(bol).toHaveLength(1);
    expect(bol[0].installment_option_id).toBe("inst-bol-46");
  });

  test("com a atualização, Gerente tem acesso às 4 formas de pagamento", () => {
    const managerResult = eligibleCommercialConditions({
      courseId: analisesClinicasCourseId,
      roles: ["manager"],
      conditions,
      methods: paymentMethods,
      installments: installmentOptions,
      prices: [coursePrice],
      discounts: pontualidadeDiscountsUpdated,
    });

    expect(managerResult).toHaveLength(5);
    const availableMethods = paymentMethods.filter((m) =>
      managerResult.some((c) => c.payment_method_id === m.id)
    );
    expect(availableMethods).toHaveLength(4);
  });

  test("com a atualização, Administrador continua com acesso total sem regressões", () => {
    const adminResult = eligibleCommercialConditions({
      courseId: analisesClinicasCourseId,
      roles: ["admin"],
      conditions,
      methods: paymentMethods,
      installments: installmentOptions,
      prices: [coursePrice],
      discounts: pontualidadeDiscountsUpdated,
    });

    expect(adminResult).toHaveLength(5);
    const availableMethods = paymentMethods.filter((m) =>
      adminResult.some((c) => c.payment_method_id === m.id)
    );
    expect(availableMethods).toHaveLength(4);
  });

  test("regras expressamente restritas (ex: desconto exclusivo gerencial/admin) continuam bloqueadas para vendedor", () => {
    const restrictedDiscounts = [
      ...pontualidadeDiscountsUpdated,
      {
        id: "disc-vip-exclusivo",
        name: "Desconto Especial Diretoria 50%",
        status: "active",
        allowed_roles: ["manager", "admin"],
        course_ids: [],
        payment_method_ids: ["method-a-vista"],
        valid_from: null,
        valid_until: null,
      },
    ];

    const restrictedConditions = [
      ...conditions,
      {
        id: "cond-vip-diretoria",
        status: "active",
        course_id: analisesClinicasCourseId,
        course_price_id: "price-analises",
        payment_method_id: "method-a-vista",
        installment_option_id: "inst-av-1",
        discount_rule_id: "disc-vip-exclusivo",
        allowed_roles: ["manager", "admin"],
      },
    ];

    const sellerResult = eligibleCommercialConditions({
      courseId: analisesClinicasCourseId,
      roles: ["seller"],
      conditions: restrictedConditions,
      methods: paymentMethods,
      installments: installmentOptions,
      prices: [coursePrice],
      discounts: restrictedDiscounts,
    });

    // Vendedor não deve ver a condição VIP da diretoria
    expect(sellerResult.some((c) => c.id === "cond-vip-diretoria")).toBe(false);

    // Gerente vê a condição VIP
    const managerResult = eligibleCommercialConditions({
      courseId: analisesClinicasCourseId,
      roles: ["manager"],
      conditions: restrictedConditions,
      methods: paymentMethods,
      installments: installmentOptions,
      prices: [coursePrice],
      discounts: restrictedDiscounts,
    });
    expect(managerResult.some((c) => c.id === "cond-vip-diretoria")).toBe(true);
  });
});