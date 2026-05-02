import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Calendar, Clock, CheckCircle, XCircle, DollarSign, TrendingUp, LogIn, LogOut, MapPin, Car, Upload, FileText, Timer } from "lucide-react";
import { RequestLeaveDialog } from "@/components/RequestLeaveDialog";
import { AttendanceLocationDialog } from "@/components/AttendanceLocationDialog";
import { format } from "date-fns";

const transportModeLabels: Record<string, string> = {
  rickshaw: "Rickshaw",
  bus: "Bus",
  cng: "CNG",
  uber: "Uber",
  taxi: "Taxi",
  own_vehicle: "Own Vehicle",
  other: "Other",
};

export default function HROperations() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [clockInDialogOpen, setClockInDialogOpen] = useState(false);
  const [clockOutDialogOpen, setClockOutDialogOpen] = useState(false);
  const [conveyanceDialogOpen, setConveyanceDialogOpen] = useState(false);
  const [conveyanceForm, setConveyanceForm] = useState({
    bill_date: format(new Date(), "yyyy-MM-dd"),
    from_location: "",
    to_location: "",
    distance_km: "",
    transport_mode: "bus",
    amount: "",
    purpose: "",
    notes: "",
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Leave queries
  const { data: leaveRequests, isLoading: leaveLoading } = useQuery({
    queryKey: ["leave-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select(`
          *,
          employee:employees(first_name, last_name, employee_code),
          leave_type:leave_types(leave_name)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Attendance queries
  const { data: attendanceRecords, isLoading: attendanceLoading } = useQuery({
    queryKey: ["attendance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select(`
          *,
          employee:employees(first_name, last_name, employee_code)
        `)
        .order("attendance_date", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
  });

  // Query for current user's attendance today
  const { data: myTodayAttendance } = useQuery({
    queryKey: ["my-attendance-today"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!employee) return null;

      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("attendance_date", today)
        .maybeSingle();

      return data;
    },
  });

  // Payroll queries
  const { data: payrollRuns, isLoading: payrollLoading } = useQuery({
    queryKey: ["payroll-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_runs")
        .select("*")
        .order("pay_period_end", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Conveyance bills query
  const { data: conveyanceBills, isLoading: conveyanceLoading } = useQuery({
    queryKey: ["conveyance-bills"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conveyance_bills")
        .select(`*, employee:employees(first_name, last_name, employee_code)`)
        .order("bill_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Current user info
  const { data: currentUserInfo } = useQuery({
    queryKey: ["current-user-info"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      return {
        userId: user.id,
        employeeId: employee?.id || null,
        roles: roles?.map(r => r.role) || [],
      };
    },
  });

  const isManagerOrAdmin = currentUserInfo?.roles.some(r => ["admin", "manager"].includes(r)) || false;

  // Calculated stats
  const pendingLeave = leaveRequests?.filter(r => r.status === 'pending').length || 0;
  const approvedLeave = leaveRequests?.filter(r => r.status === 'approved').length || 0;

  const today = new Date().toISOString().split('T')[0];
  const todayRecords = attendanceRecords?.filter(r => r.attendance_date === today) || [];
  const present = todayRecords.filter(r => r.status === 'present').length;
  const absent = todayRecords.filter(r => r.status === 'absent').length;

  // Weekly hours calculation
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekStartStr = weekStart.toISOString().split("T")[0];
  const weeklyRecords = attendanceRecords?.filter(r => r.attendance_date >= weekStartStr) || [];
  const weeklyHours = weeklyRecords.reduce((sum, r) => sum + Number(r.total_hours || 0), 0);
  const todayHours = myTodayAttendance?.total_hours ? Number(myTodayAttendance.total_hours) : 0;
  const todayOvertime = todayHours > 8 ? todayHours - 8 : 0;

  // Conveyance stats
  const pendingConveyance = conveyanceBills?.filter(b => b.status === "pending").length || 0;
  const approvedConveyance = conveyanceBills?.filter(b => b.status === "approved").length || 0;
  const totalConveyanceAmount = conveyanceBills?.filter(b => b.status === "approved").reduce((s, b) => s + Number(b.amount), 0) || 0;

  const totalGross = payrollRuns?.reduce((sum, run) => sum + Number(run.total_gross || 0), 0) || 0;
  const totalNet = payrollRuns?.reduce((sum, run) => sum + Number(run.total_net || 0), 0) || 0;

  // Conveyance bill submission
  const handleConveyanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserInfo?.employeeId) {
      toast.error("Employee record not found");
      return;
    }
    setSubmitting(true);

    let receiptUrl = null;
    let receiptFileName = null;

    if (receiptFile) {
      const fileExt = receiptFile.name.split(".").pop();
      const filePath = `${currentUserInfo.employeeId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("conveyance-receipts")
        .upload(filePath, receiptFile);
      if (uploadError) {
        toast.error("Failed to upload receipt: " + uploadError.message);
        setSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("conveyance-receipts").getPublicUrl(filePath);
      receiptUrl = urlData.publicUrl;
      receiptFileName = receiptFile.name;
    }

    const { error } = await supabase.from("conveyance_bills").insert([{
      employee_id: currentUserInfo.employeeId,
      bill_date: conveyanceForm.bill_date,
      from_location: conveyanceForm.from_location,
      to_location: conveyanceForm.to_location,
      distance_km: conveyanceForm.distance_km ? parseFloat(conveyanceForm.distance_km) : null,
      transport_mode: conveyanceForm.transport_mode,
      amount: parseFloat(conveyanceForm.amount),
      purpose: conveyanceForm.purpose || null,
      receipt_url: receiptUrl,
      receipt_file_name: receiptFileName,
      notes: conveyanceForm.notes || null,
    }]);

    if (error) toast.error("Error submitting bill: " + error.message);
    else {
      toast.success("Conveyance bill submitted");
      setConveyanceDialogOpen(false);
      setConveyanceForm({ bill_date: format(new Date(), "yyyy-MM-dd"), from_location: "", to_location: "", distance_km: "", transport_mode: "bus", amount: "", purpose: "", notes: "" });
      setReceiptFile(null);
      queryClient.invalidateQueries({ queryKey: ["conveyance-bills"] });
    }
    setSubmitting(false);
  };

  const handleConveyanceAction = async (billId: string, action: "approved" | "rejected", reason?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const updateData: any = { status: action, approved_by: user?.id, approved_at: new Date().toISOString() };
    if (action === "rejected" && reason) updateData.rejection_reason = reason;

    const { error } = await supabase.from("conveyance_bills").update(updateData).eq("id", billId);
    if (error) toast.error("Error updating bill");
    else {
      toast.success(`Bill ${action}`);
      queryClient.invalidateQueries({ queryKey: ["conveyance-bills"] });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT" }).format(amount || 0);
  };

  if (leaveLoading || attendanceLoading || payrollLoading || conveyanceLoading) {
    return <div className="min-h-screen bg-gray-50 p-8">Loading...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">HR Operations</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">Manage leave, attendance, and payroll operations</p>
      </div>

      <Tabs defaultValue="leave" className="space-y-4">
        <TabsList className="w-full overflow-x-auto flex sm:inline-flex">
          <TabsTrigger value="leave" className="flex-1 sm:flex-none text-xs sm:text-sm">Leave</TabsTrigger>
          <TabsTrigger value="attendance" className="flex-1 sm:flex-none text-xs sm:text-sm">Attendance</TabsTrigger>
          <TabsTrigger value="conveyance" className="flex-1 sm:flex-none text-xs sm:text-sm">Conveyance</TabsTrigger>
          <TabsTrigger value="payroll" className="flex-1 sm:flex-none text-xs sm:text-sm">Payroll</TabsTrigger>
        </TabsList>

          {/* LEAVE MANAGEMENT TAB */}
          <TabsContent value="leave" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <h2 className="text-lg md:text-xl font-semibold text-foreground">Leave Management</h2>
              <Button className="w-full sm:w-auto" onClick={() => setLeaveDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Request Leave
              </Button>
            </div>
            
            <RequestLeaveDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen} />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <Card className="border-l-4 border-l-warning">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs md:text-sm font-medium text-muted-foreground mb-1">Pending</div>
                      <div className="text-2xl md:text-3xl font-bold text-warning">{pendingLeave}</div>
                    </div>
                    <Clock className="h-6 w-6 md:h-8 md:w-8 text-warning hidden sm:block" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-success">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs md:text-sm font-medium text-muted-foreground mb-1">Approved</div>
                      <div className="text-2xl md:text-3xl font-bold text-success">{approvedLeave}</div>
                    </div>
                    <Calendar className="h-6 w-6 md:h-8 md:w-8 text-success hidden sm:block" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs md:text-sm font-medium text-muted-foreground mb-1">Total</div>
                      <div className="text-2xl md:text-3xl font-bold text-primary">{leaveRequests?.length || 0}</div>
                    </div>
                    <Calendar className="h-6 w-6 md:h-8 md:w-8 text-primary hidden sm:block" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base md:text-lg">Leave Requests</CardTitle>
              </CardHeader>
              <CardContent className="p-0 md:p-6 md:pt-0">
                {/* Mobile Card View */}
                <div className="md:hidden space-y-3 p-4">
                  {leaveRequests?.map((request) => (
                    <Card key={request.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm">{request.employee?.first_name} {request.employee?.last_name}</p>
                          <p className="text-xs text-muted-foreground">{request.leave_type?.leave_name}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          request.status === 'approved' ? 'bg-success/10 text-success' :
                          request.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                          request.status === 'pending' ? 'bg-warning/10 text-warning' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mb-3">
                        {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()} ({request.days_requested} days)
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1 text-xs">Approve</Button>
                          <Button size="sm" variant="destructive" className="flex-1 text-xs">Reject</Button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted border-b">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Employee</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Leave Type</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Start</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">End</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Days</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Status</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRequests?.map((request) => (
                        <tr key={request.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium">
                            {request.employee?.first_name} {request.employee?.last_name}
                          </td>
                          <td className="px-4 py-3 text-sm">{request.leave_type?.leave_name}</td>
                          <td className="px-4 py-3 text-sm">{new Date(request.start_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm">{new Date(request.end_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm">{request.days_requested}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              request.status === 'approved' ? 'bg-success/10 text-success' :
                              request.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                              request.status === 'pending' ? 'bg-warning/10 text-warning' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {request.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {request.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button size="sm">Approve</Button>
                                <Button size="sm" variant="destructive">Reject</Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ATTENDANCE TAB */}
          <TabsContent value="attendance" className="space-y-4">
            {/* Clock In/Out Status Card */}
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Today's Attendance</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {myTodayAttendance?.clock_in
                        ? `Clocked in at ${new Date(myTodayAttendance.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : "You haven't clocked in yet"}
                      {myTodayAttendance?.clock_out &&
                        ` • Clocked out at ${new Date(myTodayAttendance.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                    {todayHours > 0 && (
                      <p className="text-sm font-medium mt-1 flex items-center gap-2">
                        <Timer className="h-3 w-3" />
                        {todayHours.toFixed(1)}h worked
                        {todayOvertime > 0 && <Badge variant="outline" className="text-xs text-orange-600">+{todayOvertime.toFixed(1)}h overtime</Badge>}
                      </p>
                    )}
                    {myTodayAttendance?.clock_in_address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {myTodayAttendance.clock_in_address.split(',').slice(0, 2).join(',')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button 
                      onClick={() => setClockInDialogOpen(true)}
                      disabled={!!myTodayAttendance?.clock_in}
                      className="flex-1 sm:flex-none"
                      variant={myTodayAttendance?.clock_in ? "outline" : "default"}
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      Clock In
                    </Button>
                    <Button 
                      onClick={() => setClockOutDialogOpen(true)}
                      disabled={!myTodayAttendance?.clock_in || !!myTodayAttendance?.clock_out}
                      className="flex-1 sm:flex-none"
                      variant={myTodayAttendance?.clock_out ? "outline" : "default"}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Clock Out
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <AttendanceLocationDialog 
              open={clockInDialogOpen} 
              onOpenChange={setClockInDialogOpen} 
              type="in" 
            />
            <AttendanceLocationDialog 
              open={clockOutDialogOpen} 
              onOpenChange={setClockOutDialogOpen} 
              type="out" 
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <h2 className="text-lg md:text-xl font-semibold text-foreground">Attendance Tracking</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <Card className="border-l-4 border-l-success">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs md:text-sm font-medium text-muted-foreground mb-1">Present</div>
                      <div className="text-2xl md:text-3xl font-bold text-success">{present}</div>
                    </div>
                    <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-success hidden sm:block" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-destructive">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs md:text-sm font-medium text-muted-foreground mb-1">Absent</div>
                      <div className="text-2xl md:text-3xl font-bold text-destructive">{absent}</div>
                    </div>
                    <XCircle className="h-6 w-6 md:h-8 md:w-8 text-destructive hidden sm:block" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs md:text-sm font-medium text-muted-foreground mb-1">Weekly Hours</div>
                      <div className="text-2xl md:text-3xl font-bold text-primary">{weeklyHours.toFixed(1)}h</div>
                    </div>
                    <Timer className="h-6 w-6 md:h-8 md:w-8 text-primary hidden sm:block" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base md:text-lg">Attendance Records</CardTitle>
              </CardHeader>
              <CardContent className="p-0 md:p-6 md:pt-0">
                {/* Mobile Card View */}
                <div className="md:hidden space-y-3 p-4">
                  {attendanceRecords?.map((record) => (
                    <Card key={record.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm">{record.employee?.first_name} {record.employee?.last_name}</p>
                          <p className="text-xs text-muted-foreground">{new Date(record.attendance_date).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          record.status === 'present' ? 'bg-success/10 text-success' :
                          record.status === 'absent' ? 'bg-destructive/10 text-destructive' :
                          record.status === 'late' ? 'bg-warning/10 text-warning' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {record.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div><span className="block font-medium">In</span>{record.clock_in ? new Date(record.clock_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</div>
                        <div><span className="block font-medium">Out</span>{record.clock_out ? new Date(record.clock_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</div>
                        <div><span className="block font-medium">Hours</span>{record.total_hours ? `${record.total_hours}h` : '-'}</div>
                      </div>
                    </Card>
                  ))}
                </div>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted border-b">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Date</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Employee</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Clock In</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Clock Out</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Hours</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Overtime</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords?.map((record) => {
                        const hours = Number(record.total_hours || 0);
                        const ot = hours > 8 ? hours - 8 : 0;
                        return (
                        <tr key={record.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 text-sm">{new Date(record.attendance_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm font-medium">{record.employee?.first_name} {record.employee?.last_name}</td>
                          <td className="px-4 py-3 text-sm">{record.clock_in ? new Date(record.clock_in).toLocaleTimeString() : '-'}</td>
                          <td className="px-4 py-3 text-sm">{record.clock_out ? new Date(record.clock_out).toLocaleTimeString() : '-'}</td>
                          <td className="px-4 py-3 text-sm">{record.total_hours ? `${Number(record.total_hours).toFixed(1)}h` : '-'}</td>
                          <td className="px-4 py-3 text-sm">{ot > 0 ? <Badge variant="outline" className="text-xs text-orange-600">+{ot.toFixed(1)}h</Badge> : '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              record.status === 'present' ? 'bg-success/10 text-success' :
                              record.status === 'absent' ? 'bg-destructive/10 text-destructive' :
                              record.status === 'late' ? 'bg-warning/10 text-warning' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CONVEYANCE TAB */}
          <TabsContent value="conveyance" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <h2 className="text-lg md:text-xl font-semibold text-foreground">Conveyance Bills</h2>
              <Button className="w-full sm:w-auto" onClick={() => setConveyanceDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Submit Bill
              </Button>
            </div>

            {/* Submit Bill Dialog */}
            <Dialog open={conveyanceDialogOpen} onOpenChange={setConveyanceDialogOpen}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Submit Conveyance Bill</DialogTitle>
                  <DialogDescription>Submit a travel expense claim with receipt</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleConveyanceSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date *</Label>
                      <Input type="date" value={conveyanceForm.bill_date} onChange={e => setConveyanceForm({...conveyanceForm, bill_date: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Transport Mode *</Label>
                      <Select value={conveyanceForm.transport_mode} onValueChange={v => setConveyanceForm({...conveyanceForm, transport_mode: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(transportModeLabels).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>From *</Label>
                      <Input value={conveyanceForm.from_location} onChange={e => setConveyanceForm({...conveyanceForm, from_location: e.target.value})} placeholder="Starting point" required />
                    </div>
                    <div className="space-y-2">
                      <Label>To *</Label>
                      <Input value={conveyanceForm.to_location} onChange={e => setConveyanceForm({...conveyanceForm, to_location: e.target.value})} placeholder="Destination" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Distance (km)</Label>
                      <Input type="number" step="0.1" min="0" value={conveyanceForm.distance_km} onChange={e => setConveyanceForm({...conveyanceForm, distance_km: e.target.value})} placeholder="Optional" />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount (BDT) *</Label>
                      <Input type="number" step="0.01" min="1" value={conveyanceForm.amount} onChange={e => setConveyanceForm({...conveyanceForm, amount: e.target.value})} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Purpose</Label>
                    <Input value={conveyanceForm.purpose} onChange={e => setConveyanceForm({...conveyanceForm, purpose: e.target.value})} placeholder="e.g., Client meeting, Office commute" />
                  </div>
                  <div className="space-y-2">
                    <Label>Receipt / Bill Upload</Label>
                    <div className="flex items-center gap-2">
                      <Input type="file" accept="image/*,.pdf" onChange={e => setReceiptFile(e.target.files?.[0] || null)} className="flex-1" />
                      {receiptFile && <Badge variant="outline" className="text-xs"><FileText className="h-3 w-3 mr-1" />{receiptFile.name}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">Upload photo or PDF of the receipt</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={conveyanceForm.notes} onChange={e => setConveyanceForm({...conveyanceForm, notes: e.target.value})} placeholder="Additional details..." />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Conveyance Bill"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <Card className="border-l-4 border-l-warning">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs md:text-sm font-medium text-muted-foreground mb-1">Pending</div>
                      <div className="text-2xl md:text-3xl font-bold text-warning">{pendingConveyance}</div>
                    </div>
                    <Clock className="h-6 w-6 md:h-8 md:w-8 text-warning hidden sm:block" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-success">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs md:text-sm font-medium text-muted-foreground mb-1">Approved</div>
                      <div className="text-2xl md:text-3xl font-bold text-success">{approvedConveyance}</div>
                    </div>
                    <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-success hidden sm:block" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs md:text-sm font-medium text-muted-foreground mb-1">Total Approved</div>
                      <div className="text-2xl md:text-3xl font-bold text-primary">{formatCurrency(totalConveyanceAmount)}</div>
                    </div>
                    <Car className="h-6 w-6 md:h-8 md:w-8 text-primary hidden sm:block" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bills Table */}
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base md:text-lg">Conveyance Bill Records</CardTitle>
              </CardHeader>
              <CardContent className="p-0 md:p-6 md:pt-0">
                {/* Mobile Card View */}
                <div className="md:hidden space-y-3 p-4">
                  {conveyanceBills?.map((bill) => (
                    <Card key={bill.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm">{bill.employee?.first_name} {bill.employee?.last_name}</p>
                          <p className="text-xs text-muted-foreground">{new Date(bill.bill_date).toLocaleDateString()}</p>
                        </div>
                        <Badge variant={bill.status === "approved" ? "default" : bill.status === "rejected" ? "destructive" : "secondary"}>
                          {bill.status}
                        </Badge>
                      </div>
                      <p className="text-sm mb-1">{bill.from_location} → {bill.to_location}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Badge variant="outline">{transportModeLabels[bill.transport_mode] || bill.transport_mode}</Badge>
                        <span className="font-semibold text-foreground">{formatCurrency(bill.amount)}</span>
                      </div>
                      {bill.status === "pending" && isManagerOrAdmin && (
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" className="flex-1 text-xs" onClick={() => handleConveyanceAction(bill.id, "approved")}>Approve</Button>
                          <Button size="sm" variant="destructive" className="flex-1 text-xs" onClick={() => handleConveyanceAction(bill.id, "rejected")}>Reject</Button>
                        </div>
                      )}
                    </Card>
                  ))}
                  {(!conveyanceBills || conveyanceBills.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">No conveyance bills submitted</p>
                  )}
                </div>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted border-b">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Date</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Employee</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Route</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Mode</th>
                        <th className="text-right px-4 py-3 text-sm font-semibold text-foreground">Amount</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Receipt</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Status</th>
                        {isManagerOrAdmin && <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {conveyanceBills?.map((bill) => (
                        <tr key={bill.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 text-sm">{new Date(bill.bill_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm font-medium">{bill.employee?.first_name} {bill.employee?.last_name}</td>
                          <td className="px-4 py-3 text-sm">{bill.from_location} → {bill.to_location}</td>
                          <td className="px-4 py-3 text-sm"><Badge variant="outline">{transportModeLabels[bill.transport_mode] || bill.transport_mode}</Badge></td>
                          <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(bill.amount)}</td>
                          <td className="px-4 py-3 text-sm">
                            {bill.receipt_url ? (
                              <a href={bill.receipt_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                <Upload className="h-3 w-3" />{bill.receipt_file_name || "View"}
                              </a>
                            ) : <span className="text-muted-foreground">-</span>}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Badge variant={bill.status === "approved" ? "default" : bill.status === "rejected" ? "destructive" : "secondary"}>
                              {bill.status}
                            </Badge>
                          </td>
                          {isManagerOrAdmin && (
                            <td className="px-4 py-3 text-sm">
                              {bill.status === "pending" && (
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => handleConveyanceAction(bill.id, "approved")}>Approve</Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleConveyanceAction(bill.id, "rejected")}>Reject</Button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                      {(!conveyanceBills || conveyanceBills.length === 0) && (
                        <tr><td colSpan={isManagerOrAdmin ? 8 : 7} className="text-center text-muted-foreground py-8">No conveyance bills submitted</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PAYROLL TAB */}
          <TabsContent value="payroll" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <h2 className="text-lg md:text-xl font-semibold text-foreground">Payroll Management</h2>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                New Payroll Run
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs md:text-sm font-medium text-muted-foreground mb-1">Payroll Runs</div>
                      <div className="text-2xl md:text-3xl font-bold text-primary">{payrollRuns?.length || 0}</div>
                    </div>
                    <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-primary hidden sm:block" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-success">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs md:text-sm font-medium text-muted-foreground mb-1">Gross Pay</div>
                      <div className="text-2xl md:text-3xl font-bold text-success">${totalGross.toLocaleString()}</div>
                    </div>
                    <DollarSign className="h-6 w-6 md:h-8 md:w-8 text-success hidden sm:block" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-accent">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs md:text-sm font-medium text-muted-foreground mb-1">Net Pay</div>
                      <div className="text-2xl md:text-3xl font-bold text-accent">${totalNet.toLocaleString()}</div>
                    </div>
                    <DollarSign className="h-6 w-6 md:h-8 md:w-8 text-accent hidden sm:block" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base md:text-lg">Payroll Runs</CardTitle>
              </CardHeader>
              <CardContent className="p-0 md:p-6 md:pt-0">
                {/* Mobile Card View */}
                <div className="md:hidden space-y-3 p-4">
                  {payrollRuns?.map((run) => (
                    <Card key={run.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-sm">{run.run_number}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          run.status === 'posted' ? 'bg-success/10 text-success' :
                          run.status === 'processed' ? 'bg-primary/10 text-primary' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {run.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {new Date(run.pay_period_start).toLocaleDateString()} - {new Date(run.pay_period_end).toLocaleDateString()}
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><span className="block font-medium text-muted-foreground">Gross</span><span className="text-success font-medium">${Number(run.total_gross).toLocaleString()}</span></div>
                        <div><span className="block font-medium text-muted-foreground">Deduct</span><span className="text-destructive">${Number(run.total_deductions).toLocaleString()}</span></div>
                        <div><span className="block font-medium text-muted-foreground">Net</span><span className="text-accent font-medium">${Number(run.total_net).toLocaleString()}</span></div>
                      </div>
                    </Card>
                  ))}
                </div>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted border-b">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Run Number</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Period</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Payment Date</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Gross Pay</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Deductions</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Net Pay</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollRuns?.map((run) => (
                        <tr key={run.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium">{run.run_number}</td>
                          <td className="px-4 py-3 text-sm">
                            {new Date(run.pay_period_start).toLocaleDateString()} - {new Date(run.pay_period_end).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm">{new Date(run.payment_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm text-success font-medium">${Number(run.total_gross).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-destructive">${Number(run.total_deductions).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-accent font-medium">${Number(run.total_net).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              run.status === 'posted' ? 'bg-success/10 text-success' :
                              run.status === 'processed' ? 'bg-primary/10 text-primary' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {run.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
}
