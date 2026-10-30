import { brl } from "@/lib/use-workspace";
import type { ComparativeAnchorData } from "@/lib/avista-comparison";
import { Sparkles, ArrowRight, CheckCircle2, Zap, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ComparativeAVistaAnchorProps {
  anchor: ComparativeAnchorData | null | undefined;
  isPresentation?: boolean;
  onApplyAVista?: () => void;
  className?: string;
}

export function ComparativeAVistaAnchor({
  anchor,
  isPresentation = false,
  onApplyAVista,
  className = "",
}: ComparativeAVistaAnchorProps) {
  // Regra 2.1: Exibe APENAS se houver 2 ou mais parcelas e houver economia positiva
  if (!anchor || !anchor.showAnchor) {
    return null;
  }

  // Visual no Modo Apresentação ao Aluno (destaque visual de alto impacto para fechamento)
  if (isPresentation) {
    return (
      <div
        className={`rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 via-card to-teal-500/5 p-5 md:p-6 shadow-md transition-all ${className}`}
        aria-label="Opção comparativa de pagamento à vista"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-emerald-500/20">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <Zap size={15} />
            </span>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                Oportunidade à Vista
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                {anchor.paymentMethodName} com super desconto
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-3 py-1 text-xs font-extrabold shadow-xs">
            <Sparkles size={13} />
            Economize {brl.format(anchor.economy)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Coluna 1: Plano Parcelado */}
          <div className="rounded-xl bg-background/80 p-3.5 border border-border flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Plano Parcelado ({anchor.installments}x)
              </span>
              <div className="mt-1 font-semibold text-foreground text-sm">
                {anchor.installments}x de {brl.format(anchor.installmentValue)}/mês
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                + Matrícula: {brl.format(anchor.enrollmentPayable)}
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-border flex items-baseline justify-between">
              <span className="text-[11px] text-muted-foreground">Total Parcelado:</span>
              <strong className="text-sm font-bold text-foreground tabular-nums">
                {brl.format(anchor.totalParcelado)}
              </strong>
            </div>
          </div>

          {/* Coluna 2: Quitação à Vista */}
          <div className="rounded-xl bg-emerald-500/10 dark:bg-emerald-950/30 p-3.5 border-2 border-emerald-500/40 flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                  Quitação à Vista
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                  Melhor Valor
                </span>
              </div>
              <div className="mt-1 font-extrabold text-emerald-800 dark:text-emerald-200 text-sm flex items-center gap-1.5">
                <QrCode size={15} className="text-emerald-600" />
                <span>Curso por {brl.format(anchor.aVistaCourseNet)}</span>
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                + Matrícula: {brl.format(anchor.enrollmentPayable)}
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-emerald-500/30 flex items-baseline justify-between">
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                Total à Vista:
              </span>
              <strong className="text-base font-black text-emerald-700 dark:text-emerald-300 tabular-nums">
                {brl.format(anchor.totalAVista)}
              </strong>
            </div>
          </div>
        </div>

        {/* Rodapé com Economia em Destaque */}
        <div className="mt-4 rounded-xl bg-emerald-600/10 border border-emerald-500/30 p-3 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-medium">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>
              Ao quitar à vista no <b>{anchor.paymentMethodName}</b>, você economiza{" "}
              <b className="text-emerald-700 dark:text-emerald-300 font-extrabold">{brl.format(anchor.economy)}</b>{" "}
              imediatamente!
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Visual Padrão no Painel de Vendas / Atendimento (com apoio operacional ao vendedor)
  return (
    <div
      className={`rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-teal-500/5 p-4 space-y-3 text-left transition-all shadow-xs ${className}`}
      aria-label="Âncora comparativa de valor à vista"
    >
      <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
          <Sparkles size={14} className="text-emerald-600" /> Âncora Comparativa à Vista
        </span>
        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          Economia de {brl.format(anchor.economy)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Parcelado */}
        <div className="rounded-lg bg-background/90 p-2.5 border border-border">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
            Plano Parcelado ({anchor.installments}x)
          </span>
          <div className="text-xs font-bold text-foreground mt-0.5">
            {anchor.installments}x de {brl.format(anchor.installmentValue)}
          </div>
          <div className="mt-1 pt-1 border-t border-border/60 flex justify-between text-[11px]">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-semibold tabular-nums text-foreground">{brl.format(anchor.totalParcelado)}</span>
          </div>
        </div>

        {/* À Vista */}
        <div className="rounded-lg bg-emerald-500/10 dark:bg-emerald-950/20 p-2.5 border border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase block">
              À Vista ({anchor.paymentMethodName})
            </span>
            <span className="text-[9px] font-extrabold text-emerald-600 uppercase">−{anchor.economyPercentage}%</span>
          </div>
          <div className="text-xs font-black text-emerald-800 dark:text-emerald-200 mt-0.5">
            {brl.format(anchor.aVistaCourseNet)}
          </div>
          <div className="mt-1 pt-1 border-t border-emerald-500/20 flex justify-between text-[11px]">
            <span className="text-muted-foreground">Total com Matrícula:</span>
            <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{brl.format(anchor.totalAVista)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-emerald-500/10 p-2.5 border border-emerald-500/20 text-xs text-foreground flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground leading-snug">
          💡 Pagando à vista no <b>{anchor.paymentMethodName}</b>, o aluno economiza <b>{brl.format(anchor.economy)}</b> no valor total.
        </span>
        {onApplyAVista && anchor.conditionId && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-950 shrink-0 gap-1"
            onClick={onApplyAVista}
            title="Mudar seleção comercial para esta condição à vista"
          >
            <span>Aplicar à Vista</span>
            <ArrowRight size={12} />
          </Button>
        )}
      </div>
    </div>
  );
}
