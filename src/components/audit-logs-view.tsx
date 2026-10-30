import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ShieldCheck,
  Search,
  Filter,
  ArrowRightLeft,
  RefreshCw,
  Clock,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { dateTime, dateOnly, timeOnly } from "@/lib/use-workspace";
import { getAuditLogs } from "@/lib/crm.functions";

export function AuditLogsView() {
  const loadLogs = useServerFn(getAuditLogs);
  const [logs, setLogs] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  async function fetchLogs() {
    setLoading(true);
    setError("");
    try {
      const res = await loadLogs({ data: { limit: 100 } });
      setLogs(res.logs || []);
      setAssignments(res.assignments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar logs de auditoria.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== "all") {
      if (filterAction === "enrollment" && !log.action.includes("enrollment")) return false;
      if (filterAction === "discount" && !log.action.includes("discount") && !log.action.includes("price")) return false;
      if (filterAction === "assignment" && !log.action.includes("assign")) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAction = (log.action || "").toLowerCase().includes(q);
      const matchUser = (log.user_name || "").toLowerCase().includes(q);
      const matchEntity = (log.entity_type || "").toLowerCase().includes(q);
      if (!matchAction && !matchUser && !matchEntity) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 text-left">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-xs">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary" />
            Visão de Auditoria Comercial & Segurança
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rastreamento de alterações em taxas de matrícula, concessão de descontos e reatribuição de leads.
          </p>
        </div>

        <Button size="sm" variant="outline" onClick={fetchLogs} disabled={loading} className="gap-1.5 self-start sm:self-auto font-semibold">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Atualizando..." : "Atualizar Logs"}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[14rem]">
          <Search size={15} className="absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por usuário, ação ou entidade..."
            className="input-field pl-9 h-9 text-xs"
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="input-field h-9 text-xs w-52"
        >
          <option value="all">Todas as Ações</option>
          <option value="enrollment">Alterações de Matrícula</option>
          <option value="discount">Descontos & Preços</option>
          <option value="assignment">Reatribuição de Carteira</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-xs font-semibold text-destructive">
          {error}
        </div>
      )}

      {/* Tabela de Logs de Auditoria */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
            Logs Recentes de Auditoria ({filteredLogs.length})
          </span>
          <span className="text-xs text-muted-foreground">Últimos 100 registros</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Carregando logs de auditoria...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Nenhum registro de auditoria encontrado para o filtro selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Data e Hora</th>
                  <th className="px-4 py-3 text-left">Usuário Responsável</th>
                  <th className="px-4 py-3 text-left">Ação Realizada</th>
                  <th className="px-4 py-3 text-left">Entidade</th>
                  <th className="px-4 py-3 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const hasDetails = log.old_data || log.new_data;

                  return (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap text-muted-foreground">
                        {dateTime.format(new Date(log.created_at))}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <User size={13} className="text-primary" />
                          {log.user_name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-sm font-semibold text-[11px] bg-primary/10 text-primary">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)})` : ""}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {hasDetails ? (
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="text-primary hover:underline font-semibold inline-flex items-center gap-1 text-[11px]"
                          >
                            {isExpanded ? "Ocultar" : "Ver Valores"}
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bloco Expandido de Detalhes de Valores (se selecionado) */}
      {expandedLogId && (
        (() => {
          const selLog = logs.find((l) => l.id === expandedLogId);
          if (!selLog) return null;
          return (
            <div className="rounded-xl border border-primary/30 bg-muted/40 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <strong className="text-foreground">
                  Comparativo de Valores da Ação: {selLog.action}
                </strong>
                <button
                  type="button"
                  onClick={() => setExpandedLogId(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Fechar
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-card border border-border p-3">
                  <span className="text-[11px] font-bold text-destructive block mb-1">
                    Valores Anteriores (old_data):
                  </span>
                  <pre className="text-[10px] overflow-x-auto text-muted-foreground">
                    {selLog.old_data ? JSON.stringify(selLog.old_data, null, 2) : "Nenhum dado prévio"}
                  </pre>
                </div>

                <div className="rounded-lg bg-card border border-border p-3">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                    Novos Valores Aplicados (new_data):
                  </span>
                  <pre className="text-[10px] overflow-x-auto text-foreground">
                    {selLog.new_data ? JSON.stringify(selLog.new_data, null, 2) : "Nenhum dado novo"}
                  </pre>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* Histórico de Reatribuição de Leads (student_assignments) */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <ArrowRightLeft size={15} className="text-amber-600" />
            Histórico de Reatribuição de Leads entre Vendedores ({assignments.length})
          </span>
          <span className="text-xs text-muted-foreground">Supervisão de Carteiras</span>
        </div>

        {assignments.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Nenhuma reatribuição de contato registrada até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Contato / Aluno</th>
                  <th className="px-4 py-3 text-left">Reatribuído por</th>
                  <th className="px-4 py-3 text-left">Vendedor Destino</th>
                  <th className="px-4 py-3 text-left">Motivo Declarado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {assignments.map((asg) => (
                  <tr key={asg.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 tabular-nums text-muted-foreground whitespace-nowrap">
                      {dateTime.format(new Date(asg.created_at))}
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">
                      {asg.student_name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-medium">
                      {asg.assigned_by_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-sm">
                        {asg.seller_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {asg.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
