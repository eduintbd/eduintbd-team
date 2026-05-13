import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus,
  ShoppingCart,
  Package,
  AlertTriangle,
  Clock,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  Pencil,
  Trash2,
  CalendarClock,
  TrendingUp,
  DollarSign,
  ClipboardList,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import MonthlyProvisions from "@/components/grocery/MonthlyProvisions";
import StaffDuties from "@/components/grocery/StaffDuties";
import PetCare from "@/components/grocery/PetCare";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GroceryCategory {
  id: string;
  name: string;
  budget_limit: number | null;
}

interface GroceryItem {
  id: string;
  name: string;
  category_id: string | null;
  unit: string;
  current_stock: number;
  min_stock: number;
  unit_price: number;
  brand: string | null;
  expiry_date: string | null;
  created_at: string | null;
  category?: { id: string; name: string; budget_limit: number | null } | null;
}

interface GroceryOrder {
  id: string;
  order_number: string;
  order_date: string;
  delivery_date: string | null;
  status: string;
  total_amount: number;
  is_recurring: boolean;
  recurrence_interval: string | null;
  created_at: string | null;
}

interface GroceryOrderItem {
  id: string;
  order_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item?: { name: string; unit: string } | null;
}

interface GroceryStaffRequest {
  id: string;
  item_name: string;
  category: string | null;
  quantity: number;
  reason: string | null;
  status: string;
  requested_by: string;
  created_at: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "approved":
    case "delivered":
    case "completed":
      return "bg-green-100 text-green-800 border-green-300";
    case "rejected":
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-300";
    case "ordered":
    case "in_transit":
      return "bg-blue-100 text-blue-800 border-blue-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
};

