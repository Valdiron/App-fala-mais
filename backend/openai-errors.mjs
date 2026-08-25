const creditFailureCodes = new Set([
  "billing_hard_limit_reached",
  "credit_balance_exhausted",
  "insufficient_quota"
]);

export function openAiFailureCode(status, upstreamCode = "") {
  const normalizedCode = String(upstreamCode).toLowerCase();
  if (creditFailureCodes.has(normalizedCode)) return "OPENAI_CREDIT_EXHAUSTED";
  if (status === 401) return "OPENAI_AUTH_ERROR";
  if (status === 403) return "OPENAI_PERMISSION_ERROR";
  if (status === 404) return "OPENAI_MODEL_ERROR";
  if (status === 429) return "OPENAI_RATE_LIMIT";
  if (status >= 500) return "OPENAI_UNAVAILABLE";
  return "OPENAI_SESSION_ERROR";
}
