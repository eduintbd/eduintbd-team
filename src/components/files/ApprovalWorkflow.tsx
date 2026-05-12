import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface Approval {
  id: string;
  file_id: string;
  requested_by: string;
  approved_by: string | null;
  status: string;
  action_type: string;
  notes: string | null;
  created_at: string;
  resolved_at: string | null;
  file: { name: string } | null;
}

interface ApprovalWorkflowProps {
  userRoles: string[];
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ApprovalWorkflow = ({ userRoles }: ApprovalWorkflowProps) => {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const isManager = userRoles.includes("admin") || userRoles.includes("manager");

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("file_approvals")
      .select("*, file:file_items(name)")
      .order("created_at", { ascending: false });
    if (!error && data) setApprovals(data as any);
    setLoading(false);
  };

  const handleReview = (approval: Approval) => {
    setSelectedApproval(approval);
    setReviewNotes("");
    setReviewDialogOpen(true);
  };

  const submitReview = async (decision: "approved" | "rejected") => {
    if (!selectedApproval) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("file_approvals")
      .update({
        status: decision,
        approved_by: user.id,
        notes: reviewNotes || null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", selectedApproval.id);

    if (error) {
      toast.error("Failed to submit review");
    } else {
      toast.success(`Request ${decision}`);
      setReviewDialogOpen(false);
      fetchApprovals();
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading approvals...</div>;
  }

  if (approvals.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>No approval requests</p>
        <p className="text-sm">Document approval requests will appear here</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Requested</TableHead>
            <TableHead>Notes</TableHead>
            {isManager && <TableHead className="text-right">Review</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {approvals.map((approval) => {
            const config = statusConfig[approval.status] || statusConfig.pending;
            return (
              <TableRow key={approval.id}>
                <TableCell className="font-medium">{approval.file?.name || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs capitalize">{approval.action_type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={config.variant}>{config.label}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{formatDate(approval.created_at)}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                  {approval.notes || "—"}
                </TableCell>
                {isManager && (
                  <TableCell className="text-right">
                    {approval.status === "pending" && (
                      <Button variant="outline" size="sm" onClick={() => handleReview(approval)}>
                        Review
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Review Approval Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm">
              <strong>{selectedApproval?.file?.name}</strong> — {selectedApproval?.action_type} request
            </p>
            <div className="space-y-2">
              <Label>Review Notes (optional)</Label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add notes about your decision..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => submitReview("rejected")}>
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button onClick={() => submitReview("approved")}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApprovalWorkflow;
