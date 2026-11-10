import { request } from './client';
import type { LoginRequest, MessageResponse, Profile, SessionResponse, SignupRequest } from '../types/auth';

export const authApi = {
  login: (data: LoginRequest) => request<SessionResponse>('POST', '/auth/login', data),
  signup: (data: SignupRequest) => request<MessageResponse>('POST', '/auth/signup', data),
  logout: () => request<void>('POST', '/auth/logout'),
  verifyEmail: (token: string) => request<MessageResponse>('POST', '/auth/verify-email', { token }),
  resendVerification: (email: string) => request<MessageResponse>('POST', '/auth/resend-verification', { email }),
  me: () => request<Profile>('GET', '/users/me', undefined, { auth: true }),
};
