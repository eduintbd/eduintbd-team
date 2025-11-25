import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, DollarSign, Package, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Reports = () => {
  const navigate = useNavigate();

  const reports = [
    {
      icon: FileText,
      title: "Journal Entry Vouchers",
      description: "View and print individual journal entry vouchers",
      path: "/journal",
      color: "text-primary",
    },
    {
      icon: TrendingUp,
      title: "General Ledger",
      description: "Detailed account-by-account transaction history",
      path: "/ledger",
      color: "text-secondary",
    },
    {
      icon: DollarSign,
      title: "Trial Balance",
      description: "Verify that total debits equal total credits",
      path: "/trial-balance",
      color: "text-success",
    },
    {
      icon: FileText,
      title: "Balance Sheet",
      description: "Statement of financial position (assets, liabilities, equity)",
      path: "/financial-statements",
      color: "text-primary",
    },
    {
      icon: TrendingUp,
      title: "Income Statement",
      description: "Statement of profit and loss (revenues and expenses)",
      path: "/financial-statements",
      color: "text-success",
    },
    {
      icon: Package,
      title: "Asset Registry Report",
      description: "Fixed assets with depreciation schedules",
      path: "/assets",
      color: "text-warning",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Reports</h1>
        <p className="text-muted-foreground mt-2">
          Generate and view various accounting reports
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Card key={report.title} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <report.icon className={`h-10 w-10 ${report.color}`} />
                <Button size="sm" variant="ghost" onClick={() => navigate(report.path)}>
                  <Download className="h-4 w-4 mr-1" />
                  View
                </Button>
              </div>
              <CardTitle className="mt-4">{report.title}</CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => navigate(report.path)}>
                Generate Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted">
        <CardHeader>
          <CardTitle>Report Features</CardTitle>
          <CardDescription>What you can do with reports in Eduint Accounting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <p className="text-sm">View real-time data from posted journal entries</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-secondary" />
            <p className="text-sm">Filter and search through accounts and transactions</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-success" />
            <p className="text-sm">Track asset depreciation and book values</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-warning" />
            <p className="text-sm">Generate financial statements for any period</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
