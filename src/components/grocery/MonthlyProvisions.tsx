import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  ShoppingCart,
  Package,
  CheckCircle2,
  DollarSign,
  Trash2,
} from "lucide-react";

interface MonthlyProvision {
  id: string;
  item_id: string | null;
  item_name: string;
  category_name: string | null;
  month: string;
  quantity_needed: number;
  quantity_purchased: number;
  is_purchased: boolean;
  estimated_unit_price: number;
  notes: string | null;
}

interface GroceryItem {
  id: string;
  name: string;
  unit_price: number;
  category?: { name: string } | null;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatBDT(amount: number) {
  return `৳${amount.toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function MonthlyProvisions() {
  const [provisions, setProvisions] = useState<MonthlyProvision[]>([]);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ item_id: "", quantity_needed: "1" });

  const monthKey = getMonthKey(currentMonth);
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  useEffect(() => {
    fetchProvisions();
  }, [monthKey]);

  useEffect(() => {
    fetchGroceryItems();
  }, []);

  const fetchProvisions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("grocery_monthly_provisions" as any)
      .select("*")
      .eq("month", monthKey)
      .order("category_name")
      .order("item_name");
    if (error) {
      console.warn("Failed to load provisions:", error.message);
    }
    setProvisions((data as any) || []);
    setLoading(false);
  };

  const fetchGroceryItems = async () => {
    const { data } = await supabase
      .from("grocery_items" as any)
      .select("id, name, unit_price, category:grocery_categories(name)")
      .order("name");
    setGroceryItems((data as any) || []);
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const togglePurchased = async (p: MonthlyProvision) => {
    const newPurchased = !p.is_purchased;
    await supabase
      .from("grocery_monthly_provisions" as any)
      .update({
        is_purchased: newPurchased,
        quantity_purchased: newPurchased ? p.quantity_needed : 0,
      } as any)
      .eq("id", p.id);
    fetchProvisions();
  };

  const updateQuantityPurchased = async (id: string, qty: number) => {
    await supabase
      .from("grocery_monthly_provisions" as any)
      .update({ quantity_purchased: qty, is_purchased: qty > 0 } as any)
      .eq("id", id);
    fetchProvisions();
  };

  const handleAdd = async () => {
    if (!form.item_id) {
      toast.error("Select an item");
      return;
    }
    const item = groceryItems.find((i) => i.id === form.item_id);
    if (!item) return;

    const { error } = await supabase
      .from("grocery_monthly_provisions" as any)
      .insert({
        item_id: item.id,
        item_name: item.name,
        category_name: item.category?.name || null,
        month: monthKey,
        quantity_needed: Number(form.quantity_needed) || 1,
        estimated_unit_price: item.unit_price || 0,
      } as any);

    if (error) {
      if (error.code === "23505") {
        toast.error("Item already in this month's list");
      } else {
        toast.error("Failed to add item");
      }
      return;
    }
    toast.success(`${item.name} added`);
    setAddOpen(false);
    setForm({ item_id: "", quantity_needed: "1" });
    fetchProvisions();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("grocery_monthly_provisions" as any).delete().eq("id", id);
    toast.success("Item removed");
    fetchProvisions();
  };

  const carryForward = async () => {
    const prevMonthDate = new Date(year, month - 1, 1);
    const prevKey = getMonthKey(prevMonthDate);

    const { data: prevData } = await supabase
      .from("grocery_monthly_provisions" as any)
      .select("*")
      .eq("month", prevKey);

    if (!prevData || prevData.length === 0) {
      toast.error("No items in last month to carry forward");
      return;
    }

    const inserts = (prevData as any[]).map((p: any) => ({
      item_id: p.item_id,
      item_name: p.item_name,
      category_name: p.category_name,
      month: monthKey,
      quantity_needed: p.quantity_needed,
      quantity_purchased: 0,
      is_purchased: false,
      estimated_unit_price: p.estimated_unit_price,
    }));

    const { error } = await supabase
      .from("grocery_monthly_provisions" as any)
      .upsert(inserts as any, { onConflict: "item_id,month", ignoreDuplicates: true });

    if (error) {
      toast.error("Failed to carry forward");
      console.error(error);
    } else {
      toast.success(`Carried forward ${inserts.length} items`);
      fetchProvisions();
    }
  };

  // Group by category
  const grouped = provisions.reduce<Record<string, MonthlyProvision[]>>((acc, p) => {
    const cat = p.category_name || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const purchasedCount = provisions.filter((p) => p.is_purchased).length;
  const totalEstCost = provisions.reduce((s, p) => s + p.quantity_needed * p.estimated_unit_price, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Monthly Provisions — {MONTH_NAMES[month]} {year}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
                This Month
              </Button>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Total Items</p>
                <p className="text-lg font-bold">{provisions.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Purchased</p>
                <p className="text-lg font-bold">{purchasedCount} / {provisions.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
              <ShoppingCart className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p className="text-lg font-bold">{provisions.length - purchasedCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Est. Cost</p>
                <p className="text-lg font-bold">{formatBDT(totalEstCost)}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={carryForward}>
              <RefreshCw className="h-4 w-4 mr-1" /> Carry Forward
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </div>

          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : provisions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No provisions for this month. Add items or carry forward from last month.
            </p>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).sort().map(([category, items]) => (
                <div key={category}>
                  <Badge variant="outline" className="mb-2 text-xs">{category}</Badge>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="p-2 w-10"></th>
                          <th className="p-2 text-left font-medium">Item</th>
                          <th className="p-2 text-right font-medium w-20">Needed</th>
                          <th className="p-2 text-right font-medium w-28">Purchased</th>
                          <th className="p-2 text-right font-medium w-24">Price</th>
                          <th className="p-2 text-right font-medium w-24">Subtotal</th>
                          <th className="p-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((p) => (
                          <tr
                            key={p.id}
                            className={`border-b last:border-0 ${p.is_purchased ? "bg-green-50/50 dark:bg-green-950/10" : ""}`}
                          >
                            <td className="p-2 text-center">
                              <Checkbox
                                checked={p.is_purchased}
                                onCheckedChange={() => togglePurchased(p)}
                              />
                            </td>
                            <td className={`p-2 ${p.is_purchased ? "line-through text-muted-foreground" : ""}`}>
                              {p.item_name}
                            </td>
                            <td className="p-2 text-right">{p.quantity_needed}</td>
                            <td className="p-2 text-right">
                              <Input
                                type="number"
                                min={0}
                                className="w-20 h-7 text-right ml-auto"
                                value={p.quantity_purchased}
                                onChange={(e) => updateQuantityPurchased(p.id, Number(e.target.value) || 0)}
                              />
                            </td>
                            <td className="p-2 text-right text-muted-foreground">
                              {formatBDT(p.estimated_unit_price)}
                            </td>
                            <td className="p-2 text-right font-medium">
                              {formatBDT(p.quantity_needed * p.estimated_unit_price)}
                            </td>
                            <td className="p-2">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item to Provisions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Grocery Item</Label>
              <Select value={form.item_id} onValueChange={(v) => setForm({ ...form, item_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {groceryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} — {formatBDT(item.unit_price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity Needed</Label>
              <Input
                type="number"
                min={1}
                value={form.quantity_needed}
                onChange={(e) => setForm({ ...form, quantity_needed: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
