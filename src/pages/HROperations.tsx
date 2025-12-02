import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Clock, CheckCircle, XCircle, DollarSign, TrendingUp } from "lucide-react";

export default function HROperations() {
  const [searchTerm, setSearchTerm] = useState("");

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

  // Calculated stats
  const pendingLeave = leaveRequests?.filter(r => r.status === 'pending').length || 0;
  const approvedLeave = leaveRequests?.filter(r => r.status === 'approved').length || 0;

  const today = new Date().toISOString().split('T')[0];
  const todayRecords = attendanceRecords?.filter(r => r.attendance_date === today) || [];
  const present = todayRecords.filter(r => r.status === 'present').length;
  const absent = todayRecords.filter(r => r.status === 'absent').length;

  const totalGross = payrollRuns?.reduce((sum, run) => sum + Number(run.total_gross || 0), 0) || 0;
  const totalNet = payrollRuns?.reduce((sum, run) => sum + Number(run.total_net || 0), 0) || 0;

  if (leaveLoading || attendanceLoading || payrollLoading) {
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
          <TabsTrigger value="payroll" className="flex-1 sm:flex-none text-xs sm:text-sm">Payroll</TabsTrigger>
        </TabsList>

          {/* LEAVE MANAGEMENT TAB */}
          <TabsContent value="leave" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <h2 className="text-lg md:text-xl font-semibold text-foreground">Leave Management</h2>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Request Leave
              </Button>
            </div>

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
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <h2 className="text-lg md:text-xl font-semibold text-foreground">Attendance Tracking</h2>
              <Button className="w-full sm:w-auto">
                <Clock className="mr-2 h-4 w-4" />
                Clock In/Out
              </Button>
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
                      <div className="text-xs md:text-sm font-medium text-muted-foreground mb-1">Records</div>
                      <div className="text-2xl md:text-3xl font-bold text-primary">{attendanceRecords?.length || 0}</div>
                    </div>
                    <Clock className="h-6 w-6 md:h-8 md:w-8 text-primary hidden sm:block" />
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
                        <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords?.map((record) => (
                        <tr key={record.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 text-sm">{new Date(record.attendance_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm font-medium">{record.employee?.first_name} {record.employee?.last_name}</td>
                          <td className="px-4 py-3 text-sm">{record.clock_in ? new Date(record.clock_in).toLocaleTimeString() : '-'}</td>
                          <td className="px-4 py-3 text-sm">{record.clock_out ? new Date(record.clock_out).toLocaleTimeString() : '-'}</td>
                          <td className="px-4 py-3 text-sm">{record.total_hours ? `${record.total_hours}h` : '-'}</td>
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
                      ))}
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
