import { getStore } from "@netlify/blobs";
import nodemailer from "nodemailer";

const STORE_NAME = "wedding-rsvps";
const RSVP_FROM = "Nishika & Pratik <nishikapratik@gmail.com>";

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

const clean = (value, max = 500) =>
  String(value ?? "").trim().slice(0, max);

const validToken = (token) =>
  typeof token === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token);

const validEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

const emailConfigured = () =>
  Boolean(process.env.GMAIL_APP_PASSWORD);

const sendEditLinkEmail = async ({ to, guestName, editUrl, attending }) => {
  if (!emailConfigured()) {
    throw new Error("Email delivery is not configured.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "nishikapratik@gmail.com",
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  const attendanceLine =
    attending === "yes"
      ? "We’re so excited to celebrate with you."
      : "Thank you for letting us know. If your plans change, you can update your RSVP anytime.";

  await transporter.sendMail({
    from: RSVP_FROM,
    to,
    replyTo: "nishikapratik@gmail.com",
    subject: "Your Nishika & Pratik RSVP edit link",
    text: [
      `Hi ${guestName},`,
      "",
      attendanceLine,
      "",
      "You can view or update your RSVP using your private link:",
      editUrl,
      "",
      "Please keep this link private. You can use it later to add or change travel details, dietary requirements, accommodation needs, guest count, or attendance.",
      "",
      "With love,",
      "Nishika & Pratik"
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172224;max-width:600px;margin:auto">
        <p>Hi ${guestName},</p>
        <p>${attendanceLine}</p>
        <p>You can view or update your RSVP using your private link:</p>
        <p><a href="${editUrl}" style="color:#0a5b5c;font-weight:600">Edit your RSVP</a></p>
        <p style="font-size:13px;color:#667273">Please keep this link private. You can use it later to add or change travel details, dietary requirements, accommodation needs, guest count, or attendance.</p>
        <p>With love,<br><strong>Nishika &amp; Pratik</strong></p>
      </div>
    `
  });
};

export default async (req) => {
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  const url = new URL(req.url);

  if (req.method === "GET") {
    const token = url.searchParams.get("token");

    if (!validToken(token)) {
      return json({ ok: false, error: "Invalid RSVP link." }, 400);
    }

    const record = await store.get(`guest/${token}`, {
      type: "json",
      consistency: "strong"
    });

    if (!record) {
      return json({ ok: false, error: "RSVP not found." }, 404);
    }

    return json({
      ok: true,
      rsvp: {
        guestName: record.guestName,
        email: record.email,
        attending: record.attending,
        partySize: record.partySize,
        dietary: record.dietary,
        stayNeeded: record.stayNeeded,
        arrivalDate: record.arrivalDate,
        travelNumber: record.travelNumber,
        notes: record.notes,
        updatedAt: record.updatedAt
      }
    });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed." }, 405);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  const guestName = clean(body.guestName, 120);
  const email = clean(body.email, 254).toLowerCase();
  const attending = clean(body.attending, 8).toLowerCase();

  if (!guestName) {
    return json({ ok: false, error: "Please enter your full name." }, 400);
  }

  if (!validEmail(email)) {
    return json({ ok: false, error: "Please enter a valid email address." }, 400);
  }

  if (!["yes", "no"].includes(attending)) {
    return json({ ok: false, error: "Please tell us whether you are attending." }, 400);
  }

  let token = clean(body.token, 64);
  let existing = null;

  if (token) {
    if (!validToken(token)) {
      return json({ ok: false, error: "Invalid RSVP edit link." }, 400);
    }

    existing = await store.get(`guest/${token}`, {
      type: "json",
      consistency: "strong"
    });

    if (!existing) {
      return json({ ok: false, error: "That RSVP could not be found." }, 404);
    }
  } else {
    token = crypto.randomUUID();
  }

  const partySizeRaw = Number.parseInt(body.partySize, 10);
  const partySize =
    attending === "yes"
      ? Number.isFinite(partySizeRaw)
        ? Math.min(Math.max(partySizeRaw, 1), 20)
        : 1
      : 0;

  const now = new Date().toISOString();
  const origin = new URL(req.url).origin;
  const editUrl = `${origin}/?rsvp=${encodeURIComponent(token)}#rsvp`;

  const record = {
    token,
    guestName,
    email,
    attending,
    partySize,
    dietary: attending === "yes" ? clean(body.dietary, 1000) : "",
    stayNeeded: attending === "yes" ? clean(body.stayNeeded, 20) : "",
    arrivalDate: attending === "yes" ? clean(body.arrivalDate, 20) : "",
    travelNumber: attending === "yes" ? clean(body.travelNumber, 120) : "",
    notes: clean(body.notes, 1500),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    editLinkEmailedAt: existing?.editLinkEmailedAt || null
  };

  await store.set(`guest/${token}`, JSON.stringify(record));

  let emailSent = false;
  let emailError = "";

  const shouldEmail =
    !existing ||
    existing.email !== email ||
    !existing.editLinkEmailedAt;

  if (shouldEmail) {
    try {
      await sendEditLinkEmail({
        to: email,
        guestName,
        editUrl,
        attending
      });
      emailSent = true;
      record.editLinkEmailedAt = new Date().toISOString();
      await store.set(`guest/${token}`, JSON.stringify(record));
    } catch (err) {
      emailError = err?.message || "Email delivery failed.";
    }
  }

  return json({
    ok: true,
    token,
    editUrl,
    emailSent,
    emailError,
    updatedAt: now
  });
};
