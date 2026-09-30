import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Phone,
  Mail,
  Search,
  ExternalLink,
  History,
  ArrowRightLeft,
  X,
  CheckCircle2,
  CalendarClock,
  FileText,
  MessageSquare,
  Plus,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { dateTime, formatPhone, useRefreshWorkspace, useWorkspace } from "@/lib/use-workspace";
import { transferStudents, getStudentTimeline } from "@/lib/crm.functions";

export const Route = createFileRoute("/_authenticated/contatos")({
  head: () => ({
    meta: [
      { title: "Contatos — Instituto Mix" },
      { name: "description", content: "Carteira de alunos e contatos comerciais do Instituto Mix de Profissões." },
      { property: "og:title", content: "Contatos — Instituto Mix" },
      { property: "og:description", content: "Carteira de alunos e contatos comerciais do Instituto Mix de Profissões." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContactsPage,
});

interface InteractionItem {
  id?: string;
  kind?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

function ContactsPage() {
  const { data } = useWorkspace();
  const transfer = useServerFn(transferStudents);
  const loadTimeline = useServerFn(getStudentTimeline);
  const refresh = useRefreshWorkspace();

  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [sellerFilter, setSellerFilter] = useState("all");

  // Multi-select for transfer
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [targetSellerId, setTargetSellerId] = useState("");
  const [transferReason, setTransferReason] = useState("Redistribuição de carteira");
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferMsg, setTransferMsg] = useState("");

  // Timeline Drawer
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineData, setTimelineData] = useState<{
    interactions: InteractionItem[];
    proposals: unknown[];
    followups: unknown[];
  } | null>(null);

  if (!data) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Carregando contatos…</div>;

  const { isSeller } = data;

  const filteredStudents = data.students.filter((s) => {
    if (isSeller && s.owner_id !== data.userId && s.owner_id != null) return false;
    if (!isSeller && sellerFilter !== "all" && s.owner_id !== sellerFilter) return false;
    if (stageFilter !== "all" && s.crm_stage_id !== stageFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.full_name.toLowerCase().includes(q);
      const matchPhone = s.whatsapp.includes(q);
      const matchEmail = (s.email ?? "").toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchEmail) return false;
    }
    return true;
  });

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function selectAll() {
    if (selectedIds.length === filteredStudents.length) setSelectedIds([]);
    else setSelectedIds(filteredStudents.map((s) => s.id));
  }

  async function handleOpenTimeline(sId: string) {
    setSelectedStudentId(sId);
    setTimelineLoading(true);
    try {
      const res = await loadTimeline({ data: { studentId: sId } });
      setTimelineData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setTimelineLoading(false);
    }
  }

  async function handleExecuteBatchTransfer() {
    if (!selectedIds.length) return;
    setTransferBusy(true);
    setTransferMsg("");
    try {
      await transfer({
        data: {
          studentIds: selectedIds,
          targetSellerId: targetSellerId || null,
          reason: transferReason || "Transferência em lote de contatos",
        },
      });
      await refresh();
      setTransferMsg("Contatos transferidos com sucesso!");
      setTimeout(() => {
        setShowTransferModal(false);
        setSelectedIds([]);
        setTransferMsg("");
      }, 700);
    } catch (e) {
      setTransferMsg(e instanceof Error ? e.message : "Erro ao transferir contatos.");
    } finally {
      setTransferBusy(false);
    }
  }

  const selectedStudent = data.students.find((s) => s.id === selectedStudentId);

  return (
    <AppShell
      title="Carteira de Contatos"
      subtitle="Todos os alunos e oportunidades cadastrados, preservando histórico de interações."
      actions={
        <div className="flex items-center gap-2">
          {!isSeller && selectedIds.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="border-primary text-primary font-bold gap-1.5"
              onClick={() => setShowTransferModal(true)}
            >
              <ArrowRightLeft size={14} />
              Transferir ({selectedIds.length})
            </Button>
          )}
          <Button size="sm" asChild>
            <Link to="/simulacao">
              <Plus size={16} className="mr-1" /> Nova Proposta
            </Link>
          </Button>
        </div>
      }
    >
      {/* Filters Bar */}
      <section className="data-panel mb-6 p-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-[14rem]">
              <Search size={15} className="absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nome, WhatsApp ou e-mail..."
                className="input-field pl-9 h-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="input-field h-9 text-xs w-44 font-medium"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="all">Todas as etapas do CRM</option>
              {data.stages.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>

            {!isSeller && (
              <select
                className="input-field h-9 text-xs w-44 font-medium"
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
              >
                <option value="all">Todos os Vendedores</option>
                {data.sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <span className="text-xs text-muted-foreground font-semibold self-center">
            {filteredStudents.length} contatos
          </span>
        </div>
      </section>

      {/* Contacts Table */}
      <div className="data-panel overflow-x-auto">
        <table>
          <thead>
            <tr>
              {!isSeller && (
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredStudents.length}
                    onChange={selectAll}
                  />
                </th>
              )}
              <th>Nome</th>
              <th>WhatsApp</th>
              <th>E-mail</th>
              <th>Etapa do CRM</th>
              <th>Vendedor</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((s) => {
              const stage = data.stages.find((st) => st.id === s.crm_stage_id);
              const seller = data.sellers.find((sel) => sel.id === s.owner_id);
              const isSelected = selectedIds.includes(s.id);

              return (
                <tr key={s.id} className={isSelected ? "bg-primary/5" : ""}>
                  {!isSeller && (
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(s.id)}
                      />
                    </td>
                  )}
                  <td>
                    <strong className="block font-semibold text-foreground">{s.full_name}</strong>
                  </td>
                  <td>
                    <a
                      href={`https://wa.me/55${s.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                    >
                      <Phone size={12} />
                      {formatPhone(s.whatsapp)}
                      <ExternalLink size={10} />
                    </a>
                  </td>
                  <td className="text-xs text-muted-foreground">{s.email ?? "—"}</td>
                  <td>
                    <span className="status-pill text-xs">
                      {stage?.name ?? "Novo"}
                    </span>
                  </td>
                  <td className="text-xs text-muted-foreground">
                    {seller ? seller.full_name.split(" ")[0] : "Sem vendedor"}
                  </td>
                  <td>
                    <span
                      className={`status-pill ${
                        s.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s.status === "active" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs font-semibold gap-1"
                        onClick={() => handleOpenTimeline(s.id)}
                      >
                        <History size={13} /> Histórico
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" asChild>
                        <Link to="/simulacao">Proposta</Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filteredStudents.length && (
              <tr>
                <td colSpan={isSeller ? 7 : 8} className="empty-row">
                  Nenhum contato encontrado com os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer: Contact History Timeline */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-xl h-full bg-background border-l border-border p-6 overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Histórico do Aluno</span>
                <h2 className="text-xl font-bold mt-1">{selectedStudent.full_name}</h2>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>WhatsApp: {formatPhone(selectedStudent.whatsapp)}</span>
                  {selectedStudent.email && <span>• {selectedStudent.email}</span>}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedStudentId(null)}>
                <X size={18} />
              </Button>
            </div>

            <div className="my-4 flex gap-2">
              <Button size="sm" asChild>
                <Link to="/simulacao">
                  <Plus size={14} className="mr-1" /> Criar Proposta
                </Link>
              </Button>
            </div>

            <div className="flex-1 mt-4">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <History size={16} className="text-primary" />
                Linha do Tempo
              </h3>

              {timelineLoading ? (
                <div className="py-8 text-center text-xs text-muted-foreground">Carregando histórico...</div>
              ) : (
                <div className="space-y-4">
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
                            <strong className="font-semibold">
                              {isWon
                                ? "Venda Confirmada"
                                : isFollowup
                                ? "Retorno Agendado"
                                : isProposal
                                ? "Proposta Criada"
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

      {/* Modal: Batch Transfer Contacts */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-bold">Transferir Contatos Selecionados ({selectedIds.length})</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Todos os contatos selecionados serão redirecionados ao novo vendedor, mantendo o histórico intacto.
            </p>

            <div className="mt-5 space-y-4">
              <label className="block text-sm font-medium">
                Novo Vendedor Responsável *
                <select
                  className="input-field mt-1.5"
                  value={targetSellerId}
                  onChange={(e) => setTargetSellerId(e.target.value)}
                >
                  <option value="">Sem responsável (Banco de Leads)</option>
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
                  placeholder="Ex: Redistribuição de carteira..."
                />
              </label>
            </div>

            {transferMsg && <p className="mt-3 text-xs font-semibold text-primary">{transferMsg}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowTransferModal(false)} disabled={transferBusy}>
                Cancelar
              </Button>
              <Button onClick={handleExecuteBatchTransfer} disabled={transferBusy} className="font-bold">
                {transferBusy ? "Transferindo..." : "Confirmar Transferência"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
