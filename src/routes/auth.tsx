import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, GraduationCap, LoaderCircle, Lock, ShieldCheck, UserCheck, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapProfile, resolveSellerLogin } from "@/lib/crm.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso Corporativo — Nexo Comercial" },
      { name: "description", content: "Acesso interno e protegido para a equipe comercial e gestão." },
      { property: "og:title", content: "Acesso Corporativo — Nexo Comercial" },
      { property: "og:description", content: "Acesso interno e protegido para a equipe comercial e gestão." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const bootstrap = useServerFn(bootstrapProfile);
  const resolveLogin = useServerFn(resolveSellerLogin);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrorMessage("");

    try {
      let loginEmail = identifier.trim();

      // If user typed an access code (e.g., "VD-1234") or phone instead of an email, resolve it
      if (!loginEmail.includes("@")) {
        const resolved = await resolveLogin({ data: { identifier: loginEmail } });
        if (!resolved?.email) {
          throw new Error("Código de vendedor ou credencial não encontrada. Confirme seu pré-cadastro com o gerente.");
        }
        loginEmail = resolved.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password.trim(),
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("E-mail, código ou senha incorretos. Verifique suas credenciais pré-cadastradas.");
        }
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error("Não foi possível autenticar o usuário.");
      }

      // Sync and ensure profile
      await bootstrap({ data: {} });

      // Navigate to dashboard
      navigate({ to: "/dashboard" });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Não foi possível realizar o login.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_.9fr] bg-background text-foreground">
      {/* Left Hero Section (Corporate Branding) */}
      <section className="hidden bg-hero p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between relative overflow-hidden">
        <div className="flex items-center gap-3 font-bold text-lg tracking-tight z-10">
          <span className="grid size-11 place-items-center rounded-xl bg-background/20 backdrop-blur-md shadow-xs">
            <GraduationCap size={24} />
          </span>
          <div>
            <span>Nexo Comercial</span>
            <span className="block text-[11px] font-normal text-primary-foreground/70">Ambiente Operacional Interno</span>
          </div>
        </div>

        <div className="max-w-xl z-10 my-auto py-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-md text-primary-foreground/90 mb-5">
            <ShieldCheck size={14} /> Sistema Restrito à Equipe
          </span>
          <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight">
            Gestão Comercial, Simulações & Conversão de Matrículas.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-primary-foreground/80 leading-relaxed">
            Painel exclusivo para consultores de vendas e coordenação comercial. Conduza cada oportunidade do primeiro contato ao fechamento.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 max-w-md pt-6 border-t border-primary-foreground/15">
            <div className="rounded-lg bg-background/10 p-3.5 backdrop-blur-xs">
              <span className="text-xs font-semibold text-primary-foreground/75 block">Vendedores</span>
              <strong className="text-sm font-medium mt-1 block">Acesso direto ao seu painel pessoal de vendas e propostas</strong>
            </div>
            <div className="rounded-lg bg-background/10 p-3.5 backdrop-blur-xs">
              <span className="text-xs font-semibold text-primary-foreground/75 block">Gerência</span>
              <strong className="text-sm font-medium mt-1 block">Pré-cadastro de acessos e monitoramento geral de carteira</strong>
            </div>
          </div>
        </div>

        <div className="z-10 flex items-center justify-between text-xs text-primary-foreground/60 border-t border-primary-foreground/10 pt-4">
          <span>Nexo Comercial © {new Date().getFullYear()}</span>
          <span>Ambiente corporativo protegido por RLS</span>
        </div>
      </section>

      {/* Right Login Section */}
      <section className="flex items-center justify-center p-6 md:p-12 bg-card/40">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Brand */}
          <div className="flex items-center gap-2.5 lg:hidden mb-4">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap size={20} />
            </span>
            <div>
              <strong className="block text-base leading-tight font-bold">Nexo Comercial</strong>
              <span className="text-xs text-muted-foreground">Área da Equipe</span>
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary mb-2">
              <Lock size={12} /> Acesso Corporativo
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Entrar no Sistema</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Insira o e-mail ou código de vendedor pré-cadastrado pela gerência.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                E-mail ou Código de Acesso
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="ex: vendedor@comercial.com ou VD-1024"
                  required
                  autoComplete="username"
                  className="input-field pl-3 pr-3 text-sm h-11"
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Dica: Você pode digitar seu e-mail corporativo ou o código informado pelo gerente.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Senha de Acesso
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha corporativa"
                  required
                  autoComplete="current-password"
                  className="input-field pr-11 text-sm h-11"
                />
                <button
                  type="button"
                  aria-label="Mostrar ou ocultar senha"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive flex items-start gap-2.5">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed font-medium">{errorMessage}</p>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full h-11 text-base font-bold shadow-md gap-2" disabled={busy}>
              {busy ? (
                <>
                  <LoaderCircle className="animate-spin" size={18} /> Acessando...
                </>
              ) : (
                <>
                  <UserCheck size={18} /> Acessar Meu Painel
                </>
              )}
            </Button>
          </form>

          {/* Exclusive Pre-registration Notice */}
          <div className="rounded-xl border border-border/80 bg-muted/50 p-4 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <ShieldCheck size={15} className="text-primary" />
              <span>Acesso restrito por pré-registro</span>
            </div>
            <p className="leading-relaxed">
              O cadastro de novos consultores comerciais é realizado previamente pelo Gerente ou Administrador da equipe.
            </p>
            <p className="text-[11px] text-muted-foreground/80 border-t border-border/60 pt-2">
              Não possui acesso ou esqueceu sua senha? Solicite as credenciais diretamente ao seu gestor comercial.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
