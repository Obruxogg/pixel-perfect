import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const bootstrapProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fullName?: string }) => z.object({ fullName: z.string().max(120).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.from("profiles").select("id").eq("id", context.userId).maybeSingle();
    if (!existing) {
      const name = data.fullName?.trim() || String(context.claims.user_metadata?.full_name ?? context.claims.email ?? "Novo usuário");
      const { error } = await supabaseAdmin.from("profiles").insert({ id: context.userId, full_name: name });
      if (error) throw new Error("Não foi possível criar o perfil.");
    }
    const { data: currentRole } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId).maybeSingle();
    if (!currentRole) {
      const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true });
      const role = count === 0 ? "admin" : "seller";
      const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role });
      if (error) throw new Error("Não foi possível definir o acesso.");
    }
    return { ok: true };
  });

export const getWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase;
    const [profile, roles, areas, courses, methods, installments, prices, discounts, conditions, stages, students, proposals, followups] = await Promise.all([
      db.from("profiles").select("*").eq("id", context.userId).single(),
      db.from("user_roles").select("role").eq("user_id", context.userId),
      db.from("areas").select("*").eq("status", "active").order("sort_order"),
      db.from("courses").select("*").eq("status", "active").order("sort_order"),
      db.from("payment_methods").select("*").eq("status", "active").order("sort_order"),
      db.from("installment_options").select("*").eq("status", "active").order("sort_order"),
      db.from("course_prices").select("*").eq("status", "active"),
      db.from("discount_rules").select("*").eq("status", "active"),
      db.from("commercial_conditions").select("*").eq("status", "active"),
      db.from("crm_stages").select("*").eq("status", "active").order("sort_order"),
      db.from("students").select("*").order("created_at", { ascending: false }),
      db.from("proposals").select("*").order("created_at", { ascending: false }),
      db.from("followups").select("*").order("due_at"),
    ]);
    const errors = [profile, roles, areas, courses, methods, installments, prices, discounts, conditions, stages, students, proposals, followups].map((r) => r.error).filter(Boolean);
    if (errors.length) throw new Error("Não foi possível carregar o ambiente comercial.");
    return {
      userId: context.userId,
      profile: profile.data,
      roles: roles.data ?? [], areas: areas.data ?? [], courses: courses.data ?? [],
      methods: methods.data ?? [], installments: installments.data ?? [], prices: prices.data ?? [],
      discounts: discounts.data ?? [], conditions: conditions.data ?? [], stages: stages.data ?? [],
      students: students.data ?? [], proposals: proposals.data ?? [], followups: followups.data ?? [],
    };
  });

const proposalInput = z.object({
  studentName: z.string().min(2).max(120), whatsapp: z.string().min(8).max(30), email: z.string().email().optional().or(z.literal("")),
  courseId: z.string().uuid(), paymentMethodId: z.string().uuid(), installmentId: z.string().uuid(), discountId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().max(1000).optional(), followupAt: z.string().optional(), followupNotes: z.string().max(500).optional(),
});

