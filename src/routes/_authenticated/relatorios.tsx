import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
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
    ],
  }),
  component: ReportsPage,
});

type ReportsResult = Awaited<ReturnType<ReturnType<typeof getReportsData>>>;

function ReportsPage() {
  const { data: workspace } = useWorkspace();
  const loadReports = useServerFn(getReportsData);

  const now = new Date();
  const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultEnd = now.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [sellerFilter, setSellerFilter] = useState("");
  const [reports, setReports] = useState<ReportsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const result = await loadReports({
        data: {
          startDate,
          endDate,
          sellerId: sellerFilter || undefined,
        },
      });
      setReports(result);
      setLoaded(true);
    } catch (err: any) {
      setErrorMsg(err?.message || "Erro ao carregar relatórios.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, sellerFilter, loadReports]);

  // Auto-load on first render
  if (!loaded && !loading && !errorMsg) {
    fetchReports();
  }

  if (!workspace) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Carregando…</div>;

  const { isSeller, isManager } = workspace;

  const s = reports?.summary;

  const kpis = s
    ? [
        {
          label: "Faturamento Total",
          value: brl.format(s.totalRevenue),
          icon: CircleDollarSign,
          color: "text-emerald-700 bg-emerald-100",
          highlight: true,
        },
        {
          label: "Matrículas (Fechadas)",
          value: s.closedProposals,
          icon: Trophy,
          color: "text-emerald-600 bg-emerald-50",
        },
        {
          label: "Propostas Geradas",
          value: s.totalProposals,
          icon: FileText,
          color: "text-blue-600 bg-blue-50",
        },
        {
          label: "Taxa de Conversão",
          value: `${s.conversionRate}%`,
          icon: Percent,
          color: s.conversionRate >= 50 ? "text-emerald-700 bg-emerald-100" : s.conversionRate >= 25 ? "text-amber-700 bg-amber-100" : "text-destructive bg-destructive/10",
        },
        {
          label: "Ticket Médio",
          value: brl.format(s.avgTicket),
          icon: TrendingUp,
          color: "text-primary bg-primary/10",
        },
        {
          label: "Desconto Total Dado",
          value: brl.format(s.totalDiscountGiven),
          icon: Target,
          color: "text-orange-700 bg-orange-100",
        },
        {
          label: "Novos Contatos",
          value: s.newContacts,
          icon: Users,
          color: "text-indigo-600 bg-indigo-50",
        },
        {
          label: "Retornos Realizados",
          value: `${s.completedFollowups}/${s.totalFollowups}`,
          icon: CalendarClock,
          color: "text-purple-600 bg-purple-50",
        },
        {
          label: "Interações Registradas",
          value: s.totalInteractions,
          icon: MessageSquare,
          color: "text-teal-600 bg-teal-50",
        },
      ]
    : [];

  return (
    <AppShell
      title="Relatórios Comerciais"
      subtitle={isSeller ? "Seu desempenho individual no período." : "Análise de conversão, faturamento e ranking da equipe."}
      actions={
        <Button size="sm" className="gap-1.5 font-bold" onClick={fetchReports} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          {loading ? "Atualizando..." : "Atualizar"}
        </Button>
      }
    >
      {/* Filters */}
      <section className="rounded-xl border border-border bg-card p-4 mb-6 shadow-xs">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Data Início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field h-9 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Data Fim</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field h-9 text-sm"
            />
          </div>
          {!isSeller && (
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Filtrar por Vendedor</label>
              <select
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
                className="input-field h-9 text-sm w-48"
              >
                <option value="">Todos os Vendedores</option>
                {workspace.sellers
                  .filter((s) => s.role === "seller")
                  .map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
              </select>
            </div>
          )}
          <Button onClick={fetchReports} disabled={loading} className="gap-1.5 h-9">
            <Filter size={14} /> {loading ? "Filtrando..." : "Filtrar"}
          </Button>
        </div>
      </section>

      {errorMsg && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{errorMsg}</div>
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
          {/* KPI Cards */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 mb-6">
            {kpis.map((k) => {
              const Icon = k.icon;
              return (
                <article key={k.label} className="metric-card flex-col items-start justify-between min-h-[6.5rem] p-4 shadow-xs">
                  <div className="flex items-center justify-between w-full">
                    <span className={`grid size-9 place-items-center rounded-lg ${k.color}`}>
                      <Icon size={18} />
                    </span>
                    <strong className={`font-extrabold ${k.highlight ? "text-emerald-700 dark:text-emerald-400 text-lg" : "text-2xl text-foreground"}`}>
                      {k.value}
                    </strong>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">{k.label}</p>
                </article>
              );
            })}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Ranking por Vendedor (Admin/Manager only) */}
            {!isSeller && reports.sellerBreakdown.length > 0 && (
              <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Trophy size={18} className="text-amber-500" />
                    Ranking de Vendedores
                  </h3>
                  <span className="text-xs text-muted-foreground">{startDate} → {endDate}</span>
                </div>
                <div className="overflow-x-auto">
                  <table>
                    <thead>
                      <tr>
                        <th>Pos.</th>
                        <th>Vendedor</th>
                        <th>Propostas</th>
                        <th>Matrículas</th>
                        <th>Conversão</th>
                        <th>Faturamento</th>
                        <th>Contatos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.sellerBreakdown.map((seller, idx) => (
                        <tr key={seller.id}>
                          <td>
                            <span className={`font-bold text-sm ${idx === 0 ? "text-amber-500" : idx === 1 ? "text-slate-400" : idx === 2 ? "text-orange-500" : "text-muted-foreground"}`}>
                              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}º`}
                            </span>
                          </td>
                          <td>
                            <strong className="text-sm font-semibold">{seller.name}</strong>
                            <span className={`ml-1.5 status-pill ${seller.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                              {seller.status === "active" ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td className="text-center font-semibold">{seller.proposals}</td>
                          <td>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">{seller.closed}</span>
                          </td>
                          <td>
                            <span className={`font-semibold ${seller.conversion >= 50 ? "text-emerald-700" : seller.conversion >= 25 ? "text-amber-700" : "text-destructive"}`}>
                              {seller.conversion}%
                            </span>
                          </td>
                          <td>
                            <strong className="text-primary">{brl.format(seller.revenue)}</strong>
                          </td>
                          <td className="text-muted-foreground">{seller.newContacts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Cursos Mais Vendidos */}
            {reports.byCourse.length > 0 && (
              <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Target size={18} className="text-primary" />
                    Cursos Mais Vendidos
                  </h3>
                </div>
                <div className="p-5 space-y-3">
                  {reports.byCourse.map((course, idx) => {
                    const maxCount = reports.byCourse[0]?.count ?? 1;
                    const pct = Math.round((course.count / maxCount) * 100);
                    return (
                      <div key={idx}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-foreground">{course.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">{course.count} matrícula{course.count !== 1 ? "s" : ""}</span>
                            <strong className="text-primary">{brl.format(course.revenue)}</strong>
                          </div>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Formas de Pagamento */}
            {reports.byPaymentMethod.length > 0 && (
              <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <CircleDollarSign size={18} className="text-emerald-600" />
                    Por Forma de Pagamento
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table>
                    <thead>
                      <tr>
                        <th>Forma de Pagamento</th>
                        <th>Matrículas</th>
                        <th>Receita</th>
                        <th>% do Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.byPaymentMethod.map((m, idx) => {
                        const totalClosed = reports.summary.closedProposals || 1;
                        const pct = Math.round((m.count / totalClosed) * 100);
                        return (
                          <tr key={idx}>
                            <td className="font-medium">{m.name}</td>
                            <td className="font-semibold text-center">{m.count}</td>
                            <td><strong className="text-primary">{brl.format(m.revenue)}</strong></td>
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Timeline diária */}
            {reports.dailyTimeline.length > 0 && (
              <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <TrendingUp size={18} className="text-indigo-600" />
                    Propostas por Dia
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Propostas</th>
                        <th>Matrículas</th>
                        <th>Receita do Dia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.dailyTimeline.slice().reverse().map((day) => (
                        <tr key={day.date}>
                          <td className="font-medium text-xs">
                            {new Date(day.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", weekday: "short" })}
                          </td>
                          <td className="text-center font-semibold">{day.proposals}</td>
                          <td>
                            <span className={`font-bold ${day.closed > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>
                              {day.closed}
                            </span>
                          </td>
                          <td>
                            {day.revenue > 0 ? (
                              <strong className="text-primary text-sm">{brl.format(day.revenue)}</strong>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {reports.dailyTimeline.length === 0 && reports.byCourse.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground mt-4">
              <TrendingUp size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum dado encontrado para o período e filtros selecionados.</p>
              <p className="text-xs mt-1">Ajuste as datas ou o filtro de vendedor e clique em Filtrar.</p>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
