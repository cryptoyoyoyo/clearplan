const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { email } = JSON.parse(event.body);
    if (!email) return { statusCode: 400, body: JSON.stringify({ error: "Email required" }) };

    const normalised = email.toLowerCase().trim();

    // Check practice is approved and active
    const { data: practice, error } = await supabase
      .from("practices")
      .select("id, name, is_active")
      .eq("email", normalised)
      .single();

    if (error || !practice) {
      return { statusCode: 403, body: JSON.stringify({ error: "This email isn't registered. Please contact DentalExplain to get access." }) };
    }

    if (!practice.is_active) {
      return { statusCode: 403, body: JSON.stringify({ error: "This account has been disabled. Please contact DentalExplain." }) };
    }

    // Generate token
    const token = require("crypto").randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    await supabase.from("magic_links").insert({ email: normalised, token, expires_at: expiresAt });

    // Build magic link URL
    const siteUrl = process.env.URL || "http://localhost:3000";
    const magicLink = `${siteUrl}/?token=${token}`;

    // Send email
    await resend.emails.send({
      from: "DentalExplain <onboarding@resend.dev>",
      to: normalised,
      subject: "Your DentalExplain login link",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <div style="margin-bottom: 24px;">
            <span style="background: #0891b2; color: white; padding: 6px 14px; border-radius: 8px; font-weight: 700; font-size: 15px;">DentalExplain</span>
          </div>
          <h2 style="color: #0f2942; font-size: 22px; margin-bottom: 8px;">Your login link</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            Hi${practice.name ? ` ${practice.name}` : ""},<br><br>
            Click the button below to log in to DentalExplain. This link expires in 15 minutes.
          </p>
          <a href="${magicLink}" style="display: inline-block; background: #0891b2; color: white; padding: 13px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Log in to DentalExplain</a>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Something went wrong" }) };
  }
};
