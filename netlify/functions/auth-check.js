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
    const { sessionToken } = JSON.parse(event.body);
    if (!sessionToken) return { statusCode: 401, body: JSON.stringify({ error: "No session" }) };

    const { data: link } = await supabase
      .from("magic_links")
      .select("*")
      .eq("token", sessionToken)
      .eq("used", false)
      .single();

    if (!link || new Date(link.expires_at) < new Date()) {
      return { statusCode: 401, body: JSON.stringify({ error: "Session expired" }) };
    }

    const { data: practice } = await supabase
      .from("practices")
      .select("id, name, email, is_active, is_paying, trial_ends_at")
      .eq("email", link.email)
      .single();

    if (!practice) {
      return { statusCode: 401, body: JSON.stringify({ error: "Account disabled" }) };
    }

    if (!practice.is_paying && practice.trial_ends_at && new Date(practice.trial_ends_at) < new Date()) {
      return { statusCode: 401, body: JSON.stringify({ error: `Your free trial has ended. To keep using DentalExplain, subscribe here: ${STRIPE_PAYMENT_LINK}` }) };
    }

    if (!practice.is_active) {
      return { statusCode: 401, body: JSON.stringify({ error: "Account disabled" }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ practice: { id: practice.id, name: practice.name, email: practice.email } }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Something went wrong" }) };
  }
};
