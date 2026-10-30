import { useState } from "react";
import {
  Printer,
  X,
  Share2,
  CheckCircle2,
  GraduationCap,
  Building2,
  Calendar,
  CreditCard,
  FileCheck,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { brl, dateTime, dateOnly } from "@/lib/use-workspace";
import { openWhatsAppShare, getWhatsAppShareUrl } from "@/lib/whatsapp";

export interface StudentEnrollmentDetails {
  fullName: string;
  cpf: string;
  rg: string;
  rgEmitter: string;
  birthDate: string;
  age?: number;
  isMinor: boolean;
  guardianName?: string;
  guardianCpf?: string;
  guardianKinship?: string;
  guardianPhone?: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  email?: string;
  phone: string;
}

export interface EnrollmentReceiptModalProps {
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
    created_at?: string;
    seller_name?: string;
    notes?: string | null;
  };
  student: StudentEnrollmentDetails;
  poloInfo?: {
    name: string;
    cnpj?: string;
    address?: string;
    phone?: string;
  };
}

export function EnrollmentReceiptModal({
  isOpen,
  onClose,
  proposal,
  student,
  poloInfo = {
    name: "Instituto Mix de Profissões — Polo Oficial",
    cnpj: "18.354.298/0001-92",
    address: "Central de Matrículas e Formação Profissional",
    phone: "(11) 4003-0000",
  },
}: EnrollmentReceiptModalProps) {
  if (!isOpen) return null;

  const count = Math.max(1, Number(proposal.installments) || 1);
  const portionVal = Number(proposal.installment_value);
  const enrollmentVal = Number(proposal.enrollment_fee_snapshot ?? 0);
  const totalContract = Number(proposal.final_price);
  const originalPrice = Number(proposal.original_price ?? totalContract);
  const discountAmount = Number(proposal.discount_amount ?? 0);

  // Simulação de datas de vencimento das parcelas (a cada 30 dias a partir do próximo mês)
  const installmentDates: { number: number; date: string; value: number }[] = [];
  const baseDate = new Date();
  baseDate.setMonth(baseDate.getMonth() + 1);
  baseDate.setDate(10); // Dia padrão de vencimento

  for (let i = 1; i <= count; i++) {
    const d = new Date(baseDate);
    d.setMonth(baseDate.getMonth() + (i - 1));
    installmentDates.push({
      number: i,
      date: dateOnly.format(d),
      value: portionVal,
    });
  }

  function handlePrint() {
    window.print();
  }

  function handleShareWhatsApp() {
    const message = [
      `🎓 *Instituto Mix de Profissões — Comprovante de Matrícula*`,
      `Olá, *${student.fullName.split(" ")[0]}*! Sua matrícula foi confirmada com sucesso.`,
      ``,
      `📚 *Curso:* ${proposal.course_name}`,
      `💰 *Taxa de Matrícula:* ${brl.format(enrollmentVal)} (paga)`,
      `💳 *Saldo Parcelado:* ${count}x de ${brl.format(portionVal)}`,
      `📄 *Comprovante Digital Oficial:* ${window.location.origin}/propostas?id=${proposal.id}`,
      ``,
      `Seja muito bem-vindo(a) ao Instituto Mix! 🚀`,
    ].join("\n");

    openWhatsAppShare(student.phone, message);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-w-none">
        {/* Barra superior de ações (oculta na impressão) */}
        <div className="flex items-center justify-between border-b border-border bg-muted/60 px-5 py-3.5 print:hidden">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-emerald-600 text-white font-bold">
              <CheckCircle2 size={16} />
            </span>
            <span className="text-sm font-bold text-foreground">Comprovante Comercial de Matrícula</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
              onClick={handleShareWhatsApp}
            >
              <Share2 size={13} /> Enviar no WhatsApp
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-xs font-bold bg-primary text-primary-foreground shadow-xs"
              onClick={handlePrint}
            >
              <Printer size={14} /> Imprimir / PDF
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Fechar">
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* ── CORPO DO RECIBO / DOCUMENTO FORMAL (Pronto para Impressão) ── */}
        <div className="p-6 sm:p-8 space-y-6 text-foreground print:p-4 print:text-black">
          {/* Cabeçalho Oficial */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-primary/20 pb-5">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                <GraduationCap size={28} />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground print:text-black">
                  INSTITUTO MIX DE PROFISSÕES
                </h1>
                <p className="text-xs text-muted-foreground print:text-gray-600 font-medium">
                  {poloInfo.name} • CNPJ: {poloInfo.cnpj}
                </p>
                <p className="text-[11px] text-muted-foreground print:text-gray-500">
                  {poloInfo.address} • Central: {poloInfo.phone}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right rounded-lg bg-primary/5 p-3 border border-primary/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                Comprovante Comercial Oficial
              </span>
              <strong className="text-sm font-extrabold block text-foreground print:text-black">
                Proposta Nº {proposal.id.slice(0, 8).toUpperCase()}
              </strong>
              <span className="text-[11px] text-muted-foreground print:text-gray-600 block">
                Emissão: {dateTime.format(new Date())}
              </span>
            </div>
          </div>

          {/* Dados do Aluno e Responsável */}
          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            {/* Bloco Aluno */}
            <div className="rounded-xl border border-border p-4 bg-muted/20 print:border-gray-300">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary block mb-2.5">
                Dados do Aluno (Contratante Educacional)
              </span>
              <dl className="space-y-1.5">
                <div>
                  <dt className="text-muted-foreground inline print:text-gray-600">Nome: </dt>
                  <dd className="font-bold inline text-foreground print:text-black">{student.fullName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground inline print:text-gray-600">CPF: </dt>
                  <dd className="font-semibold inline tabular-nums">{student.cpf}</dd>
                  <span className="text-muted-foreground mx-1.5">•</span>
                  <dt className="text-muted-foreground inline print:text-gray-600">RG: </dt>
                  <dd className="font-semibold inline">{student.rg} ({student.rgEmitter})</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground inline print:text-gray-600">Nascimento: </dt>
                  <dd className="font-semibold inline tabular-nums">
                    {student.birthDate} {student.isMinor ? "(Menor de 18 anos)" : "(Maior de idade)"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground inline print:text-gray-600">Endereço: </dt>
                  <dd className="font-medium inline">
                    {student.street}, {student.number} {student.complement ? `- ${student.complement}` : ""} - {student.neighborhood}, {student.city}/{student.state} (CEP: {student.cep})
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground inline print:text-gray-600">Contato: </dt>
                  <dd className="font-medium inline">{student.phone} {student.email ? `• ${student.email}` : ""}</dd>
                </div>
              </dl>
            </div>

            {/* Bloco Responsável se menor ou Dados da Matrícula */}
            <div className="rounded-xl border border-border p-4 bg-muted/20 print:border-gray-300">
              {student.isMinor && student.guardianName ? (
                <>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-2.5">
                    Responsável Legal (Representante)
                  </span>
                  <dl className="space-y-1.5">
                    <div>
                      <dt className="text-muted-foreground inline print:text-gray-600">Nome: </dt>
                      <dd className="font-bold inline text-foreground print:text-black">{student.guardianName}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground inline print:text-gray-600">CPF: </dt>
                      <dd className="font-semibold inline tabular-nums">{student.guardianCpf || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground inline print:text-gray-600">Parentesco: </dt>
                      <dd className="font-semibold inline">{student.guardianKinship || "Responsável Legal"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground inline print:text-gray-600">Telefone: </dt>
                      <dd className="font-medium inline">{student.guardianPhone || "—"}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary block mb-2.5">
                    Informações do Atendimento
                  </span>
                  <dl className="space-y-1.5">
                    <div>
                      <dt className="text-muted-foreground inline print:text-gray-600">Vendedor Responsável: </dt>
                      <dd className="font-semibold inline">{proposal.seller_name || "Equipe Comercial IM"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground inline print:text-gray-600">Status da Matrícula: </dt>
                      <dd className="font-bold text-emerald-700 dark:text-emerald-400 inline">CONFIRMADA / EFETIVADA</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground inline print:text-gray-600">Modalidade: </dt>
                      <dd className="font-medium inline">{proposal.course_modality || "Presencial / Prática"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground inline print:text-gray-600">Carga Horária: </dt>
                      <dd className="font-semibold inline">{proposal.course_workload_hours ? `${proposal.course_workload_hours}h` : "Conforme matriz"}</dd>
                    </div>
                  </dl>
                </>
              )}
            </div>
          </div>

          {/* Detalhamento do Curso Contratado */}
          <div className="rounded-xl border-2 border-border p-4 bg-card print:border-gray-400">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-border">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Curso Contratado
                </span>
                <strong className="text-base sm:text-lg font-black text-foreground print:text-black">
                  {proposal.course_name}
                </strong>
              </div>
              <span className="rounded bg-primary/10 text-primary px-2.5 py-1 text-xs font-bold print:border print:border-gray-400">
                Material Didático Incluso
              </span>
            </div>

            {/* Quadro Financeiro */}
            <div className="grid gap-3 pt-3 sm:grid-cols-3 text-xs">
              <div className="rounded-lg bg-muted/40 p-3">
                <span className="text-muted-foreground block text-[11px]">Matrícula (Entrada):</span>
                <strong className="text-base font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {brl.format(enrollmentVal)}
                </strong>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Cobrança única à parte</span>
              </div>

              <div className="rounded-lg bg-muted/40 p-3">
                <span className="text-muted-foreground block text-[11px]">Curso Parcelado:</span>
                <strong className="text-base font-black text-foreground tabular-nums">
                  {count}x de {brl.format(portionVal)}
                </strong>
                <span className="text-[10px] text-muted-foreground block mt-0.5">{proposal.payment_method_name}</span>
              </div>

              <div className="rounded-lg bg-primary/10 p-3">
                <span className="text-primary font-bold block text-[11px]">Total Geral da Contratação:</span>
                <strong className="text-base font-black text-primary tabular-nums">
                  {brl.format(totalContract)}
                </strong>
                {discountAmount > 0 && (
                  <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                    Economia: {brl.format(discountAmount)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Cronograma Estimado de Parcelas */}
          {count > 1 && (
            <div className="rounded-xl border border-border p-4 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Cronograma Estimado de Vencimento das Parcelas
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {installmentDates.map((item) => (
                  <div key={item.number} className="flex justify-between p-2 rounded bg-muted/30 border border-border/60">
                    <span className="font-semibold">{item.number}ª parcela:</span>
                    <span className="tabular-nums font-bold">{item.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Termo de Concordância */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-[11px] text-muted-foreground leading-relaxed print:text-gray-600">
            <h4 className="font-bold uppercase tracking-wider text-foreground print:text-black mb-1">
              Termo de Concordância e Ciência Comercial
            </h4>
            <p>
              O contratante declara ter ciência e concordar integralmente com as condições comerciais e financeiras
              acima discriminadas para o curso de qualificação profissional no Instituto Mix. A taxa de matrícula
              constitui pagamento de entrada independente e não integra as parcelas da formação. O material didático
              encontra-se incluído conforme o plano acordado, sem cobrança extra.
            </p>
          </div>

          {/* Linhas de Assinatura */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs print:pt-12">
            <div className="border-t border-foreground/40 pt-2 print:border-black">
              <span className="font-bold block text-foreground print:text-black">{student.fullName}</span>
              <span className="text-[10px] text-muted-foreground print:text-gray-600">
                {student.isMinor ? "Assinatura do Aluno / Responsável Legal" : "Assinatura do Aluno Contratante"}
              </span>
            </div>

            <div className="border-t border-foreground/40 pt-2 print:border-black">
              <span className="font-bold block text-foreground print:text-black">{poloInfo.name}</span>
              <span className="text-[10px] text-muted-foreground print:text-gray-600">
                Polo Autorizado Instituto Mix
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="flex justify-end gap-3 border-t border-border bg-muted/40 p-4 print:hidden">
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={handlePrint} className="gap-2 font-bold">
            <Printer size={15} /> Imprimir Comprovante
          </Button>
        </div>
      </div>
    </div>
  );
}
