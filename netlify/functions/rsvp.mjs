import { getStore } from "@netlify/blobs";

const STORE_NAME = "wedding-rsvps";

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
  const attending = clean(body.attending, 8).toLowerCase();

  if (!guestName) {
    return json({ ok: false, error: "Please enter your full name." }, 400);
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

  const record = {
    token,
    guestName,
    attending,
    partySize,
    dietary: attending === "yes" ? clean(body.dietary, 1000) : "",
    stayNeeded: attending === "yes" ? clean(body.stayNeeded, 20) : "",
    arrivalDate: attending === "yes" ? clean(body.arrivalDate, 20) : "",
    travelNumber: attending === "yes" ? clean(body.travelNumber, 120) : "",
    notes: clean(body.notes, 1500),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  await store.set(`guest/${token}`, JSON.stringify(record));

  const origin = new URL(req.url).origin;
  const editUrl = `${origin}/?rsvp=${encodeURIComponent(token)}#rsvp`;

  return json({
    ok: true,
    token,
    editUrl,
    updatedAt: now
  });
};
