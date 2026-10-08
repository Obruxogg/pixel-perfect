import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Phone,
  Mail,
  CheckCircle2,
  CalendarClock,
  FileText,
  MessageSquare,
  Plus,
  Send,
  PhoneCall,
  Coffee,
  StickyNote,
  UserCheck,
  Globe,
  Clock3,
  ExternalLink,
  X,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
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
import {
  getStudentTimeline,
  logStudentInteraction,
  scheduleStandaloneFollowup,
} from "@/lib/crm.functions";

export const Route = createFileRoute("/_authenticated/aluno/$id")({
  head: () => ({
    meta: [
      { title: "Perfil do Aluno — Instituto Mix" },
      { name: "description", content: "Histórico completo e perfil do aluno no Instituto Mix." },
      { property: "og:title", content: "Perfil do Aluno — Instituto Mix" },
      { property: "og:description", content: "Histórico completo e perfil do aluno no Instituto Mix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudentProfilePage,
});

const KIND_META: Record<string, { label: string; icon: any; color: string }> = {
  call: { label: "Ligação", icon: PhoneCall, color: "bg-blue-100 text-blue-700 border-blue-300" },
  meeting: { label: "Reunião", icon: Coffee, color: "bg-purple-100 text-purple-700 border-purple-300" },
  note: { label: "Anotação", icon: StickyNote, color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  email: { label: "E-mail", icon: Mail, color: "bg-indigo-100 text-indigo-700 border-indigo-300" },
  visit: { label: "Visita", icon: Globe, color: "bg-teal-100 text-teal-700 border-teal-300" },
  proposal_created: { label: "Proposta Criada", icon: FileText, color: "bg-blue-100 text-blue-700 border-blue-300" },
  followup_scheduled: { label: "Retorno Agendado", icon: CalendarClock, color: "bg-amber-100 text-amber-700 border-amber-300" },
  followup_completed: { label: "Retorno Concluído", icon: CheckCircle2, color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  sale_confirmed: { label: "Venda Confirmada", icon: CheckCircle2, color: "bg-emerald-200 text-emerald-800 border-emerald-400" },
  stage_changed: { label: "Etapa Alterada", icon: UserCheck, color: "bg-muted text-muted-foreground border-border" },
  contact_transferred: { label: "Contato Transferido", icon: Send, color: "bg-orange-100 text-orange-700 border-orange-300" },
  student_created: { label: "Cadastro Criado", icon: UserCheck, color: "bg-gray-100 text-gray-700 border-gray-300" },
  lead_created: { label: "Lead Cadastrado", icon: UserCheck, color: "bg-gray-100 text-gray-700 border-gray-300" },
  lead_lost: { label: "Lead Perdido", icon: X, color: "bg-destructive/10 text-destructive border-destructive/30" },
};

function StudentProfilePage() {
  const { id } = Route.useParams();
  const { data } = useWorkspace();
  const navigate = useNavigate();
  const loadTimeline = useServerFn(getStudentTimeline);
  const logInteraction = useServerFn(logStudentInteraction);
  const scheduleFollowup = useServerFn(scheduleStandaloneFollowup);
  const refresh = useRefreshWorkspace();

  const [timelineData, setTimelineData] = useState<any>(null);
  const [timelineLoaded, setTimelineLoaded] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Log interaction modal
  const [showLogModal, setShowLogModal] = useState(false);
  const [logKind, setLogKind] = useState<"call" | "meeting" | "note" | "whatsapp" | "email" | "visit">("call");
  const [logNotes, setLogNotes] = useState("");
  const [logFollowupAt, setLogFollowupAt] = useState("");
  const [logFollowupTime, setLogFollowupTime] = useState("10:00");
  const [logFollowupNotes, setLogFollowupNotes] = useState("");
  const [logBusy, setLogBusy] = useState(false);

  // Standalone followup modal
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [followupDate, setFollowupDate] = useState("");
  const [followupTime, setFollowupTime] = useState("10:00");
  const [followupNotes, setFollowupNotes] = useState("");
  const [followupBusy, setFollowupBusy] = useState(false);

  if (!data) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Carregando…</div>;

  const student = data.students.find((s) => s.id === id);

  if (!student) {
    return (
      <AppShell title="Aluno não encontrado">
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-muted-foreground text-sm">O aluno solicitado não foi encontrado ou você não tem acesso a este perfil.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/contatos" })}>
            <ArrowLeft size={16} className="mr-2" /> Voltar para Contatos
          </Button>
        </div>
      </AppShell>
    );
  }

  const stage = data.stages.find((st) => st.id === student.crm_stage_id);
  const seller = data.sellers.find((s) => s.id === student.owner_id);
  const studentProposals = data.proposals.filter((p) => p.student_id === id);
  const studentFollowups = data.followups.filter((f) => f.student_id === id);
  const now = Date.now();

  async function loadTimelineData() {
    if (timelineLoaded) return;
    setTimelineLoading(true);
    try {
      const res = await loadTimeline({ data: { studentId: id } });
      setTimelineData(res);
      setTimelineLoaded(true);
    } catch (e) {
      toast.error("Erro ao carregar histórico.");
    } finally {
      setTimelineLoading(false);
    }
  }

  // Load on first render
  if (!timelineLoaded && !timelineLoading) {
    loadTimelineData();
  }

  async function handleLogInteraction(e: React.FormEvent) {
    e.preventDefault();
    if (!logNotes.trim()) return;
    setLogBusy(true);
    try {
      const followupAt = logFollowupAt ? `${logFollowupAt}T${logFollowupTime}:00` : undefined;
      await logInteraction({
        data: {
          studentId: id,
          kind: logKind,
          notes: logNotes,
          followupAt,
          followupNotes: logFollowupNotes || undefined,
        },
      });
      await refresh();
      // Reload timeline
      setTimelineLoaded(false);
      const res = await loadTimeline({ data: { studentId: id } });
      setTimelineData(res);
      setTimelineLoaded(true);
      toast.success("Interação registrada com sucesso!");
      setShowLogModal(false);
      setLogNotes("");
      setLogFollowupAt("");
      setLogFollowupNotes("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao registrar interação.");
    } finally {
      setLogBusy(false);
    }
  }

  async function handleScheduleFollowup(e: React.FormEvent) {
    e.preventDefault();
    if (!followupDate || !followupNotes.trim()) return;
    setFollowupBusy(true);
    try {
      const dueAt = `${followupDate}T${followupTime}:00`;
      await scheduleFollowup({ data: { studentId: id, dueAt, notes: followupNotes } });
      await refresh();
      setTimelineLoaded(false);
      const res = await loadTimeline({ data: { studentId: id } });
      setTimelineData(res);
      setTimelineLoaded(true);
      toast.success("Retorno agendado com sucesso!");
      setShowFollowupModal(false);
      setFollowupDate("");
      setFollowupNotes("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao agendar retorno.");
    } finally {
      setFollowupBusy(false);
    }
  }

  const pendingFollowups = studentFollowups.filter((f) => f.status === "pending");
  const overdueFollowups = pendingFollowups.filter((f) => new Date(f.due_at).getTime() < now);

  return (
    <AppShell
      title={student.full_name}
      subtitle={`Perfil completo do aluno · Etapa: ${stage?.name ?? "Novo"}`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/contatos" })}>
            <ArrowLeft size={16} className="mr-1" /> Voltar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowFollowupModal(true)}>
            <Calendar size={15} className="mr-1" /> Agendar Retorno
          </Button>
          <Button size="sm" onClick={() => setShowLogModal(true)} className="gap-1.5">
            <Plus size={15} /> Registrar Interação
          </Button>
          <Button size="sm" className="gap-1.5 bg-primary font-bold" asChild>
            <Link to="/simulacao">
              <FileText size={15} /> Nova Proposta
            </Link>
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Left — Student Info */}
        <div className="space-y-5">
          {/* Contact Card */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary font-extrabold text-xl uppercase">
                {student.full_name.slice(0, 2)}
              </div>
              <div>
                <h2 className="text-lg font-bold leading-tight">{student.full_name}</h2>
                <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold mt-1 ${
                  student.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"
                }`}>
                  {student.status === "active" ? "Ativo" : "Inativo"}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 border-t border-border pt-4">
              {student.whatsapp && (
                <a
                  href={`https://wa.me/55${student.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 text-sm text-primary hover:underline font-medium"
                >
                  <span className="grid size-7 place-items-center rounded-md bg-emerald-100 text-emerald-700"><Phone size={14} /></span>
                  {formatPhone(student.whatsapp)}
                  <ExternalLink size={12} className="text-muted-foreground" />
                </a>
              )}
              {student.email && (
                <a
                  href={`mailto:${student.email}`}
                  className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <span className="grid size-7 place-items-center rounded-md bg-blue-100 text-blue-700"><Mail size={14} /></span>
                  {student.email}
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
              <div>
                <span className="text-muted-foreground block">Etapa do CRM</span>
                <strong className="text-foreground">{stage?.name ?? "Novo"}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block">Vendedor</span>
                <strong className="text-foreground">{seller?.full_name?.split(" ")[0] ?? "Sem vendedor"}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block">Origem</span>
                <strong className="text-foreground">{(student as any).source ?? "—"}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block">Cadastrado em</span>
                <strong className="text-foreground">{dateOnly.format(new Date(student.created_at))}</strong>
              </div>
            </div>

            {(student as any).notes && (
              <div className="border-t border-border pt-4">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Observações</span>
                <p className="mt-1.5 text-xs text-foreground bg-muted/30 p-2.5 rounded-md italic">{(student as any).notes}</p>
              </div>
            )}
          </div>

          {/* Pending Followups */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
              <CalendarClock size={16} className="text-amber-500" />
              Retornos Pendentes
              {pendingFollowups.length > 0 && (
                <span className="rounded-full bg-amber-500 text-white text-xs px-2 py-0.5 font-bold">{pendingFollowups.length}</span>
              )}
            </h3>
            {pendingFollowups.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhum retorno agendado.</p>
            ) : (
              <div className="space-y-2">
                {pendingFollowups.map((f) => {
                  const isOverdue = new Date(f.due_at).getTime() < now;
                  return (
                    <div key={f.id} className={`rounded-lg border p-3 text-xs ${isOverdue ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/30"}`}>
                      <div className="flex items-center justify-between">
                        <strong className={isOverdue ? "text-destructive" : "text-foreground"}>
                          {isOverdue ? "⚠️ Atrasado" : "📅"} {dateOnly.format(new Date(f.due_at))} às {timeOnly.format(new Date(f.due_at))}
                        </strong>
                      </div>
                      {f.notes && <p className="mt-1 text-muted-foreground">{f.notes}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Proposals Summary */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
              <FileText size={16} className="text-primary" />
              Propostas ({studentProposals.length})
            </h3>
            {studentProposals.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhuma proposta criada.</p>
            ) : (
              <div className="space-y-2">
                {studentProposals.map((p) => {
                  const isApproved = p.status === "approved";
                  return (
                    <div key={p.id} className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-foreground text-sm">{p.course_name}</strong>
                        <span className={`status-pill ${isApproved ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                          {isApproved ? "Matriculado" : p.status === "awaiting_response" ? "Aguardando" : "Enviada"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>{p.installments}x de {brl.format(Number(p.installment_value))}</span>
                        <strong className="text-primary">{brl.format(Number(p.final_price))}</strong>
                      </div>
                      <span className="text-muted-foreground">{dateTime.format(new Date(p.created_at))}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right — Timeline */}
        <div>
          <div className="section-title flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              Linha do Tempo
              {timelineData?.interactions?.length > 0 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {timelineData.interactions.length}
                </span>
              )}
            </h2>
            <Button variant="outline" size="sm" onClick={() => setShowLogModal(true)} className="gap-1.5">
              <Plus size={14} /> Registrar
            </Button>
          </div>

          {timelineLoading ? (
            <div className="flex flex-col gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {(timelineData?.interactions ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center space-y-2">
                  <MessageSquare size={32} className="mx-auto text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Nenhuma interação registrada ainda.</p>
                  <Button size="sm" onClick={() => setShowLogModal(true)} className="gap-1.5 mt-2">
                    <Plus size={14} /> Registrar primeira interação
                  </Button>
                </div>
              ) : (
                (timelineData.interactions as any[]).map((item: any, idx: number) => {
                  const kind = String(item.kind ?? "");
                  const meta = KIND_META[kind] ?? { label: kind, icon: MessageSquare, color: "bg-muted text-muted-foreground border-border" };
                  const Icon = meta.icon;
                  const isWon = kind === "sale_confirmed";

                  return (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-line" />
                      <span className={`timeline-marker ${meta.color}`}>
                        <Icon size={13} />
                      </span>
                      <div className={`flex-1 rounded-lg border p-3.5 text-xs ${isWon ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20" : "border-border/80 bg-muted/20"}`}>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <strong className="font-semibold text-sm text-foreground">{meta.label}</strong>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {item.created_at ? dateTime.format(new Date(item.created_at)) : "—"}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="text-muted-foreground leading-relaxed">{item.notes}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Log Interaction */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold">Registrar Interação</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Aluno: {student.full_name}</p>
              </div>
              <button type="button" onClick={() => setShowLogModal(false)} className="text-muted-foreground hover:text-foreground p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLogInteraction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-2">Tipo de Interação</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["call", "whatsapp", "meeting", "email", "note", "visit"] as const).map((k) => {
                    const m = KIND_META[k];
                    const Icon = m.icon;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setLogKind(k)}
                        className={`flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-xs font-semibold transition-all ${
                          logKind === k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        <Icon size={16} />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Observações / Resultado *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Descreva o resultado da interação..."
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  className="input-field text-sm resize-none"
                />
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Agendar retorno? (opcional)</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Data</label>
                    <input
                      type="date"
                      value={logFollowupAt}
                      onChange={(e) => setLogFollowupAt(e.target.value)}
                      className="input-field text-sm h-9"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Horário</label>
                    <input
                      type="time"
                      value={logFollowupTime}
                      onChange={(e) => setLogFollowupTime(e.target.value)}
                      className="input-field text-sm h-9"
                    />
                  </div>
                </div>
                {logFollowupAt && (
                  <input
                    type="text"
                    placeholder="Motivo do retorno..."
                    value={logFollowupNotes}
                    onChange={(e) => setLogFollowupNotes(e.target.value)}
                    className="input-field text-sm"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-3">
                <Button type="button" variant="outline" onClick={() => setShowLogModal(false)}>Cancelar</Button>
                <Button type="submit" disabled={logBusy} className="font-bold gap-1.5">
                  <Plus size={15} /> {logBusy ? "Salvando..." : "Registrar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Schedule Followup */}
      {showFollowupModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold">Agendar Retorno</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Aluno: {student.full_name}</p>
              </div>
              <button type="button" onClick={() => setShowFollowupModal(false)} className="text-muted-foreground hover:text-foreground p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleScheduleFollowup} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={followupDate}
                    onChange={(e) => setFollowupDate(e.target.value)}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Horário *</label>
                  <input
                    type="time"
                    value={followupTime}
                    onChange={(e) => setFollowupTime(e.target.value)}
                    className="input-field text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Motivo do Retorno *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ex: Aguardando confirmação, verificar interesse..."
                  value={followupNotes}
                  onChange={(e) => setFollowupNotes(e.target.value)}
                  className="input-field text-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-3">
                <Button type="button" variant="outline" onClick={() => setShowFollowupModal(false)}>Cancelar</Button>
                <Button type="submit" disabled={followupBusy} className="font-bold gap-1.5">
                  <Calendar size={15} /> {followupBusy ? "Agendando..." : "Agendar Retorno"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
