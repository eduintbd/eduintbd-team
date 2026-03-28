import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useReactToPrint } from "react-to-print";
import { Download } from "lucide-react";

interface LedgerEntry {
  account_code: string;
  account_name: string;
  account_type: string;
  entry_date: string;
  entry_number: string;
  entry_description: string;
  line_description: string;
  debit: number;
  credit: number;
}

const GeneralLedger = () => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<LedgerEntry[]>([]);
  const [searchAccount, setSearchAccount] = useState("");
  const [fromDate, setFromDate] = useState(format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [tempFromDate, setTempFromDate] = useState(format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"));
  const [tempToDate, setTempToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLedger();
  }, [fromDate, toDate]);

  useEffect(() => {
    let filtered = entries;

    if (searchAccount) {
      filtered = filtered.filter(
        (entry) =>
          entry.account_code.toLowerCase().includes(searchAccount.toLowerCase()) ||
          entry.account_name.toLowerCase().includes(searchAccount.toLowerCase())
      );
    }
    setFilteredEntries(filtered);
  }, [searchAccount, entries]);

  const fetchLedger = async () => {
    const { data } = await supabase
      .from("general_ledger")
      .select("*")
      .gte("entry_date", fromDate)
      .lte("entry_date", toDate)
      .order("entry_date");
    setEntries(data || []);
    setFilteredEntries(data || []);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `General_Ledger_${fromDate}_to_${toDate}`,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
    }).format(amount || 0);
  };

  const groupedEntries = filteredEntries.reduce((acc, entry) => {
    const key = `${entry.account_code}-${entry.account_name}`;
    if (!acc[key]) {
      acc[key] = {
        account_code: entry.account_code,
        account_name: entry.account_name,
        account_type: entry.account_type,
        entries: [],
      };
    }
    acc[key].entries.push(entry);
    return acc;
  }, {} as Record<string, any>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold">General Ledger</h1>
          <p className="text-muted-foreground mt-2">Detailed account transactions</p>
        </div>
        <Button onClick={handlePrint}>
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter ledger entries by date and account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Account Code or Name</Label>
              <Input
                placeholder="Search by account code or name..."
                value={searchAccount}
                onChange={(e) => setSearchAccount(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div ref={printRef} className="print:p-8">
        <div className="text-center mb-6 print:border-b print:pb-4">
          <h2 className="text-2xl font-bold">Eduint Limited</h2>
          <h3 className="text-xl font-semibold">General Ledger</h3>
          <p className="text-base font-semibold text-muted-foreground">
            For the period from {format(new Date(fromDate), "MMMM dd, yyyy")} to{" "}
            {format(new Date(toDate), "MMMM dd, yyyy")}
          </p>
        </div>

      {Object.values(groupedEntries).map((account: any) => {
        let runningBalance = 0;
        return (
          <Card key={`${account.account_code}-${account.account_name}`} className="mb-4">
            <CardHeader>
              <CardTitle>
                {account.account_code} - {account.account_name}
              </CardTitle>
              <CardDescription className="capitalize">{account.account_type} Account</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Entry #</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {account.entries.map((entry: LedgerEntry, index: number) => {
                    runningBalance += (entry.debit || 0) - (entry.credit || 0);
                    return (
                      <TableRow key={index}>
                        <TableCell>{format(new Date(entry.entry_date), "MMM dd, yyyy")}</TableCell>
                        <TableCell className="font-mono">{entry.entry_number}</TableCell>
                        <TableCell>{entry.line_description || entry.entry_description}</TableCell>
                        <TableCell className="text-right">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Math.abs(runningBalance))} {runningBalance >= 0 ? 'Dr' : 'Cr'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted font-bold">
                    <TableCell colSpan={3}>Total</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(
                        account.entries.reduce((sum: number, e: LedgerEntry) => sum + (e.debit || 0), 0)
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(
                        account.entries.reduce((sum: number, e: LedgerEntry) => sum + (e.credit || 0), 0)
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(Math.abs(runningBalance))} {runningBalance >= 0 ? 'Dr' : 'Cr'}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

        {filteredEntries.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No ledger entries found. Start by creating journal entries.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GeneralLedger;
