import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  CircleDollarSign,
  Handshake,
  UserCheck,
  Users,
  Plus,
  Clock3,
  AlertCircle,
  TrendingUp,
  FileCheck2,
  PhoneCall,
  UserX,
  ExternalLink,
  Settings,
  Target,
  Search,
  Copy,
  Check,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  Percent,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useWorkspace, brl, dateTime, dateOnly, timeOnly, formatPhone, useRefreshWorkspace } from "@/lib/use-workspace";
import { Button } from "@/components/ui/button";
import { completeFollowup, createQuickStudent, manageSeller } from "@/lib/crm.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel Comercial — Instituto Mix" },
      { name: "description", content: "Indicadores, propostas e retornos da operação comercial." },
      { property: "og:title", content: "Painel Comercial — Instituto Mix" },
      { property: "og:description", content: "Indicadores, propostas e retornos da operação comercial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading, error } = useWorkspace();

  if (isLoading) return <Loading />;
  if (error || !data) return <Loading text="Não foi possível carregar o painel comercial." />;

  const { isSeller, isManager } = data;

  if (isSeller) {
    return <SellerDashboard data={data} />;
  }

  if (isManager) {
    return <ManagerDashboard data={data} />;
  }

  return <AdminDashboard data={data} />;
}

// ==========================================
// 1. DASHBOARD EXCLUSIVO DO VENDEDOR
// ==========================================
function SellerDashboard({ data }: { data: NonNullable<ReturnType<typeof useWorkspace>["data"]> }) {
  const firstName = data.profile?.full_name?.split(" ")[0] ?? "Vendedor";
  const now = Date.now();
  const todayStr = new Date().toDateString();
  const refresh = useRefreshWorkspace();

  const completeAction = useServerFn(completeFollowup);
  const createStudentAction = useServerFn(createQuickStudent);

  // States
  const [proposalStatusFilter, setProposalStatusFilter] = useState<"all" | "approved" | "awaiting" | "negotiation">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactNotes, setContactNotes] = useState("");
  const [contactBusy, setContactBusy] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Metrics strictly scoped to this seller
  const myStudents = data.students.filter((s) => s.owner_id === data.userId || !s.owner_id);
  const myProposals = data.proposals.filter((p) => p.seller_id === data.userId);
  const myFollowups = data.followups.filter((f) => f.seller_id === data.userId);
  const mySales = (data.sales as any[]).filter((s: any) => s.seller_id === data.userId);

  const closedProposals = myProposals.filter((p) => p.status === "approved");
  const openProposals = myProposals.filter((p) => ["sent", "viewed", "negotiation"].includes(p.status));
  const awaitingResponse = myProposals.filter((p) => p.status === "awaiting_response");

  const todayFollowups = myFollowups.filter(
    (f) => new Date(f.due_at).toDateString() === todayStr && f.status === "pending"
  );
  const overdueFollowups = myFollowups.filter(
    (f) => new Date(f.due_at).getTime() < now && f.status === "pending"
  );

  // Financial total closed
  const totalRevenue = closedProposals.reduce((acc, curr) => acc + Number(curr.final_price || 0), 0);
  const conversionRate = myProposals.length > 0 ? Math.round((closedProposals.length / myProposals.length) * 100) : 0;
  const avgTicket = closedProposals.length > 0 ? totalRevenue / closedProposals.length : 0;

  // Monthly Sales Target (15 enrollments standard monthly target)
  const monthlyTarget = 15;
  const targetProgress = Math.min(100, Math.round((closedProposals.length / monthlyTarget) * 100));

  // Filtered proposals list
  const filteredProposals = myProposals.filter((p) => {
    if (proposalStatusFilter === "approved" && p.status !== "approved") return false;
    if (proposalStatusFilter === "awaiting" && p.status !== "awaiting_response") return false;
    if (proposalStatusFilter === "negotiation" && !["sent", "viewed", "negotiation"].includes(p.status)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const student = data.students.find((s) => s.id === p.student_id);
      const studentName = student?.full_name?.toLowerCase() || "";
      const courseName = p.course_name?.toLowerCase() || "";
      return studentName.includes(q) || courseName.includes(q);
    }
    return true;
  });

  // Action: Copy Proposal WhatsApp Message
  function handleCopyProposalWhatsApp(proposal: any, student: any) {
    const studentName = student?.full_name || "Prezado(a)";
    const discountAmt = Number(proposal.discount_amount || 0);
    const economyText = discountAmt > 0 ? `\n🎉 *Economia Aplicada:* ${brl.format(discountAmt)}` : "";

    const text = `🎓 *Proposta Comercial — Instituto Mix de Profissões*
Olá, *${studentName}*! Tudo bem?

Conforme conversamos, preparei a sua condição comercial exclusiva para o curso:
📚 *Curso:* ${proposal.course_name} (${proposal.course_modality || "Presencial"})
💰 *Condição:* ${proposal.installments}x de ${brl.format(Number(proposal.installment_value))} (${proposal.payment_method_name})
💵 *Valor Final com Desconto:* *${brl.format(Number(proposal.final_price))}*${economyText}

⚡ *Validade:* Esta condição foi registrada no sistema e está reservada para você.
Para confirmar sua matrícula agora, basta responder esta mensagem!`;

    navigator.clipboard.writeText(text);
    toast.success("Resumo da proposta copiado para o WhatsApp!");
  }

  // Action: Complete Followup
  async function handleCompleteFollowup(id: string) {
    setCompletingId(id);
    try {
      await completeAction({ data: { followupId: id, notes: "Retorno realizado com sucesso pelo vendedor." } });
      await refresh();
      toast.success("Retorno concluído com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao concluir retorno.");
    } finally {
      setCompletingId(null);
    }
  }

  // Action: Save Quick Lead
  async function handleSaveQuickStudent(e: React.FormEvent) {
    e.preventDefault();
    setContactBusy(true);
    try {
      await createStudentAction({
        data: {
          fullName: contactName,
          whatsapp: contactPhone,
          email: contactEmail || undefined,
          notes: contactNotes || undefined,
          source: "Dashboard Vendedor",
        },
      });
      await refresh();
      toast.success("Novo contato adicionado à sua carteira!");
      setShowNewContactModal(false);
      setContactName("");
      setContactPhone("");
      setContactEmail("");
      setContactNotes("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao cadastrar contato.");
    } finally {
      setContactBusy(false);
    }
  }

  const sellerKpis = [
    { label: "Faturamento Realizado", value: brl.format(totalRevenue), icon: CircleDollarSign, color: "text-emerald-700 bg-emerald-100/70 dark:bg-emerald-950/50", highlight: true },
    { label: "Matrículas Fechadas", value: closedProposals.length, icon: UserCheck, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
    { label: "Taxa de Conversão", value: `${conversionRate}%`, icon: Percent, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40" },
    { label: "Propostas em Aberto", value: openProposals.length, icon: Handshake, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" },
    { label: "Aguardando Resposta", value: awaitingResponse.length, icon: Clock3, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40" },
    {
      label: "Retornos de Hoje",
      value: todayFollowups.length,
      icon: CalendarClock,
      color: todayFollowups.length > 0 ? "text-amber-800 bg-amber-200/80 font-bold" : "text-muted-foreground bg-muted",
    },
    {
      label: "Retornos Atrasados",
      value: overdueFollowups.length,
      icon: AlertCircle,
      color: overdueFollowups.length > 0 ? "text-destructive bg-destructive/15 font-bold" : "text-muted-foreground bg-muted",
    },
    { label: "Total na Carteira", value: myStudents.length, icon: Users, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40" },
  ];

  return (
    <AppShell
      title={`Olá, ${firstName}! 🚀`}
      subtitle="Seu painel exclusivo de vendas, metas e acompanhamento de propostas."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowNewContactModal(true)} className="gap-1.5 font-semibold">
            <Plus size={16} /> Novo Contato
          </Button>
          <Button size="sm" className="gap-2 font-bold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
            <Link to="/simulacao">
              <Plus size={18} />
              + CRIAR NOVA PROPOSTA
            </Link>
          </Button>
        </div>
      }
    >
      {/* Fast Lead / Pitch Highlight Banner */}
      <div className="mb-6 rounded-xl border-2 border-primary/20 bg-linear-to-r from-primary/10 via-primary/5 to-background p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary uppercase tracking-wide">
              <Sparkles size={12} /> Foco Comercial
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </div>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight">Pronto para fechar mais uma matrícula hoje?</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Simule valores em tempo real, aplique as condições aprovadas pela gerência e envie a proposta formatada diretamente no WhatsApp do aluno.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button variant="outline" onClick={() => setShowNewContactModal(true)}>
            + Cadastrar Lead
          </Button>
          <Button size="lg" className="font-bold shadow-md gap-2" asChild>
            <Link to="/simulacao">
              Simular Proposta <ArrowRight size={18} />
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {sellerKpis.map((c) => {
          const Icon = c.icon;
          return (
            <article key={c.label} className="metric-card flex-col items-start justify-between min-h-[6.8rem] p-3.5 shadow-xs">
              <div className="flex items-center justify-between w-full">
                <span className={`grid size-8 place-items-center rounded-lg ${c.color}`}>
                  <Icon size={18} />
                </span>
                <strong className={`font-extrabold text-foreground ${c.label === "Faturamento Realizado" ? "text-base xl:text-lg text-emerald-700 dark:text-emerald-400" : "text-2xl"}`}>
                  {c.value}
                </strong>
              </div>
              <p className="mt-2 text-xs font-semibold text-muted-foreground leading-snug">{c.label}</p>
            </article>
          );
        })}
      </section>

      {/* Monthly Sales Goal & Performance Rhythm */}
      <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Target size={20} />
            </span>
            <div>
              <h3 className="text-base font-bold">Meta Comercial do Mês</h3>
              <p className="text-xs text-muted-foreground">
                Seu progresso individual: <b>{closedProposals.length}</b> de <b>{monthlyTarget}</b> matrículas realizadas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="text-right">
              <span className="text-muted-foreground block">Ticket Médio</span>
              <strong className="text-sm font-bold text-foreground">{brl.format(avgTicket)}</strong>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground block">Desempenho</span>
              <span className={`font-bold inline-flex items-center gap-1 rounded-sm px-2 py-0.5 ${
                targetProgress >= 100
                  ? "bg-emerald-100 text-emerald-800"
                  : targetProgress >= 60
                  ? "bg-blue-100 text-blue-800"
                  : "bg-amber-100 text-amber-800"
              }`}>
                {targetProgress >= 100 ? "Meta Conquistada! 🎉" : `${targetProgress}% Atingido`}
              </span>
            </div>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-linear-to-r from-primary to-emerald-500 transition-all duration-500"
            style={{ width: `${targetProgress}%` }}
          />
        </div>
      </section>

      {/* Priority Action Center: Follow-ups do Dia & Retornos */}
      <section className="mt-8 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        {/* Left: Minhas Propostas Recentes */}
        <div>
          <div className="section-title flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Minhas Propostas Recentes
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {myProposals.length}
                </span>
              </h2>
              <p>Condições comerciais e orçamentos apresentados por você</p>
            </div>
            <Link to="/propostas" className="text-xs font-semibold text-primary hover:underline">
              Ver todas ({myProposals.length}) →
            </Link>
          </div>

          {/* Search & Status Filters */}
          <div className="mb-3 flex flex-col sm:flex-row gap-2 items-center justify-between">
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por aluno ou curso..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-8 h-9 text-xs"
              />
            </div>
            <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setProposalStatusFilter("all")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  proposalStatusFilter === "all" ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setProposalStatusFilter("approved")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  proposalStatusFilter === "approved" ? "bg-emerald-600 text-white font-bold" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Matriculadas
              </button>
              <button
                type="button"
                onClick={() => setProposalStatusFilter("awaiting")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  proposalStatusFilter === "awaiting" ? "bg-amber-500 text-white font-bold" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Aguardando
              </button>
              <button
                type="button"
                onClick={() => setProposalStatusFilter("negotiation")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  proposalStatusFilter === "negotiation" ? "bg-purple-600 text-white font-bold" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Negociação
              </button>
            </div>
          </div>

          <div className="data-panel overflow-x-auto shadow-xs">
            <table>
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Curso</th>
                  <th>Tabela</th>
                  <th>Final</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredProposals.slice(0, 7).map((p) => {
                  const student = data.students.find((s) => s.id === p.student_id);
                  const isApproved = p.status === "approved";
                  const isAwaiting = p.status === "awaiting_response";
                  const discountAmt = Number(p.discount_amount);

                  return (
                    <tr key={p.id}>
                      <td>
                        <strong className="block font-semibold text-foreground">{student?.full_name ?? "Contato"}</strong>
                        <span className="text-xs text-muted-foreground">{formatPhone(student?.whatsapp)}</span>
                      </td>
                      <td className="text-xs">
                        <strong className="block font-medium">{p.course_name}</strong>
                        <span className="text-[11px] text-muted-foreground">{p.course_modality || "Presencial"}</span>
                      </td>
                      <td className="text-xs text-muted-foreground line-through">
                        {brl.format(Number(p.original_price))}
                      </td>
                      <td>
                        <strong className="text-sm font-extrabold text-primary">
                          {brl.format(Number(p.final_price))}
                        </strong>
                        {discountAmt > 0 && (
                          <span className="block text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            − {brl.format(discountAmt)}
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            isApproved
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : isAwaiting
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isApproved
                            ? "Matriculado"
                            : isAwaiting
                            ? "Aguardando"
                            : p.status === "negotiation"
                            ? "Negociação"
                            : p.status}
                        </span>
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {dateOnly.format(new Date(p.created_at))}
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            title="Copiar texto da proposta para WhatsApp"
                            onClick={() => handleCopyProposalWhatsApp(p, student)}
                          >
                            <Copy size={12} /> WhatsApp
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredProposals.length && (
                  <tr>
                    <td colSpan={7} className="empty-row text-center py-8">
                      {searchQuery
                        ? "Nenhuma proposta encontrada para esta busca."
                        : "Nenhuma proposta cadastrada ainda. Clique em '+ CRIAR NOVA PROPOSTA' para iniciar seu atendimento."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Próximos Retornos Comerciais & Urgências */}
        <div>
          <div className="section-title flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Central de Retornos
                {(todayFollowups.length > 0 || overdueFollowups.length > 0) && (
                  <span className="rounded-full bg-amber-500 text-white px-2 py-0.5 text-xs font-bold animate-pulse">
                    {todayFollowups.length + overdueFollowups.length}
                  </span>
                )}
              </h2>
              <p>Alunos que pediram para falar depois</p>
            </div>
            <Link to="/crm" className="text-xs font-semibold text-primary hover:underline">
              Ir para CRM →
            </Link>
          </div>

          <div className="space-y-3">
            {myFollowups
              .filter((f) => f.status === "pending")
              .slice(0, 6)
              .map((f) => {
                const student = data.students.find((s) => s.id === f.student_id);
                const isOverdue = new Date(f.due_at).getTime() < now;
                const isToday = new Date(f.due_at).toDateString() === todayStr;

                return (
                  <div
                    key={f.id}
                    className={`rounded-xl border p-4 transition-all shadow-2xs ${
                      isOverdue
                        ? "border-destructive/40 bg-destructive/5"
                        : isToday
                        ? "border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <strong className="block text-sm font-bold text-foreground">
                          {student?.full_name ?? "Contato"}
                        </strong>
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <PhoneCall size={12} className="text-primary" /> {formatPhone(student?.whatsapp)}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          isOverdue
                            ? "bg-destructive text-destructive-foreground animate-pulse"
                            : isToday
                            ? "bg-amber-500 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isOverdue ? "Atrasado!" : isToday ? "Hoje" : dateOnly.format(new Date(f.due_at))}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between border-t border-border/60 pt-2 text-xs text-muted-foreground">
                      <span>Horário: <b>{timeOnly.format(new Date(f.due_at))}</b></span>
                      {student?.whatsapp && (
                        <a
                          href={`https://wa.me/55${student.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                            `Olá, ${student.full_name?.split(" ")[0] || ""}! Aqui é o ${firstName} do Instituto Mix. Estou entrando em contato conforme combinamos para dar continuidade ao seu interesse no curso.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                        >
                          Chamar no WhatsApp <ExternalLink size={12} />
                        </a>
                      )}
                    </div>

                    {f.notes && (
                      <p className="mt-2 text-xs italic text-muted-foreground bg-muted/30 p-2 rounded-md">
                        "{f.notes}"
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        asChild
                      >
                        <Link to="/simulacao">Nova Proposta</Link>
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        disabled={completingId === f.id}
                        onClick={() => handleCompleteFollowup(f.id)}
                      >
                        <Check size={13} /> {completingId === f.id ? "Concluindo..." : "Concluir Retorno"}
                      </Button>
                    </div>
                  </div>
                );
              })}

            {!myFollowups.some((f) => f.status === "pending") && (
              <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground space-y-2">
                <span className="grid size-10 place-items-center rounded-full bg-emerald-100 text-emerald-700 mx-auto">
                  <Check size={20} />
                </span>
                <strong className="block text-sm text-foreground">Todos os retornos em dia!</strong>
                <p className="text-xs">Nenhum retorno agendado pendente no momento. Bom trabalho!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Modal: Quick Student Creation */}
      {showNewContactModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold">Novo Contato na Carteira</h3>
                <p className="text-xs text-muted-foreground">Cadastre um novo lead diretamente no seu painel.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewContactModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuickStudent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do aluno"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  WhatsApp / Telefone *
                </label>
                <input
                  type="text"
                  required
                  placeholder="(11) 98765-4321"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  E-mail (opcional)
                </label>
                <input
                  type="email"
                  placeholder="aluno@email.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Observações Iniciais
                </label>
                <textarea
                  rows={2}
                  placeholder="Qual curso procura, disponibilidade, etc."
                  value={contactNotes}
                  onChange={(e) => setContactNotes(e.target.value)}
                  className="input-field text-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowNewContactModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={contactBusy} className="font-bold gap-1.5">
                  <Check size={16} /> {contactBusy ? "Salvando..." : "Cadastrar Contato"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ==========================================
// 2. PAINEL DO GERENTE COM PRÉ-CADASTRO
// ==========================================
function ManagerDashboard({ data }: { data: NonNullable<ReturnType<typeof useWorkspace>["data"]> }) {
  const now = Date.now();
  const todayStr = new Date().toDateString();
  const refresh = useRefreshWorkspace();
  const sellerAction = useServerFn(manageSeller);

  // Pre-Registration Modal State
  const [showPreRegisterModal, setShowPreRegisterModal] = useState(false);
  const [sellerName, setSellerName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [sellerTitle, setSellerTitle] = useState("Vendedor Comercial");
  const [sellerTeamId, setSellerTeamId] = useState("");
  const [sellerPassword, setSellerPassword] = useState("");
  const [sellerAccessCode, setSellerAccessCode] = useState("");
  const [modalBusy, setModalBusy] = useState(false);
  const [preRegisteredSuccess, setPreRegisteredSuccess] = useState<any | null>(null);

  // Reset Password Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetSellerId, setResetSellerId] = useState("");
  const [resetSellerName, setResetSellerName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  // Generate a friendly password
  function handleGeneratePassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let pass = "Vend@";
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSellerPassword(pass);
  }

  // Pre-register submit
  async function handlePreRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setModalBusy(true);
    try {
      const code = sellerAccessCode.trim() || `VD-${Math.floor(1000 + Math.random() * 9000)}`;
      const pass = sellerPassword.trim() || `Vendedor@${Math.floor(1000 + Math.random() * 9000)}`;

      const res = await sellerAction({
        data: {
          action: "create",
          fullName: sellerName,
          email: sellerEmail,
          phone: sellerPhone || undefined,
          jobTitle: sellerTitle || "Vendedor Comercial",
          teamId: sellerTeamId || null,
          password: pass,
          accessCode: code,
        },
      });

      await refresh();
      setPreRegisteredSuccess({
        fullName: sellerName,
        email: sellerEmail,
        code,
        password: pass,
      });
      toast.success("Vendedor pré-cadastrado com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao pré-cadastrar vendedor.");
    } finally {
      setModalBusy(false);
    }
  }

  // Reset password submit
  async function handleResetPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResetBusy(true);
    try {
      await sellerAction({
        data: {
          action: "reset_password",
          sellerId: resetSellerId,
          password: newPassword,
        },
      });
      await refresh();
      toast.success(`Senha de ${resetSellerName} redefinida com sucesso!`);
      setShowResetModal(false);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao redefinir senha.");
    } finally {
      setResetBusy(false);
    }
  }

  // Toggle Seller Active
  async function handleToggleStatus(sellerId: string) {
    try {
      await sellerAction({ data: { action: "toggle_status", sellerId } });
      await refresh();
      toast.success("Status do vendedor alterado!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao alterar status.");
    }
  }

  // Copy WhatsApp Access Credentials
  function handleCopySellerWhatsApp(seller: any) {
    const prefs = (seller.preferences as Record<string, any>) || {};
    const email = prefs["email"] || seller.phone || "Consulte a gerência";
    const code = prefs["access_code"] || "Consulte a gerência";
    const pass = prefs["initial_password"] || "Definida no pré-cadastro";

    const text = `🚀 *Acesso Liberado — Instituto Mix Comercial*
Olá, *${seller.full_name}*! O seu acesso ao sistema de vendas foi pré-cadastrado pela gerência.

🔗 *Link de Acesso:* ${window.location.origin}/auth
📧 *E-mail:* ${email}
🏷️ *Código de Vendedor:* *${code}*
🔑 *Senha Inicial:* *${pass}*

Ao fazer login você acessará diretamente o seu Painel de Vendas para conduzir propostas e retornos. Bom trabalho!`;

    navigator.clipboard.writeText(text);
    toast.success("Credenciais copiadas para envio no WhatsApp!");
  }

  const activeSellers = data.sellers.filter((s) => s.status === "active");
  const inactiveSellers = data.sellers.filter((s) => s.status === "inactive");
  const activeContacts = data.students.filter((s) => s.status === "active");
  const openProposals = data.proposals.filter((p) => ["sent", "viewed", "negotiation"].includes(p.status));
  const awaitingResponse = data.proposals.filter((p) => p.status === "awaiting_response");
  const todayFollowups = data.followups.filter((f) => new Date(f.due_at).toDateString() === todayStr && f.status === "pending");
  const overdueFollowups = data.followups.filter((f) => new Date(f.due_at).getTime() < now && f.status === "pending");
  const closedSales = data.proposals.filter((p) => p.status === "approved");

  const managerIndicators = [
    { label: "Vendedores Ativos", value: activeSellers.length, icon: UserCheck, color: "text-blue-600 bg-blue-50" },
    { label: "Vendedores Inativos", value: inactiveSellers.length, icon: UserX, color: "text-muted-foreground bg-muted" },
    { label: "Contatos Ativos", value: activeContacts.length, icon: Users, color: "text-teal-600 bg-teal-50" },
    { label: "Propostas Abertas", value: openProposals.length, icon: CircleDollarSign, color: "text-amber-600 bg-amber-50" },
    { label: "Aguardando Resposta", value: awaitingResponse.length, icon: Handshake, color: "text-purple-600 bg-purple-50" },
    { label: "Retornos Hoje", value: todayFollowups.length, icon: CalendarClock, color: "text-amber-700 bg-amber-100 font-bold" },
    { label: "Retornos Atrasados", value: overdueFollowups.length, icon: AlertCircle, color: "text-destructive bg-destructive/15 font-bold" },
    { label: "Vendas Fechadas", value: closedSales.length, icon: FileCheck2, color: "text-emerald-700 bg-emerald-100 font-bold" },
  ];

  return (
    <AppShell
      title="Painel da Gerência"
      subtitle="Controle central da equipe comercial, pré-cadastros de acesso e ritmo de vendas."
      actions={
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setPreRegisteredSuccess(null);
              setSellerName("");
              setSellerEmail("");
              setSellerPhone("");
              setSellerPassword("");
              setSellerAccessCode(`VD-${Math.floor(1000 + Math.random() * 9000)}`);
              setShowPreRegisterModal(true);
            }}
            className="gap-2 font-bold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus size={18} />
            + PRÉ-CADASTRAR VENDEDOR
          </Button>
          <Button variant="outline" asChild>
            <Link to="/configuracoes">Configurações Gerais</Link>
          </Button>
        </div>
      }
    >
      {/* Manager Indicators Grid */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {managerIndicators.map((ind) => {
          const Icon = ind.icon;
          return (
            <article key={ind.label} className="metric-card flex-col items-start justify-between min-h-[6.5rem] p-3.5 shadow-xs">
              <div className="flex items-center justify-between w-full">
                <span className={`grid size-8 place-items-center rounded-lg ${ind.color}`}>
                  <Icon size={18} />
                </span>
                <strong className="text-2xl font-bold">{ind.value}</strong>
              </div>
              <p className="mt-2 text-xs font-semibold text-muted-foreground">{ind.label}</p>
            </article>
          );
        })}
      </section>

      {/* Team Breakdown & Pre-Registration Management */}
      <section className="mt-8 space-y-4">
        <div className="section-title flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              Equipe de Vendedores & Acessos
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {data.sellers.length}
              </span>
            </h2>
            <p>Gerencie quem tem permissão para acessar o painel de vendedor e acompanhe o ritmo de cada consultor</p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setPreRegisteredSuccess(null);
              setSellerName("");
              setSellerEmail("");
              setSellerPhone("");
              setSellerPassword("");
              setSellerAccessCode(`VD-${Math.floor(1000 + Math.random() * 9000)}`);
              setShowPreRegisterModal(true);
            }}
            className="gap-1.5 font-bold"
          >
            <Plus size={16} /> Novo Pré-Cadastro
          </Button>
        </div>

        <div className="data-panel overflow-x-auto shadow-xs">
          <table>
            <thead>
              <tr>
                <th>Vendedor</th>
                <th>Código / Acesso</th>
                <th>Status</th>
                <th>Contatos</th>
                <th>Propostas</th>
                <th>Vendas</th>
                <th>Retornos</th>
                <th>Ações de Gerência</th>
              </tr>
            </thead>
            <tbody>
              {data.sellers.map((s) => {
                const prefs = (s.preferences as Record<string, any>) || {};
                const accessCode = prefs["access_code"];
                const sellerLoginEmail = prefs["email"] || "—";

                return (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase">
                          {s.full_name?.slice(0, 2) ?? "VD"}
                        </div>
                        <div>
                          <strong className="block text-sm font-semibold">{s.full_name}</strong>
                          <span className="text-xs text-muted-foreground">{s.job_title ?? "Vendedor Comercial"}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {accessCode ? (
                        <span className="inline-flex items-center gap-1 rounded-sm bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                          <KeyRound size={11} /> {accessCode}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Padrão</span>
                      )}
                      <span className="block text-[11px] text-muted-foreground mt-0.5">{sellerLoginEmail}</span>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          s.status === "active"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {s.status === "active" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="font-semibold">{s.contactsCount}</td>
                    <td className="font-semibold">{s.proposalsCount}</td>
                    <td className="font-semibold text-emerald-600">{s.salesCount}</td>
                    <td className="font-semibold text-amber-600">{s.followupsCount}</td>
                    <td>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => handleCopySellerWhatsApp(s)}
                          title="Copiar dados de acesso para WhatsApp"
                        >
                          <Copy size={11} /> Copiar Acesso
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => {
                            setResetSellerId(s.id);
                            setResetSellerName(s.full_name);
                            setNewPassword("");
                            setShowResetModal(true);
                          }}
                        >
                          <KeyRound size={11} /> Redefinir Senha
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => handleToggleStatus(s.id)}
                        >
                          {s.status === "active" ? "Inativar" : "Ativar"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!data.sellers.length && (
                <tr>
                  <td colSpan={8} className="empty-row text-center py-8">
                    Nenhum vendedor cadastrado ainda. Clique em <b>+ PRÉ-CADASTRAR VENDEDOR</b> para liberar o primeiro acesso.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal: Pre-Register Seller */}
      {showPreRegisterModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <ShieldCheck size={20} className="text-primary" /> Pré-Cadastro de Vendedor
                </h3>
                <p className="text-xs text-muted-foreground">
                  Libere o acesso exclusivo para o vendedor entrar no sistema.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreRegisterModal(false)}
                className="text-muted-foreground hover:text-foreground font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {preRegisteredSuccess ? (
              <div className="space-y-4 py-2">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/30 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                    <Check size={18} /> Vendedor Pré-Cadastrado com Sucesso!
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O vendedor já pode entrar na tela de login utilizando as credenciais abaixo:
                  </p>
                  <div className="rounded-lg bg-background p-3 text-xs space-y-1 font-mono border border-border/80">
                    <div><b>Nome:</b> {preRegisteredSuccess.fullName}</div>
                    <div><b>E-mail:</b> {preRegisteredSuccess.email}</div>
                    <div><b>Código de Vendedor:</b> <span className="text-primary font-bold">{preRegisteredSuccess.code}</span></div>
                    <div><b>Senha Inicial:</b> <span className="text-emerald-600 font-bold">{preRegisteredSuccess.password}</span></div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 justify-end">
                  <Button
                    className="w-full sm:w-auto font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      const text = `🚀 *Acesso Liberado — Instituto Mix Comercial*
Olá, *${preRegisteredSuccess.fullName}*! O seu acesso ao sistema de vendas foi pré-cadastrado pela gerência.

🔗 *Link de Acesso:* ${window.location.origin}/auth
📧 *E-mail:* ${preRegisteredSuccess.email}
🏷️ *Código de Vendedor:* *${preRegisteredSuccess.code}*
🔑 *Senha Inicial:* *${preRegisteredSuccess.password}*

Ao fazer login você acessará diretamente o seu Painel de Vendas!`;
                      navigator.clipboard.writeText(text);
                      toast.success("Mensagem copiada para o WhatsApp!");
                    }}
                  >
                    <MessageSquare size={16} /> Copiar para Enviar no WhatsApp
                  </Button>
                  <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowPreRegisterModal(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePreRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                    Nome Completo do Vendedor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Carlos Alberto"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    className="input-field text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                      E-mail Corporativo *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="carlos@comercial.com"
                      value={sellerEmail}
                      onChange={(e) => setSellerEmail(e.target.value)}
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="text"
                      placeholder="(11) 98888-7777"
                      value={sellerPhone}
                      onChange={(e) => setSellerPhone(e.target.value)}
                      className="input-field text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                      Cargo / Função
                    </label>
                    <input
                      type="text"
                      placeholder="Vendedor Comercial"
                      value={sellerTitle}
                      onChange={(e) => setSellerTitle(e.target.value)}
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                      Equipe / Unidade
                    </label>
                    <select
                      value={sellerTeamId}
                      onChange={(e) => setSellerTeamId(e.target.value)}
                      className="input-field text-sm"
                    >
                      <option value="">Equipe Padrão</option>
                      {data.teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold uppercase text-muted-foreground">
                        Senha Inicial de Acesso *
                      </label>
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        Gerar Automática
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="ex: Vendedor@123"
                      value={sellerPassword}
                      onChange={(e) => setSellerPassword(e.target.value)}
                      className="input-field text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                      Código de Acesso do Vendedor
                    </label>
                    <input
                      type="text"
                      placeholder="ex: VD-1024"
                      value={sellerAccessCode}
                      onChange={(e) => setSellerAccessCode(e.target.value)}
                      className="input-field text-sm font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setShowPreRegisterModal(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={modalBusy} className="font-bold gap-1.5">
                    <ShieldCheck size={16} /> {modalBusy ? "Salvando..." : "Concluir Pré-Cadastro"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Reset Seller Password */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold flex items-center gap-2">
              <KeyRound size={18} className="text-primary" /> Redefinir Senha
            </h3>
            <p className="text-xs text-muted-foreground">
              Defina a nova senha para o vendedor <b>{resetSellerName}</b>:
            </p>
            <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
              <input
                type="text"
                required
                minLength={6}
                placeholder="Nova senha (mínimo 6 caracteres)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field text-sm font-mono"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowResetModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={resetBusy} className="font-bold">
                  {resetBusy ? "Salvando..." : "Salvar Senha"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ==========================================
// 3. DASHBOARD ADMINISTRATIVO
// ==========================================
function AdminDashboard({ data }: { data: NonNullable<ReturnType<typeof useWorkspace>["data"]> }) {
  const totalSales = data.proposals.filter((p) => p.status === "approved");
  const totalRevenue = totalSales.reduce((acc, curr) => acc + Number(curr.final_price), 0);

  return (
    <AppShell
      title="Painel do Administrador"
      subtitle="Visão geral e controle completo da operação comercial e equipe."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/crm">CRM Global</Link>
          </Button>
          <Button asChild>
            <Link to="/configuracoes">Configurações Gerais</Link>
          </Button>
        </div>
      }
    >
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="metric-card">
          <span className="metric-icon text-emerald-600 bg-emerald-50">
            <FileCheck2 size={20} />
          </span>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Faturamento Estimado</p>
            <strong className="text-2xl font-bold">{brl.format(totalRevenue)}</strong>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon text-blue-600 bg-blue-50">
            <Users size={20} />
          </span>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total de Contatos</p>
            <strong className="text-2xl font-bold">{data.students.length}</strong>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon text-purple-600 bg-purple-50">
            <CircleDollarSign size={20} />
          </span>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Propostas Geradas</p>
            <strong className="text-2xl font-bold">{data.proposals.length}</strong>
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon text-teal-600 bg-teal-50">
            <UserCheck size={20} />
          </span>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Vendedores Ativos</p>
            <strong className="text-2xl font-bold">
              {data.sellers.filter((s) => s.status === "active").length}
            </strong>
          </div>
        </article>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="data-panel p-5">
          <h2 className="text-base font-bold mb-4">Acessos Rápidos da Administração</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" className="justify-start h-12" asChild>
              <Link to="/configuracoes">
                <Settings size={18} className="text-primary mr-2" />
                Catálogo de Cursos & Preços
              </Link>
            </Button>
            <Button variant="outline" className="justify-start h-12" asChild>
              <Link to="/configuracoes">
                <Users size={18} className="text-primary mr-2" />
                Gerenciar Equipe & Acessos
              </Link>
            </Button>
            <Button variant="outline" className="justify-start h-12" asChild>
              <Link to="/configuracoes">
                <CircleDollarSign size={18} className="text-primary mr-2" />
                Condições Comerciais & Descontos
              </Link>
            </Button>
            <Button variant="outline" className="justify-start h-12" asChild>
              <Link to="/configuracoes">
                <TrendingUp size={18} className="text-primary mr-2" />
                Gatilhos Comerciais V2
              </Link>
            </Button>
          </div>
        </div>

        <div className="data-panel p-5">
          <h2 className="text-base font-bold mb-4">Resumo da Equipe</h2>
          <div className="space-y-3">
            {data.sellers.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between border-b border-border pb-2 text-sm">
                <div>
                  <strong>{s.full_name}</strong>
                  <span className="text-xs text-muted-foreground block">{s.job_title ?? "Vendedor"}</span>
                </div>
                <div className="text-right">
                  <b className="text-primary">{s.salesCount} vendas</b>
                  <span className="text-xs text-muted-foreground block">{s.proposalsCount} propostas</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function Loading({ text = "Carregando seu ambiente comercial…" }: { text?: string }) {
  return (
    <div className="grid min-h-screen place-items-center text-sm font-medium text-muted-foreground">
      <div className="flex flex-col items-center gap-2">
        <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary animate-pulse">
          <CircleDollarSign size={22} />
        </span>
        {text}
      </div>
    </div>
  );
}
