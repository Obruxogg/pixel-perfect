import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveEnrollment } from "@/lib/enrollment.functions";
import { brl, useRefreshWorkspace, type WorkspaceData } from "@/lib/use-workspace";

export function CourseEnrollmentFields({ globalFee, custom, value, material, onCustom, onValue, onMaterial }: {
  globalFee: number; custom: boolean; value: string; material: string;
  onCustom: (value: boolean) => void; onValue: (value: string) => void; onMaterial: (value: string) => void;
}) {
  return <fieldset className="mt-4 border-t border-border pt-4">
    <legend className="text-sm font-bold">Matrícula e material didático</legend>
    <div className="grid gap-4 sm:grid-cols-3">
      <label className="text-sm font-medium">Matrícula
        <select className="input-field mt-1" value={custom ? "custom" : "global"} onChange={e => onCustom(e.target.value === "custom")}>
          <option value="global">Padrão global — {brl.format(globalFee)}</option><option value="custom">Valor personalizado</option>
        </select>
      </label>
      <label className="text-sm font-medium">Matrícula personalizada (R$)
        <input className="input-field mt-1" type="number" min="0" step="0.01" required={custom} disabled={!custom} value={custom ? value : globalFee} onChange={e => onValue(e.target.value)} />
      </label>
      <label className="text-sm font-medium">Desconto de material didático (R$)
        <input className="input-field mt-1" type="number" min="0" step="0.01" required value={material} onChange={e => onMaterial(e.target.value)} />
      </label>
    </div>
  </fieldset>;
}

