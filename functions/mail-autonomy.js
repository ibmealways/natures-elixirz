export const RETRYABLE_MAIL_CATEGORIES = new Set([
  "account-email-verification",
  "new-beta-account-alert",
  "subscriber-support-request",
  "subscriber-support-confirmation",
  "vip-household-access",
  "household-kitchen-request",
]);

export const MAX_AUTOMATIC_MAIL_RETRIES = 2;

export function deliveryState(record = {}) {
  return String(record.delivery?.state || record.delivery?.status || "").toUpperCase();
}

export function mailFailureAction(before = {}, after = {}) {
  if (deliveryState(after) !== "ERROR" || deliveryState(before) === "ERROR") return { action: "ignore" };
  if (!RETRYABLE_MAIL_CATEGORIES.has(after.category)) return { action: "ignore" };
  const retryAttempt = Math.max(0, Number(after.retryAttempt || 0));
  if (retryAttempt < MAX_AUTOMATIC_MAIL_RETRIES) {
    return { action: "retry", retryAttempt: retryAttempt + 1, delayMinutes: retryAttempt === 0 ? 2 : 10 };
  }
  return { action: "alert", retryAttempt };
}

export function retryableMailPayload(record = {}, retryAttempt, retryOf, startTime) {
  const payload = {
    to: record.to,
    message: record.message,
    category: record.category,
    retryAttempt,
    retryOf,
    uid: record.uid || null,
    accountUid: record.accountUid || null,
    createdAt: startTime,
    delivery: { startTime },
  };
  for (const key of ["cc", "bcc", "replyTo", "template"]) {
    if (record[key] != null) payload[key] = record[key];
  }
  return payload;
}
