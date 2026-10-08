import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const DEFAULT_COMMERCIAL_TRIGGERS = [
  {
    id: "trigger-1",
    name: "Condição Especial",
    title: "Condição Especial",
    description: "Condição especial disponível neste atendimento",
    trigger_type: "special_condition",
    template_text: "Condição especial disponível exclusivamente neste atendimento.",
    is_active: true,
    sort_order: 1,
  },
  {
    id: "trigger-2",
    name: "Economia Real",
    title: "Economia Garantida",
    description: "Destaque do valor economizado",
    trigger_type: "economy",
    template_text: "Você economiza {{economy}} nesta condição especial.",
    is_active: true,
    sort_order: 2,
  },
  {
    id: "trigger-3",
    name: "Validade da Condição",
    title: "Validade Garantida",
    description: "Informação clara sobre o prazo da condição",
    trigger_type: "validity",
    template_text: "Esta condição é válida até {{valid_until}}.",
    is_active: true,
    sort_order: 3,
  },
  {
    id: "trigger-4",
    name: "Percentual de Desconto",
    title: "Desconto Aplicado",
    description: "Exibe percentual real de desconto",
    trigger_type: "discount_pct",
    template_text: "Desconto total aplicado: {{discount_pct}}%.",
    is_active: true,
    sort_order: 4,
  },
  {
    id: "trigger-5",
    name: "Última Condição",
    title: "Atendimento Imediato",
    description: "Destaque da condição apresentada na conversa",
    trigger_type: "custom",
    template_text: "Condição apresentada em tempo real para a sua matrícula.",
    is_active: true,
    sort_order: 5,
  },
];

async function getAdminClient() {
  if (process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      return supabaseAdmin;
    } catch {
      return null;
    }
  }
  return null;
}

export const bootstrapProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { fullName?: string; initialRole?: "admin" | "manager" | "seller" }) =>
    z.object({ fullName: z.string().max(120).optional(), initialRole: z.enum(["admin", "manager", "seller"]).optional() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const adminClient = await getAdminClient();
    const db = adminClient || context.supabase;

    const { data: existing } = await db.from("profiles").select("id").eq("id", context.userId).maybeSingle();
    if (!existing) {
      const metadata = context.claims["user_metadata"] as Record<string, unknown> | undefined;
      const name = data.fullName?.trim() || String(metadata?.["full_name"] ?? context.claims["email"] ?? "Novo usuário");
      const { error } = await db.from("profiles").insert({ id: context.userId, full_name: name, status: "active" });
      if (error) console.error("Error creating profile:", error.message);
    }

    const { data: currentRole } = await db.from("user_roles").select("role").eq("user_id", context.userId).maybeSingle();
    if (!currentRole) {
      const { count } = await db.from("user_roles").select("id", { count: "exact", head: true });
      const role = data.initialRole || (count === 0 ? "admin" : "seller");
      const { error } = await db.from("user_roles").insert({ user_id: context.userId, role });
      if (error) console.error("Error assigning role:", error.message);
    }
    return { ok: true };
  });

export const getWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase;

    const [
      profileRes,
      rolesRes,
      areasRes,
      coursesRes,
      methodsRes,
      installmentsRes,
      pricesRes,
      discountsRes,
      conditionsRes,
      stagesRes,
      allProfilesRes,
      allRolesRes,
      teamsRes,
    ] = await Promise.all([
      db.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      db.from("user_roles").select("role").eq("user_id", context.userId),
      db.from("areas").select("*").order("sort_order"),
      db.from("courses").select("*").order("sort_order"),
      db.from("payment_methods").select("*").order("sort_order"),
      db.from("installment_options").select("*").order("sort_order"),
      db.from("course_prices").select("*"),
      db.from("discount_rules").select("*"),
      db.from("commercial_conditions").select("*"),
      db.from("crm_stages").select("*").order("sort_order"),
      db.from("profiles").select("*"),
      db.from("user_roles").select("*"),
      db.from("teams").select("*").eq("status", "active"),
    ]);

    const userRoles = (rolesRes.data ?? []).map((r) => r.role);
    const isAdmin = userRoles.includes("admin");
    const isManager = userRoles.includes("manager");
    const isSeller = !isAdmin && !isManager;

    let studentsQuery = db.from("students").select("*").order("created_at", { ascending: false });
    let proposalsQuery = db.from("proposals").select("*").order("created_at", { ascending: false });
    let followupsQuery = db.from("followups").select("*").order("due_at");
    let interactionsQuery = db.from("student_interactions").select("*").order("created_at", { ascending: false }).limit(200);
    let salesQuery = (db as any).from("sales").select("*").order("created_at", { ascending: false });

    // Filter by seller ownership if user is seller - strict isolation
    if (isSeller) {
      studentsQuery = studentsQuery.eq("owner_id", context.userId);
      proposalsQuery = proposalsQuery.eq("seller_id", context.userId);
      followupsQuery = followupsQuery.eq("seller_id", context.userId);
      salesQuery = salesQuery.eq("seller_id", context.userId);
    }

    const [studentsRes, proposalsRes, followupsRes, interactionsRes, triggersRes, salesRes] = await Promise.all([
      studentsQuery,
      proposalsQuery,
      followupsQuery,
      interactionsQuery,
      (db as any).from("commercial_triggers").select("*").order("sort_order").then((res: any) => (res.error ? { data: null } : res)),
      salesQuery.then((res: any) => (res.error ? { data: null } : res)),
    ]);

    // Build sellers list for manager & admin (sellers do not access other sellers' info)
    const allProfiles = isSeller ? [] : (allProfilesRes.data ?? []);
    const allRoles = isSeller ? [] : (allRolesRes.data ?? []);
    const allStudents = studentsRes.data ?? [];
    const allProposals = proposalsRes.data ?? [];
    const allFollowups = followupsRes.data ?? [];

    const sellers = isSeller
      ? []
      : allProfiles.map((p) => {
          const pRole = allRoles.find((r) => r.user_id === p.id)?.role ?? "seller";
          const sellerStudents = allStudents.filter((s) => s.owner_id === p.id);
          const sellerProposals = allProposals.filter((pr) => pr.seller_id === p.id);
          const sellerSales = sellerProposals.filter((pr) => pr.status === "approved");
          const sellerFollowups = allFollowups.filter((f) => f.seller_id === p.id && f.status === "pending");

          return {
            ...p,
            role: pRole,
            contactsCount: sellerStudents.length,
            proposalsCount: sellerProposals.length,
            salesCount: sellerSales.length,
            followupsCount: sellerFollowups.length,
          };
        });

    const rawTriggers = (triggersRes.data && triggersRes.data.length > 0) ? (triggersRes.data as unknown as typeof DEFAULT_COMMERCIAL_TRIGGERS) : DEFAULT_COMMERCIAL_TRIGGERS;
    const triggers = rawTriggers.map((t) => ({
      id: t.id,
      name: t.name,
      title: t.title,
      description: t.description || null,
      trigger_type: t.trigger_type,
      template_text: t.template_text,
      is_active: t.is_active ?? true,
      sort_order: t.sort_order ?? 0,
    }));

    return {
      userId: context.userId,
      profile: profileRes.data,
      roles: rolesRes.data ?? [],
      isAdmin,
      isManager,
      isSeller,
      areas: areasRes.data ?? [],
      courses: coursesRes.data ?? [],
      methods: methodsRes.data ?? [],
      installments: installmentsRes.data ?? [],
      prices: pricesRes.data ?? [],
      discounts: discountsRes.data ?? [],
      conditions: conditionsRes.data ?? [],
      stages: stagesRes.data ?? [],
      triggers,
      teams: teamsRes.data ?? [],
      sellers,
      students: allStudents,
      proposals: allProposals,
      followups: allFollowups,
      interactions: interactionsRes.data ?? [],
      sales: salesRes.data ?? [],
    };
  });

