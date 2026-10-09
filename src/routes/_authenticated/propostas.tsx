import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Clock3,
  Pause,
  Play,
  Plus,
  CheckCircle2,
  Calendar,
  Eye,
  Filter,
  Search,
  ExternalLink,
  Tag,
  GraduationCap,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { ProposalPriceBreakdown } from "@/components/proposal-price-breakdown";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { brl, dateTime, dateOnly, timeOnly, useRefreshWorkspace, useWorkspace } from "@/lib/use-workspace";
import { updateProposalTimer, closeSaleNow, deferProposalFollowup } from "@/lib/crm.functions";

export const Route = createFileRoute("/_authenticated/propostas")({
  head: () => ({
    meta: [
      { title: "Propostas — Instituto Mix" },
      { name: "description", content: "Propostas comerciais e condições do Instituto Mix de Profissões." },
      { property: "og:title", content: "Propostas — Instituto Mix" },
      { property: "og:description", content: "Propostas comerciais e condições do Instituto Mix de Profissões." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProposalsPage,
});

function ProposalsPage() {
  const { data } = useWorkspace();
  const action = useServerFn(updateProposalTimer);
  const closeSale = useServerFn(closeSaleNow);
  const deferFollowup = useServerFn(deferProposalFollowup);
  const refresh = useRefreshWorkspace();

  const [, tick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter States (Requirement 25)
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Presentation Mode for a specific proposal
  const [presentationProposal, setPresentationProposal] = useState<(NonNullable<typeof data>["proposals"][0]) | null>(null);

  // Modals
  const [closingProposalId, setClosingProposalId] = useState<string | null>(null);
  const [deferProposalId, setDeferProposalId] = useState<string | null>(null);
  const [deferDate, setDeferDate] = useState("");
  const [deferTime, setDeferTime] = useState("10:00");
  const [deferNotes, setDeferNotes] = useState("");
  const [modalBusy, setModalBusy] = useState(false);
  const [modalMsg, setModalMsg] = useState("");

  if (!data) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Carregando propostas…</div>;

  const { isSeller } = data;

  async function act(id: string, a: "pause" | "resume" | "extend30" | "extend60") {
    await action({ data: { proposalId: id, action: a } });
    await refresh();
  }

  async function handleCloseSaleSubmit() {
    if (!closingProposalId) return;
    setModalBusy(true);
    setModalMsg("");
    try {
      await closeSale({ data: { proposalId: closingProposalId, notes: "Venda confirmada pela listagem de propostas" } });
      await refresh();
      setModalMsg("Venda confirmada com sucesso!");
      setTimeout(() => {
        setClosingProposalId(null);
        setPresentationProposal(null);
        setModalMsg("");
      }, 700);
    } catch (e) {
      setModalMsg(e instanceof Error ? e.message : "Erro ao fechar venda.");
    } finally {
      setModalBusy(false);
    }
  }

  async function handleDeferSubmit() {
    if (!deferProposalId || !deferDate) return;
    setModalBusy(true);
    setModalMsg("");
    try {
      await deferFollowup({
        data: {
          proposalId: deferProposalId,
          dueAt: `${deferDate}T${deferTime}:00`,
          notes: deferNotes || "Retorno agendado",
        },
      });
      await refresh();
      setModalMsg("Retorno agendado com sucesso!");
      setTimeout(() => {
        setDeferProposalId(null);
        setPresentationProposal(null);
        setModalMsg("");
      }, 700);
    } catch (e) {
      setModalMsg(e instanceof Error ? e.message : "Erro ao agendar retorno.");
    } finally {
      setModalBusy(false);
    }
  }

  // Filter proposals
  const now = Date.now();
  const filteredProposals = data.proposals.filter((p) => {
    // Seller filter
    if (isSeller && p.seller_id !== data.userId) return false;
    if (!isSeller && sellerFilter !== "all" && p.seller_id !== sellerFilter) return false;

    // Status filter
    if (statusFilter === "open" && !["sent", "viewed", "negotiation"].includes(p.status)) return false;
    if (statusFilter === "awaiting" && p.status !== "awaiting_response") return false;
    if (statusFilter === "approved" && p.status !== "approved") return false;
    if (statusFilter === "expired") {
      const isExp = p.valid_until && new Date(p.valid_until).getTime() < now && !["approved", "refused"].includes(p.status);
      if (!isExp) return false;
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const student = data.students.find((s) => s.id === p.student_id);
      const studentMatch = student?.full_name.toLowerCase().includes(q) || student?.whatsapp.includes(q);
      const courseMatch = p.course_name.toLowerCase().includes(q);
      if (!studentMatch && !courseMatch) return false;
    }

    return true;
  });

  // Presentation Mode Overlay for Selected Proposal
  if (presentationProposal) {
    const student = data.students.find((s) => s.id === presentationProposal.student_id);
    const original = Number(presentationProposal.original_price);
    const finalPrice = Number(presentationProposal.final_price);
    const economy = Number(presentationProposal.discount_amount);
    const installments = Number(presentationProposal.installments);
    const installmentVal = Number(presentationProposal.installment_value);

    return (
      <div className="presentation-overlay p-6 md:p-12">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <GraduationCap size={24} />
            </span>
            <div>
              <strong className="block text-lg font-extrabold text-foreground tracking-tight">Instituto Mix</strong>
              <span className="text-xs text-primary uppercase tracking-widest font-bold block">
                Proposta Comercial
              </span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPresentationProposal(null)} className="gap-2">
            <ArrowLeft size={16} /> Voltar à Lista
          </Button>
        </div>

        <div className="max-w-4xl mx-auto w-full py-8 flex-1 flex flex-col justify-center text-center">
          <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary uppercase tracking-wider mx-auto">
            <Sparkles size={14} /> Condição Comercial
          </span>
          <h1 className="mt-3 text-3xl md:text-5xl font-extrabold tracking-tight">
            {presentationProposal.course_name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Apresentada para: <b>{student?.full_name ?? "Aluno"}</b>
          </p>

          <div className="mt-8 rounded-lg border border-border bg-card p-6 md:p-8 max-w-2xl mx-auto w-full">
            <ProposalPriceBreakdown
              coursePrice={presentationProposal.course_price_snapshot}
              enrollmentFee={presentationProposal.enrollment_fee_snapshot}
              materialDiscount={presentationProposal.material_discount_snapshot}
              subtotal={presentationProposal.subtotal_snapshot}
              original={original}
              final={finalPrice}
              discounts={savedDiscounts(presentationProposal)}
            />
            <p className="mt-4 text-sm font-semibold">em <b>{installments}x de {brl.format(installmentVal)}</b> no {presentationProposal.payment_method_name}</p>

            {presentationProposal.valid_until && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4">
                <Clock3 size={14} className="text-primary" />
                <span>Condição válida até {dateTime.format(new Date(presentationProposal.valid_until))}</span>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="h-14 px-8 text-base font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg gap-2"
              onClick={() => setClosingProposalId(presentationProposal.id)}
            >
              <CheckCircle2 size={20} />
              FECHAR AGORA
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-base font-bold gap-2"
              onClick={() => setDeferProposalId(presentationProposal.id)}
            >
              <Calendar size={18} />
              DEIXAR PARA DEPOIS
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      title="Propostas Comerciais"
      subtitle="Condições preservadas em snapshot imutável com validade e histórico."
      actions={
        <Button size="sm" asChild>
          <Link to="/simulacao">
            <Plus size={16} className="mr-1" /> Nova Proposta
          </Link>
        </Button>
      }
    >
      {/* Filters Bar (Requirement 25) */}
      <section className="data-panel mb-6 p-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-[14rem]">
              <Search size={15} className="absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por aluno ou curso..."
                className="input-field pl-9 h-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="input-field h-9 text-xs w-44 font-medium"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos os Status</option>
              <option value="open">Abertas / Em Negociação</option>
              <option value="awaiting">Aguardando Retorno</option>
              <option value="approved">Matriculadas / Fechadas</option>
              <option value="expired">Expiradas</option>
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
            {filteredProposals.length} propostas encontradas
          </span>
        </div>
      </section>

      {/* Proposals List */}
      <div className="space-y-4">
        {filteredProposals.map((p) => {
          const student = data.students.find((s) => s.id === p.student_id);
          const seller = data.sellers.find((sel) => sel.id === p.seller_id);
          const original = Number(p.original_price);
          const discountAmt = Number(p.discount_amount);
          const finalPrice = Number(p.final_price);

          const isApproved = p.status === "approved";
          const isAwaiting = p.status === "awaiting_response";

          // Live countdown timer calculation
          const seconds =
            p.timer_status === "paused"
              ? Number(p.timer_remaining_seconds ?? 0)
              : Math.max(0, Math.floor((new Date(p.valid_until ?? now).getTime() - now) / 1000));

          const isExpired = seconds <= 0 && p.timer_status !== "paused" && !isApproved;
          const timerStr = `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(
            Math.floor((seconds % 3600) / 60)
          ).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

          return (
            <article className="proposal-card hover:border-primary/40 transition-all" key={p.id}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`status-pill ${
                      isApproved
                        ? "bg-emerald-100 text-emerald-800"
                        : isAwaiting
                        ? "bg-amber-100 text-amber-800"
                        : isExpired
                        ? "bg-rose-100 text-rose-800"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {isApproved
                      ? "Matriculado / Fechada"
                      : isAwaiting
                      ? "Aguardando Retorno"
                      : isExpired
                      ? "Expirada"
                      : p.status}
                  </span>
                  <span className="text-xs text-muted-foreground">{dateTime.format(new Date(p.created_at))}</span>
                  {!isSeller && seller && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-sm text-muted-foreground font-semibold">
                      Vendedor: {seller.full_name}
                    </span>
                  )}
                </div>

                <h2 className="mt-2.5 text-lg font-bold">
                  {student?.full_name ?? "Contato"} · <span className="text-primary">{p.course_name}</span>
                </h2>

                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{p.payment_method_name}</span>
                  <span>•</span>
                  <span>
                    {p.installments}x de <b>{brl.format(Number(p.installment_value))}</b>
                  </span>
                  {p.discount_name && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold">{p.discount_name}</span>
                    </>
                  )}
                </div>

                <div className="mt-4 max-w-xl">
                  <ProposalPriceBreakdown coursePrice={p.course_price_snapshot} enrollmentFee={p.enrollment_fee_snapshot} materialDiscount={p.material_discount_snapshot} subtotal={p.subtotal_snapshot} original={original} final={finalPrice} discounts={savedDiscounts(p)} />
                </div>
              </div>

              {/* Right: Timer & Actions */}
              <div className="text-left md:text-right flex flex-col justify-between items-start md:items-end">
                {/* Timer indicator */}
                <div className="flex items-center gap-2">
                  <Clock3 size={16} className={isExpired ? "text-rose-500" : "text-primary"} />
                  <span className={`font-mono text-base font-bold ${isExpired ? "text-rose-500" : ""}`}>
                    {isApproved ? "Concluída" : isExpired ? "Expirada" : timerStr}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="mt-3 flex flex-wrap gap-2 md:justify-end">
                  {/* Presentation Mode button */}
                  <Button
                    size="sm"
                    className="font-bold gap-1.5"
                    onClick={() => setPresentationProposal(p)}
                  >
                    <Eye size={14} /> Mostrar ao Aluno
                  </Button>

                  {!isApproved && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-bold"
                        onClick={() => setClosingProposalId(p.id)}
                      >
                        <CheckCircle2 size={14} className="mr-1" /> Fechar
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-amber-700 border-amber-300 hover:bg-amber-50 font-bold"
                        onClick={() => setDeferProposalId(p.id)}
                      >
                        <Calendar size={14} className="mr-1" /> Retorno
                      </Button>

                      {/* Timer controls */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => act(p.id, p.timer_status === "paused" ? "resume" : "pause")}
                      >
                        {p.timer_status === "paused" ? <Play size={13} /> : <Pause size={13} />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => act(p.id, "extend30")}>
                        +30m
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {!filteredProposals.length && (
          <div className="empty-state">Nenhuma proposta encontrada para os filtros selecionados.</div>
        )}
      </div>

      {/* Modal: Confirm Close Sale */}
      {closingProposalId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-bold">Confirmar Fechamento de Venda</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Esta ação registrará a venda, atualizará o status para Matriculado e salvará no histórico.
            </p>
            {modalMsg && <p className="mt-3 text-xs font-bold text-primary">{modalMsg}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setClosingProposalId(null)} disabled={modalBusy}>
                Cancelar
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={handleCloseSaleSubmit}
                disabled={modalBusy}
              >
                {modalBusy ? "Confirmando..." : "Confirmar Venda"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Defer Followup */}
      {deferProposalId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-bold">Agendar Retorno Comercial</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Defina a data e o motivo para manter a proposta como <b>Aguardando Retorno</b>.
            </p>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-medium">
                  Data
                  <input
                    type="date"
                    className="input-field mt-1"
                    value={deferDate}
                    onChange={(e) => setDeferDate(e.target.value)}
                    required
                  />
                </label>
                <label className="text-xs font-medium">
                  Horário
                  <input
                    type="time"
                    className="input-field mt-1"
                    value={deferTime}
                    onChange={(e) => setDeferTime(e.target.value)}
                    required
                  />
                </label>
              </div>
              <label className="text-xs font-medium block">
                Observação
                <input
                  type="text"
                  placeholder="Ex: Aluno quer falar com os pais..."
                  className="input-field mt-1"
                  value={deferNotes}
                  onChange={(e) => setDeferNotes(e.target.value)}
                  required
                />
              </label>
            </div>
            {modalMsg && <p className="mt-3 text-xs font-bold text-primary">{modalMsg}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeferProposalId(null)} disabled={modalBusy}>
                Cancelar
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                onClick={handleDeferSubmit}
                disabled={modalBusy}
              >
                {modalBusy ? "Salvando..." : "Salvar Retorno"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function savedDiscounts(proposal: { notes: string | null; subtotal_snapshot: number | null; final_price: number; discount_amount: number; discount_name: string | null }) {
  if (proposal.subtotal_snapshot == null) return [{ name: proposal.discount_name || "Desconto aplicado", amount: Number(proposal.discount_amount) }];
  try {
    const parsed: unknown = JSON.parse(proposal.notes ?? "");
    if (parsed && typeof parsed === "object" && "discountBreakdown" in parsed && Array.isArray(parsed.discountBreakdown)) {
      const items = parsed.discountBreakdown.filter((item): item is { name: string; amount: number } => !!item && typeof item === "object" && typeof item.name === "string" && typeof item.amount === "number" && Number.isFinite(item.amount));
      if (items.length) return items.filter(item => item.name !== "Desconto de Material Didático");
    }
  } catch { /* Historical notes can be plain text. */ }
  return [{ name: "Condição especial", amount: Math.max(0, Number(proposal.subtotal_snapshot) - Number(proposal.final_price)) }];
}
