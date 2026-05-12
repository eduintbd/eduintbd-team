import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FileText, Table2, Presentation, FileQuestion, Plus, Search } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string | null;
  template_type: string;
  google_drive_file_id: string | null;
  category: string;
}

interface TemplatesViewProps {
  onCreateFromTemplate: (template: Template, name: string) => void;
  onCreateBlank: (name: string, docType: string) => void;
}

const typeIcons: Record<string, any> = {
  doc: FileText,
  sheet: Table2,
  slide: Presentation,
  form: FileQuestion,
};

const typeColors: Record<string, string> = {
  doc: "text-blue-600",
  sheet: "text-green-600",
  slide: "text-yellow-600",
  form: "text-purple-600",
};

const TemplatesView = ({ onCreateFromTemplate, onCreateBlank }: TemplatesViewProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [docName, setDocName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("file_templates")
      .select("*")
      .order("category, name");
    if (!error && data) setTemplates(data);
    setLoading(false);
  };

  const handleUseTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setDocName(template.name);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    if (!docName.trim()) return;
    if (selectedTemplate?.google_drive_file_id) {
      onCreateFromTemplate(selectedTemplate, docName.trim());
    } else if (selectedTemplate) {
      onCreateBlank(docName.trim(), selectedTemplate.template_type);
    }
    setDialogOpen(false);
    setDocName("");
    setSelectedTemplate(null);
  };

  const filtered = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(filtered.map((t) => t.category))];

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading templates...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {categories.map((category) => (
        <div key={category}>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">{category}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered
              .filter((t) => t.category === category)
              .map((template) => {
                const Icon = typeIcons[template.template_type] || FileText;
                const color = typeColors[template.template_type] || "text-gray-600";
                return (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleUseTemplate(template)}
                  >
                    <CardContent className="p-4">
                      <Icon className={`h-8 w-8 ${color} mb-2`} />
                      <p className="text-sm font-medium truncate">{template.name}</p>
                      {template.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                      )}
                      <Badge variant="outline" className="text-[10px] mt-2">
                        {template.template_type.toUpperCase()}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      ))}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create from Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Creating from: <strong>{selectedTemplate?.name}</strong>
            </p>
            <div className="space-y-2">
              <Label>Document Name</Label>
              <Input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Enter document name"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!docName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplatesView;
