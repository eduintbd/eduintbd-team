import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle, XCircle } from "lucide-react";

export default function Attendance() {
  const { data: attendanceRecords, isLoading } = useQuery({
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

  const today = new Date().toISOString().split('T')[0];
  const todayRecords = attendanceRecords?.filter(r => r.attendance_date === today) || [];
  const present = todayRecords.filter(r => r.status === 'present').length;
  const absent = todayRecords.filter(r => r.status === 'absent').length;

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Attendance Tracking</h1>
          <p className="text-muted-foreground">Monitor employee attendance and working hours</p>
        </div>
        <Button>
          <Clock className="mr-2 h-4 w-4" />
          Clock In/Out
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{present}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{absent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRecords?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Employee</th>
                  <th className="text-left p-2">Clock In</th>
                  <th className="text-left p-2">Clock Out</th>
                  <th className="text-left p-2">Total Hours</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords?.map((record) => (
                  <tr key={record.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">{new Date(record.attendance_date).toLocaleDateString()}</td>
                    <td className="p-2">
                      {record.employee?.first_name} {record.employee?.last_name}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({record.employee?.employee_code})
                      </span>
                    </td>
                    <td className="p-2">
                      {record.clock_in ? new Date(record.clock_in).toLocaleTimeString() : '-'}
                    </td>
                    <td className="p-2">
                      {record.clock_out ? new Date(record.clock_out).toLocaleTimeString() : '-'}
                    </td>
                    <td className="p-2">{record.total_hours ? `${record.total_hours}h` : '-'}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
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
        </CardContent>
      </Card>
    </div>
  );
}