import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SocialMediaPost {
  id: string;
  platform: "twitter" | "facebook" | "reddit" | "youtube" | "linkedin" | "news";
  external_id?: string;
  author_name: string;
  author_handle?: string;
  author_avatar_url?: string;
  author_verified: boolean;
  content: string;
  media_url?: string;
  post_url?: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  symbols: string[];
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  relevance_score: number;
  category: string;
  tags: string[];
  language: string;
  posted_at: string;
  scraped_at: string;
}

interface UseSocialMediaOptions {
  platform?: string;
  category?: string;
  sentiment?: string;
  limit?: number;
  daysBack?: number;
}

export function useSocialMediaPosts(options: UseSocialMediaOptions = {}) {
  const { platform, category, sentiment, limit = 50, daysBack = 3 } = options;

  return useQuery({
    queryKey: ["social-media-posts", platform, category, sentiment, limit, daysBack],
    queryFn: async (): Promise<SocialMediaPost[]> => {
      const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

      let query = supabase
        .from("social_media_posts")
        .select("*")
        .gte("posted_at", cutoff)
        .order("posted_at", { ascending: false })
        .limit(limit);

      if (platform && platform !== "all") {
        query = query.eq("platform", platform);
      }
      if (category && category !== "all") {
        query = query.eq("category", category);
      }
      if (sentiment && sentiment !== "all") {
        query = query.eq("sentiment", sentiment);
      }

      const { data, error } = await query;
      if (error) {
        console.warn("social_media_posts query failed:", error.message);
        return [];
      }
      return (data || []) as SocialMediaPost[];
    },
    refetchInterval: 30_000,
    retry: false,
  });
}

export function useTrendingSymbols() {
  return useQuery({
    queryKey: ["trending-symbols"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_media_posts")
        .select("symbols")
        .gte("posted_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) return [];

      const counts: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        (row.symbols || []).forEach((s: string) => {
          counts[s] = (counts[s] || 0) + 1;
        });
      });

      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([symbol, count]) => ({ symbol, count }));
    },
    refetchInterval: 60_000,
    retry: false,
  });
}
