export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface SignupFormErrors {
  name?: string;
  email?: string;
  password?: string;
  password_confirmation?: string;
  form?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
  form?: string;
}

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: string;
  roleSlug: string;
  status: string;
  lastLoginAt: string | null;
  hasAvatar: boolean;
}

export interface LaravelAuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: { name: string; slug: string };
  status: string;
  last_login_at: string | null;
  has_avatar: boolean;
}

export interface CurrentUserResponse {
  success: boolean;
  data?: {
    user: LaravelAuthenticatedUser;
  };
  message?: string;
}

export interface ProfileUpdateInput {
  name: string;
  email: string;
  current_password?: string;
  password?: string;
  password_confirmation?: string;
}
