import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock } from "lucide-react";

export default function RoleRequests() {
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState<{ [key: string]: string }>({});

  const { data: requests, isLoading } = useQuery({
    queryKey: ["role-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_upgrade_requests")
        .select(`
          *,
          employee:employees(
            first_name,
            last_name,
            email,
            employee_code,
            user_id
          )
        `)
        .order("requested_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const request = requests?.find(r => r.id === requestId);
      if (!request) return;

      // Get current user's employee record
      const { data: { user } } = await supabase.auth.getUser();
      const { data: reviewer } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      // Update the request status
      const { error: updateError } = await supabase
        .from("role_upgrade_requests")
        .update({
          status: "approved",
          reviewed_by: reviewer?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // Delete existing roles
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", (request.employee as any).user_id);

      if (deleteError) throw deleteError;

      // Insert new role
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({
          user_id: (request.employee as any).user_id,
          role: request.requested_role,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-requests"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Request approved successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to approve request");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      // Get current user's employee record
      const { data: { user } } = await supabase.auth.getUser();
      const { data: reviewer } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      const { error } = await supabase
        .from("role_upgrade_requests")
        .update({
          status: "rejected",
          reviewed_by: reviewer?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-requests"] });
      toast.success("Request rejected");
      setRejectionReason({});
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reject request");
    },
  });

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  const pendingRequests = requests?.filter(r => r.status === "pending") || [];
  const reviewedRequests = requests?.filter(r => r.status !== "pending") || [];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Role Access Requests</h1>
        <p className="text-muted-foreground">Review and approve employee access requests</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Requests ({pendingRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No pending requests</p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">
                            {(request.employee as any)?.first_name} {(request.employee as any)?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {(request.employee as any)?.email} • ID: {(request.employee as any)?.employee_code}
                          </p>
                        </div>
                        <Badge>
                          {request.requested_role === "hr_manager" ? "Manager" : "Accountant/CFO"}
                        </Badge>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold">Reason:</Label>
                        <p className="text-sm mt-1">{request.reason}</p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(request.id)}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <div className="flex-1 flex gap-2">
                          <Textarea
                            placeholder="Rejection reason..."
                            value={rejectionReason[request.id] || ""}
                            onChange={(e) =>
                              setRejectionReason({ ...rejectionReason, [request.id]: e.target.value })
                            }
                            rows={1}
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              rejectMutation.mutate({
                                requestId: request.id,
                                reason: rejectionReason[request.id] || "No reason provided",
                              })
                            }
                            disabled={rejectMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reviewed Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {reviewedRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No reviewed requests</p>
          ) : (
            <div className="space-y-2">
              {reviewedRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex justify-between items-center p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-semibold">
                      {(request.employee as any)?.first_name} {(request.employee as any)?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {request.requested_role === "hr_manager" ? "Manager" : "Accountant/CFO"} Access
                    </p>
                  </div>
                  <Badge variant={request.status === "approved" ? "default" : "destructive"}>
                    {request.status === "approved" ? "Approved" : "Rejected"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
