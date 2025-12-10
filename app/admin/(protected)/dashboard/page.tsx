// app/admin/(protected)/dashboard/page.tsx
export const runtime = "nodejs";

import { createAdminClient } from "@/lib/supabase/admin";
import DashboardClient from "@/app/admin/(protected)/dashboard/DashboardClient";

export default async function DashboardPage() {
  const supabase = createAdminClient();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [
    { count: totalUsers },
    { count: lastMonthUsers },
    { count: totalContacts },
    { count: lastMonthContacts },
    { count: activeSubscriptions },
    { count: lastMonthSubscriptions },
    { data: recentUsers },
    { data: contactsByStatus },
    { data: recentActivity },
    { data: allUsers },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sixtyDaysAgo.toISOString())
      .lt("created_at", thirtyDaysAgo.toISOString()),
    supabase.from("contact_messages").select("*", { count: "exact", head: true }),
    supabase
      .from("contact_messages")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sixtyDaysAgo.toISOString())
      .lt("created_at", thirtyDaysAgo.toISOString()),
    supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .gte("created_at", sixtyDaysAgo.toISOString())
      .lt("created_at", thirtyDaysAgo.toISOString()),
    supabase.from("profiles").select("created_at").order("created_at", { ascending: false }).limit(30),
    supabase.from("contact_messages").select("status"),
    supabase.from("profiles").select("created_at").order("created_at", { ascending: false }).limit(7),
    supabase.from("profiles").select("created_at, updated_at"),
  ]);

  return (
    <DashboardClient
      stats={{
        totalUsers,
        lastMonthUsers,
        totalContacts,
        lastMonthContacts,
        activeSubscriptions,
        lastMonthSubscriptions,
        allUsers,
      }}
      recentUsers={recentUsers}
      contactsByStatus={contactsByStatus}
      recentActivity={recentActivity}
    />
  );
}