export const searchStudentByWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ whatsapp: z.string().min(5) }).parse(input))
  .handler(async ({ data, context }) => {
    const cleanNumber = data.whatsapp.replace(/\D/g, "");
    if (!cleanNumber) return { found: false, student: null };

    const { data: student } = await context.supabase
      .from("students")
      .select("*")
      .ilike("whatsapp", `%${cleanNumber}%`)
      .limit(1)
      .maybeSingle();

    return {
      found: Boolean(student),
      student: student ?? null,
    };
  });

const modularDiscountItem = z.object({
  name: z.string(),
  kind: z.enum(["percentage", "fixed"]),
  value: z.number().nonnegative(),
  amount: z.number().nonnegative(),
});

const proposalInput = z.object({
  studentId: z.string().uuid().optional().or(z.literal("")),
  studentName: z.string().min(2).max(120),
  whatsapp: z.string().min(8).max(30),
  email: z.string().email().optional().or(z.literal("")),
  courseId: z.string().uuid(),
  paymentMethodId: z.string().uuid(),
  installmentId: z.string().uuid().optional().or(z.literal("")),
  discountId: z.string().uuid().optional().or(z.literal("")),
  matriculaDiscount: z.number().nonnegative().optional().default(0),
  entradaDiscount: z.number().nonnegative().optional().default(0),
  modularDiscounts: z.array(modularDiscountItem).optional().default([]),
  notes: z.string().max(2000).optional(),
  followupAt: z.string().optional(),
  followupNotes: z.string().max(500).optional(),
});

