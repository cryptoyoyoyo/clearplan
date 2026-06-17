const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/28EcN79ju4vYeum0HD1ck00";

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
        .select("id, email, name, is_active, is_paying, trial_ends_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Pull login and report activity for all practices in two queries,
      // rather than one query per practice, to keep this fast as the list grows.
      const practiceIds = data.map((p) => p.id);

      const { data: logins, error: loginsError } = await supabase
        .from("login_events")
        .select("practice_id, logged_in_at")
        .in("practice_id", practiceIds);
      if (loginsError) throw loginsError;

      const { data: reports, error: reportsError } = await supabase
        .from("report_events")
        .select("practice_id, created_at")
        .in("practice_id", practiceIds);
      if (reportsError) throw reportsError;

      const practices = data.map((practice) => {
        const practiceLogins = logins.filter((l) => l.practice_id === practice.id);
        const practiceReports = reports.filter((r) => r.practice_id === practice.id);

        const lastLogin = practiceLogins.length
          ? practiceLogins.reduce((latest, l) => (l.logged_in_at > latest ? l.logged_in_at : latest), practiceLogins[0].logged_in_at)
          : null;

        return {
          ...practice,
          loginCount: practiceLogins.length,
          lastLoginAt: lastLogin,
          reportCount: practiceReports.length,
        };
      });

      return { statusCode: 200, body: JSON.stringify({ practices }) };
    }

    if (action === "add") {
      if (!email) return { statusCode: 400, body: JSON.stringify({ error: "Email required" }) };
      const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
      const { data, error } = await supabase
        .from("practices")
        .insert({ email: email.toLowerCase().trim(), name: name || "", trial_ends_at: trialEndsAt, is_paying: false })
        .select()
        .single();
      if (error) throw error;

      // Send welcome email with trial details
      const siteUrl = process.env.URL || "http://localhost:3000";
      const trialEndDate = new Date(trialEndsAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

      try {
        await resend.emails.send({
          from: "DentalExplain <hello@dentalexplain.com>",
          to: data.email,
          subject: "You're all set up with DentalExplain",
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
              <div style="margin-bottom: 24px;">
                <span style="background: #0891b2; color: white; padding: 6px 14px; border-radius: 8px; font-weight: 700; font-size: 15px;">DentalExplain</span>
              </div>
              <h2 style="color: #0f2942; font-size: 22px; margin-bottom: 8px;">You're all set up</h2>
              <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
                Hi${data.name ? ` ${data.name}` : ""},<br><br>
                Your DentalExplain account is ready. You have full access for a <strong>7-day free trial</strong>, ending on <strong>${trialEndDate}</strong>.
              </p>
              <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
                To log in, go to the link below and enter your email address — we'll send you a secure one-click login link.
              </p>
              <a href="${siteUrl}" style="display: inline-block; background: #0891b2; color: white; padding: 13px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Go to DentalExplain</a>
              <p style="color: #94a3b8; font-size: 13px; margin: 24px 0 0;">Questions? Just reply to this email and we'll help out.</p>
              <p style="color: #94a3b8; font-size: 13px; margin: 8px 0 0;">Want to subscribe before your trial ends? <a href="${STRIPE_PAYMENT_LINK}" style="color: #0e7490;">Set up billing here</a> — £35/month, cancel any time.</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Welcome email failed to send:", emailErr);
        // Don't fail the whole request if the email fails - the practice is still created
      }

      return { statusCode: 200, body: JSON.stringify({ practice: data }) };
    }

    if (action === "getActivity") {
      if (!practiceId) return { statusCode: 400, body: JSON.stringify({ error: "practiceId required" }) };

      const { data: recentLogins, error: loginsError } = await supabase
        .from("login_events")
        .select("logged_in_at")
        .eq("practice_id", practiceId)
        .order("logged_in_at", { ascending: false })
        .limit(5);
      if (loginsError) throw loginsError;

      const { data: recentReports, error: reportsError } = await supabase
        .from("report_events")
        .select("treatment, created_at")
        .eq("practice_id", practiceId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (reportsError) throw reportsError;

      return {
        statusCode: 200,
        body: JSON.stringify({ recentLogins, recentReports }),
      };
    }

    if (action === "markPaying") {
      const { data, error } = await supabase
        .from("practices")
        .update({ is_paying: true })
        .eq("id", practiceId)
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 200, body: JSON.stringify({ practice: data }) };
    }

    if (action === "extendTrial") {
      const days = JSON.parse(event.body).days || 7;
      const trialEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("practices")
        .update({ trial_ends_at: trialEndsAt })
        .eq("id", practiceId)
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
