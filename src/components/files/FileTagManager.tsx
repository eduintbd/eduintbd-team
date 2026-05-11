import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tag, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FileTag {
  id: string;
  name: string;
  color: string;
}

interface FileTagManagerProps {
  fileId: string;
  currentTags: FileTag[];
  onTagsChange: () => void;
}

const FileTagManager = ({ fileId, currentTags, onTagsChange }: FileTagManagerProps) => {
  const [allTags, setAllTags] = useState<FileTag[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) fetchTags();
  }, [open]);

  const fetchTags = async () => {
    const { data, error } = await supabase.from("file_tags").select("*").order("name");
    if (!error && data) setAllTags(data);
  };

  const isTagged = (tagId: string) => currentTags.some((t) => t.id === tagId);

  const toggleTag = async (tag: FileTag) => {
    if (isTagged(tag.id)) {
      const { error } = await supabase
        .from("file_item_tags")
        .delete()
        .eq("file_id", fileId)
        .eq("tag_id", tag.id);
      if (error) {
        toast.error("Failed to remove tag");
        return;
      }
    } else {
      const { error } = await supabase
        .from("file_item_tags")
        .insert({ file_id: fileId, tag_id: tag.id });
      if (error) {
        toast.error("Failed to add tag");
        return;
      }
    }
    onTagsChange();
  };

  const filtered = allTags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Tag className="h-4 w-4 mr-1" />
          Tags
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-2" align="start">
        <Input
          placeholder="Search tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 mb-2"
        />
        <div className="max-h-[200px] overflow-y-auto space-y-1">
          {filtered.map((tag) => (
            <button
              key={tag.id}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors"
              onClick={() => toggleTag(tag)}
            >
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              <span className="flex-1 text-left">{tag.name}</span>
              {isTagged(tag.id) && <Check className="h-3 w-3 text-primary" />}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">No tags found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default FileTagManager;
