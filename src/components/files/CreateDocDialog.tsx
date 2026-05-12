import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Table2, Presentation, FileQuestion } from "lucide-react";

interface CreateDocDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, docType: string) => void;
  loading?: boolean;
}

const docTypes = [
  { type: "doc", label: "Document", icon: FileText, description: "Google Docs", color: "text-blue-600" },
  { type: "sheet", label: "Spreadsheet", icon: Table2, description: "Google Sheets", color: "text-green-600" },
  { type: "slide", label: "Presentation", icon: Presentation, description: "Google Slides", color: "text-yellow-600" },
  { type: "form", label: "Form", icon: FileQuestion, description: "Google Forms", color: "text-purple-600" },
];

const CreateDocDialog = ({ open, onOpenChange, onSubmit, loading }: CreateDocDialogProps) => {
  const [name, setName] = useState("");
  const [selectedType, setSelectedType] = useState("doc");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit(name.trim(), selectedType);
    setName("");
    setSelectedType("doc");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Create Google Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Document Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {docTypes.map((dt) => (
                <button
                  key={dt.type}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
                    selectedType === dt.type
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/30"
                  }`}
                  onClick={() => setSelectedType(dt.type)}
                >
                  <dt.icon className={`h-6 w-6 ${dt.color}`} />
                  <div>
                    <p className="text-sm font-medium">{dt.label}</p>
                    <p className="text-xs text-muted-foreground">{dt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-name">Document Name</Label>
            <Input
              id="doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter document name"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || loading}>
            {loading ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDocDialog;
