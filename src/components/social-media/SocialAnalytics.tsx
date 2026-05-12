import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Heart,
  FileText,
  TrendingUp,
  BarChart3,
  Facebook,
  Youtube,
  Linkedin,
  MessageCircle,
  Music,
  Camera,
} from "lucide-react";

interface ChannelAnalytics {
  id: string;
  platform: string;
  channel_name: string;
  followers_count: number;
  is_active: boolean;
}

interface AnalyticsRow {
  id: string;
  channel_id: string;
  date: string;
  followers_gained: number;
  impressions: number;
  engagements: number;
  clicks: number;
  shares: number;
  posts_count: number;
}

const DATE_RANGES = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

const platformIcons: Record<string, React.ReactNode> = {
  facebook: <Facebook className="h-4 w-4 text-blue-600" />,
  youtube: <Youtube className="h-4 w-4 text-red-600" />,
  linkedin: <Linkedin className="h-4 w-4 text-blue-700" />,
  whatsapp: <MessageCircle className="h-4 w-4 text-green-600" />,
  tiktok: <Music className="h-4 w-4 text-gray-900" />,
  instagram: <Camera className="h-4 w-4 text-pink-600" />,
};

function formatNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export default function SocialAnalytics() {
  const [channels, setChannels] = useState<ChannelAnalytics[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const cutoff = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000).toISOString();

      const [channelsRes, analyticsRes] = await Promise.all([
        supabase.from("social_media_channels").select("*").order("platform"),
        supabase
          .from("social_media_analytics")
          .select("*")
          .gte("date", cutoff.split("T")[0])
          .order("date", { ascending: false }),
      ]);

      if (channelsRes.error) console.warn("Channels:", channelsRes.error.message);
      if (analyticsRes.error) console.warn("Analytics:", analyticsRes.error.message);

      setChannels((channelsRes.data || []) as ChannelAnalytics[]);
      setAnalytics((analyticsRes.data || []) as AnalyticsRow[]);
      setLoading(false);
    };

    fetch();
  }, [dateRange]);

  // Aggregate stats
  const totalFollowers = channels.reduce((sum, c) => sum + c.followers_count, 0);
  const totalEngagement = analytics.reduce((sum, a) => sum + a.engagements, 0);
  const totalPosts = analytics.reduce((sum, a) => sum + a.posts_count, 0);
  const totalImpressions = analytics.reduce((sum, a) => sum + a.impressions, 0);
  const avgEngagementRate =
    totalImpressions > 0 ? ((totalEngagement / totalImpressions) * 100).toFixed(2) : "0.00";

  // Per-channel aggregates
  const channelStats = channels.map((ch) => {
    const rows = analytics.filter((a) => a.channel_id === ch.id);
    return {
      ...ch,
      followersGained: rows.reduce((s, r) => s + r.followers_gained, 0),
      impressions: rows.reduce((s, r) => s + r.impressions, 0),
      engagements: rows.reduce((s, r) => s + r.engagements, 0),
      clicks: rows.reduce((s, r) => s + r.clicks, 0),
      shares: rows.reduce((s, r) => s + r.shares, 0),
      posts: rows.reduce((s, r) => s + r.posts_count, 0),
    };
  });

  // Simple bar chart data (top 5 days by engagement)
  const dailyEngagement: Record<string, number> = {};
  analytics.forEach((a) => {
    dailyEngagement[a.date] = (dailyEngagement[a.date] || 0) + a.engagements;
  });
  const chartData = Object.entries(dailyEngagement)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14);
  const maxEngagement = Math.max(...chartData.map(([_, v]) => v), 1);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Period:</span>
        {DATE_RANGES.map((r) => (
          <Button
            key={r.days}
            variant={dateRange === r.days ? "default" : "outline"}
            size="sm"
            onClick={() => setDateRange(r.days)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalFollowers)}</div>
            <p className="text-xs text-muted-foreground">Across all channels</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Engagement</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalEngagement)}</div>
            <p className="text-xs text-muted-foreground">Last {dateRange} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalPosts)}</div>
            <p className="text-xs text-muted-foreground">Last {dateRange} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgEngagementRate}%</div>
            <p className="text-xs text-muted-foreground">Engagements / Impressions</p>
          </CardContent>
        </Card>
      </div>

      {/* Simple Bar Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Daily Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-40">
              {chartData.map(([date, value]) => (
                <div key={date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary/80 rounded-t hover:bg-primary transition-colors"
                    style={{
                      height: `${Math.max((value / maxEngagement) * 100, 2)}%`,
                      minHeight: "2px",
                    }}
                    title={`${date}: ${value.toLocaleString()} engagements`}
                  />
                  <span className="text-[9px] text-muted-foreground -rotate-45 origin-top-left whitespace-nowrap">
                    {date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-Channel Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Channel Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">Followers</TableHead>
                <TableHead className="text-right">New Followers</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">Engagements</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Posts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channelStats.map((ch) => (
                <TableRow key={ch.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {platformIcons[ch.platform] || null}
                      <span className="font-medium">{ch.channel_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(ch.followers_count)}</TableCell>
                  <TableCell className="text-right">
                    {ch.followersGained > 0 ? "+" : ""}
                    {formatNumber(ch.followersGained)}
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(ch.impressions)}</TableCell>
                  <TableCell className="text-right">{formatNumber(ch.engagements)}</TableCell>
                  <TableCell className="text-right">{formatNumber(ch.clicks)}</TableCell>
                  <TableCell className="text-right">{ch.posts}</TableCell>
                </TableRow>
              ))}
              {channelStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No channel data available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
