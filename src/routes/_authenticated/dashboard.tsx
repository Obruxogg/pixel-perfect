import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarClock,
  CircleDollarSign,
  Contact,
  Handshake,
  UserCheck,
  UserMinus,
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
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useWorkspace, brl, dateTime, dateOnly, timeOnly, formatPhone } from "@/lib/use-workspace";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Visão geral — Nexo Comercial" },
      { name: "description", content: "Indicadores, propostas e retornos da operação comercial." },
      { property: "og:title", content: "Visão geral — Nexo Comercial" },
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

  const { isSeller, isManager, isAdmin, profile } = data;

  if (isSeller) {
    return <SellerDashboard data={data} />;
  }

  if (isManager) {
    return <ManagerDashboard data={data} />;
  }

  return <AdminDashboard data={data} />;
}

// ==========================================
// 1. DASHBOARD DO VENDEDOR (Requirement 6)
// ==========================================
function SellerDashboard({ data }: { data: NonNullable<ReturnType<typeof useWorkspace>["data"]> }) {
  const firstName = data.profile?.full_name?.split(" ")[0] ?? "Vendedor";
  const now = Date.now();
  const todayStr = new Date().toDateString();

  // Metrics
  const myStudents = data.students.filter((s) => s.owner_id === data.userId || !s.owner_id);
  const myProposals = data.proposals.filter((p) => p.seller_id === data.userId);
  const myFollowups = data.followups.filter((f) => f.seller_id === data.userId);

  const openProposals = myProposals.filter((p) => ["sent", "viewed", "negotiation"].includes(p.status));
  const awaitingResponse = myProposals.filter((p) => p.status === "awaiting_response");
  const closedSales = myProposals.filter((p) => p.status === "approved");
  const deferSales = myProposals.filter((p) => p.status === "awaiting_response");

  const todayFollowups = myFollowups.filter((f) => new Date(f.due_at).toDateString() === todayStr && f.status === "pending");
  const overdueFollowups = myFollowups.filter((f) => new Date(f.due_at).getTime() < now && f.status === "pending");

  const sellerCards = [
    { label: "Novos Contatos", value: myStudents.length, icon: Users, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40" },
    { label: "Propostas Abertas", value: openProposals.length, icon: CircleDollarSign, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" },
    { label: "Aguardando Resposta", value: awaitingResponse.length, icon: Handshake, color: "text-violet-600 bg-violet-50 dark:bg-violet-950/40" },
    {
      label: "Retornos Hoje",
      value: todayFollowups.length,
      icon: CalendarClock,
      color: todayFollowups.length > 0 ? "text-amber-700 bg-amber-100 font-bold" : "text-muted-foreground bg-muted",
    },
    {
      label: "Retornos Atrasados",
      value: overdueFollowups.length,
      icon: AlertCircle,
      color: overdueFollowups.length > 0 ? "text-destructive bg-destructive/15 font-bold" : "text-muted-foreground bg-muted",
    },
    { label: "Vendas Fechadas", value: closedSales.length, icon: UserCheck, color: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40" },
    { label: "Vendas p/ Depois", value: deferSales.length, icon: Clock3, color: "text-cyan-700 bg-cyan-50 dark:bg-cyan-950/40" },
  ];

  return (
    <AppShell
      title={`Olá, ${firstName}!`}
      subtitle="Aqui está o ritmo do seu atendimento e suas prioridades comerciais."
      actions={
        <Button size="lg" className="gap-2 font-bold shadow-md text-base" asChild>
          <Link to="/simulacao">
            <Plus size={20} />
            + CRIAR NOVA PROPOSTA
          </Link>
        </Button>
      }
    >
      {/* Big Highlight CTA */}
      <div className="mb-8 rounded-xl border-2 border-primary/30 bg-primary/5 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary uppercase tracking-wide">
            Ação Rápida
          </span>
          <h2 className="mt-2 text-2xl font-bold">Pronto para atender um novo aluno?</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Simule valores em tempo real, apresente a condição comercial na tela do aluno e feche agora ou agende o retorno.
          </p>
        </div>
        <Button size="lg" className="h-12 px-6 font-bold shadow-md text-base shrink-0" asChild>
          <Link to="/simulacao">
            + CRIAR NOVA PROPOSTA <ArrowRight size={18} />
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <section className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {sellerCards.map((c) => {
          const Icon = c.icon;
          return (
            <article key={c.label} className="metric-card flex-col items-start justify-between min-h-[6.5rem] p-3.5">
              <div className="flex items-center justify-between w-full">
                <span className={`grid size-8 place-items-center rounded-md ${c.color}`}>
                  <Icon size={18} />
                </span>
                <strong className="text-2xl font-bold">{c.value}</strong>
              </div>
              <p className="mt-2 text-xs font-medium text-muted-foreground">{c.label}</p>
            </article>
          );
        })}
      </section>

      {/* Bottom Grid: Minhas Propostas Recentes & Próximos Retornos */}
      <section className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* Minhas Propostas Recentes */}
        <div>
          <div className="section-title">
            <div>
              <h2 className="text-lg font-bold">Minhas Propostas Recentes</h2>
              <p>Últimas condições comerciais apresentadas</p>
            </div>
            <Link to="/propostas" className="text-xs font-semibold text-primary hover:underline">
              Ver todas ({myProposals.length})
            </Link>
          </div>

          <div className="data-panel overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Curso</th>
                  <th>Original</th>
                  <th>Desconto</th>
                  <th>Final</th>
                  <th>Status</th>
                  <th>Validade</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {myProposals.slice(0, 6).map((p) => {
                  const student = data.students.find((s) => s.id === p.student_id);
                  const isApproved = p.status === "approved";
                  const isAwaiting = p.status === "awaiting_response";
                  const discountAmt = Number(p.discount_amount);

                  return (
                    <tr key={p.id}>
                      <td>
                        <strong className="block font-medium">{student?.full_name ?? "Contato"}</strong>
                        <span className="text-xs text-muted-foreground">{formatPhone(student?.whatsapp)}</span>
                      </td>
                      <td className="text-xs font-medium">{p.course_name}</td>
                      <td className="text-xs text-muted-foreground line-through">
                        {brl.format(Number(p.original_price))}
                      </td>
                      <td className="text-xs font-semibold text-emerald-600">
                        {discountAmt > 0 ? `− ${brl.format(discountAmt)}` : "—"}
                      </td>
                      <td>
                        <strong className="text-sm font-bold text-primary">
                          {brl.format(Number(p.final_price))}
                        </strong>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            isApproved
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60"
                              : isAwaiting
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {p.status === "approved"
                            ? "Matriculado"
                            : p.status === "awaiting_response"
                            ? "Aguardando Retorno"
                            : p.status}
                        </span>
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {p.valid_until ? dateTime.format(new Date(p.valid_until)) : "—"}
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {dateOnly.format(new Date(p.created_at))}
                      </td>
                    </tr>
                  );
                })}
                {!myProposals.length && (
                  <tr>
                    <td colSpan={8} className="empty-row text-center">
                      Nenhuma proposta criada ainda. Clique em <b>+ CRIAR NOVA PROPOSTA</b> para começar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Próximos Retornos */}
        <div>
          <div className="section-title">
            <div>
              <h2 className="text-lg font-bold">Retornos Agendados</h2>
              <p>Alunos que pediram para falar depois</p>
            </div>
            <Link to="/crm" className="text-xs font-semibold text-primary hover:underline">
              Ir para CRM
            </Link>
          </div>

          <div className="space-y-3">
            {myFollowups
              .filter((f) => f.status === "pending")
              .slice(0, 5)
              .map((f) => {
                const student = data.students.find((s) => s.id === f.student_id);
                const isOverdue = new Date(f.due_at).getTime() < now;
                const isToday = new Date(f.due_at).toDateString() === todayStr;

                return (
                  <div
                    key={f.id}
                    className={`rounded-lg border p-3.5 transition-colors ${
                      isOverdue
                        ? "border-destructive/40 bg-destructive/5"
                        : isToday
                        ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <strong className="block text-sm font-semibold">{student?.full_name ?? "Contato"}</strong>
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <PhoneCall size={12} /> {formatPhone(student?.whatsapp)}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-bold ${
                          isOverdue
                            ? "bg-destructive text-destructive-foreground"
                            : isToday
                            ? "bg-amber-500 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isOverdue ? "Atrasado" : isToday ? "Hoje" : dateOnly.format(new Date(f.due_at))}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between border-t border-border/60 pt-2 text-xs text-muted-foreground">
                      <span>Horário: <b>{timeOnly.format(new Date(f.due_at))}</b></span>
                      {student?.whatsapp && (
                        <a
                          href={`https://wa.me/55${student.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Chamar no WhatsApp <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    {f.notes && <p className="mt-1.5 text-xs italic text-muted-foreground">"{f.notes}"</p>}
                  </div>
                );
              })}
            {!myFollowups.some((f) => f.status === "pending") && (
              <div className="empty-state">Nenhum retorno agendado pendente no momento.</div>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

// ==========================================
// 2. PAINEL DO GERENTE (Requirement 3)
// ==========================================
function ManagerDashboard({ data }: { data: NonNullable<ReturnType<typeof useWorkspace>["data"]> }) {
  const now = Date.now();
  const todayStr = new Date().toDateString();

  const activeSellers = data.sellers.filter((s) => s.status === "active");
  const inactiveSellers = data.sellers.filter((s) => s.status === "inactive");
  const activeContacts = data.students.filter((s) => s.status === "active");
  const newContacts = data.students.filter((s) => {
    const ageHours = (now - new Date(s.created_at).getTime()) / (1000 * 3600);
    return ageHours <= 48;
  });

  const openProposals = data.proposals.filter((p) => ["sent", "viewed", "negotiation"].includes(p.status));
  const awaitingResponse = data.proposals.filter((p) => p.status === "awaiting_response");
  const todayFollowups = data.followups.filter((f) => new Date(f.due_at).toDateString() === todayStr && f.status === "pending");
  const overdueFollowups = data.followups.filter((f) => new Date(f.due_at).getTime() < now && f.status === "pending");
  const closedSales = data.proposals.filter((p) => p.status === "approved");
  const deferSales = data.proposals.filter((p) => p.status === "awaiting_response");
  const expiredProposals = data.proposals.filter((p) => {
    return p.valid_until && new Date(p.valid_until).getTime() < now && !["approved", "refused"].includes(p.status);
  });

  // Configurable 11 Manager Indicators
  const managerIndicators = [
    { label: "Vendedores Ativos", value: activeSellers.length, icon: UserCheck, color: "text-blue-600 bg-blue-50" },
    { label: "Vendedores Inativos", value: inactiveSellers.length, icon: UserX, color: "text-muted-foreground bg-muted" },
    { label: "Contatos Ativos", value: activeContacts.length, icon: Users, color: "text-teal-600 bg-teal-50" },
    { label: "Novos Contatos (48h)", value: newContacts.length, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
    { label: "Propostas Abertas", value: openProposals.length, icon: CircleDollarSign, color: "text-amber-600 bg-amber-50" },
    { label: "Aguardando Resposta", value: awaitingResponse.length, icon: Handshake, color: "text-purple-600 bg-purple-50" },
    { label: "Retornos Hoje", value: todayFollowups.length, icon: CalendarClock, color: "text-amber-700 bg-amber-100 font-bold" },
    { label: "Retornos Atrasados", value: overdueFollowups.length, icon: AlertCircle, color: "text-destructive bg-destructive/15 font-bold" },
    { label: "Vendas Fechadas", value: closedSales.length, icon: FileCheck2, color: "text-emerald-700 bg-emerald-100 font-bold" },
    { label: "Vendas p/ Retorno", value: deferSales.length, icon: Clock3, color: "text-cyan-700 bg-cyan-50" },
    { label: "Propostas Expiradas", value: expiredProposals.length, icon: UserMinus, color: "text-rose-700 bg-rose-50" },
  ];

  return (
    <AppShell
      title="Painel do Gerente"
      subtitle="Visão centralizada da equipe de vendas, carteira e indicadores comerciais."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/crm">CRM da Equipe</Link>
          </Button>
          <Button asChild>
            <Link to="/configuracoes">Gerenciar Vendedores</Link>
          </Button>
        </div>
      }
    >
      {/* Manager Indicators Grid */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {managerIndicators.map((ind) => {
          const Icon = ind.icon;
          return (
            <article key={ind.label} className="metric-card flex-col items-start justify-between min-h-[6.5rem] p-3.5">
              <div className="flex items-center justify-between w-full">
                <span className={`grid size-8 place-items-center rounded-md ${ind.color}`}>
                  <Icon size={18} />
                </span>
                <strong className="text-2xl font-bold">{ind.value}</strong>
              </div>
              <p className="mt-2 text-xs font-medium text-muted-foreground">{ind.label}</p>
            </article>
          );
        })}
      </section>

      {/* Team Breakdown Section */}
      <section className="mt-8 space-y-6">
        <div className="section-title">
          <div>
            <h2 className="text-lg font-bold">Equipe de Vendedores</h2>
            <p>Acompanhamento individual de carteira e propostas</p>
          </div>
          <Link to="/configuracoes" className="text-xs font-semibold text-primary hover:underline">
            Gerenciar equipe & credenciais →
          </Link>
        </div>

        <div className="data-panel overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Vendedor</th>
                <th>Cargo / Equipe</th>
                <th>Status</th>
                <th>Contatos</th>
                <th>Propostas</th>
                <th>Vendas</th>
                <th>Retornos</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.sellers.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="grid size-7 place-items-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase">
                        {s.full_name?.slice(0, 2) ?? "VD"}
                      </div>
                      <div>
                        <strong className="block text-sm font-semibold">{s.full_name}</strong>
                        <span className="text-xs text-muted-foreground">{formatPhone(s.phone)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="text-xs text-muted-foreground">{s.job_title ?? "Vendedor Comercial"}</td>
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
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/crm">Ver Carteira</Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {!data.sellers.length && (
                <tr>
                  <td colSpan={8} className="empty-row">
                    Nenhum vendedor cadastrado. Acesse <b>Gerenciar Vendedores</b> para adicionar o primeiro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
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
            {data.sellers.slice(0, 4).map((s) => (
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
