import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { bootstrapProfile, getWorkspace } from "@/lib/crm.functions";
export function useWorkspace(){const bootstrap=useServerFn(bootstrapProfile);const load=useServerFn(getWorkspace);return useQuery({queryKey:["workspace"],queryFn:async()=>{await bootstrap({data:{}});return load();}})}
export function useRefreshWorkspace(){const client=useQueryClient();return()=>client.invalidateQueries({queryKey:["workspace"]})}
export const brl=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
export const dateTime=new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"});
