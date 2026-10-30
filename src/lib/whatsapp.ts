import { brl } from "@/lib/use-workspace";

export interface ProposalWhatsAppParams {
  studentName: string;
  whatsapp: string;
  courseName: string;
  workloadHours?: number | null;
  modality?: string | null;
  originalPrice: number;
  finalPrice: number;
  discountName?: string | null;
  discountAmount?: number | null;
  enrollmentPayable?: number | null;
  installments: number;
  installmentValue: number;
  proposalId?: string;
  validUntil?: string | null;
  origin?: string;
}

/**
 * Gera mensagem pré-formatada em Markdown do WhatsApp com todos os detalhes da proposta
 */
export function buildProposalWhatsAppMessage(params: ProposalWhatsAppParams): string {
  const firstName = params.studentName?.trim().split(" ")[0] || "Aluno(a)";
  const origin = params.origin || (typeof window !== "undefined" ? window.location.origin : "");
  const proposalUrl = params.proposalId ? `${origin}/propostas?id=${params.proposalId}` : "";

  const lines: (string | null)[] = [
    `🎓 *Instituto Mix de Profissões*`,
    `Olá, *${firstName}*! Tudo bem? Preparamos a sua proposta comercial com condições especiais:`,
    ``,
    `📚 *Curso:* ${params.courseName}`,
    params.workloadHours ? `⏱️ *Carga Horária:* ${params.workloadHours} horas` : null,
    params.modality ? `📍 *Modalidade:* ${params.modality}` : null,
    `📖 *Material Didático:* Incluso sem cobrança adicional`,
    ``,
    `💰 *Composição Financeira:*`,
    `• *Valor de Tabela:* ~${brl.format(params.originalPrice)}~`,
    params.discountAmount && params.discountAmount > 0
      ? `• *Condição Especial:* ${params.discountName || "Desconto Especial"} (-${brl.format(params.discountAmount)})`
      : null,
    params.enrollmentPayable != null
      ? `• *Matrícula:* ${brl.format(params.enrollmentPayable)} (cobrada à parte)`
      : null,
    `• *Plano de Parcelamento:* *${params.installments}x de ${brl.format(params.installmentValue)}/mês*`,
    ``,
    params.validUntil ? `⏳ *Validade da Oferta:* até ${params.validUntil}` : null,
    proposalUrl ? `🔗 *Visualizar Proposta Formal:* ${proposalUrl}` : null,
    ``,
    `Ficou alguma dúvida ou podemos garantir a sua vaga agora mesmo? 😊`,
  ];

  return lines.filter((l): l is string => l !== null).join("\n");
}

/**
 * Cria o link universal do WhatsApp (https://wa.me/55...)
 */
export function getWhatsAppShareUrl(rawPhone: string, message: string): string {
  const digits = (rawPhone || "").replace(/\D/g, "");
  const phone = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Abre o WhatsApp diretamente na web ou aplicativo
 */
export function openWhatsAppShare(rawPhone: string, message: string): void {
  const url = getWhatsAppShareUrl(rawPhone, message);
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
