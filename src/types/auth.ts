export type Role = 'employee' | 'manager' | 'admin' | 'super_admin';

export interface Profile {
  id: number;
  name: string;
  email: string;
  role: Role;
  department: { id: number; name: string } | null;
  manager: { id: number; name: string } | null;
  emailVerified: boolean;
  mustChangePassword: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface SessionResponse {
  accessToken: string;
  mustChangePassword: boolean;
}

export interface MessageResponse {
  message: string;
}

export interface FieldError {
  field: string;
  message: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  employee: 'Employee',
  manager: 'Manager',
  admin: 'Admin (HR)',
  super_admin: 'Super admin (IT)',
};
