import test from "node:test";
import assert from "node:assert/strict";
import { aggregateReachRecords } from "./reach.js";

test("community reach returns aggregate groups and suppresses small groups", () => {
  const records = [
    { reach: { country: "United States", region: "Pennsylvania", referral: "friend-family" } },
    { reach: { country: "United States", region: "Pennsylvania", referral: "friend-family" } },
    { reach: { country: "United States", region: "Pennsylvania", referral: "friend-family" } },
    { reach: { country: "Canada", region: "Ontario", referral: "search" } },
  ];
  const result = aggregateReachRecords(records);
  assert.deepEqual(result.countries.groups, [{ label: "United States", count: 3 }]);
  assert.equal(result.countries.suppressedResponses, 1);
  assert.equal(result.regions.groups[0].count, 3);
  assert.equal(result.referrals.groups[0].count, 3);
  assert.equal(JSON.stringify(result).includes("Ontario"), false);
});
