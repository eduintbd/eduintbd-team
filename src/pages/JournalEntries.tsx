import { useEffect, useState } from "react";
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
import { Plus, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

interface Account {
  id: string;
  account_code: string;
  account_name: string;
}

interface JournalLine {
  account_id: string;
  description: string;
  debit: number;
  credit: number;
}

type EntryType = "journal" | "payment" | "receipt" | "contra";

const ENTRY_TYPE_CONFIG = {
  journal: { prefix: "JV", label: "Journal Entry" },
  payment: { prefix: "BP", label: "Payment Entry" },
  receipt: { prefix: "BR", label: "Receipt Entry" },
  contra: { prefix: "CV", label: "Contra Entry" },
};

const JournalEntries = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [entryType, setEntryType] = useState<EntryType>("journal");
  const [activeTab, setActiveTab] = useState("new");
  const [formData, setFormData] = useState({
    entry_number: "",
    entry_date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    reference: "",
  });
  const [lines, setLines] = useState<JournalLine[]>([
    { account_id: "", description: "", debit: 0, credit: 0 },
  ]);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);

  useEffect(() => {
    fetchAccounts();
    fetchEntries();
  }, []);

  useEffect(() => {
    generateVoucherNumber();
  }, [entryType, formData.entry_date]);

  const generateVoucherNumber = async () => {
    const date = new Date(formData.entry_date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const prefix = ENTRY_TYPE_CONFIG[entryType].prefix;
    
    // Get all entries of the same type, year, and month to find the highest sequence number
    const startDate = `${year}-${month}-01`;
    const endDate = month === "12" 
      ? `${year + 1}-01-01` 
      : `${year}-${String(Number(month) + 1).padStart(2, "0")}-01`;
    
    const { data: typeEntries } = await supabase
      .from("journal_entries")
      .select("entry_number")
      .eq("entry_type", entryType)
      .gte("entry_date", startDate)
      .lt("entry_date", endDate)
      .order("created_at", { ascending: false });

    let maxNumber = 0;
    
    // Extract numeric parts from voucher numbers and find the maximum
    if (typeEntries && typeEntries.length > 0) {
      typeEntries.forEach(entry => {
        const match = entry.entry_number.match(/-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      });
    }

    const nextNumber = String(maxNumber + 1).padStart(5, "0");
    const voucherNumber = `${prefix}-${year}-${month}-${nextNumber}`;
    
    setFormData(prev => ({ ...prev, entry_number: voucherNumber }));
  };

  const fetchAccounts = async () => {
    const { data } = await supabase
      .from("chart_of_accounts")
      .select("id, account_code, account_name")
      .eq("is_active", true)
      .order("account_code");
    setAccounts(data || []);
  };

  const fetchEntries = async () => {
    const { data } = await supabase
      .from("journal_entries")
      .select(`
        *,
        journal_entry_lines (
          debit,
          credit,
          chart_of_accounts (
            account_name,
            account_code
          )
        )
      `)
      .order("entry_date", { ascending: false });
    setEntries(data || []);
  };

  const addLine = () => {
    setLines([...lines, { account_id: "", description: "", debit: 0, credit: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof JournalLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const getTotals = () => {
    const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
    return { totalDebit, totalCredit, balanced: totalDebit === totalCredit && totalDebit > 0 };
  };

  const loadEntryForEdit = async (entry: any) => {
    setEditingEntry(entry);
    setEntryType(entry.entry_type);
    setFormData({
      entry_number: entry.entry_number,
      entry_date: entry.entry_date,
      description: entry.description,
      reference: entry.reference || "",
    });

    // Fetch the entry lines
    const { data: linesData } = await supabase
      .from("journal_entry_lines")
      .select("*")
      .eq("journal_entry_id", entry.id)
      .order("line_number");

    if (linesData && linesData.length > 0) {
      setLines(
        linesData.map((line) => ({
          account_id: line.account_id,
          description: line.description || "",
          debit: line.debit || 0,
          credit: line.credit || 0,
        }))
      );
    }

    setActiveTab("new");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totals = getTotals();

    if (!totals.balanced) {
      toast.error("Journal entry is not balanced. Debits must equal credits.");
      return;
    }

    const { data: session } = await supabase.auth.getSession();

    if (editingEntry) {
      // Update existing entry and set to pending for re-approval
      const { error: entryError } = await supabase
        .from("journal_entries")
        .update({
          entry_date: formData.entry_date,
          description: formData.description,
          reference: formData.reference,
          entry_type: entryType,
          status: "pending",
        })
        .eq("id", editingEntry.id);

      if (entryError) {
        toast.error("Error updating journal entry");
        return;
      }

      // Delete old lines
      await supabase
        .from("journal_entry_lines")
        .delete()
        .eq("journal_entry_id", editingEntry.id);

      // Insert new lines
      const lineData = lines.map((line, index) => ({
        journal_entry_id: editingEntry.id,
        account_id: line.account_id,
        description: line.description,
        debit: Number(line.debit || 0),
        credit: Number(line.credit || 0),
        line_number: index + 1,
      }));

      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert(lineData);

      if (linesError) {
        toast.error("Error updating journal entry lines");
      } else {
        toast.success("Journal entry updated and moved to pending approval");
        setOpen(false);
        setEditingEntry(null);
        fetchEntries();
        setFormData({
          entry_number: "",
          entry_date: format(new Date(), "yyyy-MM-dd"),
          description: "",
          reference: "",
        });
        setLines([{ account_id: "", description: "", debit: 0, credit: 0 }]);
        setActiveTab("approval");
      }
    } else {
      // Create new entry
      const { data: entryData, error: entryError } = await supabase
        .from("journal_entries")
        .insert([
          {
            ...formData,
            entry_type: entryType,
            created_by: session.session?.user.id,
            status: "draft",
          },
        ])
        .select()
        .single();

      if (entryError || !entryData) {
        toast.error("Error creating journal entry");
        return;
      }

      const lineData = lines.map((line, index) => ({
        journal_entry_id: entryData.id,
        account_id: line.account_id,
        description: line.description,
        debit: Number(line.debit || 0),
        credit: Number(line.credit || 0),
        line_number: index + 1,
      }));

      const { error: linesError } = await supabase.from("journal_entry_lines").insert(lineData);

      if (linesError) {
        toast.error("Error creating journal entry lines");
        await supabase.from("journal_entries").delete().eq("id", entryData.id);
      } else {
        toast.success("Journal entry created successfully");
        setOpen(false);
        fetchEntries();
        setFormData({
          entry_number: "",
          entry_date: format(new Date(), "yyyy-MM-dd"),
          description: "",
          reference: "",
        });
        setLines([{ account_id: "", description: "", debit: 0, credit: 0 }]);
      }
    }
  };

  const postEntry = async (id: string) => {
    const { error } = await supabase
      .from("journal_entries")
      .update({ status: "posted" })
      .eq("id", id);

    if (error) {
      toast.error("Error posting entry");
    } else {
      toast.success("Entry posted successfully");
      fetchEntries();
    }
  };

  const handleBulkApprove = async () => {
    if (selectedEntries.length === 0) {
      toast.error("Please select entries to approve");
      return;
    }

    const { error } = await supabase
      .from("journal_entries")
      .update({ status: "posted" })
      .in("id", selectedEntries);

    if (error) {
      toast.error("Failed to approve entries");
      return;
    }

    toast.success(`${selectedEntries.length} entries approved successfully`);
    setSelectedEntries([]);
    fetchEntries();
  };

  const toggleSelectEntry = (id: string) => {
    setSelectedEntries(prev =>
      prev.includes(id) ? prev.filter(entryId => entryId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const pendingEntries = entries.filter(e => e.status === "pending" || e.status === "draft");
    if (selectedEntries.length === pendingEntries.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(pendingEntries.map(e => e.id));
    }
  };

  const deleteEntry = async (id: string) => {
    // First delete the journal entry lines
    const { error: linesError } = await supabase
      .from("journal_entry_lines")
      .delete()
      .eq("journal_entry_id", id);

    if (linesError) {
      toast.error("Error deleting entry lines");
      return;
    }

    // Then delete the journal entry
    const { error: entryError } = await supabase
      .from("journal_entries")
      .delete()
      .eq("id", id);

    if (entryError) {
      toast.error("Error deleting entry");
    } else {
      toast.success("Entry deleted successfully");
      fetchEntries();
    }
  };

  const totals = getTotals();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Accounts Entry</h1>
        <p className="text-muted-foreground mt-2">Record journal entries, payments, receipts, and contra entries</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="new">New Entry</TabsTrigger>
          <TabsTrigger value="approval">Approval</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{editingEntry ? "Edit Entry" : "Create New Entry"}</CardTitle>
              <CardDescription>
                {editingEntry ? "Update the accounting entry" : "Record a new accounting entry with debits and credits"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Entry Type</Label>
                  <Select 
                    value={entryType} 
                    onValueChange={(value: EntryType) => setEntryType(value)}
                    disabled={!!editingEntry}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ENTRY_TYPE_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Voucher Number</Label>
                    <Input
                      value={formData.entry_number}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={formData.entry_date}
                      onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                      disabled={!!editingEntry}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reference (Optional)</Label>
                  <Input
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-lg">Entry Lines</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addLine}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Line
                    </Button>
                  </div>

                  {lines.map((line, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="grid gap-3">
                          <Select
                            value={line.account_id}
                            onValueChange={(value) => updateLine(index, "account_id", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts.map((acc) => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  {acc.account_code} - {acc.account_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Description"
                            value={line.description}
                            onChange={(e) => updateLine(index, "description", e.target.value)}
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <Input
                              type="number"
                              placeholder="Debit"
                              step="0.01"
                              value={line.debit || ""}
                              onChange={(e) => updateLine(index, "debit", e.target.value)}
                            />
                            <Input
                              type="number"
                              placeholder="Credit"
                              step="0.01"
                              value={line.credit || ""}
                              onChange={(e) => updateLine(index, "credit", e.target.value)}
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeLine(index)}
                              disabled={lines.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Total Debit: ${totals.totalDebit.toFixed(2)}</p>
                      <p className="font-medium">Total Credit: ${totals.totalCredit.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      {totals.balanced ? (
                        <p className="text-success font-bold">✓ Balanced</p>
                      ) : (
                        <p className="text-destructive font-bold">✗ Not Balanced</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {editingEntry && (
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setEditingEntry(null);
                        setFormData({
                          entry_number: "",
                          entry_date: format(new Date(), "yyyy-MM-dd"),
                          description: "",
                          reference: "",
                        });
                        setLines([{ account_id: "", description: "", debit: 0, credit: 0 }]);
                        setActiveTab("approval");
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" className="flex-1" disabled={!totals.balanced}>
                    {editingEntry ? "Update Entry" : "Create Entry"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approval" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Draft Entries Pending Approval</CardTitle>
                  <CardDescription>Review and approve draft journal entries</CardDescription>
                </div>
                {selectedEntries.length > 0 && (
                  <Button onClick={handleBulkApprove} size="sm">
                    Approve Selected ({selectedEntries.length})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={
                          entries.filter(e => e.status === "pending" || e.status === "draft").length > 0 &&
                          selectedEntries.length === entries.filter(e => e.status === "pending" || e.status === "draft").length
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Voucher #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Debit Accounts</TableHead>
                    <TableHead>Credit Accounts</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.filter(entry => entry.status === "draft" || entry.status === "pending").length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        No draft entries pending approval
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries
                      .filter(entry => entry.status === "draft" || entry.status === "pending")
                      .map((entry) => {
                        const debitAccounts = entry.journal_entry_lines
                          ?.filter((line: any) => Number(line.debit) > 0)
                          .map((line: any) => ({
                            name: line.chart_of_accounts?.account_name || 'Unknown',
                            amount: Number(line.debit)
                          })) || [];
                        
                        const creditAccounts = entry.journal_entry_lines
                          ?.filter((line: any) => Number(line.credit) > 0)
                          .map((line: any) => ({
                            name: line.chart_of_accounts?.account_name || 'Unknown',
                            amount: Number(line.credit)
                          })) || [];
                        
                        return (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedEntries.includes(entry.id)}
                                onCheckedChange={() => toggleSelectEntry(entry.id)}
                              />
                            </TableCell>
                            <TableCell className="font-mono">{entry.entry_number}</TableCell>
                            <TableCell>
                              <span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                                {ENTRY_TYPE_CONFIG[entry.entry_type as EntryType]?.label || entry.entry_type}
                              </span>
                            </TableCell>
                            <TableCell>{format(new Date(entry.entry_date), "MMM dd, yyyy")}</TableCell>
                            <TableCell>{entry.description}</TableCell>
                            <TableCell>{entry.reference || "-"}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {debitAccounts.map((acc, idx) => (
                                  <div key={idx} className="text-sm">
                                    <div className="font-medium">{acc.name}</div>
                                    <div className="font-mono text-muted-foreground">
                                      {acc.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {creditAccounts.map((acc, idx) => (
                                  <div key={idx} className="text-sm">
                                    <div className="font-medium">{acc.name}</div>
                                    <div className="font-mono text-muted-foreground">
                                      {acc.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="px-2 py-1 rounded-full text-xs bg-warning/10 text-warning">
                                {entry.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => postEntry(entry.id)}>
                                  Approve & Post
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteEntry(entry.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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

          <Card>
            <CardHeader>
              <CardTitle>All Entries</CardTitle>
              <CardDescription>View all accounting entries</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voucher #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono">{entry.entry_number}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                          {ENTRY_TYPE_CONFIG[entry.entry_type as EntryType]?.label || entry.entry_type}
                        </span>
                      </TableCell>
                      <TableCell>{format(new Date(entry.entry_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell>{entry.reference || "-"}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            entry.status === "posted"
                              ? "bg-success/10 text-success"
                              : "bg-warning/10 text-warning"
                          }`}
                        >
                          {entry.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {entry.status === "posted" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadEntryForEdit(entry)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default JournalEntries;
