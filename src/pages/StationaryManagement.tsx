import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus, Pencil, Package, AlertTriangle, ShoppingCart, Users, BarChart3,
  Phone, Mail, Building2, Check, X, Truck,
} from "lucide-react";

// ---------- Types ----------

interface StationaryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  min_stock_level: number;
  unit_price: number;
  vendor_id: string | null;
  vendor?: { id: string; name: string } | null;
  created_at: string;
}

interface PurchaseRequest {
  id: string;
  request_number: string;
  item_id: string;
  quantity: number;
  estimated_cost: number;
  status: "pending" | "approved" | "rejected" | "ordered" | "received";
  requested_by: string;
  created_at: string;
  item?: { name: string } | null;
}

interface Vendor {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

interface UsageLog {
  id: string;
  item_id: string;
  department: string;
  quantity_used: number;
  used_date: string;
  notes: string | null;
  item?: { name: string } | null;
}

// ---------- Constants ----------

const CATEGORIES = [
  "Paper & Printing",
  "Writing Instruments",
  "Filing & Storage",
  "Desk Accessories",
  "Adhesives & Tapes",
  "Computer Accessories",
  "Cleaning Supplies",
  "Other",
];

const UNITS = [
  { value: "pcs", label: "Pieces" },
  { value: "box", label: "Boxes" },
  { value: "pack", label: "Packs" },
  { value: "ream", label: "Reams" },
  { value: "roll", label: "Rolls" },
  { value: "set", label: "Sets" },
  { value: "bottle", label: "Bottles" },
  { value: "kg", label: "Kilograms" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  ordered: "bg-blue-100 text-blue-800",
  received: "bg-emerald-100 text-emerald-800",
};

// ---------- Component ----------

const StationaryManagement = () => {
  // Inventory state
  const [items, setItems] = useState<StationaryItem[]>([]);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StationaryItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: "", category: "", unit: "pcs", current_stock: 0,
    min_stock_level: 0, unit_price: 0, vendor_id: "",
  });

