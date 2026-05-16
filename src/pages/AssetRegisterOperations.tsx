import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import {
  Plus, Package, Monitor, Armchair, Printer, Car, Wrench, Trash2, Edit,
  Download, TrendingDown, DollarSign, AlertTriangle, CheckCircle,
} from "lucide-react";
import { format, differenceInMonths } from "date-fns";
import { useReactToPrint } from "react-to-print";

// ---------- Types ----------

interface OfficeAsset {
  id: string;
  asset_tag: string;
  name: string;
  category: string;
  description: string | null;
  location: string;
  assigned_to: string | null;
  purchase_date: string;
  purchase_cost: number;
  salvage_value: number;
  useful_life_months: number;
  depreciation_method: string;
  condition: string;
  warranty_expiry: string | null;
  serial_number: string | null;
  status: string;
  created_at: string;
}

// ---------- Constants ----------

const CATEGORIES = [
  "Computers & Laptops",
  "Monitors & Displays",
  "Printers & Scanners",
  "Networking Equipment",
  "Furniture",
  "Air Conditioning",
  "Electronics",
  "Vehicles",
  "Office Equipment",
  "Kitchen Appliances",
  "Security Equipment",
  "Other",
];

const LOCATIONS = [
  "Main Office",
  "Conference Room",
  "Reception",
  "Server Room",
  "Kitchen",
  "Storage Room",
  "Home Office",
  "Workshop",
  "Other",
];

const CONDITIONS = ["Excellent", "Good", "Fair", "Poor", "Damaged", "Disposed"];
const STATUSES = ["Active", "In Repair", "Disposed", "Lost", "Donated"];

// ---------- Helpers ----------

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT" }).format(amount || 0);

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Computers & Laptops": return <Monitor className="h-4 w-4" />;
    case "Monitors & Displays": return <Monitor className="h-4 w-4" />;
    case "Printers & Scanners": return <Printer className="h-4 w-4" />;
    case "Furniture": return <Armchair className="h-4 w-4" />;
    case "Vehicles": return <Car className="h-4 w-4" />;
    default: return <Package className="h-4 w-4" />;
  }
};

const calculateDepreciation = (asset: OfficeAsset, asOfDate: Date) => {
  const purchaseDate = new Date(asset.purchase_date);
  const monthsElapsed = Math.max(0, differenceInMonths(asOfDate, purchaseDate));
  const depreciableAmount = asset.purchase_cost - asset.salvage_value;
  const totalMonths = asset.useful_life_months;

  if (totalMonths <= 0 || depreciableAmount <= 0) {
    return { monthlyDep: 0, accumulated: 0, bookValue: asset.purchase_cost, percentUsed: 0 };
  }

  let accumulated = 0;
  let monthlyDep = 0;

  if (asset.depreciation_method === "straight_line") {
    monthlyDep = depreciableAmount / totalMonths;
    accumulated = Math.min(monthlyDep * monthsElapsed, depreciableAmount);
  } else {
    // Declining balance (double declining)
    const rate = (2 / totalMonths);
    let remaining = asset.purchase_cost;
    for (let i = 0; i < Math.min(monthsElapsed, totalMonths); i++) {
      const dep = remaining * rate;
      if (remaining - dep < asset.salvage_value) {
        accumulated += remaining - asset.salvage_value;
        remaining = asset.salvage_value;
        break;
      }
      accumulated += dep;
      remaining -= dep;
    }
    monthlyDep = monthsElapsed > 0 ? accumulated / monthsElapsed : 0;
  }

  const bookValue = asset.purchase_cost - accumulated;
  const percentUsed = (monthsElapsed / totalMonths) * 100;

  return { monthlyDep, accumulated, bookValue, percentUsed: Math.min(percentUsed, 100) };
};

// ---------- Component ----------

