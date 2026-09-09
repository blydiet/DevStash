import OpenAI from "openai";

let client: OpenAI | null = null;

// Lazy + cached, matching r2.ts's shape rather than stripe.ts's module-load
// throw: AI features are Pro-only and optional, so the app/tests must still
// work with no OPENAI_API_KEY set (e.g. CI, contributors without a key).
export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    client = new OpenAI({ apiKey });
  }
  return client;
}

export const AI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.6-luna";
