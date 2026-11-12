export type Role = "OWNER" | "MEMBER" | "PLATFORM_ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Tenant {
  id: string;
  name: string;
  status: "ACTIVE" | "SUSPENDED";
}

export interface AuthResponse {
  accessToken: string;
  user: User;
  tenant: Tenant;
}

export interface Member {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}
export interface PlanQuota {
  metric: string;
  limit: number;
  period: "MONTHLY";
  enforcement: "HARD" | "SOFT";
}

export interface Plan {
  id: string;
  key: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  interval: string;
  features: string[];
  quotas: PlanQuota[];
}

export interface Subscription {
  status: "ACTIVE" | "PAST_DUE" | "CANCELED";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan: Plan;
}