const formatBDT = (amount: number) =>
  `৳${amount.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const expiryClass = (expiryDate: string | null) => {
  if (!expiryDate) return "";
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days <= 7) return "text-red-600 font-semibold";
  if (days <= 30) return "text-yellow-600 font-medium";
  return "";
};

const daysRemaining = (expiryDate: string) => {
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return "Expires today";
  return `${days}d remaining`;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const GroceryManagement = () => {
  // State
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [categories, setCategories] = useState<GroceryCategory[]>([]);
  const [orders, setOrders] = useState<GroceryOrder[]>([]);
  const [staffRequests, setStaffRequests] = useState<GroceryStaffRequest[]>([]);
  const [activeTab, setActiveTab] = useState("inventory");

  // Dialogs
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<GroceryOrder | null>(null);
  const [orderItems, setOrderItems] = useState<GroceryOrderItem[]>([]);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);

  // Item form
  const [itemForm, setItemForm] = useState({
    name: "",
    category_id: "",
    unit: "pcs",
    stock: "",
    min_stock: "",
    price: "",
    brand: "",
    expiry_date: "",
  });

  // Order form
  const [orderForm, setOrderForm] = useState({
    delivery_date: "",
    is_recurring: false,
    recurrence_interval: "",
  });
  const [orderLineItems, setOrderLineItems] = useState<
    { item_id: string; quantity: string; price: string }[]
  >([{ item_id: "", quantity: "", price: "" }]);

  // Staff request form
  const [requestForm, setRequestForm] = useState({
    item_name: "",
    category: "",
    quantity: "",
    reason: "",
    requested_by: "",
  });

  // -------------------------------------------------------------------------
  // Fetch data
  // -------------------------------------------------------------------------

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("grocery_items" as any)
      .select("*, category:grocery_categories(*)")
      .order("name");
    if (error) {
      toast.error("Error loading grocery items");
      console.error(error);
    } else {
      setItems((data as any) || []);
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("grocery_categories" as any)
      .select("*")
      .order("name");
    if (error) {
      toast.error("Error loading categories");
      console.error(error);
    } else {
      setCategories((data as any) || []);
    }
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("grocery_orders" as any)
      .select("*")
      .order("order_date", { ascending: false });
    if (error) {
      toast.error("Error loading orders");
      console.error(error);
    } else {
      setOrders((data as any) || []);
    }
  };

  const fetchStaffRequests = async () => {
    const { data, error } = await supabase
      .from("grocery_staff_requests" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Error loading staff requests");
      console.error(error);
    } else {
      setStaffRequests((data as any) || []);
    }
  };

  const fetchOrderItems = async (orderId: string) => {
    const { data, error } = await supabase
      .from("grocery_order_items" as any)
      .select("*, item:grocery_items(name, unit)")
      .eq("order_id", orderId);
    if (error) {
      toast.error("Error loading order items");
      console.error(error);
    } else {
      setOrderItems((data as any) || []);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchOrders();
    fetchStaffRequests();
  }, []);

  // -------------------------------------------------------------------------
  // Derived stats
  // -------------------------------------------------------------------------

  const expiringSoonItems = items.filter((i) => {
    if (!i.expiry_date) return false;
    const days = differenceInDays(parseISO(i.expiry_date), new Date());
    return days >= 0 && days <= 7;
  });

  const expiredItems = items.filter((i) => {
    if (!i.expiry_date) return false;
    return differenceInDays(parseISO(i.expiry_date), new Date()) < 0;
  });

  const pendingRequests = staffRequests.filter(
    (r) => r.status.toLowerCase() === "pending"
  );

  const monthlyBudget = categories.reduce(
    (sum, c) => sum + (c.budget_limit || 0),
    0
  );

  // -------------------------------------------------------------------------
  // Handlers - Items
  // -------------------------------------------------------------------------

  const resetItemForm = () => {
    setItemForm({
      name: "",
      category_id: "",
      unit: "pcs",
      stock: "",
      min_stock: "",
      price: "",
      brand: "",
      expiry_date: "",
    });
    setEditingItem(null);
  };

  const openAddItem = () => {
    resetItemForm();
    setItemDialogOpen(true);
  };

  const openEditItem = (item: GroceryItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      category_id: item.category_id || "",
      unit: item.unit,
      stock: String(item.current_stock),
      min_stock: String(item.min_stock),
      price: String(item.unit_price),
      brand: item.brand || "",
      expiry_date: item.expiry_date || "",
    });
    setItemDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.name || !itemForm.price) {
      toast.error("Name and price are required");
      return;
    }

    const payload = {
      name: itemForm.name,
      category_id: itemForm.category_id || null,
      unit: itemForm.unit,
      current_stock: Number(itemForm.stock) || 0,
      min_stock: Number(itemForm.min_stock) || 0,
      unit_price: Number(itemForm.price),
      brand: itemForm.brand || null,
      expiry_date: itemForm.expiry_date || null,
    };

    if (editingItem) {
      const { error } = await supabase
        .from("grocery_items" as any)
        .update(payload as any)
        .eq("id", editingItem.id);
      if (error) {
        toast.error("Error updating item");
        console.error(error);
      } else {
        toast.success("Item updated");
      }
    } else {
      const { error } = await supabase
        .from("grocery_items" as any)
        .insert(payload as any);
      if (error) {
        toast.error("Error adding item");
        console.error(error);
      } else {
        toast.success("Item added");
      }
    }

    setItemDialogOpen(false);
    resetItemForm();
    fetchItems();
  };

  // -------------------------------------------------------------------------
  // Handlers - Orders
  // -------------------------------------------------------------------------

  const resetOrderForm = () => {
    setOrderForm({ delivery_date: "", is_recurring: false, recurrence_interval: "" });
    setOrderLineItems([{ item_id: "", quantity: "", price: "" }]);
  };

  const openCreateOrder = () => {
    resetOrderForm();
    setOrderDialogOpen(true);
  };

  const addOrderLine = () => {
    setOrderLineItems([...orderLineItems, { item_id: "", quantity: "", price: "" }]);
  };

  const updateOrderLine = (
    idx: number,
    field: "item_id" | "quantity" | "price",
    value: string
  ) => {
    const updated = [...orderLineItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setOrderLineItems(updated);
  };

  const removeOrderLine = (idx: number) => {
    if (orderLineItems.length <= 1) return;
    setOrderLineItems(orderLineItems.filter((_, i) => i !== idx));
  };

  const handleCreateOrder = async () => {
    const validLines = orderLineItems.filter(
      (l) => l.item_id && Number(l.quantity) > 0 && Number(l.price) > 0
    );
    if (validLines.length === 0) {
      toast.error("Add at least one valid line item");
      return;
    }

    const totalAmount = validLines.reduce(
      (sum, l) => sum + Number(l.quantity) * Number(l.price),
      0
    );
    const orderNumber = `GRO-${Date.now().toString(36).toUpperCase()}`;

    const { data: orderData, error: orderError } = await supabase
      .from("grocery_orders" as any)
      .insert({
        order_number: orderNumber,
        order_date: format(new Date(), "yyyy-MM-dd"),
        delivery_date: orderForm.delivery_date || null,
        status: "draft",
        total_amount: totalAmount,
        is_recurring: orderForm.is_recurring,
        recurrence_interval: orderForm.recurrence_interval || null,
      } as any)
      .select()
      .single();

    if (orderError || !orderData) {
      toast.error("Error creating order");
      console.error(orderError);
      return;
    }

    const lineInserts = validLines.map((l) => {
      const item = items.find((i) => i.id === l.item_id);
      return {
        order_id: (orderData as any).id,
        item_id: l.item_id,
        item_name: item?.name || "Unknown",
        quantity: Number(l.quantity),
        unit_price: Number(l.price),
        total_price: Number(l.quantity) * Number(l.price),
      };
    });

    const { error: linesError } = await supabase
      .from("grocery_order_items" as any)
      .insert(lineInserts as any);

    if (linesError) {
      toast.error("Error adding order items");
      console.error(linesError);
    } else {
      toast.success(`Order ${orderNumber} created`);
    }

    setOrderDialogOpen(false);
    resetOrderForm();
    fetchOrders();
  };

  const viewOrderDetail = (order: GroceryOrder) => {
    setSelectedOrder(order);
    fetchOrderItems(order.id);
    setOrderDetailOpen(true);
  };

  // -------------------------------------------------------------------------
  // Handlers - Staff Requests
  // -------------------------------------------------------------------------

  const resetRequestForm = () => {
    setRequestForm({
      item_name: "",
      category: "",
      quantity: "",
      reason: "",
      requested_by: "",
    });
  };

  const handleSubmitRequest = async () => {
    if (!requestForm.item_name) {
      toast.error("Item name is required");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("grocery_staff_requests" as any)
      .insert({
        item_name: requestForm.item_name,
        category: requestForm.category || null,
        quantity: Number(requestForm.quantity) || 1,
        reason: requestForm.reason || null,
        status: "pending",
        requested_by: user?.id,
      } as any);

    if (error) {
      toast.error("Error submitting request");
      console.error(error);
    } else {
      toast.success("Request submitted");
    }

    setRequestDialogOpen(false);
    resetRequestForm();
    fetchStaffRequests();
  };

  const handleRequestAction = async (
    requestId: string,
    action: "approved" | "rejected"
  ) => {
    const { error } = await supabase
      .from("grocery_staff_requests" as any)
      .update({ status: action } as any)
      .eq("id", requestId);

    if (error) {
      toast.error(`Error ${action === "approved" ? "approving" : "rejecting"} request`);
      console.error(error);
    } else {
      toast.success(`Request ${action}`);
    }
    fetchStaffRequests();
  };

  // -------------------------------------------------------------------------
  // Budget helpers
  // -------------------------------------------------------------------------

  const getCategorySpent = (categoryId: string) => {
    return items
      .filter((i) => i.category_id === categoryId)
      .reduce((sum, i) => sum + i.unit_price * i.current_stock, 0);
  };

  // -------------------------------------------------------------------------
  // Expiry tracker items sorted
  // -------------------------------------------------------------------------

  const expiryTrackerItems = items
    .filter((i) => i.expiry_date)
    .sort((a, b) => {
      if (!a.expiry_date || !b.expiry_date) return 0;
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    });

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Home &amp; Office Management
          </h1>
          <p className="text-muted-foreground">
            Manage grocery, provisions, facility tasks, and pet care
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openAddItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
          <Button variant="outline" onClick={openCreateOrder}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {/* Expiry Alert Banner */}
      {(expiringSoonItems.length > 0 || expiredItems.length > 0) && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <div className="text-sm text-red-800">
              {expiredItems.length > 0 && (
                <span className="font-semibold">
                  {expiredItems.length} item(s) expired.{" "}
                </span>
              )}
              {expiringSoonItems.length > 0 && (
                <span>
                  {expiringSoonItems.length} item(s) expiring within 7 days.
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-lg bg-blue-100 p-3">
              <Package className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold">{items.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-lg bg-red-100 p-3">
              <AlertTriangle className="h-5 w-5 text-red-700" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expiring Soon</p>
              <p className="text-2xl font-bold">{expiringSoonItems.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-lg bg-green-100 p-3">
              <DollarSign className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Budget</p>
              <p className="text-2xl font-bold">{formatBDT(monthlyBudget)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-lg bg-yellow-100 p-3">
              <ClipboardList className="h-5 w-5 text-yellow-700" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Requests</p>
              <p className="text-2xl font-bold">{pendingRequests.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start flex-wrap h-auto">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="requests">Staff Requests</TabsTrigger>
          <TabsTrigger value="expiry">Expiry Tracker</TabsTrigger>
          <TabsTrigger value="provisions">Monthly Provisions</TabsTrigger>
          <TabsTrigger value="duties">Staff Duties</TabsTrigger>
          <TabsTrigger value="petcare">Pet Care</TabsTrigger>
        </TabsList>

        {/* ================================================================= */}
        {/* TAB 1: Inventory */}
        {/* ================================================================= */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Grocery Inventory</CardTitle>
              <CardDescription>
                All pantry and grocery items with stock levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Min Stock</TableHead>
                      <TableHead className="text-right">Price (BDT)</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No items found. Add your first grocery item.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => (
                        <TableRow
                          key={item.id}
                          className={
                            item.current_stock < item.min_stock
                              ? "bg-yellow-50"
                              : ""
                          }
                        >
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            {item.category ? (
                              <Badge variant="secondary">
                                {item.category.name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell className="text-right">
                            {item.current_stock}
                            {item.current_stock < item.min_stock && (
                              <AlertTriangle className="inline h-3 w-3 ml-1 text-yellow-600" />
                            )}
                          </TableCell>
                          <TableCell className="text-right">{item.min_stock}</TableCell>
                          <TableCell className="text-right">
                            {formatBDT(item.unit_price)}
                          </TableCell>
                          <TableCell>{item.brand || "-"}</TableCell>
                          <TableCell className={expiryClass(item.expiry_date)}>
                            {item.expiry_date
                              ? format(parseISO(item.expiry_date), "dd MMM yyyy")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditItem(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================= */}
        {/* TAB 2: Orders */}
        {/* ================================================================= */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Grocery Orders</CardTitle>
              <CardDescription>Track and manage all grocery orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Delivery Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total (BDT)</TableHead>
                      <TableHead className="text-center">Recurring</TableHead>
                      <TableHead>Interval</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No orders found. Create your first order.
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {order.order_number}
                          </TableCell>
                          <TableCell>
                            {format(parseISO(order.order_date), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell>
                            {order.delivery_date
                              ? format(parseISO(order.delivery_date), "dd MMM yyyy")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusColor(order.status)}
                            >
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatBDT(order.total_amount)}
                          </TableCell>
                          <TableCell className="text-center">
                            {order.is_recurring ? (
                              <RefreshCw className="h-4 w-4 text-blue-600 mx-auto" />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {order.recurrence_interval || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => viewOrderDetail(order)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================= */}
        {/* TAB 3: Budget */}
        {/* ================================================================= */}
        <TabsContent value="budget" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Budget Overview</CardTitle>
              <CardDescription>
                Budget allocation and spending per category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.length === 0 ? (
                  <p className="text-muted-foreground col-span-full text-center py-8">
                    No categories found.
                  </p>
                ) : (
                  categories.map((cat) => {
                    const budget = cat.budget_limit || 0;
                    const spent = getCategorySpent(cat.id);
                    const remaining = budget - spent;
                    const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
                    const overBudget = pct >= 80;

                    return (
                      <Card key={cat.id} className={overBudget ? "border-red-300" : ""}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{cat.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Budget</span>
                            <span className="font-medium">{formatBDT(budget)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Spent</span>
                            <span className="font-medium">{formatBDT(spent)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Remaining</span>
                            <span
                              className={`font-medium ${
                                remaining < 0 ? "text-red-600" : "text-green-600"
                              }`}
                            >
                              {formatBDT(remaining)}
                            </span>
                          </div>
                          <Progress
                            value={pct}
                            className={`h-2 ${overBudget ? "[&>div]:bg-red-500" : ""}`}
                          />
                          <p className="text-xs text-muted-foreground text-right">
                            {pct.toFixed(1)}% used
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================= */}
        {/* TAB 4: Staff Requests */}
        {/* ================================================================= */}
        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Staff Requests</CardTitle>
                <CardDescription>
                  Employee grocery and pantry requests
                </CardDescription>
              </div>
              <Button onClick={() => { resetRequestForm(); setRequestDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Submit Request
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No requests found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      staffRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">{req.item_name}</TableCell>
                          <TableCell>
                            {req.category ? (
                              <Badge variant="secondary">{req.category}</Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right">{req.quantity}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {req.reason || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusColor(req.status)}
                            >
                              {req.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{req.requested_by}</TableCell>
                          <TableCell className="text-right">
                            {req.status.toLowerCase() === "pending" && (
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => handleRequestAction(req.id, "approved")}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleRequestAction(req.id, "rejected")}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================= */}
        {/* TAB 5: Expiry Tracker */}
        {/* ================================================================= */}
        <TabsContent value="expiry" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expiry Tracker</CardTitle>
              <CardDescription>
                Items sorted by expiry date — act on items expiring soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Days Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiryTrackerItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No items with expiry dates.
                        </TableCell>
                      </TableRow>
                    ) : (
                      expiryTrackerItems.map((item) => {
                        const days = differenceInDays(
                          parseISO(item.expiry_date!),
                          new Date()
                        );
                        let rowClass = "";
                        if (days <= 7) rowClass = "bg-red-50";
                        else if (days <= 30) rowClass = "bg-yellow-50";

                        return (
                          <TableRow key={item.id} className={rowClass}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>
                              {item.category ? (
                                <Badge variant="secondary">
                                  {item.category.name}
                                </Badge>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>{item.brand || "-"}</TableCell>
                            <TableCell className="text-right">{item.current_stock}</TableCell>
                            <TableCell className={expiryClass(item.expiry_date)}>
                              {format(parseISO(item.expiry_date!), "dd MMM yyyy")}
                            </TableCell>
                            <TableCell>
                              <span
                                className={
                                  days <= 7
                                    ? "text-red-600 font-semibold"
                                    : days <= 30
                                    ? "text-yellow-600 font-medium"
                                    : ""
                                }
                              >
                                {daysRemaining(item.expiry_date!)}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="provisions" className="space-y-4">
          <MonthlyProvisions />
        </TabsContent>

        <TabsContent value="duties" className="space-y-4">
          <StaffDuties />
        </TabsContent>

        <TabsContent value="petcare" className="space-y-4">
          <PetCare />
        </TabsContent>
      </Tabs>

      {/* ================================================================= */}
      {/* DIALOG: Add/Edit Item */}
      {/* ================================================================= */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Item" : "Add Grocery Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the grocery item details."
                : "Add a new item to the grocery inventory."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-name">Name *</Label>
                <Input
                  id="item-name"
                  value={itemForm.name}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, name: e.target.value })
                  }
                  placeholder="e.g. Basmati Rice"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-category">Category</Label>
                <Select
                  value={itemForm.category_id}
                  onValueChange={(v) =>
                    setItemForm({ ...itemForm, category_id: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-unit">Unit</Label>
                <Select
                  value={itemForm.unit}
                  onValueChange={(v) => setItemForm({ ...itemForm, unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["pcs", "kg", "g", "ltr", "ml", "pack", "box", "dozen"].map(
                      (u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-stock">Stock</Label>
                <Input
                  id="item-stock"
                  type="number"
                  value={itemForm.stock}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, stock: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-min-stock">Min Stock</Label>
                <Input
                  id="item-min-stock"
                  type="number"
                  value={itemForm.min_stock}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, min_stock: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-price">Price (BDT) *</Label>
                <Input
                  id="item-price"
                  type="number"
                  step="0.01"
                  value={itemForm.price}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, price: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-brand">Brand</Label>
                <Input
                  id="item-brand"
                  value={itemForm.brand}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, brand: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-expiry">Expiry Date</Label>
              <Input
                id="item-expiry"
                type="date"
                value={itemForm.expiry_date}
                onChange={(e) =>
                  setItemForm({ ...itemForm, expiry_date: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveItem}>
              {editingItem ? "Update" : "Add Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* DIALOG: Create Order */}
      {/* ================================================================= */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Grocery Order</DialogTitle>
            <DialogDescription>
              Add line items and set delivery details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order-delivery">Delivery Date</Label>
                <Input
                  id="order-delivery"
                  type="date"
                  value={orderForm.delivery_date}
                  onChange={(e) =>
                    setOrderForm({ ...orderForm, delivery_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order-recurrence">Recurrence Interval</Label>
                <Select
                  value={orderForm.recurrence_interval}
                  onValueChange={(v) =>
                    setOrderForm({
                      ...orderForm,
                      recurrence_interval: v,
                      is_recurring: v !== "",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Not recurring" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not recurring</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Line Items</Label>
                <Button variant="outline" size="sm" onClick={addOrderLine}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Line
                </Button>
              </div>

              {orderLineItems.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5 space-y-1">
                    {idx === 0 && (
                      <Label className="text-xs text-muted-foreground">Item</Label>
                    )}
                    <Select
                      value={line.item_id}
                      onValueChange={(v) => {
                        updateOrderLine(idx, "item_id", v);
                        const found = items.find((i) => i.id === v);
                        if (found) updateOrderLine(idx, "price", String(found.unit_price));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 space-y-1">
                    {idx === 0 && (
                      <Label className="text-xs text-muted-foreground">Qty</Label>
                    )}
                    <Input
                      type="number"
                      value={line.quantity}
                      onChange={(e) =>
                        updateOrderLine(idx, "quantity", e.target.value)
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    {idx === 0 && (
                      <Label className="text-xs text-muted-foreground">
                        Price (BDT)
                      </Label>
                    )}
                    <Input
                      type="number"
                      step="0.01"
                      value={line.price}
                      onChange={(e) =>
                        updateOrderLine(idx, "price", e.target.value)
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500"
                      onClick={() => removeOrderLine(idx)}
                      disabled={orderLineItems.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="text-right font-semibold">
                Total:{" "}
                {formatBDT(
                  orderLineItems.reduce(
                    (s, l) => s + Number(l.quantity) * Number(l.price),
                    0
                  )
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOrderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrder}>Create Order</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* DIALOG: Order Detail */}
      {/* ================================================================= */}
      <Dialog open={orderDetailOpen} onOpenChange={setOrderDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Order {selectedOrder?.order_number}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder &&
                `Placed on ${format(parseISO(selectedOrder.order_date), "dd MMM yyyy")}`}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge
                    variant="outline"
                    className={statusColor(selectedOrder.status)}
                  >
                    {selectedOrder.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>{" "}
                  <span className="font-semibold">
                    {formatBDT(selectedOrder.total_amount)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Delivery:</span>{" "}
                  {selectedOrder.delivery_date
                    ? format(parseISO(selectedOrder.delivery_date), "dd MMM yyyy")
                    : "Not set"}
                </div>
                <div>
                  <span className="text-muted-foreground">Recurring:</span>{" "}
                  {selectedOrder.is_recurring
                    ? selectedOrder.recurrence_interval
                    : "No"}
                </div>
              </div>

              <Separator />

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                          No line items found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      orderItems.map((oi) => (
                        <TableRow key={oi.id}>
                          <TableCell>
                            {oi.item?.name || "Unknown"}
                            {oi.item?.unit && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({oi.item.unit})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{oi.quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatBDT(oi.unit_price)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatBDT(oi.total_price)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* DIALOG: Submit Staff Request */}
      {/* ================================================================= */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Grocery Request</DialogTitle>
            <DialogDescription>
              Request a grocery or pantry item.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="req-item">Item Name *</Label>
              <Input
                id="req-item"
                value={requestForm.item_name}
                onChange={(e) =>
                  setRequestForm({ ...requestForm, item_name: e.target.value })
                }
                placeholder="e.g. Green Tea"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="req-category">Category</Label>
                <Select
                  value={requestForm.category}
                  onValueChange={(v) =>
                    setRequestForm({ ...requestForm, category: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="req-qty">Quantity</Label>
                <Input
                  id="req-qty"
                  type="number"
                  value={requestForm.quantity}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, quantity: e.target.value })
                  }
                  placeholder="1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="req-reason">Reason</Label>
              <Input
                id="req-reason"
                value={requestForm.reason}
                onChange={(e) =>
                  setRequestForm({ ...requestForm, reason: e.target.value })
                }
                placeholder="Why is this needed?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="req-by">Requested By *</Label>
              <Input
                id="req-by"
                value={requestForm.requested_by}
                onChange={(e) =>
                  setRequestForm({
                    ...requestForm,
                    requested_by: e.target.value,
                  })
                }
                placeholder="Your name"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setRequestDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitRequest}>Submit Request</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroceryManagement;
