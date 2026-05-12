import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Users,
  AlertCircle,
  DollarSign,
} from "lucide-react";

interface Company {
  id: string;
  name: string;
  package_id: string | null;
  monthly_fee: number | null;
  is_active: boolean;
}

interface Package {
  id: string;
  name: string;
  max_posts_per_month: number;
  max_channels: number;
}

interface UsageRecord {
  id: string;
  company_id: string;
  month: string;
  posts_used: number;
  channels_used: number;
  extra_posts: number;
  extra_charges: number;
  notes: string | null;
}

interface CompanyUsage {
  company: Company;
  pkg: Package | null;
  usage: UsageRecord | null;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function UsageTracker() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [editCompany, setEditCompany] = useState<CompanyUsage | null>(null);
  const [form, setForm] = useState({
    posts_used: 0,
    extra_posts: 0,
    extra_charges: 0,
    notes: "",
  });

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  useEffect(() => {
    fetchData();
  }, [monthStr]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: compData }, { data: pkgData }, { data: usageData }] = await Promise.all([
      supabase.from("social_media_companies").select("id, name, package_id, monthly_fee, is_active").eq("is_active", true).order("name"),
      supabase.from("social_media_packages").select("id, name, max_posts_per_month, max_channels"),
      supabase.from("social_media_usage").select("*").eq("month", monthStr),
    ]);

    setCompanies((compData as Company[]) || []);
    setPackages((pkgData as Package[]) || []);
    setUsageRecords((usageData as UsageRecord[]) || []);
    setLoading(false);
  };

  const getCompanyUsage = (): CompanyUsage[] => {
    return companies.map((company) => {
      const pkg = company.package_id
        ? packages.find((p) => p.id === company.package_id) || null
        : null;
      const usage = usageRecords.find((u) => u.company_id === company.id) || null;
      return { company, pkg, usage };
    });
  };

  const companyUsageList = getCompanyUsage();

  const summary = {
    totalClients: companyUsageList.length,
    totalPostsUsed: companyUsageList.reduce((sum, cu) => sum + (cu.usage?.posts_used || 0), 0),
    totalExtraCharges: companyUsageList.reduce((sum, cu) => sum + (cu.usage?.extra_charges || 0), 0),
    overLimit: companyUsageList.filter((cu) => {
      if (!cu.pkg) return false;
      return (cu.usage?.posts_used || 0) > cu.pkg.max_posts_per_month;
    }).length,
  };

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const openUpdate = (cu: CompanyUsage) => {
    setForm({
      posts_used: cu.usage?.posts_used || 0,
      extra_posts: cu.usage?.extra_posts || 0,
      extra_charges: cu.usage?.extra_charges || 0,
      notes: cu.usage?.notes || "",
    });
    setEditCompany(cu);
  };

  const handleSave = async () => {
    if (!editCompany) return;

    const payload: any = {
      company_id: editCompany.company.id,
      month: monthStr,
      posts_used: form.posts_used,
      extra_posts: form.extra_posts,
      extra_charges: form.extra_charges,
      notes: form.notes || null,
      channels_used: editCompany.usage?.channels_used || 0,
    };

    const { error } = await supabase
      .from("social_media_usage")
      .upsert(payload, { onConflict: "company_id,month" });

    if (error) {
      toast.error("Failed to save: " + error.message);
      return;
    }

    toast.success("Usage updated");
    setEditCompany(null);
    fetchData();
  };

  const getProgressColor = (used: number, limit: number): string => {
    if (limit === 0) return "bg-gray-400";
    const pct = (used / limit) * 100;
    if (pct > 90) return "[&>div]:bg-red-500";
    if (pct > 70) return "[&>div]:bg-yellow-500";
    return "[&>div]:bg-green-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Usage Tracker</h2>
          <p className="text-muted-foreground">Track monthly usage per client vs package limits</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium min-w-[160px] text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{summary.totalClients}</p>
              <p className="text-xs text-muted-foreground">Total Clients</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{summary.totalPostsUsed}</p>
              <p className="text-xs text-muted-foreground">Total Posts Used</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{summary.totalExtraCharges.toLocaleString()} BDT</p>
              <p className="text-xs text-muted-foreground">Total Extra Charges</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{summary.overLimit}</p>
              <p className="text-xs text-muted-foreground">Clients Over Limit</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companyUsageList.map((cu) => {
          const postsUsed = cu.usage?.posts_used || 0;
          const postsLimit = cu.pkg?.max_posts_per_month || 0;
          const channelsUsed = cu.usage?.channels_used || 0;
          const channelsLimit = cu.pkg?.max_channels || 0;
          const postsPct = postsLimit > 0 ? Math.min((postsUsed / postsLimit) * 100, 100) : 0;

          return (
            <Card key={cu.company.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{cu.company.name}</CardTitle>
                {cu.pkg ? (
                  <Badge variant="secondary" className="w-fit text-xs">{cu.pkg.name}</Badge>
                ) : (
                  <Badge variant="outline" className="w-fit text-xs text-muted-foreground">No Package</Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Posts Usage */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Posts</span>
                    <span className="font-medium">
                      {postsUsed} / {postsLimit || "--"}
                    </span>
                  </div>
                  {postsLimit > 0 && (
                    <Progress value={postsPct} className={`h-2 ${getProgressColor(postsUsed, postsLimit)}`} />
                  )}
                </div>

                {/* Channels */}
                <div className="flex justify-between text-sm">
                  <span>Channels</span>
                  <span className="font-medium">
                    {channelsUsed} / {channelsLimit || "--"}
                  </span>
                </div>

                {/* Extra Posts */}
                <div className="flex justify-between text-sm">
                  <span>Extra Posts</span>
                  <span className="font-medium">{cu.usage?.extra_posts || 0}</span>
                </div>

                {/* Extra Charges */}
                <div className="flex justify-between text-sm">
                  <span>Extra Charges</span>
                  <span className="font-medium">{(cu.usage?.extra_charges || 0).toLocaleString()} BDT</span>
                </div>

                <Separator />

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => openUpdate(cu)}
                >
                  Update Usage
                </Button>
              </CardContent>
            </Card>
          );
        })}

        {companyUsageList.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No active companies found.
          </div>
        )}
      </div>

      {/* Update Dialog */}
      <Dialog open={!!editCompany} onOpenChange={() => setEditCompany(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Usage - {editCompany?.company.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Posts Used</Label>
              <Input
                type="number"
                min={0}
                value={form.posts_used}
                onChange={(e) => setForm((p) => ({ ...p, posts_used: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Extra Posts</Label>
              <Input
                type="number"
                min={0}
                value={form.extra_posts}
                onChange={(e) => setForm((p) => ({ ...p, extra_posts: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Extra Charges (BDT)</Label>
              <Input
                type="number"
                min={0}
                value={form.extra_charges}
                onChange={(e) => setForm((p) => ({ ...p, extra_charges: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCompany(null)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
