import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Users, Mail, Shield, Plus, Edit2, Copy, Check, ExternalLink,
  Chrome, Server, Key, UserPlus, Search, MailPlus,
} from "lucide-react";

interface Employee {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  company_email: string | null;
  phone: string;
  status: string;
  registration_status: string;
  email_provider: string;
  company_email_provider: string | null;
  purelymail_password: string | null;
  email_aliases: string[];
  email_active: boolean;
  user_id: string;
  department?: { name: string } | null;
  position?: { position_title: string } | null;
}

const providerConfig: Record<string, { label: string; color: string; icon: any }> = {
  google: { label: "Google Workspace", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: Chrome },
  purelymail: { label: "Purelymail", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: Server },
  password: { label: "Password Only", color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400", icon: Key },
};

const UserManagement = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Setup email dialog
  const [setupOpen, setSetupOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [emailProvider, setEmailProvider] = useState<string>("purelymail");
  const [companyEmail, setCompanyEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailAliases, setEmailAliases] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState("");

  // Add user dialog
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newProvider, setNewProvider] = useState("purelymail");
  const [newCompanyEmail, setNewCompanyEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("employees")
      .select("*, department:departments(name), position:positions(position_title)")
      .order("employee_code");

    if (error) {
      toast.error("Failed to load employees");
    } else {
      setEmployees((data || []) as any);
    }
    setLoading(false);
  };

  const openSetup = (emp: Employee) => {
    setSelectedEmployee(emp);
    setEmailProvider(emp.company_email_provider || "purelymail");
    setCompanyEmail(emp.company_email || `${emp.first_name.toLowerCase()}.${emp.last_name.toLowerCase()}@eduintbd.com`);
    setEmailPassword(emp.purelymail_password || "");
    setEmailAliases((emp.email_aliases || []).join(", "));
    setSetupOpen(true);
  };

  const handleSaveEmail = async () => {
    if (!selectedEmployee) return;
    setSaving(true);

    const aliases = emailAliases
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from("employees")
      .update({
        company_email: companyEmail,
        company_email_provider: emailProvider,
        purelymail_password: emailProvider === "purelymail" ? emailPassword : null,
        email_aliases: aliases,
        email_active: true,
      })
      .eq("id", selectedEmployee.id);

    if (error) {
      toast.error("Failed to save email settings");
    } else {
      toast.success(`Email configured for ${selectedEmployee.first_name}`);
      setSetupOpen(false);
      fetchEmployees();
    }
    setSaving(false);
  };

  const handleAddUser = async () => {
    if (!newFirstName || !newEmail) {
      toast.error("Name and email are required");
      return;
    }
    setAddingUser(true);

    try {
      if (!newPassword || newPassword.length < 12) {
        toast.error("Password must be at least 12 characters");
        setAddingUser(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-employee-account", {
        body: {
          employeeData: {
            first_name: newFirstName,
            last_name: newLastName,
            email: newEmail,
            phone: newPhone,
            password: newPassword,
            auto_approve: true,
          },
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      // Set company email if provided
      if (newCompanyEmail && data?.employee?.id) {
        await supabase
          .from("employees")
          .update({
            company_email: newCompanyEmail,
            company_email_provider: newProvider,
            email_provider: newProvider === "google" ? "google" : "password",
            email_active: true,
          })
          .eq("id", data.employee.id);
      }

      // Send welcome email with login credentials
      try {
        await supabase.functions.invoke("send-welcome-email", {
          body: {
            email: newEmail,
            firstName: newFirstName,
            lastName: newLastName,
            password: newPassword,
            loginUrl: "https://team.aibd.ai/auth",
            companyEmail: newCompanyEmail || undefined,
          },
        });
      } catch {
        // Don't fail the whole flow if email fails
        console.warn("Welcome email failed to send");
      }

      toast.success(`${newFirstName} ${newLastName} added and welcome email sent`);
      setAddUserOpen(false);
      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
      setNewPhone("");
      setNewCompanyEmail("");
      setNewPassword("");
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.message || "Failed to add user");
    } finally {
      setAddingUser(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
    toast.success(`${label} copied`);
  };

  const filtered = employees.filter((emp) => {
    const matchesSearch =
      !searchQuery ||
      `${emp.first_name} ${emp.last_name} ${emp.email} ${emp.company_email || ""}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    if (activeTab === "google") return matchesSearch && emp.company_email_provider === "google";
    if (activeTab === "purelymail") return matchesSearch && emp.company_email_provider === "purelymail";
    if (activeTab === "no-email") return matchesSearch && !emp.company_email;
    return matchesSearch;
  });

  const googleCount = employees.filter((e) => e.company_email_provider === "google").length;
  const purelymailCount = employees.filter((e) => e.company_email_provider === "purelymail").length;
  const getNoEmailCount = () => employees.filter((e) => !e.company_email).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage team members and their @eduintbd.com email accounts
          </p>
        </div>
        <Button onClick={() => setAddUserOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{employees.length}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Chrome className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{googleCount}</p>
              <p className="text-xs text-muted-foreground">Google Workspace</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Server className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{purelymailCount}</p>
              <p className="text-xs text-muted-foreground">Purelymail</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <MailPlus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{getNoEmailCount()}</p>
              <p className="text-xs text-muted-foreground">No Company Email</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All ({employees.length})</TabsTrigger>
                <TabsTrigger value="google">Google ({googleCount})</TabsTrigger>
                <TabsTrigger value="purelymail">Purelymail ({purelymailCount})</TabsTrigger>
                <TabsTrigger value="no-email">No Email ({getNoEmailCount()})</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-1">
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[200px] h-9"
              />
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Personal Email</TableHead>
                <TableHead>Company Email</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Aliases</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((emp) => {
                const provider = emp.company_email_provider
                  ? providerConfig[emp.company_email_provider]
                  : null;
                return (
                  <TableRow key={emp.id}>
                    <TableCell className="font-mono text-sm">{emp.employee_code}</TableCell>
                    <TableCell className="font-medium">
                      {emp.first_name} {emp.last_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{emp.email}</TableCell>
                    <TableCell>
                      {emp.company_email ? (
                        <div className="flex items-center gap-1">
                          <span className="text-sm">{emp.company_email}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(emp.company_email!, "Email")}
                          >
                            {copied === "Email" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {provider ? (
                        <Badge className={`text-[10px] ${provider.color}`}>
                          {provider.label}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">None</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {emp.email_aliases?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {emp.email_aliases.slice(0, 2).map((a) => (
                            <Badge key={a} variant="outline" className="text-[10px]">{a}</Badge>
                          ))}
                          {emp.email_aliases.length > 2 && (
                            <Badge variant="outline" className="text-[10px]">+{emp.email_aliases.length - 2}</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={emp.registration_status === "approved" ? "default" : "secondary"} className="text-[10px]">
                        {emp.registration_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openSetup(emp)}>
                        <Edit2 className="h-3 w-3 mr-1" />
                        {emp.company_email ? "Edit" : "Setup Email"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Purelymail Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Server className="h-4 w-4" />
            Purelymail Setup Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>To create a new Purelymail account for a team member:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Log into <a href="https://purelymail.com" target="_blank" className="text-primary hover:underline">purelymail.com</a></li>
            <li>Go to <strong>Manage Users</strong> &gt; <strong>Add User</strong></li>
            <li>Enter the @eduintbd.com email address and set a password</li>
            <li>Come back here and click <strong>Setup Email</strong> to save the credentials</li>
          </ol>
          <Separator className="my-3" />
          <p><strong>IMAP Settings</strong> (for email clients):</p>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div>Server: <code className="bg-muted px-1 rounded">imap.purelymail.com</code></div>
            <div>Port: <code className="bg-muted px-1 rounded">993 (SSL)</code></div>
            <div>SMTP: <code className="bg-muted px-1 rounded">smtp.purelymail.com</code></div>
            <div>Port: <code className="bg-muted px-1 rounded">465 (SSL)</code></div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Email Dialog */}
      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {selectedEmployee?.company_email ? "Edit" : "Setup"} Email — {selectedEmployee?.first_name} {selectedEmployee?.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Provider</Label>
              <Select value={emailProvider} onValueChange={setEmailProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Google Workspace (3 seats)</SelectItem>
                  <SelectItem value="purelymail">Purelymail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Company Email</Label>
              <Input
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                placeholder="name@eduintbd.com"
              />
            </div>

            {emailProvider === "purelymail" && (
              <div className="space-y-2">
                <Label>Purelymail Password</Label>
                <Input
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder="Password set in Purelymail dashboard"
                />
                <p className="text-xs text-muted-foreground">
                  This must match the password you set in the Purelymail dashboard
                </p>
              </div>
            )}

            {emailProvider === "google" && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-sm">
                <p className="font-medium text-blue-700 dark:text-blue-400">Google Workspace</p>
                <p className="text-muted-foreground mt-1">
                  This user must exist in your Google Admin Console. Create them at{" "}
                  <a href="https://admin.google.com/ac/users" target="_blank" className="text-primary hover:underline">
                    admin.google.com
                  </a>{" "}
                  if they don't already have an account.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Email Aliases (comma-separated)</Label>
              <Input
                value={emailAliases}
                onChange={(e) => setEmailAliases(e.target.value)}
                placeholder="info@eduintbd.com, hr@eduintbd.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEmail} disabled={saving || !companyEmail}>
              {saving ? "Saving..." : "Save Email Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} placeholder="Ahmed" />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={newLastName} onChange={(e) => setNewLastName(e.target.value)} placeholder="Rahman" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Personal Email (for login)</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="personal@gmail.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+880 1XXX-XXXXXX" />
            </div>
            <div className="space-y-2">
              <Label>Password (min 12 characters)</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Set login password" />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Email Provider</Label>
              <Select value={newProvider} onValueChange={setNewProvider}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="purelymail">Purelymail</SelectItem>
                  <SelectItem value="google">Google Workspace</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Company Email (@eduintbd.com)</Label>
              <Input
                value={newCompanyEmail}
                onChange={(e) => setNewCompanyEmail(e.target.value)}
                placeholder={`${newFirstName.toLowerCase() || "name"}@eduintbd.com`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserOpen(false)}>Cancel</Button>
            <Button onClick={handleAddUser} disabled={addingUser || !newFirstName || !newEmail}>
              {addingUser ? "Adding..." : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
