import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
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
import HROperations from "./pages/HROperations";
import Departments from "./pages/Departments";
import Tasks from "./pages/Tasks";
import TaskTemplates from "./pages/TaskTemplates";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import Careers from "./pages/Careers";
import PurchaseOrders from "./pages/PurchaseOrders";
import ProcurementItems from "./pages/ProcurementItems";
import Vendors from "./pages/Vendors";
import ProcurementPayments from "./pages/ProcurementPayments";
import FileManagement from "./pages/FileManagement";
import SocialMedia from "./pages/SocialMedia";
import Email from "./pages/Email";
import Calendar from "./pages/Calendar";
import UserManagement from "./pages/UserManagement";
import StationaryManagement from "./pages/StationaryManagement";
import GroceryManagement from "./pages/GroceryManagement";
import CardManagement from "./pages/CardManagement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/careers" element={<Careers />} />
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
            <Route path="/hr-operations" element={<HROperations />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/task-templates" element={<TaskTemplates />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/procurement/orders" element={<PurchaseOrders />} />
            <Route path="/procurement/items" element={<ProcurementItems />} />
            <Route path="/procurement/vendors" element={<Vendors />} />
            <Route path="/procurement/payments" element={<ProcurementPayments />} />
            <Route path="/files" element={<FileManagement />} />
            <Route path="/social-media" element={<SocialMedia />} />
            <Route path="/email" element={<Email />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/user-management" element={<UserManagement />} />
            <Route path="/stationary" element={<StationaryManagement />} />
            <Route path="/grocery" element={<GroceryManagement />} />
            <Route path="/cards" element={<CardManagement />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
