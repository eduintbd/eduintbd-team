import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  total_debit: number;
  total_credit: number;
  balance: number;
}

const TrialBalance = () => {
  const [data, setData] = useState<TrialBalanceRow[]>([]);
  const [asOfDate, setAsOfDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [tempAsOfDate, setTempAsOfDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTrialBalance();
  }, [asOfDate]);

  const fetchTrialBalance = async () => {
    // Fetch journal entries up to the selected date and calculate balances
    const { data: entries } = await supabase
      .from("general_ledger")
      .select("*")
      .lte("entry_date", asOfDate);

    if (!entries) {
      setData([]);
      return;
    }

    // Group by account and calculate totals
    const accountMap = new Map<string, TrialBalanceRow>();
    
    entries.forEach((entry) => {
      const key = entry.account_code;
      if (!accountMap.has(key)) {
        accountMap.set(key, {
          account_code: entry.account_code || "",
          account_name: entry.account_name || "",
          account_type: entry.account_type || "",
          account_subtype: "",
          total_debit: 0,
          total_credit: 0,
          balance: 0,
        });
      }
      
      const account = accountMap.get(key)!;
      account.total_debit += entry.debit || 0;
      account.total_credit += entry.credit || 0;
    });

    // Calculate balances
    const result = Array.from(accountMap.values()).map((account) => {
      const balance = account.total_debit - account.total_credit;
      return { ...account, balance };
    });

    setData(result);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Trial_Balance_${asOfDate}`,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
    }).format(amount || 0);
  };

  const totals = data.reduce(
    (acc, row) => ({
      debit: acc.debit + (row.total_debit || 0),
      credit: acc.credit + (row.total_credit || 0),
    }),
    { debit: 0, credit: 0 }
  );

  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold">Trial Balance</h1>
          <p className="text-muted-foreground mt-2">Verify that total debits equal total credits</p>
        </div>
        <Button onClick={handlePrint}>
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Date Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-2">
            <Label>As of Date</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={tempAsOfDate}
                onChange={(e) => setTempAsOfDate(e.target.value)}
              />
              <Button onClick={() => setAsOfDate(tempAsOfDate)}>Go</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div ref={printRef} className="print:p-8">
        <Card>
        <CardHeader className="text-center print:border-b">
          <CardTitle className="text-2xl font-bold">Eduint Limited</CardTitle>
          <CardTitle className="text-xl">Trial Balance</CardTitle>
          <CardDescription className="text-base font-semibold">
            As on {format(new Date(asOfDate), "MMMM dd, yyyy")}
          </CardDescription>
          <CardDescription>
            {isBalanced && <span className="text-success ml-2">✓ Balanced</span>}
            {!isBalanced && <span className="text-destructive ml-2">✗ Not Balanced</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.account_code}>
                  <TableCell className="font-mono">{row.account_code}</TableCell>
                  <TableCell className="font-medium">{row.account_name}</TableCell>
                  <TableCell className="capitalize">{row.account_type}</TableCell>
                  <TableCell className="text-right">
                    {row.total_debit > 0 ? formatCurrency(row.total_debit) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.total_credit > 0 ? formatCurrency(row.total_credit) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Math.abs(row.balance))}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted font-bold">
                <TableCell colSpan={3}>Total</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.debit)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.credit)}</TableCell>
                <TableCell className="text-right">
                  {isBalanced ? (
                    <span className="text-success">Balanced</span>
                  ) : (
                    <span className="text-destructive">
                      Diff: {formatCurrency(Math.abs(totals.debit - totals.credit))}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

        {data.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No data available. Create journal entries to populate the trial balance.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TrialBalance;
