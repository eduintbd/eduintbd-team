import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function formatNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export default function SocialMedia() {
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
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Social Media Management</h1>
        <p className="text-muted-foreground mt-1">
          Monitor social feeds, manage channels, schedule posts, and track performance.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalPosts)}</div>
            <p className="text-xs text-muted-foreground">All tracked posts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.scheduled)}</div>
            <p className="text-xs text-muted-foreground">Posts awaiting publish</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Channels</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeChannels}</div>
            <p className="text-xs text-muted-foreground">Connected platforms</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Engagement (24h)</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.engagement24h)}</div>
            <p className="text-xs text-muted-foreground">Likes + comments + shares</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="feed" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="feed" className="gap-1.5">
            <Rss className="h-4 w-4" /> Feed
          </TabsTrigger>
          <TabsTrigger value="channels" className="gap-1.5">
            <Radio className="h-4 w-4" /> Channels
          </TabsTrigger>
          <TabsTrigger value="compose" className="gap-1.5">
            <PenSquare className="h-4 w-4" /> Compose
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5">
            <CalendarDays className="h-4 w-4" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="h-4 w-4" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <FileText className="h-4 w-4" /> Templates
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5">
            <Clock className="h-4 w-4" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="usage" className="gap-1.5">
            <BarChart3 className="h-4 w-4" /> Usage
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5">
            <FileText className="h-4 w-4" /> Invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed">
          <SocialFeed />
        </TabsContent>

        <TabsContent value="channels">
          <ChannelManager />
        </TabsContent>

        <TabsContent value="compose">
          <PostComposer />
        </TabsContent>

        <TabsContent value="calendar">
          <ContentCalendar />
        </TabsContent>

        <TabsContent value="analytics">
          <SocialAnalytics />
        </TabsContent>

        <TabsContent value="templates">
          <PostTemplates />
        </TabsContent>

        <TabsContent value="pipeline">
          <ContentPipeline />
        </TabsContent>

        <TabsContent value="usage">
          <UsageTracker />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoiceManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
