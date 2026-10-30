import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  AlertCircle,
  Search,
  ShieldCheck,
  User,
  MapPin,
  FileCheck,
  X,
  CreditCard,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { brl, formatPhone } from "@/lib/use-workspace";
import {
  validateCPF,
  formatCPF,
  formatCEP,
  calculateAge,
  fetchViaCEP,
} from "@/lib/validation";
import { formalizeEnrollmentContract } from "@/lib/crm.functions";
import { EnrollmentReceiptModal, StudentEnrollmentDetails } from "@/components/enrollment-receipt-modal";

export interface EnrollmentCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: {
    id: string;
    course_name: string;
    course_workload_hours?: number | null;
    course_modality?: string | null;
    payment_method_name: string;
    installments: number;
    installment_value: number;
    enrollment_fee_snapshot?: number | null;
    original_price?: number;
    discount_amount?: number;
    final_price: number;
    seller_name?: string;
  };
  student: {
    id: string;
    full_name: string;
    whatsapp: string;
    email?: string | null;
  };
  onSuccess?: () => void;
}

export function EnrollmentCompletionModal({
  isOpen,
  onClose,
  proposal,
  student,
  onSuccess,
}: EnrollmentCompletionModalProps) {
  const formalize = useServerFn(formalizeEnrollmentContract);

  // Form states
  const [fullName, setFullName] = useState(student.full_name || "");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [rgEmitter, setRgEmitter] = useState("SSP");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState(student.whatsapp || "");
  const [email, setEmail] = useState(student.email || "");

  // Legal Guardian states (for minors)
  const [guardianName, setGuardianName] = useState("");
  const [guardianCpf, setGuardianCpf] = useState("");
  const [guardianKinship, setGuardianKinship] = useState("Mãe");
  const [guardianPhone, setGuardianPhone] = useState("");

  // Address states
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  // Feedback and UI
  const [cepLoading, setCepLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedStudentData, setCompletedStudentData] = useState<StudentEnrollmentDetails | null>(null);

  // Calculate age dynamically
  const ageInfo = calculateAge(birthDate);

  // Auto-fetch CEP
  useEffect(() => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      setCepLoading(true);
      fetchViaCEP(cleanCep)
        .then((res) => {
          if (res && !res.error) {
            setStreet(res.street || "");
            setNeighborhood(res.neighborhood || "");
            setCity(res.city || "");
            setState(res.state || "");
            setError("");
          } else if (res?.error) {
            setError("CEP não encontrado. Por favor, preencha o endereço manualmente.");
          }
        })
        .finally(() => setCepLoading(false));
    }
  }, [cep]);

  if (!isOpen && !showReceipt) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validations
    if (!fullName.trim()) {
      setError("Informe o nome completo do aluno.");
      return;
    }

    if (!validateCPF(cpf)) {
      setError("O CPF do aluno informado é inválido. Verifique os dígitos.");
      return;
    }

    if (!rg.trim() || !rgEmitter.trim()) {
      setError("Informe o RG e o Órgão Emissor do aluno.");
      return;
    }

    if (!birthDate) {
      setError("Informe a data de nascimento do aluno.");
      return;
    }

    if (ageInfo.isMinor) {
      if (!guardianName.trim()) {
        setError("Para alunos menores de 18 anos, o nome do responsável legal é obrigatório.");
        return;
      }
      if (!validateCPF(guardianCpf)) {
        setError("O CPF do responsável legal é inválido.");
        return;
      }
      if (!guardianPhone.trim()) {
        setError("Informe o telefone de contato do responsável legal.");
        return;
      }
    }

    if (cep.replace(/\D/g, "").length !== 8 || !street.trim() || !number.trim() || !city.trim() || !state.trim()) {
      setError("Preencha o endereço completo do aluno (CEP, Logradouro, Número, Cidade e UF).");
      return;
    }

    setBusy(true);

    const payload: StudentEnrollmentDetails = {
      fullName,
      cpf: formatCPF(cpf),
      rg,
      rgEmitter,
      birthDate,
      age: ageInfo.age,
      isMinor: ageInfo.isMinor,
      guardianName: ageInfo.isMinor ? guardianName : undefined,
      guardianCpf: ageInfo.isMinor ? formatCPF(guardianCpf) : undefined,
      guardianKinship: ageInfo.isMinor ? guardianKinship : undefined,
      guardianPhone: ageInfo.isMinor ? guardianPhone : undefined,
      cep: formatCEP(cep),
      street,
      number,
      complement,
      neighborhood,
      city,
      state: state.toUpperCase(),
      email: email || undefined,
      phone,
    };

    try {
      await formalize({
        data: {
          proposalId: proposal.id,
          studentData: payload,
          notes: "Contrato educacional formalizado com validação de dados.",
        },
      });

      setCompletedStudentData(payload);
      setShowReceipt(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao formalizar matrícula.");
    } finally {
      setBusy(false);
    }
  }

  // Se o recibo foi aberto após sucesso
  if (showReceipt && completedStudentData) {
    return (
      <EnrollmentReceiptModal
        isOpen={true}
        onClose={() => {
          setShowReceipt(false);
          onClose();
        }}
        proposal={proposal}
        student={completedStudentData}
      />
    );
  }

  const enrollmentVal = Number(proposal.enrollment_fee_snapshot ?? 0);
  const count = Number(proposal.installments);
  const portionVal = Number(proposal.installment_value);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-primary/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground font-bold shadow-xs">
              <FileCheck size={20} />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Formalização da Matrícula & Contrato
              </h2>
              <p className="text-xs text-muted-foreground">
                Preencha os dados oficiais do aluno para emissão do contrato educacional.
              </p>
            </div>
          </div>
          <Button size="icon-sm" variant="ghost" onClick={onClose} disabled={busy}>
            <X size={18} />
          </Button>
        </div>

        {/* Resumo da proposta contratada */}
        <div className="bg-muted/40 px-6 py-3 border-b border-border text-xs flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-muted-foreground">Curso: </span>
            <strong className="text-foreground">{proposal.course_name}</strong>
          </div>
          <div className="flex items-center gap-3">
            <span>
              Matrícula: <b className="text-emerald-700 dark:text-emerald-400">{brl.format(enrollmentVal)}</b>
            </span>
            <span>•</span>
            <span>
              Curso: <b>{count}x de {brl.format(portionVal)}</b>
            </span>
          </div>
        </div>

        {/* Formulário de Cadastro Formal */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-left text-sm max-h-[75vh] overflow-y-auto">
          {/* Seção 1: Dados Pessoais do Aluno */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-border/80 pb-1.5">
              <User size={15} className="text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                1. Identificação do Aluno
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2 block text-xs font-semibold">
                Nome Completo do Aluno *
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field mt-1 font-medium"
                  placeholder="Nome conforme documento de identidade"
                />
              </label>

              <label className="block text-xs font-semibold">
                CPF do Aluno *
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  className={`input-field mt-1 tabular-nums font-mono ${
                    cpf.replace(/\D/g, "").length === 11
                      ? validateCPF(cpf)
                        ? "border-emerald-500 focus:border-emerald-500 ring-emerald-500/20"
                        : "border-destructive focus:border-destructive ring-destructive/20"
                      : ""
                  }`}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
                {cpf.replace(/\D/g, "").length === 11 && !validateCPF(cpf) && (
                  <span className="text-[11px] text-destructive mt-0.5 block font-normal">
                    CPF inválido (verifique os dígitos).
                  </span>
                )}
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs font-semibold">
                  RG *
                  <input
                    type="text"
                    required
                    value={rg}
                    onChange={(e) => setRg(e.target.value)}
                    className="input-field mt-1"
                    placeholder="Número do RG"
                  />
                </label>
                <label className="block text-xs font-semibold">
                  Órgão Emissor *
                  <input
                    type="text"
                    required
                    value={rgEmitter}
                    onChange={(e) => setRgEmitter(e.target.value.toUpperCase())}
                    className="input-field mt-1 uppercase"
                    placeholder="SSP/UF"
                  />
                </label>
              </div>

              <label className="block text-xs font-semibold">
                Data de Nascimento *
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="input-field mt-1"
                />
                {birthDate && (
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold">
                    {ageInfo.isMinor ? (
                      <span className="text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                        Aluno Menor de Idade ({ageInfo.age} anos) — Requer Responsável Legal
                      </span>
                    ) : (
                      <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                        Aluno Maior de Idade ({ageInfo.age} anos)
                      </span>
                    )}
                  </span>
                )}
              </label>

              <label className="block text-xs font-semibold">
                Telefone / WhatsApp *
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  className="input-field mt-1 font-mono"
                  placeholder="(00) 00000-0000"
                />
              </label>

              <label className="sm:col-span-2 block text-xs font-semibold">
                E-mail para Envio do Contrato
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field mt-1"
                  placeholder="aluno@email.com"
                />
              </label>
            </div>
          </div>

          {/* Seção 2: Responsável Legal (Obrigatório se < 18 anos) */}
          {ageInfo.isMinor && (
            <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <ShieldCheck size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Dados Obrigatórios do Responsável Legal (Menor de 18 Anos)
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Exigido por lei para formalização do contrato educacional e validade jurídica.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2 block text-xs font-semibold">
                  Nome Completo do Responsável *
                  <input
                    type="text"
                    required={ageInfo.isMinor}
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    className="input-field mt-1"
                    placeholder="Nome completo do pai, mãe ou tutor legal"
                  />
                </label>

                <label className="block text-xs font-semibold">
                  CPF do Responsável *
                  <input
                    type="text"
                    required={ageInfo.isMinor}
                    inputMode="numeric"
                    value={guardianCpf}
                    onChange={(e) => setGuardianCpf(formatCPF(e.target.value))}
                    className={`input-field mt-1 tabular-nums font-mono ${
                      guardianCpf.replace(/\D/g, "").length === 11
                        ? validateCPF(guardianCpf)
                          ? "border-emerald-500"
                          : "border-destructive"
                        : ""
                    }`}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </label>

                <label className="block text-xs font-semibold">
                  Grau de Parentesco *
                  <select
                    value={guardianKinship}
                    onChange={(e) => setGuardianKinship(e.target.value)}
                    className="input-field mt-1"
                  >
                    <option value="Mãe">Mãe</option>
                    <option value="Pai">Pai</option>
                    <option value="Tutor Legal">Tutor Legal</option>
                    <option value="Avô / Avó">Avô / Avó</option>
                    <option value="Outro">Outro Responsável</option>
                  </select>
                </label>

                <label className="sm:col-span-2 block text-xs font-semibold">
                  Telefone / WhatsApp do Responsável *
                  <input
                    type="tel"
                    required={ageInfo.isMinor}
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(formatPhone(e.target.value))}
                    className="input-field mt-1 font-mono"
                    placeholder="(00) 00000-0000"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Seção 3: Endereço Residencial com busca ViaCEP */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-border/80 pb-1.5">
              <MapPin size={15} className="text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                2. Endereço Residencial do Contratante
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="sm:col-span-1 block text-xs font-semibold">
                CEP *
                <div className="relative mt-1">
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    value={cep}
                    onChange={(e) => setCep(formatCEP(e.target.value))}
                    className="input-field pr-8 tabular-nums font-mono"
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {cepLoading && (
                    <span className="absolute right-2.5 top-2.5 size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  )}
                </div>
              </label>

              <label className="sm:col-span-2 block text-xs font-semibold">
                Logradouro (Rua, Avenida, etc.) *
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="input-field mt-1"
                  placeholder="Ex: Rua das Flores"
                />
              </label>

              <label className="block text-xs font-semibold">
                Número *
                <input
                  type="text"
                  required
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="input-field mt-1"
                  placeholder="123"
                />
              </label>

              <label className="block text-xs font-semibold">
                Complemento
                <input
                  type="text"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  className="input-field mt-1"
                  placeholder="Apto 101, Bloco B"
                />
              </label>

              <label className="block text-xs font-semibold">
                Bairro *
                <input
                  type="text"
                  required
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="input-field mt-1"
                  placeholder="Centro"
                />
              </label>

              <label className="sm:col-span-2 block text-xs font-semibold">
                Cidade *
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="input-field mt-1"
                  placeholder="Sua cidade"
                />
              </label>

              <label className="block text-xs font-semibold">
                Estado (UF) *
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  className="input-field mt-1 uppercase text-center font-bold"
                  placeholder="SP"
                />
              </label>
            </div>
          </div>

          {/* Feedback de erro amigável */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={busy}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="w-full sm:w-auto font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2 h-11 px-6"
            >
              <CheckCircle2 size={18} />
              {busy ? "Gravando Contrato..." : "EFETIVAR MATRÍCULA E GERAR RECIBO"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
