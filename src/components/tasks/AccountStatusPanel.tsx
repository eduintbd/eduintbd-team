import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Link } from "lucide-react";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AccountStatus {
  authEmail: string | null;
  authUserId: string | null;
  hasEmployeeRecord: boolean;
  employeeId: string | null;
  employeeName: string | null;
  registrationStatus: string | null;
  employeeStatus: string | null;
  canCreateTasks: boolean;
}

export function AccountStatusPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["account-status"],
    queryFn: async (): Promise<AccountStatus> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session?.user) {
        return {
          authEmail: null,
          authUserId: null,
          hasEmployeeRecord: false,
          employeeId: null,
          employeeName: null,
          registrationStatus: null,
          employeeStatus: null,
          canCreateTasks: false,
        };
      }

      const { data: empData } = await supabase
        .from("employees")
        .select("id, first_name, last_name, registration_status, status")
        .eq("user_id", session.user.id)
        .maybeSingle();

      // Check if user can create tasks using RPC
      let canCreate = false;
      if (empData) {
        const { data: canCreateResult } = await supabase.rpc(
          "is_active_approved_employee",
          { _user_id: session.user.id }
        );
        canCreate = canCreateResult === true;
      }

      return {
        authEmail: session.user.email || null,
        authUserId: session.user.id,
        hasEmployeeRecord: !!empData,
        employeeId: empData?.id || null,
        employeeName: empData
          ? `${empData.first_name} ${empData.last_name}`
          : null,
        registrationStatus: empData?.registration_status || null,
        employeeStatus: empData?.status || null,
        canCreateTasks: canCreate,
      };
    },
    staleTime: 30000,
  });

  const fixLinkMutation = useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Not signed in");
      }

      const response = await supabase.functions.invoke("fix-account-link");
      
      if (response.error) {
        throw new Error(response.error.message || "Failed to fix account link");
      }

      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || "Account linked successfully!");
        queryClient.invalidateQueries({ queryKey: ["account-status"] });
        queryClient.invalidateQueries({ queryKey: ["current-employee"] });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        refetch();
      } else {
        toast.error(data.error || "Failed to link account");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return null;
  }

  if (!status?.authUserId) {
    return null;
  }

  const hasIssue = !status.hasEmployeeRecord || !status.canCreateTasks;
  const statusColor = status.canCreateTasks
    ? "text-success"
    : status.hasEmployeeRecord
      ? "text-warning"
      : "text-destructive";

  const StatusIcon = status.canCreateTasks
    ? CheckCircle
    : status.hasEmployeeRecord
      ? AlertCircle
      : XCircle;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={hasIssue ? "border-warning" : ""}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusIcon className={`h-5 w-5 ${statusColor}`} />
                <CardTitle className="text-sm font-medium">
                  Account Status
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {status.canCreateTasks ? (
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    Ready
                  </Badge>
                ) : status.hasEmployeeRecord ? (
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                    Pending Approval
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                    Not Linked
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 space-y-4">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Logged in as:</span>
                <span className="font-mono text-xs">{status.authEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employee Record:</span>
                <span>
                  {status.hasEmployeeRecord ? (
                    <span className="text-success">✓ Linked</span>
                  ) : (
                    <span className="text-destructive">✗ Not Found</span>
                  )}
                </span>
              </div>
              {status.hasEmployeeRecord && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Employee Name:</span>
                    <span>{status.employeeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Registration:</span>
                    <Badge
                      variant="outline"
                      className={
                        status.registrationStatus === "approved"
                          ? "bg-success/10 text-success"
                          : "bg-warning/10 text-warning"
                      }
                    >
                      {status.registrationStatus}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge
                      variant="outline"
                      className={
                        status.employeeStatus === "active"
                          ? "bg-success/10 text-success"
                          : "bg-warning/10 text-warning"
                      }
                    >
                      {status.employeeStatus}
                    </Badge>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Can Create Tasks:</span>
                <span>
                  {status.canCreateTasks ? (
                    <span className="text-success">✓ Yes</span>
                  ) : (
                    <span className="text-destructive">✗ No</span>
                  )}
                </span>
              </div>
            </div>

            {!status.hasEmployeeRecord && (
              <div className="p-3 bg-warning/10 rounded-md text-sm">
                <p className="font-medium text-warning">Account Not Linked</p>
                <p className="text-muted-foreground mt-1">
                  Your login is not connected to an employee record. Click "Fix
                  Account Link" to automatically connect your account.
                </p>
              </div>
            )}

            {status.hasEmployeeRecord && !status.canCreateTasks && (
              <div className="p-3 bg-warning/10 rounded-md text-sm">
                <p className="font-medium text-warning">Cannot Create Tasks</p>
                <p className="text-muted-foreground mt-1">
                  Your employee record exists but is not approved/active yet.
                  Please wait for HR to approve your registration.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              {!status.hasEmployeeRecord && (
                <Button
                  size="sm"
                  onClick={() => fixLinkMutation.mutate()}
                  disabled={fixLinkMutation.isPending}
                >
                  <Link className="h-4 w-4 mr-1" />
                  {fixLinkMutation.isPending ? "Linking..." : "Fix Account Link"}
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
