import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Building2 } from "lucide-react";

export default function Departments() {
  const { data: departments, isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("department_code");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: positions } = useQuery({
    queryKey: ["positions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("positions")
        .select(`
          *,
          department:departments(department_name)
        `)
        .order("position_code");
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Departments & Positions</h1>
          <p className="text-muted-foreground">Manage organizational structure</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Position
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Departments</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positions?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Code</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {departments?.map((dept) => (
                  <tr key={dept.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">{dept.department_code}</td>
                    <td className="p-2">{dept.department_name}</td>
                    <td className="p-2">{dept.description || '-'}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        dept.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {dept.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Code</th>
                  <th className="text-left p-2">Title</th>
                  <th className="text-left p-2">Department</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {positions?.map((pos) => (
                  <tr key={pos.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">{pos.position_code}</td>
                    <td className="p-2">{pos.position_title}</td>
                    <td className="p-2">{pos.department?.department_name || '-'}</td>
                    <td className="p-2">{pos.description || '-'}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        pos.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {pos.is_active ? 'Active' : 'Inactive'}
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