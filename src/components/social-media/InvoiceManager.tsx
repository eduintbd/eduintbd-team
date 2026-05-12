import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  FileText,
  DollarSign,
  Clock,
  AlertTriangle,
  Send,
  CheckCircle2,
  Eye,
} from "lucide-react";

interface Company {
  id: string;
  name: string;
  monthly_fee: number | null;
  package_id: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  company_id: string;
  month: string;
  package_fee: number;
  extra_charges: number;
  discount: number;
  tax: number;
  total: number;
  status: string;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  company_name?: string;
}

interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface UsageRecord {
  company_id: string;
  month: string;
  extra_charges: number;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700 border-gray-200" },
  sent: { label: "Sent", className: "bg-blue-100 text-blue-700 border-blue-200" },
  paid: { label: "Paid", className: "bg-green-100 text-green-700 border-green-200" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-700 border-red-200" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-500 border-gray-200" },
};

function generateInvoiceNumber(month: string, existingInvoices: Invoice[]): string {
  const ym = month.replace("-", "");
  const existing = existingInvoices.filter((inv) => inv.invoice_number.startsWith(`INV-${ym}-`));
  const nextNum = existing.length + 1;
  return `INV-${ym}-${String(nextNum).padStart(3, "0")}`;
}

export default function InvoiceManager() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCompany, setFilterCompany] = useState<string>("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [detailItems, setDetailItems] = useState<InvoiceItem[]>([]);

  const [formCompanyId, setFormCompanyId] = useState("");
  const [formMonth, setFormMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [formPackageFee, setFormPackageFee] = useState(0);
  const [formExtraCharges, setFormExtraCharges] = useState(0);
  const [formDiscount, setFormDiscount] = useState(0);
  const [formTax, setFormTax] = useState(0);
  const [formDueDate, setFormDueDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: invData }, { data: compData }] = await Promise.all([
      supabase
        .from("social_media_invoices")
        .select("*, social_media_companies(name)")
        .order("created_at", { ascending: false }),
      supabase.from("social_media_companies").select("id, name, monthly_fee, package_id").order("name"),
    ]);

    const mapped = ((invData as any[]) || []).map((inv: any) => ({
      ...inv,
      company_name: inv.social_media_companies?.name || "Unknown",
    }));

    setInvoices(mapped);
    setCompanies((compData as Company[]) || []);
    setLoading(false);
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (filterStatus !== "all" && inv.status !== filterStatus) return false;
    if (filterCompany !== "all" && inv.company_id !== filterCompany) return false;
    return true;
  });

  const summary = {
    totalRevenue: invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0),
    pending: invoices.filter((i) => i.status === "sent").reduce((s, i) => s + i.total, 0),
    overdueCount: invoices.filter((i) => i.status === "overdue").length,
    draftCount: invoices.filter((i) => i.status === "draft").length,
  };

  const openCreate = () => {
    setFormCompanyId("");
    const now = new Date();
    setFormMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    setFormPackageFee(0);
    setFormExtraCharges(0);
    setFormDiscount(0);
    setFormTax(0);
    setFormDueDate("");
    setFormNotes("");
    setFormItems([]);
    setCreateOpen(true);
  };

  const onCompanySelect = async (companyId: string) => {
    setFormCompanyId(companyId);
    const company = companies.find((c) => c.id === companyId);
    if (company?.monthly_fee) {
      setFormPackageFee(company.monthly_fee);
    }
    // Fetch extra charges from usage
    const { data } = await supabase
      .from("social_media_usage")
      .select("extra_charges")
      .eq("company_id", companyId)
      .eq("month", formMonth)
      .maybeSingle();

    if (data) {
      setFormExtraCharges((data as any).extra_charges || 0);
    }
  };

  const addLineItem = () => {
    setFormItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0, total: 0 }]);
  };

  const updateLineItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setFormItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === "quantity" || field === "unit_price") {
        item.total = (item.quantity || 0) * (item.unit_price || 0);
      }
      updated[index] = item;
      return updated;
    });
  };

  const removeLineItem = (index: number) => {
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calcTotal = () => {
    const lineItemsTotal = formItems.reduce((s, i) => s + i.total, 0);
    const subtotal = formPackageFee + formExtraCharges + lineItemsTotal;
    const afterDiscount = subtotal - formDiscount;
    const taxAmount = afterDiscount * (formTax / 100);
    return afterDiscount + taxAmount;
  };

  const handleCreate = async () => {
    if (!formCompanyId) {
      toast.error("Please select a company");
      return;
    }

    const invoiceNumber = generateInvoiceNumber(formMonth, invoices);
    const total = calcTotal();

    const payload: any = {
      invoice_number: invoiceNumber,
      company_id: formCompanyId,
      month: formMonth,
      package_fee: formPackageFee,
      extra_charges: formExtraCharges,
      discount: formDiscount,
      tax: formTax,
      total,
      status: "draft",
      due_date: formDueDate || null,
      notes: formNotes || null,
    };

    const { data: invResult, error } = await supabase
      .from("social_media_invoices")
      .insert(payload)
      .select("id")
      .single();

    if (error || !invResult) {
      toast.error("Failed to create invoice: " + (error?.message || "Unknown error"));
      return;
    }

    // Insert line items
    if (formItems.length > 0) {
      const items = formItems.map((item) => ({
        invoice_id: (invResult as any).id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      }));

      const { error: itemsError } = await supabase
        .from("social_media_invoice_items")
        .insert(items);

      if (itemsError) {
        toast.error("Invoice created but failed to save line items: " + itemsError.message);
      }
    }

    toast.success("Invoice created: " + invoiceNumber);
    setCreateOpen(false);
    fetchData();
  };

  const updateStatus = async (invoice: Invoice, newStatus: string) => {
    const { error } = await supabase
      .from("social_media_invoices")
      .update({ status: newStatus } as any)
      .eq("id", invoice.id);

    if (error) {
      toast.error("Failed to update status: " + error.message);
      return;
    }

    setInvoices((prev) =>
      prev.map((inv) => (inv.id === invoice.id ? { ...inv, status: newStatus } : inv))
    );
    toast.success(`Invoice marked as ${newStatus}`);
  };

  const openDetail = async (invoice: Invoice) => {
    setDetailInvoice(invoice);
    const { data } = await supabase
      .from("social_media_invoice_items")
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("id");

    setDetailItems((data as InvoiceItem[]) || []);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Invoice Manager</h2>
          <p className="text-muted-foreground">Generate and manage monthly client invoices</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Generate Invoice
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{summary.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Revenue (BDT)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Clock className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{summary.pending.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Pending (BDT)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{summary.overdueCount}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <FileText className="h-8 w-8 text-gray-500" />
            <div>
              <p className="text-2xl font-bold">{summary.draftCount}</p>
              <p className="text-xs text-muted-foreground">Drafts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCompany} onValueChange={setFilterCompany}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Companies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Package Fee</TableHead>
                <TableHead className="text-right">Extra</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Total (BDT)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No invoices found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((inv) => {
                  const sb = STATUS_BADGE[inv.status] || STATUS_BADGE.draft;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                      <TableCell>{inv.company_name}</TableCell>
                      <TableCell>{inv.month}</TableCell>
                      <TableCell className="text-right">{inv.package_fee.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{inv.extra_charges.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{inv.discount.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">{inv.total.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={sb.className}>{sb.label}</Badge>
                      </TableCell>
                      <TableCell>{inv.due_date || "--"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openDetail(inv)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {inv.status === "draft" && (
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => updateStatus(inv, "sent")}>
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {inv.status === "sent" && (
                            <>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-green-600" onClick={() => updateStatus(inv, "paid")}>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-red-600" onClick={() => updateStatus(inv, "overdue")}>
                                <AlertTriangle className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {inv.status === "overdue" && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-green-600" onClick={() => updateStatus(inv, "paid")}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Generate Invoice Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Company</Label>
                <Select value={formCompanyId} onValueChange={onCompanySelect}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Month</Label>
                <Input type="month" value={formMonth} onChange={(e) => setFormMonth(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Package Fee (BDT)</Label>
                <Input type="number" min={0} value={formPackageFee} onChange={(e) => setFormPackageFee(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Extra Charges (BDT)</Label>
                <Input type="number" min={0} value={formExtraCharges} onChange={(e) => setFormExtraCharges(parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            <Separator />

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Line Items</Label>
                <Button variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
                </Button>
              </div>
              {formItems.length > 0 && (
                <div className="space-y-2">
                  {formItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_80px_100px_100px_36px] gap-2 items-end">
                      <div>
                        {idx === 0 && <Label className="text-xs">Description</Label>}
                        <Input
                          value={item.description}
                          onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                          placeholder="Item description"
                        />
                      </div>
                      <div>
                        {idx === 0 && <Label className="text-xs">Qty</Label>}
                        <Input
                          type="number"
                          min={0}
                          value={item.quantity}
                          onChange={(e) => updateLineItem(idx, "quantity", parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        {idx === 0 && <Label className="text-xs">Unit Price</Label>}
                        <Input
                          type="number"
                          min={0}
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        {idx === 0 && <Label className="text-xs">Total</Label>}
                        <Input value={item.total.toLocaleString()} readOnly className="bg-muted" />
                      </div>
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeLineItem(idx)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount (BDT)</Label>
                <Input type="number" min={0} value={formDiscount} onChange={(e) => setFormDiscount(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Tax (%)</Label>
                <Input type="number" min={0} value={formTax} onChange={(e) => setFormTax(parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            <div>
              <Label>Due Date</Label>
              <Input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} />
            </div>

            <Card className="bg-muted/50">
              <CardContent className="py-3 flex items-center justify-between">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold">{calcTotal().toLocaleString()} BDT</span>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!detailInvoice} onOpenChange={() => setDetailInvoice(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice {detailInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {detailInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-muted-foreground">Company</span>
                <span className="font-medium">{detailInvoice.company_name}</span>
                <span className="text-muted-foreground">Month</span>
                <span>{detailInvoice.month}</span>
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className={STATUS_BADGE[detailInvoice.status]?.className}>
                  {STATUS_BADGE[detailInvoice.status]?.label}
                </Badge>
                <span className="text-muted-foreground">Due Date</span>
                <span>{detailInvoice.due_date || "--"}</span>
              </div>

              <Separator />

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Package Fee</span>
                  <span>{detailInvoice.package_fee.toLocaleString()} BDT</span>
                </div>
                <div className="flex justify-between">
                  <span>Extra Charges</span>
                  <span>{detailInvoice.extra_charges.toLocaleString()} BDT</span>
                </div>
              </div>

              {detailItems.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">Line Items</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Description</TableHead>
                          <TableHead className="text-xs text-right">Qty</TableHead>
                          <TableHead className="text-xs text-right">Price</TableHead>
                          <TableHead className="text-xs text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailItems.map((item, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm">{item.description}</TableCell>
                            <TableCell className="text-sm text-right">{item.quantity}</TableCell>
                            <TableCell className="text-sm text-right">{item.unit_price.toLocaleString()}</TableCell>
                            <TableCell className="text-sm text-right">{item.total.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>-{detailInvoice.discount.toLocaleString()} BDT</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{detailInvoice.tax}%</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2">
                  <span>Total</span>
                  <span>{detailInvoice.total.toLocaleString()} BDT</span>
                </div>
              </div>

              {detailInvoice.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{detailInvoice.notes}</p>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailInvoice(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
