const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
      .select("id, name, email, is_active")
      .eq("email", link.email)
      .single();

    if (!practice || !practice.is_active) {
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
