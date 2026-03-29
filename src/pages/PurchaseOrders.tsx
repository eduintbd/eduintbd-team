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
import { Plus, Eye, Trash2, ShoppingCart, FileCheck, Clock, XCircle, CheckCircle2, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Vendor {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface ProcurementItem {
  id: string;
  name: string;
  unit: string;
}

interface POItem {
  id?: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  date: string;
  vendor_id: string | null;
  category_id: string | null;
  status: string;
  total_amount: number;
  paid_amount: number;
  credit_amount: number;
  payment_status: string;
  notes: string | null;
  created_at: string;
  vendor?: { name: string } | null;
  category?: { name: string } | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  draft: { label: "Draft", variant: "secondary", icon: Clock },
  pending_approval: { label: "Pending Approval", variant: "outline", icon: Clock },
  approved: { label: "Approved", variant: "default", icon: CheckCircle2 },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
  ordered: { label: "Ordered", variant: "default", icon: ShoppingCart },
  received: { label: "Received", variant: "default", icon: FileCheck },
  cancelled: { label: "Cancelled", variant: "secondary", icon: XCircle },
};

const PurchaseOrders = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [procurementItems, setProcurementItems] = useState<ProcurementItem[]>([]);
  const [open, setOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [orderItems, setOrderItems] = useState<POItem[]>([]);
  const [detailItems, setDetailItems] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    vendor_id: "",
    category_id: "",
    notes: "",
  });

  useEffect(() => {
    fetchOrders();
    fetchVendors();
    fetchCategories();
    fetchProcurementItems();
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*, vendor:vendors(name), category:procurement_categories(name)")
      .order("created_at", { ascending: false });
    if (error) toast.error("Error loading purchase orders");
    else setOrders(data || []);
  };

  const fetchVendors = async () => {
    const { data } = await supabase.from("vendors").select("id, name").eq("is_active", true).order("name");
    setVendors(data || []);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("procurement_categories").select("id, name").eq("is_active", true).order("name");
    setCategories(data || []);
  };

  const fetchProcurementItems = async () => {
    const { data } = await supabase.from("procurement_items").select("id, name, unit").eq("is_active", true).order("name");
    setProcurementItems(data || []);
  };

  const addLineItem = () => {
    setOrderItems([...orderItems, { item_id: "", item_name: "", quantity: 1, unit_price: 0, total_price: 0 }]);
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value };

    if (field === "item_id") {
      const item = procurementItems.find(i => i.id === value);
      if (item) updated[index].item_name = item.name;
    }

    if (field === "quantity" || field === "unit_price") {
      updated[index].total_price = updated[index].quantity * updated[index].unit_price;
    }

    setOrderItems(updated);
  };

  const removeLineItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const totalAmount = orderItems.reduce((sum, item) => sum + item.total_price, 0);

    const { data: po, error } = await supabase
      .from("purchase_orders")
      .insert([{
        po_number: "",
        date: formData.date,
        vendor_id: formData.vendor_id || null,
        category_id: formData.category_id || null,
        requested_by: user?.id,
        status: "draft",
        total_amount: totalAmount,
        credit_amount: totalAmount,
        notes: formData.notes || null,
      }])
      .select()
      .single();

    if (error) {
      toast.error("Error creating purchase order");
      return;
    }

    const lineItems = orderItems.map(item => ({
      purchase_order_id: po.id,
      item_id: item.item_id || null,
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    }));

    const { error: itemsError } = await supabase.from("purchase_order_items").insert(lineItems);
    if (itemsError) toast.error("Error adding items to PO");
    else toast.success(`Purchase Order created`);

    setOpen(false);
    setOrderItems([]);
    setFormData({ date: format(new Date(), "yyyy-MM-dd"), vendor_id: "", category_id: "", notes: "" });
    fetchOrders();
  };

  const viewDetails = async (order: PurchaseOrder) => {
    setSelectedOrder(order);
    const { data } = await supabase
      .from("purchase_order_items")
      .select("*")
      .eq("purchase_order_id", order.id);
    setDetailItems(data || []);
    setDetailOpen(true);
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    const updateData: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "approved") {
      const { data: { user } } = await supabase.auth.getUser();
      updateData.approved_by = user?.id;
      updateData.approved_at = new Date().toISOString();
    }
    if (newStatus === "received") {
      updateData.received_at = new Date().toISOString();
    }

    const { error } = await supabase.from("purchase_orders").update(updateData).eq("id", orderId);
    if (error) toast.error("Error updating status");
    else {
      toast.success(`Status updated to ${newStatus}`);
      fetchOrders();
      setDetailOpen(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT" }).format(amount || 0);
  };

  const filtered = orders.filter(o => filterStatus === "all" || o.status === filterStatus);

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending_approval").length,
    totalValue: orders.filter(o => !["cancelled", "rejected"].includes(o.status)).reduce((s, o) => s + o.total_amount, 0),
    unpaid: orders.filter(o => o.payment_status !== "paid" && !["cancelled", "rejected"].includes(o.status)).reduce((s, o) => s + o.credit_amount, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground mt-2">Create and manage procurement orders</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Purchase Order</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
              <DialogDescription>Add items and submit for approval</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
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
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes..." />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">Line Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLineItem}><Plus className="h-3 w-3 mr-1" />Add Item</Button>
                </div>

                {orderItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-3">
                    <div className="col-span-4 space-y-1">
                      <Label className="text-xs">Item</Label>
                      <Select value={item.item_id} onValueChange={(v) => updateLineItem(idx, "item_id", v)}>
                        <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                        <SelectContent>
                          {procurementItems.map(pi => (<SelectItem key={pi.id} value={pi.id}>{pi.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => updateLineItem(idx, "quantity", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Unit Price</Label>
                      <Input type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateLineItem(idx, "unit_price", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Total</Label>
                      <Input value={formatCurrency(item.total_price)} disabled />
                    </div>
                    <div className="col-span-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeLineItem(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}

                {orderItems.length > 0 && (
                  <div className="text-right font-semibold text-lg">
                    Total: {formatCurrency(orderItems.reduce((s, i) => s + i.total_price, 0))}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={orderItems.length === 0}>Create Purchase Order</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-500">{stats.pending}</div>
            <p className="text-sm text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
            <p className="text-sm text-muted-foreground">Total Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{formatCurrency(stats.unpaid)}</div>
            <p className="text-sm text-muted-foreground">Outstanding</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="max-w-[200px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((order) => {
                const sc = statusConfig[order.status] || statusConfig.draft;
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-medium">{order.po_number}</TableCell>
                    <TableCell>{format(new Date(order.date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{order.vendor?.name || "-"}</TableCell>
                    <TableCell><Badge variant="outline">{order.category?.name || "-"}</Badge></TableCell>
                    <TableCell><Badge variant={sc.variant}>{sc.label}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(order.total_amount)}</TableCell>
                    <TableCell>
                      <Badge variant={order.payment_status === "paid" ? "default" : order.payment_status === "partial" ? "outline" : "secondary"}>
                        {order.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => viewDetails(order)}><Eye className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No purchase orders found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase Order: {selectedOrder?.po_number}</DialogTitle>
            <DialogDescription>
              {selectedOrder && format(new Date(selectedOrder.date), "MMMM dd, yyyy")} | {selectedOrder?.vendor?.name || "No vendor"}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={statusConfig[selectedOrder.status]?.variant}>{statusConfig[selectedOrder.status]?.label}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-semibold">{formatCurrency(selectedOrder.total_amount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Outstanding</p>
                  <p className="font-semibold text-destructive">{formatCurrency(selectedOrder.credit_amount)}</p>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Notes</p>
                  <p>{selectedOrder.notes}</p>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailItems.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.total_price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Status Actions */}
              <div className="flex gap-2 flex-wrap">
                {selectedOrder.status === "draft" && (
                  <Button onClick={() => updateStatus(selectedOrder.id, "pending_approval")}>Submit for Approval</Button>
                )}
                {selectedOrder.status === "pending_approval" && (
                  <>
                    <Button onClick={() => updateStatus(selectedOrder.id, "approved")}>Approve</Button>
                    <Button variant="destructive" onClick={() => updateStatus(selectedOrder.id, "rejected")}>Reject</Button>
                  </>
                )}
                {selectedOrder.status === "approved" && (
                  <Button onClick={() => updateStatus(selectedOrder.id, "ordered")}>Mark as Ordered</Button>
                )}
                {selectedOrder.status === "ordered" && (
                  <Button onClick={() => updateStatus(selectedOrder.id, "received")}>Mark as Received</Button>
                )}
                {!["cancelled", "rejected", "received"].includes(selectedOrder.status) && (
                  <Button variant="outline" onClick={() => updateStatus(selectedOrder.id, "cancelled")}>Cancel</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseOrders;
