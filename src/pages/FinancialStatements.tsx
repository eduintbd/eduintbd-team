import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { useReactToPrint } from "react-to-print";
import { Download } from "lucide-react";

interface TrialBalanceRow {
  account_code: string;
  account_name: string;
  account_type: string;
  account_subtype: string;
  balance: number;
}

const FinancialStatements = () => {
  const [data, setData] = useState<TrialBalanceRow[]>([]);
  const [balanceSheetDate, setBalanceSheetDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [incomeFromDate, setIncomeFromDate] = useState(format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"));
  const [incomeToDate, setIncomeToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [tempBalanceSheetDate, setTempBalanceSheetDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [tempIncomeFromDate, setTempIncomeFromDate] = useState(format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"));
  const [tempIncomeToDate, setTempIncomeToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const balanceSheetRef = useRef<HTMLDivElement>(null);
  const incomeStatementRef = useRef<HTMLDivElement>(null);
  const equityStatementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [balanceSheetDate, incomeFromDate, incomeToDate]);

  const fetchData = async () => {
    // Fetch all ledger entries
    const { data: allEntries } = await supabase
      .from("general_ledger")
      .select("*")
      .order("entry_date");

    if (!allEntries) {
      setData([]);
      return;
    }

    const accountMap = new Map<string, TrialBalanceRow>();

    // Process all entries
    allEntries.forEach((entry) => {
      const key = entry.account_code;
      if (!accountMap.has(key)) {
        accountMap.set(key, {
          account_code: entry.account_code || "",
          account_name: entry.account_name || "",
          account_type: entry.account_type || "",
          account_subtype: "",
          balance: 0,
        });
      }

      const account = accountMap.get(key)!;
      const entryDate = new Date(entry.entry_date);
      
      // For balance sheet accounts (asset, liability, equity): cumulative up to balanceSheetDate
      if (entry.account_type === "asset" || entry.account_type === "liability" || entry.account_type === "equity") {
        if (entryDate <= new Date(balanceSheetDate)) {
          account.balance += (entry.debit || 0) - (entry.credit || 0);
        }
      }
      
      // For income statement accounts (revenue, expense): only within the date range
      if (entry.account_type === "revenue" || entry.account_type === "expense") {
        if (entryDate >= new Date(incomeFromDate) && entryDate <= new Date(incomeToDate)) {
          account.balance += (entry.debit || 0) - (entry.credit || 0);
        }
      }
    });

    setData(Array.from(accountMap.values()));
  };

  const handlePrintBalanceSheet = useReactToPrint({
    contentRef: balanceSheetRef,
    documentTitle: `Balance_Sheet_${balanceSheetDate}`,
  });

  const handlePrintIncomeStatement = useReactToPrint({
    contentRef: incomeStatementRef,
    documentTitle: `Income_Statement_${incomeFromDate}_to_${incomeToDate}`,
  });

  const handlePrintEquityStatement = useReactToPrint({
    contentRef: equityStatementRef,
    documentTitle: `Statement_of_Changes_in_Equity_${incomeFromDate}_to_${incomeToDate}`,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
    }).format(Math.abs(amount) || 0);
  };

  // Income Statement
  const revenues = data.filter((row) => row.account_type === "revenue");
  const expenses = data.filter((row) => row.account_type === "expense");

  const totalRevenue = revenues.reduce((sum, row) => sum + Math.abs(row.balance), 0);
  const totalExpenses = expenses.reduce((sum, row) => sum + Math.abs(row.balance), 0);
  const netIncome = totalRevenue - totalExpenses; // Net Profit or Loss

  // Balance Sheet
  const assets = data.filter((row) => row.account_type === "asset");
  const liabilities = data.filter((row) => row.account_type === "liability");
  const equity = data.filter((row) => row.account_type === "equity");
  
  // Find Retained Earnings account (if exists)
  const retainedEarningsAccount = equity.find((row) => 
    row.account_name.toLowerCase().includes("retained earnings")
  );
  const currentRetainedEarnings = retainedEarningsAccount ? Math.abs(retainedEarningsAccount.balance) : 0;
  
  // Other equity accounts (excluding Retained Earnings)
  const otherEquity = equity.filter((row) => 
    !row.account_name.toLowerCase().includes("retained earnings")
  );

  const totalAssets = assets.reduce((sum, row) => sum + row.balance, 0);
  const totalLiabilities = liabilities.reduce((sum, row) => sum + Math.abs(row.balance), 0);
  const totalOtherEquity = otherEquity.reduce((sum, row) => sum + Math.abs(row.balance), 0);
  
  // Calculate ending retained earnings: current + net income
  const endingRetainedEarnings = currentRetainedEarnings + netIncome;
  const totalEquity = totalOtherEquity + endingRetainedEarnings;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Financial Statements</h1>
        <p className="text-muted-foreground mt-2">Balance sheet and income statement</p>
      </div>

      <Tabs defaultValue="balance-sheet" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-3xl">
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
          <TabsTrigger value="equity-statement">Changes in Equity</TabsTrigger>
        </TabsList>

        <TabsContent value="balance-sheet" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Date Filter</CardTitle>
                </div>
                <Button onClick={handlePrintBalanceSheet} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-w-xs space-y-2">
                <Label>As of Date</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={tempBalanceSheetDate}
                    onChange={(e) => setTempBalanceSheetDate(e.target.value)}
                  />
                  <Button onClick={() => setBalanceSheetDate(tempBalanceSheetDate)}>Go</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div ref={balanceSheetRef} className="print:p-8">
            <Card>
            <CardHeader className="text-center print:border-b">
              <CardTitle className="text-2xl font-bold">Eduint Limited</CardTitle>
              <CardTitle className="text-xl">Balance Sheet</CardTitle>
              <CardDescription className="text-base font-semibold">As on {format(new Date(balanceSheetDate), "MMMM dd, yyyy")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-bold mb-3 text-primary">Assets</h3>
                <Table>
                  <TableBody>
                    {assets.map((row) => (
                      <TableRow key={row.account_code}>
                        <TableCell>{row.account_name}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(row.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-primary/10">
                      <TableCell className="font-bold">Total Assets</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(totalAssets)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3 text-primary">Liabilities</h3>
                <Table>
                  <TableBody>
                    {liabilities.map((row) => (
                      <TableRow key={row.account_code}>
                        <TableCell>{row.account_name}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(row.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-primary/10">
                      <TableCell className="font-bold">Total Liabilities</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(totalLiabilities)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3 text-primary">Equity</h3>
                <Table>
                  <TableBody>
                    {otherEquity.map((row) => (
                      <TableRow key={row.account_code}>
                        <TableCell>{row.account_name}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(row.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell>Retained Earnings</TableCell>
                      <TableCell className={`text-right font-medium ${endingRetainedEarnings >= 0 ? "" : "text-destructive"}`}>
                        {formatCurrency(endingRetainedEarnings)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-primary/10">
                      <TableCell className="font-bold">Total Equity</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(totalEquity)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="pt-4 border-t-2 border-primary">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Total Liabilities & Equity</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(totalLiabilities + totalEquity)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        <TabsContent value="income-statement" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Date Filter</CardTitle>
                </div>
                <Button onClick={handlePrintIncomeStatement} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Input
                    type="date"
                    value={tempIncomeFromDate}
                    onChange={(e) => setTempIncomeFromDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Input
                    type="date"
                    value={tempIncomeToDate}
                    onChange={(e) => setTempIncomeToDate(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                className="mt-4"
                onClick={() => {
                  setIncomeFromDate(tempIncomeFromDate);
                  setIncomeToDate(tempIncomeToDate);
                }}
              >
                Go
              </Button>
            </CardContent>
          </Card>

          <div ref={incomeStatementRef} className="print:p-8">
            <Card>
            <CardHeader className="text-center print:border-b">
              <CardTitle className="text-2xl font-bold">Eduint Limited</CardTitle>
              <CardTitle className="text-xl">Income Statement</CardTitle>
              <CardDescription className="text-base font-semibold">
                For the period from {format(new Date(incomeFromDate), "MMMM dd, yyyy")} to{" "}
                {format(new Date(incomeToDate), "MMMM dd, yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-bold mb-3 text-success">Revenue</h3>
                <Table>
                  <TableBody>
                    {revenues.map((row) => (
                      <TableRow key={row.account_code}>
                        <TableCell>{row.account_name}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(row.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-success/10">
                      <TableCell className="font-bold">Total Revenue</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(totalRevenue)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3 text-destructive">Expenses</h3>
                <Table>
                  <TableBody>
                    {expenses.map((row) => (
                      <TableRow key={row.account_code}>
                        <TableCell>{row.account_name}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(row.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-destructive/10">
                      <TableCell className="font-bold">Total Expenses</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(totalExpenses)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="pt-4 border-t-2 border-primary">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">
                    {netIncome >= 0 ? "Net Profit" : "Net Loss"}
                  </span>
                  <span
                    className={`text-lg font-bold ${netIncome >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {formatCurrency(netIncome)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        <TabsContent value="equity-statement" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Date Filter</CardTitle>
                </div>
                <Button onClick={handlePrintEquityStatement} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="equity-from-date">From Date</Label>
                  <Input
                    id="equity-from-date"
                    type="date"
                    value={tempIncomeFromDate}
                    onChange={(e) => setTempIncomeFromDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="equity-to-date">To Date</Label>
                  <Input
                    id="equity-to-date"
                    type="date"
                    value={tempIncomeToDate}
                    onChange={(e) => setTempIncomeToDate(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={() => {
                  setIncomeFromDate(tempIncomeFromDate);
                  setIncomeToDate(tempIncomeToDate);
                }}
              >
                Go
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6" ref={equityStatementRef}>
              <div className="space-y-6">
                <div className="text-center space-y-2 print:border-b print:pb-4">
                  <h2 className="text-2xl font-display font-bold">Eduint Limited</h2>
                  <h3 className="text-xl font-bold">Statement of Changes in Equity</h3>
                  <p className="text-base font-semibold">
                    For the period from {format(new Date(incomeFromDate), "MMMM dd, yyyy")} to{" "}
                    {format(new Date(incomeToDate), "MMMM dd, yyyy")}
                  </p>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {otherEquity.map((row) => (
                      <TableRow key={row.account_code}>
                        <TableCell className="font-semibold">{row.account_name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.balance)}</TableCell>
                      </TableRow>
                    ))}
                    
                    <TableRow className="border-t border-border">
                      <TableCell className="font-semibold">Retained Earnings</TableCell>
                      <TableCell className="text-right"></TableCell>
                    </TableRow>
                    
                    <TableRow>
                      <TableCell className="pl-8">Beginning Retained Earnings</TableCell>
                      <TableCell className="text-right">{formatCurrency(currentRetainedEarnings)}</TableCell>
                    </TableRow>
                    
                    <TableRow>
                      <TableCell className="pl-8">
                        {netIncome >= 0 ? "Add: Net Profit for the Period" : "Less: Net Loss for the Period"}
                      </TableCell>
                      <TableCell className={`text-right ${netIncome >= 0 ? "text-success" : "text-destructive"}`}>
                        {formatCurrency(netIncome)}
                      </TableCell>
                    </TableRow>

                    <TableRow className="border-t border-border">
                      <TableCell className="pl-8 font-semibold">Ending Retained Earnings</TableCell>
                      <TableCell className={`text-right font-semibold ${endingRetainedEarnings >= 0 ? "" : "text-destructive"}`}>
                        {formatCurrency(endingRetainedEarnings)}
                      </TableCell>
                    </TableRow>

                    <TableRow className="border-t-2 border-primary font-bold">
                      <TableCell>Total Equity</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalEquity)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="text-sm text-muted-foreground space-y-1 mt-8">
                  <p><strong>Note:</strong> This statement shows changes in shareholders' equity during the reporting period.</p>
                  <p>Net {netIncome >= 0 ? "profit" : "loss"} from the Income Statement flows to Retained Earnings, which is then reflected in the Balance Sheet.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialStatements;
