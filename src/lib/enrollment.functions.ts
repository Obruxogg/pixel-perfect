import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const saveEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.discriminatedUnion("action", [
    z.object({ action: z.literal("global"), value: z.number().finite().nonnegative().max(9999999999) }),
    z.object({ action: z.literal("bulk"), courseIds: z.array(z.string().uuid()).min(1).max(1000), value: z.number().finite().nonnegative().max(9999999999).nullable() }),
    z.object({ action: z.literal("course"), courseId: z.string().uuid(), value: z.number().finite().nonnegative().max(9999999999).nullable(), material: z.number().finite().nonnegative().max(9999999999) }),
  ]).parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const [admin, manager] = await Promise.all([
      db.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      db.rpc("has_role", { _user_id: context.userId, _role: "manager" }),
    ]);
    if (!admin.data && !manager.data) throw new Error("Somente gerentes e administradores podem alterar estes valores.");
    if (data.action === "global") {
      const result = await db.from("enrollment_settings").update({ default_fee: data.value }).eq("id", "global").select("id").single();
      if (result.error) throw new Error("Não foi possível salvar a matrícula global.");
    } else if (data.action === "bulk") {
      const result = await db.rpc("set_course_enrollment_bulk", { course_ids: data.courseIds, fee: data.value as number });
      if (result.error) throw new Error("Não foi possível atualizar as matrículas selecionadas.");
    } else {
      const result = await db.from("courses").update({ enrollment_fee: data.value, material_discount: data.material }).eq("id", data.courseId).select("id").single();
      if (result.error) throw new Error("Não foi possível salvar os valores do curso.");
    }
    return { ok: true };
  });