export const createProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => proposalInput.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase;

    let installmentPromise;
    if (data.installmentId) {
      installmentPromise = db.from("installment_options").select("*").eq("id", data.installmentId).maybeSingle();
    } else {
      installmentPromise = db.from("installment_options").select("*").eq("payment_method_id", data.paymentMethodId).order("installments", { ascending: true }).limit(1).maybeSingle();
    }

    const [
      courseRes,
      methodRes,
      installmentRes,
      discountRes,
      roleRowsRes,
      conditionRes,
    ] = await Promise.all([
      db.from("courses").select("*, areas(name)").eq("id", data.courseId).eq("status", "active").maybeSingle(),
      db.from("payment_methods").select("*").eq("id", data.paymentMethodId).eq("status", "active").maybeSingle(),
      installmentPromise,
      data.discountId ? db.from("discount_rules").select("*").eq("id", data.discountId).eq("status", "active").maybeSingle() : Promise.resolve({ data: null }),
      db.from("user_roles").select("role").eq("user_id", context.userId),
      db.from("commercial_conditions").select("*").eq("course_id", data.courseId).eq("payment_method_id", data.paymentMethodId).maybeSingle(),
    ]);

    const course = courseRes?.data;
    const method = methodRes?.data;
    if (!course || !method) throw new Error("O curso ou a forma de pagamento selecionada não está mais disponível.");

    const installment = installmentRes?.data || {
      id: null,
      installments: 1,
      label: "À vista",
    };
    const discountRule = discountRes?.data || null;
    const condition = conditionRes?.data || null;

    const roles = (roleRowsRes?.data ?? []).map((r) => r.role);
    if (discountRule && !discountRule.allowed_roles.some((role: any) => roles.includes(role))) {
      throw new Error("Este desconto não está autorizado para seu perfil.");
    }

    // Determine base price
    let priceQuery = db
      .from("course_prices")
      .select("price")
      .eq("course_id", data.courseId)
      .eq("payment_method_id", data.paymentMethodId)
      .eq("status", "active");

    if (installment.id) {
      priceQuery = priceQuery.eq("installment_option_id", installment.id);
    }
    const { data: configuredPrice } = await priceQuery.maybeSingle();

    const originalPrice = Number(configuredPrice?.price ?? course.base_price);

    // Calculate modular discounts
    const discountItems: Array<{ name: string; kind: "percentage" | "fixed"; value: number; amount: number }> = [];

    if (discountRule) {
      const amt = discountRule.kind === "percentage" ? (originalPrice * Number(discountRule.value)) / 100 : Number(discountRule.value);
      discountItems.push({
        name: discountRule.name,
        kind: discountRule.kind,
        value: Number(discountRule.value),
        amount: Math.min(amt, Number(discountRule.max_discount ?? amt)),
      });
    }

    if (data.matriculaDiscount > 0) {
      discountItems.push({
        name: "Desconto Matrícula",
        kind: "fixed",
        value: data.matriculaDiscount,
        amount: data.matriculaDiscount,
      });
    }

    if (data.entradaDiscount > 0) {
      discountItems.push({
        name: "Desconto Entrada",
        kind: "fixed",
        value: data.entradaDiscount,
        amount: data.entradaDiscount,
      });
    }

    for (const mod of data.modularDiscounts) {
      if (mod.amount > 0) discountItems.push(mod);
    }

    const totalDiscountAmount = Math.min(
      originalPrice,
      discountItems.reduce((acc, curr) => acc + curr.amount, 0)
    );

    let finalPrice = Math.max(0, originalPrice - totalDiscountAmount);
    if (discountRule?.min_final_price != null) {
      finalPrice = Math.max(finalPrice, Number(discountRule.min_final_price));
    }

    finalPrice = Math.round(finalPrice * 100) / 100;
    const finalDiscountAmount = Math.round((originalPrice - finalPrice) * 100) / 100;
    const countInstallments = Math.max(1, Number(installment.installments) || 1);
    const installmentValue = Math.round((finalPrice / countInstallments) * 100) / 100;

    // Student handling (Prevent duplication per Requirement 8)
    const cleanWhatsapp = data.whatsapp.replace(/\D/g, "");
    let studentId = data.studentId || null;
    let student: Record<string, unknown> | null = null;

    if (studentId) {
      const { data: existingStudent } = await db.from("students").select("*").eq("id", studentId).maybeSingle();
      student = existingStudent;
    }

    if (!student) {
      const { data: existingByPhone } = await db
        .from("students")
        .select("*")
        .or(`whatsapp.eq.${cleanWhatsapp},whatsapp.eq.${data.whatsapp.trim()}`)
        .limit(1)
        .maybeSingle();

      if (existingByPhone) {
        student = existingByPhone;
        studentId = existingByPhone.id;
      } else {
        const { data: firstStage } = await db.from("crm_stages").select("id").eq("status", "active").order("sort_order").limit(1).maybeSingle();
        const inserted = await db
          .from("students")
          .insert({
            full_name: data.studentName.trim(),
            whatsapp: cleanWhatsapp,
            email: data.email?.trim() || null,
            owner_id: context.userId,
            crm_stage_id: firstStage?.id ?? null,
          })
          .select()
          .single();

        if (inserted.error) throw new Error(`Não foi possível cadastrar o aluno: ${inserted.error.message}`);
        student = inserted.data;
        studentId = inserted.data.id;

        try {
          await db.from("student_assignments").insert({
            student_id: studentId,
            seller_id: context.userId,
            assigned_by: context.userId,
            reason: "Criação de proposta",
          });
        } catch {
          // Assignment policy might restrict to manager/admin, don't fail proposal creation
        }

        try {
          await db.from("student_interactions").insert({
            student_id: studentId,
            user_id: context.userId,
            kind: "student_created",
            notes: `Contato cadastrado no sistema (${data.studentName})`,
          });
        } catch {
          // Interactions table fail-safe
        }
      }
    }

    if (!studentId || !student) throw new Error("Não foi possível identificar o aluno.");

    // Update CRM stage to "Proposta enviada" if currently in first stage
    try {
      const { data: proposalStage } = await db.from("crm_stages").select("id").ilike("name", "%proposta%").limit(1).maybeSingle();
      if (proposalStage?.id) {
        await db.from("students").update({ crm_stage_id: proposalStage.id }).eq("id", studentId);
      }
    } catch {
      // Stage update fail-safe
    }

    // Set proposal validity
    const validityMinutes = Number(condition?.validity_minutes ?? 60);
    const validUntil = new Date(Date.now() + validityMinutes * 60000).toISOString();
    const areaRelation = course.areas as { name?: string } | null;

    // Snapshot payload stored in notes / breakdown
    const snapshotNotes = JSON.stringify({
      userNotes: data.notes || "",
      discountBreakdown: discountItems,
      validityMinutes,
      calculatedAt: new Date().toISOString(),
    });

    const discountSummaryName = discountItems.map((d) => d.name).join(" + ") || "Sem desconto";

    const created = await db
      .from("proposals")
      .insert({
        student_id: studentId,
        seller_id: context.userId,
        course_id: course.id,
        area_name: areaRelation?.name ?? "Área",
        course_name: course.name,
        course_workload_hours: course.workload_hours,
        course_modality: course.modality,
        original_price: originalPrice,
        discount_name: discountSummaryName,
        discount_kind: discountRule?.kind ?? "fixed",
        discount_value: finalDiscountAmount,
        discount_amount: finalDiscountAmount,
        final_price: finalPrice,
        payment_method_name: method.name,
        installments: countInstallments,
        installment_value: installmentValue,
        status: "sent",
        timer_status: "active",
        valid_until: validUntil,
        notes: snapshotNotes,
      })
      .select()
      .single();

    if (created.error || !created.data) throw new Error("Não foi possível salvar a proposta.");

    // Proposal events and student history in fail-safe blocks
    try {
      await db.from("proposal_events").insert({
        proposal_id: created.data.id,
        user_id: context.userId,
        action: "created",
        new_data: created.data,
      });
    } catch {
      // Event fail-safe
    }

    try {
      await db.from("proposal_timer_events").insert({
        proposal_id: created.data.id,
        user_id: context.userId,
        action: "started",
        new_status: "active",
        new_valid_until: validUntil,
      });
    } catch {
      // Timer event fail-safe
    }

    try {
      await db.from("student_interactions").insert({
        student_id: studentId,
        user_id: context.userId,
        kind: "proposal_created",
        notes: `Proposta gerada: ${course.name} por R$ ${finalPrice.toFixed(2)} (${countInstallments}x de R$ ${installmentValue.toFixed(2)})`,
        metadata: { proposal_id: created.data.id, final_price: finalPrice },
      });
    } catch {
      // Interaction fail-safe
    }

    // Followup (if requested)
    if (data.followupAt) {
      try {
        await db.from("followups").insert({
          student_id: studentId,
          seller_id: context.userId,
          due_at: data.followupAt,
          notes: data.followupNotes || "Retorno sobre a proposta",
        });

        await db.from("student_interactions").insert({
          student_id: studentId,
          user_id: context.userId,
          kind: "followup_scheduled",
          notes: `Retorno agendado para ${new Date(data.followupAt).toLocaleString("pt-BR")}: ${data.followupNotes || ""}`,
        });
      } catch {
        // Followup fail-safe
      }
    }

    return { proposal: created.data, studentId, studentName: data.studentName };
  });

