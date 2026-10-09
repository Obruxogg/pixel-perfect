import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  Clock3,
  MonitorUp,
  UserRound,
  CheckCircle2,
  Calendar,
  Eye,
  ArrowLeft,
  GraduationCap,
  Sparkles,
  Tag,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Settings2,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { calculateCommercialPrice } from "@/lib/commercial-calculation";
import { ProposalPriceBreakdown } from "@/components/proposal-price-breakdown";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { brl, dateTime, useRefreshWorkspace, useWorkspace } from "@/lib/use-workspace";
import {
  createProposal,
  closeSaleNow,
  deferProposalFollowup,
} from "@/lib/crm.functions";

export const Route = createFileRoute("/_authenticated/simulacao")({
  head: () => ({
    meta: [
      { title: "Nova Proposta — Instituto Mix" },
      { name: "description", content: "Monte e apresente condições comerciais em tempo real no Instituto Mix de Profissões." },
      { property: "og:title", content: "Nova Proposta — Instituto Mix" },
      { property: "og:description", content: "Monte e apresente condições comerciais em tempo real no Instituto Mix de Profissões." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SimulationPage,
});

function SimulationPage() {
  const { data } = useWorkspace();
  const create = useServerFn(createProposal);
  const closeSale = useServerFn(closeSaleNow);
  const deferFollowup = useServerFn(deferProposalFollowup);
  const refresh = useRefreshWorkspace();
  const navigate = useNavigate();

  // Step 1: Student
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [existingContactNotice, setExistingContactNotice] = useState<{
    id: string; name: string; whatsapp: string;
  } | null>(null);

  // Step 2: Course
  const [areaId, setAreaId] = useState("");
  const [courseId, setCourseId] = useState("");

  // Step 3: Commercial Condition (pre-configured by admin/manager)
  const [conditionId, setConditionId] = useState("");

  // Internal seller-only overrides (never shown to student)
  const [showInternalOverrides, setShowInternalOverrides] = useState(false);
  const [adicionalDiscount, setAdicionalDiscount] = useState<number>(0);
  const [notes, setNotes] = useState("");

  // UI Flow
  const [presentationMode, setPresentationMode] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showDeferModal, setShowDeferModal] = useState(false);
  const [deferDate, setDeferDate] = useState("");
  const [deferTime, setDeferTime] = useState("10:00");
  const [deferNotes, setDeferNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Duplicate detection via WhatsApp
  useEffect(() => {
    const clean = whatsapp.replace(/\D/g, "");
    if (clean.length >= 8) {
      const match = data?.students.find((s) => s.whatsapp.replace(/\D/g, "") === clean);
      if (match && match.id !== studentId) {
        setExistingContactNotice({ id: match.id, name: match.full_name, whatsapp: match.whatsapp });
      } else {
        setExistingContactNotice(null);
      }
    } else {
      setExistingContactNotice(null);
    }
  }, [whatsapp, data?.students, studentId]);

  function useExistingContact() {
    if (!existingContactNotice) return;
    const student = data?.students.find((s) => s.id === existingContactNotice.id);
    if (student) {
      setStudentId(student.id);
      setStudentName(student.full_name);
      setEmail(student.email ?? "");
      setExistingContactNotice(null);
    }
  }

  // Derived data
  const course = data?.courses.find((c) => c.id === courseId);

  // Filter conditions to the selected course
  const courseConditions = (data?.conditions ?? []).filter(
    (cond: any) => cond.status === "active" && cond.course_id === courseId && cond.allowed_roles.some((role: string) => data?.roles.some((r) => r.role === role))
  );

  // Selected condition resolves payment/installment/discount automatically
  const selectedCondition = (data?.conditions ?? []).find((c: any) => c.id === conditionId) as any;
  const paymentMethodId: string = selectedCondition?.payment_method_id ?? "";
  const installmentId: string = selectedCondition?.installment_option_id ?? "";
  const discountRuleId: string = selectedCondition?.discount_rule_id ?? "";
  const validityMinutes: number = selectedCondition?.validity_minutes ?? 60;

  const selectedMethod = data?.methods.find((m) => m.id === paymentMethodId);
  const selectedInstallment = data?.installments.find((i) => i.id === installmentId);
  const configuredPrice = data?.prices.find(
    (p) => p.course_id === courseId && p.payment_method_id === paymentMethodId && p.installment_option_id === installmentId
  );
  const discountRule = data?.discounts.find((d) => d.id === discountRuleId);

  // Real-time calculation engine
  const calc = useMemo(() => calculateCommercialPrice({
    coursePrice: Number(configuredPrice?.price ?? course?.base_price ?? 0),
    enrollmentFee: course ? Number(course.enrollment_fee ?? data?.enrollmentFee ?? 0) : 0,
    materialDiscount: Number(course?.material_discount ?? 0),
    special: discountRule ? { ...discountRule, value: Number(discountRule.value) } : null,
    additional: adicionalDiscount,
    installments: selectedInstallment?.installments ?? 1,
  }), [configuredPrice, course, data?.enrollmentFee, discountRule, adicionalDiscount, selectedInstallment]);

  const validUntilDate = useMemo(() => new Date(Date.now() + validityMinutes * 60000), [validityMinutes]);

  const canPresent = Boolean(studentName && whatsapp && courseId && conditionId);

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function saveProposalInternal() {
    const res = (await create({
      data: {
        studentId: studentId || undefined,
        studentName,
        whatsapp,
        email: email || undefined,
        courseId,
        paymentMethodId,
        installmentId,
        discountId: discountRuleId || undefined,
        conditionId,
        modularDiscounts:
          adicionalDiscount > 0
            ? [{ name: "Desconto Adicional Autorizado", kind: "fixed", value: adicionalDiscount, amount: adicionalDiscount }]
            : [],
        notes,
      },
    })) as unknown as { proposal: { id: string }; student: { id: string } };
    return res;
  }

  async function handleConfirmCloseSale() {
    setBusy(true);
    setError("");
    try {
      const res = await saveProposalInternal();
      if (!res.proposal) throw new Error("Erro ao gerar proposta.");
      await closeSale({ data: { proposalId: res.proposal.id, notes: "Venda confirmada no atendimento em tempo real" } });
      await refresh();
      setSuccessMessage("Venda confirmada com sucesso! Aluno matriculado no CRM.");
      setShowCloseModal(false);
      setPresentationMode(false);
      setTimeout(() => navigate({ to: "/crm" }), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao confirmar venda.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveDeferFollowup() {
    if (!deferDate) { setError("Informe a data de retorno."); return; }
    setBusy(true);
    setError("");
    try {
      const res = await saveProposalInternal();
      if (!res.proposal) throw new Error("Erro ao gerar proposta.");
      await deferFollowup({ data: { proposalId: res.proposal.id, dueAt: `${deferDate}T${deferTime}:00`, notes: deferNotes || "Aluno solicitou retorno para decidir" } });
      await refresh();
      setSuccessMessage("Retorno agendado com sucesso! Contato marcado como AGUARDANDO RETORNO.");
      setShowDeferModal(false);
      setPresentationMode(false);
      setTimeout(() => navigate({ to: "/crm" }), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao agendar retorno.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateProposalOnly() {
    setBusy(true);
    setError("");
    try {
      await saveProposalInternal();
      await refresh();
      navigate({ to: "/propostas" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a proposta.");
    } finally {
      setBusy(false);
    }
  }

  // ============================================================
  // MODO APRESENTAÇÃO AO ALUNO — nenhum campo interno visível
  // ============================================================
  if (presentationMode) {
    return (
      <div className="presentation-overlay bg-background text-foreground p-6 md:p-12">
        {/* Header */}
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <GraduationCap size={24} />
            </span>
            <div>
              <strong className="block text-lg font-extrabold text-foreground tracking-tight">Instituto Mix</strong>
              <span className="text-xs text-primary uppercase tracking-widest font-bold block">
                Proposta Comercial Oficial
              </span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPresentationMode(false)} className="gap-2">
            <ArrowLeft size={16} /> Voltar ao Atendimento
          </Button>
        </div>

        {/* Body */}
        <div className="max-w-4xl mx-auto w-full py-8 flex-1 flex flex-col justify-center">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary uppercase tracking-wider">
              <Sparkles size={14} /> Condição Especial de Matrícula
            </span>
            <h1 className="mt-3 text-3xl md:text-5xl font-extrabold tracking-tight">{course?.name}</h1>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-muted-foreground">
              {course?.workload_hours && <span>{course.workload_hours} Horas de Formação</span>}
              {course?.modality && <><span>•</span><span>Modalidade: {course.modality}</span></>}
              <span>•</span>
              <span>Aluno: <b>{studentName}</b></span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 md:p-8">
            <ProposalPriceBreakdown coursePrice={calc.coursePrice} enrollmentFee={calc.enrollmentFee} materialDiscount={calc.material} subtotal={calc.subtotal} original={calc.original} final={calc.final} discounts={calc.breakdown.filter(item => item.name !== "Desconto de Material Didático")} />
            <p className="mt-4 text-center text-sm font-semibold">{calc.count > 1 ? `${calc.count}x de ${brl.format(calc.portion)}` : "À vista"} {selectedMethod?.name && `no ${selectedMethod.name}`}</p>
            <p className="mt-2 text-center text-xs text-muted-foreground">Condição válida até {dateTime.format(validUntilDate)}</p>

            {/* Triggers */}
            {((data?.triggers ?? []) as Array<{ id: string; is_active: boolean; template_text: string }>).filter(t => t.is_active).length > 0 && (
              <div className="mt-8 pt-6 border-t border-border flex flex-wrap items-center justify-center gap-3">
                {((data?.triggers ?? []) as Array<{ id: string; is_active: boolean; template_text: string }>)
                  .filter((t) => t.is_active)
                  .slice(0, 3)
                  .map((trig) => (
                    <span key={trig.id} className="trigger-pill">
                      <Tag size={13} />
                      {trig.template_text
                        .replace("{{economy}}", brl.format(calc.economy))
                        .replace("{{discount_pct}}", String(calc.discountPct))
                        .replace("{{valid_until}}", dateTime.format(validUntilDate))}
                    </span>
                  ))}
              </div>
            )}
          </div>

          {/* Action Buttons visible to student */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="w-full sm:w-auto h-14 px-8 text-base font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg gap-2"
              onClick={() => setShowCloseModal(true)}
            >
              <CheckCircle2 size={20} /> FECHAR AGORA
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto h-14 px-8 text-base font-bold gap-2"
              onClick={() => setShowDeferModal(true)}
            >
              <Calendar size={18} /> DEIXAR PARA DEPOIS
            </Button>

            <Button
              size="lg"
              variant="ghost"
              className="w-full sm:w-auto text-muted-foreground hover:text-foreground"
              onClick={() => setPresentationMode(false)}
            >
              Voltar
            </Button>
          </div>
        </div>

        {/* Modals (still work in presentation mode) */}
        {showCloseModal && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
            <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={22} />
                </span>
                <div>
                  <h2 className="text-xl font-bold">Confirmar Matrícula</h2>
                  <p className="text-xs text-muted-foreground">Revise o resumo antes de registrar a venda no sistema.</p>
                </div>
              </div>

              <div className="mt-5 space-y-2.5 rounded-lg border border-border bg-muted/40 p-4 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Aluno:</span><span className="font-bold">{studentName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Curso:</span><span className="font-semibold">{course?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Valor Original:</span><span className="line-through">{brl.format(calc.original)}</span></div>
                <div className="flex justify-between text-emerald-600 font-semibold"><span>Economia Total:</span><span>− {brl.format(calc.economy)}</span></div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-primary"><span>Valor Final:</span><span>{brl.format(calc.final)}</span></div>
              </div>

              {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

              <div className="mt-6 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowCloseModal(false)} disabled={busy}>Cancelar</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={handleConfirmCloseSale} disabled={busy}>
                  {busy ? "Confirmando..." : "CONFIRMAR VENDA"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {showDeferModal && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
            <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-amber-100 text-amber-700">
                  <Calendar size={22} />
                </span>
                <div>
                  <h2 className="text-xl font-bold">Agendar Retorno</h2>
                  <p className="text-xs text-muted-foreground">
                    O contato e a proposta permanecerão salvos com status <b>AGUARDANDO RETORNO</b>.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm font-medium">
                    Data do Retorno
                    <input type="date" className="input-field mt-1.5" value={deferDate} onChange={(e) => setDeferDate(e.target.value)} required />
                  </label>
                  <label className="text-sm font-medium">
                    Horário
                    <input type="time" className="input-field mt-1.5" value={deferTime} onChange={(e) => setDeferTime(e.target.value)} required />
                  </label>
                </div>
                <label className="block text-sm font-medium">
                  Motivo / Observação do Aluno
                  <textarea className="input-field mt-1.5 min-h-[5rem]" placeholder="Ex: Aluno quer conversar com a família antes de decidir..." value={deferNotes} onChange={(e) => setDeferNotes(e.target.value)} />
                </label>
              </div>

              {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

              <div className="mt-6 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowDeferModal(false)} disabled={busy}>Cancelar</Button>
                <Button className="bg-amber-600 hover:bg-amber-700 text-white font-bold" onClick={handleSaveDeferFollowup} disabled={busy}>
                  {busy ? "Salvando..." : "SALVAR E AGENDAR RETORNO"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // EDITOR PRINCIPAL DA PROPOSTA (somente o vendedor vê)
  // ============================================================
  return (
    <AppShell
      title="Nova Proposta"
      subtitle="Selecione o aluno, o curso e a condição comercial — os valores são preenchidos automaticamente."
    >
      {/* Duplicate Contact Alert */}
      {existingContactNotice && (
        <div className="mb-6 rounded-lg border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-full bg-amber-200 text-amber-800">
              <UserRound size={18} />
            </span>
            <div>
              <strong className="text-sm font-bold text-amber-900 dark:text-amber-200">CONTATO ENCONTRADO</strong>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                O WhatsApp digitado já pertence a <b>{existingContactNotice.name}</b>.
              </p>
            </div>
          </div>
          <Button size="sm" className="font-bold bg-amber-600 hover:bg-amber-700 text-white" onClick={useExistingContact}>
            USAR CONTATO EXISTENTE
          </Button>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 p-4 text-emerald-800 dark:text-emerald-200 font-semibold text-sm">
          {successMessage}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.85fr]">
        <div className="space-y-6">

          {/* ── Passo 1: Dados do Aluno ───────────────────────── */}
          <section className="data-panel p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="metric-icon"><UserRound size={18} /></span>
              <div>
                <h2 className="text-base font-bold">
                  <span className="text-primary mr-1.5">1.</span> Dados do Aluno
                </h2>
                <p className="text-xs text-muted-foreground">Informe ou selecione o contato</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-medium">
                Nome do Aluno *
                <input
                  className="input-field mt-1.5"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Nome completo"
                  required
                />
              </label>
              <label className="text-sm font-medium">
                WhatsApp *
                <input
                  className="input-field mt-1.5"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(00) 00000-0000"
                  required
                />
              </label>
              <label className="text-sm font-medium">
                E-mail (opcional)
                <input
                  type="email"
                  className="input-field mt-1.5"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aluno@email.com"
                />
              </label>
            </div>
          </section>

          {/* ── Passo 2: Curso ────────────────────────────────── */}
          <section className="data-panel p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="metric-icon"><MonitorUp size={18} /></span>
              <div>
                <h2 className="text-base font-bold">
                  <span className="text-primary mr-1.5">2.</span> Qual curso é do interesse do aluno?
                </h2>
                <p className="text-xs text-muted-foreground">Selecione a área e a formação desejada</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Área de Formação *
                <select
                  className="input-field mt-1.5"
                  value={areaId}
                  onChange={(e) => {
                    setAreaId(e.target.value);
                    setCourseId("");
                    setConditionId("");
                  }}
                >
                  <option value="">Selecione a área</option>
                  {(data?.areas ?? []).map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Curso *
                <select
                  className="input-field mt-1.5"
                  value={courseId}
                  onChange={(e) => { setCourseId(e.target.value); setConditionId(""); }}
                  disabled={!areaId}
                >
                  <option value="">Selecione o curso</option>
                  {(data?.courses ?? [])
                    .filter((c) => c.area_id === areaId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </label>
            </div>

            {course && (
              <div className="mt-4 rounded-lg bg-muted/60 border border-border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-base font-bold text-foreground">{course.name}</strong>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-primary/10 text-primary">{course.modality}</span>
                </div>
                {course.description && <p className="mt-1 text-xs text-muted-foreground">{course.description}</p>}
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground border-t border-border pt-2.5">
                  <span>Carga Horária: <b>{course.workload_hours}h</b></span>
                  <span>Valor-base: <b>{brl.format(Number(course.base_price))}</b></span>
                </div>
              </div>
            )}
          </section>

          {/* ── Passo 3: Condição Comercial (pré-cadastrada) ─── */}
          <section className="data-panel p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="metric-icon"><DollarSign size={18} /></span>
              <div>
                <h2 className="text-base font-bold">
                  <span className="text-primary mr-1.5">3.</span> Condição Comercial
                </h2>
                <p className="text-xs text-muted-foreground">
                  Selecione a condição — pagamento, parcelamento e desconto são preenchidos automaticamente
                </p>
              </div>
            </div>

            {courseConditions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {courseId
                  ? "Nenhuma condição comercial cadastrada para este curso. Solicite ao administrador."
                  : "Selecione um curso para ver as condições disponíveis."}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {courseConditions.map((cond: any) => {
                  const method = data?.methods.find((m) => m.id === cond.payment_method_id);
                  const inst = data?.installments.find((i) => i.id === cond.installment_option_id);
                  const disc = data?.discounts.find((d) => d.id === cond.discount_rule_id);
                  const isSelected = conditionId === cond.id;
                  return (
                    <button
                      key={cond.id}
                      type="button"
                      onClick={() => setConditionId(cond.id)}
                      className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <strong className="text-sm font-bold leading-snug">{cond.name}</strong>
                        {isSelected && (
                          <span className="shrink-0 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                            <CheckCircle2 size={12} />
                          </span>
                        )}
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {method && <div>💳 {method.name}{inst ? ` · ${inst.label} (${inst.installments}x)` : ""}</div>}
                        {disc && (
                          <div className="text-emerald-600 font-semibold">
                            🎯 {disc.name} — {disc.kind === "percentage" ? `${disc.value}%` : brl.format(Number(disc.value))} de desconto
                          </div>
                        )}
                        <div className="text-amber-600">⏱ Validade: {cond.validity_minutes} minutos</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Overrides internos do vendedor (nunca visíveis ao aluno) ── */}
            {conditionId && (
              <div className="mt-4 border-t border-border pt-4">
                <button
                  type="button"
                  className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowInternalOverrides((v) => !v)}
                >
                  <Settings2 size={14} />
                  Ajustes Internos (somente você vê)
                  {showInternalOverrides ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showInternalOverrides && (
                  <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-4 space-y-4">
                    <p className="text-[11px] text-muted-foreground italic">
                      Estes campos são exclusivos do vendedor e nunca aparecem na tela do aluno.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-xs font-semibold">
                        Desconto Adicional Autorizado (R$)
                        <input
                          disabled={data?.isSeller}
                          type="number"
                          min="0"
                          step="50"
                          className="input-field mt-1 text-sm font-bold text-emerald-700"
                          placeholder="0,00"
                          value={adicionalDiscount || ""}
                          onChange={(e) => setAdicionalDiscount(Number(e.target.value))}
                        />
                      </label>
                      <label className="text-sm font-medium">
                        Observações internas
                        <input
                          className="input-field mt-1"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Anotações para sua carteira"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* ── Painel Direito: Resumo em Tempo Real ─────────── */}
        <aside className="result-panel">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <span className="text-xs font-extrabold uppercase tracking-widest text-primary">Resumo em Tempo Real</span>
            <span className="text-xs font-semibold text-muted-foreground">
              {course?.name ? course.name.slice(0, 20) + (course.name.length > 20 ? "…" : "") : "Selecione curso"}
            </span>
          </div>

          <div className="mt-5 space-y-4">
            <ProposalPriceBreakdown coursePrice={calc.coursePrice} enrollmentFee={calc.enrollmentFee} materialDiscount={calc.material} subtotal={calc.subtotal} original={calc.original} final={calc.final} discounts={calc.breakdown.filter(item => item.name !== "Desconto de Material Didático")} />
            <p className="text-center text-xs font-semibold">{calc.count > 1 ? `${calc.count}x de ${brl.format(calc.portion)}` : "À vista"}</p>

            {conditionId && (
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-background/80 rounded-md py-1.5 px-3 border border-border">
                <Clock3 size={13} className="text-primary shrink-0" />
                <span>Validade: {dateTime.format(validUntilDate)}</span>
              </div>
            )}
          </div>

          {/* CTAs */}
          <div className="mt-6 space-y-2.5">
            <Button
              className="w-full h-12 text-sm font-bold shadow-md gap-2"
              disabled={!canPresent || busy}
              onClick={() => setPresentationMode(true)}
            >
              <Eye size={17} /> MOSTRAR PROPOSTA AO ALUNO
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-300"
                disabled={!canPresent || busy}
                onClick={() => setShowCloseModal(true)}
              >
                <CheckCircle2 size={16} /> Fechar Agora
              </Button>
              <Button
                variant="outline"
                className="font-bold text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-300"
                disabled={!canPresent || busy}
                onClick={() => setShowDeferModal(true)}
              >
                <Calendar size={16} /> Deixar p/ Depois
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              disabled={!canPresent || busy}
              onClick={handleCreateProposalOnly}
            >
              Apenas salvar proposta na lista
            </Button>
          </div>

          {error && <p className="mt-4 text-xs font-semibold text-destructive text-center">{error}</p>}

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            A validade da oferta inicia ao apresentar ao aluno.
          </p>
        </aside>
      </div>

      {/* Modal: Fechar Agora */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={22} />
              </span>
              <div>
                <h2 className="text-xl font-bold">Confirmar Matrícula</h2>
                <p className="text-xs text-muted-foreground">Registrar a venda imediatamente e atualizar o CRM.</p>
              </div>
            </div>

            <div className="mt-5 space-y-2 rounded-lg border border-border bg-muted/40 p-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Aluno:</span><span className="font-bold">{studentName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Curso:</span><span className="font-semibold">{course?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Valor Original:</span><span className="line-through">{brl.format(calc.original)}</span></div>
              <div className="flex justify-between text-emerald-600 font-semibold"><span>Economia Total:</span><span>− {brl.format(calc.economy)}</span></div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-primary"><span>Valor Final:</span><span>{brl.format(calc.final)}</span></div>
            </div>

            {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowCloseModal(false)} disabled={busy}>Cancelar</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={handleConfirmCloseSale} disabled={busy}>
                {busy ? "Confirmando..." : "CONFIRMAR VENDA"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agendar Retorno */}
      {showDeferModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-amber-100 text-amber-700">
                <Calendar size={22} />
              </span>
              <div>
                <h2 className="text-xl font-bold">Agendar Retorno</h2>
                <p className="text-xs text-muted-foreground">
                  O contato e proposta permanecerão na sua carteira com status <b>AGUARDANDO RETORNO</b>.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium">
                  Data do Retorno
                  <input type="date" className="input-field mt-1.5" value={deferDate} onChange={(e) => setDeferDate(e.target.value)} required />
                </label>
                <label className="text-sm font-medium">
                  Horário
                  <input type="time" className="input-field mt-1.5" value={deferTime} onChange={(e) => setDeferTime(e.target.value)} required />
                </label>
              </div>
              <label className="block text-sm font-medium">
                Motivo / Observação do Aluno
                <textarea
                  className="input-field mt-1.5 min-h-[5rem]"
                  placeholder="Ex: Aluno quer conversar com a família antes de decidir..."
                  value={deferNotes}
                  onChange={(e) => setDeferNotes(e.target.value)}
                />
              </label>
            </div>

            {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowDeferModal(false)} disabled={busy}>Cancelar</Button>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white font-bold" onClick={handleSaveDeferFollowup} disabled={busy}>
                {busy ? "Salvando..." : "SALVAR E AGENDAR RETORNO"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
