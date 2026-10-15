import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const saveEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .discriminatedUnion("action", [
        z.object({
          action: z.literal("global"),
          value: z.number().finite().nonnegative().max(9999999999).optional(),
          normalFee: z.number().finite().nonnegative().max(9999999999).optional(),
          promotionalFee: z.number().finite().nonnegative().max(9999999999).optional(),
          promotionalActive: z.boolean().optional(),
        }),
        z.object({
          action: z.literal("bulk"),
          courseIds: z.array(z.string().uuid()).min(1).max(1000),
          value: z.number().finite().nonnegative().max(9999999999).nullable().optional(),
          normalFee: z.number().finite().nonnegative().max(9999999999).nullable().optional(),
          promotionalFee: z.number().finite().nonnegative().max(9999999999).nullable().optional(),
        }),
        z.object({
          action: z.literal("course"),
          courseId: z.string().uuid(),
          value: z.number().finite().nonnegative().max(9999999999).nullable().optional(),
          normalFee: z.number().finite().nonnegative().max(9999999999).nullable().optional(),
          promotionalFee: z.number().finite().nonnegative().max(9999999999).nullable().optional(),
          material: z.number().finite().nonnegative().max(9999999999).default(0),
          materialBilling: z.enum(["included", "discounted", "separate"]).optional(),
          materialReference: z.number().finite().nonnegative().max(9999999999).optional(),
        }),
      ])
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const [admin, manager] = await Promise.all([
      db.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      db.rpc("has_role", { _user_id: context.userId, _role: "manager" }),
    ]);
    if (!admin.data && !manager.data) {
      throw new Error("Somente gerentes e administradores podem alterar estes valores.");
    }

    if (data.action === "global") {
      const normal = data.normalFee ?? data.value ?? 450;
      const promo = data.promotionalFee ?? 350;
      const active = data.promotionalActive ?? true;

      // Try saving with promotional columns; fallback if database doesn't have the columns yet
      let res = await (db as any)
        .from("enrollment_settings")
        .update({ default_fee: normal, promotional_fee: promo, promotional_active: active })
        .eq("id", "global")
        .select("id")
        .maybeSingle();

      if (res.error && res.error.code === "42703") {
        res = await db.from("enrollment_settings").update({ default_fee: normal }).eq("id", "global").select("id").maybeSingle();
      }

      if (res.error) throw new Error("Não foi possível salvar a matrícula global.");
    } else if (data.action === "bulk") {
      const normal = data.normalFee !== undefined ? data.normalFee : (data.value ?? null);
      const promo = data.promotionalFee !== undefined ? data.promotionalFee : null;

      // Try bulk update directly on courses
      let updatePayload: Record<string, any> = { enrollment_fee: normal };
      if (promo !== undefined) updatePayload["promotional_enrollment_fee"] = promo;

      let res = await (db as any).from("courses").update(updatePayload).in("id", data.courseIds);
      if (res.error && res.error.code === "42703") {
        res = await db.rpc("set_course_enrollment_bulk", { course_ids: data.courseIds, fee: normal as number });
      }

      if (res.error) throw new Error("Não foi possível atualizar as matrículas selecionadas.");
    } else {
      const normal = data.normalFee !== undefined ? data.normalFee : (data.value ?? null);
      const promo = data.promotionalFee !== undefined ? data.promotionalFee : null;

      const updatePayload: Record<string, any> = {
        enrollment_fee: normal,
        material_discount: data.material,
      };
      if (promo !== undefined) updatePayload["promotional_enrollment_fee"] = promo;
      if (data.materialBilling) updatePayload["material_billing"] = data.materialBilling;
      if (data.materialReference !== undefined) updatePayload["material_reference_price"] = data.materialReference;

      let res = await (db as any).from("courses").update(updatePayload).eq("id", data.courseId).select("id").maybeSingle();
      if (res.error && res.error.code === "42703") {
        res = await db
          .from("courses")
          .update({ enrollment_fee: normal, material_discount: data.material })
          .eq("id", data.courseId)
          .select("id")
          .maybeSingle();
      }

      if (res.error) throw new Error("Não foi possível salvar os valores do curso.");
    }

    return { ok: true };
  });