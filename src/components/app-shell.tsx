import { Link, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Calculator,
  KanbanSquare,
  Users,
  FileText,
  Settings,
  LogOut,
  GraduationCap,
  ShieldCheck,
  UserCheck,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/use-workspace";

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  activeRoleOverride?: "seller" | "manager" | "admin" | null;
  onRoleOverrideChange?: (role: "seller" | "manager" | "admin" | null) => void;
  actions?: React.ReactNode;
}

export function AppShell({
  children,
  title,
  subtitle,
  actions,
}: AppShellProps) {
  const navigate = useNavigate();
  const { data } = useWorkspace();

  const userRoles = (data?.roles ?? []).map((r) => r.role);
  const isAdmin = userRoles.includes("admin");
  const isManager = userRoles.includes("manager");
  const isSeller = !isAdmin && !isManager;

  const roleLabel = isAdmin ? "Administrador" : isManager ? "Gerente" : "Vendedor";
  const roleBadgeColor = isAdmin
    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
    : isManager
    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";

  // Build navigation items based on role
  const navItems = [
    {
      to: "/dashboard",
      label: isSeller ? "Meu Painel" : isManager ? "Painel Gerente" : "Visão Geral",
      icon: LayoutDashboard,
      show: true,
    },
    {
      to: "/simulacao",
      label: "Nova Proposta",
      icon: Calculator,
      show: true,
      highlight: true,
    },
    {
      to: "/crm",
      label: isSeller ? "Meu CRM" : "CRM da Equipe",
      icon: KanbanSquare,
      show: true,
    },
    {
      to: "/contatos",
      label: isSeller ? "Meus Contatos" : "Carteira & Contatos",
      icon: Users,
      show: true,
    },
    {
      to: "/propostas",
      label: isSeller ? "Minhas Propostas" : "Propostas da Equipe",
      icon: FileText,
      show: true,
    },
    {
      to: "/configuracoes",
      label: isManager ? "Gestão & Equipe" : "Configurações",
      icon: Settings,
      show: !isSeller, // Vendedores cannot access settings!
    },
  ].filter((item) => item.show);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-sidebar-border bg-sidebar p-4 lg:flex lg:flex-col shadow-xs">
        {/* Brand */}
        <div className="mb-6 flex items-center gap-3 px-2">
          <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <GraduationCap size={22} />
          </span>
          <div>
            <strong className="block text-base leading-tight font-bold">Nexo Comercial</strong>
            <span className="text-xs text-muted-foreground">Sistema de Atendimento</span>
          </div>
        </div>

        {/* User Card */}
        <div className="mb-5 rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase">
              {data?.profile?.full_name?.slice(0, 2) ?? "US"}
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-xs font-semibold">
                {data?.profile?.full_name ?? "Carregando..."}
              </strong>
              <div className="mt-1 flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.2 text-[10px] font-semibold ${roleBadgeColor}`}>
                  {isAdmin ? <ShieldCheck size={11} /> : isManager ? <Briefcase size={11} /> : <UserCheck size={11} />}
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5">
          {navItems.map(({ to, label, icon: Icon, highlight }) => (
            <Link
              key={to}
              to={to}
              className={`flex h-10 items-center justify-between rounded-md px-3 text-sm font-medium transition-colors ${
                highlight
                  ? "bg-primary/10 text-primary hover:bg-primary/15 font-semibold"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
              activeProps={{
                className: "bg-sidebar-accent text-sidebar-primary font-semibold shadow-2xs",
              }}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} />
                <span>{label}</span>
              </div>
              {highlight && <ChevronRight size={14} className="text-primary" />}
            </Link>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="mt-auto space-y-2 pt-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth", replace: true });
            }}
          >
            <LogOut size={16} />
            Encerrar Sessão
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-5 py-4.5 backdrop-blur md:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold ${roleBadgeColor}`}>
                  {roleLabel}
                </span>
              </div>
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2.5">{actions}</div>}
          </div>
        </header>

        {/* Page Content */}
        <div className="p-5 pb-24 md:p-8 md:pb-12">{children}</div>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-border bg-background/95 backdrop-blur p-2 lg:hidden shadow-lg">
          {navItems.slice(0, 5).map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              aria-label={label}
              className="grid size-11 place-items-center rounded-md text-muted-foreground"
              activeProps={{ className: "bg-primary/10 text-primary font-bold" }}
            >
              <Icon size={20} />
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
