import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, Clock } from "lucide-react";

export default function Leave() {
  const { data: leaveRequests, isLoading } = useQuery({
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

  const pending = leaveRequests?.filter(r => r.status === 'pending').length || 0;
  const approved = leaveRequests?.filter(r => r.status === 'approved').length || 0;

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Leave Management</h1>
          <p className="text-muted-foreground">Manage employee leave requests and balances</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Request Leave
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leaveRequests?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Employee</th>
                  <th className="text-left p-2">Leave Type</th>
                  <th className="text-left p-2">Start Date</th>
                  <th className="text-left p-2">End Date</th>
                  <th className="text-left p-2">Days</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests?.map((request) => (
                  <tr key={request.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      {request.employee?.first_name} {request.employee?.last_name}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({request.employee?.employee_code})
                      </span>
                    </td>
                    <td className="p-2">{request.leave_type?.leave_name}</td>
                    <td className="p-2">{new Date(request.start_date).toLocaleDateString()}</td>
                    <td className="p-2">{new Date(request.end_date).toLocaleDateString()}</td>
                    <td className="p-2">{request.days_requested}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        request.status === 'approved' ? 'bg-green-100 text-green-800' :
                        request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="p-2">
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">Approve</Button>
                          <Button size="sm" variant="outline">Reject</Button>
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
    </div>
  );
}