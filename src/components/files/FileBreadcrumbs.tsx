import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

interface FileBreadcrumbsProps {
  breadcrumbs: BreadcrumbItem[];
  onNavigate: (folderId: string | null) => void;
}

const FileBreadcrumbs = ({ breadcrumbs, onNavigate }: FileBreadcrumbsProps) => {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
        <span>Root</span>
      </button>
      {breadcrumbs.map((crumb) => (
        <div key={crumb.id} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4" />
          <button
            onClick={() => onNavigate(crumb.id)}
            className="hover:text-foreground transition-colors"
          >
            {crumb.name}
          </button>
        </div>
      ))}
    </nav>
  );
};

export default FileBreadcrumbs;
