import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  FileText,
  Copy,
  Hash,
  Facebook,
  Youtube,
  Linkedin,
  MessageCircle,
  Music,
  Camera,
} from "lucide-react";

interface PostTemplate {
  id: string;
  name: string;
  description: string | null;
  content: string;
  platforms: string[];
  hashtags: string[];
  category: string | null;
  created_at: string;
}

const platformIcons: Record<string, React.ReactNode> = {
  facebook: <Facebook className="h-3.5 w-3.5 text-blue-600" />,
  youtube: <Youtube className="h-3.5 w-3.5 text-red-600" />,
  linkedin: <Linkedin className="h-3.5 w-3.5 text-blue-700" />,
  whatsapp: <MessageCircle className="h-3.5 w-3.5 text-green-600" />,
  tiktok: <Music className="h-3.5 w-3.5 text-gray-900" />,
  instagram: <Camera className="h-3.5 w-3.5 text-pink-600" />,
};

interface PostTemplatesProps {
  onUseTemplate?: (template: PostTemplate) => void;
}

export default function PostTemplates({ onUseTemplate }: PostTemplatesProps) {
  const [templates, setTemplates] = useState<PostTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("social_media_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Failed to load templates:", error.message);
      }
      setTemplates((data || []) as PostTemplate[]);
      setLoading(false);
    };

    fetchTemplates();
  }, []);

  const handleUseTemplate = (template: PostTemplate) => {
    if (onUseTemplate) {
      onUseTemplate(template);
      toast.success(`Template "${template.name}" loaded into composer`);
    } else {
      // Copy content to clipboard as fallback
      navigator.clipboard.writeText(template.content).then(() => {
        toast.success("Template content copied to clipboard");
      });
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading templates...</div>;
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No templates yet.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Templates will appear here once created.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <Card key={template.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base">{template.name}</CardTitle>
              {template.category && (
                <Badge variant="secondary" className="text-xs">
                  {template.category}
                </Badge>
              )}
            </div>
            {template.description && (
              <p className="text-sm text-muted-foreground">{template.description}</p>
            )}
          </CardHeader>
          <CardContent>
            {/* Content Preview */}
            <div className="bg-muted/50 rounded-md p-3 mb-3">
              <p className="text-sm line-clamp-4 whitespace-pre-wrap">{template.content}</p>
            </div>

            {/* Platforms */}
            {(template.platforms || []).length > 0 && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs text-muted-foreground mr-1">Platforms:</span>
                {template.platforms.map((p) => (
                  <span key={p} title={p}>
                    {platformIcons[p] || (
                      <Badge variant="outline" className="text-[10px] py-0">
                        {p}
                      </Badge>
                    )}
                  </span>
                ))}
              </div>
            )}

            {/* Hashtags */}
            {(template.hashtags || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {template.hashtags.map((h) => (
                  <Badge key={h} variant="outline" className="text-xs gap-0.5">
                    <Hash className="h-2.5 w-2.5" />
                    {h}
                  </Badge>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => handleUseTemplate(template)}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Use Template
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
