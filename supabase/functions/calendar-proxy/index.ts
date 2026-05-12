import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function getGoogleAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN") ?? "";

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) throw new Error(`Failed to get token: ${JSON.stringify(tokenData)}`);
  return tokenData.access_token;
}

const CAL_API = "https://www.googleapis.com/calendar/v3";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    const { action, ...params } = await req.json();
    const accessToken = await getGoogleAccessToken();

    let result: any;

    switch (action) {
      case "list_calendars": {
        const res = await fetch(`${CAL_API}/users/me/calendarList`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        result = await res.json();
        break;
      }

      case "list_events": {
        const calendarId = params.calendarId || "primary";
        const timeMin = params.timeMin || new Date().toISOString();
        const timeMax = params.timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const maxResults = params.maxResults || 50;

        const url = `${CAL_API}/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        result = await res.json();
        break;
      }

      case "get_event": {
        const calendarId = params.calendarId || "primary";
        const res = await fetch(
          `${CAL_API}/calendars/${encodeURIComponent(calendarId)}/events/${params.eventId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        result = await res.json();
        break;
      }

      case "create_event": {
        const calendarId = params.calendarId || "primary";
        const eventBody: any = {
          summary: params.summary,
          description: params.description || "",
          location: params.location || "",
          start: {
            dateTime: params.startDateTime,
            timeZone: params.timeZone || "Asia/Dhaka",
          },
          end: {
            dateTime: params.endDateTime,
            timeZone: params.timeZone || "Asia/Dhaka",
          },
        };

        if (params.attendees?.length > 0) {
          eventBody.attendees = params.attendees.map((email: string) => ({ email }));
        }
        if (params.recurrence) {
          eventBody.recurrence = [params.recurrence];
        }
        if (params.reminders) {
          eventBody.reminders = {
            useDefault: false,
            overrides: params.reminders,
          };
        }
        if (params.colorId) {
          eventBody.colorId = params.colorId;
        }

        const res = await fetch(
          `${CAL_API}/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(eventBody),
          }
        );
        result = await res.json();
        break;
      }

      case "update_event": {
        const calendarId = params.calendarId || "primary";
        const updateBody: any = {};
        if (params.summary !== undefined) updateBody.summary = params.summary;
        if (params.description !== undefined) updateBody.description = params.description;
        if (params.location !== undefined) updateBody.location = params.location;
        if (params.startDateTime) {
          updateBody.start = { dateTime: params.startDateTime, timeZone: params.timeZone || "Asia/Dhaka" };
        }
        if (params.endDateTime) {
          updateBody.end = { dateTime: params.endDateTime, timeZone: params.timeZone || "Asia/Dhaka" };
        }
        if (params.attendees) {
          updateBody.attendees = params.attendees.map((email: string) => ({ email }));
        }
        if (params.colorId) {
          updateBody.colorId = params.colorId;
        }

        const res = await fetch(
          `${CAL_API}/calendars/${encodeURIComponent(calendarId)}/events/${params.eventId}?sendUpdates=all`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(updateBody),
          }
        );
        result = await res.json();
        break;
      }

      case "delete_event": {
        const calendarId = params.calendarId || "primary";
        await fetch(
          `${CAL_API}/calendars/${encodeURIComponent(calendarId)}/events/${params.eventId}?sendUpdates=all`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        result = { success: true };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  }
});
