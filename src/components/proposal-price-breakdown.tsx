import { brl } from "@/lib/use-workspace";
import { formatInstallmentSummary } from "@/lib/commercial-options";
import { ShieldCheck, Sparkles, BookOpen, CreditCard } from "lucide-react";

export type PriceBreakdownProps = {
  courseName?: string | undefined;
  coursePrice?: number | null | undefined;
  courseNet?: number | null | undefined;
  installmentBalance?: number | null | undefined;
  installments?: number | undefined;
  installmentValue?: number | undefined;
  lastInstallmentValue?: number | undefined;
  paymentMethodName?: string | undefined;
  enrollmentFee?: number | null | undefined;
  enrollmentPromotionalFee?: number | null | undefined;
  enrollmentDiscount?: number | null | undefined;
  enrollmentPayable?: number | null | undefined;
  enrollmentCondition?: "normal" | "promotional" | string | undefined;
  materialDiscount?: number | null | undefined;
  materialBilling?: "included" | "discounted" | "separate" | undefined;
  subtotal?: number | null | undefined;
  original?: number | undefined;
  final: number; // Total geral da contratação
  discounts?: { name: string; amount: number; value?: number | undefined; kind?: string | undefined }[] | undefined;
  isPresentation?: boolean | undefined;
};

export function ProposalPriceBreakdown({
  courseName,
  coursePrice,
  courseNet,
  installmentBalance,
  installments = 1,
  installmentValue,
  lastInstallmentValue,
  paymentMethodName,
  enrollmentFee,
  enrollmentPromotionalFee,
  enrollmentDiscount,
  enrollmentPayable,
  enrollmentCondition,
  materialDiscount,
  materialBilling = "included",
  subtotal,
  original,
  final,
  discounts = [],
  isPresentation = false,
}: PriceBreakdownProps) {
  // Base numbers with fallbacks
  const tablePrice = coursePrice ?? original ?? final;
  const netCourse = courseNet ?? subtotal ?? (tablePrice - discounts.reduce((s, d) => s + (d.amount || 0), 0));
  const parcelable = installmentBalance ?? netCourse;
  const count = Math.max(1, installments || 1);
  const portionVal = installmentValue ?? (count > 0 ? Math.floor((parcelable * 100) / count) / 100 : parcelable);

  // Enrollment handling
  const normEnrollment = enrollmentFee != null ? Number(enrollmentFee) : 0;
  const promoEnrollment = enrollmentPromotionalFee != null ? Number(enrollmentPromotionalFee) : normEnrollment;
  const payableEnrollment = enrollmentPayable != null ? Number(enrollmentPayable) : (enrollmentCondition === "promotional" ? promoEnrollment : normEnrollment);
  const discountEnrollment = enrollmentDiscount != null ? Number(enrollmentDiscount) : Math.max(0, normEnrollment - payableEnrollment);
  const isPromo = enrollmentCondition === "promotional" || (discountEnrollment > 0 && payableEnrollment < normEnrollment);

  // Total contract check
  const calculatedTotal = Math.round((parcelable + payableEnrollment) * 100) / 100;
  const totalContract = final > 0 ? final : calculatedTotal;

  // Course discounts only
  const courseReductions = discounts.filter((d) => d.name !== "Desconto de Material Didático");

  return (
    <div className="text-left text-sm" aria-label="Composição financeira da proposta">
      {/* ── 1. BLOCO DO CURSO ───────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card/60 p-4 mb-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded bg-primary/10 text-primary">
              <BookOpen size={14} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {courseName || "Valor do Curso"}
            </span>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
            Tabela: {brl.format(tablePrice)}
          </span>
        </div>

        <dl className="space-y-2.5 py-3 text-xs">
          <div className="flex justify-between items-center">
            <dt className="text-muted-foreground">Valor de tabela do curso</dt>
            <dd className="font-semibold tabular-nums text-foreground">{brl.format(tablePrice)}</dd>
          </div>

          {materialDiscount != null && Number(materialDiscount) > 0 && (
            <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400">
              <dt className="flex items-center gap-1.5">
                <Sparkles size={12} /> Desconto de Material Didático
              </dt>
              <dd className="font-semibold tabular-nums">− {brl.format(Number(materialDiscount))}</dd>
            </div>
          )}

          {courseReductions.map((disc, idx) => (
            <div key={idx} className="flex justify-between items-center text-emerald-700 dark:text-emerald-400">
              <dt className="flex items-center gap-1.5 min-w-0 pr-2">
                <Sparkles size={12} className="shrink-0" />
                <span className="truncate">{disc.name}</span>
              </dt>
              <dd className="shrink-0 font-semibold tabular-nums">− {brl.format(disc.amount)}</dd>
            </div>
          ))}

          <div className="flex justify-between items-center border-t border-border/60 pt-2 font-bold text-sm">
            <dt className="text-foreground">Valor líquido do curso (saldo parcelável)</dt>
            <dd className="tabular-nums text-primary">{brl.format(parcelable)}</dd>
          </div>

          {paymentMethodName && (
            <div className="mt-2 rounded bg-muted/50 p-2.5 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CreditCard size={13} className="text-primary" />
                <span>{paymentMethodName}</span>
              </span>
              <strong className="text-foreground tabular-nums">
                {formatInstallmentSummary(parcelable, count, portionVal)}
              </strong>
            </div>
          )}
        </dl>
      </div>

      {/* ── 2. BLOCO DO MATERIAL DIDÁTICO ───────────────────────── */}
      <div className="rounded-lg border border-border/80 bg-muted/30 px-4 py-3 mb-4 flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">Material didático:</span>
        <span className="font-semibold text-foreground flex items-center gap-1">
          <ShieldCheck size={13} className="text-emerald-600" />
          {materialBilling === "included" || Number(materialDiscount) > 0
            ? "Incluso sem cobrança adicional"
            : "Conforme cadastro comercial"}
        </span>
      </div>

      {/* ── 3. BLOCO DA MATRÍCULA (INDEPENDENTE) ─────────────────── */}
      <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 mb-4">
        <div className="flex items-center justify-between pb-2 border-b border-primary/20">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Matrícula Comercial
          </span>
          <span className="text-[11px] font-medium text-muted-foreground italic">
            Cobrada separadamente
          </span>
        </div>

        <div className="mt-3 space-y-2 text-xs">
          {isPromo && discountEnrollment > 0 && (
            <>
              <div className="flex justify-between text-muted-foreground">
                <span>Matrícula normal:</span>
                <span className="line-through tabular-nums">{brl.format(normEnrollment)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                <span>Desconto promocional:</span>
                <span className="tabular-nums">− {brl.format(discountEnrollment)}</span>
              </div>
            </>
          )}

          <div className="flex justify-between items-center pt-1 border-t border-primary/10 font-bold text-sm">
            <span className="text-foreground">
              {isPromo ? "Matrícula a pagar (promocional):" : "Matrícula a pagar:"}
            </span>
            <span className="text-base text-primary tabular-nums">
              {brl.format(payableEnrollment)}
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground italic pt-1">
            * A matrícula não integra as parcelas do curso e é paga separadamente.
          </p>
        </div>
      </div>

      {/* ── 4. RESUMO GERAL DA CONTRATAÇÃO ──────────────────────── */}
      <div className="rounded-xl border-2 border-border bg-card p-4 shadow-sm">
        <div className="space-y-1.5 text-xs pb-3 border-b border-border">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Curso parcelado ({count}x):</span>
            <span className="font-semibold tabular-nums">{brl.format(parcelable)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Matrícula (à parte):</span>
            <span className="font-semibold tabular-nums">{brl.format(payableEnrollment)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-2 pt-3">
          <div>
            <span className="text-xs uppercase tracking-wider font-extrabold text-foreground block">
              Total Geral da Contratação
            </span>
            <span className="text-[11px] text-muted-foreground">
              Curso ({count}× de {brl.format(portionVal)}) + Matrícula ({brl.format(payableEnrollment)})
            </span>
          </div>
          <strong className="text-2xl font-black tabular-nums text-primary">
            {brl.format(totalContract)}
          </strong>
        </div>
      </div>
    </div>
  );
}