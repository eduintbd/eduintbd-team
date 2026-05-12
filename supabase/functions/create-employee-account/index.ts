import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { employeeData } = await req.json();

    if (!employeeData || typeof employeeData !== "object") {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const email = String(employeeData.email ?? "")
      .trim()
      .toLowerCase();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const findUserIdByEmail = async (targetEmail: string) => {
      // Small orgs can safely scan users; this avoids relying on getUserByEmail
      // which isn't available in this auth-js version.
      const adminApi: any = supabaseClient.auth.admin;
      let page = 1;
      const perPage = 1000;

      for (let i = 0; i < 10; i++) {
        const { data, error } = await adminApi.listUsers({ page, perPage });
        if (error) throw error;

        const users = (data?.users ?? []) as Array<{ id: string; email?: string | null }>;
        const match = users.find(
          (u) => String(u.email ?? "").trim().toLowerCase() === targetEmail
        );
        if (match) return match.id;

        if (users.length < perPage) break;
        page++;
      }

      return null;
    };

    // Create (or reuse) auth user
    let userId: string | null = await findUserIdByEmail(email);
    let authUserExisted = Boolean(userId);

    if (!userId) {
      const createUserPayload: any = {
        email,
        email_confirm: true,
      };
      // Set password if provided (from admin Add User flow)
      if (employeeData.password) {
        createUserPayload.password = employeeData.password;
      }

      const { data: createdAuth, error: createAuthError } =
        await supabaseClient.auth.admin.createUser(createUserPayload);

      if (createAuthError) {
        const msg = String((createAuthError as any)?.message ?? "");
        const code = String((createAuthError as any)?.code ?? "");
        if (code === "email_exists" || /already been registered/i.test(msg)) {
          userId = await findUserIdByEmail(email);
          if (!userId) throw createAuthError;
          authUserExisted = true;
        } else {
          throw createAuthError;
        }
      } else {
        userId = createdAuth.user.id;
      }
    }

    if (!userId) {
      throw new Error("Failed to resolve user id");
    }

    // If employee already exists, return it (idempotent)
    const { data: existingEmployeeByUserId, error: existingEmployeeByUserIdError } =
      await supabaseClient
        .from("employees")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

    if (existingEmployeeByUserIdError) throw existingEmployeeByUserIdError;

    if (existingEmployeeByUserId) {
      return new Response(
        JSON.stringify({
          success: true,
          employee: existingEmployeeByUserId,
          employee_already_existed: true,
          auth_user_already_existed: authUserExisted,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const { data: existingEmployeeByEmail, error: existingEmployeeByEmailError } =
      await supabaseClient
        .from("employees")
        .select("*")
        .eq("email", email)
        .maybeSingle();

    if (existingEmployeeByEmailError) throw existingEmployeeByEmailError;

    if (existingEmployeeByEmail) {
      return new Response(
        JSON.stringify({
          success: true,
          employee: existingEmployeeByEmail,
          employee_already_existed: true,
          auth_user_already_existed: authUserExisted,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Generate next serial employee code
    const { data: existingCodes } = await supabaseClient
      .from("employees")
      .select("employee_code")
      .like("employee_code", "EDU%");

    let nextNumber = 15; // Start from 15 as requested
    if (existingCodes && existingCodes.length > 0) {
      const numbers = existingCodes
        .map((e: any) => {
          const match = String(e.employee_code ?? "").match(/^EDU(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((n: number) => n > 0);

      if (numbers.length > 0) {
        nextNumber = Math.max(...numbers) + 1;
      }
    }

    const employeeCode = `EDU${String(nextNumber).padStart(2, "0")}`;

    // Determine registration status
    // Auto-approve Google Workspace users (@eduintbd.com)
    const isAutoApprove = employeeData.auto_approve === true;
    const registrationStatus = isAutoApprove ? "approved" : "pending";

    // Create employee record
    const { data: empData, error: empError } = await supabaseClient
      .from("employees")
      .insert({
        user_id: userId,
        employee_code: employeeCode,
        first_name: employeeData.first_name,
        last_name: employeeData.last_name,
        email,
        phone: employeeData.phone || "",
        hire_date: employeeData.hire_date ?? new Date().toISOString().split("T")[0],
        registration_status: registrationStatus,
      })
      .select()
      .single();

    if (empError) {
      throw empError;
    }

    // Auto-assign employee role for auto-approved users
    if (isAutoApprove) {
      await supabaseClient.from("user_roles").upsert(
        { user_id: userId, role: "employee" },
        { onConflict: "user_id,role" }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        employee: empData,
        auth_user_already_existed: authUserExisted,
        auto_approved: isAutoApprove,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
