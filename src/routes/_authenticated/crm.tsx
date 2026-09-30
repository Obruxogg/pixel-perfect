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
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { brl, dateTime, dateOnly, timeOnly, formatPhone, useRefreshWorkspace, useWorkspace } from "@/lib/use-workspace";
import { moveStudent, transferStudents, getStudentTimeline } from "@/lib/crm.functions";

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

  // Filter by seller (for Manager & Admin - Requirement 26)
  const [selectedSellerFilter, setSelectedSellerFilter] = useState<string>("all");

  // Contact Details / History Drawer (Requirement 23)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineData, setTimelineData] = useState<{
    interactions: InteractionItem[];
    proposals: unknown[];
    followups: unknown[];
  } | null>(null);

  // Transfer Contacts Modal (Requirement 27)
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [studentToTransfer, setStudentToTransfer] = useState<string | null>(null);
  const [targetSellerId, setTargetSellerId] = useState<string>("");
  const [transferReason, setTransferReason] = useState("Redistribuição de carteira");
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferMessage, setTransferMessage] = useState("");

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

  const selectedStudent = data.students.find((s) => s.id === selectedStudentId);

  return (
    <AppShell
      title={isSeller ? "Meu Funil de Vendas" : "CRM Comercial da Equipe"}
      subtitle="Acompanhe cada oportunidade, validades de proposta e retornos agendados."
      actions={
        <div className="flex items-center gap-3">
          {/* Seller Filter for Manager / Admin (Requirement 26) */}
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

                      {/* Proposal Snapshot info (Requirement 22) */}
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
                        </div>
                      )}

                      {/* Live Timer Countdown if active (Requirement 22) */}
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

                      {/* Prominent Return Scheduled Badge (Requirement 22) */}
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

                        {/* Transfer Contact Action for Manager / Admin (Requirement 27) */}
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
      {/* DRAWER: HISTÓRICO DO CONTATO (Requirement 23) */}
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
      {/* MODAL: TRANSFERÊNCIA DE CONTATOS (Requirement 27) */}
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
    </AppShell>
  );
}