// Requirement 16: "FECHAR AGORA"
export const closeSaleNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ proposalId: z.string().uuid(), notes: z.string().max(500).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase;

    const { data: proposal, error: propErr } = await db.from("proposals").select("*").eq("id", data.proposalId).single();
    if (propErr || !proposal) throw new Error("Proposta não encontrada.");

    // Update proposal status to approved
    const { data: updatedProposal, error: updateErr } = await db
      .from("proposals")
      .update({
        status: "approved",
        timer_status: "completed",
      })
      .eq("id", data.proposalId)
      .select()
      .single();

    if (updateErr) throw new Error("Não foi possível fechar a venda.");

    // Move student to "Matriculado" (won stage)
    const wonStage = await db.from("crm_stages").select("id").eq("is_won", true).limit(1).maybeSingle();
    let targetStageId = wonStage?.data?.id;

    if (!targetStageId) {
      const matriculadoStage = await db.from("crm_stages").select("id").ilike("name", "%matriculad%").limit(1).maybeSingle();
      targetStageId = matriculadoStage?.data?.id;
    }

    if (targetStageId) {
      await db.from("students").update({ crm_stage_id: targetStageId }).eq("id", proposal.student_id);
    }

    // Try inserting into sales table (fail-safe if table doesn't exist yet in remote DB)
    try {
      await (db as any).from("sales").insert({
        proposal_id: proposal.id,
        student_id: proposal.student_id,
        seller_id: context.userId,
        course_id: proposal.course_id,
        course_name: proposal.course_name,
        original_price: proposal.original_price,
        discount_amount: proposal.discount_amount,
        final_price: proposal.final_price,
        payment_method_name: proposal.payment_method_name,
        installments: proposal.installments,
        installment_value: proposal.installment_value,
        snapshot: proposal,
        notes: data.notes || "Venda confirmada pelo atendimento",
      });
    } catch (err) {
      console.warn("Could not insert into sales table:", err);
    }

    // Register proposal event
    await db.from("proposal_events").insert({
      proposal_id: proposal.id,
      user_id: context.userId,
      action: "sale_confirmed",
      new_data: { status: "approved", closed_at: new Date().toISOString() },
      notes: data.notes || "Venda fechada com sucesso",
    });

    // Register student timeline interaction
    await db.from("student_interactions").insert({
      student_id: proposal.student_id,
      user_id: context.userId,
      kind: "sale_confirmed",
      notes: `Venda confirmada: ${proposal.course_name} no valor de R$ ${Number(proposal.final_price).toFixed(2)} (${proposal.payment_method_name}, ${proposal.installments}x).`,
      metadata: { proposal_id: proposal.id, final_price: proposal.final_price },
    });

    return { ok: true, proposal: updatedProposal };
  });

