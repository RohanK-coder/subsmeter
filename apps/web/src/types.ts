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