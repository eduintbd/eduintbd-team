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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">HR Operations</h1>
          <p className="text-gray-600 mt-2">Manage leave, attendance, and payroll operations</p>
        </div>

        <Tabs defaultValue="leave" className="space-y-4">
          <TabsList>
            <TabsTrigger value="leave">Leave Management</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
          </TabsList>

          {/* LEAVE MANAGEMENT TAB */}
          <TabsContent value="leave" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Leave Management</h2>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="mr-2 h-4 w-4" />
                Request Leave
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="bg-yellow-50 border border-yellow-100 p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-2">Pending Requests</div>
                    <div className="text-3xl font-bold text-yellow-600">{pendingLeave}</div>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
              <div className="bg-green-50 border border-green-100 p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-2">Approved This Month</div>
                    <div className="text-3xl font-bold text-green-600">{approvedLeave}</div>
                  </div>
                  <Calendar className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-2">Total Requests</div>
                    <div className="text-3xl font-bold text-blue-600">{leaveRequests?.length || 0}</div>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave Requests</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Employee</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Leave Type</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Start Date</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">End Date</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Days</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests?.map((request) => (
                      <tr key={request.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {request.employee?.first_name} {request.employee?.last_name}
                          <span className="text-xs text-gray-500 ml-2">
                            ({request.employee?.employee_code})
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{request.leave_type?.leave_name}</td>
                        <td className="px-4 py-3 text-sm">{new Date(request.start_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm">{new Date(request.end_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm">{request.days_requested}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            request.status === 'approved' ? 'bg-green-100 text-green-800' :
                            request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {request.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-teal-600 hover:bg-teal-700">Approve</Button>
                              <Button size="sm" variant="destructive">Reject</Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ATTENDANCE TAB */}
          <TabsContent value="attendance" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Attendance Tracking</h2>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Clock className="mr-2 h-4 w-4" />
                Clock In/Out
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="bg-green-50 border border-green-100 p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-2">Present Today</div>
                    <div className="text-3xl font-bold text-green-600">{present}</div>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="bg-red-50 border border-red-100 p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-2">Absent Today</div>
                    <div className="text-3xl font-bold text-red-600">{absent}</div>
                  </div>
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-2">Total Records</div>
                    <div className="text-3xl font-bold text-blue-600">{attendanceRecords?.length || 0}</div>
                  </div>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Records</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Date</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Employee</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Clock In</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Clock Out</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Total Hours</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords?.map((record) => (
                      <tr key={record.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm">{new Date(record.attendance_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {record.employee?.first_name} {record.employee?.last_name}
                          <span className="text-xs text-gray-500 ml-2">
                            ({record.employee?.employee_code})
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {record.clock_in ? new Date(record.clock_in).toLocaleTimeString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {record.clock_out ? new Date(record.clock_out).toLocaleTimeString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">{record.total_hours ? `${record.total_hours}h` : '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            record.status === 'present' ? 'bg-green-100 text-green-800' :
                            record.status === 'absent' ? 'bg-red-100 text-red-800' :
                            record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* PAYROLL TAB */}
          <TabsContent value="payroll" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Payroll Management</h2>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="mr-2 h-4 w-4" />
                New Payroll Run
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="bg-blue-50 border border-blue-100 p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-2">Total Payroll Runs</div>
                    <div className="text-3xl font-bold text-blue-600">{payrollRuns?.length || 0}</div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-green-50 border border-green-100 p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-2">Total Gross Pay</div>
                    <div className="text-3xl font-bold text-green-600">${totalGross.toLocaleString()}</div>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="bg-teal-50 border border-teal-100 p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-2">Total Net Pay</div>
                    <div className="text-3xl font-bold text-teal-600">${totalNet.toLocaleString()}</div>
                  </div>
                  <DollarSign className="h-8 w-8 text-teal-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payroll Runs</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Run Number</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Period</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Payment Date</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Gross Pay</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Deductions</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Net Pay</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollRuns?.map((run) => (
                      <tr key={run.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{run.run_number}</td>
                        <td className="px-4 py-3 text-sm">
                          {new Date(run.pay_period_start).toLocaleDateString()} - {new Date(run.pay_period_end).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm">{new Date(run.payment_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm text-green-600 font-medium">${Number(run.total_gross).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-red-600">${Number(run.total_deductions).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-teal-600 font-medium">${Number(run.total_net).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            run.status === 'posted' ? 'bg-green-100 text-green-800' :
                            run.status === 'processed' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {run.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