export const createProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => proposalInput.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const [{ data: course }, { data: method }, { data: installment }, { data: discount }, { data: roleRows }, { data: condition }] = await Promise.all([
      db.from("courses").select("*, areas(name)").eq("id", data.courseId).eq("status", "active").single(),
      db.from("payment_methods").select("*").eq("id", data.paymentMethodId).eq("status", "active").single(),
      db.from("installment_options").select("*").eq("id", data.installmentId).eq("status", "active").single(),
      data.discountId ? db.from("discount_rules").select("*").eq("id", data.discountId).eq("status", "active").single() : Promise.resolve({ data: null }),
      db.from("user_roles").select("role").eq("user_id", context.userId),
      db.from("commercial_conditions").select("*").eq("course_id", data.courseId).eq("payment_method_id", data.paymentMethodId).eq("installment_option_id", data.installmentId).eq("status", "active").maybeSingle(),
    ]);
    if (!course || !method || !installment) throw new Error("A condição selecionada não está mais disponível.");
    const roles = (roleRows ?? []).map((r) => r.role);
    if (discount && !discount.allowed_roles.some((role) => roles.includes(role))) throw new Error("Este desconto não está autorizado para seu perfil.");
    const { data: configuredPrice } = await db.from("course_prices").select("price").eq("course_id", data.courseId).eq("payment_method_id", data.paymentMethodId).eq("installment_option_id", data.installmentId).eq("status", "active").maybeSingle();
    const original = Number(configuredPrice?.price ?? course.base_price);
    let discountAmount = 0;
    if (discount) discountAmount = discount.kind === "percentage" ? original * Number(discount.value) / 100 : Number(discount.value);
    if (discount?.max_discount != null) discountAmount = Math.min(discountAmount, Number(discount.max_discount));
    let finalPrice = Math.max(0, original - discountAmount);
    if (discount?.min_final_price != null) finalPrice = Math.max(finalPrice, Number(discount.min_final_price));
    finalPrice = Math.round(finalPrice * 100) / 100;
    discountAmount = Math.round((original - finalPrice) * 100) / 100;
    const installmentValue = Math.floor((finalPrice / installment.installments) * 100) / 100;
    const whatsapp = data.whatsapp.replace(/\D/g, "");
    let { data: student } = await db.from("students").select("*").eq("whatsapp", whatsapp).maybeSingle();
    if (!student) {
      const firstStage = await db.from("crm_stages").select("id").eq("status", "active").order("sort_order").limit(1).single();
      const inserted = await db.from("students").insert({ full_name: data.studentName, whatsapp, email: data.email || null, owner_id: context.userId, crm_stage_id: firstStage.data?.id }).select().single();
      if (inserted.error) throw new Error("Não foi possível cadastrar o contato.");
      student = inserted.data;
      await db.from("student_assignments").insert({ student_id: student.id, seller_id: context.userId, assigned_by: context.userId, reason: "Criação pela simulação" });
    }
    if (!student) throw new Error("Contato inválido.");
    const validUntil = new Date(Date.now() + Number(condition?.validity_minutes ?? 60) * 60000).toISOString();
    const areaRelation = course.areas as { name?: string } | null;
    const created = await db.from("proposals").insert({ student_id: student.id, seller_id: context.userId, course_id: course.id, area_name: areaRelation?.name ?? "Área", course_name: course.name, course_workload_hours: course.workload_hours, course_modality: course.modality, original_price: original, discount_name: discount?.name ?? null, discount_kind: discount?.kind ?? null, discount_value: Number(discount?.value ?? 0), discount_amount: discountAmount, final_price: finalPrice, payment_method_name: method.name, installments: installment.installments, installment_value: installmentValue, status: "sent", timer_status: "active", valid_until: validUntil, notes: data.notes || null }).select().single();
    if (created.error || !created.data) throw new Error("Não foi possível criar a proposta.");
    await db.from("proposal_events").insert({ proposal_id: created.data.id, user_id: context.userId, action: "created", new_data: created.data });
    await db.from("proposal_timer_events").insert({ proposal_id: created.data.id, user_id: context.userId, action: "started", new_status: "active", new_valid_until: validUntil });
    if (data.followupAt) await db.from("followups").insert({ student_id: student.id, seller_id: context.userId, due_at: data.followupAt, notes: data.followupNotes || null });
    return { proposal: created.data, student };
  });

export const moveStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ studentId: z.string().uuid(), stageId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const before = await context.supabase.from("students").select("crm_stage_id").eq("id", data.studentId).single();
    const result = await context.supabase.from("students").update({ crm_stage_id: data.stageId }).eq("id", data.studentId).select().single();
    if (result.error) throw new Error("Não foi possível mover o contato.");
    await context.supabase.from("student_interactions").insert({ student_id: data.studentId, user_id: context.userId, kind: "stage_changed", metadata: { from: before.data?.crm_stage_id, to: data.stageId } });
    return result.data;
  });
