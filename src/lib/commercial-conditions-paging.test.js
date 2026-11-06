import { describe, expect, it } from "bun:test";
import { fetchAllPages } from "./crm.functions";
import { eligibleCommercialConditions } from "./commercial-options";

describe("fetchAllPages — Paginação Resiliente de Tabelas Volumosas", () => {
  it("retorna imediatamente com 1 requisição quando a tabela possui menos de 1.000 registros", async () => {
    let callCount = 0;
    const mockData = Array.from({ length: 45 }, (_, i) => ({ id: `row-${i}` }));

    const res = await fetchAllPages(async (from, to) => {
      callCount++;
      expect(from).toBe(0);
      expect(to).toBe(999);
      return { data: mockData.slice(from, to + 1), error: null, count: mockData.length };
    }, 1000);

    expect(callCount).toBe(1);
    expect(res.error).toBeNull();
    expect(res.data.length).toBe(45);
    expect(res.data[0].id).toBe("row-0");
  });

  it("busca todas as 2.236 condições em paralelo quando count exato está disponível", async () => {
    const totalRecords = 2236;
    const allRecords = Array.from({ length: totalRecords }, (_, i) => ({
      id: `condition-${i}`,
      name: `Condição Comercial ${i}`,
      index: i,
    }));

    const rangesCalled = [];

    const res = await fetchAllPages(async (from, to) => {
      rangesCalled.push({ from, to });
      return {
        data: allRecords.slice(from, to + 1),
        error: null,
        count: totalRecords,
      };
    }, 1000);

    expect(res.error).toBeNull();
    expect(res.data.length).toBe(2236);

    // Deve ter chamado 3 lotes: 0-999, 1000-1999, 2000-2999
    expect(rangesCalled.length).toBe(3);
    expect(rangesCalled[0]).toEqual({ from: 0, to: 999 });
    expect(rangesCalled[1]).toEqual({ from: 1000, to: 1999 });
    expect(rangesCalled[2]).toEqual({ from: 2000, to: 2999 });

    // Ordenação e integridade estrita
    expect(res.data[0].id).toBe("condition-0");
    expect(res.data[999].id).toBe("condition-999");
    expect(res.data[1000].id).toBe("condition-1000");
    expect(res.data[2235].id).toBe("condition-2235");
    expect(res.data[2235].index).toBe(2235);
  });

  it("realiza paginação sequencial estável como fallback se count não estiver disponível", async () => {
    const totalRecords = 2236;
    const allRecords = Array.from({ length: totalRecords }, (_, i) => ({
      id: `item-${i}`,
      index: i,
    }));

    const rangesCalled = [];

    const res = await fetchAllPages(async (from, to) => {
      rangesCalled.push({ from, to });
      // Sem fornecer count (simulando resposta HTTP sem Content-Range total)
      return {
        data: allRecords.slice(from, to + 1),
        error: null,
      };
    }, 1000);

    expect(res.error).toBeNull();
    expect(res.data.length).toBe(2236);
    expect(rangesCalled.length).toBe(3);
    expect(rangesCalled[0]).toEqual({ from: 0, to: 999 });
    expect(rangesCalled[1]).toEqual({ from: 1000, to: 1999 });
    expect(rangesCalled[2]).toEqual({ from: 2000, to: 2999 });
    expect(res.data[2235].id).toBe("item-2235");
  });

  it("propaga erro se a primeira página falhar", async () => {
    const mockError = { message: "Connection refused", code: "PGRST001" };
    const res = await fetchAllPages(async () => {
      return { data: null, error: mockError };
    }, 1000);

    expect(res.data).toEqual([]);
    expect(res.error).toEqual(mockError);
  });

  it("propaga erro se um lote paralelo subsequente falhar", async () => {
    const totalRecords = 2500;
    const res = await fetchAllPages(async (from) => {
      if (from === 1000) {
        return { data: null, error: { message: "Timeout no lote 1000-1999" } };
      }
      return {
        data: Array.from({ length: 1000 }, (_, i) => ({ id: `row-${from + i}` })),
        error: null,
        count: totalRecords,
      };
    }, 1000);

    expect(res.data).toEqual([]);
    expect(res.error).toBeTruthy();
  });
});

