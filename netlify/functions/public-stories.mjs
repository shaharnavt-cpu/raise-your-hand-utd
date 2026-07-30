import { getStore } from "@netlify/blobs";

const STORE_NAME = "raise-your-hand-submissions";

export default async (request) => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  const { blobs } = await store.list({ prefix: "submission/" });
  const records = await Promise.all(
    blobs.map(async ({ key }) => {
      try {
        return await store.get(key, { type: "json", consistency: "strong" });
      } catch {
        return null;
      }
    }),
  );

  const stories = records
    .filter((record) => record?.status === "approved")
    .map((record) => {
      const version = record.publicVersion || {};
      const reasons = Array.isArray(version.reasons) ? version.reasons.filter(Boolean) : [];
      return {
        y: Number(version.serviceYear),
        pre: version.pre ? 1 : 0,
        name: String(version.attribution || "Community member"),
        role: reasons.length ? reasons.join(" · ") : "Approved visitor submission",
        body: String(version.story || "No written line was left — only the year."),
        src: "Approved visitor submission",
      };
    })
    .filter((story) => Number.isInteger(story.y) && story.y >= 1940 && story.y <= 2026)
    .sort((a, b) => a.y - b.y);

  return Response.json(stories, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
