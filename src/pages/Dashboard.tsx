import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Package, FileText } from "lucide-react";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    journalEntries: 0,
    assets: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [trialBalance, journalCount, assetCount] = await Promise.all([
        supabase.from("trial_balance").select("*"),
        supabase.from("journal_entries").select("id", { count: "exact" }),
        supabase.from("assets").select("id", { count: "exact" }),
      ]);

      let totalAssets = 0;
      let totalLiabilities = 0;
      let totalEquity = 0;

      if (trialBalance.data) {
        trialBalance.data.forEach((row) => {
          const balance = Number(row.balance) || 0;
          if (row.account_type === "asset") totalAssets += balance;
          if (row.account_type === "liability") totalLiabilities += Math.abs(balance);
          if (row.account_type === "equity") totalEquity += Math.abs(balance);
        });
      }

      setStats({
        totalAssets,
        totalLiabilities,
        totalEquity,
        journalEntries: journalCount.count || 0,
        assets: assetCount.count || 0,
      });
    };

    fetchStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Overview of your accounting system</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(stats.totalAssets)}</div>
            <p className="text-xs text-muted-foreground mt-1">From trial balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
            <TrendingUp className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(stats.totalLiabilities)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">From trial balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Equity</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(stats.totalEquity)}</div>
            <p className="text-xs text-muted-foreground mt-1">From trial balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Journal Entries</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.journalEntries}</div>
            <p className="text-xs text-muted-foreground mt-1">Total entries</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fixed Assets</CardTitle>
            <CardDescription>Registered assets in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Package className="h-8 w-8 text-muted-foreground" />
              <div>
                <div className="text-3xl font-bold">{stats.assets}</div>
                <p className="text-sm text-muted-foreground">Total assets registered</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Common accounting tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a href="/journal" className="block text-primary hover:underline">
              → Create new journal entry
            </a>
            <a href="/assets" className="block text-primary hover:underline">
              → Register new asset
            </a>
            <a href="/reports" className="block text-primary hover:underline">
              → Generate reports
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
