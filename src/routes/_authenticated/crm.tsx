import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  GripVertical,
  Phone,
  Clock3,
  Calendar,
  User,
  ExternalLink,
  History,
  ArrowRightLeft,
  X,
  FileText,
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Send,
  MessageSquare,
  Share2,
  GraduationCap,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  brl,
  dateTime,
  dateOnly,
  timeOnly,
  formatPhone,
  useRefreshWorkspace,
  useWorkspace,
} from "@/lib/use-workspace";
import { moveStudent, transferStudents, getStudentTimeline } from "@/lib/crm.functions";
import { buildProposalWhatsAppMessage, openWhatsAppShare } from "@/lib/whatsapp";
import { EnrollmentCompletionModal } from "@/components/enrollment-completion-modal";

export const Route = createFileRoute("/_authenticated/crm")({
  head: () => ({
    meta: [
      { title: "CRM Comercial — Instituto Mix" },
      { name: "description", content: "Acompanhe cada contato no funil comercial do Instituto Mix de Profissões." },
      { property: "og:title", content: "CRM Comercial — Instituto Mix" },
      { property: "og:description", content: "Acompanhe cada contato no funil comercial do Instituto Mix de Profissões." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CrmPage,
});

interface InteractionItem {
  id?: string;
  kind?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

function CrmPage() {
  const { data, isLoading } = useWorkspace();
  const move = useServerFn(moveStudent);
  const transfer = useServerFn(transferStudents);
  const loadTimeline = useServerFn(getStudentTimeline);
  const refresh = useRefreshWorkspace();

  // Tick for countdown timers
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter by seller (for Manager & Admin)
  const [selectedSellerFilter, setSelectedSellerFilter] = useState<string>("all");

  // Contact Details / History Drawer
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineData, setTimelineData] = useState<{
    interactions: InteractionItem[];
    proposals: unknown[];
    followups: unknown[];
  } | null>(null);

  // Transfer Contacts Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [studentToTransfer, setStudentToTransfer] = useState<string | null>(null);
  const [targetSellerId, setTargetSellerId] = useState<string>("");
  const [transferReason, setTransferReason] = useState("Redistribuição de carteira");
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferMessage, setTransferMessage] = useState("");

  // Enrollment modal state — carries all data needed for EnrollmentCompletionModal
  const [enrollmentTarget, setEnrollmentTarget] = useState<{
    student: { id: string; full_name: string; whatsapp: string; email?: string | null };
    proposal: {
      id: string;
      course_name: string;
      course_workload_hours?: number | null;
      course_modality?: string | null;
      payment_method_name: string;
      installments: number;
      installment_value: number;
      enrollment_fee_snapshot?: number | null;
      original_price?: number;
      discount_amount?: number;
      final_price: number;
      seller_name?: string;
    };
  } | null>(null);

  if (isLoading || !data) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Carregando CRM…</div>;
  }

  const { isSeller, isManager, isAdmin } = data;

  // Filter students based on role and seller filter
  let visibleStudents = data.students;
  if (isSeller) {
    visibleStudents = data.students.filter((s) => s.owner_id === data.userId || !s.owner_id);
  } else if (selectedSellerFilter !== "all") {
    visibleStudents = data.students.filter((s) => s.owner_id === selectedSellerFilter);
  }

  // Handle open student history
  async function handleOpenStudentTimeline(sId: string) {
    setSelectedStudentId(sId);
    setTimelineLoading(true);
    try {
      const res = await loadTimeline({ data: { studentId: sId } });
      setTimelineData(res);
    } catch (e) {
      console.error("Error loading timeline:", e);
    } finally {
      setTimelineLoading(false);
    }
  }

  // Handle execute transfer
  async function handleExecuteTransfer() {
    if (!studentToTransfer) return;
    setTransferBusy(true);
    setTransferMessage("");
    try {
      await transfer({
        data: {
          studentIds: [studentToTransfer],
          targetSellerId: targetSellerId || null,
          reason: transferReason || "Transferência de atendimento",
        },
      });
      await refresh();
      setTransferMessage("Contato transferido com sucesso!");
      setTimeout(() => {
        setShowTransferModal(false);
        setStudentToTransfer(null);
        setTransferMessage("");
      }, 800);
    } catch (err) {
      setTransferMessage(err instanceof Error ? err.message : "Erro ao transferir contato.");
    } finally {
      setTransferBusy(false);
    }
  }

  // Open WhatsApp share for a proposal card
  function handleWhatsAppShare(student: (typeof data.students)[number], proposal: (typeof data.proposals)[number] | undefined) {
    if (!proposal) return;
    const count = Number((proposal as any).installments ?? (proposal as any).installment_count ?? 1);
    const subtotal = Number((proposal as any).subtotal_snapshot ?? proposal.original_price ?? 0);
    const enrollment = Number((proposal as any).enrollment_fee_snapshot ?? (proposal as any).enrollment_payable ?? 0);
    const finalPrice = Number(proposal.final_price ?? 0);
    const aVistaTotal = subtotal + enrollment;
    const aVistaSavings = Math.max(0, finalPrice - aVistaTotal);

    const message = buildProposalWhatsAppMessage({
      studentName: student.full_name,
      whatsapp: student.whatsapp,
      courseName: proposal.course_name ?? "Curso",
      originalPrice: Number(proposal.original_price ?? 0),
      finalPrice,
      discountName: (proposal as any).discount_name ?? null,
      discountAmount:
        Number(proposal.original_price ?? 0) - finalPrice > 0
          ? Number(proposal.original_price ?? 0) - finalPrice
          : null,
      enrollmentPayable: enrollment,
      installments: count,
      installmentValue: Number((proposal as any).installment_value ?? proposal.final_price ?? 0),
      proposalId: proposal.id,
      validUntil: (proposal as any).valid_until
        ? new Date((proposal as any).valid_until).toLocaleDateString("pt-BR")
        : null,
      aVistaTotal: count > 1 && aVistaSavings > 0 ? aVistaTotal : undefined,
      aVistaSavings: count > 1 && aVistaSavings > 0 ? aVistaSavings : undefined,
      aVistaMethodName: "Pix / Dinheiro",
    });
    openWhatsAppShare(student.whatsapp, message);
  }

  // Open Enrollment Modal for a student + proposal
  function handleOpenEnrollment(
    student: (typeof data.students)[number],
    proposal?: (typeof data.proposals)[number],
  ) {
    setEnrollmentTarget({
      student: {
        id: student.id,
        full_name: student.full_name,
        whatsapp: student.whatsapp,
        email: student.email ?? null,
      },
      proposal: {
        id: proposal?.id ?? "",
        course_name: proposal?.course_name ?? "Curso",
        course_workload_hours: (proposal as any)?.course_workload_hours ?? null,
        course_modality: (proposal as any)?.course_modality ?? null,
        payment_method_name: (proposal as any)?.payment_method_name ?? "À Vista",
        installments: Number((proposal as any)?.installment_count ?? 1),
        installment_value: Number((proposal as any)?.installment_value ?? proposal?.final_price ?? 0),
        enrollment_fee_snapshot: Number((proposal as any)?.enrollment_fee_snapshot ?? (proposal as any)?.enrollment_payable ?? 0),
        original_price: Number(proposal?.original_price ?? 0),
        discount_amount: Number(proposal?.original_price ?? 0) - Number(proposal?.final_price ?? 0),
        final_price: Number(proposal?.final_price ?? 0),
        seller_name: data.sellers.find((sel) => sel.id === student.owner_id)?.full_name,
      },
    });
  }

  const selectedStudent = data.students.find((s) => s.id === selectedStudentId);
  const selectedStudentProposal = selectedStudent
    ? data.proposals.find((p) => p.student_id === selectedStudent.id)
    : undefined;

  return (
    <AppShell
      title={isSeller ? "Meu Funil de Vendas" : "CRM Comercial da Equipe"}
      subtitle="Acompanhe cada oportunidade, validades de proposta e retornos agendados."
      actions={
        <div className="flex items-center gap-3">
          {/* Seller Filter for Manager / Admin */}
          {!isSeller && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">Vendedor:</span>
              <select
                className="input-field h-9 text-xs font-medium w-48"
                value={selectedSellerFilter}
                onChange={(e) => setSelectedSellerFilter(e.target.value)}
              >
                <option value="all">Toda a equipe ({data.students.length} contatos)</option>
                {data.sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({data.students.filter((st) => st.owner_id === s.id).length})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button size="sm" asChild>
            <Link to="/simulacao">
              <Plus size={16} className="mr-1" /> Nova Proposta
            </Link>
          </Button>
        </div>
      }
    >
      {/* Kanban Grid */}
      <div className="kanban-grid">
        {data.stages.map((stage) => {
          const stageStudents = visibleStudents.filter((s) => s.crm_stage_id === stage.id);

          return (
            <section key={stage.id} className="kanban-column">
              <header className="border-b border-border/60 pb-2 mb-3">
                <span className="stage-dot" />
                <strong className="text-sm font-bold">{stage.name}</strong>
                <span className="rounded-full bg-background px-2 py-0.5 text-xs font-bold shadow-2xs">
                  {stageStudents.length}
                </span>
              </header>

              <div className="space-y-3">
                {stageStudents.map((student) => {
                  const proposal = data.proposals.find((p) => p.student_id === student.id);
                  const followup = data.followups.find((f) => f.student_id === student.id && f.status === "pending");
                  const seller = data.sellers.find((sel) => sel.id === student.owner_id);

                  // Detect "won" stage to show "Efetivar Matrícula"
                  const stageName = (stage.name ?? "").toLowerCase();
                  const isWonStage =
                    stageName.includes("ganha") ||
                    stageName.includes("ganhou") ||
                    stageName.includes("matricul") ||
                    stageName.includes("fechad") ||
                    stageName.includes("won");

                  // Calculate countdown timer if active
                  let timerStr = "";
                  let timerUrgent = false;
                  if (proposal?.valid_until && proposal.timer_status === "active") {
                    const diffMs = new Date(proposal.valid_until).getTime() - Date.now();
                    const seconds = Math.max(0, Math.floor(diffMs / 1000));
                    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
                    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
                    const s = String(seconds % 60).padStart(2, "0");
                    timerStr = `${h}:${m}:${s}`;
                    timerUrgent = seconds < 900; // less than 15 min
                  }

                  const hasReturn = Boolean(followup);

                  return (
                    <article className="contact-card relative group hover:border-primary/50 transition-all" key={student.id}>
                      {/* Top Header: Student Name & History Icon */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="block text-sm font-bold text-foreground">
                            {student.full_name}
                          </strong>
                          <a
                            href={`https://wa.me/55${student.whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary hover:underline font-medium"
                          >
                            <Phone size={12} />
                            {formatPhone(student.whatsapp)}
                            <ExternalLink size={10} />
                          </a>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-primary"
                          title="Ver histórico do contato"
                          onClick={() => handleOpenStudentTimeline(student.id)}
                        >
                          <History size={15} />
                        </Button>
                      </div>

                      {/* Proposal Snapshot info */}
                      {proposal && (
                        <div className="mt-3 rounded-md bg-muted/50 p-2.5 border border-border/80">
                          <p className="text-xs font-semibold truncate text-foreground">{proposal.course_name}</p>
                          <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-xs text-muted-foreground line-through">
                              {brl.format(Number(proposal.original_price))}
                            </span>
                            <b className="text-sm font-bold text-primary">
                              {brl.format(Number(proposal.final_price))}
                            </b>
                          </div>

                          {/* WhatsApp Share Button */}
                          <button
                            type="button"
                            title="Compartilhar proposta via WhatsApp"
                            onClick={() => handleWhatsAppShare(student, proposal)}
                            className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-md border border-[#25D366]/40 bg-[#25D366]/10 px-2 py-1 text-[11px] font-semibold text-[#128C7E] hover:bg-[#25D366]/20 dark:text-[#25D366] transition-colors"
                          >
                            {/* WhatsApp SVG icon */}
                            <svg viewBox="0 0 24 24" fill="currentColor" className="size-3 shrink-0">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                            </svg>
                            Compartilhar no WhatsApp
                          </button>
                        </div>
                      )}

                      {/* "Efetivar Matrícula" button — shown on won stage */}
                      {isWonStage && (
                        <button
                          type="button"
                          onClick={() => handleOpenEnrollment(student, proposal)}
                          className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/20 transition-colors"
                        >
                          <GraduationCap size={13} />
                          Efetivar Matrícula
                        </button>
                      )}

                      {/* Live Timer Countdown if active */}
                      {proposal && proposal.timer_status === "active" && timerStr && (
                        <div
                          className={`mt-2 flex items-center justify-between text-xs px-2 py-1 rounded-sm border ${
                            timerUrgent
                              ? "bg-destructive/10 text-destructive border-destructive/30 font-bold animate-pulse"
                              : "bg-primary/5 text-primary border-primary/20 font-semibold"
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            <Clock3 size={12} />
                            Validade da Proposta:
                          </span>
                          <span className="font-mono text-xs">{timerStr}</span>
                        </div>
                      )}

                      {/* Prominent Return Scheduled Badge */}
                      {hasReturn && followup && (
                        <div className="mt-2 flex items-center gap-1.5 rounded-sm bg-amber-500/15 border border-amber-500/30 px-2 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                          <CalendarClock size={13} />
                          <span>
                            RETORNO: {dateOnly.format(new Date(followup.due_at))} às {timeOnly.format(new Date(followup.due_at))}
                          </span>
                        </div>
                      )}

                      {/* Responsible Seller Badge & Quick Actions */}
                      <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 truncate max-w-[10rem]">
                          <User size={12} />
                          {seller ? seller.full_name.split(" ")[0] : "Sem vendedor"}
                        </span>

                        {/* Transfer Contact Action for Manager / Admin */}
                        {!isSeller && (
                          <button
                            type="button"
                            className="text-primary hover:underline font-semibold flex items-center gap-1"
                            onClick={() => {
                              setStudentToTransfer(student.id);
                              setShowTransferModal(true);
                            }}
                          >
                            <ArrowRightLeft size={11} /> Transferir
                          </button>
                        )}
                      </div>

                      {/* Move Stage Selector */}
                      <select
                        aria-label={`Mover ${student.full_name}`}
                        className="input-field mt-3 h-8 text-xs font-medium"
                        value={student.crm_stage_id ?? ""}
                        onChange={async (e) => {
                          await move({ data: { studentId: student.id, stageId: e.target.value } });
                          await refresh();
                        }}
                      >
                        {data.stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            Mover para: {s.name}
                          </option>
                        ))}
                      </select>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* ========================================== */}
      {/* DRAWER: HISTÓRICO DO CONTATO               */}
      {/* ========================================== */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-xl h-full bg-background border-l border-border p-6 overflow-y-auto shadow-2xl flex flex-col">
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Histórico & Linha do Tempo
                </span>
                <h2 className="text-xl font-bold mt-1">{selectedStudent.full_name}</h2>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone size={12} /> {formatPhone(selectedStudent.whatsapp)}
                  </span>
                  {selectedStudent.email && <span>• {selectedStudent.email}</span>}
                </div>
              </div>

              <Button variant="ghost" size="icon" onClick={() => setSelectedStudentId(null)}>
                <X size={18} />
              </Button>
            </div>

            {/* Quick Actions for this student */}
            <div className="my-4 flex flex-wrap gap-2">
              <Button size="sm" asChild>
                <Link to="/simulacao">
                  <Plus size={14} className="mr-1" /> Nova Proposta
                </Link>
              </Button>

              {/* WhatsApp quick action if there's a proposal */}
              {selectedStudentProposal && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#25D366]/40 text-[#128C7E] hover:bg-[#25D366]/10 dark:text-[#25D366]"
                  onClick={() => handleWhatsAppShare(selectedStudent, selectedStudentProposal)}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5 mr-1.5">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                  </svg>
                  Enviar Proposta
                </Button>
              )}

              {/* Efetivar Matrícula in drawer */}
              <Button
                size="sm"
                variant="outline"
                className="border-primary/40 text-primary hover:bg-primary/10"
                onClick={() => {
                  handleOpenEnrollment(selectedStudent, selectedStudentProposal);
                  setSelectedStudentId(null);
                }}
              >
                <GraduationCap size={14} className="mr-1" /> Efetivar Matrícula
              </Button>

              {!isSeller && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setStudentToTransfer(selectedStudent.id);
                    setShowTransferModal(true);
                  }}
                >
                  <ArrowRightLeft size={14} className="mr-1" /> Transferir Carteira
                </Button>
              )}
            </div>

            {/* Timeline Section */}
            <div className="flex-1 mt-4">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <History size={16} className="text-primary" />
                Linha do Tempo Completa
              </h3>

              {timelineLoading ? (
                <div className="py-8 text-center text-xs text-muted-foreground">Carregando histórico...</div>
              ) : (
                <div className="space-y-4">
                  {/* Interactions from database */}
                  {timelineData?.interactions.map((item, idx) => {
                    const kind = String(item.kind ?? "");
                    const notes = String(item.notes ?? "");
                    const createdAt = String(item.created_at ?? "");

                    const isWon = kind === "sale_confirmed" || kind === "sale_completed";
                    const isFollowup = kind === "followup_scheduled";
                    const isProposal = kind === "proposal_created";

                    return (
                      <div key={idx} className="timeline-item">
                        <div className="timeline-line" />
                        <span
                          className={`timeline-marker ${
                            isWon
                              ? "bg-emerald-100 text-emerald-700 border-emerald-400"
                              : isFollowup
                              ? "bg-amber-100 text-amber-700 border-amber-400"
                              : isProposal
                              ? "bg-blue-100 text-blue-700 border-blue-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isWon ? (
                            <CheckCircle2 size={13} />
                          ) : isFollowup ? (
                            <CalendarClock size={13} />
                          ) : isProposal ? (
                            <FileText size={13} />
                          ) : (
                            <MessageSquare size={13} />
                          )}
                        </span>
                        <div className="flex-1 bg-muted/30 border border-border/80 rounded-lg p-3 text-xs">
                          <div className="flex justify-between items-baseline mb-1">
                            <strong
                              className={`font-semibold ${
                                isWon ? "text-emerald-700" : isFollowup ? "text-amber-700" : ""
                              }`}
                            >
                              {isWon
                                ? "Venda Confirmada"
                                : isFollowup
                                ? "Retorno Agendado"
                                : isProposal
                                ? "Proposta Apresentada"
                                : kind.replace("_", " ")}
                            </strong>
                            <span className="text-[10px] text-muted-foreground">
                              {dateTime.format(new Date(createdAt))}
                            </span>
                          </div>
                          <p className="text-muted-foreground">{notes}</p>
                        </div>
                      </div>
                    );
                  })}

                  {!timelineData?.interactions.length && (
                    <div className="empty-state text-xs">Nenhum evento registrado ainda para este contato.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: TRANSFERÊNCIA DE CONTATOS           */}
      {/* ========================================== */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-blue-100 text-blue-700">
                <ArrowRightLeft size={20} />
              </span>
              <div>
                <h2 className="text-lg font-bold">Transferir Contato</h2>
                <p className="text-xs text-muted-foreground">
                  Altere o vendedor responsável sem perder nenhum histórico ou proposta.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block text-sm font-medium">
                Novo Vendedor Responsável *
                <select
                  className="input-field mt-1.5"
                  value={targetSellerId}
                  onChange={(e) => setTargetSellerId(e.target.value)}
                >
                  <option value="">Sem responsável (Banco de Leads geral)</option>
                  {data.sellers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.job_title ?? "Vendedor"})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium">
                Motivo da Transferência *
                <input
                  className="input-field mt-1.5"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Ex: Redistribuição de carteira, reatendimento..."
                />
              </label>
            </div>

            {transferMessage && (
              <p className="mt-3 text-xs font-semibold text-primary">{transferMessage}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowTransferModal(false);
                  setStudentToTransfer(null);
                }}
                disabled={transferBusy}
              >
                Cancelar
              </Button>
              <Button onClick={handleExecuteTransfer} disabled={transferBusy} className="font-bold">
                {transferBusy ? "Transferindo..." : "Confirmar Transferência"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: EFETIVAR MATRÍCULA                  */}
      {/* ========================================== */}
      {enrollmentTarget && (
        <EnrollmentCompletionModal
          isOpen={Boolean(enrollmentTarget)}
          student={enrollmentTarget.student}
          proposal={enrollmentTarget.proposal}
          onClose={() => setEnrollmentTarget(null)}
          onSuccess={async () => {
            setEnrollmentTarget(null);
            await refresh();
          }}
        />
      )}
    </AppShell>
  );
}
