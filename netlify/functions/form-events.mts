import { getStore } from "@netlify/blobs";
import type { FormSubmittedEvent } from "@netlify/functions";

const STORE_NAME = "raise-your-hand-submissions";

function clean(value: unknown, max = 500): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function parseYear(value: unknown): number | null {
  const year = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(year) && year >= 1940 && year <= 2026 ? year : null;
}

export default {
  async formSubmitted(event: FormSubmittedEvent) {
    const data = event.data ?? {};
    const formName = clean(data["form-name"] ?? data.form_name ?? "story-submission", 80);
    if (formName !== "story-submission") return;

    const submittedAtRaw = clean(data.submitted_at, 80);
    const submittedAt = Number.isNaN(Date.parse(submittedAtRaw))
      ? new Date().toISOString()
      : new Date(submittedAtRaw).toISOString();
    const path = clean(data.path, 40);
    const questionType = clean(data.question_type, 160);
    const reasons = clean(data.reasons, 500)
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);
    const serviceYear = parseYear(data.service_year);
    const story = clean(data.story, 150);
    const attribution = clean(data.attribution, 44);
    const pre = path === "before" || /what changed/i.test(questionType);
    const id = crypto.randomUUID();
    const key = `submission/${submittedAt.replace(/[:.]/g, "-")}-${id}`;

    const record = {
      id,
      key,
      status: "pending",
      submittedAt,
      updatedAt: submittedAt,
      path,
      questionType,
      serviceYear,
      pre,
      reasons,
      permission: clean(data.permission, 160),
      original: { story, attribution },
      publicVersion: { story, attribution, serviceYear, pre, reasons },
      moderation: { updatedBy: null, note: "" },
    };

    const store = getStore({ name: STORE_NAME, consistency: "strong" });
    await store.setJSON(key, record, {
      metadata: { status: "pending", submittedAt },
      onlyIfNew: true,
    });
  },
};