// Requirement 17 & 18: "DEIXAR PARA DEPOIS" (Agendar Retorno)
export const deferProposalFollowup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      proposalId: z.string().uuid(),
      dueAt: z.string().min(5),
      notes: z.string().min(2).max(1000),
    })
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase;

    const { data: proposal, error: propErr } = await db.from("proposals").select("*").eq("id", data.proposalId).single();
    if (propErr || !proposal) throw new Error("Proposta não encontrada.");

    // Update proposal status to awaiting_response
    await db
      .from("proposals")
      .update({
        status: "awaiting_response",
      })
      .eq("id", data.proposalId);

    // Create followup record
    const { data: followup, error: followErr } = await db
      .from("followups")
      .insert({
        student_id: proposal.student_id,
        seller_id: context.userId,
        due_at: data.dueAt,
        notes: data.notes,
        status: "pending",
      })
      .select()
      .single();

    if (followErr) throw new Error("Não foi possível agendar o retorno.");

    // Move student to "Retorno agendado" / "Aguardando resposta" stage
    const retornoStage = await db.from("crm_stages").select("id").ilike("name", "%retorno%").limit(1).maybeSingle();
    if (retornoStage?.data?.id) {
      await db.from("students").update({ crm_stage_id: retornoStage.data.id }).eq("id", proposal.student_id);
    }

    // Register proposal event
    await db.from("proposal_events").insert({
      proposal_id: proposal.id,
      user_id: context.userId,
      action: "followup_scheduled",
      new_data: { due_at: data.dueAt, notes: data.notes },
    });

    // Register student timeline interaction
    await db.from("student_interactions").insert({
      student_id: proposal.student_id,
      user_id: context.userId,
      kind: "followup_scheduled",
      notes: `Retorno agendado para ${new Date(data.dueAt).toLocaleString("pt-BR")}: "${data.notes}"`,
      metadata: { proposal_id: proposal.id, due_at: data.dueAt },
    });

    return { ok: true, followup };
  });

// Requirement 27: Transferência de contatos
export const transferStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      studentIds: z.array(z.string().uuid()).min(1),
      targetSellerId: z.string().uuid().nullable(),
      reason: z.string().min(2).max(500),
    })
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase;

    const { data: isAuth } = await db.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: isManager } = await db.rpc("has_role", { _user_id: context.userId, _role: "manager" });

    if (!isAuth && !isManager) {
      throw new Error("Somente gerentes e administradores podem transferir contatos.");
    }

    let targetName = "Sem responsável (Banco de Leads)";
    if (data.targetSellerId) {
      const { data: targetProfile } = await db.from("profiles").select("full_name").eq("id", data.targetSellerId).single();
      if (targetProfile) targetName = targetProfile.full_name;
    }

    // Update students
    for (const sId of data.studentIds) {
      await db.from("students").update({ owner_id: data.targetSellerId }).eq("id", sId);

      await db.from("student_assignments").insert({
        student_id: sId,
        seller_id: data.targetSellerId,
        assigned_by: context.userId,
        reason: data.reason,
      });

      await db.from("student_interactions").insert({
        student_id: sId,
        user_id: context.userId,
        kind: "contact_transferred",
        notes: `Contato transferido para ${targetName}. Motivo: ${data.reason}`,
      });
    }

    return { ok: true, count: data.studentIds.length };
  });

