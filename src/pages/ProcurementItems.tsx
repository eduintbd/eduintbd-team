import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProcurementItem {
  id: string;
  name: string;
  unit: string;
  category_id: string | null;
  description: string | null;
  is_active: boolean;
  category?: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

const ProcurementItems = () => {
  const [items, setItems] = useState<ProcurementItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProcurementItem | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [formData, setFormData] = useState({
    name: "", unit: "pcs", category_id: "", description: "",
  });

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("procurement_items")
      .select("*, category:procurement_categories(name)")
      .order("name");
    if (error) toast.error("Error loading items");
    else setItems(data || []);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("procurement_categories").select("id, name").eq("is_active", true).order("name");
    setCategories(data || []);
  };

  const resetForm = () => {
    setFormData({ name: "", unit: "pcs", category_id: "", description: "" });
    setEditingItem(null);
  };

  const handleEdit = (item: ProcurementItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      unit: item.unit,
      category_id: item.category_id || "",
      description: item.description || "",
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      category_id: formData.category_id || null,
    };

    if (editingItem) {
      const { error } = await supabase.from("procurement_items").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editingItem.id);
      if (error) toast.error("Error updating item");
      else toast.success("Item updated");
    } else {
      const { error } = await supabase.from("procurement_items").insert([payload]);
      if (error) toast.error("Error adding item");
      else toast.success("Item added");
    }
    setOpen(false);
    resetForm();
    fetchItems();
  };

  const filtered = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "all" || item.category_id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold">Items Catalog</h1>
          <p className="text-muted-foreground mt-2">Manage procurement items and supplies</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
              <DialogDescription>Manage procurement item catalog</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Item Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">Pieces</SelectItem>
                      <SelectItem value="kg">Kilograms</SelectItem>
                      <SelectItem value="litre">Litres</SelectItem>
                      <SelectItem value="box">Boxes</SelectItem>
                      <SelectItem value="pack">Packs</SelectItem>
                      <SelectItem value="ream">Reams</SelectItem>
                      <SelectItem value="set">Sets</SelectItem>
                      <SelectItem value="roll">Rolls</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <Button type="submit" className="w-full">{editingItem ? "Update Item" : "Add Item"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="max-w-[200px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Items ({filtered.length})</CardTitle>
          <CardDescription>Procurement item catalog</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.category?.name || "Uncategorized"}</Badge>
                  </TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-muted-foreground">{item.description || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No items found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcurementItems;
