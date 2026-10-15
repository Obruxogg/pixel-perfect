import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Save, X, Sparkles, BookOpen, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveEnrollment } from "@/lib/enrollment.functions";
import { brl, useRefreshWorkspace, type WorkspaceData } from "@/lib/use-workspace";

export type CourseEnrollmentFieldsProps = {
  globalNormalFee?: number;
  globalPromoFee?: number;
  customNormal?: boolean;
  customPromo?: boolean;
  normalValue?: string;
  promoValue?: string;
  material?: string;
  materialBilling?: string;
  onCustomNormal?: (value: boolean) => void;
  onCustomPromo?: (value: boolean) => void;
  onNormalValue?: (value: string) => void;
  onPromoValue?: (value: string) => void;
  onMaterial?: (value: string) => void;
  onMaterialBilling?: (value: string) => void;

  // Legacy compatibility props
  globalFee?: number;
  custom?: boolean;
  value?: string;
  onCustom?: (value: boolean) => void;
  onValue?: (value: string) => void;
};

export function CourseEnrollmentFields(props: CourseEnrollmentFieldsProps) {
  const globalNormalFee = props.globalNormalFee ?? props.globalFee ?? 450;
  const globalPromoFee = props.globalPromoFee ?? 350;
  const customNormal = props.customNormal ?? props.custom ?? false;
  const customPromo = props.customPromo ?? false;
  const normalValue = props.normalValue ?? props.value ?? "";
  const promoValue = props.promoValue ?? "";
  const material = props.material ?? "0";
  const materialBilling = props.materialBilling ?? "included";
  const onCustomNormal = props.onCustomNormal ?? props.onCustom ?? (() => {});
  const onCustomPromo = props.onCustomPromo ?? (() => {});
  const onNormalValue = props.onNormalValue ?? props.onValue ?? (() => {});
  const onPromoValue = props.onPromoValue ?? (() => {});
  const onMaterial = props.onMaterial ?? (() => {});
  const onMaterialBilling = props.onMaterialBilling ?? (() => {});
  return (
    <fieldset className="mt-4 border-t border-border pt-4 space-y-4">
      <legend className="text-sm font-bold flex items-center gap-2">
        <BookOpen size={16} className="text-primary" /> Matrícula e Material Didático
      </legend>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Matrícula Normal */}
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
          <label className="text-xs font-bold block text-foreground">
            Matrícula Normal
            <select
              className="input-field mt-1"
              value={customNormal ? "custom" : "global"}
              onChange={(e) => onCustomNormal(e.target.value === "custom")}
            >
              <option value="global">Padrão global — {brl.format(globalNormalFee)}</option>
              <option value="custom">Personalizar valor</option>
            </select>
          </label>
          {customNormal && (
            <label className="text-xs font-medium block">
              Valor Normal Personalizado (R$)
              <input
                className="input-field mt-1"
                type="number"
                min="0"
                step="0.01"
                required
                value={normalValue}
                onChange={(e) => onNormalValue(e.target.value)}
              />
            </label>
          )}
        </div>

        {/* Matrícula Promocional */}
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
          <label className="text-xs font-bold block text-foreground">
            Matrícula Promocional
            <select
              className="input-field mt-1"
              value={customPromo ? "custom" : "global"}
              onChange={(e) => onCustomPromo(e.target.value === "custom")}
            >
              <option value="global">Padrão global — {brl.format(globalPromoFee)}</option>
              <option value="custom">Personalizar valor promocional</option>
            </select>
          </label>
          {customPromo && (
            <label className="text-xs font-medium block">
              Valor Promocional Personalizado (R$)
              <input
                className="input-field mt-1"
                type="number"
                min="0"
                step="0.01"
                required
                value={promoValue}
                onChange={(e) => onPromoValue(e.target.value)}
              />
            </label>
          )}
        </div>
      </div>

      {/* Material Didático */}
      <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border/60">
        <label className="text-xs font-bold block">
          Tratamento do Material Didático
          <select
            className="input-field mt-1"
            value={materialBilling}
            onChange={(e) => onMaterialBilling(e.target.value)}
          >
            <option value="included">Incluso sem cobrança adicional</option>
            <option value="discounted">Com desconto comercial previsto</option>
            <option value="separate">Cobrança separada</option>
          </select>
        </label>
        <label className="text-xs font-bold block">
          Desconto de Material Didático (R$)
          <input
            className="input-field mt-1"
            type="number"
            min="0"
            step="0.01"
            value={material}
            onChange={(e) => onMaterial(e.target.value)}
          />
        </label>
      </div>
    </fieldset>
  );
}

