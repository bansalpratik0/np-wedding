import nodemailer from "nodemailer";

const RSVP_API = "https://rkglbozacxbiojvnmqyb.supabase.co/functions/v1/wedding-rsvp";
const FROM = "Nishika & Pratik <nishikapratik@gmail.com>";

const clean = (v, max = 500) => String(v ?? "").trim().slice(0, max);
const isUuid = (v) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

async function rsvpAction(body) {
  const res = await fetch(RSVP_API, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "accept": "application/json"
    },
    body: JSON.stringify(body)
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.ok !== true) {
    throw new Error(payload.error || `RSVP API returned HTTP ${res.status}`);
  }
  return payload;
}

export default async (req) => {
  if (req.method !== "POST") return;

  let body;
  try {
    body = await req.json();
  } catch {
    return;
  }

  const token = clean(body.token, 64);
  const msgId = Number(body.msgId);

  if (!isUuid(token) || !Number.isInteger(msgId) || msgId <= 0) {
    console.error("Invalid RSVP email background job");
    return;
  }

  try {
    const contextPayload = await rsvpAction({
      action: "email_context",
      edit_token: token
    });

    const context = contextPayload.context;

    if (context.alreadySent) {
      const completed = await rsvpAction({
        action: "complete_email_job",
        edit_token: token,
        msg_id: msgId
      });
      if (completed.deleted !== true) throw new Error("Queue acknowledgement failed");
      return;
    }

    const password = process.env.GMAIL_APP_PASSWORD;
    if (!password) throw new Error("GMAIL_APP_PASSWORD is not configured");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "nishikapratik@gmail.com",
        pass: password
      }
    });

    const attendanceLine = context.attending
      ? "We’re so excited to celebrate with you."
      : "Thank you for letting us know. If your plans change, you can update your RSVP anytime.";

    await transporter.sendMail({
      from: FROM,
      to: context.email,
      replyTo: "nishikapratik@gmail.com",
      subject: "Your Nishika & Pratik RSVP edit link",
      text: [
        `Hi ${context.guestName},`,
        "",
        attendanceLine,
        "",
        "Your private RSVP edit link:",
        context.editUrl,
        "",
        "Use this link later to update travel details, dietary requirements, guest count, or attendance.",
        "",
        "With love,",
        "Nishika & Pratik"
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.65;color:#172224;max-width:600px;margin:auto">
          <p>Hi ${context.guestName},</p>
          <p>${attendanceLine}</p>
          <p>Your private RSVP edit link:</p>
          <p><a href="${context.editUrl}" style="color:#0a5b5c;font-weight:700">View or update your RSVP</a></p>
          <p style="font-size:13px;color:#667273">Use this link later to update travel details, dietary requirements, guest count, or attendance.</p>
          <p>With love,<br><strong>Nishika &amp; Pratik</strong></p>
        </div>
      `
    });

    const completed = await rsvpAction({
      action: "complete_email_job",
      edit_token: token,
      msg_id: msgId
    });
    if (completed.deleted !== true) throw new Error("Queue acknowledgement failed");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("RSVP email background job failed", { token, msgId, message });

    try {
      await rsvpAction({
        action: "record_email_error",
        edit_token: token,
        error: message
      });
    } catch (recordError) {
      console.error("Unable to record RSVP email error", recordError);
    }

    throw error;
  }
};

export const config = {
  background: true
};
