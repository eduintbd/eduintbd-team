import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SMART_BIZ_CARDS_API_KEY = Deno.env.get("SMART_BIZ_CARDS_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface EmployeeData {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  company_email: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  avatar_url: string | null;
  status: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get("x-api-key");
    
    if (!apiKey || apiKey !== SMART_BIZ_CARDS_API_KEY) {
      console.error("Invalid or missing API key");
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized", 
          message: "Invalid or missing API key" 
        }),
        { 
          status: 401, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const url = new URL(req.url);
    const path = url.pathname.replace("/smart-biz-cards-api", "");
    
    console.log(`Smart Biz Cards API request: ${req.method} ${path}`);

    // GET /employees - List all active employees
    if (req.method === "GET" && (path === "/employees" || path === "" || path === "/")) {
      const { data: employees, error } = await supabase
        .from("employees")
        .select(`
          id,
          employee_code,
          first_name,
          last_name,
          email,
          company_email,
          phone,
          avatar_url,
          status,
          departments:department_id (department_name),
          positions:position_id (position_title)
        `)
        .eq("status", "active")
        .order("first_name", { ascending: true });

      if (error) {
        console.error("Error fetching employees:", error);
        return new Response(
          JSON.stringify({ error: "Database error", message: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Transform the data to a cleaner format
      const formattedEmployees: EmployeeData[] = (employees || []).map((emp: any) => ({
        id: emp.id,
        employee_code: emp.employee_code,
        first_name: emp.first_name,
        last_name: emp.last_name,
        full_name: `${emp.first_name} ${emp.last_name}`,
        email: emp.email,
        company_email: emp.company_email,
        phone: emp.phone,
        department: emp.departments?.department_name || null,
        position: emp.positions?.position_title || null,
        avatar_url: emp.avatar_url,
        status: emp.status,
      }));

      console.log(`Returning ${formattedEmployees.length} employees`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: formattedEmployees,
          count: formattedEmployees.length,
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // GET /employees/:id - Get single employee by ID or employee_code
    if (req.method === "GET" && path.startsWith("/employees/")) {
      const identifier = path.replace("/employees/", "");
      
      if (!identifier) {
        return new Response(
          JSON.stringify({ error: "Bad Request", message: "Employee ID or code required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Try to find by ID first, then by employee_code
      let query = supabase
        .from("employees")
        .select(`
          id,
          employee_code,
          first_name,
          last_name,
          email,
          company_email,
          phone,
          avatar_url,
          status,
          hire_date,
          departments:department_id (department_name, department_code),
          positions:position_id (position_title, position_code)
        `)
        .eq("status", "active");

      // Check if identifier is a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(identifier)) {
        query = query.eq("id", identifier);
      } else {
        query = query.eq("employee_code", identifier.toUpperCase());
      }

      const { data: employee, error } = await query.maybeSingle();

      if (error) {
        console.error("Error fetching employee:", error);
        return new Response(
          JSON.stringify({ error: "Database error", message: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!employee) {
        return new Response(
          JSON.stringify({ error: "Not Found", message: "Employee not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const dept = employee.departments as unknown as { department_name: string; department_code: string } | null;
      const pos = employee.positions as unknown as { position_title: string; position_code: string } | null;
      
      const formattedEmployee = {
        id: employee.id,
        employee_code: employee.employee_code,
        first_name: employee.first_name,
        last_name: employee.last_name,
        full_name: `${employee.first_name} ${employee.last_name}`,
        email: employee.email,
        company_email: employee.company_email,
        phone: employee.phone,
        department: dept?.department_name || null,
        department_code: dept?.department_code || null,
        position: pos?.position_title || null,
        position_code: pos?.position_code || null,
        avatar_url: employee.avatar_url,
        status: employee.status,
        hire_date: employee.hire_date,
      };

      console.log(`Returning employee: ${formattedEmployee.employee_code}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: formattedEmployee,
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // GET /departments - List all active departments
    if (req.method === "GET" && path === "/departments") {
      const { data: departments, error } = await supabase
        .from("departments")
        .select("id, department_code, department_name, description")
        .eq("is_active", true)
        .order("department_name", { ascending: true });

      if (error) {
        console.error("Error fetching departments:", error);
        return new Response(
          JSON.stringify({ error: "Database error", message: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log(`Returning ${departments?.length || 0} departments`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: departments,
          count: departments?.length || 0,
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // GET /positions - List all active positions
    if (req.method === "GET" && path === "/positions") {
      const { data: positions, error } = await supabase
        .from("positions")
        .select(`
          id, 
          position_code, 
          position_title, 
          description,
          departments:department_id (department_name)
        `)
        .eq("is_active", true)
        .order("position_title", { ascending: true });

      if (error) {
        console.error("Error fetching positions:", error);
        return new Response(
          JSON.stringify({ error: "Database error", message: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const formattedPositions = (positions || []).map((pos: any) => ({
        id: pos.id,
        position_code: pos.position_code,
        position_title: pos.position_title,
        description: pos.description,
        department: pos.departments?.department_name || null,
      }));

      console.log(`Returning ${formattedPositions.length} positions`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: formattedPositions,
          count: formattedPositions.length,
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // API Documentation endpoint
    if (req.method === "GET" && path === "/docs") {
      const documentation = {
        name: "EDUINTBD Smart Biz Cards API",
        version: "1.0.0",
        description: "API for syncing employee data with Smart Biz Cards digital business card platform",
        authentication: {
          type: "API Key",
          header: "x-api-key",
          description: "Include your API key in the x-api-key header"
        },
        endpoints: [
          {
            method: "GET",
            path: "/employees",
            description: "List all active employees with their department and position"
          },
          {
            method: "GET",
            path: "/employees/:id",
            description: "Get a single employee by ID or employee_code"
          },
          {
            method: "GET",
            path: "/departments",
            description: "List all active departments"
          },
          {
            method: "GET",
            path: "/positions",
            description: "List all active positions with their department"
          },
          {
            method: "GET",
            path: "/docs",
            description: "This documentation endpoint"
          }
        ],
        response_format: {
          success: "boolean",
          data: "array | object",
          count: "number (for list endpoints)",
          timestamp: "ISO 8601 timestamp"
        }
      };

      return new Response(
        JSON.stringify(documentation),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Route not found
    return new Response(
      JSON.stringify({ 
        error: "Not Found", 
        message: "Endpoint not found. Use GET /docs for API documentation." 
      }),
      { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Smart Biz Cards API error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
