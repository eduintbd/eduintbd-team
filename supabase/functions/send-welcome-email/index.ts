import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { email, firstName, lastName } = await req.json();

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "EDUINTBD <onboarding@resend.dev>",
        to: [email],
        subject: "Thank You for Your Interest in EDUINTBD",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
                .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
                h1 { margin: 0; font-size: 24px; }
                .highlight { color: #d4af37; font-weight: bold; }
                .button { display: inline-block; background: #1e3a8a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Welcome to <span class="highlight">EDUINTBD</span></h1>
                </div>
                <div class="content">
                  <h2>Dear ${firstName} ${lastName},</h2>
                  <p>Thank you for your interest in joining <strong>EDUINTBD</strong>!</p>
                  <p>We have received your registration application and our admin team is currently reviewing it.</p>
                  <p><strong>What happens next?</strong></p>
                  <ul>
                    <li>Our admin will carefully review your application</li>
                    <li>You will receive an email notification once a decision has been made</li>
                    <li>If approved, you'll receive instructions to complete your onboarding</li>
                  </ul>
                  <p>This process typically takes 1-3 business days. We appreciate your patience!</p>
                  <p>If you have any questions, please don't hesitate to reach out to our support team.</p>
                  <p>Best regards,<br><strong>The EDUINTBD Team</strong></p>
                </div>
                <div class="footer">
                  <p>&copy; 2025 EDUINTBD. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(error);
    }

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
