import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  account_subtype: string;
  description: string | null;
  is_active: boolean;
}

// Valid subtypes per account type. The account code range is derived from the
// type+subtype pair, so the subtype must always be one that belongs to the type
// (otherwise the code falls back to the wrong default range).
const SUBTYPES_BY_TYPE: Record<string, string[]> = {
  asset: ["current_asset", "fixed_asset"],
  liability: ["current_liability", "long_term_liability"],
  equity: ["shareholders_equity"],
  revenue: ["operating_revenue", "other_revenue"],
  expense: ["operating_expense", "other_expense"],
};

const SUBTYPE_LABELS: Record<string, string> = {
  current_asset: "Current Asset",
  fixed_asset: "Fixed Asset",
  current_liability: "Current Liability",
  long_term_liability: "Long-term Liability",
  shareholders_equity: "Shareholders Equity",
  operating_revenue: "Operating Revenue",
  other_revenue: "Other Revenue",
  operating_expense: "Operating Expense",
  other_expense: "Other Expense",
};

const ChartOfAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    account_code: "",
    account_name: "",
    account_type: "asset" as "asset" | "liability" | "equity" | "revenue" | "expense",
    account_subtype: "current_asset" as
      | "current_asset"
      | "fixed_asset"
      | "current_liability"
      | "long_term_liability"
      | "shareholders_equity"
      | "operating_revenue"
      | "other_revenue"
      | "operating_expense"
      | "other_expense",
    description: "",
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    generateAccountCode();
  }, [formData.account_type, formData.account_subtype, accounts]);

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from("chart_of_accounts")
      .select("*")
      .order("account_code");

    if (error) {
      toast.error("Error loading accounts");
    } else {
      setAccounts(data || []);
    }
  };

  const getNextAccountCode = async (accountType: "asset" | "liability" | "equity" | "revenue" | "expense") => {
    // Define account code ranges by type
    const ranges: Record<string, { prefix: string; start: number }> = {
      asset: { prefix: "1", start: 1000 },
      liability: { prefix: "2", start: 2000 },
      equity: { prefix: "3", start: 3000 },
      revenue: { prefix: "4", start: 4000 },
      expense: { prefix: "5", start: 5000 },
    };

    const range = ranges[accountType];
    if (!range) return "";

    // Get all accounts of this type
    const { data } = await supabase
      .from("chart_of_accounts")
      .select("account_code")
      .eq("account_type", accountType)
      .order("account_code", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastCode = parseInt(data[0].account_code);
      return (lastCode + 1).toString();
    }

    return range.start.toString();
  };

  const getAccountCodeRange = (type: string, subtype: string) => {
    // Define code ranges by type and subtype
    const ranges: Record<string, { min: number; max: number }> = {
      'asset-current_asset': { min: 1000, max: 1099 },
      'asset-fixed_asset': { min: 1100, max: 1199 },
      'liability-current_liability': { min: 2000, max: 2099 },
      'liability-long_term_liability': { min: 2100, max: 2199 },
      'equity-shareholders_equity': { min: 3000, max: 3999 },
      'revenue-operating_revenue': { min: 4000, max: 4099 },
      'revenue-other_revenue': { min: 4100, max: 4199 },
      'expense-operating_expense': { min: 5000, max: 5099 },
      'expense-other_expense': { min: 5100, max: 5199 },
    };
    
    return ranges[`${type}-${subtype}`] || { min: 1000, max: 1999 };
  };

  const generateAccountCode = () => {
    const range = getAccountCodeRange(formData.account_type, formData.account_subtype);
    
    // Get all codes in this range
    const codesInRange = accounts
      .map(acc => parseInt(acc.account_code))
      .filter(code => code >= range.min && code <= range.max)
      .sort((a, b) => a - b);
    
    // Find the next available code
    let nextCode = range.min;
    for (const code of codesInRange) {
      if (code === nextCode) {
        nextCode++;
      } else if (code > nextCode) {
        break;
      }
    }
    
    // Make sure we don't exceed the max
    if (nextCode > range.max) {
      toast.error(`No available codes in range ${range.min}-${range.max}`);
      return;
    }
    
    setFormData(prev => ({ ...prev, account_code: nextCode.toString() }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("chart_of_accounts").insert([formData]);

    if (error) {
      toast.error("Error creating account");
    } else {
      toast.success("Account created successfully");
      setOpen(false);
      fetchAccounts();
      setFormData({
        account_code: "",
        account_name: "",
        account_type: "asset",
        account_subtype: "current_asset",
        description: "",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-display font-bold">Chart of Accounts</h1>
        <p className="text-muted-foreground mt-2">Manage your account structure</p>
      </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Account</DialogTitle>
              <DialogDescription>Add a new account to your chart of accounts</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account_code">Account Code</Label>
                <Input
                  id="account_code"
                  value={formData.account_code}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Auto-generated based on account type</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_name">Account Name</Label>
                <Input
                  id="account_name"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_type">Account Type</Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(value) => {
                    const type = value as "asset" | "liability" | "equity" | "revenue" | "expense";
                    // Reset the subtype to one that belongs to the new type so the
                    // code range stays correct. The useEffect recomputes the code.
                    setFormData({
                      ...formData,
                      account_type: type,
                      account_subtype: SUBTYPES_BY_TYPE[type][0] as typeof formData.account_subtype,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="liability">Liability</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_subtype">Account Subtype</Label>
                <Select
                  value={formData.account_subtype}
                  onValueChange={(value) => {
                    setFormData({
                      ...formData,
                      account_subtype: value as
                        | "current_asset"
                        | "fixed_asset"
                        | "current_liability"
                        | "long_term_liability"
                        | "shareholders_equity"
                        | "operating_revenue"
                        | "other_revenue"
                        | "operating_expense"
                        | "other_expense",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(SUBTYPES_BY_TYPE[formData.account_type] ?? []).map((s) => (
                      <SelectItem key={s} value={s}>{SUBTYPE_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                Create Account
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>All accounts in your chart of accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Subtype</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-mono">{account.account_code}</TableCell>
                  <TableCell className="font-medium">{account.account_name}</TableCell>
                  <TableCell className="capitalize">{account.account_type}</TableCell>
                  <TableCell className="capitalize">
                    {account.account_subtype.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        account.is_active
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {account.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChartOfAccounts;
