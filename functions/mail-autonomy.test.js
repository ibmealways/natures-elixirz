import test from "node:test";
import assert from "node:assert/strict";
import { mailFailureAction, retryableMailPayload } from "./mail-autonomy.js";

test("mail failure automation retries a newly failed verification message", () => {
  assert.deepEqual(mailFailureAction(
    { category: "account-email-verification", delivery: { state: "PROCESSING" } },
    { category: "account-email-verification", delivery: { state: "ERROR" } },
  ), { action: "retry", retryAttempt: 1, delayMinutes: 2 });
});

test("mail failure automation retries a household pantry invitation", () => {
  assert.deepEqual(mailFailureAction({}, {
    category: "household-kitchen-request", delivery: { state: "ERROR" }, retryAttempt: 0,
  }), { action: "retry", retryAttempt: 1, delayMinutes: 2 });
});

test("mail failure automation escalates after two retries", () => {
  assert.deepEqual(mailFailureAction({}, {
    category: "account-email-verification", retryAttempt: 2, delivery: { state: "ERROR" },
  }), { action: "alert", retryAttempt: 2 });
});

test("mail failure automation ignores repeated updates and alert mail", () => {
  assert.deepEqual(mailFailureAction(
    { delivery: { state: "ERROR" } },
    { category: "account-email-verification", delivery: { state: "ERROR" } },
  ), { action: "ignore" });
  assert.deepEqual(mailFailureAction({}, {
    category: "mail-delivery-failure-alert", delivery: { state: "ERROR" },
  }), { action: "ignore" });
});

test("retry payload preserves delivery content without copying a failed delivery result", () => {
  const startTime = { seconds: 100 };
  const payload = retryableMailPayload({
    to: ["member@example.com"], message: { subject: "Verify", text: "Body" },
    category: "account-email-verification", uid: "user-1", delivery: { state: "ERROR" },
  }, 1, "mail-1", startTime);
  assert.equal(payload.retryAttempt, 1);
  assert.deepEqual(payload.delivery, { startTime });
  assert.deepEqual(payload.message, { subject: "Verify", text: "Body" });
});
