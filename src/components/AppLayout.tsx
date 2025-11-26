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
  User,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    // Profile - visible to all
    { icon: User, label: "My Profile", path: "/profile", section: "PROFILE" },
    // HR Section - visible to all
    { icon: Users, label: "Employees", path: "/employees", section: "HR" },
    { icon: UserCheck, label: "Registrations", path: "/pending-registrations", section: "HR" },
    { icon: Building2, label: "Departments", path: "/departments", section: "HR" },
    { icon: DollarSign, label: "Payroll", path: "/payroll", section: "HR" },
    { icon: Calendar, label: "Leave Requests", path: "/leave", section: "HR" },
    { icon: Clock, label: "Attendance", path: "/attendance", section: "HR" },
    { icon: CheckSquare, label: "Tasks", path: "/tasks", section: "HR" },
    // Accounting Section - only for admin and accountant roles
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", section: "ACCOUNTING", roles: ["admin", "accountant"] },
    { icon: BookOpen, label: "Accounts", path: "/accounts", section: "ACCOUNTING", roles: ["admin", "accountant"] },
    { icon: FileText, label: "Journal Entries", path: "/journal", section: "ACCOUNTING", roles: ["admin", "accountant"] },
    { icon: TrendingUp, label: "General Ledger", path: "/ledger", section: "ACCOUNTING", roles: ["admin", "accountant"] },
    { icon: TrendingUp, label: "Trial Balance", path: "/trial-balance", section: "ACCOUNTING", roles: ["admin", "accountant"] },
    { icon: BarChart3, label: "Statements", path: "/financial-statements", section: "ACCOUNTING", roles: ["admin", "accountant"] },
    { icon: Package, label: "Assets", path: "/assets", section: "ACCOUNTING", roles: ["admin", "accountant"] },
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

  const SidebarContent = () => (
    <>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-lg bg-gold flex items-center justify-center">
            <Building2 className="h-6 w-6 text-gold-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-sidebar-foreground">EDUINT</h1>
            <p className="text-xs text-sidebar-foreground/70">ERP System</p>
          </div>
        </div>
        <nav className="space-y-1">
          {/* Profile Section */}
          <div className="mb-4">
            {filteredMenuItems.filter(item => item.section === "PROFILE").map((item) => (
              <Button
                key={item.path}
                variant={location.pathname === item.path ? "secondary" : "ghost"}
                className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
              >
                <item.icon className="h-4 w-4 mr-3" />
                {item.label}
              </Button>
            ))}
          </div>
          
          {/* HR Section */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-sidebar-foreground/50 mb-2 px-3">HUMAN RESOURCES</p>
            {filteredMenuItems.filter(item => item.section === "HR").map((item) => (
              <Button
                key={item.path}
                variant={location.pathname === item.path ? "secondary" : "ghost"}
                className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
              >
                <item.icon className="h-4 w-4 mr-3" />
                {item.label}
              </Button>
            ))}
          </div>
          
          {/* Accounting Section - Only visible for admin/cfo */}
          {filteredMenuItems.some(item => item.section === "ACCOUNTING") && (
            <div>
              <p className="text-xs font-semibold text-sidebar-foreground/50 mb-2 px-3">ACCOUNTING</p>
              {filteredMenuItems.filter(item => item.section === "ACCOUNTING").map((item) => (
                <Button
                  key={item.path}
                  variant={location.pathname === item.path ? "secondary" : "ghost"}
                  className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
                  onClick={() => {
                    navigate(item.path);
                    setMobileMenuOpen(false);
                  }}
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
          onClick={() => {
            handleSignOut();
            setMobileMenuOpen(false);
          }}
        >
          <LogOut className="h-4 w-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-sidebar-border z-50 flex items-center px-4">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
            <SidebarContent />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 ml-4">
          <div className="h-8 w-8 rounded-lg bg-gold flex items-center justify-center">
            <Building2 className="h-5 w-5 text-gold-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-display font-bold text-sidebar-foreground">EDUINT</h1>
            <p className="text-xs text-sidebar-foreground/70">ERP System</p>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="pt-16 lg:pt-0 lg:ml-64 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
