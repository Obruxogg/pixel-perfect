import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  Sparkles,
  BookOpen,
  DollarSign,
  KanbanSquare,
  Plus,
  ShieldAlert,
  CheckCircle2,
  ArrowRightLeft,
  UserCheck,
  UserX,
  Phone,
  Tag,
  ToggleLeft,
  ToggleRight,
  Handshake,
  Copy,
  KeyRound,
  ShieldCheck,
  CreditCard,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { EnrollmentSettings, CourseEnrollmentFields } from "@/components/enrollment-settings";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { saveCatalogItem, manageSeller, transferStudents, toggleCatalogItemStatus, savePaymentMethod, saveInstallmentOption } from "@/lib/crm.functions";
import { brl, formatPhone, useRefreshWorkspace, useWorkspace } from "@/lib/use-workspace";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações Comerciais — Instituto Mix" },
      { name: "description", content: "Gerencie equipe, catálogo, condições comerciais e gatilhos de venda do Instituto Mix de Profissões." },
      { property: "og:title", content: "Configurações Comerciais — Instituto Mix" },
      { property: "og:description", content: "Gerencie equipe, catálogo, condições comerciais e gatilhos de venda do Instituto Mix de Profissões." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data, isLoading } = useWorkspace();
  const save = useServerFn(saveCatalogItem);
  const sellerAction = useServerFn(manageSeller);
  const transfer = useServerFn(transferStudents);
  const toggleItem = useServerFn(toggleCatalogItemStatus);
  const refresh = useRefreshWorkspace();
  const navigate = useNavigate();

  async function handleToggleStatus(table: "courses" | "areas" | "discount_rules" | "commercial_conditions" | "crm_stages" | "commercial_triggers" | "payment_methods" | "installment_options", id: string) {
    setBusy(true);
    try {
      await toggleItem({ data: { table, id } });
      await refresh();
      toast.success("Status alterado com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar status.");
    } finally {
      setBusy(false);
    }
  }

  // Active Tab
  const [activeTab, setActiveTab] = useState<"team" | "managers" | "conditions" | "triggers" | "courses" | "discounts" | "crm" | "payments" | "installments" | "enrollment">("team");
  const saveMethod = useServerFn(savePaymentMethod);
  const saveInst = useServerFn(saveInstallmentOption);

  // Formas de Pagamento & Parcelamentos
  const [newMethodName, setNewMethodName] = useState("");
  const [newMethodSort, setNewMethodSort] = useState("0");
  const [newInstPaymentMethodId, setNewInstPaymentMethodId] = useState("");
  const [newInstCount, setNewInstCount] = useState("12");
  const [newInstLabel, setNewInstLabel] = useState("12x");
  const [newInstSort, setNewInstSort] = useState("0");

  // Condition Form
  const [condCourseId, setCondCourseId] = useState("");
  const [condName, setCondName] = useState("");
  const [condPaymentMethodId, setCondPaymentMethodId] = useState("");
  const [condInstallmentId, setCondInstallmentId] = useState("");
  const [condDiscountRuleId, setCondDiscountRuleId] = useState("");
  const [condValidityMinutes, setCondValidityMinutes] = useState("60");

  // Feedback State
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Seller Management Form (Requirement 4)
  const [showAddSellerModal, setShowAddSellerModal] = useState(false);
  const [newSellerName, setNewSellerName] = useState("");
  const [newSellerEmail, setNewSellerEmail] = useState("");
  const [newSellerPassword, setNewSellerPassword] = useState("");
  const [newSellerCode, setNewSellerCode] = useState("");
  const [newSellerPhone, setNewSellerPhone] = useState("");
  const [newSellerTitle, setNewSellerTitle] = useState("Vendedor Comercial");
  const [newSellerTeamId, setNewSellerTeamId] = useState("");

  // Manager Management Form
  const [showAddManagerModal, setShowAddManagerModal] = useState(false);
  const [newManagerName, setNewManagerName] = useState("");
  const [newManagerEmail, setNewManagerEmail] = useState("");
  const [newManagerPassword, setNewManagerPassword] = useState("");
  const [newManagerPhone, setNewManagerPhone] = useState("");
  const [newManagerTitle, setNewManagerTitle] = useState("Gerente Comercial");

  // Transfer Portfolio Modal (Requirement 27)
  const [portfolioFromSellerId, setPortfolioFromSellerId] = useState<string | null>(null);
  const [portfolioTargetSellerId, setPortfolioTargetSellerId] = useState<string>("");

  // Catalog Form
  const [catalogType, setCatalogType] = useState<"area" | "course">("course");
  const [itemName, setItemName] = useState("");
  const [itemAreaId, setItemAreaId] = useState("");
  const [itemWorkload, setItemWorkload] = useState("");
  const [itemModality, setItemModality] = useState("Presencial");
  const [itemBasePrice, setItemBasePrice] = useState("");
  const [itemEnrollmentCustom, setItemEnrollmentCustom] = useState(false);
  const [itemEnrollment, setItemEnrollment] = useState("");
  const [itemMaterial, setItemMaterial] = useState("0");

  // Trigger Form (Requirement 29)
  const [triggerName, setTriggerName] = useState("");
  const [triggerTitle, setTriggerTitle] = useState("");
  const [triggerText, setTriggerText] = useState("");
  const [triggerType, setTriggerType] = useState("badge");

  // Discount Form
  const [discountName, setDiscountName] = useState("");
  const [discountKind, setDiscountKind] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");

  // CRM Stage Form
  const [stageName, setStageName] = useState("");

  if (isLoading || !data) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Carregando configurações…</div>;
  }

  // Problema 1: Vendedor tentando acessar telas administrativas -> Bloquear!
  if (data.isSeller) {
    return (
      <AppShell title="Acesso Restrito" subtitle="Permissão insuficiente">
        <div className="mx-auto max-w-lg rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center mt-12 shadow-sm">
          <span className="grid size-12 place-items-center rounded-full bg-destructive/15 text-destructive mx-auto mb-4">
            <ShieldAlert size={26} />
          </span>
          <h2 className="text-xl font-bold text-foreground">Ambiente Exclusivo de Gerência</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            O seu perfil de <b>Vendedor</b> não possui permissão para acessar ou alterar as configurações administrativas e financeiras do sistema.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild>
              <Link to="/dashboard">Voltar para meu Painel</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/simulacao">Nova Proposta</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  // Handlers
  async function handleAddSellerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const code = newSellerCode.trim() || `VD-${Math.floor(1000 + Math.random() * 9000)}`;
      const pass = newSellerPassword.trim() || `Vendedor@${Math.floor(1000 + Math.random() * 9000)}`;

      await sellerAction({
        data: {
          action: "create",
          fullName: newSellerName,
          email: newSellerEmail,
          password: pass,
          accessCode: code,
          phone: newSellerPhone,
          jobTitle: newSellerTitle,
          teamId: newSellerTeamId || null,
          role: "seller",
        },
      });
      await refresh();
      toast.success("Vendedor pré-cadastrado com sucesso!");
      setMessage("Vendedor pré-cadastrado com sucesso!");
      setShowAddSellerModal(false);
      setNewSellerName("");
      setNewSellerEmail("");
      setNewSellerPassword("");
      setNewSellerCode("");
      setNewSellerPhone("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar vendedor.");
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar vendedor.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddManagerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const pass = newManagerPassword.trim() || `Gerente@${Math.floor(1000 + Math.random() * 9000)}`;

      await sellerAction({
        data: {
          action: "create",
          fullName: newManagerName,
          email: newManagerEmail,
          password: pass,
          phone: newManagerPhone,
          jobTitle: newManagerTitle,
          teamId: null,
          role: "manager",
        },
      });
      await refresh();
      toast.success("Gerente cadastrado com sucesso!");
      setMessage("Gerente cadastrado com sucesso!");
      setShowAddManagerModal(false);
      setNewManagerName("");
      setNewManagerEmail("");
      setNewManagerPassword("");
      setNewManagerPhone("");
      setNewManagerTitle("Gerente Comercial");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar gerente.");
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar gerente.");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleSellerStatus(sellerId: string) {
    setBusy(true);
    try {
      await sellerAction({
        data: { action: "toggle_status", sellerId },
      });
      await refresh();
      setMessage("Status do vendedor alterado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar status.");
    } finally {
      setBusy(false);
    }
  }

  async function handleTransferWholePortfolio() {
    if (!portfolioFromSellerId || !data) return;
    setBusy(true);
    setError("");
    try {
      const studentIdsToMove = data.students
        .filter((s) => s.owner_id === portfolioFromSellerId)
        .map((s) => s.id);

      if (!studentIdsToMove.length) {
        setError("Este vendedor não possui contatos para transferir.");
        setBusy(false);
        return;
      }

      await transfer({
        data: {
          studentIds: studentIdsToMove,
          targetSellerId: portfolioTargetSellerId || null,
          reason: "Transferência total de carteira",
        },
      });

      await refresh();
      setMessage(`Carteira transferida com sucesso (${studentIdsToMove.length} contatos).`);
      setPortfolioFromSellerId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao transferir carteira.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveCondition(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await save({
        data: {
          type: "condition",
          name: condName,
          courseId: condCourseId,
          paymentMethodId: condPaymentMethodId,
          installmentId: condInstallmentId || undefined,
          discountRuleId: condDiscountRuleId || undefined,
          validityMinutes: condValidityMinutes ? Number(condValidityMinutes) : 60,
        } as any,
      });
      await refresh();
      setMessage("Condição comercial cadastrada com sucesso!");
      setCondName("");
      setCondCourseId("");
      setCondPaymentMethodId("");
      setCondInstallmentId("");
      setCondDiscountRuleId("");
      setCondValidityMinutes("60");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar condição comercial.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveCatalog(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await save({
        data: {
          type: catalogType,
          name: itemName,
          areaId: catalogType === "course" ? itemAreaId || undefined : undefined,
          workload: catalogType === "course" && itemWorkload ? Number(itemWorkload) : undefined,
          modality: itemModality,
          basePrice: catalogType === "course" && itemBasePrice ? Number(itemBasePrice) : undefined,
          enrollmentFee: itemEnrollmentCustom ? Number(itemEnrollment) : null,
          materialDiscount: Number(itemMaterial),
        },
      });
      await refresh();
      setMessage(`${catalogType === "area" ? "Área" : "Curso"} adicionado com sucesso!`);
      setItemName("");
      setItemWorkload("");
      setItemBasePrice("");
      setItemEnrollmentCustom(false);
      setItemEnrollment("");
      setItemMaterial("0");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar item.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveTrigger(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await save({
        data: {
          type: "trigger",
          name: triggerName,
          triggerTitle,
          triggerText,
          triggerType,
        },
      });
      await refresh();
      setMessage("Gatilho comercial cadastrado com sucesso!");
      setTriggerName("");
      setTriggerTitle("");
      setTriggerText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar gatilho.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveDiscount(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await save({
        data: {
          type: "discount",
          name: discountName,
          discountKind,
          discountValue: Number(discountValue),
        },
      });
      await refresh();
      setMessage("Regra de desconto cadastrada com sucesso!");
      setDiscountName("");
      setDiscountValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar desconto.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveStage(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await save({
        data: {
          type: "stage",
          name: stageName,
        },
      });
      await refresh();
      setMessage("Etapa do CRM cadastrada com sucesso!");
      setStageName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar etapa.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      title="Gestão & Configurações"
      subtitle="Painel de controle para gerentes e administradores: equipe, condições e catálogo."
    >
      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3 mb-6">
        <Button
          variant={activeTab === "team" ? "default" : "ghost"}
          size="sm"
          className="gap-2 font-semibold"
          onClick={() => setActiveTab("team")}
        >
          <Users size={16} /> Equipe & Vendedores
        </Button>

        {data.isAdmin && (
          <Button
            variant={activeTab === "managers" ? "default" : "ghost"}
            size="sm"
            className="gap-2 font-semibold"
            onClick={() => setActiveTab("managers")}
          >
            <ShieldCheck size={16} /> Gerentes
          </Button>
        )}

        <Button
          variant={activeTab === "conditions" ? "default" : "ghost"}
          size="sm"
          className="gap-2 font-semibold"
          onClick={() => setActiveTab("conditions")}
        >
          <Handshake size={16} /> Condições Comerciais
        </Button>
        <Button variant={activeTab === "enrollment" ? "default" : "ghost"} size="sm" className="gap-2 font-semibold" onClick={() => setActiveTab("enrollment")}><BookOpen size={16} /> Comercial · Matrículas</Button>

        <Button
          variant={activeTab === "triggers" ? "default" : "ghost"}
          size="sm"
          className="gap-2 font-semibold"
          onClick={() => setActiveTab("triggers")}
        >
          <Sparkles size={16} /> Gatilhos Comerciais
        </Button>

        <Button
          variant={activeTab === "courses" ? "default" : "ghost"}
          size="sm"
          className="gap-2 font-semibold"
          onClick={() => setActiveTab("courses")}
        >
          <BookOpen size={16} /> Áreas & Cursos
        </Button>

        <Button
          variant={activeTab === "discounts" ? "default" : "ghost"}
          size="sm"
          className="gap-2 font-semibold"
          onClick={() => setActiveTab("discounts")}
        >
          <DollarSign size={16} /> Descontos Comerciais
        </Button>

        <Button
          variant={activeTab === "payments" ? "default" : "ghost"}
          size="sm"
          className="gap-2 font-semibold"
          onClick={() => setActiveTab("payments")}
        >
          <CreditCard size={16} /> Formas de Pagamento
        </Button>

        <Button
          variant={activeTab === "installments" ? "default" : "ghost"}
          size="sm"
          className="gap-2 font-semibold"
          onClick={() => setActiveTab("installments")}
        >
          <Calendar size={16} /> Parcelamentos
        </Button>

        <Button
          variant={activeTab === "crm" ? "default" : "ghost"}
          size="sm"
          className="gap-2 font-semibold"
          onClick={() => setActiveTab("crm")}
        >
          <KanbanSquare size={16} /> Etapas do CRM
        </Button>
      </div>

      {message && (
        <div className="mb-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-4 text-emerald-800 dark:text-emerald-300 font-semibold text-xs border border-emerald-300">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg bg-destructive/10 p-4 text-destructive font-semibold text-xs border border-destructive/20">
          {error}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB CONDIÇÕES COMERCIAIS */}
      {/* ========================================================= */}
      {activeTab === "conditions" && (
        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-bold">Condições Comerciais</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Cadastre as condições que o vendedor poderá selecionar ao criar uma proposta.
              Cada condição define o curso, forma de pagamento, parcelamento, desconto e validade da oferta.
            </p>
          </div>

          {/* Form: Nova Condição */}
          <div className="data-panel p-5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <Plus size={15} className="text-primary" /> Nova Condição Comercial
            </h3>
            <form onSubmit={handleSaveCondition} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Nome da Condição *
                  <input
                    className="input-field mt-1.5"
                    value={condName}
                    onChange={(e) => setCondName(e.target.value)}
                    placeholder="Ex: PIX à vista com 20% de desconto"
                    required
                  />
                </label>
                <label className="text-sm font-medium">
                  Curso *
                  <select
                    className="input-field mt-1.5"
                    value={condCourseId}
                    onChange={(e) => { setCondCourseId(e.target.value); setCondInstallmentId(""); }}
                    required
                  >
                    <option value="">Selecione o curso</option>
                    {(data.areas ?? []).map((area) => (
                      <optgroup key={area.id} label={area.name}>
                        {(data.courses ?? [])
                          .filter((c) => c.area_id === area.id)
                          .map((c) => (
                            <option key={c.id} value={c.id}>{c.name} — {brl.format(Number(c.base_price))}</option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-sm font-medium">
                  Forma de Pagamento *
                  <select
                    className="input-field mt-1.5"
                    value={condPaymentMethodId}
                    onChange={(e) => { setCondPaymentMethodId(e.target.value); setCondInstallmentId(""); }}
                    required
                  >
                    <option value="">Selecione</option>
                    {(data.methods ?? []).map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium">
                  Parcelamento
                  <select
                    className="input-field mt-1.5"
                    value={condInstallmentId}
                    onChange={(e) => setCondInstallmentId(e.target.value)}
                    disabled={!condPaymentMethodId}
                  >
                    <option value="">Selecione as parcelas</option>
                    {(data.installments ?? [])
                      .filter((i) => i.payment_method_id === condPaymentMethodId)
                      .map((i) => (
                        <option key={i.id} value={i.id}>{i.label} ({i.installments}x)</option>
                      ))}
                  </select>
                </label>

                <label className="text-sm font-medium">
                  Regra de Desconto
                  <select
                    className="input-field mt-1.5"
                    value={condDiscountRuleId}
                    onChange={(e) => setCondDiscountRuleId(e.target.value)}
                  >
                    <option value="">Sem desconto</option>
                    {(data.discounts ?? []).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.kind === "percentage" ? `${d.value}%` : brl.format(Number(d.value))})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Validade da Oferta (minutos) *
                  <input
                    type="number"
                    min="15"
                    step="15"
                    className="input-field mt-1.5"
                    value={condValidityMinutes}
                    onChange={(e) => setCondValidityMinutes(e.target.value)}
                    required
                  />
                  <span className="text-xs text-muted-foreground">Ex: 60 = 1 hora de validade após apresentar ao aluno</span>
                </label>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={busy} className="gap-2 font-bold">
                  <Plus size={16} /> Cadastrar Condição Comercial
                </Button>
              </div>
            </form>
          </div>

          {/* List of existing conditions */}
          <div className="data-panel overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Nome da Condição</th>
                  <th>Curso</th>
                  <th>Pagamento</th>
                  <th>Parcelamento</th>
                  <th>Desconto</th>
                  <th>Validade</th>
                  <th>Status</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {(data.conditions as any[]).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-muted-foreground py-6 text-sm">
                      Nenhuma condição cadastrada. Crie a primeira condição acima.
                    </td>
                  </tr>
                ) : (
                  (data.conditions as any[]).map((cond: any) => {
                    const course = data.courses.find((c) => c.id === cond.course_id);
                    const method = data.methods.find((m) => m.id === cond.payment_method_id);
                    const inst = data.installments.find((i) => i.id === cond.installment_option_id);
                    const disc = data.discounts.find((d) => d.id === cond.discount_rule_id);
                    return (
                      <tr key={cond.id}>
                        <td className="font-semibold text-sm">{cond.name}</td>
                        <td className="text-xs text-muted-foreground">{course?.name ?? "—"}</td>
                        <td className="text-xs text-muted-foreground">{method?.name ?? "—"}</td>
                        <td className="text-xs text-muted-foreground">{inst ? `${inst.label} (${inst.installments}x)` : "—"}</td>
                        <td className="text-xs text-emerald-600 font-semibold">
                          {disc ? `${disc.name} (${disc.kind === "percentage" ? `${disc.value}%` : brl.format(Number(disc.value))})` : "—"}
                        </td>
                        <td className="text-xs font-semibold text-amber-600">{cond.validity_minutes} min</td>
                        <td>
                          <span className={`status-pill ${cond.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                            {cond.status === "active" ? "Ativa" : "Inativa"}
                          </span>
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={`text-xs font-medium ${cond.status === "active" ? "text-amber-700 hover:text-amber-800 hover:bg-amber-50" : "text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"}`}
                            onClick={() => handleToggleStatus("commercial_conditions", cond.id)}
                            disabled={busy}
                          >
                            {cond.status === "active" ? "Inativar" : "Ativar"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 1: VENDEDORES & EQUIPE (Requirement 4 & 5) */}
      {/* ========================================================= */}
      {activeTab === "team" && (

        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Equipe Comercial</h2>
              <p className="text-xs text-muted-foreground">
                Cadastre vendedores, defina credenciais e acompanhe carteiras e conversões.
              </p>
            </div>
            <Button className="font-bold gap-2" onClick={() => setShowAddSellerModal(true)}>
              <Plus size={16} /> + Novo Vendedor
            </Button>
          </div>

          <div className="data-panel overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th>Telefone</th>
                  <th>Cargo</th>
                  <th>Status</th>
                  <th>Carteira (Contatos)</th>
                  <th>Propostas</th>
                  <th>Vendas</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.sellers.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase">
                          {s.full_name?.slice(0, 2) ?? "VD"}
                        </div>
                        <div>
                          <strong className="block text-sm font-semibold">{s.full_name}</strong>
                          <span className="text-[11px] text-muted-foreground">
                            {s.role === "admin" ? "Administrador" : s.role === "manager" ? "Gerente" : "Vendedor"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="text-xs text-muted-foreground">{formatPhone(s.phone)}</td>
                    <td className="text-xs text-muted-foreground">{s.job_title ?? "Vendedor Comercial"}</td>
                    <td>
                      <span
                        className={`status-pill ${
                          s.status === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {s.status === "active" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="font-bold">{s.contactsCount}</td>
                    <td className="font-bold">{s.proposalsCount}</td>
                    <td className="font-bold text-emerald-600">{s.salesCount}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        {/* Copy WhatsApp credentials */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs font-semibold gap-1"
                          onClick={() => {
                            const prefs = (s.preferences as Record<string, any>) || {};
                            const text = `🚀 *Acesso Liberado — Instituto Mix Comercial*\nOlá, *${s.full_name}*! O seu acesso ao sistema de vendas foi pré-cadastrado pela gerência.\n\n🔗 *Link de Acesso:* ${window.location.origin}/auth\n📧 *E-mail:* ${prefs["email"] || s.phone || "Consulte a gerência"}\n🏷️ *Código de Vendedor:* *${prefs["access_code"] || "Consulte a gerência"}*\n🔑 *Senha Inicial:* *${prefs["initial_password"] || "Informada pela gerência"}*\n\nFaça login para acessar o seu Painel de Vendas!`;
                            navigator.clipboard.writeText(text);
                            toast.success("Credenciais copiadas para WhatsApp!");
                          }}
                          title="Copiar dados de acesso para WhatsApp"
                        >
                          <Copy size={12} /> Copiar Acesso
                        </Button>

                        {/* Toggle active / inactive */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className={s.status === "active" ? "text-amber-700" : "text-emerald-700"}
                          onClick={() => handleToggleSellerStatus(s.id)}
                          disabled={busy}
                        >
                          {s.status === "active" ? <UserX size={14} className="mr-1" /> : <UserCheck size={14} className="mr-1" />}
                          {s.status === "active" ? "Inativar" : "Ativar"}
                        </Button>

                        {/* Transfer whole portfolio */}
                        {s.contactsCount > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs font-semibold"
                            onClick={() => setPortfolioFromSellerId(s.id)}
                          >
                            <ArrowRightLeft size={13} className="mr-1" /> Transferir Carteira
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal: Add Seller */}
          {showAddSellerModal && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
              <form onSubmit={handleAddSellerSubmit} className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
                <h2 className="text-lg font-bold">Cadastrar Novo Vendedor</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  O vendedor receberá acesso exclusivo ao seu ambiente comercial próprio.
                </p>

                <div className="mt-4 space-y-3">
                  <label className="block text-sm font-medium">
                    Nome Completo *
                    <input
                      className="input-field mt-1"
                      required
                      value={newSellerName}
                      onChange={(e) => setNewSellerName(e.target.value)}
                      placeholder="Ex: João da Silva"
                    />
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block text-sm font-medium">
                      E-mail Corporativo *
                      <input
                        type="email"
                        className="input-field mt-1"
                        required
                        value={newSellerEmail}
                        onChange={(e) => setNewSellerEmail(e.target.value)}
                        placeholder="vendedor@empresa.com"
                      />
                    </label>

                    <label className="block text-sm font-medium">
                      Telefone / WhatsApp
                      <input
                        className="input-field mt-1"
                        value={newSellerPhone}
                        onChange={(e) => setNewSellerPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block text-sm font-medium">
                      Senha Inicial *
                      <input
                        className="input-field mt-1 font-mono"
                        required
                        value={newSellerPassword}
                        onChange={(e) => setNewSellerPassword(e.target.value)}
                        placeholder="ex: Vend@2026"
                      />
                    </label>

                    <label className="block text-sm font-medium">
                      Código de Acesso
                      <input
                        className="input-field mt-1 font-mono uppercase"
                        value={newSellerCode}
                        onChange={(e) => setNewSellerCode(e.target.value)}
                        placeholder="ex: VD-1024"
                      />
                    </label>
                  </div>

                  <label className="block text-sm font-medium">
                    Cargo
                    <input
                      className="input-field mt-1"
                      value={newSellerTitle}
                      onChange={(e) => setNewSellerTitle(e.target.value)}
                      placeholder="Ex: Consultor Comercial"
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    Equipe
                    <select
                      className="input-field mt-1"
                      value={newSellerTeamId}
                      onChange={(e) => setNewSellerTeamId(e.target.value)}
                    >
                      <option value="">Equipe Geral</option>
                      {data.teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="ghost" type="button" onClick={() => setShowAddSellerModal(false)} disabled={busy}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={busy} className="font-bold">
                    {busy ? "Salvando..." : "Criar Vendedor"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Modal: Transfer Whole Portfolio */}
          {portfolioFromSellerId && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
              <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
                <h2 className="text-lg font-bold">Transferir Carteira Completa</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Todos os contatos de <b>{data.sellers.find((s) => s.id === portfolioFromSellerId)?.full_name}</b> serão transferidos para o vendedor selecionado.
                </p>

                <div className="mt-4 space-y-3">
                  <label className="block text-sm font-medium">
                    Transferir para *
                    <select
                      className="input-field mt-1"
                      value={portfolioTargetSellerId}
                      onChange={(e) => setPortfolioTargetSellerId(e.target.value)}
                    >
                      <option value="">Sem responsável (Banco de Leads)</option>
                      {data.sellers
                        .filter((s) => s.id !== portfolioFromSellerId && s.status === "active")
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.full_name} ({s.contactsCount} contatos atuais)
                          </option>
                        ))}
                    </select>
                  </label>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setPortfolioFromSellerId(null)} disabled={busy}>
                    Cancelar
                  </Button>
                  <Button onClick={handleTransferWholePortfolio} disabled={busy} className="font-bold">
                    {busy ? "Transferindo..." : "Confirmar Transferência"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB: GERENTES (Admin only) */}
      {/* ========================================================= */}
      {activeTab === "managers" && data.isAdmin && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Gerentes Comerciais</h2>
              <p className="text-xs text-muted-foreground">
                Cadastre gerentes que poderão pré-registrar vendedores e acompanhar toda a equipe.
              </p>
            </div>
            <Button className="font-bold gap-2" onClick={() => setShowAddManagerModal(true)}>
              <Plus size={16} /> + Novo Gerente
            </Button>
          </div>

          <div className="data-panel overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Gerente</th>
                  <th>E-mail</th>
                  <th>Telefone</th>
                  <th>Cargo</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.sellers
                  .filter((s) => s.role === "manager")
                  .length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                      Nenhum gerente cadastrado. Clique em &quot;+ Novo Gerente&quot; para adicionar.
                    </td>
                  </tr>
                ) : (
                  data.sellers
                    .filter((s) => s.role === "manager")
                    .map((s) => {
                      const prefs = (s.preferences as Record<string, any>) || {};
                      return (
                        <tr key={s.id}>
                          <td>
                            <div className="flex items-center gap-2.5">
                              <div className="grid size-8 place-items-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs uppercase">
                                {s.full_name?.slice(0, 2) ?? "GR"}
                              </div>
                              <div>
                                <strong className="block text-sm font-semibold">{s.full_name}</strong>
                                <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                                  <ShieldCheck size={10} /> Gerente
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="text-xs text-muted-foreground">{prefs["email"] || "—"}</td>
                          <td className="text-xs text-muted-foreground">{s.phone ? formatPhone(s.phone) : "—"}</td>
                          <td className="text-xs text-muted-foreground">{s.job_title ?? "Gerente Comercial"}</td>
                          <td>
                            <span className={`status-pill ${
                              s.status === "active"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-muted text-muted-foreground"
                            }`}>
                              {s.status === "active" ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs font-semibold gap-1"
                                onClick={() => {
                                  const text = `🎯 *Acesso Gerência — Instituto Mix Comercial*\nOlá, *${s.full_name}*! Seu acesso de gerente foi cadastrado.\n\n🔗 *Link de Acesso:* ${window.location.origin}/auth\n📧 *E-mail:* ${prefs["email"] || "—"}\n🔑 *Senha Inicial:* *${prefs["initial_password"] || "Informada pelo administrador"}*\n\nCom seu acesso de gerente, você pode pré-cadastrar vendedores e monitorar toda a equipe!`;
                                  navigator.clipboard.writeText(text);
                                  toast.success("Credenciais do gerente copiadas!");
                                }}
                                title="Copiar dados de acesso"
                              >
                                <Copy size={12} /> Copiar Acesso
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                className={s.status === "active" ? "text-amber-700" : "text-emerald-700"}
                                onClick={() => handleToggleSellerStatus(s.id)}
                                disabled={busy}
                              >
                                {s.status === "active" ? <UserX size={14} className="mr-1" /> : <UserCheck size={14} className="mr-1" />}
                                {s.status === "active" ? "Inativar" : "Ativar"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>

          {/* Modal: Add Manager */}
          {showAddManagerModal && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
              <form onSubmit={handleAddManagerSubmit} className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="grid size-10 place-items-center rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Cadastrar Novo Gerente</h2>
                    <p className="text-xs text-muted-foreground">O gerente terá acesso completo à equipe e poderá pré-registrar vendedores.</p>
                  </div>
                </div>

                <div className="mt-2 space-y-3">
                  <label className="block text-sm font-medium">
                    Nome Completo *
                    <input
                      className="input-field mt-1"
                      required
                      value={newManagerName}
                      onChange={(e) => setNewManagerName(e.target.value)}
                      placeholder="Ex: Maria Souza"
                    />
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block text-sm font-medium">
                      E-mail Corporativo *
                      <input
                        type="email"
                        className="input-field mt-1"
                        required
                        value={newManagerEmail}
                        onChange={(e) => setNewManagerEmail(e.target.value)}
                        placeholder="gerente@empresa.com"
                      />
                    </label>

                    <label className="block text-sm font-medium">
                      Telefone / WhatsApp
                      <input
                        className="input-field mt-1"
                        value={newManagerPhone}
                        onChange={(e) => setNewManagerPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block text-sm font-medium">
                      Senha Inicial *
                      <input
                        className="input-field mt-1 font-mono"
                        required
                        value={newManagerPassword}
                        onChange={(e) => setNewManagerPassword(e.target.value)}
                        placeholder="ex: Gerente@2026"
                      />
                    </label>

                    <label className="block text-sm font-medium">
                      Cargo
                      <input
                        className="input-field mt-1"
                        value={newManagerTitle}
                        onChange={(e) => setNewManagerTitle(e.target.value)}
                        placeholder="Ex: Gerente Comercial"
                      />
                    </label>
                  </div>

                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-300">
                    <strong>Permissões do gerente:</strong> pré-cadastrar vendedores, visualizar toda a equipe, acompanhar carteiras e conversões.
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="ghost" type="button" onClick={() => setShowAddManagerModal(false)} disabled={busy}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={busy} className="font-bold gap-2">
                    <ShieldCheck size={15} />
                    {busy ? "Salvando..." : "Criar Gerente"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 2: GATILHOS COMERCIAIS (Requirement 29) */}
      {/* ========================================================= */}
      {activeTab === "enrollment" && <EnrollmentSettings data={data} />}
      {activeTab === "triggers" && (
        <section className="space-y-6">
          <form onSubmit={handleSaveTrigger} className="data-panel p-5">
            <h2 className="text-base font-bold mb-1">Cadastrar Novo Gatilho Comercial</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Gatilhos visuais informam e reforçam a proposta sem mensagens falsas ou escassez fictícia.
            </p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm font-medium">
                Identificador *
                <input
                  className="input-field mt-1"
                  required
                  value={triggerName}
                  onChange={(e) => setTriggerName(e.target.value)}
                  placeholder="Ex: Condição Especial"
                />
              </label>

              <label className="text-sm font-medium">
                Título do Badge *
                <input
                  className="input-field mt-1"
                  required
                  value={triggerTitle}
                  onChange={(e) => setTriggerTitle(e.target.value)}
                  placeholder="Ex: Oferta do Dia"
                />
              </label>

              <label className="text-sm font-medium">
                Tipo de Gatilho
                <select
                  className="input-field mt-1"
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                >
                  <option value="special_condition">Condição Especial</option>
                  <option value="economy">Economia Real</option>
                  <option value="validity">Validade da Condição</option>
                  <option value="discount_pct">Percentual de Desconto</option>
                  <option value="custom">Mensagem Personalizada</option>
                </select>
              </label>

              <label className="text-sm font-medium">
                Texto de Exibição *
                <input
                  className="input-field mt-1"
                  required
                  value={triggerText}
                  onChange={(e) => setTriggerText(e.target.value)}
                  placeholder="Ex: Condição válida neste atendimento."
                />
              </label>
            </div>

            <div className="mt-4 flex justify-end">
              <Button type="submit" disabled={busy} className="font-bold">
                {busy ? "Salvando..." : "Salvar Gatilho"}
              </Button>
            </div>
          </form>

          {/* Triggers List */}
          <div className="data-panel p-5">
            <h3 className="text-sm font-bold mb-3">Gatilhos Comerciais Ativos</h3>
            <div className="divide-y divide-border">
              {((data.triggers ?? []) as Array<{ id: string; title: string; template_text: string; is_active: boolean }>).map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="trigger-pill mb-1">
                      <Tag size={12} /> {t.title}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.template_text}</p>
                  </div>
                  <span className="status-pill text-[11px] bg-emerald-100 text-emerald-800">
                    {t.is_active ? "Ativo" : "Inativo"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 3: CURSOS & ÁREAS (Requirement 9 & 28) */}
      {/* ========================================================= */}
      {activeTab === "courses" && (
        <section className="space-y-6">
          <form onSubmit={handleSaveCatalog} className="data-panel p-5">
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                size="sm"
                variant={catalogType === "course" ? "default" : "outline"}
                onClick={() => setCatalogType("course")}
              >
                Cadastrar Curso
              </Button>
              <Button
                type="button"
                size="sm"
                variant={catalogType === "area" ? "default" : "outline"}
                onClick={() => setCatalogType("area")}
              >
                Cadastrar Área
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm font-medium">
                Nome *
                <input
                  className="input-field mt-1"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder={catalogType === "course" ? "Ex: Gestão Financeira" : "Ex: Tecnologia"}
                />
              </label>

              {catalogType === "course" && (
                <>
                  <label className="text-sm font-medium">
                    Área *
                    <select
                      className="input-field mt-1"
                      required
                      value={itemAreaId}
                      onChange={(e) => setItemAreaId(e.target.value)}
                    >
                      <option value="">Selecione</option>
                      {data.areas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-medium">
                    Carga Horária (h) *
                    <input
                      type="number"
                      className="input-field mt-1"
                      required
                      value={itemWorkload}
                      onChange={(e) => setItemWorkload(e.target.value)}
                      placeholder="120"
                    />
                  </label>

                  <label className="text-sm font-medium">
                    Modalidade *
                    <select
                      className="input-field mt-1"
                      value={itemModality}
                      onChange={(e) => setItemModality(e.target.value)}
                    >
                      <option value="Presencial">Presencial</option>
                      <option value="Híbrido">Híbrido</option>
                      <option value="Online">Online / EAD</option>
                    </select>
                  </label>

                  <label className="text-sm font-medium">
                    Preço Base (R$) *
                    <input
                      type="number"
                      step="0.01"
                      className="input-field mt-1"
                      required
                      value={itemBasePrice}
                      onChange={(e) => setItemBasePrice(e.target.value)}
                      placeholder="2500,00"
                    />
                  </label>
                </>
              )}
            </div>

            {catalogType === "course" && <CourseEnrollmentFields globalFee={data.enrollmentFee} custom={itemEnrollmentCustom} value={itemEnrollment} material={itemMaterial} onCustom={setItemEnrollmentCustom} onValue={setItemEnrollment} onMaterial={setItemMaterial} />}

            <div className="mt-4 flex justify-end">
              <Button type="submit" disabled={busy} className="font-bold">
                {busy ? "Salvando..." : "Salvar no Catálogo"}
              </Button>
            </div>
          </form>

          <EnrollmentSettings data={data} courseOnly />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="data-panel p-5">
              <h3 className="text-sm font-bold mb-3">Cursos Cadastrados ({data.courses.length})</h3>
              <div className="divide-y divide-border">
                {data.courses.map((c) => (
                  <div key={c.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <strong className="block text-foreground">{c.name}</strong>
                      <span className="text-muted-foreground">
                        {c.workload_hours}h • {c.modality}
                      </span>
                    </div>
                    <b className="text-primary">{brl.format(Number(c.base_price))}</b>
                  </div>
                ))}
              </div>
            </div>

            <div className="data-panel p-5">
              <h3 className="text-sm font-bold mb-3">Áreas ({data.areas.length})</h3>
              <div className="divide-y divide-border">
                {data.areas.map((a) => (
                  <div key={a.id} className="py-2.5 flex justify-between items-center text-xs">
                    <span className="font-semibold">{a.name}</span>
                    <span className="status-pill text-[10px]">{a.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 4: DESCONTOS & REGRAS COMERCIAIS */}
      {/* ========================================================= */}
      {activeTab === "discounts" && (
        <section className="space-y-6">
          <form onSubmit={handleSaveDiscount} className="data-panel p-5">
            <h2 className="text-base font-bold mb-1">Cadastrar Nova Regra de Desconto</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Regras gerais liberadas para aplicação na simulação comercial.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm font-medium">
                Nome da Regra *
                <input
                  className="input-field mt-1"
                  required
                  value={discountName}
                  onChange={(e) => setDiscountName(e.target.value)}
                  placeholder="Ex: Campanha de Inverno"
                />
              </label>

              <label className="text-sm font-medium">
                Tipo de Desconto *
                <select
                  className="input-field mt-1"
                  value={discountKind}
                  onChange={(e) => setDiscountKind(e.target.value as "percentage" | "fixed")}
                >
                  <option value="percentage">Percentual (%)</option>
                  <option value="fixed">Valor Fixo (R$)</option>
                </select>
              </label>

              <label className="text-sm font-medium">
                Valor *
                <input
                  type="number"
                  step="0.01"
                  className="input-field mt-1"
                  required
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="Ex: 15 (para 15%) ou 300 (para R$ 300)"
                />
              </label>
            </div>

            <div className="mt-4 flex justify-end">
              <Button type="submit" disabled={busy} className="font-bold">
                {busy ? "Salvando..." : "Salvar Regra de Desconto"}
              </Button>
            </div>
          </form>

          <div className="data-panel p-5">
            <h3 className="text-sm font-bold mb-3">Regras de Desconto Cadastradas</h3>
            <div className="divide-y divide-border">
              {data.discounts.map((d) => (
                <div key={d.id} className="py-2.5 flex justify-between items-center text-xs">
                  <div>
                    <strong className="block text-foreground">{d.name}</strong>
                    <span className="text-muted-foreground">
                      {d.kind === "percentage" ? `${d.value}% de redução` : brl.format(Number(d.value))}
                    </span>
                  </div>
                  <span className="status-pill text-[10px] bg-emerald-100 text-emerald-800">
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB FORMAS DE PAGAMENTO */}
      {/* ========================================================= */}
      {activeTab === "payments" && (
        <section className="space-y-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newMethodName) return;
              setBusy(true);
              setError("");
              setMessage("");
              try {
                await saveMethod({ data: { name: newMethodName, sortOrder: Number(newMethodSort) || 0 } });
                await refresh();
                setMessage("Forma de pagamento cadastrada com sucesso!");
                setNewMethodName("");
                setNewMethodSort("0");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Erro ao cadastrar forma de pagamento.");
              } finally {
                setBusy(false);
              }
            }}
            className="data-panel p-5"
          >
            <h2 className="text-base font-bold mb-1 flex items-center gap-2">
              <Plus size={16} className="text-primary" /> Adicionar Forma de Pagamento
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Cadastre métodos de pagamento como Cartão de Crédito, PIX, Boleto Bancário ou Carnê Próprio.
            </p>
            <div className="grid gap-3 sm:grid-cols-3 max-w-2xl">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Nome da Forma de Pagamento</label>
                <input
                  className="input-field"
                  required
                  placeholder="Ex: Cartão de Crédito (Visa/Master)"
                  value={newMethodName}
                  onChange={(e) => setNewMethodName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Ordem de Exibição</label>
                <input
                  type="number"
                  className="input-field"
                  value={newMethodSort}
                  onChange={(e) => setNewMethodSort(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={busy} className="font-bold w-full">
                  {busy ? "Salvando..." : "Salvar Forma de Pagamento"}
                </Button>
              </div>
            </div>
          </form>

          <div className="data-panel p-5">
            <h3 className="text-sm font-bold mb-3">Formas de Pagamento Cadastradas ({data.methods.length})</h3>
            <div className="space-y-2">
              {data.methods.map((pm, i) => (
                <div key={pm.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-muted-foreground w-4">{i + 1}.</span>
                    <CreditCard size={16} className="text-primary" />
                    <strong className="font-semibold text-foreground text-sm">{pm.name}</strong>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`status-pill ${pm.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                      {pm.status === "active" ? "Ativo" : "Inativo"}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => handleToggleStatus("payment_methods", pm.id)}
                    >
                      {pm.status === "active" ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB PARCELAMENTOS */}
      {/* ========================================================= */}
      {activeTab === "installments" && (
        <section className="space-y-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newInstPaymentMethodId || !newInstLabel) return;
              setBusy(true);
              setError("");
              setMessage("");
              try {
                await saveInst({
                  data: {
                    paymentMethodId: newInstPaymentMethodId,
                    installments: Number(newInstCount) || 1,
                    label: newInstLabel,
                    sortOrder: Number(newInstSort) || 0,
                  },
                });
                await refresh();
                setMessage("Opção de parcelamento cadastrada com sucesso!");
                setNewInstPaymentMethodId("");
                setNewInstCount("12");
                setNewInstLabel("12x");
                setNewInstSort("0");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Erro ao cadastrar parcelamento.");
              } finally {
                setBusy(false);
              }
            }}
            className="data-panel p-5"
          >
            <h2 className="text-base font-bold mb-1 flex items-center gap-2">
              <Plus size={16} className="text-primary" /> Nova Opção de Parcelamento
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Vincule opções de parcelas a uma Forma de Pagamento (ex: Cartão de Crédito → 12x ou Carnê → 18x).
            </p>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 max-w-4xl">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Forma de Pagamento</label>
                <select
                  className="input-field"
                  required
                  value={newInstPaymentMethodId}
                  onChange={(e) => setNewInstPaymentMethodId(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {data.methods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Nº de Parcelas</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  className="input-field"
                  required
                  value={newInstCount}
                  onChange={(e) => {
                    setNewInstCount(e.target.value);
                    setNewInstLabel(`${e.target.value}x`);
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Rótulo Exibido</label>
                <input
                  className="input-field"
                  required
                  placeholder="Ex: 12x Sem Juros"
                  value={newInstLabel}
                  onChange={(e) => setNewInstLabel(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={busy} className="font-bold w-full">
                  {busy ? "Salvando..." : "Salvar Parcelamento"}
                </Button>
              </div>
            </div>
          </form>

          <div className="data-panel p-5">
            <h3 className="text-sm font-bold mb-3">Opções de Parcelamento ({data.installments.length})</h3>
            <div className="space-y-2">
              {data.installments.map((inst, i) => {
                const parentMethod = data.methods.find((m) => m.id === inst.payment_method_id);
                return (
                  <div key={inst.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-muted-foreground w-4">{i + 1}.</span>
                      <Calendar size={16} className="text-primary" />
                      <div>
                        <strong className="font-semibold text-foreground text-sm block">{inst.label}</strong>
                        <span className="text-muted-foreground text-[11px]">
                          Forma de Pagamento: <b>{parentMethod?.name || "Todas"}</b> ({inst.installments} parcelas)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`status-pill ${inst.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                        {inst.status === "active" ? "Ativo" : "Inativo"}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => handleToggleStatus("installment_options", inst.id)}
                      >
                        {inst.status === "active" ? "Desativar" : "Ativar"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 5: ETAPAS DO CRM (Requirement 21) */}
      {/* ========================================================= */}
      {activeTab === "crm" && (
        <section className="space-y-6">
          <form onSubmit={handleSaveStage} className="data-panel p-5">
            <h2 className="text-base font-bold mb-1">Adicionar Etapa do Funil CRM</h2>
            <div className="mt-3 flex gap-3 max-w-md">
              <input
                className="input-field"
                required
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                placeholder="Ex: Aguardando Retorno"
              />
              <Button type="submit" disabled={busy} className="font-bold shrink-0">
                {busy ? "Salvando..." : "Adicionar Etapa"}
              </Button>
            </div>
          </form>

          <div className="data-panel p-5">
            <h3 className="text-sm font-bold mb-3">Etapas Ativas ({data.stages.length})</h3>
            <div className="space-y-2">
              {data.stages.map((st, i) => (
                <div key={st.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-muted-foreground w-4">{i + 1}.</span>
                    <span className="stage-dot" />
                    <strong className="font-semibold text-foreground">{st.name}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    {st.is_won && <span className="status-pill bg-emerald-100 text-emerald-800">Ganho</span>}
                    {st.is_lost && <span className="status-pill bg-rose-100 text-rose-800">Perdido</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </AppShell>
  );
}