describe("Catálogo 2026 e Simulação para Cursos além do registro 1.000 (ex: Banho e Tosa)", () => {
  it("garante que cursos após o corte de 1.000 registros recebem suas condições e habilitam métodos", () => {
    // Cenário:
    // 47 cursos. Cada curso tem opções autorizadas de parcelamento.
    // O curso 'Banho e Tosa' foi cadastrado nas posições 1800 a 1805.
    const banhoETosaCourseId = "course-banho-e-tosa";

    const paymentMethods = [
      { id: "method-a-vista", name: "À Vista", status: "active" },
      { id: "method-cartao", name: "Cartão de Crédito", status: "active" },
      { id: "method-recorrente", name: "Recorrente", status: "active" },
      { id: "method-boleto", name: "Boleto", status: "active" },
    ];

    const installmentOptions = [
      { id: "inst-av-1", payment_method_id: "method-a-vista", installments: 1, status: "active" },
      { id: "inst-av-2", payment_method_id: "method-a-vista", installments: 2, status: "active" },
      { id: "inst-av-3", payment_method_id: "method-a-vista", installments: 3, status: "active" },
      { id: "inst-cc-12", payment_method_id: "method-cartao", installments: 12, status: "active" },
      { id: "inst-rec-46", payment_method_id: "method-recorrente", installments: 46, status: "active" },
      { id: "inst-bol-46", payment_method_id: "method-boleto", installments: 46, status: "active" },
    ];

    const prices = [
      { id: "price-bt", course_id: banhoETosaCourseId, price: 3200, status: "active", valid_from: null, valid_until: null, payment_method_id: null, installment_option_id: null },
    ];

    // Gerar 2236 condições simuladas
    const fullConditionsCatalog = Array.from({ length: 2236 }, (_, i) => {
      // Registrar condições do Banho e Tosa a partir do índice 1800
      if (i >= 1800 && i < 1806) {
        const instIndex = i - 1800;
        const inst = installmentOptions[instIndex];
        return {
          id: `cond-bt-${i}`,
          name: `Banho e Tosa - ${inst.installments}x`,
          course_id: banhoETosaCourseId,
          course_price_id: "price-bt",
          payment_method_id: inst.payment_method_id,
          installment_option_id: inst.id,
          discount_rule_id: null,
          allowed_roles: ["seller", "manager", "admin"],
          status: "active",
        };
      }
      return {
        id: `cond-other-${i}`,
        name: `Outro Curso Condição ${i}`,
        course_id: "other-course",
        course_price_id: "price-other",
        payment_method_id: "method-cartao",
        installment_option_id: "inst-cc-12",
        discount_rule_id: null,
        allowed_roles: ["seller", "manager", "admin"],
        status: "active",
      };
    });

    // 1. Simulação com o catálogo truncado no limite padrão de 1.000 linhas do PostgREST
    const truncatedConditions = fullConditionsCatalog.slice(0, 1000);
    const eligibleWithTruncation = eligibleCommercialConditions({
      courseId: banhoETosaCourseId,
      roles: ["seller"],
      conditions: truncatedConditions,
      methods: paymentMethods,
      installments: installmentOptions,
      prices,
      discounts: [],
    });

    // Sem a busca paginada, Banho e Tosa ficava com 0 condições e sem nenhuma forma de pagamento!
    expect(eligibleWithTruncation.length).toBe(0);
    const methodsWithTruncation = paymentMethods.filter(m =>
      eligibleWithTruncation.some(c => c.payment_method_id === m.id)
    );
    expect(methodsWithTruncation.length).toBe(0); // Tela de simulação travada!

    // 2. Simulação com o catálogo completo obtido através de fetchAllPages
    const eligibleWithPaging = eligibleCommercialConditions({
      courseId: banhoETosaCourseId,
      roles: ["seller"],
      conditions: fullConditionsCatalog, // Todas as 2.236 condições
      methods: paymentMethods,
      installments: installmentOptions,
      prices,
      discounts: [],
    });

    // Com fetchAllPages, todas as condições são encontradas
    expect(eligibleWithPaging.length).toBe(6);

    // Todas as 4 formas de pagamento estão disponíveis para Banho e Tosa
    const availableMethods = paymentMethods.filter(m =>
      eligibleWithPaging.some(c => c.payment_method_id === m.id)
    );
    expect(availableMethods.length).toBe(4);
    expect(availableMethods.map(m => m.id)).toEqual([
      "method-a-vista",
      "method-cartao",
      "method-recorrente",
      "method-boleto",
    ]);

    // Opções de parcelamento verificadas
    const aVistaOptions = eligibleWithPaging.filter(c => c.payment_method_id === "method-a-vista");
    expect(aVistaOptions.length).toBe(3); // 1x até 3x

    const cartaoOptions = eligibleWithPaging.filter(c => c.payment_method_id === "method-cartao");
    expect(cartaoOptions.length).toBe(1); // 12x

    const recorrenteOptions = eligibleWithPaging.filter(c => c.payment_method_id === "method-recorrente");
    expect(recorrenteOptions.length).toBe(1); // 46x

    const boletoOptions = eligibleWithPaging.filter(c => c.payment_method_id === "method-boleto");
    expect(boletoOptions.length).toBe(1); // 46x
  });
});
