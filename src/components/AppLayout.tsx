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
  LogOut,
  Building2,
  Users,
  DollarSign,
  Calendar,
  Clock,
  UserCheck,
  CheckSquare,
  User,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { toast } from "sonner";

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (!session) {
        navigate("/auth");
        setLoading(false);
        return;
      }

      // Fetch all user roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      setUserRoles(rolesData?.map(r => r.role) || ["employee"]);
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
    { icon: Building2, label: "Departments", path: "/departments", section: "HR", roles: ["admin", "hr_manager"] },
    { icon: DollarSign, label: "HR Operations", path: "/hr-operations", section: "HR", roles: ["admin", "hr_manager"] },
    { icon: CheckSquare, label: "Tasks", path: "/tasks", section: "HR" },
    // Accounting Section - only for admin and accountant roles
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", section: "ACCOUNTING", roles: ["admin", "accountant"] },
    { icon: BookOpen, label: "Accounts", path: "/accounts", section: "ACCOUNTING", roles: ["admin", "accountant"] },
    { icon: FileText, label: "Journal Entries", path: "/journal", section: "ACCOUNTING", roles: ["admin", "accountant"] },
    { icon: TrendingUp, label: "General Ledger", path: "/ledger", section: "ACCOUNTING", roles: ["admin", "accountant"] },
    { icon: TrendingUp, label: "Trial Balance", path: "/trial-balance", section: "ACCOUNTING", roles: ["admin", "accountant"] },
    { icon: FileText, label: "Statements", path: "/financial-statements", section: "ACCOUNTING", roles: ["admin", "accountant"] },
    { icon: Package, label: "Assets", path: "/assets", section: "ACCOUNTING", roles: ["admin", "accountant"] },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.roles) return true; // No role restriction
    return item.roles.some(role => userRoles.includes(role));
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

  const AppSidebarContent = () => {
    const { open } = useSidebar();
    
    return (
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarContent>
          {/* Header */}
          <div className="p-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gold flex items-center justify-center shrink-0">
                <Building2 className="h-6 w-6 text-gold-foreground" />
              </div>
              {open && (
                <div>
                  <h1 className="text-lg font-display font-bold text-sidebar-foreground">EDUINT</h1>
                  <p className="text-xs text-sidebar-foreground/70">ERP System</p>
                </div>
              )}
            </div>
          </div>

          {/* Profile Section */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredMenuItems.filter(item => item.section === "PROFILE").map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.path)}
                      isActive={location.pathname === item.path}
                      tooltip={item.label}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* HR Section */}
          <SidebarGroup>
            <SidebarGroupLabel>Human Resources</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredMenuItems.filter(item => item.section === "HR").map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.path)}
                      isActive={location.pathname === item.path}
                      tooltip={item.label}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Accounting Section */}
          {filteredMenuItems.some(item => item.section === "ACCOUNTING") && (
            <SidebarGroup>
              <SidebarGroupLabel>Accounting</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredMenuItems.filter(item => item.section === "ACCOUNTING").map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        onClick={() => navigate(item.path)}
                        isActive={location.pathname === item.path}
                        tooltip={item.label}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Sign Out */}
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleSignOut} tooltip="Sign Out">
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebarContent />
        
        <main className="flex-1 flex flex-col">
          {/* Header with trigger */}
          <header className="h-14 border-b border-border flex items-center px-4 sticky top-0 bg-background z-10">
            <SidebarTrigger />
          </header>
          
          {/* Page content */}
          <div className="flex-1 p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
