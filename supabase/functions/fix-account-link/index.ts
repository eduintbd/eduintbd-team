import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the user from the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user client to verify the token
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData.user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = userData.user;
    const userEmail = user.email?.toLowerCase();
    const userId = user.id;

    console.log(`Attempting to link account for user: ${userEmail} (${userId})`);

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: "User email not available" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already has a linked employee record
    const { data: existingLink, error: existingLinkError } = await supabaseAdmin
      .from("employees")
      .select("id, first_name, last_name, email, registration_status, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingLinkError) {
      console.error("Error checking existing link:", existingLinkError);
      return new Response(
        JSON.stringify({ error: "Database error while checking account link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingLink) {
      console.log("User already linked to employee:", existingLink.id);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Account already linked",
          employee: {
            id: existingLink.id,
            name: `${existingLink.first_name} ${existingLink.last_name}`,
            registration_status: existingLink.registration_status,
            status: existingLink.status,
          },
          already_linked: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find an employee record with matching email that's approved + active
    const { data: matchingEmployee, error: matchError } = await supabaseAdmin
      .from("employees")
      .select("id, first_name, last_name, email, user_id, registration_status, status")
      .ilike("email", userEmail)
      .maybeSingle();

    if (matchError) {
      console.error("Error finding matching employee:", matchError);
      return new Response(
        JSON.stringify({ error: "Database error while searching for employee record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!matchingEmployee) {
      console.log("No employee record found with email:", userEmail);
      return new Response(
        JSON.stringify({
          success: false,
          error: "No employee record found with your email address. Please contact HR.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the employee is approved and active
    const isApproved = matchingEmployee.registration_status === "approved";
    const isActive = matchingEmployee.status === "active";

    if (!isApproved || !isActive) {
      console.log(`Employee found but not approved/active: registration_status=${matchingEmployee.registration_status}, status=${matchingEmployee.status}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Your employee record is not approved yet (status: ${matchingEmployee.registration_status}). Please wait for HR approval.`,
          employee: {
            id: matchingEmployee.id,
            name: `${matchingEmployee.first_name} ${matchingEmployee.last_name}`,
            registration_status: matchingEmployee.registration_status,
            status: matchingEmployee.status,
          },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if this employee is already linked to a different user
    if (matchingEmployee.user_id && matchingEmployee.user_id !== userId) {
      console.log(`Employee already linked to different user: ${matchingEmployee.user_id}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "This employee record is linked to a different account. Please contact HR.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Link the employee to this user
    const { error: updateError } = await supabaseAdmin
      .from("employees")
      .update({ user_id: userId })
      .eq("id", matchingEmployee.id);

    if (updateError) {
      console.error("Error updating employee user_id:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to link account. Please try again or contact HR." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully linked user ${userId} to employee ${matchingEmployee.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account successfully linked!",
        employee: {
          id: matchingEmployee.id,
          name: `${matchingEmployee.first_name} ${matchingEmployee.last_name}`,
          registration_status: matchingEmployee.registration_status,
          status: matchingEmployee.status,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