// Requirement 4: Gerenciamento e Pré-Cadastro de Vendedores
export const manageSeller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({
      action: z.enum(["create", "update", "toggle_status", "reset_password"]),
      sellerId: z.string().uuid().optional(),
      fullName: z.string().min(2).max(120).optional(),
      email: z.string().email().optional(),
      password: z.string().min(6).optional(),
      accessCode: z.string().max(30).optional(),
      phone: z.string().max(30).optional(),
      jobTitle: z.string().max(80).optional(),
      teamId: z.string().uuid().nullable().optional(),
      status: z.enum(["active", "inactive"]).optional(),
      role: z.enum(["seller", "manager"]).optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const adminClient = await getAdminClient();

    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: isManager } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "manager" });

    if (!isAdmin && !isManager) {
      throw new Error("Somente gerentes e administradores podem gerenciar vendedores.");
    }

    if (!adminClient) {
      throw new Error("O serviço de cadastro de usuários está indisponível. Tente novamente em instantes.");
    }

    const db = adminClient;

    if (data.action === "create") {
      if (!data.fullName) throw new Error("Nome completo é obrigatório.");
      if (!data.email) throw new Error("E-mail corporativo é obrigatório para o pré-cadastro.");
      const targetRole = data.role || "seller";
      const rolePrefix = targetRole === "manager" ? "GR" : "VD";
      const defaultPass = targetRole === "manager" ? "Gerente" : "Vendedor";
      const initialPassword = data.password?.trim() || `${defaultPass}@${Math.floor(1000 + Math.random() * 9000)}`;
      const accessCode = data.accessCode?.trim().toUpperCase() || `${rolePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;

      let authUserId: string | null = null;

      const { data: authRes, error: authErr } = await adminClient.auth.admin.createUser({
        email: data.email.trim(),
        password: initialPassword,
        email_confirm: true,
        user_metadata: { full_name: data.fullName.trim(), access_code: accessCode },
      });

      if (authErr) {
        if (authErr.message.toLowerCase().includes("already") || authErr.status === 422) {
          const { data: listRes, error: listErr } = await adminClient.auth.admin.listUsers();
          if (listErr) throw new Error(`Erro ao consultar usuários: ${listErr.message}`);
          const existing = listRes.users.find((user) => user.email?.toLowerCase() === data.email?.toLowerCase().trim());
          if (!existing) throw new Error("Já existe uma conta com este e-mail, mas ela não pôde ser localizada.");
          authUserId = existing.id;
          const { error: passwordErr } = await adminClient.auth.admin.updateUserById(existing.id, { password: initialPassword });
          if (passwordErr) throw new Error(`Erro ao atualizar o acesso existente: ${passwordErr.message}`);
        } else {
          throw new Error(`Erro ao criar o acesso do vendedor: ${authErr.message}`);
        }
      } else {
        authUserId = authRes.user?.id ?? null;
      }

      if (!authUserId) throw new Error("O acesso do vendedor não retornou um identificador válido.");

      const preferences = {
        pre_registered: true,
        email: data.email.trim(),
        access_code: accessCode,
        initial_password: initialPassword,
        registered_by: context.userId,
        registered_at: new Date().toISOString(),
      };

      const { data: newProfile, error: profErr } = await db
        .from("profiles")
        .upsert(
          {
            id: authUserId,
            full_name: data.fullName.trim(),
            phone: data.phone?.trim() || null,
            job_title: data.jobTitle?.trim() || (targetRole === "manager" ? "Gerente Comercial" : "Vendedor Comercial"),
            team_id: data.teamId || null,
            manager_id: context.userId,
            status: "active",
            preferences,
          },
          { onConflict: "id" }
        )
        .select()
        .single();

      if (profErr) throw new Error(`Erro ao salvar perfil do vendedor: ${profErr.message}`);

      // Ensure correct role
      const { error: roleErr } = await db.from("user_roles").upsert(
        {
          user_id: authUserId,
          role: targetRole,
        },
        { onConflict: "user_id,role" }
      );
      if (roleErr) throw new Error(`Erro ao definir o perfil de acesso: ${roleErr.message}`);

      return {
        ok: true,
        seller: newProfile,
        accessCode,
        email: data.email.trim(),
        password: initialPassword,
      };
    }

    if (data.action === "reset_password" && data.sellerId) {
      if (!data.password) throw new Error("Nova senha é obrigatória.");
      const newPassword = data.password.trim();

      const { error: passwordErr } = await adminClient.auth.admin.updateUserById(data.sellerId, { password: newPassword });
      if (passwordErr) throw new Error(`Erro ao redefinir a senha: ${passwordErr.message}`);

      const { data: currentProf } = await db.from("profiles").select("preferences").eq("id", data.sellerId).single();
      const prefs = ((currentProf?.preferences as Record<string, any>) || {});
      prefs["initial_password"] = newPassword;
      prefs["password_updated_at"] = new Date().toISOString();

      const { data: updated, error } = await db
        .from("profiles")
        .update({ preferences: prefs })
        .eq("id", data.sellerId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { ok: true, seller: updated, newPassword };
    }

    if (data.action === "update" && data.sellerId) {
      const updatePayload: Record<string, any> = {};
      if (data.fullName !== undefined) updatePayload["full_name"] = data.fullName;
      if (data.phone !== undefined) updatePayload["phone"] = data.phone;
      if (data.jobTitle !== undefined) updatePayload["job_title"] = data.jobTitle;
      if (data.teamId !== undefined) updatePayload["team_id"] = data.teamId;
      if (data.status !== undefined) updatePayload["status"] = data.status;

      const { data: updated, error } = await (db.from("profiles") as any)
        .update(updatePayload)
        .eq("id", data.sellerId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { ok: true, seller: updated };
    }

    if (data.action === "toggle_status" && data.sellerId) {
      const { data: current } = await db.from("profiles").select("status").eq("id", data.sellerId).single();
      const newStatus = current?.status === "active" ? "inactive" : "active";

      const { data: updated, error } = await db
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", data.sellerId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { ok: true, seller: updated, status: newStatus };
    }

    throw new Error("Ação inválida.");
  });

// Resolver login por E-mail ou Código de Acesso do Vendedor (ex: VD-1024)
export const resolveSellerLogin = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({
      identifier: z.string().min(1).max(120),
    }).parse(input)
  )
  .handler(async ({ data }) => {
    const clean = data.identifier.trim();
    if (clean.includes("@")) {
      return { email: clean };
    }

    // Lookup in profiles table by access_code in preferences or phone
    const SUPABASE_URL = process.env['SUPABASE_URL'] || process.env['VITE_SUPABASE_URL'] || 'https://xkyrperygblypbnhffyi.supabase.co';
    const SUPABASE_KEY = process.env['SUPABASE_PUBLISHABLE_KEY'] || process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] || '';
    const { createClient } = await import('@supabase/supabase-js');
    const adminClient = await getAdminClient();
    const client = adminClient || createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: profiles } = await client
      .from("profiles")
      .select("preferences, full_name, phone");

    const match = (profiles || []).find((p: any) => {
      const prefs = p.preferences as Record<string, any> | undefined;
      return (
        prefs?.["access_code"]?.toLowerCase() === clean.toLowerCase() ||
        prefs?.["email"]?.toLowerCase() === clean.toLowerCase() ||
        p.phone?.replace(/\D/g, "") === clean.replace(/\D/g, "")
      );
    });

    if (match) {
      const email = (match.preferences as any)?.["email"];
      return { email: email || null, fullName: match.full_name };
    }

    return { email: null };
  });

// Cadastro rápido de contato pelo Vendedor direto no Dashboard
export const createQuickStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({
      fullName: z.string().min(2).max(120),
      whatsapp: z.string().min(8).max(30),
      email: z.string().email().optional().or(z.literal("")),
      notes: z.string().max(1000).optional(),
      source: z.string().max(80).optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase;

    // Get default initial CRM stage
    const { data: firstStage } = await db.from("crm_stages").select("id").order("sort_order").limit(1).maybeSingle();
    const stageId = firstStage?.id || null;

    const { data: student, error } = await db
      .from("students")
      .insert({
        full_name: data.fullName.trim(),
        whatsapp: data.whatsapp.trim(),
        email: data.email?.trim() || null,
        notes: data.notes?.trim() || null,
        source: data.source?.trim() || "Dashboard Vendedor",
        owner_id: context.userId,
        crm_stage_id: stageId,
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes("students_whatsapp_key") || error.code === "23505") {
        throw new Error("Já existe um contato cadastrado com este WhatsApp na base.");
      }
      throw new Error(error.message);
    }

    await db.from("student_interactions").insert({
      student_id: student.id,
      user_id: context.userId,
      kind: "lead_created",
      notes: "Contato cadastrado rapidamente via Dashboard do Vendedor",
    });

    return { ok: true, student };
  });

// Conclusão rápida de Retorno Comercial (Follow-up) pelo Vendedor
export const completeFollowup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({
      followupId: z.string().uuid(),
      notes: z.string().max(500).optional(),
      nextDueAt: z.string().optional(),
      nextNotes: z.string().max(500).optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const { data: updated, error } = await db
      .from("followups")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        notes: data.notes?.trim() || null,
      })
      .eq("id", data.followupId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    if (updated) {
      await db.from("student_interactions").insert({
        student_id: updated.student_id,
        user_id: context.userId,
        kind: "followup_completed",
        notes: `Retorno comercial concluído: ${data.notes || "Contato realizado com sucesso."}`,
      });

      if (data.nextDueAt) {
        await db.from("followups").insert({
          student_id: updated.student_id,
          seller_id: context.userId,
          due_at: data.nextDueAt,
          notes: data.nextNotes?.trim() || "Novo retorno comercial agendado",
          status: "pending",
        });

        await db.from("student_interactions").insert({
          student_id: updated.student_id,
          user_id: context.userId,
          kind: "followup_scheduled",
          notes: `Novo retorno agendado para ${new Date(data.nextDueAt).toLocaleString("pt-BR")}: ${data.nextNotes || ""}`,
        });
      }
    }

    return { ok: true, followup: updated };
  });

export const moveStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z.object({
      studentId: z.string().uuid(),
      stageId: z.string().uuid(),
      lostReason: z.string().optional(),
      lostNotes: z.string().optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const before = await context.supabase.from("students").select("crm_stage_id").eq("id", data.studentId).single();
    const result = await context.supabase.from("students").update({ crm_stage_id: data.stageId }).eq("id", data.studentId).select().single();
    if (result.error) throw new Error("Não foi possível mover o contato.");
    const notesText = data.lostReason
      ? `Contato movido para Perdido. Motivo: ${data.lostReason}${data.lostNotes ? ` (${data.lostNotes})` : ""}`
      : undefined;

    await context.supabase.from("student_interactions").insert({
      student_id: data.studentId,
      user_id: context.userId,
      kind: data.lostReason ? "lead_lost" : "stage_changed",
      notes: notesText,
      metadata: { from: before.data?.crm_stage_id, to: data.stageId, lost_reason: data.lostReason || null },
    });
    return result.data;
  });

export const updateProposalTimer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({
      proposalId: z.string().uuid(),
      action: z.enum(["pause", "resume", "extend30", "extend60", "complete", "cancel"]),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const current = await context.supabase.from("proposals").select("*").eq("id", data.proposalId).single();
    if (current.error || !current.data) throw new Error("Proposta não encontrada.");

    const now = Date.now();
    let status = current.data.timer_status;
    let validUntil = current.data.valid_until;
    let remaining = current.data.timer_remaining_seconds;

    if (data.action === "pause") {
      status = "paused";
      remaining = Math.max(0, Math.floor((new Date(validUntil ?? now).getTime() - now) / 1000));
    } else if (data.action === "resume") {
      status = "active";
      validUntil = new Date(now + Number(remaining ?? 0) * 1000).toISOString();
      remaining = null;
    } else if (data.action === "extend30" || data.action === "extend60") {
      const minutes = data.action === "extend30" ? 30 : 60;
      if (status === "paused") remaining = Number(remaining ?? 0) + minutes * 60;
      else validUntil = new Date(Math.max(now, new Date(validUntil ?? now).getTime()) + minutes * 60000).toISOString();
    } else {
      status = data.action === "complete" ? "completed" : "cancelled";
    }

    const updated = await context.supabase
      .from("proposals")
      .update({ timer_status: status, valid_until: validUntil, timer_remaining_seconds: remaining })
      .eq("id", data.proposalId)
      .select()
      .single();

    if (updated.error) throw new Error("Não foi possível alterar o timer.");

    await context.supabase.from("proposal_timer_events").insert({
      proposal_id: data.proposalId,
      user_id: context.userId,
      action: data.action,
      previous_status: current.data.timer_status,
      new_status: status,
      previous_valid_until: current.data.valid_until,
      new_valid_until: validUntil,
    });

    return updated.data;
  });

export const saveCatalogItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({
      type: z.enum(["area", "course", "stage", "trigger", "discount", "condition"]),
      name: z.string().min(2).max(120),
      areaId: z.string().uuid().optional(),
      courseId: z.string().uuid().optional(),
      paymentMethodId: z.string().uuid().optional(),
      installmentId: z.string().uuid().optional(),
      discountRuleId: z.string().uuid().optional(),
      validityMinutes: z.number().int().positive().optional(),
      workload: z.number().int().positive().optional(),
      modality: z.string().max(60).optional(),
      basePrice: z.number().nonnegative().optional(),
      discountKind: z.enum(["percentage", "fixed"]).optional(),
      discountValue: z.number().nonnegative().optional(),
      triggerTitle: z.string().max(120).optional(),
      triggerText: z.string().max(500).optional(),
      triggerType: z.string().max(50).optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: isManager } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "manager" });

    if (!isAdmin && !isManager) throw new Error("Somente administradores e gerentes podem alterar configurações.");

    if (data.type === "condition") {
      if (!data.courseId || !data.paymentMethodId || !data.installmentId) {
        throw new Error("Curso, forma de pagamento e parcelamento são obrigatórios para a condição comercial.");
      }

      const { data: existingPrice } = await context.supabase
        .from("course_prices")
        .select("id")
        .eq("course_id", data.courseId)
        .eq("payment_method_id", data.paymentMethodId)
        .eq("installment_option_id", data.installmentId)
        .maybeSingle();

      let priceId = existingPrice?.id;
      if (!priceId) {
        const { data: courseRow } = await context.supabase
          .from("courses")
          .select("base_price")
          .eq("id", data.courseId)
          .single();
        const insertedPrice = await context.supabase
          .from("course_prices")
          .insert({
            course_id: data.courseId,
            payment_method_id: data.paymentMethodId,
            installment_option_id: data.installmentId,
            price: courseRow?.base_price ?? 0,
            label: "Tabela cadastrada",
          })
          .select("id")
          .single();
        if (insertedPrice.error) throw new Error(insertedPrice.error.message);
        priceId = insertedPrice.data.id;
      }

      const result = await context.supabase
        .from("commercial_conditions")
        .insert({
          name: data.name,
          course_id: data.courseId,
          course_price_id: priceId,
          payment_method_id: data.paymentMethodId,
          installment_option_id: data.installmentId,
          discount_rule_id: data.discountRuleId || null,
          validity_minutes: data.validityMinutes || 60,
          allowed_roles: ["seller", "manager", "admin"],
        })
        .select()
        .single();

      if (result.error) throw new Error(result.error.message);
      return { id: result.data.id };
    }

    if (data.type === "area") {
      const result = await context.supabase.from("areas").insert({ name: data.name }).select().single();
      if (result.error) throw new Error(result.error.message);
      return { id: result.data.id };
    }

    if (data.type === "stage") {
      const { count } = await context.supabase.from("crm_stages").select("id", { count: "exact", head: true });
      const result = await context.supabase.from("crm_stages").insert({ name: data.name, sort_order: Number(count ?? 0) + 1 }).select().single();
      if (result.error) throw new Error(result.error.message);
      return { id: result.data.id };
    }

    if (data.type === "discount") {
      const result = await context.supabase
        .from("discount_rules")
        .insert({
          name: data.name,
          kind: data.discountKind ?? "percentage",
          value: data.discountValue ?? 10,
          allowed_roles: ["seller", "manager", "admin"],
        })
        .select()
        .single();
      if (result.error) throw new Error(result.error.message);
      return { id: result.data.id };
    }

    if (data.type === "trigger") {
      try {
        const result = await (context.supabase as any)
          .from("commercial_triggers")
          .insert({
            name: data.name,
            title: data.triggerTitle || data.name,
            description: data.triggerText || "",
            template_text: data.triggerText || data.name,
            trigger_type: data.triggerType || "badge",
          })
          .select()
          .single();
        if (result.error) throw new Error(result.error.message);
        return { id: result.data.id };
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : "Não foi possível salvar o gatilho.");
      }
    }

    if (!data.areaId || !data.workload || !data.modality || data.basePrice == null) {
      throw new Error("Preencha todos os dados do curso.");
    }

    const result = await context.supabase
      .from("courses")
      .insert({
        name: data.name,
        area_id: data.areaId,
        workload_hours: data.workload,
        modality: data.modality,
        base_price: data.basePrice,
      })
      .select()
      .single();

    if (result.error) throw new Error(result.error.message);
    return { id: result.data.id };
  });

export const getStudentTimeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ studentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase;

    const [interactionsRes, proposalsRes, followupsRes] = await Promise.all([
      db.from("student_interactions").select("*").eq("student_id", data.studentId).order("created_at", { ascending: false }),
      db.from("proposals").select("*").eq("student_id", data.studentId).order("created_at", { ascending: false }),
      db.from("followups").select("*").eq("student_id", data.studentId).order("created_at", { ascending: false }),
    ]);

    return {
      interactions: interactionsRes.data ?? [],
      proposals: proposalsRes.data ?? [],
      followups: followupsRes.data ?? [],
    };
  });

export const toggleCatalogItemStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({
      table: z.enum(["courses", "areas", "discount_rules", "commercial_conditions", "crm_stages", "commercial_triggers"]),
      id: z.string().uuid(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: isManager } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "manager" });

    if (!isAdmin && !isManager) throw new Error("Somente administradores e gerentes podem alterar o status de itens.");

    if (data.table === "commercial_triggers") {
      const { data: current } = await (context.supabase as any).from("commercial_triggers").select("is_active").eq("id", data.id).single();
      const newActive = !(current?.is_active ?? true);
      const { error } = await (context.supabase as any).from("commercial_triggers").update({ is_active: newActive }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, active: newActive };
    } else {
      const { data: current } = await (context.supabase as any).from(data.table).select("status").eq("id", data.id).single();
      const newStatus = current?.status === "active" ? "inactive" : "active";
      const { error } = await (context.supabase as any).from(data.table).update({ status: newStatus }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, status: newStatus };
    }
  });

