import type { Metadata } from "next";
import { SignupContent } from "@/components/auth/signup-content";
import { GuestSession } from "@/components/auth/guest-session";
export const metadata: Metadata = { title: "Create account" };
export default function SignupPage() {
  return (
    <GuestSession>
      <SignupContent />
    </GuestSession>
  );
}
