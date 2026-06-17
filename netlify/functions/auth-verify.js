const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/28EcN79ju4vYeum0HD1ck00";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { token } = JSON.parse(event.body);
    if (!token) return { statusCode: 400, body: JSON.stringify({ error: "Token required" }) };

    // Find token
    const { data: link, error } = await supabase
      .from("magic_links")
      .select("*")
      .eq("token", token)
      .single();

    if (error || !link) {
      return { statusCode: 401, body: JSON.stringify({ error: "Invalid or expired link" }) };
    }

    if (link.used) {
      return { statusCode: 401, body: JSON.stringify({ error: "This link has already been used" }) };
    }

    if (new Date(link.expires_at) < new Date()) {
      return { statusCode: 401, body: JSON.stringify({ error: "This link has expired. Please request a new one." }) };
    }

    // Mark token as used
    await supabase.from("magic_links").update({ used: true }).eq("token", token);

    // Get practice details
    const { data: practice } = await supabase
      .from("practices")
      .select("id, name, email, is_active, is_paying, trial_ends_at")
      .eq("email", link.email)
      .single();

    if (!practice) {
      return { statusCode: 403, body: JSON.stringify({ error: "This email isn't registered. Please contact DentalExplain to get access." }) };
    }

    if (!practice.is_paying && practice.trial_ends_at && new Date(practice.trial_ends_at) < new Date()) {
      return { statusCode: 403, body: JSON.stringify({ error: `Your free trial has ended. Subscribe at ${STRIPE_PAYMENT_LINK} to keep using DentalExplain.` }) };
    }

    if (!practice.is_active) {
      return { statusCode: 403, body: JSON.stringify({ error: "This account has been disabled. Please contact DentalExplain." }) };
    }

    // Create session token
    const sessionToken = require("crypto").randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days

    await supabase.from("magic_links").insert({
      email: link.email,
      token: sessionToken,
      expires_at: expiresAt,
      used: false,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        sessionToken,
        practice: { id: practice.id, name: practice.name, email: practice.email },
      }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Something went wrong" }) };
  }
};
