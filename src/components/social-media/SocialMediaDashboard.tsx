import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  useSocialMediaPosts,
  SocialMediaPost,
} from "@/hooks/useSocialMedia";
import {
  CalendarDays,
  Clock,
  Rss,
  Radio,
  ArrowRight,
  Facebook,
  Youtube,
  Linkedin,
  MessageCircle,
  Music,
  Camera,
  Heart,
  MessageSquare,
  Users,
  Globe,
} from "lucide-react";

interface SocialMediaDashboardProps {
  stats: {
    totalPosts: number;
    scheduled: number;
    activeChannels: number;
    engagement24h: number;
  };
  onNavigate: (view: string) => void;
}

interface ScheduledPost {
  id: string;
  platform: string;
  content: string;
  status: string;
  scheduled_at: string | null;
  campaign_name: string | null;
}

interface ContentTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  company_id: string;
  company_name?: string;
}

interface Channel {
  id: string;
  platform: string;
  channel_name: string;
  followers_count: number;
  is_active: boolean;
}

const platformIcon = (platform: string, className = "h-3.5 w-3.5") => {
  const icons: Record<string, React.ReactNode> = {
    facebook: <Facebook className={`${className} text-blue-600`} />,
    youtube: <Youtube className={`${className} text-red-600`} />,
    linkedin: <Linkedin className={`${className} text-blue-700`} />,
    whatsapp: <MessageCircle className={`${className} text-green-600`} />,
    tiktok: <Music className={`${className} text-gray-900 dark:text-gray-100`} />,
    instagram: <Camera className={`${className} text-pink-600`} />,
    twitter: <Globe className={`${className} text-blue-400`} />,
    reddit: <MessageSquare className={`${className} text-orange-500`} />,
    news: <Globe className={`${className} text-gray-500`} />,
  };
  return icons[platform] || <Globe className={`${className} text-gray-400`} />;
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-blue-100 text-blue-800",
  low: "bg-gray-100 text-gray-700",
};

const STATUS_LABELS: Record<string, string> = {
  brief: "Brief",
  creation: "Creation",
  review: "Review",
  revision: "Revision",
};

function formatFollowers(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function relativeTime(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (Math.abs(diffMins) < 60) return diffMins > 0 ? `in ${diffMins}m` : `${Math.abs(diffMins)}m ago`;
  if (Math.abs(diffHours) < 24) return diffHours > 0 ? `in ${diffHours}h` : `${Math.abs(diffHours)}h ago`;
  return diffDays > 0 ? `in ${diffDays}d` : `${Math.abs(diffDays)}d ago`;
}

export default function SocialMediaDashboard({ stats, onNavigate }: SocialMediaDashboardProps) {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [pipelineTasks, setPipelineTasks] = useState<ContentTask[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: feedPosts = [] } = useSocialMediaPosts({ limit: 5, daysBack: 1 });

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      const [scheduledRes, tasksRes, channelsRes] = await Promise.all([
        supabase
          .from("social_media_scheduled_posts")
          .select("id, platform, content, status, scheduled_at, campaign_name")
          .eq("status", "scheduled")
          .order("scheduled_at", { ascending: true })
          .limit(5),
        supabase
          .from("social_media_content_tasks")
          .select("id, title, status, priority, due_date, company_id, social_media_companies(name)")
          .in("status", ["brief", "creation", "review", "revision"])
          .order("due_date", { ascending: true })
          .limit(5),
        supabase
          .from("social_media_channels")
          .select("id, platform, channel_name, followers_count, is_active")
          .eq("is_active", true)
          .order("followers_count", { ascending: false })
          .limit(6),
      ]);

      setScheduledPosts((scheduledRes.data || []) as ScheduledPost[]);
      setPipelineTasks(
        (tasksRes.data || []).map((t: any) => ({
          ...t,
          company_name: t.social_media_companies?.name || null,
        }))
      );
      setChannels((channelsRes.data || []) as Channel[]);
      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Upcoming Scheduled Posts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Upcoming Scheduled Posts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
          ) : scheduledPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No upcoming posts scheduled.</p>
          ) : (
            <div className="space-y-3">
              {scheduledPosts.map((post) => (
                <div key={post.id} className="flex items-start gap-2.5">
                  <div className="mt-0.5">{platformIcon(post.platform)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-1">{post.content}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {post.scheduled_at && (
                        <span className="text-xs text-muted-foreground">{relativeTime(post.scheduled_at)}</span>
                      )}
                      {post.campaign_name && (
                        <Badge variant="outline" className="text-[10px]">{post.campaign_name}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Separator className="my-3" />
          <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => onNavigate("calendar")}>
            View Calendar <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Pipeline Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Pipeline Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
          ) : pipelineTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No active pipeline tasks.</p>
          ) : (
            <div className="space-y-3">
              {pipelineTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-2.5">
                  <Badge variant="outline" className={`text-[10px] shrink-0 mt-0.5 ${PRIORITY_COLORS[task.priority] || ""}`}>
                    {task.priority}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-1">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">
                        {STATUS_LABELS[task.status] || task.status}
                      </Badge>
                      {task.company_name && (
                        <span className="text-xs text-muted-foreground">{task.company_name}</span>
                      )}
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground">{relativeTime(task.due_date)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Separator className="my-3" />
          <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => onNavigate("pipeline")}>
            View Pipeline <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Recent Feed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Rss className="h-4 w-4 text-muted-foreground" />
            Recent Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          {feedPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No recent posts in the last 24h.</p>
          ) : (
            <div className="space-y-3">
              {feedPosts.slice(0, 5).map((post: SocialMediaPost) => (
                <div key={post.id} className="flex items-start gap-2.5">
                  <div className="mt-0.5">{platformIcon(post.platform)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-1">{post.content}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {post.author_handle && (
                        <span className="text-xs text-muted-foreground">@{post.author_handle}</span>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Heart className="h-2.5 w-2.5" /> {post.likes_count + post.comments_count + post.shares_count}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Separator className="my-3" />
          <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => onNavigate("feed")}>
            View Feed <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Channel Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Radio className="h-4 w-4 text-muted-foreground" />
            Active Channels
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
          ) : channels.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No active channels.</p>
          ) : (
            <div className="space-y-2.5">
              {channels.map((ch) => (
                <div key={ch.id} className="flex items-center gap-2.5">
                  {platformIcon(ch.platform)}
                  <span className="text-sm flex-1 truncate">{ch.channel_name}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> {formatFollowers(ch.followers_count)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Separator className="my-3" />
          <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => onNavigate("channels")}>
            Manage Channels <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
