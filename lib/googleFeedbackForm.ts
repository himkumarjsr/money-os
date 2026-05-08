/**
 * Optional mirror of feedback into a Google Form (responses land in the linked Sheet).
 *
 * Setup:
 * 1. Create a Google Form with matching questions (short answer / paragraph / multiple choice).
 * 2. Deploy nothing — use "Send form" → link, or inspect form HTML / pre-filled link for entry.* IDs.
 * 3. Submission URL shape: https://docs.google.com/forms/d/e/<FORM_ID>/formResponse
 *
 * Env (all optional — if GOOGLE_FEEDBACK_FORM_RESPONSE_URL is unset, this no-ops):
 *   GOOGLE_FEEDBACK_FORM_RESPONSE_URL — full formResponse URL
 *   GOOGLE_FEEDBACK_ENTRY_RATING — e.g. entry.123456789
 *   GOOGLE_FEEDBACK_ENTRY_AREA
 *   GOOGLE_FEEDBACK_ENTRY_HIGHLIGHTS — what worked
 *   GOOGLE_FEEDBACK_ENTRY_IMPROVEMENTS — what to improve
 *   GOOGLE_FEEDBACK_ENTRY_RECOMMEND — yes / maybe / no
 *   GOOGLE_FEEDBACK_ENTRY_CONTEXT — source e.g. navbar
 *   GOOGLE_FEEDBACK_ENTRY_USER_ID — anonymous id for correlation (optional)
 */

type FeedbackGooglePayload = {
  rating: number;
  area: string;
  highlights: string;
  improvements: string;
  recommend: string;
  context: string;
  userId: string;
};

function entryIds(): Record<string, string | undefined> {
  return {
    rating: process.env.GOOGLE_FEEDBACK_ENTRY_RATING?.trim(),
    area: process.env.GOOGLE_FEEDBACK_ENTRY_AREA?.trim(),
    highlights: process.env.GOOGLE_FEEDBACK_ENTRY_HIGHLIGHTS?.trim(),
    improvements: process.env.GOOGLE_FEEDBACK_ENTRY_IMPROVEMENTS?.trim(),
    recommend: process.env.GOOGLE_FEEDBACK_ENTRY_RECOMMEND?.trim(),
    context: process.env.GOOGLE_FEEDBACK_ENTRY_CONTEXT?.trim(),
    userId: process.env.GOOGLE_FEEDBACK_ENTRY_USER_ID?.trim(),
  };
}

export async function mirrorFeedbackToGoogleForm(payload: FeedbackGooglePayload): Promise<void> {
  const url = process.env.GOOGLE_FEEDBACK_FORM_RESPONSE_URL?.trim();
  if (!url) return;

  const ids = entryIds();
  const body = new URLSearchParams();

  const set = (key: keyof typeof ids, value: string | number) => {
    const entry = ids[key];
    if (entry) body.append(entry, String(value));
  };

  set("rating", payload.rating);
  set("area", payload.area);
  set("highlights", payload.highlights);
  set("improvements", payload.improvements);
  set("recommend", payload.recommend);
  set("context", payload.context);
  set("userId", payload.userId);

  if (Array.from(body.keys()).length === 0) {
    console.warn(
      "googleFeedbackForm: GOOGLE_FEEDBACK_FORM_RESPONSE_URL is set but no GOOGLE_FEEDBACK_ENTRY_* keys matched — skipping POST.",
    );
    return;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (!res.ok) {
      console.warn("googleFeedbackForm: Google Form POST returned", res.status);
    }
  } catch (e) {
    console.warn("googleFeedbackForm: POST failed", e);
  }
}
