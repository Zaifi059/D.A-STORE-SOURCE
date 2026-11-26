import { createClient } from "npm:@supabase/supabase-js@2";

const FAL_ENDPOINT = "https://fal.run/fal-ai/fashn/tryon/v1.5";
const CATEGORIES = ["tops", "bottoms", "one-pieces", "auto"] as const;
type Category = (typeof CATEGORIES)[number];

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Only accept images hosted in THIS project's Supabase Storage (blocks arbitrary URLs / spend abuse).
function isProjectStorageUrl(value: unknown, supabaseUrl: string): value is string {
  if (typeof value !== "string") return false;
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      u.hostname === new URL(supabaseUrl).hostname &&
      u.pathname.startsWith("/storage/v1/")
    );
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const falKey = Deno.env.get("FAL_KEY");
  if (!supabaseUrl || !anonKey || !falKey) {
    console.error("Missing SUPABASE_URL, SUPABASE_ANON_KEY, or FAL_KEY");
    return json({ error: "Server misconfiguration" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Missing Authorization header" }, 401);

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return json({ error: "Invalid or expired session" }, 401);

  let payload: { model_image?: unknown; garment_image?: unknown; category?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Body must be valid JSON" }, 400);
  }

  const { model_image, garment_image } = payload;
  const category = (payload.category ?? "auto") as Category;

  if (!CATEGORIES.includes(category)) {
    return json({ error: `category must be one of: ${CATEGORIES.join(", ")}` }, 400);
  }
  if (!isProjectStorageUrl(model_image, supabaseUrl) || !isProjectStorageUrl(garment_image, supabaseUrl)) {
    return json({ error: "model_image and garment_image must be Supabase Storage URLs from this project" }, 400);
  }

  let falRes: Response;
  try {
    falRes = await fetch(FAL_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model_image,
        garment_image,
        category,
        mode: "balanced",
        output_format: "jpeg",
        num_samples: 1,
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    console.error("fal.ai request failed:", err);
    return json({ error: "Try-on service unreachable or timed out" }, 504);
  }

  if (!falRes.ok) {
    const detail = await falRes.text();
    console.error(`fal.ai ${falRes.status} (user ${user.id}):`, detail);
    return json({ error: "Try-on generation failed", status: falRes.status }, 502);
  }

  const result = await falRes.json();
  const imageUrl: string | undefined = result?.images?.[0]?.url;
  if (!imageUrl) {
    console.error("Unexpected fal.ai response:", JSON.stringify(result));
    return json({ error: "No image returned by try-on service" }, 502);
  }

  return json({ image_url: imageUrl });
});
