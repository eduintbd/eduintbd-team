import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface ScheduledPost {
  id: string;
  platform: string;
  content: string;
  status: string;
  scheduled_at: string | null;
  campaign_name: string | null;
  hashtags: string[];
  created_at: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-400",
  pending_review: "bg-yellow-400",
  approved: "bg-blue-400",
  scheduled: "bg-green-500",
  published: "bg-emerald-600",
};

const statusBadgeVariant: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
  pending_review: { label: "In Review", className: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Approved", className: "bg-blue-100 text-blue-700" },
  scheduled: { label: "Scheduled", className: "bg-green-100 text-green-700" },
  published: { label: "Published", className: "bg-emerald-100 text-emerald-700" },
};

const platformColors: Record<string, string> = {
  facebook: "bg-blue-500",
  youtube: "bg-red-500",
  linkedin: "bg-blue-700",
  whatsapp: "bg-green-500",
  tiktok: "bg-gray-800",
  instagram: "bg-pink-500",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function ContentCalendar() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      const startOfMonth = new Date(year, month, 1).toISOString();
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from("social_media_scheduled_posts")
        .select("*")
        .gte("scheduled_at", startOfMonth)
        .lte("scheduled_at", endOfMonth)
        .order("scheduled_at");

      if (error) {
        console.warn("Failed to load scheduled posts:", error.message);
      }
      setPosts((data || []) as ScheduledPost[]);
      setLoading(false);
    };

    fetchPosts();
  }, [year, month]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const getPostsForDay = (day: number) => {
    return posts.filter((p) => {
      if (!p.scheduled_at) return false;
      const d = new Date(p.scheduled_at);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const selectedPosts = selectedDay ? getPostsForDay(selectedDay) : [];

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {MONTH_NAMES[month]} {year}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentDate(new Date());
                  setSelectedDay(null);
                }}
              >
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading calendar...</div>
          ) : (
            <>
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-px mb-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-px">
                {/* Empty cells for days before the first */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[80px] bg-muted/30 rounded p-1" />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayPosts = getPostsForDay(day);
                  const isToday =
                    day === new Date().getDate() &&
                    month === new Date().getMonth() &&
                    year === new Date().getFullYear();
                  const isSelected = day === selectedDay;

                  return (
                    <div
                      key={day}
                      className={`min-h-[80px] rounded p-1.5 cursor-pointer transition-colors border ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : isToday
                          ? "border-primary/30 bg-primary/5"
                          : "border-transparent hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedDay(day)}
                    >
                      <span
                        className={`text-xs font-medium ${
                          isToday ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {day}
                      </span>
                      {dayPosts.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {dayPosts.slice(0, 4).map((p) => (
                            <div
                              key={p.id}
                              className={`w-2 h-2 rounded-full ${
                                platformColors[p.platform] || "bg-gray-400"
                              }`}
                              title={`${p.platform} - ${p.status}`}
                            />
                          ))}
                          {dayPosts.length > 4 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{dayPosts.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Day Detail Dialog */}
      <Dialog
        open={selectedDay !== null && selectedPosts.length > 0}
        onOpenChange={(open) => !open && setSelectedDay(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedDay && `${MONTH_NAMES[month]} ${selectedDay}, ${year}`} - Scheduled Posts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2 max-h-[60vh] overflow-y-auto">
            {selectedPosts.map((post) => {
              const sb = statusBadgeVariant[post.status] || statusBadgeVariant.draft;
              return (
                <Card key={post.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          platformColors[post.platform] || "bg-gray-400"
                        }`}
                      />
                      <span className="text-sm font-medium capitalize">{post.platform}</span>
                      <Badge variant="outline" className={`ml-auto text-xs ${sb.className}`}>
                        {sb.label}
                      </Badge>
                    </div>
                    <p className="text-sm line-clamp-3">{post.content}</p>
                    {post.campaign_name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Campaign: {post.campaign_name}
                      </p>
                    )}
                    {post.scheduled_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Time: {new Date(post.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {selectedPosts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No posts scheduled for this day.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
