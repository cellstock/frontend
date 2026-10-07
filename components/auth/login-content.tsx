"use client";
import { AuthPageLayout } from "@/components/auth/auth-page-layout";
import { LoginForm } from "@/components/auth/login-form";
export function LoginContent() {
  return (
    <AuthPageLayout
      eyebrow="Welcome back"
      title="Sign in to CelleXa"
      description="Enter your account details to access the management portal."
    >
      <LoginForm />
    </AuthPageLayout>
  );
}
