import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexo Comercial — Gestão de cursos e matrículas" },
      { name: "description", content: "Ambiente comercial para simulações, propostas e acompanhamento de matrículas." },
      { property: "og:title", content: "Nexo Comercial" },
      { property: "og:description", content: "Simulações, propostas e CRM para equipes de cursos profissionalizantes." },
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
  return <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">Abrindo o Nexo Comercial…</div>;
}
