import { getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";

const STORE_NAME = "raise-your-hand-submissions";
const STORE_PREFIX = "submission/";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function clean(value, max = 500) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function parseYear(value) {
  const year = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(year) && year >= 1940 && year <= 2026 ? year : null;
}

async function requireStaff() {
  const user = await getUser();
  if (!user) return null;
  return { id: user.id, email: user.email || "staff", roles: user.roles || [] };
}

async function listRecords(store) {
  const { blobs } = await store.list({ prefix: STORE_PREFIX });
  const records = await Promise.all(
    blobs.map(async ({ key }) => {
      try {
        const record = await store.get(key, { type: "json", consistency: "strong" });
        return record ? { ...record, key } : null;
      } catch {
        return null;
      }
    }),
  );
  return records
    .filter(Boolean)
    .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
}

function verifySameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

export default async (request) => {
  const staff = await requireStaff();
  if (!staff) return json({ error: "Unauthorized" }, 401);

  const store = getStore({ name: STORE_NAME, consistency: "strong" });

  if (request.method === "GET") {
    return json({ staff, submissions: await listRecords(store) });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  if (!verifySameOrigin(request)) {
    return json({ error: "Invalid request origin" }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const key = clean(body.key, 300);
  const action = clean(body.action, 30);
  if (!key.startsWith(STORE_PREFIX)) return json({ error: "Invalid submission key" }, 400);

  const record = await store.get(key, { type: "json", consistency: "strong" });
  if (!record) return json({ error: "Submission not found" }, 404);

  const version = body.publicVersion ?? {};
  const nextPublic = {
    story: clean(version.story ?? record.publicVersion?.story ?? record.original?.story, 150),
    attribution: clean(version.attribution ?? record.publicVersion?.attribution ?? record.original?.attribution, 44),
    serviceYear: parseYear(version.serviceYear ?? record.publicVersion?.serviceYear ?? record.serviceYear),
    pre: Boolean(version.pre ?? record.publicVersion?.pre ?? record.pre),
    reasons: Array.isArray(version.reasons)
      ? version.reasons.map((item) => clean(item, 90)).filter(Boolean).slice(0, 12)
      : Array.isArray(record.publicVersion?.reasons)
        ? record.publicVersion.reasons
        : record.reasons ?? [],
  };

  const statusByAction = {
    approve: "approved",
    reject: "rejected",
    unpublish: "unpublished",
    restore: "pending",
    save: record.status || "pending",
  };
  const nextStatus = statusByAction[action];
  if (!nextStatus) return json({ error: "Unknown moderation action" }, 400);
  if (action === "approve" && !nextPublic.serviceYear) {
    return json({ error: "A valid service year is required before publishing." }, 400);
  }

  const updated = {
    ...record,
    key,
    status: nextStatus,
    publicVersion: nextPublic,
    updatedAt: new Date().toISOString(),
    moderation: {
      ...(record.moderation || {}),
      updatedBy: staff.email,
      note: clean(body.note ?? record.moderation?.note, 300),
    },
  };

  await store.setJSON(key, updated, {
    metadata: { status: nextStatus, submittedAt: record.submittedAt || "" },
  });

  return json({ ok: true, submission: updated });
};
