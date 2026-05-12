import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import { format, differenceInDays, parseISO, startOfMonth, endOfMonth } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ManagedCard {
  id: string;
  card_type: string;
  card_name: string;
  card_number: string;
  description: string | null;
  status: string;
  assigned_to: string | null;
  expiry_date: string | null;
  spending_limit: number | null;
  current_balance: number | null;
  bank: string | null;
  access_level: string | null;
  zones: string | null;
  design_template: string | null;
  print_qty: number | null;
  created_at: string;
}

interface CardAssignment {
  id: string;
  card_id: string;
  card_name: string;
  action: string;
  assigned_to: string;
  assigned_by: string;
  assignment_date: string;
  notes: string | null;
}

interface CardTransaction {
  id: string;
  card_id: string;
  transaction_date: string;
  merchant: string;
  category: string;
  amount: number;
  description: string | null;
}

interface BulkOrder {
  id: string;
  card_type: string;
  quantity: number;
  status: string;
  vendor: string;
  estimated_cost: number;
  order_date: string;
  expected_delivery: string | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const cardTypeBadge = (type: string) => {
  const colors: Record<string, string> = {
    business: "bg-blue-100 text-blue-800",
    access: "bg-green-100 text-green-800",
    corporate: "bg-purple-100 text-purple-800",
  };
  return (
    <Badge className={colors[type] || "bg-gray-100 text-gray-800"}>
      {type}
    </Badge>
  );
};

const statusBadge = (status: string) => {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    lost: "bg-red-100 text-red-800",
    expired: "bg-yellow-100 text-yellow-800",
    returned: "bg-gray-200 text-gray-700",
    ordered: "bg-blue-100 text-blue-800",
  };
  return (
    <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>
      {status}
    </Badge>
  );
};

const actionBadge = (action: string) => {
  const colors: Record<string, string> = {
    assigned: "bg-green-100 text-green-800",
    returned: "bg-blue-100 text-blue-800",
    lost_reported: "bg-red-100 text-red-800",
    replaced: "bg-yellow-100 text-yellow-800",
    renewed: "bg-emerald-100 text-emerald-800",
  };
  return (
    <Badge className={colors[action] || "bg-gray-100 text-gray-800"}>
      {action.replace("_", " ")}
    </Badge>
  );
};

const orderStatusBadge = (status: string) => {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    ordered: "bg-blue-100 text-blue-800",
    delivered: "bg-emerald-100 text-emerald-800",
  };
  return (
    <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>
      {status}
    </Badge>
  );
};

const expiryColor = (expiryDate: string | null): string => {
  if (!expiryDate) return "";
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days < 0) return "text-red-600 font-semibold";
  if (days <= 30) return "text-red-600 font-semibold";
  return "";
};

const expiryAlertColor = (expiryDate: string): string => {
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days < 0) return "border-red-400 bg-red-50";
  if (days <= 30) return "border-yellow-400 bg-yellow-50";
  if (days <= 90) return "border-blue-400 bg-blue-50";
  return "border-gray-200";
};

const daysRemaining = (expiryDate: string): string => {
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days < 0) return `Expired ${Math.abs(days)} days ago`;
  if (days === 0) return "Expires today";
  return `${days} days remaining`;
};

// ── Component ──────────────────────────────────────────────────────────────────

