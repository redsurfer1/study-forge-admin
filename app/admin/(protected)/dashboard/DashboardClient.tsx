// app/admin/(protected)/dashboard/DashboardClient.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, CreditCard, TrendingUp } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// Helper to get if in dark mode
function useIsDarkMode() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Prefer class on <html>
      const check = () =>
        document.documentElement.classList.contains("dark") ||
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDark(check());
    }
    // Optionally sync with class changes
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);
  return isDark;
}

export default function DashboardClient({ stats: rawStats, recentUsers, contactsByStatus, recentActivity }) {
  const isDarkMode = useIsDarkMode();

  // --- Calculate growth and engagement ---
  const calcGrowth = (current, previous) =>
    previous && previous > 0 ? (((current - previous) / previous) * 100).toFixed(1) : "0.0";

  const userGrowth = calcGrowth(rawStats.totalUsers || 0, rawStats.lastMonthUsers || 0);
  const contactGrowth = calcGrowth(rawStats.totalContacts || 0, rawStats.lastMonthContacts || 0);
  const subscriptionGrowth = calcGrowth(rawStats.activeSubscriptions || 0, rawStats.lastMonthSubscriptions || 0);

  const activeUsersCount =
    rawStats.allUsers?.filter((user) => new Date(user.updated_at || user.created_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length || 0;

  const engagementRate = rawStats.totalUsers && rawStats.totalUsers > 0 ? ((activeUsersCount / rawStats.totalUsers) * 100).toFixed(1) : "0.0";

  const stats = [
    { title: "Total Users", value: rawStats.totalUsers || 0, change: userGrowth, icon: Users },
    { title: "Contact Messages", value: rawStats.totalContacts || 0, change: contactGrowth, icon: MessageSquare },
    { title: "Active Subscriptions", value: rawStats.activeSubscriptions || 0, change: subscriptionGrowth, icon: CreditCard },
    { title: "Engagement Rate", value: `${engagementRate}%`, change: "0.0", icon: TrendingUp },
  ];

  // --- Process chart data ---
  const processUserGrowth = (users) => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split("T")[0];
    });
    const usersByDate = users.reduce((acc, user) => {
      const date = new Date(user.created_at).toISOString().split("T")[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    return last30Days.map((date) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      users: usersByDate[date] || 0,
    }));
  };

  const processContactStatus = (contacts) => {
    const statusCounts = contacts.reduce((acc, contact) => {
      const status = contact.status || "pending";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(statusCounts).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count,
    }));
  };

  const processActivity = (activity) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split("T")[0];
    });
    const activityByDate = activity.reduce((acc, item) => {
      const date = new Date(item.created_at).toISOString().split("T")[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    return last7Days.map((date) => ({
      day: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
      activity: activityByDate[date] || 0,
    }));
  };

  const userGrowthData = processUserGrowth(recentUsers || []);
  const contactStatusData = processContactStatus(contactsByStatus || []);
  const activityData = processActivity(recentActivity || []);

  // --- Dynamic chart color logic ---
  // Main chart hues as fallback for light/normal mode.
  const lightColors = {
    chart1: "hsl(var(--chart-1))",
    chart2: "hsl(var(--chart-2))",
    chart3: "hsl(var(--chart-3))"
  };
  const chart1Color = isDarkMode ? "#fff" : lightColors.chart1;
  const chart2Color = isDarkMode ? "#fff" : lightColors.chart2;
  const chart3Color = isDarkMode ? "#fff" : lightColors.chart3;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Welcome back! Here's what's happening with QuillGlow.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className={Number(stat.change) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                  {Number(stat.change) >= 0 ? "+" : ""}
                  {stat.change}%
                </span>{" "}
                from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <p className="text-xs text-muted-foreground">New users last 30 days</p>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[250px] md:h-[300px]"
              config={{ users: { label: "Users", color: chart1Color } }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30 dark:stroke-white/10" />
                  <XAxis dataKey="date" tick={{ fill: "currentColor" }} />
                  <YAxis tick={{ fill: "currentColor" }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke={chart1Color}
                    fill={chart1Color}
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Messages</CardTitle>
            <p className="text-xs text-muted-foreground">Message statuses</p>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[250px] md:h-[300px]"
              config={{ count: { label: "Messages", color: chart2Color } }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={contactStatusData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30 dark:stroke-white/10" />
                  <XAxis dataKey="status" angle={-45} textAnchor="end" height={60} tick={{ fill: "currentColor" }} />
                  <YAxis tick={{ fill: "currentColor" }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    fill={chart2Color}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <p className="text-xs text-muted-foreground">Latest signups & activity</p>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[180px] md:h-[200px]"
              config={{ activity: { label: "Activity", color: chart3Color } }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30 dark:stroke-white/10" />
                  <XAxis dataKey="day" tick={{ fill: "currentColor" }} />
                  <YAxis tick={{ fill: "currentColor" }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="activity"
                    stroke={chart3Color}
                    strokeWidth={2}
                    dot={{ fill: chart3Color }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
