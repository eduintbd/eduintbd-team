import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, CreditCard, Banknote, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Payment {
  id: string;
  purchase_order_id: string | null;
  vendor_id: string | null;
  date: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  purchase_order?: { po_number: string } | null;
  vendor?: { name: string } | null;
}

interface PO {
  id: string;
  po_number: string;
  vendor_id: string | null;
  total_amount: number;
  credit_amount: number;
  vendor?: { name: string } | null;
}

interface Vendor {
  id: string;
  name: string;
}

const paymentMethodLabels: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  mobile_banking: "Mobile Banking",
  card: "Card",
};

const ProcurementPayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pendingPOs, setPendingPOs] = useState<PO[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    purchase_order_id: "",
    vendor_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    payment_method: "cash",
    reference_number: "",
    notes: "",
  });

  useEffect(() => {
    fetchPayments();
    fetchPendingPOs();
    fetchVendors();
  }, []);

  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from("procurement_payments")
      .select("*, purchase_order:purchase_orders(po_number), vendor:vendors(name)")
      .order("date", { ascending: false });
    if (error) toast.error("Error loading payments");
    else setPayments(data || []);
  };

  const fetchPendingPOs = async () => {
    const { data } = await supabase
      .from("purchase_orders")
      .select("id, po_number, vendor_id, total_amount, credit_amount, vendor:vendors(name)")
      .neq("payment_status", "paid")
      .not("status", "in", '("cancelled","rejected")')
      .order("po_number");
    setPendingPOs(data || []);
  };

  const fetchVendors = async () => {
    const { data } = await supabase.from("vendors").select("id, name").eq("is_active", true).order("name");
    setVendors(data || []);
  };

  const handlePOChange = (poId: string) => {
    const po = pendingPOs.find(p => p.id === poId);
    setFormData({
      ...formData,
      purchase_order_id: poId,
      vendor_id: po?.vendor_id || "",
      amount: po?.credit_amount?.toString() || "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("procurement_payments").insert([{
      purchase_order_id: formData.purchase_order_id || null,
      vendor_id: formData.vendor_id || null,
      date: formData.date,
      amount: parseFloat(formData.amount),
      payment_method: formData.payment_method,
      reference_number: formData.reference_number || null,
      notes: formData.notes || null,
      recorded_by: user?.id,
    }]);

    if (error) toast.error("Error recording payment");
    else {
      toast.success("Payment recorded");
      setOpen(false);
      setFormData({
        purchase_order_id: "", vendor_id: "", date: format(new Date(), "yyyy-MM-dd"),
        amount: "", payment_method: "cash", reference_number: "", notes: "",
      });
      fetchPayments();
      fetchPendingPOs();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT" }).format(amount || 0);
  };

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold">Procurement Payments</h1>
          <p className="text-muted-foreground mt-2">Track payments to vendors and suppliers</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Record Payment</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>Record a payment against a purchase order or vendor</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Purchase Order (optional)</Label>
                <Select value={formData.purchase_order_id} onValueChange={handlePOChange}>
                  <SelectTrigger><SelectValue placeholder="Select PO" /></SelectTrigger>
                  <SelectContent>
                    {pendingPOs.map(po => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.po_number} - {po.vendor?.name || "No vendor"} (Due: {formatCurrency(po.credit_amount)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Vendor</Label>
                <Select value={formData.vendor_id} onValueChange={(v) => setFormData({ ...formData, vendor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => (<SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input type="number" step="0.01" min="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={formData.payment_method} onValueChange={(v) => setFormData({ ...formData, payment_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(paymentMethodLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reference #</Label>
                  <Input value={formData.reference_number} onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })} placeholder="Cheque/TXN number" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>

              <Button type="submit" className="w-full">Record Payment</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{payments.length}</div>
                <p className="text-sm text-muted-foreground">Total Payments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{formatCurrency(totalPaid)}</div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{pendingPOs.length}</div>
                <p className="text-sm text-muted-foreground">Unpaid POs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>All procurement payments</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>PO #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{format(new Date(payment.date), "MMM dd, yyyy")}</TableCell>
                  <TableCell className="font-mono">{payment.purchase_order?.po_number || "-"}</TableCell>
                  <TableCell>{payment.vendor?.name || "-"}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{paymentMethodLabels[payment.payment_method] || payment.payment_method}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{payment.reference_number || "-"}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">{payment.notes || "-"}</TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No payments recorded</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcurementPayments;