  // Purchase requests state
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    item_id: "", quantity: 1, estimated_cost: 0, requested_by: "",
  });

  // Vendors state
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [vendorForm, setVendorForm] = useState({
    name: "", contact_person: "", email: "", phone: "", address: "",
  });

  // Usage state
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [usageFilterDept, setUsageFilterDept] = useState("all");
  const [usageDateFrom, setUsageDateFrom] = useState("");
  const [usageDateTo, setUsageDateTo] = useState("");

  // ---------- Data fetching ----------

  useEffect(() => {
    fetchItems();
    fetchVendors();
    fetchRequests();
    fetchUsageLogs();
  }, []);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("stationary_items")
      .select("*, vendor:stationary_vendors(id, name)")
      .order("name");
    if (error) toast.error("Error loading stationary items");
    else setItems((data as any[]) || []);
  };

  const fetchVendors = async () => {
    const { data, error } = await supabase
      .from("stationary_vendors")
      .select("*")
      .order("name");
    if (error) toast.error("Error loading vendors");
    else setVendors((data as any[]) || []);
  };

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("stationary_purchase_requests")
      .select("*, item:stationary_items(name)")
      .order("created_at", { ascending: false });
    if (error) toast.error("Error loading purchase requests");
    else setRequests((data as any[]) || []);
  };

  const fetchUsageLogs = async () => {
    const { data, error } = await supabase
      .from("stationary_usage_log")
      .select("*, item:stationary_items(name)")
      .order("used_date", { ascending: false });
    if (error) toast.error("Error loading usage logs");
    else setUsageLogs((data as any[]) || []);
  };

  // ---------- Stats ----------

  const totalItems = items.length;
  const lowStockItems = items.filter((i) => i.current_stock < i.min_stock_level);
  const lowStockCount = lowStockItems.length;
  const pendingRequests = requests.filter((r) => r.status === "pending").length;
  const totalValue = items.reduce((sum, i) => sum + i.current_stock * i.unit_price, 0);

  // Usage stats
  const filteredUsage = usageLogs.filter((log) => {
    const matchesDept = usageFilterDept === "all" || log.department === usageFilterDept;
    const matchesFrom = !usageDateFrom || log.used_date >= usageDateFrom;
    const matchesTo = !usageDateTo || log.used_date <= usageDateTo;
    return matchesDept && matchesFrom && matchesTo;
  });

  const totalUsed = filteredUsage.reduce((sum, l) => sum + l.quantity_used, 0);
  const departments = [...new Set(usageLogs.map((l) => l.department))];

  const topUsedItem = filteredUsage.reduce<Record<string, number>>((acc, l) => {
    const name = l.item?.name || "Unknown";
    acc[name] = (acc[name] || 0) + l.quantity_used;
    return acc;
  }, {});
  const topItemName = Object.entries(topUsedItem).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  const deptUsage = filteredUsage.reduce<Record<string, number>>((acc, l) => {
    acc[l.department] = (acc[l.department] || 0) + l.quantity_used;
    return acc;
  }, {});
  const mostActiveDept = Object.entries(deptUsage).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  // ---------- Item CRUD ----------

  const resetItemForm = () => {
    setItemForm({ name: "", category: "", unit: "pcs", current_stock: 0, min_stock_level: 0, unit_price: 0, vendor_id: "" });
    setEditingItem(null);
  };

  const handleEditItem = (item: StationaryItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      current_stock: item.current_stock,
      min_stock_level: item.min_stock_level,
      unit_price: item.unit_price,
      vendor_id: item.vendor_id || "",
    });
    setItemDialogOpen(true);
  };

  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: itemForm.name,
      category: itemForm.category,
      unit: itemForm.unit,
      current_stock: Number(itemForm.current_stock),
      min_stock_level: Number(itemForm.min_stock_level),
      unit_price: Number(itemForm.unit_price),
      vendor_id: itemForm.vendor_id || null,
    };

    if (editingItem) {
      const { error } = await supabase
        .from("stationary_items")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editingItem.id);
      if (error) toast.error("Error updating item");
      else toast.success("Item updated");
    } else {
      const { error } = await supabase.from("stationary_items").insert([payload]);
      if (error) toast.error("Error adding item");
      else toast.success("Item added");
    }
    setItemDialogOpen(false);
    resetItemForm();
    fetchItems();
  };

  // ---------- Purchase Request CRUD ----------

  const resetRequestForm = () => {
    setRequestForm({ item_id: "", quantity: 1, estimated_cost: 0, requested_by: "" });
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const reqNum = `PR-${Date.now().toString(36).toUpperCase()}`;
    const payload = {
      request_number: reqNum,
      item_id: requestForm.item_id,
      quantity: Number(requestForm.quantity),
      estimated_cost: Number(requestForm.estimated_cost),
      status: "pending" as const,
      requested_by: requestForm.requested_by,
    };
    const { error } = await supabase.from("stationary_purchase_requests").insert([payload]);
    if (error) toast.error("Error creating request");
    else toast.success("Purchase request created");
    setRequestDialogOpen(false);
    resetRequestForm();
    fetchRequests();
  };

  const updateRequestStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("stationary_purchase_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error("Error updating status");
    else toast.success(`Request ${status}`);
    fetchRequests();
  };

  // ---------- Vendor CRUD ----------

  const resetVendorForm = () => {
    setVendorForm({ name: "", contact_person: "", email: "", phone: "", address: "" });
    setEditingVendor(null);
  };

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setVendorForm({
      name: vendor.name,
      contact_person: vendor.contact_person || "",
      email: vendor.email || "",
      phone: vendor.phone || "",
      address: vendor.address || "",
    });
    setVendorDialogOpen(true);
  };

  const handleSubmitVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: vendorForm.name,
      contact_person: vendorForm.contact_person || null,
      email: vendorForm.email || null,
      phone: vendorForm.phone || null,
      address: vendorForm.address || null,
    };

    if (editingVendor) {
      const { error } = await supabase
        .from("stationary_vendors")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editingVendor.id);
      if (error) toast.error("Error updating vendor");
      else toast.success("Vendor updated");
    } else {
      const { error } = await supabase.from("stationary_vendors").insert([payload]);
      if (error) toast.error("Error adding vendor");
      else toast.success("Vendor added");
    }
    setVendorDialogOpen(false);
    resetVendorForm();
    fetchVendors();
  };

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold">Stationary Management</h1>
          <p className="text-muted-foreground mt-2">Manage inventory, purchases, vendors, and usage</p>
        </div>
        <Dialog open={itemDialogOpen} onOpenChange={(v) => { setItemDialogOpen(v); if (!v) resetItemForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Item</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
              <DialogDescription>Manage stationary inventory items</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitItem} className="space-y-4">
              <div className="space-y-2">
                <Label>Item Name *</Label>
                <Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={itemForm.category} onValueChange={(v) => setItemForm({ ...itemForm, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={itemForm.unit} onValueChange={(v) => setItemForm({ ...itemForm, unit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current Stock *</Label>
                  <Input type="number" min={0} value={itemForm.current_stock} onChange={(e) => setItemForm({ ...itemForm, current_stock: Number(e.target.value) })} required />
                </div>
                <div className="space-y-2">
                  <Label>Min Stock Level *</Label>
                  <Input type="number" min={0} value={itemForm.min_stock_level} onChange={(e) => setItemForm({ ...itemForm, min_stock_level: Number(e.target.value) })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unit Price (BDT) *</Label>
                  <Input type="number" min={0} step={0.01} value={itemForm.unit_price} onChange={(e) => setItemForm({ ...itemForm, unit_price: Number(e.target.value) })} required />
                </div>
                <div className="space-y-2">
                  <Label>Vendor</Label>
                  <Select value={itemForm.vendor_id} onValueChange={(v) => setItemForm({ ...itemForm, vendor_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full">{editingItem ? "Update Item" : "Add Item"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100"><Package className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100"><ShoppingCart className="h-5 w-5 text-yellow-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
                <p className="text-2xl font-bold">{pendingRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100"><BarChart3 className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Inventory Value</p>
                <p className="text-2xl font-bold">BDT {totalValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="purchases">Purchase Requests</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>

        {/* ====== TAB 1: Inventory ====== */}
        <TabsContent value="inventory" className="space-y-4">
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">{lowStockCount} item{lowStockCount > 1 ? "s" : ""} below minimum stock level!</span>
            </div>
          )}

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Min Level</TableHead>
                    <TableHead className="text-right">Unit Price (BDT)</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No items found. Add your first stationary item.</TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell><Badge variant="secondary">{item.category}</Badge></TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className={`text-right font-medium ${item.current_stock < item.min_stock_level ? "text-red-600" : ""}`}>
                          {item.current_stock}
                        </TableCell>
                        <TableCell className="text-right">{item.min_stock_level}</TableCell>
                        <TableCell className="text-right">{item.unit_price.toLocaleString()}</TableCell>
                        <TableCell>{item.vendor?.name || "-"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== TAB 2: Purchase Requests ====== */}
        <TabsContent value="purchases" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={requestDialogOpen} onOpenChange={(v) => { setRequestDialogOpen(v); if (!v) resetRequestForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Create Request</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Purchase Request</DialogTitle>
                  <DialogDescription>Submit a new stationary purchase request</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitRequest} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Item *</Label>
                    <Select value={requestForm.item_id} onValueChange={(v) => setRequestForm({ ...requestForm, item_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                      <SelectContent>
                        {items.map((i) => (
                          <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantity *</Label>
                      <Input type="number" min={1} value={requestForm.quantity} onChange={(e) => setRequestForm({ ...requestForm, quantity: Number(e.target.value) })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Estimated Cost (BDT) *</Label>
                      <Input type="number" min={0} step={0.01} value={requestForm.estimated_cost} onChange={(e) => setRequestForm({ ...requestForm, estimated_cost: Number(e.target.value) })} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Requested By *</Label>
                    <Input value={requestForm.requested_by} onChange={(e) => setRequestForm({ ...requestForm, requested_by: e.target.value })} required />
                  </div>
                  <Button type="submit" className="w-full">Submit Request</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request #</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Est. Cost (BDT)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No purchase requests yet.</TableCell>
                    </TableRow>
                  ) : (
                    requests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-mono text-sm">{req.request_number}</TableCell>
                        <TableCell>{req.item?.name || "-"}</TableCell>
                        <TableCell className="text-right">{req.quantity}</TableCell>
                        <TableCell className="text-right">{req.estimated_cost.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[req.status] || ""}>{req.status}</Badge>
                        </TableCell>
                        <TableCell>{req.requested_by}</TableCell>
                        <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {req.status === "pending" && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" onClick={() => updateRequestStatus(req.id, "approved")}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => updateRequestStatus(req.id, "rejected")}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== TAB 3: Vendors ====== */}
        <TabsContent value="vendors" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={vendorDialogOpen} onOpenChange={(v) => { setVendorDialogOpen(v); if (!v) resetVendorForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Vendor</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingVendor ? "Edit Vendor" : "Add New Vendor"}</DialogTitle>
                  <DialogDescription>Manage stationary vendor details</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitVendor} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Vendor Name *</Label>
                    <Input value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Person</Label>
                    <Input value={vendorForm.contact_person} onChange={(e) => setVendorForm({ ...vendorForm, contact_person: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input value={vendorForm.address} onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })} />
                  </div>
                  <Button type="submit" className="w-full">{editingVendor ? "Update Vendor" : "Add Vendor"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {vendors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No vendors added yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendors.map((vendor) => (
                <Card key={vendor.id} className="relative">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-lg">{vendor.name}</h3>
                      <Button variant="ghost" size="icon" onClick={() => handleEditVendor(vendor)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                    <Separator className="mb-3" />
                    <div className="space-y-2 text-sm">
                      {vendor.contact_person && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{vendor.contact_person}</span>
                        </div>
                      )}
                      {vendor.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{vendor.email}</span>
                        </div>
                      )}
                      {vendor.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{vendor.phone}</span>
                        </div>
                      )}
                      {vendor.address && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          <span>{vendor.address}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ====== TAB 4: Usage ====== */}
        <TabsContent value="usage" className="space-y-4">
          {/* Usage summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Items Used</p>
                <p className="text-2xl font-bold">{totalUsed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Top Used Item</p>
                <p className="text-2xl font-bold truncate">{topItemName}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Most Active Department</p>
                <p className="text-2xl font-bold truncate">{mostActiveDept}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Department</Label>
              <Select value={usageFilterDept} onValueChange={setUsageFilterDept}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Departments" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" className="w-[160px]" value={usageDateFrom} onChange={(e) => setUsageDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" className="w-[160px]" value={usageDateTo} onChange={(e) => setUsageDateTo(e.target.value)} />
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Quantity Used</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsage.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No usage records found.</TableCell>
                    </TableRow>
                  ) : (
                    filteredUsage.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.item?.name || "-"}</TableCell>
                        <TableCell><Badge variant="outline">{log.department}</Badge></TableCell>
                        <TableCell className="text-right">{log.quantity_used}</TableCell>
                        <TableCell>{new Date(log.used_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">{log.notes || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StationaryManagement;
