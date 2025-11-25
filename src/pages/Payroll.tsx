import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, DollarSign, TrendingUp } from "lucide-react";

export default function Payroll() {
  const { data: payrollRuns, isLoading } = useQuery({
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

  const totalGross = payrollRuns?.reduce((sum, run) => sum + Number(run.total_gross || 0), 0) || 0;
  const totalNet = payrollRuns?.reduce((sum, run) => sum + Number(run.total_net || 0), 0) || 0;

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payroll Management</h1>
          <p className="text-muted-foreground">Process and manage employee payroll</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Payroll Run
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payroll Runs</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payrollRuns?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gross Pay</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalGross.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Net Pay</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalNet.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Run Number</th>
                  <th className="text-left p-2">Period</th>
                  <th className="text-left p-2">Payment Date</th>
                  <th className="text-left p-2">Gross Pay</th>
                  <th className="text-left p-2">Deductions</th>
                  <th className="text-left p-2">Net Pay</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {payrollRuns?.map((run) => (
                  <tr key={run.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">{run.run_number}</td>
                    <td className="p-2">
                      {new Date(run.pay_period_start).toLocaleDateString()} - {new Date(run.pay_period_end).toLocaleDateString()}
                    </td>
                    <td className="p-2">{new Date(run.payment_date).toLocaleDateString()}</td>
                    <td className="p-2">${Number(run.total_gross).toLocaleString()}</td>
                    <td className="p-2">${Number(run.total_deductions).toLocaleString()}</td>
                    <td className="p-2">${Number(run.total_net).toLocaleString()}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
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
        </CardContent>
      </Card>
    </div>
  );
}