import { brl } from "@/lib/use-workspace";

type PriceBreakdownProps = {
  coursePrice?: number | null;
  enrollmentFee?: number | null;
  materialDiscount?: number | null;
  subtotal?: number | null;
  original: number;
  final: number;
  discounts?: { name: string; amount: number }[];
};

export function ProposalPriceBreakdown({ coursePrice, enrollmentFee, materialDiscount, subtotal, original, final, discounts }: PriceBreakdownProps) {
  const detailed = coursePrice != null && enrollmentFee != null && materialDiscount != null && subtotal != null;
  const reductions = discounts?.length ? discounts : [{ name: "Condição especial", amount: Math.max(0, (subtotal ?? original) - final) }];
  return (
    <div className="text-left text-sm" aria-label="Composição do valor da proposta">
      <div className="border-b border-border pb-5">
        <p className="text-2xl font-extrabold tabular-nums">{brl.format(coursePrice ?? original)}</p>
        <p className="mt-1 text-muted-foreground">{detailed ? "Valor original do curso" : "Valor original da proposta"}</p>
      </div>
      <dl className="space-y-4 py-5">
        {detailed && <>
          <div className="flex justify-between gap-4"><dt>Matrícula</dt><dd className="shrink-0 font-semibold tabular-nums">+ {brl.format(enrollmentFee)}</dd></div>
          <div className="flex justify-between gap-4"><dt>Total com matrícula</dt><dd className="shrink-0 tabular-nums">{brl.format(original)}</dd></div>
          <div className="flex justify-between gap-4"><dt>Desconto de material didático</dt><dd className="shrink-0 font-semibold tabular-nums text-success">− {brl.format(materialDiscount)}</dd></div>
          <div className="border-t border-border pt-4 font-bold"><dt>Subtotal</dt><dd className="mt-1 tabular-nums">{brl.format(subtotal)}</dd></div>
        </>}
        {reductions.map((discount, index) => <div key={index} className="flex justify-between gap-4"><dt className="min-w-0 break-words">{discount.name}</dt><dd className="shrink-0 font-semibold tabular-nums text-success">− {brl.format(discount.amount)}</dd></div>)}
      </dl>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-5 font-bold">
        <span>Valor final da proposta</span><strong className="text-2xl tabular-nums text-primary">{brl.format(final)}</strong>
      </div>
    </div>
  );
}