export function EnrollmentSettings({ data, courseOnly = false }: { data: WorkspaceData; courseOnly?: boolean }) {
  const save = useServerFn(saveEnrollment);
  const refresh = useRefreshWorkspace();
  const [global, setGlobal] = useState(String(data.enrollmentFee));
  const [area, setArea] = useState("");
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkValue, setBulkValue] = useState("");
  const [pending, setPending] = useState<{ ids: string[]; value: number | null } | null>(null);
  const [editing, setEditing] = useState<WorkspaceData["courses"][number] | null>(null);
  const [custom, setCustom] = useState(false);
  const [value, setValue] = useState("");
  const [material, setMaterial] = useState("0");
  const [busy, setBusy] = useState(false);
  const canEdit = data.isAdmin || data.isManager;
  useEffect(() => setGlobal(String(data.enrollmentFee)), [data.enrollmentFee]);
  const courses = data.courses.filter(c => (!area || c.area_id === area) && c.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (!origin || (origin === "global" ? c.enrollment_fee === null : c.enrollment_fee !== null)));
  async function commit(input:
    | { action: "global"; value: number }
    | { action: "bulk"; courseIds: string[]; value: number | null }
    | { action: "course"; courseId: string; value: number | null; material: number }
  ) {
    setBusy(true);
    try { await save({ data: input }); await refresh(); toast.success("Valores salvos com sucesso."); setPending(null); setEditing(null); setSelected([]); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setBusy(false); }
  }
  return <section className="space-y-5">
    <h2 className="text-lg font-bold">{courseOnly ? "Valores por curso" : "Comercial · Matrículas"}</h2>
    {!courseOnly && <form className="flex flex-wrap items-end gap-3 border-b border-border pb-5" onSubmit={e => { e.preventDefault(); void commit({ action: "global", value: Number(global) }); }}>
      <label className="text-sm font-medium">Matrícula padrão global (R$)<input className="input-field mt-1" type="number" min="0" step="0.01" required disabled={!canEdit} value={global} onChange={e => setGlobal(e.target.value)} /></label>
      {canEdit && <Button disabled={busy} type="submit" className="gap-2"><Save size={16} /> Salvar padrão</Button>}
    </form>}
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="text-sm">Área<select className="input-field mt-1" value={area} onChange={e => setArea(e.target.value)}><option value="">Todas as áreas</option>{data.areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <label className="text-sm">Curso<input className="input-field mt-1" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar curso" /></label>
      <label className="text-sm">Origem da matrícula<select className="input-field mt-1" value={origin} onChange={e => setOrigin(e.target.value)}><option value="">Todas</option><option value="global">Padrão global</option><option value="custom">Personalizada</option></select></label>
    </div>
    {!courseOnly && canEdit && <form className="flex flex-wrap items-center gap-3" onSubmit={e => { e.preventDefault(); setPending({ ids: [...selected], value: Number(bulkValue) }); }}>
      <span className="text-sm font-medium">{selected.length} selecionados</span>
      <input aria-label="Valor personalizado em lote" className="input-field max-w-48" type="number" min="0" step="0.01" required value={bulkValue} onChange={e => setBulkValue(e.target.value)} />
      <Button type="submit" variant="outline" disabled={!selected.length || busy}>Aplicar personalizado</Button>
      <Button type="button" variant="outline" disabled={!selected.length || busy} onClick={() => setPending({ ids: [...selected], value: null })}>Retornar ao padrão global</Button>
    </form>}
    <div className="overflow-x-auto"><table className="data-table"><thead><tr>
      {!courseOnly && canEdit && <th><input aria-label="Selecionar cursos visíveis" type="checkbox" checked={courses.length > 0 && courses.every(c => selected.includes(c.id))} onChange={e => setSelected(e.target.checked ? [...new Set([...selected, ...courses.map(c => c.id)])] : selected.filter(id => !courses.some(c => c.id === id)))} /></th>}
      <th>Curso</th><th>Área</th><th>Matrícula</th><th>Origem</th><th>Desconto de material</th>{canEdit && <th>Ações</th>}
    </tr></thead><tbody>{courses.map(c => <tr key={c.id}>
      {!courseOnly && canEdit && <td><input aria-label={`Selecionar ${c.name}`} type="checkbox" checked={selected.includes(c.id)} onChange={e => setSelected(e.target.checked ? [...selected, c.id] : selected.filter(id => id !== c.id))} /></td>}
      <td className="font-semibold">{c.name}</td><td>{data.areas.find(a => a.id === c.area_id)?.name}</td><td>{brl.format(Number(c.enrollment_fee ?? data.enrollmentFee))}</td>
      <td><span className={c.enrollment_fee === null ? "status-pill bg-muted text-muted-foreground" : "status-pill bg-primary/10 text-primary"}>{c.enrollment_fee === null ? "Padrão global" : "Personalizada"}</span></td><td>{brl.format(Number(c.material_discount))}</td>
      {canEdit && <td><Button variant="ghost" size="icon" title={`Editar valores de ${c.name}`} aria-label={`Editar valores de ${c.name}`} onClick={() => { setEditing(c); setCustom(c.enrollment_fee !== null); setValue(String(c.enrollment_fee ?? data.enrollmentFee)); setMaterial(String(c.material_discount)); }}><Pencil size={16} /></Button></td>}
    </tr>)}{!courses.length && <tr><td colSpan={7} className="text-center text-muted-foreground">Nenhum curso encontrado.</td></tr>}</tbody></table></div>
    {editing && <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4"><form role="dialog" aria-modal="true" aria-label="Editar matrícula e material" className="w-full max-w-2xl rounded-lg border border-border bg-card p-6 shadow-lg" onSubmit={e => { e.preventDefault(); void commit({ action: "course", courseId: editing.id, value: custom ? Number(value) : null, material: Number(material) }); }}>
      <div className="flex items-center justify-between gap-3"><h3 className="font-bold">{editing.name}</h3><Button type="button" variant="ghost" size="icon" aria-label="Fechar edição" disabled={busy} onClick={() => setEditing(null)}><X size={18} /></Button></div>
      <CourseEnrollmentFields globalFee={data.enrollmentFee} custom={custom} value={value} material={material} onCustom={setCustom} onValue={setValue} onMaterial={setMaterial} />
      <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="ghost" disabled={busy} onClick={() => setEditing(null)}>Cancelar</Button><Button disabled={busy} type="submit">Salvar valores</Button></div>
    </form></div>}
    {pending && <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4"><div role="dialog" aria-modal="true" aria-label="Confirmar alteração em lote" className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
      <h3 className="font-bold">Confirmar alteração em lote</h3><p className="my-4 text-sm">Alterar {pending.ids.length} cursos para {pending.value === null ? `o padrão global (${brl.format(data.enrollmentFee)})` : `matrícula personalizada de ${brl.format(pending.value)}`}?</p>
      <div className="flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={() => setPending(null)}>Cancelar</Button><Button disabled={busy} onClick={() => void commit({ action: "bulk", courseIds: pending.ids, value: pending.value })}>Confirmar alteração</Button></div>
    </div></div>}
  </section>;
}