export function EnrollmentSettings({
  data,
  courseOnly = false,
}: {
  data: WorkspaceData;
  courseOnly?: boolean;
}) {
  const save = useServerFn(saveEnrollment);
  const refresh = useRefreshWorkspace();

  const globalNormalFee = Number((data as any).enrollmentFee ?? 450);
  const globalPromoFee = Number((data as any).enrollmentPromotionalFee ?? 350);
  const globalPromoActive = Boolean((data as any).promotionalActive ?? true);

  const [globalNormal, setGlobalNormal] = useState(String(globalNormalFee));
  const [globalPromo, setGlobalPromo] = useState(String(globalPromoFee));
  const [promoActive, setPromoActive] = useState(globalPromoActive);

  const [area, setArea] = useState("");
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkNormalValue, setBulkNormalValue] = useState("");
  const [pending, setPending] = useState<{ ids: string[]; value: number | null } | null>(null);

  // Edit Course Modal state
  const [editing, setEditing] = useState<WorkspaceData["courses"][number] | null>(null);
  const [customNormal, setCustomNormal] = useState(false);
  const [customPromo, setCustomPromo] = useState(false);
  const [normalValue, setNormalValue] = useState("");
  const [promoValue, setPromoValue] = useState("");
  const [material, setMaterial] = useState("0");
  const [materialBilling, setMaterialBilling] = useState("included");
  const [busy, setBusy] = useState(false);

  const canEdit = data.isAdmin || data.isManager;

  useEffect(() => {
    setGlobalNormal(String(globalNormalFee));
    setGlobalPromo(String(globalPromoFee));
    setPromoActive(globalPromoActive);
  }, [globalNormalFee, globalPromoFee, globalPromoActive]);

  const courses = data.courses.filter(
    (c) =>
      (!area || c.area_id === area) &&
      c.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()) &&
      (!origin ||
        (origin === "global"
          ? c.enrollment_fee === null && (c as any).promotional_enrollment_fee == null
          : c.enrollment_fee !== null || (c as any).promotional_enrollment_fee != null))
  );

  async function commit(
    input:
      | { action: "global"; normalFee: number; promotionalFee: number; promotionalActive: boolean }
      | { action: "bulk"; courseIds: string[]; normalFee: number | null; promotionalFee?: number | null }
      | {
          action: "course";
          courseId: string;
          normalFee: number | null;
          promotionalFee: number | null;
          material: number;
          materialBilling: "included" | "discounted" | "separate";
        }
  ) {
    setBusy(true);
    try {
      await save({ data: input as any });
      await refresh();
      toast.success("Configurações salvas com sucesso!");
      setPending(null);
      setEditing(null);
      setSelected([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BookOpen size={20} className="text-primary" />
            {courseOnly ? "Valores de Matrícula por Curso" : "Gestão Comercial de Matrículas"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Configure valores padrão globais e matrículas promocionais ou personalizadas por formação.
          </p>
        </div>
      </div>

      {/* ── PAINEL GLOBAL (visível para Gerente/Admin) ──────────────── */}
      {!courseOnly && (
        <form
          className="rounded-xl border border-border bg-card p-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void commit({
              action: "global",
              normalFee: Number(globalNormal),
              promotionalFee: Number(globalPromo),
              promotionalActive: promoActive,
            });
          }}
        >
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <span className="text-sm font-bold flex items-center gap-2">
              <Sparkles size={16} className="text-primary" /> Configuração Padrão Global
            </span>
            <span className="text-xs text-muted-foreground">
              Aplica-se a todos os cursos com configuração padrão
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-xs font-semibold block">
              Matrícula Normal Padrão (R$)
              <input
                className="input-field mt-1"
                type="number"
                min="0"
                step="0.01"
                required
                disabled={!canEdit}
                value={globalNormal}
                onChange={(e) => setGlobalNormal(e.target.value)}
              />
            </label>

            <label className="text-xs font-semibold block">
              Matrícula Promocional Padrão (R$)
              <input
                className="input-field mt-1"
                type="number"
                min="0"
                step="0.01"
                required
                disabled={!canEdit}
                value={globalPromo}
                onChange={(e) => setGlobalPromo(e.target.value)}
              />
            </label>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer pb-2">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={promoActive}
                  onChange={(e) => setPromoActive(e.target.checked)}
                  className="rounded border-border text-primary size-4"
                />
                <span>Condições promocionais ativas</span>
              </label>
            </div>
          </div>

          {canEdit && (
            <div className="flex justify-end pt-2 border-t border-border">
              <Button disabled={busy} type="submit" className="gap-2 font-bold">
                <Save size={16} /> Salvar Parâmetros Globais
              </Button>
            </div>
          )}
        </form>
      )}

      {/* ── FILTROS ──────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold">
          Área de Formação
          <select className="input-field mt-1" value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Todas as áreas</option>
            {data.areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          Buscar Curso
          <input
            className="input-field mt-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Digite o nome do curso"
          />
        </label>
        <label className="text-xs font-semibold">
          Origem da Matrícula
          <select className="input-field mt-1" value={origin} onChange={(e) => setOrigin(e.target.value)}>
            <option value="">Todas as origens</option>
            <option value="global">Padrão global</option>
            <option value="custom">Personalizada</option>
          </select>
        </label>
      </div>

      {/* ── AÇÕES EM LOTE ────────────────────────────────────────── */}
      {!courseOnly && canEdit && (
        <form
          className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border bg-muted/40 text-xs"
          onSubmit={(e) => {
            e.preventDefault();
            setPending({ ids: [...selected], value: Number(bulkNormalValue) });
          }}
        >
          <span className="font-bold">{selected.length} cursos selecionados</span>
          <input
            aria-label="Valor personalizado em lote"
            className="input-field max-w-40 h-8 text-xs"
            type="number"
            min="0"
            step="0.01"
            placeholder="Novo valor normal"
            value={bulkNormalValue}
            onChange={(e) => setBulkNormalValue(e.target.value)}
          />
          <Button type="submit" size="sm" variant="outline" disabled={!selected.length || busy}>
            Aplicar em Lote
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!selected.length || busy}
            onClick={() => setPending({ ids: [...selected], value: null })}
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw size={13} /> Retornar ao Padrão Global
          </Button>
        </form>
      )}

      {/* ── TABELA DE CURSOS ─────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="data-table">
          <thead>
            <tr>
              {!courseOnly && canEdit && (
                <th className="w-10">
                  <input
                    aria-label="Selecionar todos os cursos visíveis"
                    type="checkbox"
                    checked={courses.length > 0 && courses.every((c) => selected.includes(c.id))}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...new Set([...selected, ...courses.map((c) => c.id)])]
                          : selected.filter((id) => !courses.some((c) => c.id === id))
                      )
                    }
                  />
                </th>
              )}
              <th>Curso</th>
              <th>Área</th>
              <th>Matrícula Normal</th>
              <th>Matrícula Promocional</th>
              <th>Origem</th>
              <th>Material Didático</th>
              {canEdit && <th className="text-right">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => {
              const hasCustomNormal = c.enrollment_fee !== null;
              const hasCustomPromo = (c as any).promotional_enrollment_fee != null;
              const isCustom = hasCustomNormal || hasCustomPromo;
              const effNormal = Number(c.enrollment_fee ?? globalNormalFee);
              const effPromo = Number((c as any).promotional_enrollment_fee ?? globalPromoFee);

              return (
                <tr key={c.id}>
                  {!courseOnly && canEdit && (
                    <td>
                      <input
                        aria-label={`Selecionar ${c.name}`}
                        type="checkbox"
                        checked={selected.includes(c.id)}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, c.id]
                              : selected.filter((id) => id !== c.id)
                          )
                        }
                      />
                    </td>
                  )}
                  <td className="font-semibold text-foreground">{c.name}</td>
                  <td className="text-muted-foreground">{data.areas.find((a) => a.id === c.area_id)?.name}</td>
                  <td className="tabular-nums font-medium">{brl.format(effNormal)}</td>
                  <td className="tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
                    {brl.format(effPromo)}
                  </td>
                  <td>
                    <span
                      className={`status-pill ${
                        !isCustom
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/10 text-primary font-semibold"
                      }`}
                    >
                      {!isCustom ? "Padrão global" : "Personalizada"}
                    </span>
                  </td>
                  <td className="text-xs">
                    {Number(c.material_discount) > 0 ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                        Desc: {brl.format(Number(c.material_discount))}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Incluso</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        title={`Editar valores de ${c.name}`}
                        aria-label={`Editar valores de ${c.name}`}
                        onClick={() => {
                          setEditing(c);
                          setCustomNormal(c.enrollment_fee !== null);
                          setCustomPromo((c as any).promotional_enrollment_fee != null);
                          setNormalValue(String(c.enrollment_fee ?? globalNormalFee));
                          setPromoValue(String((c as any).promotional_enrollment_fee ?? globalPromoFee));
                          setMaterial(String(c.material_discount ?? 0));
                          setMaterialBilling((c as any).material_billing ?? "included");
                        }}
                      >
                        <Pencil size={16} />
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
            {!courses.length && (
              <tr>
                <td colSpan={8} className="text-center py-6 text-muted-foreground">
                  Nenhum curso encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── MODAL: EDITAR CURSO INDIVIDUAL ────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-xs p-4">
          <form
            role="dialog"
            aria-modal="true"
            aria-label="Editar matrícula e material"
            className="w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void commit({
                action: "course",
                courseId: editing.id,
                normalFee: customNormal ? Number(normalValue) : null,
                promotionalFee: customPromo ? Number(promoValue) : null,
                material: Number(material),
                materialBilling: materialBilling as any,
              });
            }}
          >
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <h3 className="font-bold text-base">{editing.name}</h3>
                <p className="text-xs text-muted-foreground">Configuração de matrícula e material didático</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Fechar edição"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                <X size={18} />
              </Button>
            </div>

            <CourseEnrollmentFields
              globalNormalFee={globalNormalFee}
              globalPromoFee={globalPromoFee}
              customNormal={customNormal}
              customPromo={customPromo}
              normalValue={normalValue}
              promoValue={promoValue}
              material={material}
              materialBilling={materialBilling}
              onCustomNormal={setCustomNormal}
              onCustomPromo={setCustomPromo}
              onNormalValue={setNormalValue}
              onPromoValue={setPromoValue}
              onMaterial={setMaterial}
              onMaterialBilling={setMaterialBilling}
            />

            <div className="mt-5 flex items-center justify-between pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
                disabled={busy}
                onClick={() => {
                  setCustomNormal(false);
                  setCustomPromo(false);
                }}
              >
                <RotateCcw size={14} /> Usar Padrão Global
              </Button>

              <div className="flex gap-2">
                <Button type="button" variant="ghost" disabled={busy} onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
                <Button disabled={busy} type="submit" className="font-bold">
                  Salvar Valores
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL: CONFIRMAR EM LOTE ──────────────────────────────── */}
      {pending && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-xs p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar alteração em lote"
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl"
          >
            <h3 className="font-bold text-base">Confirmar alteração em lote</h3>
            <p className="my-4 text-sm leading-relaxed text-muted-foreground">
              Deseja alterar {pending.ids.length} cursos para{" "}
              <b className="text-foreground">
                {pending.value === null
                  ? `o padrão global (${brl.format(globalNormalFee)})`
                  : `matrícula personalizada de ${brl.format(pending.value)}`}
              </b>
              ?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" disabled={busy} onClick={() => setPending(null)}>
                Cancelar
              </Button>
              <Button
                disabled={busy}
                className="font-bold"
                onClick={() =>
                  void commit({
                    action: "bulk",
                    courseIds: pending.ids,
                    normalFee: pending.value,
                  })
                }
              >
                Confirmar Alteração
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}