const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);
const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/28EcN79ju4vYeum0HD1ck00";

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
      .select("id, name, is_active, is_paying, trial_ends_at")
      .eq("email", normalised)
      .single();

    if (error || !practice) {
      return { statusCode: 403, body: JSON.stringify({ error: "This email isn't registered. Please contact DentalExplain to get access." }) };
    }

    if (!practice.is_active) {
      return { statusCode: 403, body: JSON.stringify({ error: "This account has been disabled. Please contact DentalExplain." }) };
    }

    if (!practice.is_paying && practice.trial_ends_at && new Date(practice.trial_ends_at) < new Date()) {
      return { statusCode: 403, body: JSON.stringify({ error: `Your free trial has ended. Subscribe at ${STRIPE_PAYMENT_LINK} to keep using DentalExplain.` }) };
    }

    // Generate token
    const token = require("crypto").randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    await supabase.from("magic_links").insert({ email: normalised, token, expires_at: expiresAt });

    // Build magic link URL
    const siteUrl = process.env.URL || "http://localhost:3000";
    const magicLink = `${siteUrl}/?token=${token}`;

    // Build trial reminder text, shown only for non-paying accounts with an active trial
    let trialNotice = "";
    if (!practice.is_paying && practice.trial_ends_at) {
      const trialEndDate = new Date(practice.trial_ends_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
      trialNotice = `<p style="color: #0e7490; font-size: 14px; line-height: 1.5; background: #e0f4f8; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px;">Your free trial ends on <strong>${trialEndDate}</strong>. <a href="${STRIPE_PAYMENT_LINK}" style="color: #0e7490; font-weight: 600;">Subscribe for £35/month</a> to keep your access after that.</p>`;
    }

    // Send email
    await resend.emails.send({
      from: "DentalExplain <hello@dentalexplain.com>",
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
          <p style="color: #94a3b8; font-size: 13px; margin: 24px 0;">If you didn't request this, you can safely ignore this email.</p>
          ${trialNotice}
        </div>
      `,
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Something went wrong" }) };
  }
};
