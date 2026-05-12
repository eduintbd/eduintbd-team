import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  useSocialMediaPosts,
  useTrendingSymbols,
  SocialMediaPost,
} from "@/hooks/useSocialMedia";
import {
  Twitter,
  Facebook,
  MessageSquare,
  Youtube,
  Linkedin,
  Newspaper,
  Heart,
  Share2,
  ExternalLink,
  TrendingUp,
  CheckCircle2,
  Globe,
  RefreshCw,
} from "lucide-react";

function platformIcon(platform: string) {
  switch (platform) {
    case "twitter":
      return <Twitter className="h-4 w-4 text-blue-400" />;
    case "facebook":
      return <Facebook className="h-4 w-4 text-blue-600" />;
    case "reddit":
      return <MessageSquare className="h-4 w-4 text-orange-500" />;
    case "youtube":
      return <Youtube className="h-4 w-4 text-red-600" />;
    case "linkedin":
      return <Linkedin className="h-4 w-4 text-blue-700" />;
    case "news":
      return <Newspaper className="h-4 w-4 text-gray-500" />;
    default:
      return <Globe className="h-4 w-4 text-gray-400" />;
  }
}

function sentimentBadge(sentiment: string) {
  const config: Record<string, { label: string; className: string }> = {
    positive: { label: "Positive", className: "bg-green-100 text-green-800 border-green-200" },
    negative: { label: "Negative", className: "bg-red-100 text-red-800 border-red-200" },
    neutral: { label: "Neutral", className: "bg-gray-100 text-gray-800 border-gray-200" },
    mixed: { label: "Mixed", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  };
  const c = config[sentiment] || config.neutral;
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function PostCard({ post }: { post: SocialMediaPost }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className="mt-1">{platformIcon(post.platform)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{post.author_name}</span>
              {post.author_handle && (
                <span className="text-xs text-muted-foreground">@{post.author_handle}</span>
              )}
              {post.author_verified && (
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {relativeTime(post.posted_at)}
              </span>
            </div>

            <p className="text-sm mt-2 whitespace-pre-wrap break-words line-clamp-4">
              {post.content}
            </p>

            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {(post.symbols || []).map((s) => (
                <Badge key={s} variant="secondary" className="text-xs">
                  ${s}
                </Badge>
              ))}
              {sentimentBadge(post.sentiment)}
            </div>

            <div className="flex items-center gap-4 mt-3 text-muted-foreground text-xs">
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" /> {formatCount(post.likes_count)}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" /> {formatCount(post.comments_count)}
              </span>
              <span className="flex items-center gap-1">
                <Share2 className="h-3.5 w-3.5" /> {formatCount(post.shares_count)}
              </span>
              {post.post_url && (
                <a
                  href={post.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 hover:text-primary"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Original
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SocialFeed() {
  const [platform, setPlatform] = useState("all");
  const [category, setCategory] = useState("all");
  const [sentiment, setSentiment] = useState("all");

  const { data: posts = [], isLoading, refetch } = useSocialMediaPosts({
    platform,
    category,
    sentiment,
  });
  const { data: trending = [] } = useTrendingSymbols();

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main Feed */}
      <div className="flex-1">
        {/* Filter Bar */}
        <Card className="mb-4">
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="reddit">Reddit</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="news">News</SelectItem>
                </SelectContent>
              </Select>

              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="market">Market</SelectItem>
                  <SelectItem value="earnings">Earnings</SelectItem>
                  <SelectItem value="news">News</SelectItem>
                  <SelectItem value="opinion">Opinion</SelectItem>
                  <SelectItem value="analysis">Analysis</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sentiment} onValueChange={setSentiment}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Sentiment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sentiments</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Posts */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No posts found. Try adjusting filters or check back later.
          </div>
        ) : (
          <div className="grid gap-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>

      {/* Trending Sidebar */}
      <div className="w-full lg:w-72 shrink-0">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Trending Symbols
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trending.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trending data</p>
            ) : (
              <div className="space-y-2">
                {trending.map((item, i) => (
                  <div
                    key={item.symbol}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">
                      <span className="text-muted-foreground mr-2">{i + 1}.</span>
                      ${item.symbol}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {item.count} mentions
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
