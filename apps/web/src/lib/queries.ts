import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Plan, Subscription } from "@/types";

export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: async () => (await api<{ plans: Plan[] }>("/plans")).plans,
  });
}

export function useSubscription() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: async () => (await api<{ subscription: Subscription }>("/subscription")).subscription,
  });
}