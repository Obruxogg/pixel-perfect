import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Instituto Mix — Portal Comercial" },
      { name: "description", content: "Sistema comercial interno do Instituto Mix de Profissões." },
      { property: "og:title", content: "Instituto Mix — Portal Comercial" },
      { property: "og:description", content: "Simulações, propostas e CRM para equipes do Instituto Mix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => navigate({ to: data.user ? "/dashboard" : "/auth", replace: true }));
  }, [navigate]);
  return <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">Abrindo o Portal Comercial Instituto Mix…</div>;
}