const AssetRegisterOperations = () => {
  const [assets, setAssets] = useState<OfficeAsset[]>([]);
  const [open, setOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<OfficeAsset | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [asOfDate, setAsOfDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const printRef = useRef<HTMLDivElement>(null);
  const depPrintRef = useRef<HTMLDivElement>(null);

  const emptyForm = {
    asset_tag: "",
    name: "",
    category: "",
    description: "",
    location: "",
    assigned_to: "",
    purchase_date: format(new Date(), "yyyy-MM-dd"),
    purchase_cost: "",
    salvage_value: "0",
    useful_life_months: "60",
    depreciation_method: "straight_line",
    condition: "Excellent",
    warranty_expiry: "",
    serial_number: "",
    status: "Active",
  };

  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    const { data, error } = await supabase
      .from("office_asset_register")
      .select("*")
      .order("asset_tag");

    if (error) {
      toast.error("Error loading assets: " + error.message);
    } else {
      setAssets(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      asset_tag: formData.asset_tag,
      name: formData.name,
      category: formData.category,
      description: formData.description || null,
      location: formData.location,
      assigned_to: formData.assigned_to || null,
      purchase_date: formData.purchase_date,
      purchase_cost: parseFloat(formData.purchase_cost),
      salvage_value: parseFloat(formData.salvage_value) || 0,
      useful_life_months: parseInt(formData.useful_life_months) || 60,
      depreciation_method: formData.depreciation_method,
      condition: formData.condition,
      warranty_expiry: formData.warranty_expiry || null,
      serial_number: formData.serial_number || null,
      status: formData.status,
    };

    if (editingAsset) {
      const { error } = await supabase
        .from("office_asset_register")
        .update(payload)
        .eq("id", editingAsset.id);
      if (error) {
        toast.error("Error updating asset");
      } else {
        toast.success("Asset updated successfully");
      }
    } else {
      const { error } = await supabase
        .from("office_asset_register")
        .insert([payload]);
      if (error) {
        toast.error("Error adding asset: " + error.message);
      } else {
        toast.success("Asset registered successfully");
      }
    }

    setOpen(false);
    setEditingAsset(null);
    setFormData(emptyForm);
    fetchAssets();
  };

  const handleEdit = (asset: OfficeAsset) => {
    setEditingAsset(asset);
    setFormData({
      asset_tag: asset.asset_tag,
      name: asset.name,
      category: asset.category,
      description: asset.description || "",
      location: asset.location,
      assigned_to: asset.assigned_to || "",
      purchase_date: asset.purchase_date,
      purchase_cost: String(asset.purchase_cost),
      salvage_value: String(asset.salvage_value),
      useful_life_months: String(asset.useful_life_months),
      depreciation_method: asset.depreciation_method,
      condition: asset.condition,
      warranty_expiry: asset.warranty_expiry || "",
      serial_number: asset.serial_number || "",
      status: asset.status,
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("office_asset_register").delete().eq("id", id);
    if (error) {
      toast.error("Error deleting asset");
    } else {
      toast.success("Asset deleted");
      fetchAssets();
    }
  };

  const handlePrintRegister = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Asset_Register_${asOfDate}`,
  });

  const handlePrintDepreciation = useReactToPrint({
    contentRef: depPrintRef,
    documentTitle: `Depreciation_Table_${asOfDate}`,
  });

  // Filtered assets
  const filteredAssets = assets.filter((a) => {
    if (filterCategory !== "all" && a.category !== filterCategory) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.asset_tag.toLowerCase().includes(q) ||
        (a.assigned_to || "").toLowerCase().includes(q) ||
        (a.serial_number || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Stats
  const activeAssets = assets.filter((a) => a.status === "Active");
  const totalValue = activeAssets.reduce((sum, a) => sum + a.purchase_cost, 0);
  const totalBookValue = activeAssets.reduce((sum, a) => {
    const dep = calculateDepreciation(a, new Date(asOfDate));
    return sum + dep.bookValue;
  }, 0);
  const totalDepreciation = totalValue - totalBookValue;
  const warrantyExpiring = activeAssets.filter((a) => {
    if (!a.warranty_expiry) return false;
    const expiry = new Date(a.warranty_expiry);
    const now = new Date();
    const diff = differenceInMonths(expiry, now);
    return diff >= 0 && diff <= 3;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold">Asset Register</h1>
          <p className="text-muted-foreground mt-2">
            Track office assets, equipment, and depreciation
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingAsset(null); setFormData(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAsset ? "Edit Asset" : "Register New Asset"}</DialogTitle>
              <DialogDescription>
                {editingAsset ? "Update asset details" : "Add a new asset to the register"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Asset Tag / Code *</Label>
                  <Input
                    placeholder="e.g. AST-001"
                    value={formData.asset_tag}
                    onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Asset Name *</Label>
                  <Input
                    placeholder="e.g. Dell Laptop Latitude 5540"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Location *</Label>
                  <Select
                    value={formData.location}
                    onValueChange={(v) => setFormData({ ...formData, location: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>
                      {LOCATIONS.map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Additional details about the asset"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assigned To</Label>
                  <Input
                    placeholder="Person or department"
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Serial Number</Label>
                  <Input
                    placeholder="Manufacturer serial number"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Purchase Date *</Label>
                  <Input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Purchase Cost (BDT) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.purchase_cost}
                    onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Salvage Value (BDT)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.salvage_value}
                    onChange={(e) => setFormData({ ...formData, salvage_value: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Useful Life (Months) *</Label>
                  <Input
                    type="number"
                    value={formData.useful_life_months}
                    onChange={(e) => setFormData({ ...formData, useful_life_months: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Depreciation Method</Label>
                  <Select
                    value={formData.depreciation_method}
                    onValueChange={(v) => setFormData({ ...formData, depreciation_method: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="straight_line">Straight Line</SelectItem>
                      <SelectItem value="declining_balance">Declining Balance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select
                    value={formData.condition}
                    onValueChange={(v) => setFormData({ ...formData, condition: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Warranty Expiry</Label>
                  <Input
                    type="date"
                    value={formData.warranty_expiry}
                    onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full">
                {editingAsset ? "Update Asset" : "Register Asset"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Assets</p>
                <p className="text-2xl font-bold">{activeAssets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <TrendingDown className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Depreciation</p>
                <p className="text-2xl font-bold">{formatCurrency(totalDepreciation)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Warranty Expiring</p>
                <p className="text-2xl font-bold">{warrantyExpiring}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="register" className="space-y-4">
        <TabsList>
          <TabsTrigger value="register">Asset Register</TabsTrigger>
          <TabsTrigger value="depreciation">Depreciation Table</TabsTrigger>
        </TabsList>

        {/* ========== ASSET REGISTER TAB ========== */}
        <TabsContent value="register" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search by name, tag, assigned to, or serial..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handlePrintRegister}>
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Asset Table */}
          <div ref={printRef} className="print:p-8">
            <Card>
              <CardHeader className="print:block hidden">
                <CardTitle>Asset Register - EDUINT BD</CardTitle>
                <p className="text-sm text-muted-foreground">Generated: {format(new Date(), "MMM dd, yyyy")}</p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tag</TableHead>
                      <TableHead>Asset Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Purchase Date</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="print:hidden">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          No assets found. Click "Add Asset" to register your first asset.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAssets.map((asset) => (
                        <TableRow key={asset.id}>
                          <TableCell className="font-mono text-sm">{asset.asset_tag}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(asset.category)}
                              <span className="font-medium">{asset.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{asset.category}</TableCell>
                          <TableCell>{asset.location}</TableCell>
                          <TableCell>{asset.assigned_to || "-"}</TableCell>
                          <TableCell>{format(new Date(asset.purchase_date), "MMM dd, yyyy")}</TableCell>
                          <TableCell className="text-right">{formatCurrency(asset.purchase_cost)}</TableCell>
                          <TableCell>
                            <Badge variant={
                              asset.condition === "Excellent" || asset.condition === "Good" ? "default" :
                              asset.condition === "Fair" ? "secondary" : "destructive"
                            }>
                              {asset.condition}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              asset.status === "Active" ? "default" :
                              asset.status === "In Repair" ? "secondary" : "destructive"
                            }>
                              {asset.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="print:hidden">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(asset)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(asset.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ========== DEPRECIATION TABLE TAB ========== */}
        <TabsContent value="depreciation" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="space-y-1">
                  <Label>As of Date</Label>
                  <Input
                    type="date"
                    value={asOfDate}
                    onChange={(e) => setAsOfDate(e.target.value)}
                    className="w-[200px]"
                  />
                </div>
                <div className="ml-auto">
                  <Button variant="outline" onClick={handlePrintDepreciation}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div ref={depPrintRef} className="print:p-8">
            <Card>
              <CardHeader>
                <CardTitle>Depreciation Schedule</CardTitle>
                <p className="text-sm text-muted-foreground">
                  As of {format(new Date(asOfDate), "MMMM dd, yyyy")}
                </p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tag</TableHead>
                      <TableHead>Asset Name</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Purchase Cost</TableHead>
                      <TableHead className="text-right">Salvage Value</TableHead>
                      <TableHead className="text-right">Life (Months)</TableHead>
                      <TableHead className="text-right">Monthly Dep.</TableHead>
                      <TableHead className="text-right">Accum. Dep.</TableHead>
                      <TableHead className="text-right">Book Value</TableHead>
                      <TableHead className="text-right">% Used</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeAssets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          No active assets to show depreciation for.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {activeAssets.map((asset) => {
                          const dep = calculateDepreciation(asset, new Date(asOfDate));
                          return (
                            <TableRow key={asset.id}>
                              <TableCell className="font-mono text-sm">{asset.asset_tag}</TableCell>
                              <TableCell className="font-medium">{asset.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {asset.depreciation_method === "straight_line" ? "SL" : "DB"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(asset.purchase_cost)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(asset.salvage_value)}</TableCell>
                              <TableCell className="text-right">{asset.useful_life_months}</TableCell>
                              <TableCell className="text-right">{formatCurrency(dep.monthlyDep)}</TableCell>
                              <TableCell className="text-right text-destructive">
                                {formatCurrency(dep.accumulated)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(dep.bookValue)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-16 bg-muted rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full ${
                                        dep.percentUsed >= 90 ? "bg-destructive" :
                                        dep.percentUsed >= 70 ? "bg-amber-500" : "bg-primary"
                                      }`}
                                      style={{ width: `${dep.percentUsed}%` }}
                                    />
                                  </div>
                                  <span className="text-xs w-10 text-right">{dep.percentUsed.toFixed(0)}%</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {/* Totals Row */}
                        <TableRow className="font-bold border-t-2">
                          <TableCell colSpan={3}>TOTAL</TableCell>
                          <TableCell className="text-right">{formatCurrency(totalValue)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(activeAssets.reduce((s, a) => s + a.salvage_value, 0))}
                          </TableCell>
                          <TableCell />
                          <TableCell />
                          <TableCell className="text-right text-destructive">
                            {formatCurrency(totalDepreciation)}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(totalBookValue)}</TableCell>
                          <TableCell />
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AssetRegisterOperations;
