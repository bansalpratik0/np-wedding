import nodemailer from "nodemailer";

const SUPABASE_URL = "https://rkglbozacxbiojvnmqyb.supabase.co";
const SUPABASE_KEY = "sb_publishable_zlgVnY4SU-QawfXzZYyg0w_0YkchhZ9";
const FROM = "Nishika & Pratik <nishikapratik@gmail.com>";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });

const clean = (v, max = 500) => String(v ?? "").trim().slice(0, max);
const isEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

async function verifyTokenEmail(token, email) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_wedding_rsvp_email_token`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${SUPABASE_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ p_token: token, p_email: email })
  });
  if (!res.ok) return false;
  return (await res.json()) === true;
}

export default async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  const token = clean(body.token, 64);
  const email = clean(body.email, 254).toLowerCase();
  const guestName = clean(body.guestName, 120);
  const editUrl = clean(body.editUrl, 1000);
  const attending = body.attending === true;

  if (!token || !guestName || !isEmail(email) || !editUrl.startsWith("https://nishikapratik.com/")) {
    return json({ ok: false, error: "Invalid RSVP email request." }, 400);
  }

  const verified = await verifyTokenEmail(token, email);
  if (!verified) return json({ ok: false, error: "RSVP verification failed." }, 403);

  const password = process.env.GMAIL_APP_PASSWORD;
  if (!password) return json({ ok: false, error: "Email delivery is not configured." }, 500);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "nishikapratik@gmail.com",
      pass: password
    }
  });

  const attendanceLine = attending
    ? "We’re so excited to celebrate with you."
    : "Thank you for letting us know. If your plans change, you can update your RSVP anytime.";

  await transporter.sendMail({
    from: FROM,
    to: email,
    replyTo: "nishikapratik@gmail.com",
    subject: "Your Nishika & Pratik RSVP edit link",
    text: [
      `Hi ${guestName},`,
      "",
      attendanceLine,
      "",
      "Your private RSVP edit link:",
      editUrl,
      "",
      "Use this link later to update travel details, dietary requirements, accommodation needs, guest count, or attendance.",
      "",
      "With love,",
      "Nishika & Pratik"
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.65;color:#172224;max-width:600px;margin:auto">
        <p>Hi ${guestName},</p>
        <p>${attendanceLine}</p>
        <p>Your private RSVP edit link:</p>
        <p><a href="${editUrl}" style="color:#0a5b5c;font-weight:700">View or update your RSVP</a></p>
        <p style="font-size:13px;color:#667273">Use this link later to update travel details, dietary requirements, accommodation needs, guest count, or attendance.</p>
        <p>With love,<br><strong>Nishika &amp; Pratik</strong></p>
      </div>
    `
  });

  return json({ ok: true });
};
