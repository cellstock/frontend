"use client";
import { AuthPageLayout } from "@/components/auth/auth-page-layout";
import { SignupForm } from "@/components/auth/signup-form";
export function SignupContent() {
  return (
    <AuthPageLayout
      eyebrow="Get started"
      title="Create your CelleXa account"
      description="Enter your details to access the management portal."
    >
      <SignupForm />
    </AuthPageLayout>
  );
}