const CardManagement = () => {
  const [cards, setCards] = useState<ManagedCard[]>([]);
  const [assignments, setAssignments] = useState<CardAssignment[]>([]);
  const [transactions, setTransactions] = useState<CardTransaction[]>([]);
  const [bulkOrders, setBulkOrders] = useState<BulkOrder[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filterType, setFilterType] = useState<string>("all");

  // Dialogs
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [assignCardOpen, setAssignCardOpen] = useState(false);
  const [addTransactionOpen, setAddTransactionOpen] = useState(false);
  const [bulkOrderOpen, setBulkOrderOpen] = useState(false);

  // Add Card form
  const [cardForm, setCardForm] = useState({
    card_type: "",
    card_name: "",
    card_number: "",
    description: "",
    expiry_date: "",
    spending_limit: "",
    bank: "",
    access_level: "",
    zones: "",
    design_template: "",
    print_qty: "",
  });

  // Assign Card form
  const [assignForm, setAssignForm] = useState({
    card_id: "",
    assigned_to: "",
    action: "",
    notes: "",
  });

  // Add Transaction form
  const [txForm, setTxForm] = useState({
    card_id: "",
    transaction_date: format(new Date(), "yyyy-MM-dd"),
    merchant: "",
    category: "",
    amount: "",
    description: "",
  });

  // Bulk Order form
  const [orderForm, setOrderForm] = useState({
    card_type: "",
    quantity: "",
    vendor: "",
    estimated_cost: "",
    expected_delivery: "",
  });

  // ── Data fetching ────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchCards();
    fetchAssignments();
    fetchTransactions();
    fetchBulkOrders();
    fetchEmployees();
  }, []);

  const fetchCards = async () => {
    const { data, error } = await supabase
      .from("managed_cards")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Error loading cards");
    } else {
      setCards(data || []);
    }
  };

  const fetchAssignments = async () => {
    const { data, error } = await supabase
      .from("card_assignments")
      .select("*")
      .order("assignment_date", { ascending: false });
    if (error) {
      toast.error("Error loading assignments");
    } else {
      setAssignments(data || []);
    }
  };

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from("card_transactions")
      .select("*")
      .order("transaction_date", { ascending: false });
    if (error) {
      toast.error("Error loading transactions");
    } else {
      setTransactions(data || []);
    }
  };

  const fetchBulkOrders = async () => {
    const { data, error } = await supabase
      .from("card_bulk_orders")
      .select("*")
      .order("order_date", { ascending: false });
    if (error) {
      toast.error("Error loading bulk orders");
    } else {
      setBulkOrders(data || []);
    }
  };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, first_name, last_name")
      .order("first_name");
    setEmployees(data || []);
  };

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleAddCard = async () => {
    if (!cardForm.card_type || !cardForm.card_name || !cardForm.card_number) {
      toast.error("Please fill in required fields");
      return;
    }

    const payload: Record<string, unknown> = {
      card_type: cardForm.card_type,
      card_name: cardForm.card_name,
      card_number: cardForm.card_number,
      description: cardForm.description || null,
      expiry_date: cardForm.expiry_date || null,
      status: "active",
    };

    if (cardForm.card_type === "corporate") {
      payload.spending_limit = parseFloat(cardForm.spending_limit) || 0;
      payload.bank = cardForm.bank || null;
      payload.current_balance = 0;
    }
    if (cardForm.card_type === "access") {
      payload.access_level = cardForm.access_level || null;
      payload.zones = cardForm.zones || null;
    }
    if (cardForm.card_type === "business") {
      payload.design_template = cardForm.design_template || null;
      payload.print_qty = parseInt(cardForm.print_qty) || null;
    }

    const { error } = await supabase.from("managed_cards").insert(payload);
    if (error) {
      toast.error("Failed to add card");
    } else {
      toast.success("Card added successfully");
      setAddCardOpen(false);
      setCardForm({
        card_type: "",
        card_name: "",
        card_number: "",
        description: "",
        expiry_date: "",
        spending_limit: "",
        bank: "",
        access_level: "",
        zones: "",
        design_template: "",
        print_qty: "",
      });
      fetchCards();
    }
  };

  const handleAssignCard = async () => {
    if (!assignForm.card_id || !assignForm.assigned_to || !assignForm.action) {
      toast.error("Please fill in required fields");
      return;
    }

    const selectedCard = cards.find((c) => c.id === assignForm.card_id);

    const payload = {
      card_id: assignForm.card_id,
      card_name: selectedCard?.card_name || "",
      action: assignForm.action,
      assigned_to: assignForm.assigned_to,
      assigned_by: "Current User",
      assignment_date: format(new Date(), "yyyy-MM-dd"),
      notes: assignForm.notes || null,
    };

    const { error } = await supabase.from("card_assignments").insert(payload);
    if (error) {
      toast.error("Failed to assign card");
    } else {
      toast.success("Card assigned successfully");
      setAssignCardOpen(false);
      setAssignForm({ card_id: "", assigned_to: "", action: "", notes: "" });
      fetchAssignments();

      if (assignForm.action === "assigned") {
        await supabase
          .from("managed_cards")
          .update({ assigned_to: assignForm.assigned_to })
          .eq("id", assignForm.card_id);
        fetchCards();
      }
    }
  };

  const handleAddTransaction = async () => {
    if (!txForm.card_id || !txForm.merchant || !txForm.amount) {
      toast.error("Please fill in required fields");
      return;
    }

    const payload = {
      card_id: txForm.card_id,
      transaction_date: txForm.transaction_date,
      merchant: txForm.merchant,
      category: txForm.category || "General",
      amount: parseFloat(txForm.amount),
      description: txForm.description || null,
    };

    const { error } = await supabase.from("card_transactions").insert(payload);
    if (error) {
      toast.error("Failed to add transaction");
    } else {
      toast.success("Transaction added");
      setAddTransactionOpen(false);
      setTxForm({
        card_id: "",
        transaction_date: format(new Date(), "yyyy-MM-dd"),
        merchant: "",
        category: "",
        amount: "",
        description: "",
      });
      fetchTransactions();

      // Update current_balance on the card
      const card = cards.find((c) => c.id === txForm.card_id);
      if (card) {
        await supabase
          .from("managed_cards")
          .update({
            current_balance: (card.current_balance || 0) + parseFloat(txForm.amount),
          })
          .eq("id", txForm.card_id);
        fetchCards();
      }
    }
  };

  const handleCreateBulkOrder = async () => {
    if (!orderForm.card_type || !orderForm.quantity || !orderForm.vendor) {
      toast.error("Please fill in required fields");
      return;
    }

    const payload = {
      card_type: orderForm.card_type,
      quantity: parseInt(orderForm.quantity),
      status: "pending",
      vendor: orderForm.vendor,
      estimated_cost: parseFloat(orderForm.estimated_cost) || 0,
      order_date: format(new Date(), "yyyy-MM-dd"),
      expected_delivery: orderForm.expected_delivery || null,
    };

    const { error } = await supabase.from("card_bulk_orders").insert(payload);
    if (error) {
      toast.error("Failed to create order");
    } else {
      toast.success("Bulk order created");
      setBulkOrderOpen(false);
      setOrderForm({
        card_type: "",
        quantity: "",
        vendor: "",
        estimated_cost: "",
        expected_delivery: "",
      });
      fetchBulkOrders();
    }
  };

  const handleBulkOrderStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("card_bulk_orders")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update order");
    } else {
      toast.success(`Order ${status}`);
      fetchBulkOrders();
    }
  };

  const handleRenewCard = async (card: ManagedCard) => {
    const newExpiry = new Date();
    newExpiry.setFullYear(newExpiry.getFullYear() + 2);

    const { error } = await supabase
      .from("managed_cards")
      .update({
        expiry_date: format(newExpiry, "yyyy-MM-dd"),
        status: "active",
      })
      .eq("id", card.id);
    if (error) {
      toast.error("Failed to renew card");
    } else {
      toast.success("Card renewed successfully");
      fetchCards();
    }
  };

  // ── Computed values ──────────────────────────────────────────────────────────

  const filteredCards =
    filterType === "all" ? cards : cards.filter((c) => c.card_type === filterType);

  const corporateCards = cards.filter((c) => c.card_type === "corporate");

  const expiringCards = cards
    .filter((c) => c.expiry_date)
    .sort((a, b) => {
      const da = a.expiry_date ? parseISO(a.expiry_date).getTime() : Infinity;
      const db = b.expiry_date ? parseISO(b.expiry_date).getTime() : Infinity;
      return da - db;
    });

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthlySpending = transactions
    .filter((t) => {
      const d = parseISO(t.transaction_date);
      return d >= monthStart && d <= monthEnd;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const activeCards = cards.filter((c) => c.status === "active").length;
  const expiringSoon = cards.filter((c) => {
    if (!c.expiry_date) return false;
    const days = differenceInDays(parseISO(c.expiry_date), now);
    return days >= 0 && days <= 30;
  }).length;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Card Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage business, access, and corporate cards
          </p>
        </div>
        <Dialog open={addCardOpen} onOpenChange={setAddCardOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Card
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Card</DialogTitle>
              <DialogDescription>Enter card details below.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Card Type *</Label>
                <Select
                  value={cardForm.card_type}
                  onValueChange={(v) => setCardForm({ ...cardForm, card_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="access">Access</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Card Name *</Label>
                <Input
                  value={cardForm.card_name}
                  onChange={(e) => setCardForm({ ...cardForm, card_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Card Number *</Label>
                <Input
                  value={cardForm.card_number}
                  onChange={(e) => setCardForm({ ...cardForm, card_number: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={cardForm.description}
                  onChange={(e) => setCardForm({ ...cardForm, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={cardForm.expiry_date}
                  onChange={(e) => setCardForm({ ...cardForm, expiry_date: e.target.value })}
                />
              </div>

              {/* Corporate-specific fields */}
              {cardForm.card_type === "corporate" && (
                <>
                  <Separator />
                  <p className="text-sm font-medium text-muted-foreground">Corporate Card Details</p>
                  <div>
                    <Label>Spending Limit (BDT)</Label>
                    <Input
                      type="number"
                      value={cardForm.spending_limit}
                      onChange={(e) =>
                        setCardForm({ ...cardForm, spending_limit: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Bank</Label>
                    <Input
                      value={cardForm.bank}
                      onChange={(e) => setCardForm({ ...cardForm, bank: e.target.value })}
                    />
                  </div>
                </>
              )}

              {/* Access-specific fields */}
              {cardForm.card_type === "access" && (
                <>
                  <Separator />
                  <p className="text-sm font-medium text-muted-foreground">Access Card Details</p>
                  <div>
                    <Label>Access Level</Label>
                    <Input
                      value={cardForm.access_level}
                      onChange={(e) =>
                        setCardForm({ ...cardForm, access_level: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Zones</Label>
                    <Input
                      value={cardForm.zones}
                      onChange={(e) => setCardForm({ ...cardForm, zones: e.target.value })}
                      placeholder="e.g. Floor 1, Server Room"
                    />
                  </div>
                </>
              )}

              {/* Business-specific fields */}
              {cardForm.card_type === "business" && (
                <>
                  <Separator />
                  <p className="text-sm font-medium text-muted-foreground">
                    Business Card Details
                  </p>
                  <div>
                    <Label>Design Template</Label>
                    <Input
                      value={cardForm.design_template}
                      onChange={(e) =>
                        setCardForm({ ...cardForm, design_template: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Print Quantity</Label>
                    <Input
                      type="number"
                      value={cardForm.print_qty}
                      onChange={(e) =>
                        setCardForm({ ...cardForm, print_qty: e.target.value })
                      }
                    />
                  </div>
                </>
              )}

              <Button className="w-full" onClick={handleAddCard}>
                Add Card
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <CreditCard className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Cards</p>
                <p className="text-2xl font-bold">{cards.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <ShieldCheck className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Cards</p>
                <p className="text-2xl font-bold">{activeCards}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold">{expiringSoon}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">This Month Spending</p>
                <p className="text-2xl font-bold">
                  {monthlySpending.toLocaleString("en-BD")} BDT
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all-cards">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all-cards">All Cards</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="bulk-orders">Bulk Orders</TabsTrigger>
          <TabsTrigger value="expiry-alerts">Expiry Alerts</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: All Cards ─────────────────────────────────────────────────── */}
        <TabsContent value="all-cards">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="access">Access</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Card Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Card Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Spending Limit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCards.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No cards found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCards.map((card) => (
                      <TableRow key={card.id}>
                        <TableCell className="font-medium">{card.card_name}</TableCell>
                        <TableCell>{cardTypeBadge(card.card_type)}</TableCell>
                        <TableCell className="font-mono">{card.card_number}</TableCell>
                        <TableCell>{statusBadge(card.status)}</TableCell>
                        <TableCell>{card.assigned_to || "-"}</TableCell>
                        <TableCell className={expiryColor(card.expiry_date)}>
                          {card.expiry_date
                            ? format(parseISO(card.expiry_date), "MMM dd, yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {card.card_type === "corporate" && card.spending_limit != null
                            ? `${card.spending_limit.toLocaleString("en-BD")} BDT`
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Assignments ───────────────────────────────────────────────── */}
        <TabsContent value="assignments">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-end mb-4">
                <Dialog open={assignCardOpen} onOpenChange={setAssignCardOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" /> Assign Card
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Card</DialogTitle>
                      <DialogDescription>
                        Assign a card to an employee.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Card *</Label>
                        <Select
                          value={assignForm.card_id}
                          onValueChange={(v) =>
                            setAssignForm({ ...assignForm, card_id: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select card" />
                          </SelectTrigger>
                          <SelectContent>
                            {cards.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.card_name} ({c.card_type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Employee *</Label>
                        <Select
                          value={assignForm.assigned_to}
                          onValueChange={(v) =>
                            setAssignForm({ ...assignForm, assigned_to: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={`${emp.first_name} ${emp.last_name}`}>
                                {emp.first_name} {emp.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Action *</Label>
                        <Select
                          value={assignForm.action}
                          onValueChange={(v) =>
                            setAssignForm({ ...assignForm, action: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="assigned">Assigned</SelectItem>
                            <SelectItem value="returned">Returned</SelectItem>
                            <SelectItem value="lost_reported">Lost Reported</SelectItem>
                            <SelectItem value="replaced">Replaced</SelectItem>
                            <SelectItem value="renewed">Renewed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Input
                          value={assignForm.notes}
                          onChange={(e) =>
                            setAssignForm({ ...assignForm, notes: e.target.value })
                          }
                          placeholder="Optional notes"
                        />
                      </div>
                      <Button className="w-full" onClick={handleAssignCard}>
                        Assign Card
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Card Name</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Assigned By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No assignments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    assignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.card_name}</TableCell>
                        <TableCell>{actionBadge(a.action)}</TableCell>
                        <TableCell>{a.assigned_to}</TableCell>
                        <TableCell>{a.assigned_by}</TableCell>
                        <TableCell>
                          {format(parseISO(a.assignment_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>{a.notes || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Spending ──────────────────────────────────────────────────── */}
        <TabsContent value="spending">
          <div className="space-y-6">
            {/* Per-card summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {corporateCards.map((card) => {
                const utilization =
                  card.spending_limit && card.spending_limit > 0
                    ? Math.min(
                        ((card.current_balance || 0) / card.spending_limit) * 100,
                        100
                      )
                    : 0;
                return (
                  <Card key={card.id}>
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{card.card_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {card.card_number}
                          </p>
                        </div>
                        {statusBadge(card.status)}
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Limit</span>
                          <span>{(card.spending_limit || 0).toLocaleString("en-BD")} BDT</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Spent</span>
                          <span>{(card.current_balance || 0).toLocaleString("en-BD")} BDT</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Utilization</span>
                          <span>{utilization.toFixed(1)}%</span>
                        </div>
                        <Progress value={utilization} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {corporateCards.length === 0 && (
                <p className="text-muted-foreground col-span-full text-center py-8">
                  No corporate cards found
                </p>
              )}
            </div>

            {/* Transactions table */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Transactions</h3>
                  <Dialog open={addTransactionOpen} onOpenChange={setAddTransactionOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" /> Add Transaction
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Transaction</DialogTitle>
                        <DialogDescription>
                          Record a corporate card transaction.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Card *</Label>
                          <Select
                            value={txForm.card_id}
                            onValueChange={(v) => setTxForm({ ...txForm, card_id: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select corporate card" />
                            </SelectTrigger>
                            <SelectContent>
                              {corporateCards.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.card_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Date</Label>
                          <Input
                            type="date"
                            value={txForm.transaction_date}
                            onChange={(e) =>
                              setTxForm({ ...txForm, transaction_date: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label>Merchant *</Label>
                          <Input
                            value={txForm.merchant}
                            onChange={(e) =>
                              setTxForm({ ...txForm, merchant: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label>Category</Label>
                          <Input
                            value={txForm.category}
                            onChange={(e) =>
                              setTxForm({ ...txForm, category: e.target.value })
                            }
                            placeholder="e.g. Travel, Office Supplies"
                          />
                        </div>
                        <div>
                          <Label>Amount (BDT) *</Label>
                          <Input
                            type="number"
                            value={txForm.amount}
                            onChange={(e) =>
                              setTxForm({ ...txForm, amount: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Input
                            value={txForm.description}
                            onChange={(e) =>
                              setTxForm({ ...txForm, description: e.target.value })
                            }
                          />
                        </div>
                        <Button className="w-full" onClick={handleAddTransaction}>
                          Add Transaction
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount (BDT)</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>
                            {format(parseISO(tx.transaction_date), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell>{tx.merchant}</TableCell>
                          <TableCell>{tx.category}</TableCell>
                          <TableCell className="font-medium">
                            {tx.amount.toLocaleString("en-BD")} BDT
                          </TableCell>
                          <TableCell>{tx.description || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab 4: Bulk Orders ───────────────────────────────────────────────── */}
        <TabsContent value="bulk-orders">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-end mb-4">
                <Dialog open={bulkOrderOpen} onOpenChange={setBulkOrderOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" /> Create Bulk Order
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Bulk Order</DialogTitle>
                      <DialogDescription>
                        Order cards in bulk from a vendor.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Card Type *</Label>
                        <Select
                          value={orderForm.card_type}
                          onValueChange={(v) =>
                            setOrderForm({ ...orderForm, card_type: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="business">Business</SelectItem>
                            <SelectItem value="access">Access</SelectItem>
                            <SelectItem value="corporate">Corporate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          value={orderForm.quantity}
                          onChange={(e) =>
                            setOrderForm({ ...orderForm, quantity: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Vendor *</Label>
                        <Input
                          value={orderForm.vendor}
                          onChange={(e) =>
                            setOrderForm({ ...orderForm, vendor: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Estimated Cost (BDT)</Label>
                        <Input
                          type="number"
                          value={orderForm.estimated_cost}
                          onChange={(e) =>
                            setOrderForm({ ...orderForm, estimated_cost: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Expected Delivery</Label>
                        <Input
                          type="date"
                          value={orderForm.expected_delivery}
                          onChange={(e) =>
                            setOrderForm({ ...orderForm, expected_delivery: e.target.value })
                          }
                        />
                      </div>
                      <Button className="w-full" onClick={handleCreateBulkOrder}>
                        Create Order
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Card Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Estimated Cost</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Expected Delivery</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulkOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No bulk orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    bulkOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>{cardTypeBadge(order.card_type)}</TableCell>
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell>{orderStatusBadge(order.status)}</TableCell>
                        <TableCell>{order.vendor}</TableCell>
                        <TableCell>
                          {order.estimated_cost.toLocaleString("en-BD")} BDT
                        </TableCell>
                        <TableCell>
                          {format(parseISO(order.order_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          {order.expected_delivery
                            ? format(parseISO(order.expected_delivery), "MMM dd, yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {order.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-300 hover:bg-green-50"
                                onClick={() => handleBulkOrderStatus(order.id, "approved")}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                                onClick={() => handleBulkOrderStatus(order.id, "rejected")}
                              >
                                Reject
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

        {/* ── Tab 5: Expiry Alerts ─────────────────────────────────────────────── */}
        <TabsContent value="expiry-alerts">
          <div className="space-y-3">
            {expiringCards.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No cards with expiry dates found
                </CardContent>
              </Card>
            ) : (
              expiringCards.map((card) => (
                <Card
                  key={card.id}
                  className={`border-2 ${expiryAlertColor(card.expiry_date!)}`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <p className="font-semibold text-lg">{card.card_name}</p>
                          {cardTypeBadge(card.card_type)}
                          {statusBadge(card.status)}
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">
                          {card.card_number}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm">
                            Expiry:{" "}
                            <span className="font-medium">
                              {format(parseISO(card.expiry_date!), "MMM dd, yyyy")}
                            </span>
                          </span>
                          <Badge
                            className={
                              differenceInDays(parseISO(card.expiry_date!), now) < 0
                                ? "bg-red-100 text-red-800"
                                : differenceInDays(parseISO(card.expiry_date!), now) <= 30
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-blue-100 text-blue-800"
                            }
                          >
                            {daysRemaining(card.expiry_date!)}
                          </Badge>
                        </div>
                        {card.assigned_to && (
                          <p className="text-sm text-muted-foreground">
                            Assigned to: {card.assigned_to}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleRenewCard(card)}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className="h-4 w-4" /> Renew
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CardManagement;
