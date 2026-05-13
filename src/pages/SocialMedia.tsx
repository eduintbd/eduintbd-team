import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Rss,
  Radio,
  PenSquare,
  CalendarDays,
  BarChart3,
  FileText,
  MessageSquare,
  Clock,
  Wifi,
  Heart,
  LayoutDashboard,
} from "lucide-react";

import SocialFeed from "@/components/social-media/SocialFeed";
import ChannelManager from "@/components/social-media/ChannelManager";
import PostComposer from "@/components/social-media/PostComposer";
import ContentCalendar from "@/components/social-media/ContentCalendar";
import SocialAnalytics from "@/components/social-media/SocialAnalytics";
import PostTemplates from "@/components/social-media/PostTemplates";
import ContentPipeline from "@/components/social-media/ContentPipeline";
import UsageTracker from "@/components/social-media/UsageTracker";
import InvoiceManager from "@/components/social-media/InvoiceManager";
import SocialMediaDashboard from "@/components/social-media/SocialMediaDashboard";

type SocialMediaView =
  | "dashboard"
  | "feed" | "compose" | "templates" | "calendar"
  | "channels" | "analytics"
  | "pipeline" | "usage" | "invoices";

const NAV_GROUPS = [
  {
    label: "Content",
    items: [
      { key: "feed" as const, label: "Feed", icon: Rss },
      { key: "compose" as const, label: "Compose", icon: PenSquare },
      { key: "templates" as const, label: "Templates", icon: FileText },
      { key: "calendar" as const, label: "Calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Management",
    items: [
      { key: "channels" as const, label: "Channels", icon: Radio },
      { key: "analytics" as const, label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Operations",
    items: [
      { key: "pipeline" as const, label: "Pipeline", icon: Clock },
      { key: "usage" as const, label: "Usage", icon: BarChart3 },
      { key: "invoices" as const, label: "Invoices", icon: FileText },
    ],
  },
];

function formatNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export default function SocialMedia() {
  const [activeView, setActiveView] = useState<SocialMediaView>("dashboard");
  const [stats, setStats] = useState({
    totalPosts: 0,
    scheduled: 0,
    activeChannels: 0,
    engagement24h: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      const [postsRes, scheduledRes, channelsRes, engagementRes] = await Promise.all([
        supabase.from("social_media_posts").select("id", { count: "exact", head: true }),
        supabase
          .from("social_media_scheduled_posts")
          .select("id", { count: "exact", head: true })
          .eq("status", "scheduled"),
        supabase
          .from("social_media_channels")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
        supabase
          .from("social_media_posts")
          .select("likes_count, comments_count, shares_count")
          .gte("posted_at", oneDayAgo),
      ]);

      const engagement = (engagementRes.data || []).reduce(
        (sum: number, row: any) =>
          sum + (row.likes_count || 0) + (row.comments_count || 0) + (row.shares_count || 0),
        0
      );

      setStats({
        totalPosts: postsRes.count || 0,
        scheduled: scheduledRes.count || 0,
        activeChannels: channelsRes.count || 0,
        engagement24h: engagement,
      });
    };

    fetchStats();
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-4">
      {/* Header with inline stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Social Media</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Monitor feeds, manage channels, schedule posts, and track performance.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1.5 text-xs">
            <MessageSquare className="h-3 w-3" /> {formatNumber(stats.totalPosts)} Posts
          </Badge>
          <Badge variant="secondary" className="gap-1.5 text-xs">
            <Clock className="h-3 w-3" /> {formatNumber(stats.scheduled)} Scheduled
          </Badge>
          <Badge variant="outline" className="gap-1.5 text-xs">
            <Wifi className="h-3 w-3" /> {stats.activeChannels} Channels
          </Badge>
          <Badge variant="outline" className="gap-1.5 text-xs">
            <Heart className="h-3 w-3" /> {formatNumber(stats.engagement24h)} Engagement
          </Badge>
        </div>
      </div>

      {/* Grouped Navigation */}
      <nav className="flex items-center gap-1 flex-wrap border rounded-lg p-1.5 bg-muted/30 overflow-x-auto">
        <Button
          variant={activeView === "dashboard" ? "secondary" : "ghost"}
          size="sm"
          className="gap-1.5 text-xs shrink-0"
          onClick={() => setActiveView("dashboard")}
        >
          <LayoutDashboard className="h-3.5 w-3.5" /> Overview
        </Button>

        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="contents">
            <Separator orientation="vertical" className="h-6 mx-1" />
            <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider px-1.5 shrink-0">
              {group.label}
            </span>
            {group.items.map((item) => (
              <Button
                key={item.key}
                variant={activeView === item.key ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5 text-xs shrink-0"
                onClick={() => setActiveView(item.key)}
              >
                <item.icon className="h-3.5 w-3.5" /> {item.label}
              </Button>
            ))}
          </div>
        ))}
      </nav>

      {/* Content Area */}
      <div>
        {activeView === "dashboard" && (
          <SocialMediaDashboard stats={stats} onNavigate={(v) => setActiveView(v as SocialMediaView)} />
        )}
        {activeView === "feed" && <SocialFeed />}
        {activeView === "channels" && <ChannelManager />}
        {activeView === "compose" && <PostComposer />}
        {activeView === "calendar" && <ContentCalendar />}
        {activeView === "analytics" && <SocialAnalytics />}
        {activeView === "templates" && <PostTemplates />}
        {activeView === "pipeline" && <ContentPipeline />}
        {activeView === "usage" && <UsageTracker />}
        {activeView === "invoices" && <InvoiceManager />}
      </div>
    </div>
  );
}
