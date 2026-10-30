import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  TrendingUp,
  CircleDollarSign,
  FileText,
  Users,
  Target,
  Percent,
  CalendarClock,
  MessageSquare,
  Trophy,
  RefreshCw,
  Filter,
  Clock,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { brl, useWorkspace } from "@/lib/use-workspace";
import { getReportsData } from "@/lib/crm.functions";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios Comerciais — Instituto Mix" },
      { name: "description", content: "Análise de conversão, faturamento e desempenho da equipe comercial." },
      { property: "og:title", content: "Relatórios Comerciais — Instituto Mix" },
      { property: "og:description", content: "Análise de conversão, faturamento e desempenho da equipe comercial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

type ReportsResult = Awaited<ReturnType<typeof getReportsData>>;

type PeriodPreset = "today" | "week" | "month" | "custom";

export function ReportsPage() {
  const { data: workspace } = useWorkspace();
  const loadReports = useServerFn(getReportsData);

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("month");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [sellerFilter, setSellerFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [reports, setReports] = useState<ReportsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Preset selector
  function applyPreset(preset: PeriodPreset) {
    setPeriodPreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "week") {
      // Começo da semana (segunda-feira)
      const d = new Date(today);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === "month") {
      const firstDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
      setStartDate(firstDay);
      setEndDate(todayStr);
    }
  }

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const result = await loadReports({
        data: {
          startDate,
          endDate,
          sellerId: sellerFilter || undefined,
          teamId: teamFilter || undefined,
        },
      });
      setReports(result);
      setLoaded(true);
    } catch (err: any) {
      setErrorMsg(err?.message || "Erro ao carregar relatórios.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, sellerFilter, teamFilter, loadReports]);

  // Auto-fetch on change
  useEffect(() => {
    fetchReports();
  }, [startDate, endDate, sellerFilter, teamFilter]);

  if (!workspace) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Carregando…</div>;

  const { isSeller, isManager, isAdmin } = workspace;
  const s = reports?.summary;

  const kpis = s
    ? [
        {
          label: "Faturamento Efetivo Recebido",
          value: brl.format(s.effectiveRevenue ?? s.totalRevenue),
          subtitle: `Projetado: ${brl.format(s.projectedRevenue ?? s.totalRevenue)}`,
          icon: CircleDollarSign,
          color: "text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60",
          highlight: true,
        },
        {
          label: "Taxa de Conversão",
          value: `${s.conversionRate}%`,
          subtitle: `${s.closedProposals} matrículas de ${s.totalProposals} propostas`,
          icon: Percent,
          color: s.conversionRate >= 50 ? "text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60" : s.conversionRate >= 25 ? "text-amber-700 bg-amber-100 dark:bg-amber-950/60" : "text-destructive bg-destructive/10",
        },
        {
          label: "Ticket Médio",
          value: brl.format(s.avgTicket),
          subtitle: "Por aluno matriculado",
          icon: TrendingUp,
          color: "text-primary bg-primary/10",
        },
        {
          label: "Tempo Médio de Fechamento",
          value: `${s.avgClosingTimeHours || 24}h`,
          subtitle: "Do 1º contato ao contrato",
          icon: Clock,
          color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60",
        },
        {
          label: "Matrículas Comerciais Recebidas",
          value: brl.format(s.enrollmentRevenue ?? 0),
          subtitle: "Taxas de entrada pagas",
          icon: Trophy,
          color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60",
        },
        {
          label: "Descontos Concedidos",
          value: brl.format(s.totalDiscountGiven),
          subtitle: "Condições especiais autorizadas",
          icon: Target,
          color: "text-orange-700 bg-orange-100 dark:bg-orange-950/60",
        },
        {
          label: "Novos Contatos Cadastrados",
          value: s.newContacts,
          subtitle: "Leads entrantes no funil",
          icon: Users,
          color: "text-blue-600 bg-blue-50 dark:bg-blue-950/60",
        },
        {
          label: "Retornos Realizados",
          value: `${s.completedFollowups}/${s.totalFollowups}`,
          subtitle: "Acompanhamentos concluídos",
          icon: CalendarClock,
          color: "text-purple-600 bg-purple-50 dark:bg-purple-950/60",
        },
        {
          label: "Interações Registradas",
          value: s.totalInteractions,
          subtitle: "Ligações, WhatsApp e visitas",
          icon: MessageSquare,
          color: "text-teal-600 bg-teal-50 dark:bg-teal-950/60",
        },
      ]
    : [];

  return (
    <AppShell
      title="Relatórios & Performance Comercial"
      subtitle={isSeller ? "Seu desempenho individual e taxa de conversão." : "Indicadores de faturamento, conversão da equipe e análise de perdas."}
      actions={
        <Button size="sm" className="gap-1.5 font-bold" onClick={fetchReports} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          {loading ? "Atualizando..." : "Atualizar"}
        </Button>
      }
    >
      {/* ── Barra de Filtros Avançados & Presets de Período ── */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5 mb-6 shadow-xs space-y-4">
        {/* Presets Rápidos */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Calendar size={14} className="text-primary" />
            <span>Período:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="xs"
              variant={periodPreset === "today" ? "default" : "outline"}
              onClick={() => applyPreset("today")}
              className="text-xs font-semibold"
            >
              Hoje
            </Button>
            <Button
              size="xs"
              variant={periodPreset === "week" ? "default" : "outline"}
              onClick={() => applyPreset("week")}
              className="text-xs font-semibold"
            >
              Esta Semana
            </Button>
            <Button
              size="xs"
              variant={periodPreset === "month" ? "default" : "outline"}
              onClick={() => applyPreset("month")}
              className="text-xs font-semibold"
            >
              Este Mês
            </Button>
            <Button
              size="xs"
              variant={periodPreset === "custom" ? "default" : "outline"}
              onClick={() => setPeriodPreset("custom")}
              className="text-xs font-semibold"
            >
              Intervalo Customizado
            </Button>
          </div>
        </div>

        {/* Inputs de Data e Seletores de Equipe/Vendedor */}
        <div className="flex flex-wrap items-end gap-3 text-xs">
          <div>
            <label className="block font-semibold uppercase text-muted-foreground mb-1">Data Início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriodPreset("custom");
              }}
              className="input-field h-9 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold uppercase text-muted-foreground mb-1">Data Fim</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodPreset("custom");
              }}
              className="input-field h-9 text-xs"
            />
          </div>

          {!isSeller && (
            <>
              {workspace.teams && workspace.teams.length > 0 && (
                <div>
                  <label className="block font-semibold uppercase text-muted-foreground mb-1">Filtrar Equipe</label>
                  <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    className="input-field h-9 text-xs w-44"
                  >
                    <option value="">Todas as Equipes</option>
                    {workspace.teams.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold uppercase text-muted-foreground mb-1">Filtrar Vendedor</label>
                <select
                  value={sellerFilter}
                  onChange={(e) => setSellerFilter(e.target.value)}
                  className="input-field h-9 text-xs w-48"
                >
                  <option value="">Todos os Vendedores</option>
                  {workspace.sellers
                    .filter((s) => s.role === "seller")
                    .map((s) => (
                      <option key={s.id} value={s.id}>{s.full_name}</option>
                    ))}
                </select>
              </div>
            </>
          )}

          <Button onClick={fetchReports} disabled={loading} className="gap-1.5 h-9 font-bold text-xs">
            <Filter size={13} /> {loading ? "Filtrando..." : "Filtrar"}
          </Button>
        </div>
      </section>

      {errorMsg && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-xs font-semibold text-destructive">
          {errorMsg}
        </div>
      )}

      {loading && !loaded && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 mb-6">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {loaded && reports && (
        <>
          {/* ── Seção 1: Indicadores Chave (KPIs) ── */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 mb-6">
            {kpis.map((k) => {
              const Icon = k.icon;
              return (
                <article key={k.label} className="metric-card flex-col items-start justify-between min-h-[6.5rem] p-4 shadow-xs">
                  <div className="flex items-center justify-between w-full">
                    <span className={`grid size-9 place-items-center rounded-lg ${k.color}`}>
                      <Icon size={18} />
                    </span>
                    <strong className={`font-extrabold ${k.highlight ? "text-emerald-700 dark:text-emerald-400 text-xl sm:text-2xl" : "text-xl sm:text-2xl text-foreground"}`}>
                      {k.value}
                    </strong>
                  </div>
                  <div className="mt-2 text-left">
                    <p className="text-xs font-bold text-foreground">{k.label}</p>
                    {k.subtitle && <p className="text-[11px] text-muted-foreground">{k.subtitle}</p>}
                  </div>
                </article>
              );
            })}
          </section>

          {/* ── Seção 2: Análise de Perdas & Ranking ── */}
          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            {/* Análise de Motivos de Perda */}
            <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/20">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <AlertTriangle size={18} className="text-rose-500" />
                  Análise de Perdas Comerciais
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                  {reports.summary.totalLosses || 0} oportunidades perdidas
                </span>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Principais motivos apontados pelos vendedores nas propostas não convertidas:
                </p>

                {reports.lossReasons && reports.lossReasons.length > 0 ? (
                  reports.lossReasons.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-medium">{item.count} perda{item.count !== 1 ? "s" : ""}</span>
                          <strong className="text-rose-600 font-bold">{item.percentage}%</strong>
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-rose-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(5, item.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-xs text-muted-foreground py-6">
                    Nenhum motivo de perda registrado no período.
                  </div>
                )}
              </div>
            </div>

            {/* Ranking de Vendedores (Gestores / Admin) */}
            {!isSeller && reports.sellerBreakdown.length > 0 && (
              <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/20">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Trophy size={18} className="text-amber-500" />
                    Ranking de Conversão da Equipe
                  </h3>
                  <span className="text-xs text-muted-foreground">{startDate} → {endDate}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2.5 text-left">Pos.</th>
                        <th className="px-3 py-2.5 text-left">Vendedor</th>
                        <th className="px-3 py-2.5 text-center">Matrículas</th>
                        <th className="px-3 py-2.5 text-center">Conversão</th>
                        <th className="px-3 py-2.5 text-right">Ticket Médio</th>
                        <th className="px-3 py-2.5 text-right">Faturamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reports.sellerBreakdown.map((seller, idx) => (
                        <tr key={seller.id} className="hover:bg-muted/20">
                          <td className="px-3 py-2.5">
                            <span className="font-bold text-sm">
                              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}º`}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <strong className="text-xs font-semibold text-foreground">{seller.name}</strong>
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-emerald-700 dark:text-emerald-400">
                            {seller.closed}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`font-semibold ${seller.conversion >= 50 ? "text-emerald-700" : seller.conversion >= 25 ? "text-amber-700" : "text-destructive"}`}>
                              {seller.conversion}%
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                            {brl.format(seller.avgTicket)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-primary tabular-nums">
                            {brl.format(seller.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Seção 3: Cursos e Formas de Pagamento com Ticket Médio ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Cursos Mais Vendidos com Ticket Médio */}
            {reports.byCourse.length > 0 && (
              <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/20">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Target size={18} className="text-primary" />
                    Desempenho & Ticket Médio por Curso
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Curso</th>
                        <th className="px-4 py-2.5 text-center">Matrículas</th>
                        <th className="px-4 py-2.5 text-right">Ticket Médio</th>
                        <th className="px-4 py-2.5 text-right">Receita Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reports.byCourse.map((course: any, idx: number) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-semibold text-foreground">{course.name}</td>
                          <td className="px-4 py-2.5 text-center font-bold text-emerald-700 dark:text-emerald-400">
                            {course.count}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium text-muted-foreground">
                            {brl.format(course.avgTicket || (course.revenue / course.count))}
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-primary tabular-nums">
                            {brl.format(course.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modalidades de Pagamento com Ticket Médio */}
            {reports.byPaymentMethod.length > 0 && (
              <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/20">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <CircleDollarSign size={18} className="text-emerald-600" />
                    Modalidades de Pagamento & Ticket Médio
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Forma de Pagamento</th>
                        <th className="px-4 py-2.5 text-center">Matrículas</th>
                        <th className="px-4 py-2.5 text-right">Ticket Médio</th>
                        <th className="px-4 py-2.5 text-right">Receita Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reports.byPaymentMethod.map((m: any, idx: number) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-semibold text-foreground">{m.name}</td>
                          <td className="px-4 py-2.5 text-center font-bold text-emerald-700 dark:text-emerald-400">
                            {m.count}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium text-muted-foreground">
                            {brl.format(m.avgTicket || (m.revenue / m.count))}
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-primary tabular-nums">
                            {brl.format(m.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
