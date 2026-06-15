const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { action, password, email, name, practiceId } = JSON.parse(event.body);

    // Verify admin password
    if (password !== ADMIN_PASSWORD) {
      return { statusCode: 401, body: JSON.stringify({ error: "Invalid admin password" }) };
    }

    if (action === "list") {
      const { data, error } = await supabase
        .from("practices")
        .select("id, email, name, is_active, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return { statusCode: 200, body: JSON.stringify({ practices: data }) };
    }

    if (action === "add") {
      if (!email) return { statusCode: 400, body: JSON.stringify({ error: "Email required" }) };
      const { data, error } = await supabase
        .from("practices")
        .insert({ email: email.toLowerCase().trim(), name: name || "" })
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 200, body: JSON.stringify({ practice: data }) };
    }

    if (action === "toggle") {
      const { data: current } = await supabase.from("practices").select("is_active").eq("id", practiceId).single();
      const { data, error } = await supabase
        .from("practices")
        .update({ is_active: !current.is_active })
        .eq("id", practiceId)
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 200, body: JSON.stringify({ practice: data }) };
    }

    if (action === "remove") {
      const { error } = await supabase.from("practices").delete().eq("id", practiceId);
      if (error) throw error;
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: "Unknown action" }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || "Something went wrong" }) };
  }
};
