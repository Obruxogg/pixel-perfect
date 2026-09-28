import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  ArrowRight,
  Clock3,
  MonitorUp,
  UserRound,
  CheckCircle2,
  Calendar,
  Eye,
  ArrowLeft,
  GraduationCap,
  Sparkles,
  ShieldAlert,
  Percent,
  Tag,
  DollarSign,
  Send,
  HelpCircle,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { brl, dateTime, useRefreshWorkspace, useWorkspace } from "@/lib/use-workspace";
import {
  createProposal,
  closeSaleNow,
  deferProposalFollowup,
  searchStudentByWhatsapp,
} from "@/lib/crm.functions";

export const Route = createFileRoute("/_authenticated/simulacao")({
  head: () => ({
    meta: [
      { title: "Nova Proposta — Nexo Comercial" },
      { name: "description", content: "Monte e apresente condições comerciais em tempo real." },
      { property: "og:title", content: "Nova Proposta — Nexo Comercial" },
      { property: "og:description", content: "Monte e apresente condições comerciais em tempo real." },
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
  const searchWhatsapp = useServerFn(searchStudentByWhatsapp);
  const refresh = useRefreshWorkspace();
  const navigate = useNavigate();

  // Form State
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");

  const [existingContactNotice, setExistingContactNotice] = useState<{ id: string; name: string; whatsapp: string } | null>(null);

  const [areaId, setAreaId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [installmentId, setInstallmentId] = useState("");
  const [discountId, setDiscountId] = useState("");

  // Modular Discounts (Requirement 11 & 12)
  const [matriculaDiscount, setMatriculaDiscount] = useState<number>(0);
  const [entradaDiscount, setEntradaDiscount] = useState<number>(0);
  const [adicionalDiscount, setAdicionalDiscount] = useState<number>(0);

  const [notes, setNotes] = useState("");
  const [validityMinutes, setValidityMinutes] = useState(60);

  // UI Flow State
  const [presentationMode, setPresentationMode] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showDeferModal, setShowDeferModal] = useState(false);
  const [deferDate, setDeferDate] = useState("");
  const [deferTime, setDeferTime] = useState("10:00");
  const [deferNotes, setDeferNotes] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Real-time WhatsApp Duplicate Detection (Requirement 8)
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

  // Course, Price & Condition calculations
  const course = data?.courses.find((c) => c.id === courseId);
  const installmentsList = data?.installments.filter((i) => i.payment_method_id === paymentMethodId) ?? [];
  const selectedInstallment = installmentsList.find((i) => i.id === installmentId);
  const selectedMethod = data?.methods.find((m) => m.id === paymentMethodId);
  const configuredPrice = data?.prices.find(
    (p) => p.course_id === courseId && p.payment_method_id === paymentMethodId && p.installment_option_id === installmentId
  );
  const discountRule = data?.discounts.find((d) => d.id === discountId);

  // Calculation Engine in Real-Time (Requirement 13)
  const calc = useMemo(() => {
    const original = Number(configuredPrice?.price ?? course?.base_price ?? 0);

    const breakdown: Array<{ name: string; kind: "percentage" | "fixed"; value: number; amount: number }> = [];

    // 1. Discount rule
    if (discountRule) {
      const amt =
        discountRule.kind === "percentage"
          ? (original * Number(discountRule.value)) / 100
          : Number(discountRule.value);
      const capped = discountRule.max_discount != null ? Math.min(amt, Number(discountRule.max_discount)) : amt;
      breakdown.push({
        name: discountRule.name,
        kind: discountRule.kind,
        value: Number(discountRule.value),
        amount: Math.round(capped * 100) / 100,
      });
    }

    // 2. Desconto Matrícula
    if (matriculaDiscount > 0) {
      breakdown.push({
        name: "Desconto Matrícula",
        kind: "fixed",
        value: matriculaDiscount,
        amount: matriculaDiscount,
      });
    }

    // 3. Desconto Entrada
    if (entradaDiscount > 0) {
      breakdown.push({
        name: "Desconto Entrada",
        kind: "fixed",
        value: entradaDiscount,
        amount: entradaDiscount,
      });
    }

    // 4. Desconto Adicional
    if (adicionalDiscount > 0) {
      breakdown.push({
        name: "Condição Adicional",
        kind: "fixed",
        value: adicionalDiscount,
        amount: adicionalDiscount,
      });
    }

    const totalDiscount = breakdown.reduce((acc, curr) => acc + curr.amount, 0);
    let final = Math.max(0, original - totalDiscount);

    if (discountRule?.min_final_price != null) {
      final = Math.max(final, Number(discountRule.min_final_price));
    }

    final = Math.round(final * 100) / 100;
    const finalEconomy = Math.round((original - final) * 100) / 100;
    const count = selectedInstallment?.installments ?? 1;
    const portion = Math.floor((final / count) * 100) / 100;
    const discountPct = original > 0 ? Math.round((finalEconomy / original) * 100) : 0;

    return {
      original,
      breakdown,
      economy: finalEconomy,
      final,
      count,
      portion,
      discountPct,
    };
  }, [configuredPrice, course, discountRule, matriculaDiscount, entradaDiscount, adicionalDiscount, selectedInstallment]);

  // Compute validity date
  const validUntilDate = useMemo(() => {
    return new Date(Date.now() + validityMinutes * 60000);
  }, [validityMinutes]);

  // Validation
  const canPresent = Boolean(studentName && whatsapp && courseId && paymentMethodId && installmentId);

  // Save proposal helper
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
        discountId: discountId || undefined,
        matriculaDiscount,
        entradaDiscount,
        modularDiscounts: adicionalDiscount > 0 ? [{ name: "Condição Adicional", kind: "fixed", value: adicionalDiscount, amount: adicionalDiscount }] : [],
        notes,
      },
    })) as unknown as { proposal: { id: string }; student: { id: string } };
    return res;
  }

  // Handle "FECHAR AGORA" (Requirement 16)
  async function handleConfirmCloseSale() {
    setBusy(true);
    setError("");
    try {
      // 1. Create/save the proposal snapshot
      const res = await saveProposalInternal();
      if (!res.proposal) throw new Error("Erro ao gerar proposta.");

      // 2. Close sale now
      await closeSale({
        data: {
          proposalId: res.proposal.id,
          notes: "Venda confirmada no atendimento em tempo real",
        },
      });

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

  // Handle "DEIXAR PARA DEPOIS" (Requirement 17 & 18)
  async function handleSaveDeferFollowup() {
    if (!deferDate) {
      setError("Informe a data de retorno.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      // 1. Create/save the proposal snapshot
      const res = await saveProposalInternal();
      if (!res.proposal) throw new Error("Erro ao gerar proposta.");

      const dueAtString = `${deferDate}T${deferTime}:00`;

      // 2. Defer followup
      await deferFollowup({
        data: {
          proposalId: res.proposal.id,
          dueAt: dueAtString,
          notes: deferNotes || "Aluno solicitou retorno para decidir",
        },
      });

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

  // Regular "Salvar Proposta"
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

  // ==========================================
  // TELA "MOSTRAR AO ALUNO" (Requirement 15)
  // Fullscreen Presentation View
  // ==========================================
  if (presentationMode) {
    return (
      <div className="presentation-overlay bg-background text-foreground p-6 md:p-12">
        {/* Presentation Header */}
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <GraduationCap size={24} />
            </span>
            <div>
              <strong className="block text-lg font-bold">Nexo Comercial</strong>
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                Proposta Comercial Oficial
              </span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPresentationMode(false)} className="gap-2">
            <ArrowLeft size={16} /> Voltar ao Atendimento
          </Button>
        </div>

        {/* Presentation Body */}
        <div className="max-w-4xl mx-auto w-full py-8 flex-1 flex flex-col justify-center">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary uppercase tracking-wider">
              <Sparkles size={14} /> Condição Especial de Matrícula
            </span>
            <h1 className="mt-3 text-3xl md:text-5xl font-extrabold tracking-tight">
              {course?.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-muted-foreground">
              <span>{course?.workload_hours} Horas de Formação</span>
              <span>•</span>
              <span>Modalidade: {course?.modality}</span>
              <span>•</span>
              <span>Aluno: <b>{studentName}</b></span>
            </div>
          </div>

          {/* Pricing Highlight Card */}
          <div className="rounded-2xl border-2 border-primary/40 bg-card p-6 md:p-10 shadow-xl">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Valor Original da Formação
                </span>
                <p className="price-strike mt-1">{brl.format(calc.original)}</p>

                {/* Modular Discounts breakdown (Requirement 11) */}
                {calc.breakdown.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-border pt-4">
                    <span className="text-xs font-bold uppercase text-primary tracking-wide block">
                      Condição Especial Aplicada:
                    </span>
                    {calc.breakdown.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.name}</span>
                        <span className="font-bold text-emerald-600">
                          − {brl.format(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-border">
                  <div className="economy-callout w-full justify-between">
                    <span className="text-xs uppercase font-bold tracking-wide">Economia Total:</span>
                    <span className="text-base font-extrabold">{brl.format(calc.economy)}</span>
                  </div>
                </div>
              </div>

              {/* Final Price Block */}
              <div className="bg-primary/5 rounded-xl border border-primary/20 p-6 text-center md:text-right flex flex-col justify-center">
                <span className="text-xs font-bold uppercase tracking-widest text-primary block">
                  Por Apenas
                </span>
                <div className="price-highlight my-2">{brl.format(calc.final)}</div>
                <p className="text-base font-semibold text-foreground">
                  em <b>{calc.count}x de {brl.format(calc.portion)}</b> no {selectedMethod?.name}
                </p>

                {/* Real-time proposal validity */}
                <div className="mt-4 flex items-center justify-center md:justify-end gap-2 text-xs font-medium text-muted-foreground bg-background/80 rounded-md py-1.5 px-3 border border-border">
                  <Clock3 size={14} className="text-primary" />
                  <span>Condição válida até {dateTime.format(validUntilDate)}</span>
                </div>
              </div>
            </div>

            {/* Commercial triggers callouts (Requirement 14) */}
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
          </div>

          {/* Action Buttons: FECHAR AGORA | DEIXAR PARA DEPOIS | VOLTAR (Requirement 15) */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="w-full sm:w-auto h-14 px-8 text-base font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg gap-2"
              onClick={() => setShowCloseModal(true)}
            >
              <CheckCircle2 size={20} />
              FECHAR AGORA
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto h-14 px-8 text-base font-bold gap-2"
              onClick={() => setShowDeferModal(true)}
            >
              <Calendar size={18} />
              DEIXAR PARA DEPOIS
            </Button>

            <Button
              size="lg"
              variant="ghost"
              className="w-full sm:w-auto text-muted-foreground hover:text-foreground"
              onClick={() => setPresentationMode(false)}
            >
              Voltar ao editor
            </Button>
          </div>
        </div>

        {/* Modal: Confirm Close Sale (Requirement 16) */}
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aluno:</span>
                  <span className="font-bold">{studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Curso:</span>
                  <span className="font-semibold">{course?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Original:</span>
                  <span className="line-through">{brl.format(calc.original)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Economia Total:</span>
                  <span>− {brl.format(calc.economy)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-primary">
                  <span>Valor Final:</span>
                  <span>{brl.format(calc.final)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Pagamento:</span>
                  <span>
                    {selectedMethod?.name} ({calc.count}x de {brl.format(calc.portion)})
                  </span>
                </div>
              </div>

              {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

              <div className="mt-6 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowCloseModal(false)} disabled={busy}>
                  Cancelar
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  onClick={handleConfirmCloseSale}
                  disabled={busy}
                >
                  {busy ? "Confirmando..." : "CONFIRMAR VENDA"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Defer Followup (Requirement 17 & 18) */}
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
                    O contato e a proposta permanecerão salvos na sua carteira com o status <b>AGUARDANDO RETORNO</b>.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm font-medium">
                    Data do Retorno
                    <input
                      type="date"
                      className="input-field mt-1.5"
                      value={deferDate}
                      onChange={(e) => setDeferDate(e.target.value)}
                      required
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Horário
                    <input
                      type="time"
                      className="input-field mt-1.5"
                      value={deferTime}
                      onChange={(e) => setDeferTime(e.target.value)}
                      required
                    />
                  </label>
                </div>

                <label className="block text-sm font-medium">
                  Motivo / Observação do Aluno
                  <textarea
                    className="input-field mt-1.5 min-h-[5rem]"
                    placeholder="Ex: Aluno quer conversar com a família antes de decidir..."
                    value={deferNotes}
                    onChange={(e) => setDeferNotes(e.target.value)}
                    required
                  />
                </label>
              </div>

              {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

              <div className="mt-6 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowDeferModal(false)} disabled={busy}>
                  Cancelar
                </Button>
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                  onClick={handleSaveDeferFollowup}
                  disabled={busy}
                >
                  {busy ? "Salvando..." : "SALVAR E AGENDAR RETORNO"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // EDITOR PRINCIPAL DA PROPOSTA
  // ==========================================
  return (
    <AppShell
      title="Nova Proposta"
      subtitle="Monte a melhor condição comercial em tempo real enquanto dialoga com o aluno."
    >
      {/* Existing Contact Alert (Requirement 8) */}
      {existingContactNotice && (
        <div className="mb-6 rounded-lg border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-full bg-amber-200 text-amber-800">
              <UserRound size={18} />
            </span>
            <div>
              <strong className="text-sm font-bold text-amber-900 dark:text-amber-200">
                CONTATO ENCONTRADO
              </strong>
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
          {/* Passo 1: Aluno (Requirement 8) */}
          <section className="data-panel p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="metric-icon">
                <UserRound size={18} />
              </span>
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

          {/* Passo 2: Curso (Requirement 9) */}
          <section className="data-panel p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="metric-icon">
                <MonitorUp size={18} />
              </span>
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
                  }}
                >
                  <option value="">Selecione a área</option>
                  {(data?.areas ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Curso *
                <select
                  className="input-field mt-1.5"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  disabled={!areaId}
                >
                  <option value="">Selecione o curso</option>
                  {(data?.courses ?? [])
                    .filter((c) => c.area_id === areaId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {brl.format(Number(c.base_price))}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            {/* Course Details Card */}
            {course && (
              <div className="mt-4 rounded-lg bg-muted/60 border border-border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-base font-bold text-foreground">{course.name}</strong>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-primary/10 text-primary">
                    {course.modality}
                  </span>
                </div>
                {course.description && (
                  <p className="mt-1 text-xs text-muted-foreground">{course.description}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground border-t border-border pt-2.5">
                  <span>Carga Horária: <b>{course.workload_hours}h</b></span>
                  <span>Valor-base: <b>{brl.format(Number(course.base_price))}</b></span>
                </div>
              </div>
            )}
          </section>

          {/* Passo 3: Monte a Condição (Requirement 10 & 12) */}
          <section className="data-panel p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="metric-icon">
                <DollarSign size={18} />
              </span>
              <div>
                <h2 className="text-base font-bold">
                  <span className="text-primary mr-1.5">3.</span> Monte a Condição Comercial
                </h2>
                <p className="text-xs text-muted-foreground">
                  Selecione pagamento, parcelamento e componentes modulares de desconto
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-medium">
                Forma de Pagamento *
                <select
                  className="input-field mt-1.5"
                  value={paymentMethodId}
                  onChange={(e) => {
                    setPaymentMethodId(e.target.value);
                    setInstallmentId("");
                  }}
                >
                  <option value="">Selecione</option>
                  {(data?.methods ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Parcelamento *
                <select
                  className="input-field mt-1.5"
                  value={installmentId}
                  onChange={(e) => setInstallmentId(e.target.value)}
                  disabled={!paymentMethodId}
                >
                  <option value="">Selecione as parcelas</option>
                  {installmentsList.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.label} ({i.installments}x)
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Regra Geral de Desconto
                <select
                  className="input-field mt-1.5"
                  value={discountId}
                  onChange={(e) => setDiscountId(e.target.value)}
                >
                  <option value="">Sem regra geral</option>
                  {(data?.discounts ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.kind === "percentage" ? `${d.value}%` : brl.format(Number(d.value))})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Modular Discounts (Requirement 11 & 12) */}
            <div className="mt-5 border-t border-border pt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-3">
                Descontos Modulares por Componente
              </span>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-xs font-semibold">
                  Desconto na Matrícula (R$)
                  <input
                    type="number"
                    min="0"
                    step="50"
                    className="input-field mt-1 text-sm font-bold text-emerald-700"
                    placeholder="0,00"
                    value={matriculaDiscount || ""}
                    onChange={(e) => setMatriculaDiscount(Number(e.target.value))}
                  />
                </label>

                <label className="text-xs font-semibold">
                  Desconto na Entrada (R$)
                  <input
                    type="number"
                    min="0"
                    step="100"
                    className="input-field mt-1 text-sm font-bold text-emerald-700"
                    placeholder="0,00"
                    value={entradaDiscount || ""}
                    onChange={(e) => setEntradaDiscount(Number(e.target.value))}
                  />
                </label>

                <label className="text-xs font-semibold">
                  Desconto Adicional Autorizado (R$)
                  <input
                    type="number"
                    min="0"
                    step="50"
                    className="input-field mt-1 text-sm font-bold text-emerald-700"
                    placeholder="0,00"
                    value={adicionalDiscount || ""}
                    onChange={(e) => setAdicionalDiscount(Number(e.target.value))}
                  />
                </label>
              </div>
            </div>

            {/* Proposal notes & validity */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2 border-t border-border pt-4">
              <label className="text-sm font-medium">
                Validade da Oferta (minutos)
                <input
                  type="number"
                  min="15"
                  step="15"
                  className="input-field mt-1.5"
                  value={validityMinutes}
                  onChange={(e) => setValidityMinutes(Number(e.target.value))}
                />
              </label>

              <label className="text-sm font-medium">
                Observações internas
                <input
                  className="input-field mt-1.5"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anotações para sua carteira"
                />
              </label>
            </div>
          </section>
        </div>

        {/* Right Sticky Column: Real-Time Commercial Result & Presentation */}
        <aside className="result-panel">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <span className="text-xs font-extrabold uppercase tracking-widest text-primary">
              Cálculo em Tempo Real
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {course?.name ? course.name.slice(0, 18) + "..." : "Selecione curso"}
            </span>
          </div>

          {/* Real-time Calculation Breakdown (Requirement 11) */}
          <div className="mt-5 space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Valor Original:</span>
              <span className="text-base font-semibold line-through text-muted-foreground">
                {brl.format(calc.original)}
              </span>
            </div>

            {/* Itemized Modular Discounts */}
            {calc.breakdown.length > 0 && (
              <div className="rounded-lg bg-muted/40 p-3 space-y-2 border border-border/80">
                <span className="text-xs font-bold uppercase text-primary tracking-wide block">
                  Descontos Aplicados:
                </span>
                {calc.breakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span>{item.name}</span>
                    <b className="text-emerald-600">− {brl.format(item.amount)}</b>
                  </div>
                ))}
              </div>
            )}

            <div className="economy-callout w-full justify-between">
              <span className="text-xs uppercase font-bold tracking-wide">Você Economiza:</span>
              <strong className="text-base font-extrabold">{brl.format(calc.economy)}</strong>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Valor Final da Proposta
              </span>
              <div className="price-highlight my-1">{brl.format(calc.final)}</div>
              <p className="text-xs font-bold text-foreground">
                {calc.count}x de <b>{brl.format(calc.portion)}</b>
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="mt-6 space-y-2.5">
            {/* Botão MOSTRAR AO ALUNO (Requirement 15) */}
            <Button
              className="w-full h-12 text-sm font-bold shadow-md gap-2"
              disabled={!canPresent || busy}
              onClick={() => setPresentationMode(true)}
            >
              <Eye size={17} />
              MOSTRAR PROPOSTA AO ALUNO
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-300"
                disabled={!canPresent || busy}
                onClick={() => setShowCloseModal(true)}
              >
                <CheckCircle2 size={16} />
                Fechar Agora
              </Button>

              <Button
                variant="outline"
                className="font-bold text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-300"
                disabled={!canPresent || busy}
                onClick={() => setShowDeferModal(true)}
              >
                <Calendar size={16} />
                Deixar p/ Depois
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
            A validade da oferta iniciará automaticamente ao apresentar ao aluno.
          </p>
        </aside>
      </div>

      {/* Editor Modal: Confirm Close Sale */}
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aluno:</span>
                <span className="font-bold">{studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Curso:</span>
                <span className="font-semibold">{course?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor Original:</span>
                <span className="line-through">{brl.format(calc.original)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Economia Total:</span>
                <span>− {brl.format(calc.economy)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-primary">
                <span>Valor Final:</span>
                <span>{brl.format(calc.final)}</span>
              </div>
            </div>

            {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowCloseModal(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={handleConfirmCloseSale}
                disabled={busy}
              >
                {busy ? "Confirmando..." : "CONFIRMAR VENDA"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal: Defer Followup */}
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
                  <input
                    type="date"
                    className="input-field mt-1.5"
                    value={deferDate}
                    onChange={(e) => setDeferDate(e.target.value)}
                    required
                  />
                </label>
                <label className="text-sm font-medium">
                  Horário
                  <input
                    type="time"
                    className="input-field mt-1.5"
                    value={deferTime}
                    onChange={(e) => setDeferTime(e.target.value)}
                    required
                  />
                </label>
              </div>

              <label className="block text-sm font-medium">
                Motivo / Observação do Aluno
                <textarea
                  className="input-field mt-1.5 min-h-[5rem]"
                  placeholder="Ex: Aluno quer conversar com a família antes de decidir..."
                  value={deferNotes}
                  onChange={(e) => setDeferNotes(e.target.value)}
                  required
                />
              </label>
            </div>

            {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowDeferModal(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                onClick={handleSaveDeferFollowup}
                disabled={busy}
              >
                {busy ? "Salvando..." : "SALVAR E AGENDAR RETORNO"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
