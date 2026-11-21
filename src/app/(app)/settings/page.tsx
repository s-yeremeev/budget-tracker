import { redirect } from "next/navigation";
import { SettingsView } from "@/components/settings/settings-view";
import { getCurrentUserId, getProfile } from "@/lib/server/session";

export default async function SettingsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const profile = await getProfile(userId); // спільний з layout запит
  return <SettingsView profile={profile} />;
}
