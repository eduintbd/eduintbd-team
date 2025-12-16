import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Send email with retry logic for rate limiting
async function sendEmailWithRetry(emailPayload: object, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    if (res.ok) {
      return res;
    }

    // If rate limited, wait and retry
    if (res.status === 429 && attempt < maxRetries - 1) {
      const waitTime = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
      console.log(`Rate limited, waiting ${waitTime}ms before retry ${attempt + 2}/${maxRetries}`);
      await delay(waitTime);
      continue;
    }

    // Return the error response if not rate limited or max retries reached
    return res;
  }
  
  throw new Error("Max retries exceeded");
}

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
    const { email, firstName, lastName, status, rejectionReason, position, department, companyEmail, joiningDate } = await req.json();

    const isApproved = status === "approved";
    
    const emailContent = isApproved
      ? `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
                .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
                h1 { margin: 0; font-size: 24px; }
                .highlight { color: #d4af37; font-weight: bold; }
                .info-box { background: #f0fdf4; border-left: 4px solid #059669; padding: 15px; margin: 20px 0; }
                .button { display: inline-block; background: #1e3a8a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Congratulations <span class="highlight">${firstName}!</span></h1>
                </div>
                <div class="content">
                  <h2>Your Application Has Been Approved!</h2>
                  <p>We are excited to welcome you to the <strong>EDUINTBD</strong> team!</p>
                  
                  <div class="info-box">
                    <h3>Your Employment Details:</h3>
                    <p><strong>Position:</strong> ${position}</p>
                    <p><strong>Department:</strong> ${department}</p>
                    <p><strong>Company Email:</strong> ${companyEmail}</p>
                    <p><strong>Joining Date:</strong> ${new Date(joiningDate).toLocaleDateString()}</p>
                  </div>

                  <p><strong>Next Steps:</strong></p>
                  <ol>
                    <li>Log in to your account using your credentials</li>
                    <li>Complete your onboarding profile with additional details</li>
                    <li>Review and accept company policies</li>
                    <li>Set up your company email and system access</li>
                  </ol>

                  <p>Please complete your onboarding before your joining date. If you have any questions, our HR team is here to help!</p>

                  <p>We look forward to having you on board!</p>

                  <p>Best regards,<br><strong>The EDUINTBD Team</strong></p>
                </div>
                <div class="footer">
                  <p>&copy; 2025 EDUINTBD. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `
      : `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
                .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
                h1 { margin: 0; font-size: 24px; }
                .info-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Application Update</h1>
                </div>
                <div class="content">
                  <h2>Dear ${firstName} ${lastName},</h2>
                  <p>Thank you for your interest in joining <strong>EDUINTBD</strong>.</p>
                  
                  <p>After careful review, we regret to inform you that we are unable to move forward with your application at this time.</p>

                  ${rejectionReason ? `
                    <div class="info-box">
                      <h3>Feedback:</h3>
                      <p>${rejectionReason}</p>
                    </div>
                  ` : ''}

                  <p>We appreciate the time and effort you put into your application. We encourage you to apply again in the future if you believe your qualifications align with our requirements.</p>

                  <p>We wish you all the best in your career endeavors.</p>

                  <p>Best regards,<br><strong>The EDUINTBD Team</strong></p>
                </div>
                <div class="footer">
                  <p>&copy; 2025 EDUINTBD. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `;

    const res = await sendEmailWithRetry({
      from: "EDUINTBD <hr@eduintbd.ai>",
      to: [email],
      subject: isApproved 
        ? "Welcome to EDUINTBD - Your Application is Approved!" 
        : "EDUINTBD Application Status Update",
      html: emailContent,
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Resend API error:", error);
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
