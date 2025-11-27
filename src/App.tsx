import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import PendingRegistrations from "./pages/PendingRegistrations";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import JournalEntries from "./pages/JournalEntries";
import GeneralLedger from "./pages/GeneralLedger";
import TrialBalance from "./pages/TrialBalance";
import FinancialStatements from "./pages/FinancialStatements";
import Assets from "./pages/Assets";
import Reports from "./pages/Reports";
import Employees from "./pages/Employees";
import Payroll from "./pages/Payroll";
import Leave from "./pages/Leave";
import Attendance from "./pages/Attendance";
import Departments from "./pages/Departments";
import Tasks from "./pages/Tasks";
import Profile from "./pages/Profile";
import AdminUtilities from "./pages/AdminUtilities";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/accounts" element={<ChartOfAccounts />} />
            <Route path="/journal" element={<JournalEntries />} />
            <Route path="/ledger" element={<GeneralLedger />} />
            <Route path="/trial-balance" element={<TrialBalance />} />
            <Route path="/financial-statements" element={<FinancialStatements />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/leave" element={<Leave />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/pending-registrations" element={<PendingRegistrations />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin-utilities" element={<AdminUtilities />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
