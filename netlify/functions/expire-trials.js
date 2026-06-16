const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async () => {
  try {
    const now = new Date().toISOString();

    // Find practices whose trial has expired, are not paying, and are still active
    const { data: expired, error: findError } = await supabase
      .from("practices")
      .select("id, email, name, trial_ends_at")
      .eq("is_active", true)
      .eq("is_paying", false)
      .not("trial_ends_at", "is", null)
      .lt("trial_ends_at", now);

    if (findError) throw findError;

    if (!expired || expired.length === 0) {
      console.log("No expired trials to disable.");
      return { statusCode: 200, body: JSON.stringify({ disabled: 0 }) };
    }

    const ids = expired.map((p) => p.id);

    const { error: updateError } = await supabase
      .from("practices")
      .update({ is_active: false })
      .in("id", ids);

    if (updateError) throw updateError;

    console.log(`Disabled ${expired.length} expired trial account(s):`, expired.map((p) => p.email).join(", "));

    return {
      statusCode: 200,
      body: JSON.stringify({ disabled: expired.length, emails: expired.map((p) => p.email) }),
    };
  } catch (err) {
    console.error("expire-trials error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || "Something went wrong" }) };
  }
};
