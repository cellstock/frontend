import type { Metadata } from "next";
import { ProfileContent } from "@/components/dashboard/profile-content";
export const metadata: Metadata = { title: "My Profile" };
export default function ProfilePage() {
  return <ProfileContent />;
}
