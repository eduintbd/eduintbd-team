import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApplicationConfirmationRequest {
  email: string;
  fullName: string;
  roleApplied: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, roleApplied }: ApplicationConfirmationRequest = await req.json();
    
    console.log(`Sending application confirmation to ${email} for ${fullName}`);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "EDUINTBD Advisor <hr@eduintbd.ai>",
        to: [email],
        subject: "Thank You for Applying to EDUINTBD!",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">EDUINTBD</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Your Gateway to Global Education</p>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
              <h2 style="color: #333; margin-top: 0;">Dear ${fullName},</h2>
              
              <p>Thank you for applying for the <strong>${roleApplied}</strong> position at EDUINTBD!</p>
              
              <p>We are thrilled to receive your application. This is an exciting opportunity to be part of our mission to help students around the world achieve their dreams of studying abroad.</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <p style="margin: 0; font-style: italic; color: #555;">
                  "Joining EDUINTBD would be a next-level opportunity to connect with our cloud-based platform and make a real difference in students' lives across Australia, Canada, New Zealand, UK, USA, and Europe."
                </p>
              </div>
              
              <p>Our team will carefully review your application and get back to you soon. In the meantime, feel free to explore our services and learn more about how we help students identify their passion and pursue their educational goals.</p>
              
              <p><strong>What happens next?</strong></p>
              <ul style="color: #555;">
                <li>Our HR team will review your application</li>
                <li>If shortlisted, you'll receive an interview invitation</li>
                <li>We aim to respond within 5-7 business days</li>
              </ul>
              
              <p>Thank you again for your interest in joining our team!</p>
              
              <p style="margin-bottom: 0;">
                Warm regards,<br>
                <strong>EDUINTBD Advisor Team</strong>
              </p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; text-align: center; border: 1px solid #e0e0e0; border-top: none;">
              <p style="margin: 0; color: #888; font-size: 12px;">
                © ${new Date().getFullYear()} EDUINTBD. All rights reserved.<br>
                Helping students achieve their global education dreams.
              </p>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const responseData = await emailResponse.json();
    
    if (!emailResponse.ok) {
      console.error("Resend API error:", responseData);
      throw new Error(responseData.message || "Failed to send email");
    }

    console.log("Application confirmation email sent successfully:", responseData);

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-application-confirmation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
