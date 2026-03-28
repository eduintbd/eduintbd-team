import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Download } from "lucide-react";
import { format } from "date-fns";
import { useReactToPrint } from "react-to-print";

interface Asset {
  id: string;
  asset_code: string;
  asset_name: string;
  purchase_date: string;
  purchase_cost: number;
  salvage_value: number;
  useful_life_years: number;
  depreciation_method: string;
  accumulated_depreciation: number;
  book_value: number;
  status: string;
}

interface Account {
  id: string;
  account_code: string;
  account_name: string;
}

const Assets = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [open, setOpen] = useState(false);
  const [asOfDate, setAsOfDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const printRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    asset_code: "",
    asset_name: "",
    description: "",
    account_id: "",
    purchase_date: format(new Date(), "yyyy-MM-dd"),
    purchase_cost: "",
    salvage_value: "",
    useful_life_years: "",
    depreciation_method: "straight_line",
  });

  useEffect(() => {
    fetchAssets();
    fetchAccounts();
  }, []);

  const fetchAssets = async () => {
    const { data, error } = await supabase.from("assets").select("*").order("asset_code");

    if (error) {
      toast.error("Error loading assets");
    } else {
      setAssets(data || []);
    }
  };

  const fetchAccounts = async () => {
    const { data } = await supabase
      .from("chart_of_accounts")
      .select("id, account_code, account_name")
      .eq("account_type", "asset")
      .eq("is_active", true)
      .order("account_code");
    setAccounts(data || []);
  };

  const calculateDepreciation = () => {
    const cost = parseFloat(formData.purchase_cost) || 0;
    const salvage = parseFloat(formData.salvage_value) || 0;
    const years = parseInt(formData.useful_life_years) || 1;
    const depreciationAmount = (cost - salvage) / years;
    return depreciationAmount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cost = parseFloat(formData.purchase_cost);
    const bookValue = cost;

    const { error } = await supabase.from("assets").insert([
      {
        ...formData,
        purchase_cost: cost,
        salvage_value: parseFloat(formData.salvage_value) || 0,
        useful_life_years: parseInt(formData.useful_life_years),
        accumulated_depreciation: 0,
        book_value: bookValue,
        status: "active",
      },
    ]);

    if (error) {
      toast.error("Error creating asset");
    } else {
      toast.success("Asset registered successfully");
      setOpen(false);
      fetchAssets();
      setFormData({
        asset_code: "",
        asset_name: "",
        description: "",
        account_id: "",
        purchase_date: format(new Date(), "yyyy-MM-dd"),
        purchase_cost: "",
        salvage_value: "",
        useful_life_years: "",
        depreciation_method: "straight_line",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
    }).format(amount || 0);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Asset_Registry_${asOfDate}`,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold">Asset Registry</h1>
          <p className="text-muted-foreground mt-2">Manage fixed assets and depreciation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Register Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register New Asset</DialogTitle>
              <DialogDescription>Add a new fixed asset to the registry</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Asset Code</Label>
                  <Input
                    value={formData.asset_code}
                    onChange={(e) => setFormData({ ...formData, asset_code: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Asset Name</Label>
                  <Input
                    value={formData.asset_name}
                    onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Asset Account</Label>
                <Select
                  value={formData.account_id}
                  onValueChange={(value) => setFormData({ ...formData, account_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.account_code} - {acc.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Purchase Date</Label>
                  <Input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Purchase Cost</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.purchase_cost}
                    onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Salvage Value</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.salvage_value}
                    onChange={(e) => setFormData({ ...formData, salvage_value: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Useful Life (Years)</Label>
                  <Input
                    type="number"
                    value={formData.useful_life_years}
                    onChange={(e) => setFormData({ ...formData, useful_life_years: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Depreciation Method</Label>
                <Select
                  value={formData.depreciation_method}
                  onValueChange={(value) => setFormData({ ...formData, depreciation_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="straight_line">Straight Line</SelectItem>
                    <SelectItem value="declining_balance">Declining Balance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.purchase_cost && formData.useful_life_years && (
                <Card className="bg-muted">
                  <CardContent className="pt-4">
                    <p className="text-sm">
                      Annual Depreciation: <strong>{formatCurrency(calculateDepreciation())}</strong>
                    </p>
                  </CardContent>
                </Card>
              )}

              <Button type="submit" className="w-full">
                Register Asset
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Date Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-2">
            <Label>As of Date</Label>
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div ref={printRef} className="print:p-8">
        <Card>
        <CardHeader>
          <CardTitle>Registered Assets</CardTitle>
          <CardDescription>All fixed assets with depreciation details</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Asset Name</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Accumulated Dep.</TableHead>
                <TableHead className="text-right">Book Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-mono">{asset.asset_code}</TableCell>
                  <TableCell className="font-medium">{asset.asset_name}</TableCell>
                  <TableCell>{format(new Date(asset.purchase_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(asset.purchase_cost)}
                  </TableCell>
                  <TableCell className="text-right text-destructive">
                    {formatCurrency(asset.accumulated_depreciation)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(asset.book_value || asset.purchase_cost)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        asset.status === "active"
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {asset.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Assets;
