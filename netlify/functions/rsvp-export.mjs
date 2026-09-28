import { createHash, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "wedding-rsvps";
const EXPORT_KEY_HASH = "164186e3f513cb9d06bda0e97f52e616d247f2797b9239ca6b6d50c4eb54ec5e";

const hash = (value) =>
  createHash("sha256").update(String(value || ""), "utf8").digest();

const authorized = (value) => {
  const a = hash(value);
  const b = Buffer.from(EXPORT_KEY_HASH, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
};

const csvCell = (value) => {
  const text = String(value ?? "");
  return '"' + text.replaceAll('"', '""') + '"';
};

export default async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");

  if (!authorized(key)) {
    return new Response("Unauthorized", {
      status: 401,
      headers: { "cache-control": "no-store" }
    });
  }

  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  const { blobs } = await store.list({ prefix: "guest/" });

  const records = (
    await Promise.all(
      blobs.map(({ key }) =>
        store.get(key, { type: "json", consistency: "strong" })
      )
    )
  )
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

  const header = [
    "Submitted",
    "Last Updated",
    "Guest Name",
    "Email",
    "Attending",
    "Number of Guests",
    "Dietary Requirements",
    "Accommodation Needed",
    "Arrival Date",
    "Flight / Train Number",
    "Notes",
    "Edit Token"
  ];

  const rows = records.map((r) => [
    r.createdAt,
    r.updatedAt,
    r.guestName,
    r.email,
    r.attending,
    r.partySize,
    r.dietary,
    r.stayNeeded,
    r.arrivalDate,
    r.travelNumber,
    r.notes,
    r.token
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'inline; filename="nishika-pratik-rsvps.csv"',
      "cache-control": "no-store, max-age=0"
    }
  });
};
