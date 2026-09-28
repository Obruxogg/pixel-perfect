import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { bootstrapProfile, getWorkspace } from "@/lib/crm.functions";

export function useWorkspace() {
  const bootstrap = useServerFn(bootstrapProfile);
  const load = useServerFn(getWorkspace);
  return useQuery({
    queryKey: ["workspace"],
    queryFn: async () => {
      await bootstrap({ data: {} });
      return load();
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useRefreshWorkspace() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ["workspace"] });
}

export const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export const dateOnly = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

export const timeOnly = new Intl.DateTimeFormat("pt-BR", {
  timeStyle: "short",
});

export type WorkspaceData = NonNullable<Awaited<ReturnType<typeof getWorkspace>>>;

export function formatPhone(phone?: string | null) {
  if (!phone) return "—";
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return phone;
}
