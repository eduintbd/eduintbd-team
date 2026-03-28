import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const formData = await req.formData();
    
    const fullName = formData.get("fullName") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const location = formData.get("location") as string;
    const role = formData.get("role") as string;
    const dob = formData.get("dob") as string;
    const linkedin = formData.get("linkedin") as string;
    const whyUs = formData.get("whyUs") as string;
    const joinTalentPool = formData.get("joinTalentPool") === "true";
    const cvFile = formData.get("cv") as File;

    console.log("Received application:", { fullName, email, phone, location, role });

    let cvUrl = null;

    // Upload CV if provided
    if (cvFile && cvFile.size > 0) {
      const timestamp = Date.now();
      const sanitizedName = fullName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      const fileExt = cvFile.name.split(".").pop();
      const filePath = `applications/${sanitizedName}_${timestamp}.${fileExt}`;

      console.log("Uploading CV to path:", filePath);

      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from("employee-cvs")
        .upload(filePath, cvFile, {
          contentType: cvFile.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("CV upload error:", uploadError);
        throw new Error(`Failed to upload CV: ${uploadError.message}`);
      }

      // Get the public URL
      const { data: urlData } = supabaseClient.storage
        .from("employee-cvs")
        .getPublicUrl(filePath);

      cvUrl = urlData.publicUrl;
      console.log("CV uploaded successfully:", cvUrl);
    }

    // Insert application into job_applications table
    const { data: applicationData, error: insertError } = await supabaseClient
      .from("job_applications")
      .insert({
        full_name: fullName,
        email: email,
        phone: phone,
        location: location,
        role_applied: role,
        date_of_birth: dob || null,
        linkedin: linkedin || null,
        why_us: whyUs,
        join_talent_pool: joinTalentPool,
        cv_url: cvUrl,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to save application:", insertError);
      throw new Error(`Failed to save application: ${insertError.message}`);
    }

    console.log("Application saved successfully:", applicationData.id);

    // Send confirmation email to applicant
    try {
      const emailResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-application-confirmation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            email: email,
            fullName: fullName,
            roleApplied: role,
          }),
        }
      );
      
      if (emailResponse.ok) {
        console.log("Confirmation email sent successfully");
      } else {
        console.error("Failed to send confirmation email:", await emailResponse.text());
      }
    } catch (emailError) {
      console.error("Error sending confirmation email:", emailError);
      // Don't fail the application submission if email fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Application submitted successfully",
        cvUrl 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Application submission error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
