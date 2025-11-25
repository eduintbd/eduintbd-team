import { useEffect, useState } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  TrendingUp,
  Package,
  BarChart3,
  LogOut,
  Building2,
  Users,
  DollarSign,
  Calendar,
  Clock,
  UserCheck,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (!session) {
        navigate("/auth");
        setLoading(false);
        return;
      }

      // Fetch user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      setUserRole(roleData?.role || "employee");
      setLoading(false);
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  const menuItems = [
    // HR Section - visible to all
    { icon: Users, label: "Employees", path: "/employees", section: "HR" },
    { icon: UserCheck, label: "Pending Registrations", path: "/pending-registrations", section: "HR" },
    { icon: Building2, label: "Departments", path: "/departments", section: "HR" },
    { icon: DollarSign, label: "Payroll", path: "/payroll", section: "HR" },
    { icon: Calendar, label: "Leave", path: "/leave", section: "HR" },
    { icon: Clock, label: "Attendance", path: "/attendance", section: "HR" },
    { icon: CheckSquare, label: "Tasks", path: "/tasks", section: "HR" },
    // Accounting Section - only for admin and accountant roles
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", section: "ACCOUNTING", roles: ["admin", "accountant"] },
    { icon: BookOpen, label: "Chart of Accounts", path: "/accounts", section: "ACCOUNTING", roles: ["admin", "accountant"] },
    { icon: FileText, label: "Journal Entries", path: "/journal", section: "ACCOUNTING", roles: ["admin", "accountant"] },
    { icon: TrendingUp, label: "General Ledger", path: "/ledger", section: "ACCOUNTING", roles: ["admin", "accountant"] },
    { icon: TrendingUp, label: "Trial Balance", path: "/trial-balance", section: "ACCOUNTING", roles: ["admin", "accountant"] },
    { icon: BarChart3, label: "Financial Statements", path: "/financial-statements", section: "ACCOUNTING", roles: ["admin", "accountant"] },
    { icon: Package, label: "Assets", path: "/assets", section: "ACCOUNTING", roles: ["admin", "accountant"] },
    { icon: BarChart3, label: "Reports", path: "/reports", section: "ACCOUNTING", roles: ["admin", "accountant"] },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.roles) return true; // No role restriction
    return item.roles.includes(userRole || "");
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full bg-primary mx-auto mb-4 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary-foreground animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-lg bg-gold flex items-center justify-center">
              <Building2 className="h-6 w-6 text-gold-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-sidebar-foreground">Eduint</h1>
              <p className="text-xs text-sidebar-foreground/70">Accounting System</p>
            </div>
          </div>
          <nav className="space-y-1">
            {/* HR Section */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-sidebar-foreground/50 mb-2 px-3">HUMAN RESOURCES</p>
              {filteredMenuItems.filter(item => item.section === "HR").map((item) => (
                <Button
                  key={item.path}
                  variant={location.pathname === item.path ? "secondary" : "ghost"}
                  className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
                  onClick={() => navigate(item.path)}
                >
                  <item.icon className="h-4 w-4 mr-3" />
                  {item.label}
                </Button>
              ))}
            </div>
            
            {/* Accounting Section - Only visible for admin/accountant */}
            {filteredMenuItems.some(item => item.section === "ACCOUNTING") && (
              <div>
                <p className="text-xs font-semibold text-sidebar-foreground/50 mb-2 px-3">ACCOUNTING</p>
                {filteredMenuItems.filter(item => item.section === "ACCOUNTING").map((item) => (
                  <Button
                    key={item.path}
                    variant={location.pathname === item.path ? "secondary" : "ghost"}
                    className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon className="h-4 w-4 mr-3" />
                    {item.label}
                  </Button>
                ))}
              </div>
            )}
          </nav>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
